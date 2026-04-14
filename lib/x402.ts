import { ethers } from "ethers";

export interface X402AuthorizationPayload {
  authorization: Record<string, unknown>;
  signature: string;
  network: string;
}

export interface X402AcceptsEntry {
  scheme: "gokite-aa";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: "application/json";
  outputSchema: {
    input: {
      discoverable: true;
      method: "POST";
      queryParams: Record<string, unknown>;
      type: "http";
    };
    output: {
      properties: Record<string, { description: string; type: string }>;
      required: string[];
      type: "object";
    };
  };
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: null;
  merchantName: string;
}

export interface X402ChallengeResponse {
  error: string;
  accepts: X402AcceptsEntry[];
  x402Version: 1;
}

function decodePaymentToken(token: string): unknown {
  const trimmed = token.trim();
  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const decoded = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(decoded) as unknown;
}

export function parseXPaymentHeader(headerValue: string | null): X402AuthorizationPayload | null {
  if (!headerValue) return null;
  try {
    const parsed = decodePaymentToken(headerValue);
    if (!parsed || typeof parsed !== "object") return null;
    const maybe = parsed as Partial<X402AuthorizationPayload>;
    if (!maybe.authorization || typeof maybe.authorization !== "object") return null;
    if (!maybe.signature || typeof maybe.signature !== "string") return null;
    if (!maybe.network || typeof maybe.network !== "string") return null;
    return {
      authorization: maybe.authorization as Record<string, unknown>,
      signature: maybe.signature,
      network: maybe.network
    };
  } catch {
    return null;
  }
}

export function isLikelyHexSignature(signature: string): boolean {
  return /^0x[a-fA-F0-9]{130}$/.test(signature);
}

export function buildX402Challenge(resource: string): X402ChallengeResponse {
  const network = process.env.X402_NETWORK || "kite-testnet";
  const payTo = process.env.X402_PAY_TO_ADDRESS || process.env.SERVICE_WALLET_ADDRESS || "";
  // For tokenized x402 payments this is in token base units (not wei unless token has 18 decimals).
  const maxAmountRequired = process.env.X402_MAX_AMOUNT_REQUIRED_ASSET_UNITS || "250000"; // 0.25 USDC.e (6 decimals)
  const asset = process.env.X402_ASSET || "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e"; // USDC.e on Kite mainnet
  const merchantName = process.env.X402_MERCHANT_NAME || "AllocAI";

  return {
    error: "X-PAYMENT header is required",
    accepts: [
      {
        scheme: "gokite-aa",
        network,
        maxAmountRequired,
        resource,
        description: "AllocAI premium strategy and on-chain proof API",
        mimeType: "application/json",
        outputSchema: {
          input: {
            discoverable: true,
            method: "POST",
            queryParams: {},
            type: "http"
          },
          output: {
            properties: {
              decision: { description: "Structured strategy recommendation", type: "object" },
              proofReceipt: { description: "Signed payment+proof receipt", type: "object" }
            },
            required: ["decision", "proofReceipt"],
            type: "object"
          }
        },
        payTo,
        maxTimeoutSeconds: 300,
        asset,
        extra: null,
        merchantName
      }
    ],
    x402Version: 1
  };
}

export function buildSettlementId(payload: X402AuthorizationPayload): string {
  const fingerprint = JSON.stringify(payload.authorization) + payload.signature + payload.network;
  return ethers.keccak256(ethers.toUtf8Bytes(fingerprint));
}
