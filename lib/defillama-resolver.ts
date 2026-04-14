type LlamaProtocol = {
  name?: string;
  slug?: string;
};

let cachedProtocols: LlamaProtocol[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 1000 * 60 * 10;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && token !== "v1" && token !== "v2" && token !== "v3");
}

async function loadProtocols(): Promise<LlamaProtocol[]> {
  const now = Date.now();
  if (cachedProtocols && now - cacheTimestamp < CACHE_TTL_MS) return cachedProtocols;
  const response = await fetch("https://api.llama.fi/protocols", { next: { revalidate: 600 } });
  if (!response.ok) return cachedProtocols || [];
  const payload = (await response.json()) as unknown;
  const protocols = Array.isArray(payload) ? (payload as LlamaProtocol[]) : [];
  cachedProtocols = protocols;
  cacheTimestamp = now;
  return protocols;
}

function scoreMatch(hint: string, protocol: LlamaProtocol): number {
  const slug = normalize(protocol.slug || "");
  const name = normalize(protocol.name || "");
  if (!slug && !name) return -1;
  const hintTokens = tokenize(hint);
  if (hintTokens.length === 0) return -1;

  let score = 0;
  for (const token of hintTokens) {
    if (slug === token || name === token) score += 8;
    if (slug.includes(token)) score += 4;
    if (name.includes(token)) score += 3;
  }
  if (hint.includes("morpho") && slug.includes("morpho")) score += 10;
  if (hint.includes("aave") && slug.includes("aave")) score += 10;
  if (hint.includes("compound") && slug.includes("compound")) score += 10;
  return score;
}

export async function resolveDefiLlamaUrl(protocolHint: string): Promise<string | null> {
  const normalizedHint = normalize(protocolHint);
  if (!normalizedHint) return null;
  const protocols = await loadProtocols();
  if (!protocols.length) return null;

  let best: LlamaProtocol | null = null;
  let bestScore = -1;
  for (const protocol of protocols) {
    const score = scoreMatch(normalizedHint, protocol);
    if (score > bestScore) {
      bestScore = score;
      best = protocol;
    }
  }
  if (!best || bestScore < 5 || !best.slug) return null;
  return `https://defillama.com/protocol/${best.slug}`;
}
