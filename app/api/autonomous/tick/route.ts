import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { determineDecision } from "@/lib/decision-engine";
import { applyGuardrails, getGuardrailPolicy } from "@/lib/guardrails";
import { generateStrategyNarrative } from "@/lib/strategy-llm";
import { publishRunProofAndSignReceipt } from "@/lib/proof-receipt";
import { savePaidRun, getLatestAutonomousRun } from "@/lib/run-store";
import { YieldOpportunity } from "@/lib/types";
import {
  AUTONOMOUS_BASELINE_APR,
  AUTONOMOUS_INTERVAL_MS,
  AUTONOMOUS_PORTFOLIO_USDC,
  AUTONOMOUS_PROFILE_LABEL,
  AUTONOMOUS_RISK_PROFILE,
  AUTONOMOUS_TICK_SECRET
} from "@/lib/autonomous-config";

function shouldRun(lastRunAt: string | null): boolean {
  if (!lastRunAt) return true;
  return Date.now() - new Date(lastRunAt).getTime() >= AUTONOMOUS_INTERVAL_MS;
}

export async function POST(req: Request) {
  if (AUTONOMOUS_TICK_SECRET) {
    const providedSecret = req.headers.get("x-autonomous-secret") || "";
    if (providedSecret !== AUTONOMOUS_TICK_SECRET) {
      return NextResponse.json({ executed: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const startedAt = Date.now();
  const latest = getLatestAutonomousRun();
  const lastRunAt = latest?.createdAt || null;

  if (!shouldRun(lastRunAt)) {
    return NextResponse.json({
      executed: false,
      reason: "cooldown_active",
      nextRunAt: lastRunAt ? new Date(new Date(lastRunAt).getTime() + AUTONOMOUS_INTERVAL_MS).toISOString() : null
    });
  }

  try {
    const origin = new URL(req.url).origin;
    const yieldRes = await fetch(`${origin}/api/yield`, { cache: "no-store" });
    if (!yieldRes.ok) {
      return NextResponse.json({ executed: false, error: "yield_feed_unavailable" }, { status: 502 });
    }
    const yieldPayload = (await yieldRes.json()) as { opportunities?: YieldOpportunity[] };
    const opportunities = Array.isArray(yieldPayload.opportunities) ? yieldPayload.opportunities : [];
    if (!opportunities.length) {
      return NextResponse.json({ executed: false, error: "no_opportunities" }, { status: 502 });
    }

    const sourceChain = process.env.AGENT_SOURCE_CHAIN || "Kite AI";
    const baseDecision = determineDecision(
      opportunities,
      AUTONOMOUS_BASELINE_APR,
      AUTONOMOUS_PORTFOLIO_USDC,
      sourceChain,
      true,
      "aggressive"
    );
    const guarded = applyGuardrails(baseDecision, {
      amountUsdc: AUTONOMOUS_PORTFOLIO_USDC,
      policy: getGuardrailPolicy()
    });
    const strategy = await generateStrategyNarrative({
      amountUsdc: AUTONOMOUS_PORTFOLIO_USDC,
      riskProfile: AUTONOMOUS_RISK_PROFILE,
      decision: guarded.decision,
      opportunities
    });

    const runId = ethers.hexlify(ethers.randomBytes(16));
    const proofReceipt = await publishRunProofAndSignReceipt({
      runId,
      paymentReference: "AUTONOMOUS_INTERNAL",
      settlementReference: "AUTONOMOUS_INTERNAL",
      strategy
    });

    const createdAt = new Date().toISOString();
    const decisionPayload = {
      ...guarded.decision,
      reason: `[AUTONOMOUS PROFILE] ${guarded.decision.reason}`,
      strategy,
      proofReceipt,
      paymentStatus: "settled" as const,
      runId
    };
    const runLogs = [
      {
        id: `${runId}-1`,
        timestamp: createdAt,
        message: `Autonomous scheduler triggered: ${AUTONOMOUS_PROFILE_LABEL}.`,
        type: "decision" as const
      },
      {
        id: `${runId}-2`,
        timestamp: createdAt,
        message: guarded.blockedBy.length
          ? `Guardrails applied: ${guarded.blockedBy.join(", ")}`
          : "Guardrails passed.",
        type: "decision" as const
      },
      {
        id: `${runId}-3`,
        timestamp: createdAt,
        message: `On-chain proof anchored (${proofReceipt.txHash.slice(0, 12)}...).`,
        type: "proof" as const
      }
    ];

    savePaidRun({
      runId,
      payerAddress: null,
      paymentReference: "AUTONOMOUS_INTERNAL",
      settlementReference: "AUTONOMOUS_INTERNAL",
      paymentTo: process.env.X402_PAY_TO_ADDRESS || "AUTONOMOUS",
      decision: decisionPayload,
      logs: runLogs,
      createdAt,
      runType: "autonomous",
      success: true,
      responseTimeMs: Date.now() - startedAt
    });

    return NextResponse.json({
      executed: true,
      runId,
      createdAt,
      nextRunAt: new Date(Date.now() + AUTONOMOUS_INTERVAL_MS).toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        executed: false,
        error: error instanceof Error ? error.message : "unknown_error"
      },
      { status: 500 }
    );
  }
}

