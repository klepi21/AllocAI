# AllocAI

**One-liner:** *The Kite-native yield copilot that turns live DeFiLlama data into paid AI strategies—with **x402 agent payments**, **on-chain proof**, and **Lucid + swap + multichain USDC** in one dashboard.*

**Live app:** [https://allocai-orcin.vercel.app/](https://allocai-orcin.vercel.app/)

AllocAI is built to win on **demo depth**: judges can open the live URL, connect a wallet, see real yield rows, pay once, and verify strategy + proof on [Kitescan](https://kitescan.ai/). It is **KITE-first**—identity-aware agent flows, native KITE for humans, and **Passport x402** for autonomous agents—while surfacing **Lucid Bridge**, **swap aggregation**, and **multi-chain USDC balances** as first-class integrations.

## KITE Ecosystem Integrations

- **KITE network-first UX** — wallet, payments, and proof are centered on Kite mainnet.
- **Lucid Bridge** — in-app bridge panel routes USDC from Kite to supported destination chains.
- **Swap aggregator** — quick swap for KITE / WKITE / USDC-style flows.
- **Multi-chain USDC balances** — backend reads balances across Kite, Arbitrum, Avalanche, Optimism, Base, BSC, and Celo.

## What This Project Does (Current MVP)

1. Live cross-chain USDC opportunities (DeFiLlama) in a **yield table** with lock/unlock UX.
2. **Run The Agent** — fixed fee: **0.25 KITE** (direct wallet) or **0.25 USDC.e** (x402 / Passport), strategy + LLM narrative + compounding estimates.
3. **Two payment modes:** direct native KITE tx, or **x402** with `X-PAYMENT` + facilitator settlement.
4. **On-chain proof** — service wallet publishes verifiable proof; explorer links in UI.
5. **Latest runs** — up to 5 runs per wallet with payment/proof/status and explorer metadata.
6. **Autonomous test portfolio** — scheduled backend tick (e.g. daily), guardrails, KPIs.

## What Is Working Now

- **Yield dashboard** — DeFiLlama pools; up to **2 best USDC opportunities per chain** (TVL-first, APY tie-break).
- **Locked table** — teaser row until a paid run unlocks (time window).
- **Paid run modal** — pre-flight balances, loading states, **Direct** vs **x402 Passport** modes.
- **Payment + proof** — `POST /api/paid-data` returns `402` when unpaid; settle + strategy + proof.
- **Autonomous** — `POST /api/autonomous/tick`, `GET /api/autonomous/status` (VPS cron recommended).
- **Guardrails + KPIs** — policy limits + `GET /api/kpi`.

## Why It Wins (Judge Angle)

| Hook | What to say |
|------|-------------|
| **Kite narrative** | Native chain + Passport x402 + proof on Kite explorers. |
| **Integrations** | Lucid Bridge + swap + multichain USDC—not slides, **in the app**. |
| **Agentic** | Any x402-capable agent can pay and consume the same API as the UI. |
| **Verifiable** | Fixed fee, on-chain proof tx, run history with links. |

## API Surface (MVP)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/yield` | Ranked USDC opportunities |
| `POST` | `/api/paid-data` | Paid strategy + proof (402 / x402 / direct) |
| `GET` | `/api/strategy/latest?address=0x…&limit=5` | Wallet run history |
| `GET` | `/api/strategy/latest?runId=…` | Single run |
| `GET` | `/api/usdc-balances?address=0x…` | Multichain USDC |
| `POST` | `/api/autonomous/tick` | Scheduler (secret header) |
| `GET` | `/api/autonomous/status` | Next run, latest autonomous |
| `GET` | `/api/kpi` | Aggregate metrics |

## How an x402 Agent Calls This Service (Exact Steps)

**Base URL (production):** `https://allocai-orcin.vercel.app`

**Endpoint:** `POST https://allocai-orcin.vercel.app/api/paid-data`

### Step 1 — Discover the payment requirement (no payment yet)

```bash
curl -sS -X POST "https://allocai-orcin.vercel.app/api/paid-data" \
  -H "Content-Type: application/json" \
  -d '{"amountUsdc":5000,"risk":"low","currentApr":4.2}'
```

Expect **`HTTP 402`** and JSON with `accepts[0]` containing:

- `network` — e.g. `kite-mainnet`
- `asset` — USDC.e contract on Kite
- `payTo` — merchant address
- `maxAmountRequired` — base units (e.g. `250000` = **0.25 USDC.e** with 6 decimals)

### Step 2 — Obtain `X-PAYMENT` from Kite Passport

Use the **full 402 body** as the payment challenge. Passport returns a base64-style **x402 token** (JSON inside: `authorization`, `signature`, `network`).

Your agent must implement whatever Passport provides (e.g. `getXPaymentToken({ challenge })`, MCP `approve_payment`, or manual paste).

### Step 3 — Call again with the token

```bash
curl -sS -X POST "https://allocai-orcin.vercel.app/api/paid-data" \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <passport_x402_token>" \
  -d '{"amountUsdc":5000,"risk":"low","currentApr":4.2,"payerAddress":"0xYourWallet"}'
```

**Success:** `200` with `decision`, `proofReceipt`, `logs`, `strategyLink`, etc.

**Failure:** `402` if settlement fails (expired token, insufficient authorization, wrong network). Refresh token and retry.

### Optional: minimal Node script (same flow)

See pattern: `POST` without `X-PAYMENT` → read `402` → get token → `POST` with `X-PAYMENT` and same JSON body.

### Amounts (do not hardcode wrong units)

| Mode | What user/agent pays | Config on server |
|------|------------------------|------------------|
| **x402 / Passport** | **0.25 USDC.e** | `X402_MAX_AMOUNT_REQUIRED_ASSET_UNITS=250000` (6 decimals) |
| **Direct wallet** | **0.25 KITE** (native) | `DIRECT_KITE_FEE_WEI=250000000000000000` |

---

## Environment Variables (Important)

Minimum for paid flow + proof:

- `NEXT_PUBLIC_KITE_RPC`, `NEXT_PUBLIC_KITE_NETWORK`
- `GROQ_API_KEY`, `GROQ_MODEL`
- `SERVICE_WALLET_PRIVATE_KEY` (or `AGENT_PRIVATE_KEY`)
- `X402_FACILITATOR_URL`, `X402_NETWORK`, `X402_ASSET`, `X402_PAY_TO_ADDRESS`
- `X402_MAX_AMOUNT_REQUIRED_ASSET_UNITS` (USDC.e base units)
- `DIRECT_KITE_FEE_WEI` (KITE wei for direct path)
- `X402_MERCHANT_NAME`
- `RUN_STORE_PATH` (recommended on VPS)

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Run Autonomous Agent from VPS (Recommended)

1. Set `AUTONOMOUS_TICK_SECRET`, `AUTONOMOUS_INTERVAL_MS=86400000` (once/day), deploy.
2. On VPS: `AUTONOMOUS_TICK_URL=https://allocai-orcin.vercel.app/api/autonomous/tick` (or your host) + same secret.
3. `npm run autonomous:tick` or cron every 10–15 min (cooldown enforced server-side).

## 3-Minute Live Demo (Judges)

1. Open **[https://allocai-orcin.vercel.app/](https://allocai-orcin.vercel.app/)**.
2. Connect wallet, show yield table + **Live Source: DeFiLlama**.
3. **Lucid Bridge** destination + **Swap** tab; **USDC by Chain** panel.
4. **Run The Agent** — fee line + Direct vs x402; run one paid path.
5. Show **strategy**, **compounding**, **protocol link**, **proof tx**, **Latest Agent Runs** + explorer.
6. **KPI** + **Autonomous** countdown (no button needed).

## 3-Minute Pitch Outline (Video)

Use this beat for a tight **~180s** recording:

| Time | Beat |
|------|------|
| 0:00–0:20 | Hook: *Kite is the chain where agents pay and prove—AllocAI is the demo that shows it.* |
| 0:20–0:50 | Problem: yield noise, no trust without payment + proof. |
| 0:50–1:30 | **Live URL** — yield table → pay → strategy + proof hash. |
| 1:30–2:15 | Integrations: Lucid, swap, multichain USDC; x402 for agents. |
| 2:15–2:50 | Autonomous + KPIs + guardrails; why it’s production-shaped. |
| 2:50–3:00 | Close: *Pay once, verify forever on Kite.* |

## Production Readiness Snapshot

- **Public URL:** [https://allocai-orcin.vercel.app/](https://allocai-orcin.vercel.app/)
- Keep 1–2 recent proof tx hashes handy for live explorer verification.
- VPS scheduler optional but strengthens “autonomous agent” story.

## Scope Notes

- Hackathon MVP: docs match **what runs** in this repo.
- Older contract-heavy narratives are intentionally out of scope here.
