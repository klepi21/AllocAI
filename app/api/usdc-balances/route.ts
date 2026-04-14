import { NextResponse } from "next/server";
import { ethers } from "ethers";

const ERC20_ABI = ["function balanceOf(address account) view returns (uint256)"];

type ChainConfig = {
  chain: string;
  rpcUrl: string;
  usdcAddress: string;
  decimals: number;
};

const CHAIN_CONFIGS: ChainConfig[] = [
  {
    chain: "Kite",
    rpcUrl: process.env.NEXT_PUBLIC_KITE_RPC || "https://rpc.gokite.ai/",
    usdcAddress: "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e",
    decimals: 6
  },
  {
    chain: "Arbitrum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    decimals: 6
  },
  {
    chain: "Avalanche",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    decimals: 6
  },
  {
    chain: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    usdcAddress: "0x0b2C639c533813f4Aa9D7837CaF62653d097Ff85",
    decimals: 6
  },
  {
    chain: "Base",
    rpcUrl: "https://mainnet.base.org",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6
  },
  {
    chain: "BSC",
    rpcUrl: "https://bsc-dataseed.binance.org",
    usdcAddress: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    decimals: 18
  },
  {
    chain: "Celo",
    rpcUrl: "https://forno.celo.org",
    usdcAddress: "0x37f750B7Cc259A2f741AF45294f6a16572CF5cAd",
    decimals: 6
  }
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address");
  if (!address || !ethers.isAddress(address)) {
    return NextResponse.json({ error: "Valid address is required." }, { status: 400 });
  }

  const balances = await Promise.all(
    CHAIN_CONFIGS.map(async (config) => {
      try {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        const token = new ethers.Contract(config.usdcAddress, ERC20_ABI, provider);
        const raw = (await token.balanceOf(address)) as bigint;
        const formatted = Number(ethers.formatUnits(raw, config.decimals));
        return {
          chain: config.chain,
          balance: formatted,
          status: "ok" as const
        };
      } catch {
        return {
          chain: config.chain,
          balance: null,
          status: "unavailable" as const
        };
      }
    })
  );

  return NextResponse.json({ address, balances });
}
