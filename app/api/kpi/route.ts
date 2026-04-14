import { NextResponse } from "next/server";
import { getAllRuns } from "@/lib/run-store";

export async function GET() {
  const runs = getAllRuns();
  const paidRuns = runs.filter((run) => (run.runType || "paid") === "paid");
  const autonomousRuns = runs.filter((run) => run.runType === "autonomous");
  const successRuns = runs.filter((run) => run.success !== false);
  const responseSamples = runs
    .map((run) => run.responseTimeMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const avgResponseMs = responseSamples.length
    ? Math.round(responseSamples.reduce((acc, value) => acc + value, 0) / responseSamples.length)
    : 0;

  const proofsPosted = runs.filter((run) => Boolean(run.decision.proofReceipt?.txHash)).length;
  const successRate = runs.length ? (successRuns.length / runs.length) * 100 : 0;

  return NextResponse.json({
    totalRuns: runs.length,
    paidRuns: paidRuns.length,
    autonomousRuns: autonomousRuns.length,
    proofsPosted,
    avgResponseMs,
    successRate: Number(successRate.toFixed(2))
  });
}

