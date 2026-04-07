import { NextResponse } from "next/server";
import { YieldOpportunity } from "@/lib/types";

// In-memory cache for production data
let cachedYields: YieldOpportunity[] | null = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export async function GET() {
  const now = Date.now();

  // Return cached results if fresh
  if (cachedYields && (now - lastCacheUpdate) < CACHE_DURATION) {
    return NextResponse.json({ opportunities: cachedYields });
  }

  try {
    const response = await fetch('https://yields.llama.fi/pools', {
      next: { revalidate: 300 } // Next.js level caching
    });
    const { data } = await response.json();

    // 1. Filter for Stablecoin opportunities on major chains
    const primaryChains = ['Ethereum', 'Base', 'Arbitrum', 'Optimism'];
    const lucidCompatibleProtocols = ['aave-v3', 'makerdao', 'morpho-blue', 'compound-v3', 'angle', 'ethena', 'fluid', 'sky-lending'];

    const filtered = data
      .filter((pool: any) => 
        pool.stablecoin === true && 
        pool.tvlUsd > 5000000 && // Higher hurdle for "Lucid Grade"
        primaryChains.includes(pool.chain) &&
        lucidCompatibleProtocols.includes(pool.project)
      )
      .sort((a: any, b: any) => b.apy - a.apy)
      .slice(0, 14); // Leave space for Lucid

    // 2. Map to AllocAI Internal Type and Inject Lucid Native Yield
    const mapped: YieldOpportunity[] = filtered.map((pool: any) => ({
      chain: pool.chain,
      protocol: pool.project.charAt(0).toUpperCase() + pool.project.slice(1).replace(/-/g, ' '),
      asset: pool.symbol,
      apr: pool.apy,
      risk: pool.tvlUsd > 100000000 ? "low" : "medium",
      liquidity: pool.tvlUsd
    }));

    // Inject Official Lucid Kite Native L-USDC
    const lucidNative: YieldOpportunity = {
        chain: "Kite AI",
        protocol: "Lucid / Kite Native",
        asset: "L-USDC",
        apr: 5.85, // Current Aave v3 yield + Lucid optimization
        risk: "low",
        liquidity: 25000000 // Sample TVL from documentation context
    };

    const finalOpportunities = [lucidNative, ...mapped];

    // Update Cache
    cachedYields = finalOpportunities;
    lastCacheUpdate = now;

    return NextResponse.json({ opportunities: finalOpportunities });
  } catch (err) {
    console.error("Failed to fetch DeFi Llama data:", err);
    // Silent fail over if needed, or return error
    return NextResponse.json({ error: "Upstream indexing failure" }, { status: 500 });
  }
}
