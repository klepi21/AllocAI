/* eslint-disable no-console */
require("dotenv").config();
const { ethers } = require("ethers");

const RPC_URL = process.env.NEXT_PUBLIC_KITE_RPC || "https://rpc.gokite.ai/";
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS;
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;

const APR_MIN_DELTA_BPS = Number(process.env.APR_MIN_DELTA_BPS || 25);
const APR_MIN_TVL_USD = Number(process.env.APR_MIN_TVL_USD || 5_000_000);
const APR_FEED_URL = process.env.APR_FEED_URL || "https://yields.llama.fi/pools";
const LUCID_AVAX_APR_FALLBACK_BPS = Number(process.env.LUCID_AVAX_APR_FALLBACK_BPS || 650);
const APR_EXECUTE_REALLOCATION = process.env.APR_EXECUTE_REALLOCATION === "true";
const REALLOCATION_PROTOCOL = process.env.REALLOCATION_PROTOCOL || "Lucid / Avalanche Signal";
const REALLOCATION_CHAIN = process.env.REALLOCATION_CHAIN || "Avalanche";
const SIGNAL_PROTOCOL = "Lucid / Avalanche Signal";
const SIGNAL_CHAIN = "Avalanche";

const VAULT_ABI = [
  "function activeStrategy() view returns (string protocol, string chain, uint256 currentApr, uint256 lastUpdate)",
  "function logAprOpportunity(string _protocol, string _chain, uint256 _aprBps, string _note, bytes32 _opportunityHash) external",
  "function reallocate(string _protocol, string _chain, uint256 _newApr, bytes32 _proofHash, address _targetContract, bytes _executionData, address _newStakingContract, address _newYieldToken) external",
];

function assertEnv() {
  if (!VAULT_ADDRESS || !ethers.isAddress(VAULT_ADDRESS)) {
    throw new Error("Missing/invalid NEXT_PUBLIC_VAULT_ADDRESS");
  }
  if (!AGENT_PRIVATE_KEY) {
    throw new Error("Missing AGENT_PRIVATE_KEY");
  }
}

function toBps(aprPercent) {
  return Math.round(aprPercent * 100);
}

async function fetchAvalancheSignalOpportunity() {
  const response = await fetch(APR_FEED_URL, { cache: "no-store" });
  if (!response.ok) {
    return {
      protocol: SIGNAL_PROTOCOL,
      chain: SIGNAL_CHAIN,
      aprBps: LUCID_AVAX_APR_FALLBACK_BPS,
      tvlUsd: APR_MIN_TVL_USD,
      source: "fallback",
    };
  }
  const json = await response.json();
  const data = Array.isArray(json?.data) ? json.data : [];

  const candidates = data
    .filter((pool) => {
      if (!pool || typeof pool !== "object") return false;
      if (pool.stablecoin !== true) return false;
      if (pool.chain !== SIGNAL_CHAIN) return false;
      if (typeof pool.tvlUsd !== "number" || pool.tvlUsd < APR_MIN_TVL_USD) return false;
      if (typeof pool.apy !== "number" || !Number.isFinite(pool.apy)) return false;
      return true;
    })
    .sort((a, b) => b.apy - a.apy);

  if (!candidates.length) return null;
  const best = candidates[0];
  return {
    protocol: SIGNAL_PROTOCOL,
    chain: SIGNAL_CHAIN,
    aprBps: toBps(Number(best.apy)),
    tvlUsd: Number(best.tvlUsd),
    source: "apr-feed",
  };
}

async function main() {
  assertEnv();
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const agent = new ethers.Wallet(AGENT_PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, agent);

  const strategy = await vault.activeStrategy();
  const currentProtocol = String(strategy.protocol);
  const currentChain = String(strategy.chain);
  const currentAprBps = Number(strategy.currentApr);

  const best = await fetchAvalancheSignalOpportunity();
  if (!best) {
    console.log("No qualifying Avalanche opportunity found.");
    return;
  }

  const deltaBps = best.aprBps - currentAprBps;
  console.log(
    `APR signal candidate: ${best.protocol} on ${best.chain}, apr=${best.aprBps} bps, current=${currentAprBps} bps, delta=${deltaBps} bps, source=${best.source}`
  );

  if (deltaBps < APR_MIN_DELTA_BPS) {
    console.log(`Delta below threshold (${APR_MIN_DELTA_BPS} bps). No on-chain log tx sent.`);
    return;
  }

  const note = `APR signal: better opportunity detected (${deltaBps} bps delta), no reallocation executed`;
  const hash = ethers.keccak256(
    ethers.toUtf8Bytes(
      JSON.stringify({
        t: Date.now(),
        protocol: best.protocol,
        chain: best.chain,
        aprBps: best.aprBps,
        currentAprBps,
        tvlUsd: best.tvlUsd,
        source: best.source,
      })
    )
  );

  const tx = await vault.logAprOpportunity(best.protocol, best.chain, BigInt(best.aprBps), note, hash, {
    gasLimit: 500000,
  });
  const receipt = await tx.wait();
  console.log(`APR opportunity logged on Kite chain. tx=${receipt.hash}`);

  if (!APR_EXECUTE_REALLOCATION) {
    console.log("APR_EXECUTE_REALLOCATION=false, skipping fund movement.");
    return;
  }

  const alreadyTarget =
    currentProtocol.toLowerCase().includes("lucid") &&
    currentChain.toLowerCase() === REALLOCATION_CHAIN.toLowerCase();
  if (alreadyTarget) {
    console.log(`Already on ${REALLOCATION_CHAIN} Lucid strategy. Skipping reallocate.`);
    return;
  }

  const proofHash = ethers.keccak256(
    ethers.toUtf8Bytes(`APR_REALLOCATE_${Date.now()}_${best.aprBps}_${currentAprBps}`)
  );
  const reallocateTx = await vault.reallocate(
    REALLOCATION_PROTOCOL,
    REALLOCATION_CHAIN,
    BigInt(best.aprBps),
    proofHash,
    ethers.ZeroAddress,
    "0x",
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    { gasLimit: 900000 }
  );
  const reallocateReceipt = await reallocateTx.wait();
  console.log(`Reallocation executed to ${REALLOCATION_CHAIN}. tx=${reallocateReceipt.hash}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error("APR checker failed:", message);
  process.exit(1);
});

