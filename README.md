# AllocAI

AllocAI is a KITE-native AI yield app: discover cross-chain USDC opportunities, run a paid strategy, and verify every recommendation on-chain.

It combines:
- live USDC yield discovery (DeFiLlama),
- a paid "Run The Agent" flow,
- a generic autonomous scheduler run (test portfolio, twice daily by default),
- on-chain proof of each paid run,
- and wallet-specific run history with explorer links.

## KITE Ecosystem Integrations

- **KITE network-first UX**
  - wallet, payments, and proof flow are centered on KITE.
- **Lucid Bridge integration**
  - in-app bridge panel routes USDC from Kite to supported destination chains.
- **Swap aggregator integration**
  - in-app quick swap supports KITE/WKITE/USDC conversions with an aggregated swap path.
- **Multi-chain USDC balances**
  - backend endpoint reads user balances across Kite, Arbitrum, Avalanche, Optimism, Base, BSC, and Celo.

## What This Project Does (Current MVP)

1. Shows live cross-chain USDC opportunities in a yield table.
2. Lets users run a paid strategy request with a fixed fee (`0.25 KITE`).
3. Supports two payment modes:
   - direct wallet payment (native KITE),
   - x402 Passport payment (`X-PAYMENT` flow).
4. Generates a richer strategy narrative (LLM + deterministic fallback).
5. Publishes run proof on-chain and returns proof transaction hash.
6. Persists run data server-side and shows the latest 5 runs for the connected wallet.
7. Runs a policy-constrained autonomous test portfolio agent on a fixed schedule.

## What Is Working Now

- **Yield dashboard**
  - Data source: `https://yields.llama.fi/pools`.
  - Filters to stable USDC pools on target chains.
  - Selects up to **2 best opportunities per chain** (TVL-first ranking, APY tie-break).

- **KITE integrations in product**
  - Lucid Bridge module for moving USDC cross-chain from Kite.
  - Quick Swap aggregator module for KITE, WKITE, and USDC flows.
  - Cross-chain USDC balance monitor panel in the main dashboard.

- **Locked/unlocked table behavior**
  - Before paid run: rows are blurred except a teaser row (4th row).
  - After paid run: table unlocks fully for a time window.

- **Paid run modal**
  - Fixed fee display and CTA (`Pay 0.25 KITE & Run Agent`).
  - Pre-flight balance checks for selected payment mode.
  - Clear loading/progress states and error handling.

- **Payment + proof**
  - `POST /api/paid-data` returns `402` challenge when needed.
  - Supports retry with `X-PAYMENT` or direct tx hash verification.
  - Strategy result includes proof receipt and strategy destination links.

- **Autonomous agent mode (generic, not per-wallet)**
  - Scheduler tick endpoint: `POST /api/autonomous/tick`.
  - Status endpoint: `GET /api/autonomous/status`.
  - Default cadence: every 12 hours.
  - Uses a fixed test portfolio (default 25,000 USDC), high-signal strategy run, and on-chain proof anchoring.
  - Runs independently from paid user flows so users can still run and pay manually.

- **Policy guardrails**
  - Max slippage (bps)
  - Max allocation per protocol (%)
  - Min TVL
  - Min confidence
  - Cooldown window for autonomous runs
  - Guardrail checks can force HOLD with explicit reason.

- **KPI panel**
  - Powered by `GET /api/kpi`
  - Shows total runs, proofs posted, avg response time, and success rate.

- **Run history**
  - `GET /api/strategy/latest` returns latest/last N runs by wallet.
  - UI shows 5 latest runs with:
    - payment/proof confirmation,
    - tx explorer links,
    - block metadata (when tx hash is available).

## Why It Matters

- **Clear user value:** pay once, get strategy + proof + links to execute.
- **Transparency:** every paid run can be inspected on explorer.
- **Practical UX:** direct-user path and agent-user (x402) path in one interface.
- **Composable payments:** supports direct wallet flow and **agentic x402 payments**.

## API Surface (MVP)

- `GET /api/yield`
  - Returns filtered/ranked opportunities for the dashboard.

- `POST /api/paid-data`
  - Paid strategy endpoint.
  - 402 challenge/response flow + direct payment verification path.

- `GET /api/strategy/latest?address=<wallet>&limit=5`
  - Returns most recent runs for connected wallet.

- `GET /api/strategy/latest?runId=<id>`
  - Returns one specific run (shareable result view).

- `GET /api/usdc-balances?address=<wallet>`
  - Returns chain-level USDC balances for supported routes.

- `POST /api/autonomous/tick`
  - Triggers scheduler check; executes autonomous run only when cooldown allows.

- `GET /api/autonomous/status`
  - Returns next run time, last autonomous run, and scheduler configuration.

- `GET /api/kpi`
  - Returns aggregate KPIs (`#paid runs`, `#autonomous runs`, `#proofs`, `avg response ms`, `success rate`).

## Environment Variables (Important)

Minimum variables for paid flow + proof:
- `NEXT_PUBLIC_KITE_RPC`
- `NEXT_PUBLIC_KITE_NETWORK`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `SERVICE_WALLET_PRIVATE_KEY` (or `AGENT_PRIVATE_KEY`)
- `X402_FACILITATOR_URL`
- `X402_NETWORK`
- `X402_ASSET`
- `X402_PAY_TO_ADDRESS`
- `X402_MAX_AMOUNT_REQUIRED_WEI`
- `X402_MERCHANT_NAME`
- `RUN_STORE_PATH` (recommended on VPS, e.g. `/var/lib/allocai/runs.json`)

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Run Autonomous Agent from VPS (Recommended)

If backend is hosted on VPS (not Vercel cron), use the included runner script.

1. Set backend env values:
   - `AUTONOMOUS_TICK_SECRET=<strong-random-secret>`
   - `AUTONOMOUS_INTERVAL_MS=86400000` (once per day)
2. Deploy backend with updated env.
3. On VPS scheduler host, set:
   - `AUTONOMOUS_TICK_URL=https://<your-domain>/api/autonomous/tick`
   - `AUTONOMOUS_TICK_SECRET=<same-secret>`
4. Test once:
   ```bash
   npm run autonomous:tick
   ```
5. Schedule with cron/systemd every 10-15 minutes.
   - Endpoint checks cooldown internally, so run executes only once/day by default.
6. Keep scheduler auth enabled in production:
   - backend validates `x-autonomous-secret` against `AUTONOMOUS_TICK_SECRET`.

### Example cron

```cron
*/15 * * * * cd /path/to/AllocAI && /usr/bin/env AUTONOMOUS_TICK_URL="https://your-domain/api/autonomous/tick" AUTONOMOUS_TICK_SECRET="your-secret" /usr/bin/node scripts/autonomous-runner.mjs >> /var/log/allocai-autonomous.log 2>&1
```

## How an x402 Agent Calls This Service

The paid endpoint supports x402 challenge-response:

1. Agent calls `POST /api/paid-data` without `X-PAYMENT`.
2. Server returns `402` with challenge in `accepts`.
3. Agent obtains x402 payment token from Kite Passport flow.
4. Agent retries `POST /api/paid-data` with `X-PAYMENT: <token>`.
5. Server settles payment and returns strategy + proof receipt.

### Minimal request body example

```json
{
  "amountUsdc": 5000,
  "risk": "medium",
  "currentApr": 4.2
}
```

### Retry call header

- `X-PAYMENT: <base64-payment-token>`

## Production Readiness Snapshot

- Public app URL is required for judging.
- VPS scheduler should be active and writing logs for autonomous ticks.
- Keep at least 1-2 recent proof hashes ready for live verification.
- Ensure README includes reproducible commands (`npm run dev`, `npm run autonomous:tick`).

## 3-Minute Live Demo Script

1. Connect wallet.
2. Show yield table (live source label + multiple rows/chains).
3. Open `Run The Agent` modal and show fixed fee + payment mode options.
4. Execute one paid run.
5. Show strategy output:
   - recommended protocol,
   - compounding estimates (2Y/3Y/5Y),
   - protocol link + DeFiLlama link,
   - on-chain proof hash.
6. Open `Latest Agent Runs` and click explorer links.

## Scope Notes

- This repository is currently positioned as a **hackathon MVP**.
- Documentation intentionally reflects only implemented product behavior.
- Legacy contract/deploy narrative from earlier iterations is intentionally removed from this README.
