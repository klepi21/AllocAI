export interface YieldOpportunity {
  chain: string;
  protocol: string;
  asset: string;
  apr: number;
  risk: "low" | "medium" | "high";
  liquidity: number;
  strategyUrl?: string;
  defillamaProject?: string;
  defillamaUrl?: string;
}

export type AgentAction = "hold" | "move" | "buy_data";

export interface CompoundProjection {
  years: number;
  projectedValueUsdc: number;
  projectedYieldUsdc: number;
}

export interface StrategyNarrative {
  headline: string;
  recommendation: string;
  expectedMonthlyUsdc: number;
  expectedAnnualUsdc: number;
  apr: number;
  reinvestCadence: string;
  riskNotes: string[];
  executionSteps: string[];
  compoundedProjections: CompoundProjection[];
}

export interface AgentProofReceipt {
  runId: string;
  paymentReference: string;
  settlementReference: string;
  strategyHash: string;
  txHash: string;
  summaryTxHash?: string;
  summaryExcerpt?: string;
  timestamp: string;
  signer: string;
  signature: string;
}

export interface AgentDecision {
  action: AgentAction;
  from?: string;
  to?: string;
  reason: string;
  confidence: number;
  selectedOpportunity?: YieldOpportunity;
  strategyProtocolUrl?: string;
  strategyDefiLlamaUrl?: string;
  paidDataUsed: boolean;
  strategy?: StrategyNarrative;
  proofReceipt?: AgentProofReceipt;
  paymentStatus?: "pending" | "settled";
  runId?: string;
  strategyLink?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  message: string;
  type: "scan" | "purchase" | "decision" | "on-chain" | "payment" | "proof";
}

export const MOCK_YIELDS: YieldOpportunity[] = [
  {
    chain: "Ethereum",
    protocol: "Aave V3",
    asset: "USDC",
    apr: 5.2,
    risk: "low",
    liquidity: 10000000,
  },
  {
    chain: "Base",
    protocol: "Aerodrome",
    asset: "USDC-USDbC",
    apr: 12.5,
    risk: "medium",
    liquidity: 500000,
  },
  {
    chain: "Arbitrum",
    protocol: "GMX",
    asset: "USDC",
    apr: 8.1,
    risk: "medium",
    liquidity: 2000000,
  },
  {
    chain: "Ethereum",
    protocol: "Compound V3",
    asset: "USDT",
    apr: 4.8,
    risk: "low",
    liquidity: 15000000,
  },
  {
    chain: "Base",
    protocol: "Compound V3",
    asset: "USDC",
    apr: 6.5,
    risk: "low",
    liquidity: 800000,
  },
];
