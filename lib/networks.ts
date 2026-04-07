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

// Toggle manually between 'testnet' and 'mainnet'
export const CURRENT_NETWORK = KITE_NETWORKS.mainnet;
