import { X402AuthorizationPayload } from "@/lib/x402";

interface FacilitatorSettleResult {
  ok: boolean;
  status: number;
  settlementReference: string;
  raw: unknown;
  errorMessage?: string;
}

function extractSettlementReference(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "unknown";
  const obj = raw as Record<string, unknown>;
  const candidates = ["id", "settlementId", "reference", "paymentId", "txHash"];
  for (const key of candidates) {
    const value = obj[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "unknown";
}

export async function settleX402Payment(
  payment: X402AuthorizationPayload,
  settlementId: string
): Promise<FacilitatorSettleResult> {
  const baseUrl = process.env.X402_FACILITATOR_URL || "https://facilitator.pieverse.io";
  const url = `${baseUrl}/v2/settle`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": settlementId
      },
      body: JSON.stringify({
        authorization: payment.authorization,
        signature: payment.signature,
        network: payment.network
      }),
      signal: controller.signal
    });
    const raw = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      settlementReference: extractSettlementReference(raw),
      raw,
      errorMessage: response.ok ? undefined : "Facilitator settlement failed"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Settlement request failed";
    return {
      ok: false,
      status: 500,
      settlementReference: "unknown",
      raw: {},
      errorMessage: message
    };
  } finally {
    clearTimeout(timeout);
  }
}
