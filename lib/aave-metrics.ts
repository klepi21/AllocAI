import { ethers } from "ethers";

type SupportedAaveChain = "arbitrum" | "avalanche";

type AaveChainConfig = {
  key: SupportedAaveChain;
  label: "Arbitrum" | "Avalanche";
  rpcUrl: string;
  poolAddress: string;
  usdcAddress: string;
  usdcDecimals: number;
};

const AAVE_POOL_V3 = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
const ARBITRUM_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const AVALANCHE_USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

const POOL_ABI = [
  "function getReserveData(address asset) view returns (uint256,uint128,uint128,uint128,uint128,uint128,uint40,uint16,address,address,address,address,uint128,uint128,uint128)"
];

const ERC20_ABI = ["function totalSupply() view returns (uint256)"];

const CHAIN_CONFIGS: Record<SupportedAaveChain, AaveChainConfig> = {
  arbitrum: {
    key: "arbitrum",
    label: "Arbitrum",
    rpcUrl: process.env.AAVE_ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc",
    poolAddress: process.env.AAVE_ARBITRUM_POOL || AAVE_POOL_V3,
    usdcAddress: process.env.AAVE_ARBITRUM_USDC || ARBITRUM_USDC,
    usdcDecimals: 6
  },
  avalanche: {
    key: "avalanche",
    label: "Avalanche",
    rpcUrl: process.env.AAVE_AVALANCHE_RPC || "https://api.avax.network/ext/bc/C/rpc",
    poolAddress: process.env.AAVE_AVALANCHE_POOL || AAVE_POOL_V3,
    usdcAddress: process.env.AAVE_AVALANCHE_USDC || AVALANCHE_USDC,
    usdcDecimals: 6
  }
};

function clampPositive(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function resolveAaveChain(input?: string | null): SupportedAaveChain {
  const value = (input || "").toLowerCase();
  if (value.includes("arbitrum")) return "arbitrum";
  if (value.includes("avalanche")) return "avalanche";
  const fallback = (process.env.DEFAULT_AAVE_CHAIN || "avalanche").toLowerCase();
  return fallback.includes("arbitrum") ? "arbitrum" : "avalanche";
}

export type AaveDirectMetrics = {
  chain: "Arbitrum" | "Avalanche";
  apr: number;
  accruedRewards: number;
  tvl: number;
  reserveLastUpdateTs: number;
};

export async function getAaveDirectMetrics(params: {
  chain: SupportedAaveChain;
  principalUsdc?: number;
  sinceTs?: number;
}): Promise<AaveDirectMetrics> {
  const { chain, principalUsdc = 0, sinceTs } = params;
  const config = CHAIN_CONFIGS[chain];

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const pool = new ethers.Contract(config.poolAddress, POOL_ABI, provider);
  const reserveData = await pool.getReserveData(config.usdcAddress);

  const liquidityRateRay = reserveData[2] as bigint;
  const reserveLastUpdate = Number(reserveData[6] as bigint);
  const aTokenAddress = reserveData[8] as string;

  const aToken = new ethers.Contract(aTokenAddress, ERC20_ABI, provider);
  const totalSupplyRaw = (await aToken.totalSupply()) as bigint;

  const apr = clampPositive(parseFloat(ethers.formatUnits(liquidityRateRay, 27)) * 100);
  const tvl = clampPositive(parseFloat(ethers.formatUnits(totalSupplyRaw, config.usdcDecimals)));

  const nowTs = Math.floor(Date.now() / 1000);
  const startTs = clampPositive(sinceTs ?? reserveLastUpdate);
  const elapsed = clampPositive(nowTs - startTs);
  const principal = clampPositive(principalUsdc);
  const accruedRewards = clampPositive((principal * (apr / 100) * elapsed) / SECONDS_PER_YEAR);

  return {
    chain: config.label,
    apr,
    accruedRewards,
    tvl,
    reserveLastUpdateTs: reserveLastUpdate
  };
}
