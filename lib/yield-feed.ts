import { YieldOpportunity } from "@/lib/types";

let cachedYields: YieldOpportunity[] | null = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 1000 * 60 * 5;
const DEFILLAMA_YIELDS_API = "https://yields.llama.fi/pools";
const TARGET_CHAINS = ["arbitrum", "avalanche", "base", "optimism", "bsc", "celo"] as const;
const MAX_OPPORTUNITIES_PER_CHAIN = 2;

type LlamaPool = {
  pool?: string;
  chain?: string;
  project?: string;
  symbol?: string;
  apy?: number;
  tvlUsd?: number;
  stablecoin?: boolean;
  url?: string;
};

function normalizeChain(chain: string | undefined) {
  return (chain || "").toLowerCase().trim();
}

function isUsdcSymbol(symbol: string | undefined) {
  return (symbol || "").toUpperCase().includes("USDC");
}

function toProtocolLabel(project: string | undefined) {
  const raw = (project || "Unknown").replace(/[-_]/g, " ").trim();
  if (!raw) return "Unknown";
  return raw
    .split(/\s+/)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(" ");
}

function toDefiLlamaSlug(project: string | undefined): string | null {
  const raw = (project || "").toLowerCase().trim();
  if (!raw) return null;
  return raw
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toChainLabel(chain: string) {
  if (chain === "bsc") return "BSC";
  return `${chain.charAt(0).toUpperCase()}${chain.slice(1)}`;
}

function inferRisk(apr: number): YieldOpportunity["risk"] {
  if (apr < 8) return "low";
  if (apr < 18) return "medium";
  return "high";
}

/**
 * Full live yield list (server-only). Used by /api/yield (after access check) and autonomous tick.
 * Not exposed to browsers without unlock — see yield-table-access.
 */
export async function getLiveYieldOpportunities(): Promise<YieldOpportunity[]> {
  const now = Date.now();
  if (cachedYields && now - lastCacheUpdate < CACHE_DURATION) {
    return cachedYields;
  }

  const response = await fetch(DEFILLAMA_YIELDS_API, {
    next: { revalidate: 300 }
  });
  if (!response.ok) {
    throw new Error("Failed to load live APR/TVL feed");
  }
  const payload = await response.json();
  const pools: LlamaPool[] = Array.isArray(payload?.data) ? payload.data : [];

  const finalOpportunities: YieldOpportunity[] = TARGET_CHAINS.flatMap((chain) => {
    const bestPools = pools
      .filter((pool) => {
        const poolChain = normalizeChain(pool.chain);
        const apy = typeof pool.apy === "number" ? pool.apy : NaN;
        const tvlUsd = typeof pool.tvlUsd === "number" ? pool.tvlUsd : NaN;
        return (
          poolChain === chain &&
          isUsdcSymbol(pool.symbol) &&
          pool.stablecoin === true &&
          Number.isFinite(apy) &&
          Number.isFinite(tvlUsd) &&
          apy >= 0 &&
          tvlUsd > 0
        );
      })
      .sort((a, b) => {
        const aTvl = typeof a.tvlUsd === "number" ? a.tvlUsd : 0;
        const bTvl = typeof b.tvlUsd === "number" ? b.tvlUsd : 0;
        if (bTvl !== aTvl) return bTvl - aTvl;
        const aApy = typeof a.apy === "number" ? a.apy : 0;
        const bApy = typeof b.apy === "number" ? b.apy : 0;
        return bApy - aApy;
      })
      .slice(0, MAX_OPPORTUNITIES_PER_CHAIN);

    return bestPools
      .filter((pool): pool is LlamaPool & { apy: number; tvlUsd: number } =>
        typeof pool.apy === "number" && typeof pool.tvlUsd === "number"
      )
      .map((pool) => {
        const apr = pool.apy;
        const defillamaSlug = toDefiLlamaSlug(pool.project);
        return {
          chain: toChainLabel(chain),
          protocol: toProtocolLabel(pool.project),
          asset: "USDC",
          apr,
          risk: inferRisk(apr),
          liquidity: pool.tvlUsd,
          strategyUrl: typeof pool.url === "string" ? pool.url : undefined,
          defillamaProject: defillamaSlug || undefined,
          defillamaUrl: defillamaSlug ? `https://defillama.com/protocol/${defillamaSlug}` : undefined
        } as YieldOpportunity;
      });
  });

  if (finalOpportunities.length === 0) {
    throw new Error("No live USDC opportunities available from data provider.");
  }

  cachedYields = finalOpportunities;
  lastCacheUpdate = now;
  return finalOpportunities;
}
