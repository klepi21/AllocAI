"use client";

import React, { useEffect, useState } from "react";
import { AgentDecision } from "@/lib/types";
import { CURRENT_NETWORK } from "@/lib/networks";
import { getProtocolStrategyUrl } from "@/lib/protocol-links";

interface Props {
  decision: AgentDecision | null;
  latestHistoryDecision: {
    action: string;
    confidence: number;
    reason: string;
    protocol: string;
    txHash?: string;
  } | null;
  status: string;
  onRunAgent: () => void;
}

const DecisionPanel: React.FC<Props> = ({ decision, latestHistoryDecision, status }) => {
  const txExplorerBase = CURRENT_NETWORK.explorerUrl.replace(/\/+$/, "");
  const isProcessing = status !== "idle";
  const processingMessages = [
    "Agent is thinking...",
    "Searching best strategies...",
    "Comparing risk-adjusted routes...",
    "Estimating projected compounding yield...",
    "Preparing payment and on-chain proof..."
  ];
  const [processingMsgIdx, setProcessingMsgIdx] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setProcessingMsgIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setProcessingMsgIdx((prev) => (prev + 1) % processingMessages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isProcessing, processingMessages.length]);

  const getStatusColor = () => {
    switch (status) {
      case "thinking": return "text-[#B3A288]";
      case "purchasing": return "text-purple-400";
      case "logging": return "text-blue-400";
      default: return "text-gray-500";
    }
  };

  const currentDisplay: AgentDecision | null =
    decision ||
    (status === "idle" && latestHistoryDecision
      ? {
          action: latestHistoryDecision.action.toLowerCase() === "move" ? "move" : "hold",
          confidence: latestHistoryDecision.confidence,
          reason: latestHistoryDecision.reason,
          selectedOpportunity: {
            chain: "Kite",
            protocol: latestHistoryDecision.protocol,
            asset: "USDC",
            apr: 0,
            risk: "low",
            liquidity: 0
          },
          paidDataUsed: true,
          proofReceipt: latestHistoryDecision.txHash
            ? {
                runId: "latest-history",
                paymentReference: "latest-history",
                settlementReference: "latest-history",
                strategyHash: "latest-history",
                txHash: latestHistoryDecision.txHash,
                timestamp: "latest-history",
                signer: "latest-history",
                signature: "latest-history"
              }
            : undefined
        }
      : null);
  const inferredProtocolUrl = currentDisplay
    ? getProtocolStrategyUrl(
        [
          currentDisplay.selectedOpportunity?.protocol || "",
          currentDisplay.strategy?.headline || "",
          currentDisplay.strategy?.recommendation || ""
        ]
          .filter(Boolean)
          .join(" "),
        currentDisplay.selectedOpportunity?.chain || ""
      )
    : null;
  const protocolUrlToOpen = currentDisplay?.strategyProtocolUrl || inferredProtocolUrl;
  const defillamaUrlToOpen = currentDisplay?.strategyDefiLlamaUrl || null;

  return (
    <div className="glass-card p-12 rounded-[2rem] relative overflow-hidden group h-full flex flex-col justify-center min-h-[300px] bg-[#151515]">
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#B3A288]/5 blur-3xl group-hover:bg-[#B3A288]/10 transition-all rounded-full" />
      <div className="absolute left-5 top-8 h-16 w-px bg-gradient-to-b from-[#B3A288]/45 to-transparent" />
      <div className="absolute right-5 bottom-8 h-16 w-px bg-gradient-to-t from-[#B3A288]/45 to-transparent" />
      <div className="absolute right-8 top-7 text-[#B3A288]/35 text-[10px] font-black tracking-[0.35em]">◆ ◆</div>

      {!currentDisplay ? (
        <div className="flex flex-col items-start space-y-4">
           <div className="flex items-center space-x-6">
              <div className={`w-3 h-3 rounded-full animate-pulse transition-colors ${status === "idle" ? 'bg-gray-800' : 'bg-[#B3A288] shadow-lg shadow-[#B3A288]/50'}`} />
              <h2 className={`text-3xl font-black uppercase tracking-tight transition-colors ${getStatusColor()}`}>
                 {status === "idle" ? "Agent Idle" : `${status}...`}
              </h2>
           </div>
           <p className="text-[10px] font-black text-gray-500 max-w-sm leading-relaxed uppercase tracking-[0.2em] pt-2">
              The agent is idle. Run the paid strategy query to generate and log a new recommendation.
           </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 h-full">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
               <span className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 bg-[#B3A288]/10 text-[#B3A288]">
                   Strategy
                </span>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Confidence: {(currentDisplay.confidence * 100).toFixed(0)}%</span>
                {!decision && status === "idle" && (
                   <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/5 px-3 py-1.5 rounded-lg border border-emerald-400/10">Latest On-Chain Decision</span>
                )}
             </div>
             <h2 className="text-3xl font-black mb-4 tracking-tight leading-tight">
                {currentDisplay.strategy?.headline || `USDC Strategy: ${currentDisplay.selectedOpportunity?.protocol || "Current Route"}`}
             </h2>
             <p className="text-gray-200 text-[12px] font-bold max-w-3xl leading-relaxed tracking-wide mb-4">
               {currentDisplay.strategy?.recommendation || currentDisplay.reason}
             </p>
             {currentDisplay.strategy && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl">
                 <div className="rounded-xl bg-[#080808] border border-white/10 p-3">
                   <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">APR</p>
                   <p className="text-[16px] font-black text-[#B3A288] mt-1">{currentDisplay.strategy.apr.toFixed(2)}%</p>
                 </div>
                 <div className="rounded-xl bg-[#080808] border border-white/10 p-3">
                   <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">Monthly Yield (Est.)</p>
                   <p className="text-[16px] font-black text-white mt-1">{currentDisplay.strategy.expectedMonthlyUsdc.toFixed(2)} USDC</p>
                 </div>
                 <div className="rounded-xl bg-[#080808] border border-white/10 p-3">
                   <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">Reinvest Cadence</p>
                   <p className="text-[16px] font-black text-white mt-1">{currentDisplay.strategy.reinvestCadence}</p>
                 </div>
               </div>
             )}
             {currentDisplay.strategy?.compoundedProjections?.length ? (
               <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl">
                 {currentDisplay.strategy.compoundedProjections.map((projection) => (
                   <div key={projection.years} className="rounded-xl bg-[#080808] border border-white/10 p-3">
                     <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">
                       {projection.years}Y Compounding
                     </p>
                     <p className="text-[14px] font-black text-white mt-1">
                       {projection.projectedValueUsdc.toFixed(2)} USDC
                     </p>
                     <p className="text-[9px] font-black text-emerald-300 mt-1">
                       +{projection.projectedYieldUsdc.toFixed(2)} USDC yield
                     </p>
                   </div>
                 ))}
               </div>
             ) : null}
             {currentDisplay.strategy?.executionSteps?.length ? (
               <div className="mt-4 space-y-2 max-w-4xl">
                 {currentDisplay.strategy.executionSteps.map((step, idx) => (
                   <p key={`${step}-${idx}`} className="text-[10px] font-black tracking-wide text-gray-300">
                     {idx + 1}. {step}
                   </p>
                 ))}
               </div>
             ) : null}
            {currentDisplay.proofReceipt?.txHash ? (
              <div className="mt-4">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">
                  On-chain proof tx
                </p>
                <a
                  href={`${txExplorerBase}/tx/${currentDisplay.proofReceipt.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-black text-blue-300 hover:text-blue-200 break-all"
                >
                  {currentDisplay.proofReceipt.txHash}
                </a>
              </div>
            ) : null}
            {protocolUrlToOpen ? (
              <div className="mt-3">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">
                  Execute strategy
                </p>
                <a
                  href={protocolUrlToOpen}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-blue-200 hover:bg-blue-400/20"
                >
                  Open Protocol Strategy
                </a>
              </div>
            ) : null}
            {defillamaUrlToOpen ? (
              <div className="mt-2">
                <a
                  href={defillamaUrlToOpen}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-200 hover:bg-emerald-400/20"
                >
                  View On DeFiLlama
                </a>
              </div>
            ) : null}
          </div>
          
          <div className="flex flex-col items-center justify-center p-8 bg-[#080808] rounded-[2rem] border border-white/10 min-w-[180px] shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in slide-in-from-right-4">
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 text-center w-full">Impact</p>
             <p className="text-3xl font-black text-[#B3A288]">
              {currentDisplay.strategy ? `${currentDisplay.strategy.expectedAnnualUsdc.toFixed(0)} USDC/yr` : "Stable"}
             </p>
          </div>
        </div>
      )}

      {isProcessing ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/55 backdrop-blur-md">
          <div className="w-14 h-14 rounded-full border-2 border-white/10 border-t-[#B3A288] animate-spin mb-6" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#B3A288] text-center px-6">
            {processingMessages[processingMsgIdx]}
          </p>
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-500 mt-3">
            strategy engine running
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default DecisionPanel;
