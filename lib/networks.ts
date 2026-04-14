export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  currency: string;
}

export const KITE_NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    name: "KiteAI Testnet",
    chainId: 2368, 
    rpcUrl: "https://rpc-testnet.gokite.ai/", 
    explorerUrl: "https://testnet.kitescan.ai/",
    currency: "KITE",
  },
  mainnet: {
    name: "Kite AI Mainnet",
    chainId: 2366, 
    rpcUrl: "https://rpc.gokite.ai/", // Standardized for gokite
    explorerUrl: "https://kitescan.ai/",
    currency: "KITE",
  },
};

const envNetwork = process.env.NEXT_PUBLIC_KITE_NETWORK?.toLowerCase();
const envRpc = process.env.NEXT_PUBLIC_KITE_RPC?.toLowerCase() || "";

export const CURRENT_NETWORK_KEY: "mainnet" | "testnet" =
  envNetwork === "testnet" || envRpc.includes("testnet") ? "testnet" : "mainnet";

export const CURRENT_NETWORK = KITE_NETWORKS[CURRENT_NETWORK_KEY];
