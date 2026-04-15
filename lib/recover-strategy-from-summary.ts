import type { CompoundProjection, StrategyNarrative } from "@/lib/types";

function buildCompoundedProjections(principalUsdc: number, apr: number): CompoundProjection[] {
  const safePrincipal = principalUsdc > 0 ? principalUsdc : 0;
  const monthlyRate = apr / 100 / 12;
  return [2, 3, 5].map((years) => {
    const periods = years * 12;
    const projectedValueUsdc = safePrincipal * Math.pow(1 + monthlyRate, periods);
    return {
      years,
      projectedValueUsdc,
      projectedYieldUsdc: projectedValueUsdc - safePrincipal
    };
  });
}

/**
 * Parses canonical LLM/on-chain summary lines like:
 * "Optimal Low-Risk Strategy for 500.00 USDC | APR 6.00% | Allocate ... projected yield of 2.50 USDC per month."
 */
export function recoverStrategyNarrativeFromSummary(summaryText: string): StrategyNarrative {
  const aprMatch = summaryText.match(/APR\s+([\d.]+)\s*%/i);
  const apr = aprMatch ? parseFloat(aprMatch[1]) : 0;

  const amountMatch =
    summaryText.match(/Strategy\s+for\s+([\d.]+)\s*USDC/i) ||
    summaryText.match(/for\s+([\d.]+)\s*USDC/i);
  const amountUsdc = amountMatch ? parseFloat(amountMatch[1]) : 0;

  const monthlyMatch = summaryText.match(/projected yield of\s+([\d.]+)\s*USDC per month/i);
  let expectedMonthlyUsdc = monthlyMatch ? parseFloat(monthlyMatch[1]) : 0;
  if (!expectedMonthlyUsdc && amountUsdc > 0 && apr > 0) {
    expectedMonthlyUsdc = (amountUsdc * (apr / 100)) / 12;
  }
  const expectedAnnualUsdc =
    amountUsdc > 0 && apr > 0 ? amountUsdc * (apr / 100) : expectedMonthlyUsdc > 0 ? expectedMonthlyUsdc * 12 : 0;

  const firstSegment = summaryText.split("|")[0]?.trim() || "";
  const headline =
    firstSegment.length > 5 && firstSegment.length < 200 ? firstSegment : "Kite strategy run";

  return {
    headline,
    recommendation: summaryText,
    expectedMonthlyUsdc,
    expectedAnnualUsdc,
    apr,
    reinvestCadence: "Monthly",
    riskNotes: ["Figures parsed from on-chain strategy summary when full server record is unavailable."],
    executionSteps: [
      "Confirm the protocol and chain in the summary match your intent.",
      "Open the protocol or research link below and complete the deposit in the referenced pool or vault.",
      "Track APR and compound or rebalance on your preferred schedule (e.g. monthly)."
    ],
    compoundedProjections: buildCompoundedProjections(amountUsdc, apr)
  };
}

/**
 * When API returns sparse strategy (e.g. chain-only recovery on Vercel), re-hydrate from recommendation text.
 */
export function mergeStrategyIfSparse(strategy: StrategyNarrative): StrategyNarrative {
  const needsRecovery =
    (strategy.apr <= 0 || strategy.expectedMonthlyUsdc <= 0) &&
    typeof strategy.recommendation === "string" &&
    (strategy.recommendation.length > 15 || /APR\s*[\d.]+/i.test(strategy.recommendation));

  if (!needsRecovery) return strategy;

  const recovered = recoverStrategyNarrativeFromSummary(strategy.recommendation);
  return {
    ...strategy,
    headline: recovered.headline || strategy.headline,
    apr: recovered.apr > 0 ? recovered.apr : strategy.apr,
    expectedMonthlyUsdc:
      recovered.expectedMonthlyUsdc > 0 ? recovered.expectedMonthlyUsdc : strategy.expectedMonthlyUsdc,
    expectedAnnualUsdc:
      recovered.expectedAnnualUsdc > 0 ? recovered.expectedAnnualUsdc : strategy.expectedAnnualUsdc,
    compoundedProjections:
      recovered.compoundedProjections.some((c) => c.projectedValueUsdc > 0)
        ? recovered.compoundedProjections
        : strategy.compoundedProjections,
    executionSteps:
      (strategy.executionSteps?.length || 0) <= 1 && recovered.executionSteps.length > 1
        ? recovered.executionSteps
        : strategy.executionSteps?.length
          ? strategy.executionSteps
          : recovered.executionSteps,
    riskNotes: strategy.riskNotes?.length ? strategy.riskNotes : recovered.riskNotes
  };
}

export function extractProtocolHintFromSummary(text: string): string {
  const known = [
    "Aave",
    "Morpho",
    "Compound",
    "GMX",
    "Curve",
    "Uniswap",
    "Aerodrome",
    "Stargate",
    "Balancer",
    "Pendle",
    "Spark"
  ];
  const lower = text.toLowerCase();
  for (const k of known) {
    if (lower.includes(k.toLowerCase())) return k;
  }
  return "yield strategy";
}
