"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers, BrowserProvider, JsonRpcSigner } from "ethers";
import { CURRENT_NETWORK, CURRENT_NETWORK_KEY, KITE_NETWORKS } from "@/lib/networks";

export const useKiteWallet = (networkName: "mainnet" | "testnet" = CURRENT_NETWORK_KEY) => {
  const DISCONNECT_LOCK_KEY = "allocai_wallet_disconnect_lock";
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [disconnectLocked, setDisconnectLocked] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const locked = window.localStorage.getItem(DISCONNECT_LOCK_KEY) === "1";
      setDisconnectLocked(locked);
    }
  }, []);

  const connect = useCallback(async (forceSelection: boolean = true) => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("Please install a wallet like MetaMask to use AllocAI.");
      return;
    }

    setLoading(true);
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DISCONNECT_LOCK_KEY);
    }
    setDisconnectLocked(false);

    try {
      let ethProvider = window.ethereum;

      if (window.ethereum?.providers?.length) {
        ethProvider = window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum.providers[0];
      }

      const targetNetwork = KITE_NETWORKS[networkName] || CURRENT_NETWORK;
      
      const browserProvider = new BrowserProvider(ethProvider);
      
      if (forceSelection) {
        await browserProvider.send("wallet_requestPermissions", [
          { eth_accounts: {} },
        ]);
      }

      const accounts = await browserProvider.send("eth_requestAccounts", []);
      
      const chainIdHex = await browserProvider.send("eth_chainId", []);
      const chainId = parseInt(chainIdHex, 16);

      if (chainId !== targetNetwork.chainId) {
        try {
          await browserProvider.send("wallet_switchEthereumChain", [
            { chainId: `0x${targetNetwork.chainId.toString(16)}` },
          ]);
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await browserProvider.send("wallet_addEthereumChain", [
                {
                  chainId: `0x${targetNetwork.chainId.toString(16)}`,
                  chainName: targetNetwork.name,
                  nativeCurrency: {
                    name: targetNetwork.currency,
                    symbol: targetNetwork.currency,
                    decimals: 18,
                  },
                  rpcUrls: [targetNetwork.rpcUrl],
                  blockExplorerUrls: [targetNetwork.explorerUrl],
                },
              ]);
            } catch (addError) {
               console.error("Failed to add Kite network:", addError);
            }
          }
        }
      }

      const finalChainIdHex = await browserProvider.send("eth_chainId", []);
      const finalChainId = parseInt(finalChainIdHex, 16);
      if (finalChainId !== targetNetwork.chainId) {
        throw new Error(
          `Wrong network connected. Please switch wallet to ${targetNetwork.name} (chain ${targetNetwork.chainId}).`
        );
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
  }, [DISCONNECT_LOCK_KEY, networkName]);

  const disconnect = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISCONNECT_LOCK_KEY, "1");
    }
    setDisconnectLocked(true);
    setAddress(null);
    setBalance(null);
    setSigner(null);
    setProvider(null);
    setError(null);
  }, [DISCONNECT_LOCK_KEY]);

  const refreshBalance = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum || !address) return;
    
    try {
      const ethProvider = window.ethereum.providers?.length 
        ? (window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum.providers[0])
        : window.ethereum;
        
      const browserProvider = new BrowserProvider(ethProvider);
      const bal = await browserProvider.getBalance(address);
      setBalance(ethers.formatEther(bal));
      
      // Also update provider/signer in case they went stale
      setProvider(browserProvider);
      const signerInstance = await browserProvider.getSigner();
      setSigner(signerInstance);
    } catch (e) {
      console.error("Balance refresh failed:", e);
    }
  }, [address]);

  // Periodic refresh (every 15s)
  useEffect(() => {
    if (address) {
      const interval = setInterval(refreshBalance, 15000);
      return () => clearInterval(interval);
    }
  }, [address, refreshBalance]);

  // Eager Connection
  useEffect(() => {
    if (mounted && !address && !disconnectLocked && typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            connect(false);
          }
        })
        .catch(console.error);
    }
  }, [mounted, address, disconnectLocked, connect]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        const locked = typeof window !== "undefined" && window.localStorage.getItem(DISCONNECT_LOCK_KEY) === "1";
        if (locked) {
          setAddress(null);
          setBalance(null);
          setSigner(null);
          setProvider(null);
          return;
        }
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          refreshBalance();
        } else {
          disconnect();
        }
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, [disconnect, refreshBalance, DISCONNECT_LOCK_KEY]);

  return { address, balance, loading, error, provider, signer, connect, disconnect, refreshBalance };
};
