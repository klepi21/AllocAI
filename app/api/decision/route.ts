import { NextResponse } from "next/server";
import { determineDecision } from "@/lib/decision-engine";
import { MOCK_YIELDS, YieldOpportunity } from "@/lib/types";

export async function POST(req: Request) {
  const { currentApr, paidDataUsed, opportunities, tvl } = await req.json();

  // If no opportunities provided, use mock data
  const data: YieldOpportunity[] = opportunities || MOCK_YIELDS;

  // TVL-aware decision engine call with Stargate-optimized fees
  const decision = determineDecision(data, currentApr, tvl || 0, "Kite AI", paidDataUsed);

  // Simulate thinking
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return NextResponse.json(decision);
}
