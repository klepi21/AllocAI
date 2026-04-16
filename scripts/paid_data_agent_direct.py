#!/usr/bin/env python3
"""
Call AllocAI POST /api/paid-data with a direct KITE payment.

Uses a payer private key from the environment (same idea as agent/.env AGENT_PRIVATE_KEY):
  - Sends native KITE to `payTo` from the server's 402 challenge (must match server DIRECT_KITE_FEE_WEI).
  - Retries the API with X-DIRECT-PAYMENT-TX + payerAddress.

This path matches verifyDirectPaymentOnChain in lib/direct-payment.ts.

Env:
  AGENT_PRIVATE_KEY or PAYING_AGENT_PRIVATE_KEY — 0x-prefixed hex (payer wallet, must hold KITE)
  ALLOCAI_BASE_URL — default https://allocai-orcin.vercel.app
  KITE_RPC_URL or NEXT_PUBLIC_KITE_RPC — default https://rpc.gokite.ai/
  ALLOCAI_DIRECT_KITE_FEE_WEI — default 250000000000000000 (0.25 KITE, 18 decimals)

Note: x402 (USDC.e + Passport) needs a facilitator-issued X-PAYMENT token, not a raw EOA key alone.
"""

from __future__ import annotations

import json
import os
import sys
import time
from typing import Any

import requests
from eth_account import Account
from web3 import Web3
from web3.types import TxReceipt


def _env(name: str, default: str | None = None) -> str | None:
    v = os.environ.get(name)
    if v is not None and str(v).strip() != "":
        return str(v).strip()
    return default


def _fee_wei() -> int:
    raw = _env("ALLOCAI_DIRECT_KITE_FEE_WEI", "250000000000000000")
    assert raw is not None
    return int(raw, 10)


def _fetch_challenge(base_url: str, body: dict[str, Any]) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}/api/paid-data"
    r = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        data=json.dumps(body),
        timeout=60,
    )
    if r.status_code != 402:
        raise RuntimeError(f"Expected HTTP 402 challenge, got {r.status_code}: {r.text[:800]}")
    return r.json()


def _send_kite_payment(
    w3: Web3, account: Account, pay_to: str, value_wei: int
) -> TxReceipt:
    pay_to = Web3.to_checksum_address(pay_to)
    chain_id = int(w3.eth.chain_id)
    nonce = w3.eth.get_transaction_count(account.address)
    gas_price = int(w3.eth.gas_price)
    tx: dict[str, Any] = {
        "to": pay_to,
        "value": value_wei,
        "nonce": nonce,
        "chainId": chain_id,
        "gas": 21_000,
        "gasPrice": gas_price,
    }
    signed = account.sign_transaction(tx)
    raw = signed.raw_transaction if hasattr(signed, "raw_transaction") else signed.rawTransaction
    h = w3.eth.send_raw_transaction(raw)
    receipt = w3.eth.wait_for_transaction_receipt(h, timeout=180)
    if receipt["status"] != 1:
        raise RuntimeError(f"KITE payment tx reverted: {receipt['transactionHash'].hex()}")
    return receipt


def _call_paid_data_paid(
    base_url: str, body: dict[str, Any], tx_hash: str, payer: str
) -> requests.Response:
    url = f"{base_url.rstrip('/')}/api/paid-data"
    return requests.post(
        url,
        headers={
            "Content-Type": "application/json",
            "X-DIRECT-PAYMENT-TX": tx_hash,
        },
        data=json.dumps({**body, "payerAddress": payer}),
        timeout=120,
    )


def main() -> int:
    key = _env("PAYING_AGENT_PRIVATE_KEY") or _env("AGENT_PRIVATE_KEY")
    if not key:
        print("Set PAYING_AGENT_PRIVATE_KEY or AGENT_PRIVATE_KEY (0x… hex).", file=sys.stderr)
        return 1

    base = _env("ALLOCAI_BASE_URL", "https://allocai-orcin.vercel.app")
    rpc = _env("KITE_RPC_URL") or _env("NEXT_PUBLIC_KITE_RPC", "https://rpc.gokite.ai/")
    fee_wei = _fee_wei()

    body: dict[str, Any] = {
        "amountUsdc": 5000,
        "risk": "low",
        "currentApr": 4.2,
    }

    print(f"Base URL: {base}")
    print(f"RPC: {rpc}")
    print(f"Direct KITE fee (wei): {fee_wei}")

    print("\n1) Fetching 402 challenge…")
    challenge = _fetch_challenge(base, body)
    accepts = challenge.get("accepts") or []
    if not accepts:
        print("402 body missing accepts:", json.dumps(challenge, indent=2)[:2000])
        return 1
    pay_to = accepts[0].get("payTo")
    if not pay_to or not Web3.is_address(pay_to):
        print("Invalid payTo in challenge:", pay_to)
        return 1
    print(f"   payTo (merchant): {Web3.to_checksum_address(pay_to)}")

    w3 = Web3(Web3.HTTPProvider(rpc))
    if not w3.is_connected():
        print("Could not connect to KITE RPC.", file=sys.stderr)
        return 1

    account = Account.from_key(key)
    payer = Web3.to_checksum_address(account.address)
    print(f"   payer: {payer}")

    bal = w3.eth.get_balance(payer)
    print(f"   payer balance (wei): {bal}")
    if bal < fee_wei + w3.eth.gas_price * 21_000:
        print("Payer may not have enough KITE for fee + gas.", file=sys.stderr)

    print("\n2) Broadcasting native KITE payment…")
    receipt = _send_kite_payment(w3, account, pay_to, fee_wei)
    tx_hash = receipt["transactionHash"].hex()
    if not tx_hash.startswith("0x"):
        tx_hash = "0x" + tx_hash
    print(f"   tx: {tx_hash}")

    # Some RPCs lag indexing; brief pause helps flaky verifiers.
    time.sleep(2)

    print("\n3) Calling /api/paid-data with X-DIRECT-PAYMENT-TX…")
    r = _call_paid_data_paid(base, body, tx_hash, payer)
    print(f"   HTTP {r.status_code}")
    try:
        data = r.json()
    except Exception:
        print(r.text[:4000])
        return 1 if not r.ok else 0

    print(json.dumps(data, indent=2)[:12000])
    return 0 if r.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
