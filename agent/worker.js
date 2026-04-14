/* eslint-disable no-console */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const RPC_URL = process.env.NEXT_PUBLIC_KITE_RPC || "https://rpc.gokite.ai/";
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS;
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const LUCID_WITHDRAW_ENDPOINT = process.env.LUCID_WITHDRAW_ENDPOINT || "";
const LUCID_WITHDRAW_API_KEY = process.env.LUCID_WITHDRAW_API_KEY || "";
const POLL_INTERVAL_MS = Number(process.env.AGENT_POLL_INTERVAL_MS || 15000);
const START_BLOCK_OFFSET = Number(process.env.AGENT_START_BLOCK_OFFSET || 250);

const STATE_FILE = path.join(__dirname, "state.json");

const VAULT_ABI = [
  "event LucidExitRequested(uint256 indexed requestId, address indexed user, uint256 assets, string chain)",
  "function pendingWithdrawals(address) view returns (uint256 assets, uint256 shares, bool isNative)",
  "function settleCrossChainWithdrawal(address _user) external",
  "function USDC_TOKEN() view returns (address)",
];

const ERC20_ABI = ["function balanceOf(address account) view returns (uint256)"];

function assertEnv() {
  if (!VAULT_ADDRESS || !ethers.isAddress(VAULT_ADDRESS)) {
    throw new Error("Missing/invalid NEXT_PUBLIC_VAULT_ADDRESS");
  }
  if (!AGENT_PRIVATE_KEY) {
    throw new Error("Missing AGENT_PRIVATE_KEY");
  }
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { lastProcessedBlock: 0, trackedUsers: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { lastProcessedBlock: 0, trackedUsers: {} };
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function triggerLucidWithdraw(eventPayload) {
  if (!LUCID_WITHDRAW_ENDPOINT) {
    console.log("LUCID_WITHDRAW_ENDPOINT not configured, skip external redeem trigger.");
    return;
  }

  const headers = { "content-type": "application/json" };
  if (LUCID_WITHDRAW_API_KEY) headers["x-api-key"] = LUCID_WITHDRAW_API_KEY;

  const body = {
    source: "allocai-vault-agent",
    ...eventPayload,
  };

  const response = await fetch(LUCID_WITHDRAW_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Lucid withdraw trigger failed (${response.status}): ${text}`);
  }
  console.log(`Lucid withdraw trigger accepted: ${text}`);
}

async function maybeSettleUser(vault, usdc, user) {
  const pending = await vault.pendingWithdrawals(user);
  const pendingAssets = BigInt(pending.assets.toString());
  if (pendingAssets === 0n) return { settled: false, stillPending: false };

  const liquid = await usdc.balanceOf(VAULT_ADDRESS);
  if (liquid < pendingAssets) {
    console.log(
      `Pending for ${user}. Waiting funds: pending=${pendingAssets} liquid=${liquid}`
    );
    return { settled: false, stillPending: true };
  }

  const tx = await vault.settleCrossChainWithdrawal(user, { gasLimit: 800000 });
  const receipt = await tx.wait();
  console.log(`Settled withdrawal for ${user}. tx=${receipt.hash}`);
  return { settled: true, stillPending: false };
}

async function main() {
  assertEnv();

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const agent = new ethers.Wallet(AGENT_PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, agent);
  const usdcAddress = await vault.USDC_TOKEN();
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, provider);

  const state = readState();
  console.log("Agent worker started");
  console.log(`Vault=${VAULT_ADDRESS}`);
  console.log(`USDC=${usdcAddress}`);
  console.log(`Tracked users=${Object.keys(state.trackedUsers || {}).length}`);

  while (true) {
    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock =
        state.lastProcessedBlock > 0
          ? state.lastProcessedBlock + 1
          : Math.max(0, currentBlock - START_BLOCK_OFFSET);

      if (fromBlock <= currentBlock) {
        const logs = await vault.queryFilter(
          vault.filters.LucidExitRequested(),
          fromBlock,
          currentBlock
        );

        for (const log of logs) {
          const requestId = log.args?.requestId?.toString();
          const user = log.args?.user;
          const assets = log.args?.assets?.toString();
          const chain = log.args?.chain;
          const txHash = log.transactionHash;

          if (!requestId || !user || !assets || !chain) continue;

          console.log(
            `LucidExitRequested requestId=${requestId} user=${user} assets=${assets} chain=${chain} tx=${txHash}`
          );

          await triggerLucidWithdraw({
            requestId,
            user,
            assets,
            chain,
            vaultAddress: VAULT_ADDRESS,
            chainId: 2366,
            txHash,
          });

          state.trackedUsers[user.toLowerCase()] = {
            lastRequestId: requestId,
            lastTxHash: txHash,
            updatedAt: new Date().toISOString(),
          };
        }

        state.lastProcessedBlock = currentBlock;
      }

      const users = Object.keys(state.trackedUsers || {});
      for (const userKey of users) {
        const { stillPending } = await maybeSettleUser(vault, usdc, userKey);
        if (!stillPending) delete state.trackedUsers[userKey];
      }

      writeState(state);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Agent loop error:", message);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error("Fatal agent startup error:", message);
  process.exit(1);
});

