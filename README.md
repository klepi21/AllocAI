# AllocAI 🪁 🦅

**The World's First Zero-Gas Autonomous Yield Vault on Kite AI.**

AllocAI is an autonomous wealth-management agent that leverages **Account Abstraction (ERC-4337)** and the **LayerZero Omnichain Protocol** to secure the highest risk-adjusted stablecoin yields across the entire decentralized landscape.

## 🌟 The "Killer Feature": Zero-Gas Onboarding
One of the biggest hurdles in DeFi is needing native network tokens (KITE) to start. AllocAI solves this using **Kite Gasless Mode**.
- Users can deposit **USDC.e** without owning a single KITE token.
- Transactions are signed by the user and relayed via `gasless.gokite.ai`.
- The vault is fully operational for users with $0.00 KITE balance.

## 🧠 Brains & Brawn: How it Works
1. **The Brain (AI Engine):** A server-side agent constantly scans the **DeFiLlama API** for yield spikes on Ethereum, Base, Arbitrum, and Avalanche.
2. **The Logic:** Unlike simple bots, AllocAI uses a **Stargate-Optimized Fee Engine**. It calculates the exact 0.06% LayerZero protocol fee + source-chain gas before deciding to move funds. It only moves when the yield surplus pays for the bridge 4x over.
3. **The Brawn (LayerZero OApp):** The `AllocAIVault.sol` smart contract is a production-ready OApp. It uses the official **Lucid + LayerZero Executor** to physically teleport capital across chains.

## 🏆 Hackathon "Source of Truth" Integration
Built specifically for the Kite AI Ecosystem, we have integrated the official production infrastructure:
- **Official USDC.e:** Native 6-decimal support for `0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e`.
- **Lucid Bridge:** Direct integration with the LayerZero Executor highway (`0xe936...`).
- **Service Registry:** Registered in the official Kite App Store (`0xc67...`) for cross-agent discovery.
- **Gasless Service:** Integrated with `gasless.gokite.ai` for a seamless Web2-like onboarding experience.

## 🛠️ Architecture
```text
[ User ] --(USDC.e)--> [ AllocAI Vault (Kite) ]
                               |
                               | (LayerZero / Lucid)
                               |
        ----------------------------------------------
        |                      |                     |
  [ Yield: Base ]      [ Yield: Arbitrum ]    [ Yield: Mainnet ]
```

## ⚙️ Tech Stack
- **Blockchain:** Kite AI Mainnet (Settlement & Proofs).
- **Messaging:** LayerZero V2 (Omnichain Liquidity).
- **Account Abstraction:** Kite Gasless Service (Meta-Transactions).
- **AI Engine:** TypeScript / DeFiLlama REST / ethers.js v6.
- **Frontend:** Next.js 15 + TailwindCSS 4 (Glassmorphic Design).

## 🚀 Getting Started (Mainnet)

1. **Environment Setup:**
   ```bash
   cp .env.example .env
   # Add your AGENT_PRIVATE_KEY and DEPLOYER_PRIVATE_KEY
   ```

2. **Deploy & Register:**
   ```bash
   # Deploy the Vault OApp to Kite Mainnet
   node scripts/deploy.js
   
   # Register your Agent in the Kite App Store
   node scripts/kite-app-store-register.js
   ```

3. **Launch the Dashboard:**
   ```bash
   npm install
   npm run dev
   ```

---
**Built for the Kite AI Hackathon 2026.** *Harden your assets. Automate your future.* 🦅
