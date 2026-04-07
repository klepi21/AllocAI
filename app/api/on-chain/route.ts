import { NextResponse } from "next/server";
import { logDecisionOnChain } from "@/lib/kite";

export async function POST(req: Request) {
  const decisionData = await req.json();
  const result = await logDecisionOnChain(decisionData);
  return NextResponse.json(result);
}
