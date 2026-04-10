/**
 * AllocAI Vault Deployment Script
 * Usage: node scripts/deploy.js
 *
 * Deploys AllocAIVault.sol with the correct MockUSDC address.
 */

const { ethers } = require("ethers");

// ─── CONFIG ───────────────────────────────────────────────────────────────────
require("dotenv").config();

const RPC_URL = process.env.NEXT_PUBLIC_KITE_RPC || "https://rpc.gokite.ai/"; 
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

// The official USDC.e on Kite Mainnet (6 decimals)
const USDC_TOKEN = process.env.NEXT_PUBLIC_USDC_TOKEN || "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e";

// The authorized agent (your server-side relay wallet)
const AGENT_ADDRESS = process.env.AGENT_ADDRESS || "0xE5f3e81f3045865EB140fCC44038433891D0e25f";

// ─── ABI & BYTECODE ───────────────────────────────────────────────────────────
const VAULT_ABI = [
  "constructor(address _agent, address _usdc)",
  "function USDC_TOKEN() view returns (address)",
  "function deposit(uint256 _amount, string memory _sourceChain) external",
  "function totalVaultAssets() view returns (uint256)",
];

// NOTE: Paste the compiled bytecode here.
// To get it: run `npx hardhat compile` or use Remix IDE to compile AllocAIVault.sol
// Then copy the bytecode from artifacts/contracts/AllocAIVault.sol/AllocAIVault.json
const BYTECODE = "PASTE_COMPILED_BYTECODE_HERE";

async function main() {
  console.log("🚀 Deploying AllocAIVault...");
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💎 USDC Token: ${USDC_TOKEN}`);
  console.log(`🤖 Agent: ${AGENT_ADDRESS}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`⛽ Gas balance: ${ethers.formatEther(balance)} KITE`);

  const factory = new ethers.ContractFactory(VAULT_ABI, BYTECODE, wallet);
  
  console.log("\n📝 Sending deployment transaction...");
  const vault = await factory.deploy(AGENT_ADDRESS, USDC_TOKEN, {
    gasLimit: 3_000_000,
  });

  console.log(`⏳ Waiting for confirmation... tx: ${vault.deploymentTransaction().hash}`);
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  const usdcOnChain = await vault.USDC_TOKEN();

  console.log("\n✅ DEPLOYMENT SUCCESSFUL!");
  console.log(`📄 New Vault Address: ${vaultAddress}`);
  console.log(`💎 Vault USDC_TOKEN: ${usdcOnChain}`);
  console.log(`\n👉 Update VAULT_ADDRESS in app/page.tsx to: ${vaultAddress}`);
}

main().catch((err) => {
  console.error("❌ Deploy failed:", err.message);
  process.exit(1);
});
