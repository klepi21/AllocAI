import { NextResponse } from "next/server";
import { getLatestAutonomousRun, getRecentAutonomousRuns } from "@/lib/run-store";
import {
  AUTONOMOUS_BASELINE_APR,
  AUTONOMOUS_INTERVAL_MS,
  AUTONOMOUS_PORTFOLIO_USDC,
  AUTONOMOUS_PROFILE_LABEL,
  AUTONOMOUS_TICK_SECRET
} from "@/lib/autonomous-config";

export async function GET() {
  const latest = getLatestAutonomousRun();
  const runs = getRecentAutonomousRuns(5).map((run) => ({
    runId: run.runId,
    createdAt: run.createdAt,
    decision: run.decision,
    responseTimeMs: run.responseTimeMs ?? null,
    success: run.success ?? true
  }));

  const nextRunAt = latest
    ? new Date(new Date(latest.createdAt).getTime() + AUTONOMOUS_INTERVAL_MS).toISOString()
    : new Date(Date.now() + AUTONOMOUS_INTERVAL_MS).toISOString();

  return NextResponse.json({
    enabled: true,
    intervalHours: AUTONOMOUS_INTERVAL_MS / (60 * 60 * 1000),
    testPortfolioUsdc: AUTONOMOUS_PORTFOLIO_USDC,
    profileLabel: AUTONOMOUS_PROFILE_LABEL,
    baselineApr: AUTONOMOUS_BASELINE_APR,
    requiresServerAuth: Boolean(AUTONOMOUS_TICK_SECRET),
    latest: latest
      ? {
          runId: latest.runId,
          createdAt: latest.createdAt,
          decision: latest.decision,
          responseTimeMs: latest.responseTimeMs ?? null,
          success: latest.success ?? true
        }
      : null,
    runs,
    nextRunAt
  });
}

