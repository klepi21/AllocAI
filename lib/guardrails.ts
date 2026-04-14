import { AgentDecision } from "@/lib/types";

export interface GuardrailPolicy {
  maxSlippageBps: number;
  maxAllocationPerProtocolPct: number;
  minTvlUsd: number;
  minConfidence: number;
  cooldownWindowMs: number;
}

export interface GuardrailResult {
  decision: AgentDecision;
  blockedBy: string[];
}

export function getGuardrailPolicy(): GuardrailPolicy {
  return {
    maxSlippageBps: Number(process.env.AGENT_MAX_SLIPPAGE_BPS || "150"),
    maxAllocationPerProtocolPct: Number(process.env.AGENT_MAX_ALLOCATION_PER_PROTOCOL_PCT || "100"),
    minTvlUsd: Number(process.env.AGENT_MIN_TVL_USD || "1000000"),
    minConfidence: Number(process.env.AGENT_MIN_CONFIDENCE || "0.8"),
    cooldownWindowMs: Number(process.env.AGENT_COOLDOWN_MS || `${12 * 60 * 60 * 1000}`)
  };
}

export function applyGuardrails(
  decision: AgentDecision,
  context: { amountUsdc: number; policy?: GuardrailPolicy }
): GuardrailResult {
  const policy = context.policy || getGuardrailPolicy();
  const blockedBy: string[] = [];
  const liquidity = decision.selectedOpportunity?.liquidity ?? 0;
  const confidence = decision.confidence ?? 0;

  const estimatedSlippageBps =
    liquidity > 0 && context.amountUsdc > 0 ? (context.amountUsdc / liquidity) * 10_000 : 0;

  if (liquidity > 0 && liquidity < policy.minTvlUsd) blockedBy.push("min_tvl");
  if (confidence < policy.minConfidence) blockedBy.push("min_confidence");
  if (estimatedSlippageBps > policy.maxSlippageBps) blockedBy.push("max_slippage");
  if (policy.maxAllocationPerProtocolPct < 100 && context.amountUsdc > 0) blockedBy.push("max_allocation");

  if (blockedBy.length === 0) return { decision, blockedBy };

  return {
    blockedBy,
    decision: {
      ...decision,
      action: "hold",
      reason: `Guardrails blocked move: ${blockedBy.join(", ")}`
    }
  };
}

