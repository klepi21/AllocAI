# AllocAI

**One-liner:** *The Kite-native **Yield Intelligence Layer** that discovers hidden DeFi opportunities and unlocks actionable Alpha—with **x402 agent payments**, **on-chain proof**, and **Lucid + swap + multichain USDC** in one dashboard.*

**Live app:** [https://allocai-orcin.vercel.app/](https://allocai-orcin.vercel.app/)

AllocAI is built to win on **demo depth**: it is a **Verified Intelligence Agent** that turns the chaos of 50+ chains and 1,000+ protocols into a clear signal. Users pay the agent to unlock specific, vetted yield strategies which they can then execute instantly using the integrated **Lucid Bridge** and **Swap Aggregator**. It is **KITE-first**—identity-aware agent flows, native KITE for humans, and **Passport x402** for autonomous agents—while anchoring every piece of intelligence with a permanent **on-chain proof** on [Kitescan](https://kitescan.ai/).

## KITE Ecosystem Integrations

- **KITE network-first UX** — Intelligence, payments, and proof are centered on Kite mainnet.
- **On-Chain Intelligence Proofs** — Every recommendation is hashed and anchored to the Kite blockchain, making the agent's signal verifiable and immutable.
- **Lucid Bridge** — Seamless transition from "Agent Signal" to "User Execution" via the in-app bridge panel.
- **Swap aggregator** — Gasless swap for KITE / WKITE / USDC-style flows, ensuring anyone can start with just USDC.
- **Multi-chain USDC balances** — Real-time visibility across Kite, Arbitrum, Avalanche, Optimism, Base, BSC, and Celo.

## What This Project Does (Yield Intelligence Flow)

1. **Alpha Discovery:** The agent deep-scans DeFiLlama and multi-chain data to identify high-yield USDC pockets (e.g., 12% on Aave/Base).
2. **Verified Unlock:** Users pay a fixed fee of **0.25 KITE** (direct) or **0.25 USDC.e** (x402 Passport) to unlock the detailed research package.
3. **Actionable Logic:** The agent provides a narrative reason for the move, projected compounding metrics, and 1-click **"Prepare Bridge"** shortcuts.
4. **On-chain Trace:** A service wallet publishes the intelligence proof; users can verify the agent was tracking the pool live.
5. **Guided Execution:** Once the alpha is unlocked, users use the integrated tools to move capital with confidence.

## What Is Working Now

- **Yield dashboard** — DeFiLlama pools; up to **2 best USDC opportunities per chain** (TVL-first, APY tie-break).
- **Locked table** — teaser row until a paid run unlocks (time window).
- **Paid run modal** — pre-flight balances, loading states, **Direct** vs **x402 Passport** modes.
- **Payment + proof** — `POST /api/paid-data` returns `402` when unpaid; settle + strategy + proof.
- **Autonomous** — `POST /api/autonomous/tick`, `GET /api/autonomous/status` (VPS cron recommended).
- **Guardrails + KPIs** — policy limits + `GET /api/kpi`.

## API Surface (MVP)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/yield` | Ranked USDC opportunities (server masks rows until paid-unlock cookie or `?address=` with a fresh paid run in the store) |
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

### Optional: Python script — direct KITE pay + full JSON response

For a **headless agent** that pays with **native KITE** (same path as the UI “Direct” flow: `X-DIRECT-PAYMENT-TX`), use:

- `scripts/paid_data_agent_direct.py`
- `scripts/requirements-python.txt`

**This is not the x402 / Passport path** — x402 needs an `X-PAYMENT` token from Passport/facilitator signing, not a raw EOA key alone.

```bash
python3 -m venv .venv-py
source .venv-py/bin/activate   # Windows: .venv-py\Scripts\activate
pip install -r scripts/requirements-python.txt

export AGENT_PRIVATE_KEY=0x...   # wallet that holds KITE (payer), NOT your server proof key unless you intend that
export ALLOCAI_BASE_URL=https://allocai-orcin.vercel.app
export NEXT_PUBLIC_KITE_RPC=https://rpc.gokite.ai/
# Must match server DIRECT_KITE_FEE_WEI (default 0.25 KITE):
export ALLOCAI_DIRECT_KITE_FEE_WEI=250000000000000000

python3 scripts/paid_data_agent_direct.py
```

You can use `PAYING_AGENT_PRIVATE_KEY` instead of `AGENT_PRIVATE_KEY` if you want a name that won’t clash with server env naming.

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
- **KPI / Kitescan (Vercel):** `GET /api/kpi` merges the run file with **[Kitescan](https://kitescan.ai/api-docs?tab=rest_api)** when the store is empty (serverless has no disk). Set `DIRECT_KITE_FEE_WEI`, `X402_PAY_TO_ADDRESS`, `SERVICE_WALLET_PRIVATE_KEY` (for proof-wallet address), and optionally `KITESCAN_API_BASE_URL` + `KITESCAN_API_KEY` for reliable rate limits.
- **`YIELD_UNLOCK_SECRET`** — long random string used to sign the httpOnly cookie that unlocks the full yield table for 10 minutes after a successful paid run. **Set this in production** (the repo default is dev-only).

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
```
