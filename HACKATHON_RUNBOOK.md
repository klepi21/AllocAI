# AllocAI Hackathon Runbook (Now -> Submission)

Last updated: 2026-04-14

This is the source-of-truth checklist for what to do next, what works, and what is still pending.

---

## 1) Current Project Phase

You are in **Phase 4: Integration + Operations Readiness**.

- Core contract logic is implemented.
- Frontend and API compile and run.
- Agent worker architecture is implemented.
- Remaining work is mostly deployment + live integration + demo packaging.

---

## 2) What Works Exactly Right Now

## In code (local repository)

- User deposits can be processed via vault logic and gasless flow.
- Lucid staking route is configured through the Lucid controller path.
- Strategy-changing functions are restricted to the configured agent wallet.
- Withdrawals create pending requests when liquidity is not immediately available.
- The vault emits `LucidExitRequested(...)` events for withdrawal orchestration.
- A backend agent worker (`agent/worker.js`) can:
  - listen for `LucidExitRequested`,
  - call Lucid withdraw endpoint,
  - settle user when USDC returns to vault.
- A twice-daily APR checker (`agent/apr-checker.js`) can:
  - scan only the configured cross-chain target (Avalanche signal),
  - compare with current vault strategy APR,
  - send an on-chain signal tx on Kite (`logAprOpportunity`) if a better APR is detected,
  - optionally execute `reallocate(...)` if `APR_EXECUTE_REALLOCATION=true`.
- UI supports Lucid metrics through `app/api/lucid/metrics/route.ts`.

## Live chain behavior caveat

- These behaviors are guaranteed on-chain **only after redeploying the updated vault and pointing frontend/backend to that new address**.

---

## 3) Critical Dependencies (External)

These are required for full end-to-end production behavior:

1. A real Lucid withdrawal endpoint (`LUCID_WITHDRAW_ENDPOINT`) for agent-triggered redemption.
2. Lucid metrics endpoint (`LUCID_OFFICIAL_METRICS_URL`) for APR/rewards/TVL in UI.
3. Correct Lucid controller config on deployed vault via `configureLucid(...)`.
4. Agent wallet funded and running continuously (systemd or docker).

Without these, the app still runs, but “full Lucid production loop” is incomplete.

---

## 4) Mandatory Steps (In Order)

## Step A - Final contract deploy

1. Deploy updated vault contract.
2. Record new vault address.
3. Update:
   - frontend env: `NEXT_PUBLIC_VAULT_ADDRESS`
   - relayer env: `NEXT_PUBLIC_VAULT_ADDRESS`
   - agent env: `NEXT_PUBLIC_VAULT_ADDRESS`

## Step B - On-chain initialization

From agent wallet:

1. Call `configureLucid(...)` with:
   - Lucid controller: `0x92E2391d0836e10b9e5EAB5d56BfC286Fadec25b`
   - adapter: your LayerZero adapter address
   - destination chain id: according to Lucid redemption route
   - options: bridge adapter options bytes
   - feeWei: native fee per call
   - enabled: `true`
2. Ensure vault has enough native KITE for Lucid fee calls.

## Step C - Backend worker deployment

1. Copy `agent/.env.example` -> `agent/.env` and fill values.
2. Choose one:
   - systemd: `deploy/systemd/allocai-agent-worker.service`
   - docker: `deploy/docker/docker-compose.agent.yml`
3. Start worker and verify logs.

## Step C2 - Enable twice-daily APR signal checks

1. Ensure APR checker env vars are set (`APR_MIN_DELTA_BPS`, `APR_MIN_TVL_USD`).
2. To execute real move when threshold is met, set `APR_EXECUTE_REALLOCATION=true`.
3. Enable systemd timer:
   - `allocai-apr-check.service`
   - `allocai-apr-check.timer`
4. Verify timer status and first execution logs.

## Step D - Metrics integration deployment

1. Set:
   - `LUCID_OFFICIAL_METRICS_URL`
   - optional auth (`LUCID_API_KEY` or `LUCID_AUTH_BEARER`)
2. Confirm `/api/lucid/metrics` returns `apr`, `accruedRewards`, `tvl`.

## Step E - End-to-end test sequence (required before demo)

1. Deposit small amount (e.g., 0.1 USDC).
2. Verify vault share minting.
3. Trigger withdraw.
4. Confirm `LucidExitRequested` emitted.
5. Confirm worker receives event and calls Lucid endpoint.
6. Confirm settlement transaction sends USDC to user wallet.
7. Confirm UI updates:
   - APR from official endpoint
   - accrued rewards
   - protocol TVL

---

## 5) Nice-to-Have Before Hackathon End

1. Add alerting for stuck pending withdrawals (> X minutes).
2. Add retry policy + dead-letter logging for failed Lucid endpoint calls.
3. Add integration test script for:
   - event detection,
   - trigger call,
   - settlement.
4. Add a small liquidity-buffer policy (optional UX improvement) for faster withdrawals.
5. Record 2-minute proof demo:
   - deposit -> event -> worker trigger -> settlement -> dashboard metrics.

---

## 6) Operations Checklist (Daily)

- Worker process is online.
- APR signal timer executed in the last 12 hours.
- Monitoring table only shows:
  - Lucid / Kite Native
  - Lucid / Avalanche Signal
- No growing queue of stale pending withdrawals.
- Vault has enough KITE fee balance.
- Lucid endpoint healthy and returning successful responses.
- UI metrics endpoint healthy.

---

## 7) Submission Readiness Definition

You are submission-ready when all are true:

- Updated vault deployed and configured.
- Worker running continuously.
- One successful real user flow recorded:
  - deposit, Lucid route, withdraw request, settlement payout.
- Dashboard shows official Lucid APR/rewards/TVL.
- Demo video recorded with tx hashes and visible proof.

---

## 8) x402 Paid Agent Validation (Required)

1. Call `POST /api/paid-data` without `X-PAYMENT`.
   - Expected: HTTP `402` and JSON containing `accepts[0]` with `scheme`, `network`, `payTo`, `asset`, `resource`.
2. Retry same call with malformed `X-PAYMENT`.
   - Expected: HTTP `400` with signature/header error.
3. Retry with valid `X-PAYMENT` token.
   - Expected:
     - Facilitator settlement call succeeds.
     - Response includes `decision.strategy`.
     - Response includes `decision.proofReceipt.txHash` and receipt signature.
4. In UI, run “Run The Agent”.
   - Expected:
     - Screen auto-scrolls to decision box.
     - Decision panel shows strategy narrative with monthly USDC estimate.
     - Timeline shows payment + proof completion entries.

---

## 9) Autonomous Scheduler on VPS (No Vercel Cron Needed)

If you do not want Vercel cron, run the generic autonomous agent from your VPS.

### A) Protect the tick endpoint

Set:
- `AUTONOMOUS_TICK_SECRET=<strong-random-secret>`
- `AUTONOMOUS_INTERVAL_MS=86400000` (once/day target execution)

The endpoint `POST /api/autonomous/tick` will then require:
- header `x-autonomous-secret: <same-secret>`

### B) VPS environment

Set on VPS:
- `AUTONOMOUS_TICK_URL=https://<your-domain>/api/autonomous/tick`
- `AUTONOMOUS_TICK_SECRET=<same-secret>`

### C) Manual one-off test

```bash
npm run autonomous:tick
```

Expected:
- JSON log with `ok: true`
- payload showing either:
  - `executed: true` (run created), or
  - `executed: false` with cooldown reason.

### D) Cron (every 15 minutes example)

Use frequent trigger; cooldown window enforces actual execution cadence (once/day by default).

```cron
*/15 * * * * cd /path/to/AllocAI && /usr/bin/env AUTONOMOUS_TICK_URL="https://your-domain/api/autonomous/tick" AUTONOMOUS_TICK_SECRET="your-secret" /usr/bin/node scripts/autonomous-runner.mjs >> /var/log/allocai-autonomous.log 2>&1
```

### E) systemd timer alternative

Create service to run `node scripts/autonomous-runner.mjs` and timer every 15 minutes.
This is preferred for restart behavior, logs, and service management.

### F) Important behavior notes

- Generic autonomous runs are separate from paid user runs.
- They do not unlock paid user table state.
- They use distinct inputs:
  - autonomous portfolio size (`AUTONOMOUS_PORTFOLIO_USDC`)
  - autonomous baseline APR (`AUTONOMOUS_BASELINE_APR`)
  - aggressive decision mode + guardrails

---

## 10) x402 Agent Invocation Guide (Service Consumer)

### Step 1 - Request challenge

Call `POST /api/paid-data` without `X-PAYMENT`.

Expected: `402` with `accepts[0]` challenge payload.

### Step 2 - Acquire payment token

Use your Kite Passport / x402 agent flow to approve payment and create token.

### Step 3 - Retry with token

Call `POST /api/paid-data` with:
- `X-PAYMENT: <token>`
- same JSON request body

Expected:
- payment settles,
- response returns strategy payload,
- response includes proof receipt + tx hash.

