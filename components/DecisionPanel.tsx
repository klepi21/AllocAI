"use client";

import React from "react";
import { AgentDecision } from "@/lib/types";

interface Props {
  decision: AgentDecision | null;
  status: string;
  onRunAgent: () => void;
}

const DecisionPanel: React.FC<Props> = ({ decision, status, onRunAgent }) => {
  const getStatusColor = () => {
    switch (status) {
      case "thinking": return "text-[#B3A288]";
      case "purchasing": return "text-purple-400";
      case "logging": return "text-blue-400";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="glass-card p-12 rounded-[2rem] relative overflow-hidden group h-full flex flex-col justify-center">
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#B3A288]/5 blur-3xl group-hover:bg-[#B3A288]/10 transition-all rounded-full" />
      
      {!decision ? (
        <div className="flex flex-col items-start space-y-4">
           <div className="flex items-center space-x-6">
              <div className={`w-3 h-3 rounded-full animate-pulse transition-colors ${status === "idle" ? 'bg-gray-800' : 'bg-[#B3A288] shadow-lg shadow-[#B3A288]/50'}`} />
              <h2 className={`text-3xl font-black uppercase tracking-tight transition-colors ${getStatusColor()}`}>
                 {status === "idle" ? "Agent Idle" : `${status}...`}
              </h2>
           </div>
           <p className="text-[10px] font-black text-gray-500 max-w-sm leading-relaxed uppercase tracking-[0.2em] pt-2">
              The agent is currently waiting for a manual trigger. Click "Run Agent" to re-evaluate cross-chain yield opportunities.
           </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 h-full">
          <div className="flex-1">
             <div className="flex items-center space-x-4 mb-4">
                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 ${decision.action === 'move' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                   {decision.action.toUpperCase()}
                </span>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Confidence: {(decision.confidence * 100).toFixed(0)}%</span>
             </div>
             <h2 className="text-3xl font-black mb-4 tracking-tight leading-tight">
                {decision.action === 'move' 
                  ? `Reallocate to ${decision.selectedOpportunity?.protocol}` 
                  : "Maintain current position"}
             </h2>
             <p className="text-gray-400 text-xs font-bold max-w-lg leading-relaxed uppercase tracking-wider">{decision.reason}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-[2rem] border border-white/10 min-w-[180px] shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in slide-in-from-right-4">
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 text-center w-full">Impact</p>
             <p className="text-3xl font-black text-[#B3A288]">
               {decision.action === "move" ? `+${(decision.selectedOpportunity!.apr - 5.20).toFixed(2)}%` : "Stable"}
             </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionPanel;
