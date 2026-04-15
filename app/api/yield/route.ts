import { NextResponse } from "next/server";
import { getLiveYieldOpportunities } from "@/lib/yield-feed";
import { maskYieldTableForLocked, shouldServeFullYieldTable } from "@/lib/yield-table-access";

export async function GET(req: Request) {
  try {
    const full = await getLiveYieldOpportunities();
    const sorted = [...full].sort((a, b) => b.apr - a.apr);
    const unlocked = shouldServeFullYieldTable(req);
    const opportunities = unlocked ? sorted : maskYieldTableForLocked(sorted);
    return NextResponse.json({
      opportunities,
      yieldTableUnlocked: unlocked
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Live yield feed unavailable";
    if (message.includes("No live USDC")) {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    if (message.includes("Failed to load live")) {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    console.error("Failed to fetch live yield data:", err);
    return NextResponse.json({ error: "Live yield feed unavailable" }, { status: 500 });
  }
}
