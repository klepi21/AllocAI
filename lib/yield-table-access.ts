import crypto from "node:crypto";
import type { NextResponse } from "next/server";
import { ethers } from "ethers";
import { getLatestPaidRunByAddress } from "@/lib/run-store";
import { YieldOpportunity } from "@/lib/types";

/** Must match dashboard premium window (page.tsx). */
export const YIELD_TABLE_UNLOCK_WINDOW_MS = 10 * 60 * 1000;

const COOKIE_NAME = "allocai_yield_full";

function unlockSecret(): string {
  return process.env.YIELD_UNLOCK_SECRET || "allocai-dev-yield-unlock-set-YIELD_UNLOCK_SECRET-in-prod";
}

function teaserRowIndex(sortedLength: number): number {
  if (sortedLength <= 0) return 0;
  return Math.min(3, Math.max(0, sortedLength - 1));
}

/** Placeholder row when table is locked — no real APR/TVL/protocol (inspector-safe). */
function lockedPlaceholderRow(): YieldOpportunity {
  return {
    chain: "Locked",
    protocol: "Pay to unlock",
    asset: "USDC",
    apr: 0,
    risk: "low",
    liquidity: 0
  };
}

/**
 * Same sort as client: APR desc. Mask every row except the teaser teaser row (index 3 or last).
 */
export function maskYieldTableForLocked(sortedByAprDesc: YieldOpportunity[]): YieldOpportunity[] {
  if (sortedByAprDesc.length === 0) return sortedByAprDesc;
  const teaserIdx = teaserRowIndex(sortedByAprDesc.length);
  return sortedByAprDesc.map((opp, idx) => (idx === teaserIdx ? opp : lockedPlaceholderRow()));
}

export function buildYieldUnlockCookieValue(): string {
  const exp = Date.now() + YIELD_TABLE_UNLOCK_WINDOW_MS;
  const payload = Buffer.from(JSON.stringify({ exp }), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", unlockSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyYieldUnlockCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const m = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!m) return false;
  const raw = decodeURIComponent(m[1].trim());
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return false;
  const expectedSig = crypto.createHmac("sha256", unlockSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    if (typeof data.exp !== "number" || Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

function hasRecentPaidRunForWallet(address: string): boolean {
  const run = getLatestPaidRunByAddress(address);
  if (!run?.createdAt) return false;
  if ((run.runType || "paid") !== "paid") return false;
  return Date.now() - new Date(run.createdAt).getTime() <= YIELD_TABLE_UNLOCK_WINDOW_MS;
}

export function shouldServeFullYieldTable(req: Request): boolean {
  if (verifyYieldUnlockCookie(req.headers.get("cookie"))) return true;
  const url = new URL(req.url);
  const address = url.searchParams.get("address");
  if (address && ethers.isAddress(address) && hasRecentPaidRunForWallet(address)) {
    return true;
  }
  return false;
}

export function setYieldUnlockCookieOnResponse(res: NextResponse): void {
  const token = buildYieldUnlockCookieValue();
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.floor(YIELD_TABLE_UNLOCK_WINDOW_MS / 1000),
    path: "/"
  });
}
