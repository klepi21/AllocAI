export interface YieldOpportunity {
  chain: string;
  protocol: string;
  asset: string;
  apr: number;
  risk: "low" | "medium" | "high";
  liquidity: number;
}

export type AgentAction = "hold" | "move" | "buy_data";

export interface AgentDecision {
  action: AgentAction;
  from?: string;
  to?: string;
  reason: string;
  confidence: number;
  selectedOpportunity?: YieldOpportunity;
  paidDataUsed: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  message: string;
  type: "scan" | "purchase" | "decision" | "on-chain";
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
