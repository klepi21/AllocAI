# AllocAI Finalist Pitch Script

## One-liner opener (10 seconds)

AllocAI is a KITE-native AI yield app: users discover opportunities, pay once, and get a strategy they can verify on-chain.

## 60-second product story

People want better stablecoin yield but face three problems:
1. too many protocols and chains,
2. low trust in black-box recommendations,
3. no clear audit trail after paying for AI advice.

AllocAI solves this by combining live yield discovery, paid strategy generation, and on-chain proof in one KITE-first flow.

What we intentionally pushed for this hackathon:
- deep KITE narrative,
- **AGENTIC x402 PAYMENTS**,
- Lucid Bridge integration,
- swap aggregator integration,
- multi-chain USDC balance visibility,
- autonomous scheduler run,
- and policy guardrails.

## Function-by-function walkthrough (core architecture)

### 1) Yield discovery
- **Function:** `GET /api/yield`
- **What it does:** Pulls DeFiLlama pool data, filters for stable USDC opportunities, and returns up to 2 best opportunities per target chain.
- **Why it matters:** Users always start from live market context, not hardcoded values.

### 2) KITE-native payments + paid execution gateway
- **Function:** `POST /api/paid-data`
- **What it does:** Handles payment and strategy run orchestration.
- **Two payment paths:**
  - Direct user flow: wallet sends native KITE, backend verifies tx.
  - Agent flow: **AGENTIC x402 PAYMENTS** with 402 challenge and `X-PAYMENT` settlement.
- **Why it matters:** Supports both normal users and autonomous/agent users.

### 3) Lucid Bridge integration
- **Component:** `components/LucidBridge.tsx`
- **What it does:** Bridges USDC from Kite to supported destination chains using Lucid/LayerZero route logic and fee quotes.
- **Why it matters:** Demonstrates KITE ecosystem interoperability in real user flow.

### 4) Swap aggregator integration
- **Component:** `components/QuickSwap.tsx`
- **What it does:** Provides in-app token conversion for KITE/WKITE/USDC with aggregated swap path UX.
- **Why it matters:** Users can rebalance before/after strategy actions without leaving the dApp.

### 5) Multi-chain USDC balance integration
- **Function:** `GET /api/usdc-balances`
- **What it does:** Reads wallet USDC balances across Kite, Arbitrum, Avalanche, Optimism, Base, BSC, and Celo.
- **Why it matters:** Users see full cross-chain capital context before choosing actions.

### 6) Strategy intelligence layer
- **Function:** `generateStrategyNarrative(...)` in `lib/strategy-llm.ts`
- **What it does:** Produces structured strategy narrative (headline, recommendation, expected returns, reinvest cadence, risk notes, execution steps, 2Y/3Y/5Y compounding).
- **Why it matters:** Output is understandable, actionable, and consistent for UI.

### 7) Proof anchoring
- **Function:** `publishRunProofAndSignReceipt(...)` in `lib/proof-receipt.ts`
- **What it does:** Publishes on-chain proof tx, signs run receipt payload, and can publish summary tx metadata.
- **Why it matters:** Strategy result is not just text; it is verifiable.

### 8) Run persistence and retrieval
- **Functions:** `savePaidRun(...)` + `GET /api/strategy/latest`
- **What it does:** Stores run metadata and returns latest run(s) by wallet or runId.
- **Why it matters:** Users can refresh or switch devices and still see results.

### 9) Trust UI
- **Components:** `DecisionPanel`, `Timeline`
- **What they show:**
  - Strategy + protocol/DeFiLlama links + proof hash.
  - Latest 5 runs with payment/proof statuses, explorer links, and block metadata.
- **Why it matters:** Trust and transparency are visible at the UI level.

### 10) Autonomous scheduler mode
- **Functions:** `POST /api/autonomous/tick` + `GET /api/autonomous/status`
- **What it does:** Runs a generic test portfolio strategy on a schedule (twice daily default), publishes proof, and shows status in UI.
- **Ops mode:** Production scheduler is called from VPS script (`npm run autonomous:tick`) with secret-protected endpoint.
- **Why it matters:** Demonstrates real agent autonomy without requiring per-wallet automation.

### 11) Policy guardrails
- **Module:** `lib/guardrails.ts`
- **Policies:** max slippage, max allocation per protocol, min TVL, min confidence, cooldown window.
- **Why it matters:** Safety constraints can block risky moves and force HOLD with explicit reasons.

### 12) KPI telemetry
- **Function:** `GET /api/kpi`
- **Metrics:** total runs, proofs posted, avg response time, success rate, paid/autonomous split.
- **Why it matters:** Judges can assess reliability and operational quality quickly.

### 13) Separation of autonomous vs paid user flow
- **Design:** Autonomous profile uses separate baseline APR/portfolio/risk mode and does not replace paid user strategy flow.
- **Why it matters:** Autonomous demo proves agent behavior while preserving monetized user actions.

## Live demo script (3-4 minutes)

1. Connect wallet and open dashboard.
2. Show Lucid Bridge integration and destination routes.
3. Show swap aggregator integration (KITE/WKITE/USDC).
4. Show multi-chain USDC balances panel.
5. Open `Run The Agent` modal:
   - fixed fee `0.25 KITE`,
   - direct mode and **AGENTIC x402 PAYMENTS** mode.
6. Execute a paid run.
7. Show result card:
   - strategy recommendation,
   - compounding estimates (2Y/3Y/5Y),
   - protocol link + DeFiLlama link,
   - proof tx hash.
8. Open latest runs panel and click explorer links.
9. Show autonomous scheduler box (next run + last run result).
10. Show KPI snapshot panel (runs/proofs/latency/success).
11. Mention VPS scheduler + secret-based tick auth for production autonomy.
12. Confirm payment/proof metadata and close with trust message.

## 20-second close

AllocAI turns KITE ecosystem integrations into a real user product: live data in, paid strategy out, verified proof on-chain.  
That combination of Lucid bridge, swap aggregator, multi-chain balances, and agentic payments is our core differentiator.

## Why Kite (short answer)

Kite is not just where we deploy contracts; it is the backbone of this agent product:
- payment + settlement flows,
- agentic x402 path,
- on-chain verification proofs,
- and interoperable ecosystem integrations in one UI.

## Backup Q&A bullets

- **How do you prevent fake payments?**  
  Direct mode verifies tx on-chain; x402 mode requires valid challenge/settlement flow.

- **How is this not just a chatbot?**  
  Every paid result is tied to proof receipt, tx hash, and persistent run history.

- **What is the moat?**  
  End-to-end trust loop: discovery -> payment -> strategy -> proof -> history.
