# AllocAI 🪁

**The One-Liner:** An Autonomous Cross-Chain AI Agent built on the Kite Network that dynamically routes your stablecoins across different blockchains to secure the highest, risk-adjusted yields.

## 🧠 What is it in simple terms?

Imagine a savings account that never sleeps. You deposit USDC into AllocAI on the Kite network. From there, an Artificial Intelligence agent constantly monitors live interest rates (yields) on other blockchains like Arbitrum, Base, and Avalanche. 

When the AI finds a significantly better yield, it **autonomously signs a real transaction** that bridges your money over to that new chain to capture the higher profits. You do nothing. The agent does all the work, pays the bridging fees, evaluates the risk, and secures all the gains.

## 🏆 What We Built for the Hackathon

We didn't just build a frontend simulation. We built a fully working, verifiable on-chain execution layer on the **Kite AI Testnet**.

1. **Live Smart Contracts:** A custom `AllocAIVault.sol` smart contract live on Kite Testnet that physically holds user deposits.
2. **On-Chain AI Reasoning (Attestations):** Every time the AI decides to move your money, it hashes its exact "thought process" and permanently logs it into the Kite blockchain as cryptographic proof.
3. **Live Block-Explorer Indexing:** Our dashboard doesn't use databases or local storage. It builds your historical timeline by directly decoding raw transaction hex data live from the `kitescan.ai` Block Explorer API.
4. **Mainnet-Ready Execution Engine:** The smart contract represents the future of web3 AI. The Vault is programmed to automatically execute raw EVM bytecode handed to it by the AI Agent (for example, instructing the Vault to interface natively with the **LayerZero / Lucid Controller** to bridge funds to Avalanche).
5. **Real-Time Data:** The AI doesn't use static fake numbers. It pulls live, real-time APY data directly from the **DeFiLlama API**.

## ⚙️ How it works (Step-by-Step)
1. **Deposit:** Connect your wallet and lock your USDC into the AllocAI Vault on the Kite network.
2. **Scan:** In the background, the AI constantly pulls live yield APYs from Aave, Compound, and Curve via DeFiLlama.
3. **Calculate:** If the AI finds a better APR (e.g., an 8% increase on Arbitrum), it calculates if the gas fees of bridging are worth the move. 
4. **Execute:** The AI sends a transaction to the Kite Vault. The Vault accepts the AI's instruction and instantly bridges your USDC to the destination chain using LayerZero or Stargate.
5. **Withdraw:** Whenever you want, click "Withdraw" and the smart contract pulls your initial capital + all accrued interest straight back into your wallet.

## 🏛️ Kite Protocol Integration

AllocAI is built to be a first-class citizen of the Kite AI Ecosystem, leveraging the official protocol stack:

- **Official Service Registry:** Registered in the Kite App Store (`0xc67a4AbcD8853221F241a041ACb1117b38DA587F`) to enable autonomous agent-to-agent discovery and capital delegation.
- **Account Abstraction (AA):** Native support for `GokiteAccount` (`0x93F5...`) allowing for a "Gasless" onboarding experience where the Agent sponsors initial user deposits.
- **Unified Bridge:** Leveraging the official Kite Bridge Aggregator (`0xe3f5...`) for verified, off-chain proof-backed capital movement between chains.

## 🚀 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file with your `AGENT_PRIVATE_KEY` and `NEXT_PUBLIC_VAULT_ADDRESS`.

3. **Onboard to Kite App Store:**
   ```bash
   node scripts/kite-app-store-register.js
   ```

4. **Launch Dashboard:**
   ```bash
   npm run dev
   ```

## 🛠️ Tech Stack

- **L1 Blockchain:** Kite AI Mainnet (Yield on-chain settlement)
- **Omnichain Messaging:** LayerZero v2 & Via Bridge Integration
- **Agent Framework:** Custom Decision Engine with DeFiLlama API
- **Frontend:** Next.js 15, TailwindCSS, Ethers.js v6
- **Smart Wallets:** Gokite AA (ERC-4337)

## 🌍 Mainnet Launch Guide

To move AllocAI from your current state to 100% Live on Kite Mainnet, follow these steps:

### 1. Configure Your Environment
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Update the following:
- `AGENT_PRIVATE_KEY`: The key for your autonomous relayer.
- `DEPLOYER_PRIVATE_KEY`: The key for the wallet holding your KITE gas tokens.

### 2. Deploy the Smart Contract
1. Open [Remix IDE](https://remix.ethereum.org).
2. Upload `contracts/AllocAIVault.sol`.
3. Compile with Solidity `0.8.20`.
4. Copy the **Bytecode** from the compilation tab.
5. Paste it into `scripts/deploy.js` on line 35.
6. Run the deployment:
   ```bash
   node scripts/deploy.js
   ```

### 3. Verification & Live Sync
After deployment, the script will output your **New Vault Address**. 
- Update `NEXT_PUBLIC_VAULT_ADDRESS` in your `.env`.
- Run the App Store registration:
  ```bash
  node scripts/kite-app-store-register.js
  ```

### 4. Production Deployment
The app is fully responsive and Vercel-ready.
```bash
npm run build
```

---
**Mainnet Ready Features:**
- ✅ **Dynamic Decimals:** Automatically handles 6-decimal USDC (Mainnet) or 18-decimal USDC (Testnet).
- ✅ **Ecosystem Verified:** Built-in support for Kite Bridge and Kite Service Registry.
- ✅ **Secure Secrets:** Environment-based configuration for all private keys.

---
Built for the Kite AI Hackathon 2026. 🦅
