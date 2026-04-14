"use client";

import React from "react";
import { YieldOpportunity } from "@/lib/types";

interface Props {
  opportunities: YieldOpportunity[];
  loading: boolean;
  unlocked?: boolean;
}

const YieldTable: React.FC<Props> = ({ opportunities, loading, unlocked = true }) => {
  // Helper to format large numbers
  const formatTVL = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    return `$${num.toLocaleString()}`;
  };

  const getChainColor = (chain: string) => {
     const c = chain.toLowerCase();
     if (c.includes('ethereum')) return 'bg-indigo-500';
     if (c.includes('base')) return 'bg-cyan-400';
     if (c.includes('arbitrum')) return 'bg-blue-600';
     if (c.includes('avalanche')) return 'bg-rose-500';
     if (c.includes('optimism')) return 'bg-red-500';
     if (c.includes('polygon')) return 'bg-purple-500';
     return 'bg-gray-500';
  }

  const getProtocolBadge = (protocol: string) => {
    return protocol.toUpperCase();
  };

  if (loading && opportunities.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-b-2 border-[#B3A288] rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] animate-pulse">Monitoring USDC Yield Routes...</p>
      </div>
    );
  }

  return (
    <div className="max-h-[460px] overflow-y-auto scrollbar-hide bg-black/20">
      <table className="w-full text-left">
        <thead className="sticky top-0 z-20 bg-[#0c0c0c] text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 border-b border-white/5">
          <tr>
            <th className="px-8 py-4">Chain</th>
            <th className="px-8 py-4">Protocol</th>
            <th className="px-8 py-4">Asset</th>
            <th className="px-8 py-4">TVL</th>
            <th className="px-8 py-4">Risk</th>
            <th className="px-8 py-4 text-right">APR</th>
          </tr>
        </thead>
        <tbody className="text-sm font-black divide-y divide-white/5">
          {opportunities.map((opp, idx) => {
            const teaserVisibleIndex = Math.min(3, Math.max(0, opportunities.length - 1));
            const isUnlockedRow = unlocked || idx === teaserVisibleIndex;
            return (
            <tr
              key={`${opp.chain}-${opp.protocol}-${idx}`}
              className={`group hover:bg-white/[0.04] transition-all border-white/5 ${!isUnlockedRow ? "blur-[4px] opacity-20" : ""}`}
            >
              <td className="px-8 py-5">
                 <div className="flex items-center space-x-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${getChainColor(opp.chain)} shadow-lg shadow-current/50`} />
                    <span className="text-white text-[10px] uppercase tracking-widest">{opp.chain}</span>
                 </div>
              </td>
              <td className="px-8 py-5">
                 <span className="inline-flex items-center text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded bg-blue-500/10 text-blue-200 border border-blue-500/20">
                   {getProtocolBadge(opp.protocol)}
                 </span>
              </td>
              <td className="px-8 py-5">
                 <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                       <img 
                          src={
                            opp.asset?.toLowerCase().includes('usdc') ? 'https://icons.llama.fi/usd-coin.jpg' :
                            opp.asset?.toLowerCase().includes('gho') ? 'https://icons.llama.fi/token/ethereum/0x40d16fc0246ad3160ccc5448d08790734e91866a' :
                            opp.asset?.toLowerCase().includes('susds') || opp.asset?.toLowerCase().includes('usds') ? 'https://icons.llama.fi/sky.jpg' :
                            opp.asset?.toLowerCase().includes('usdg') ? 'https://icons.llama.fi/usd-coin.jpg' :
                            opp.asset?.toLowerCase().includes('eth') ? 'https://icons.llama.fi/ethereum.png' :
                            opp.asset?.toLowerCase().includes('usdt') ? 'https://icons.llama.fi/tether.jpg' :
                            `https://icons.llama.fi/${opp.asset?.toLowerCase()}.png`
                          }
                          alt={opp.asset} 
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                             const target = e.target as HTMLImageElement;
                             if (target.src.endsWith('.png')) {
                                target.src = target.src.replace('.png', '.jpg');
                             } else {
                                target.src = 'https://icons.llama.fi/usd-coin.jpg';
                             }
                          }}
                       />
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-200 group-hover:text-white transition-colors">
                      {opp.asset}
                    </span>
                 </div>
              </td>
              <td className="px-8 py-5 text-gray-500 text-[10px] font-black tracking-widest">{formatTVL(opp.liquidity)}</td>
              <td className="px-8 py-5">
                 <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${opp.risk === 'low' ? 'text-emerald-500 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                    {opp.risk}
                 </span>
              </td>
              <td className="px-8 py-5 text-right">
                 <span className="text-base font-black text-[#B3A288] tracking-tighter group-hover:scale-110 inline-block transition-transform duration-300">
                   {opp.apr.toFixed(2)}%
                 </span>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
      {!unlocked && (
        <div className="sticky bottom-0 left-0 right-0 p-3 bg-black/70 backdrop-blur border-t border-white/10 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#B3A288]">
            Unlock full table with paid agent run
          </p>
        </div>
      )}
    </div>
  );
};

export default YieldTable;
