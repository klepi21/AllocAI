"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers, BrowserProvider, JsonRpcSigner } from "ethers";
import { CURRENT_NETWORK } from "@/lib/networks";

export const useKiteWallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const connect = useCallback(async (forceSelection: boolean = true) => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("Please install a wallet like MetaMask to use AllocAI.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let ethProvider = window.ethereum;

      // Handle multi-wallet environments (e.g., MetaMask + Phantom)
      if (window.ethereum?.providers?.length) {
        ethProvider = window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum.providers[0];
      }

      const browserProvider = new BrowserProvider(ethProvider);
      
      // ONLY force account selection if explicitly requested (manually clicked)
      if (forceSelection) {
        await browserProvider.send("wallet_requestPermissions", [
          { eth_accounts: {} },
        ]);
      }

      const accounts = await browserProvider.send("eth_requestAccounts", []);
      
      const chainIdHex = await browserProvider.send("eth_chainId", []);
      const chainId = parseInt(chainIdHex, 16);

      // Auto-switch to Kite Network
      if (chainId !== CURRENT_NETWORK.chainId) {
        try {
          await browserProvider.send("wallet_switchEthereumChain", [
            { chainId: `0x${CURRENT_NETWORK.chainId.toString(16)}` },
          ]);
        } catch (switchError: any) {
          // If network doesn't exist, try adding it
          if (switchError.code === 4902) {
            try {
              await browserProvider.send("wallet_addEthereumChain", [
                {
                  chainId: `0x${CURRENT_NETWORK.chainId.toString(16)}`,
                  chainName: CURRENT_NETWORK.name,
                  rpcUrls: [CURRENT_NETWORK.rpcUrl],
                  nativeCurrency: {
                    name: CURRENT_NETWORK.currency,
                    symbol: CURRENT_NETWORK.currency,
                    decimals: 18,
                  },
                  blockExplorerUrls: [CURRENT_NETWORK.explorerUrl],
                },
              ]);
            } catch (addError) {
               console.error("Failed to add Kite network:", addError);
            }
          }
        }
      }

      const signerInstance = await browserProvider.getSigner();
      const accountsFinal = await browserProvider.send("eth_accounts", []);
      const balance = await browserProvider.getBalance(accountsFinal[0]);

      setAddress(accountsFinal[0]);
      setBalance(ethers.formatEther(balance));
      setProvider(browserProvider);
      setSigner(signerInstance);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setError(err.message || "Connection failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = () => {
    setAddress(null);
    setBalance(null);
    setSigner(null);
    setProvider(null);
  };

  // Eager Connection: check if already connected on mount
  useEffect(() => {
    if (mounted && !address && typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            connect(false); // Connect SILENTLY on refresh
          }
        })
        .catch(console.error);
    }
  }, [mounted, address, connect]);

  // Re-connect automatically if accounts change
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          disconnect();
        }
      });
    }
  }, []);

  return { address, balance, loading, error, provider, signer, connect, disconnect };
};
