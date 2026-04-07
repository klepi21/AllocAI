# AllocAI Roadmap: To Full Autonomy

This document outlines the evolutionary steps to transition AllocAI from a high-fidelity MVP to a production-ready, autonomous on-chain agent.

### 📡 Phase 1: Real-Time Intelligence & Global Scanning (Current Focus)
- [ ] **DeFi Llama Integration**: Replace mock yield data with live 100+ protocol scanning via DeFi Llama's yields API.
- [ ] **Protocol Risk Scoring**: Implement a real risk calculation engine based on TVL, protocol age, and audit status.
- [ ] **Filter by Asset Classes**: Allow the user to specify assets (e.g., Stablecoin Only, BTC-pairs, ETH-pairs).

### 🔄 Phase 2: Authentic Execution & Swaps
- [ ] **Cross-Chain Bridge Integration**: Integrate LI.FI or KyberSwap SDK to perform actual swaps between chains (Ethereum <-> Base <-> Arbitrum).
- [ ] **Gas Estimation Intelligence**: Factor in Kite Testnet and target chain gas costs before recommending a "MOVE" action.
- [ ] **Self-Proof Transaction Signing**: Improve the "Decision Proof" into a full "Proof of Intent" signed by the user's private key.

### 🤖 Phase 3: Autonomous Background Processing
- [ ] **Cloud Worker Agent**: Migrate the AI analysis to a server-side Cloudflare Worker or Vercel Cron.
- [ ] **Non-Custodial Account Abstraction**: Optional integration with Safe or Privy for delegated signing (Agent can trade on behalf of user without popping up MetaMask every time).
- [ ] **Telegram/Discord Notifications**: Real-time alerts when the agent makes an on-chain decision.

### 🔐 Phase 4: Production Polish & Security
- [ ] **ZKP Agent Proofs**: Generate Zero-Knowledge Proofs for decision-making logic on Kite.
- [ ] **Portfolio TVL Live Sync**: Sync with the user's actual wallet balances via an indexer (Morpho or Goldsky).
- [ ] **Advanced Yield History**: Track the performance of specific agent-driven allocations over a 30-day window.

---
*Created by AllocAI Assistant Agent - March 2026*
