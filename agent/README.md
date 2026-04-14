# AllocAI Agent Worker

This folder contains the backend worker that handles Lucid withdrawal orchestration.

## Why this exists

On the current Lucid controller ABI, there is no single local `unstake/redeem` Solidity function exposed for your vault to call directly on user withdraw.

So the production-safe flow is:

1. User calls `withdraw` on vault.
2. Vault emits `LucidExitRequested(requestId, user, assets, chain)`.
3. Backend agent listens for that event and triggers Lucid redemption API.
4. When funds are back on the vault, agent calls `settleCrossChainWithdrawal(user)`.

This keeps the flow auditable and deterministic.

## Files

- `worker.js`: long-running event listener + settlement loop.
- `apr-checker.js`: one-shot APR scanner. If a better APR is found, it logs a signal tx on Kite chain and does not move funds.
- `state.json`: created automatically to persist progress and tracked users.

## Required environment variables

- `AGENT_PRIVATE_KEY`: private key of the vault agent wallet (must match `authorizedAgent` in contract)
- `NEXT_PUBLIC_VAULT_ADDRESS`: deployed vault address
- `NEXT_PUBLIC_KITE_RPC` (optional): defaults to `https://rpc.gokite.ai/`
- `LUCID_WITHDRAW_ENDPOINT`: Lucid redemption API endpoint to trigger unstake/return flow
- `LUCID_WITHDRAW_API_KEY` (optional): API key header for Lucid endpoint
- `AGENT_POLL_INTERVAL_MS` (optional): default `15000`
- `AGENT_START_BLOCK_OFFSET` (optional): default `250`
- `APR_MIN_DELTA_BPS` (optional): minimum APR advantage before logging signal tx (default `25`)
- `APR_MIN_TVL_USD` (optional): minimum pool TVL filter (default `5000000`)
- `APR_FEED_URL` (optional): APR source (default `https://yields.llama.fi/pools`)
- `APR_EXECUTE_REALLOCATION` (optional): set `true` to execute real `reallocate(...)` when threshold is met
- `REALLOCATION_PROTOCOL` (optional): protocol label used during reallocation tx
- `REALLOCATION_CHAIN` (optional): target chain label used during reallocation tx

## Run

```bash
npm run agent:worker
```

APR checker (manual):

```bash
npm run agent:apr-check
```

## What the worker does

1. Reads latest `LucidExitRequested` events since last processed block.
2. Calls your configured Lucid withdraw endpoint with request payload.
3. Keeps user in a tracked list until pending withdrawal becomes settleable.
4. Auto-calls `settleCrossChainWithdrawal(user)` when vault liquid USDC is enough.

## Twice-daily APR checks (no fund movement)

Use `deploy/systemd/allocai-apr-check.service` with `deploy/systemd/allocai-apr-check.timer`.

Behavior:

1. Reads current vault strategy APR from chain.
2. Scans only the configured cross-chain target (Avalanche signal route).
3. If better by threshold, sends an on-chain signal tx via `logAprOpportunity(...)`.
4. If `APR_EXECUTE_REALLOCATION=true`, it also executes a real `reallocate(...)` tx.

Monitoring scope is intentionally narrow for hackathon clarity:

- Lucid / Kite Native
- Lucid / Avalanche Signal

