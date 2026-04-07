"use client";

import React from "react";
import { useKiteWallet } from "@/hooks/useKiteWallet";

const WalletPanel: React.FC = () => {
  const { address, balance, loading, error, connect, disconnect } = useKiteWallet();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const truncateBalance = (bal: string | null) => {
    if (!bal) return "0";
    const match = bal.match(/^-?\d+(?:\.\d{0,3})?/);
    return match ? match[0] : "0";
  };

  if (!address) {
    return (
      <div className="flex flex-col items-end">
        <button 
          onClick={() => connect(true)}
          disabled={loading}
          className="h-[52px] flex items-center justify-center px-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all"
        >
          {loading ? "Connecting..." : "Connect Wallet"}
        </button>
        {error && (
          <p className="text-[10px] text-red-400 mt-2 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
        {/* Kite Ecosystem Badge - AA & App Store */}
        <div className="hidden md:flex flex-col items-end mr-1 space-y-1">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Kite AA Active</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="text-[10px] font-bold text-green-200 uppercase tracking-wider">Gasless Mode</span>
            </div>
        </div>

      <div className="flex items-center gap-5 p-3 px-6 h-[52px] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/20 group">
        <div className="flex-col hidden sm:flex">
          <span className="text-[10px] font-black tracking-widest text-gray-400 group-hover:text-blue-400 transition-colors uppercase">
            Portfolio
          </span>
          <span className="text-sm font-black tabular-nums text-white group-hover:scale-105 transition-transform origin-left">
            {balance ? `${truncateBalance(balance)} KITE` : "0.000 KITE"}
          </span>
        </div>
        
        <div className="w-[1px] h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Status</span>
            <span className="text-[10px] font-bold text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              Mainnet
            </span>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 border border-white/20 group-hover:rotate-3 transition-transform">
            {address?.slice(2, 4).toUpperCase() || "AI"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPanel;
