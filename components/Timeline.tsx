"use client";

import React, { useEffect, useRef } from "react";
import { TimelineEvent } from "@/lib/types";

interface LatestRunMeta {
  runId: string;
  createdAt: string;
  paymentReference: string;
  settlementReference: string;
  paymentConfirmed: boolean;
  proofConfirmed: boolean;
  paymentTxHash: string | null;
  proofTxHash: string | null;
  paymentBlockNumber: number | null;
  proofBlockNumber: number | null;
  paymentExplorerUrl: string | null;
  proofExplorerUrl: string | null;
}

interface Props {
  events: TimelineEvent[];
  latestRuns: LatestRunMeta[];
}

const Timeline: React.FC<Props> = ({ events, latestRuns }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!events.length) return;
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
  }, [events]);

  return (
    <div className="glass-card p-8 rounded-[2rem] flex flex-col h-full relative bg-[#151515] shadow-black/90 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#B3A288]/5 blur-3xl transition-all rounded-full" />
      <div className="absolute left-5 top-6 h-14 w-px bg-gradient-to-b from-[#B3A288]/45 to-transparent" />
      <div className="absolute right-5 bottom-6 h-14 w-px bg-gradient-to-t from-[#B3A288]/45 to-transparent" />
      <div className="absolute right-8 top-6 text-[#B3A288]/30 text-[9px] font-black tracking-[0.25em]">◈</div>
      
      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4 flex-shrink-0">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#B3A288]">Latest Agent Runs</h3>
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{latestRuns.length}</span>
      </div>

      {latestRuns.length > 0 ? (
        <div className="mb-4 space-y-2">
          {latestRuns.map((run) => (
            <div key={run.runId} className="bg-[#080808] border border-white/10 rounded-xl p-2">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-500">Run {run.runId.slice(0, 10)}...</p>
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-500">
                  {new Date(run.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className={`text-[8px] font-black uppercase ${run.paymentConfirmed ? "text-emerald-300" : "text-amber-300"}`}>
                  Payment: {run.paymentConfirmed ? "Confirmed" : "Pending"}
                </p>
                <p className={`text-[8px] font-black uppercase ${run.proofConfirmed ? "text-emerald-300" : "text-amber-300"}`}>
                  Proof: {run.proofConfirmed ? "Confirmed" : "Pending"}
                </p>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-500">
                    Payment next block: {run.paymentBlockNumber ?? "N/A"}
                  </p>
                  {run.paymentExplorerUrl ? (
                    <a
                      href={run.paymentExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[8px] font-black uppercase tracking-[0.15em] text-[#B3A288] hover:text-white"
                    >
                      View payment tx
                    </a>
                  ) : (
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-600">No tx hash</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-500">
                    Proof next block: {run.proofBlockNumber ?? "N/A"}
                  </p>
                  {run.proofExplorerUrl ? (
                    <a
                      href={run.proofExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[8px] font-black uppercase tracking-[0.15em] text-[#B3A288] hover:text-white"
                    >
                      View proof tx
                    </a>
                  ) : (
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-600">No tx hash</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
          {events.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
               <p className="text-[10px] font-black uppercase tracking-widest text-center leading-relaxed">No run data for this wallet yet.<br/>Run agent to create one.</p>
            </div>
          ) : (
            <div className="space-y-10 relative pr-2">
               {/* Timeline Line */}
               <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-white/5" />

               {events.map((event, idx) => (
                 <div key={event.id} className="relative pl-10 flex flex-col space-y-2 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 bg-[#080808] z-10 transition-colors shadow-lg ${idx === 0 ? 'border-[#B3A288] shadow-[#B3A288]/50' : 'border-white/10'}`} />
                    
                    <div className="flex justify-between items-center w-full">
                       <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </div>
                    <p className={`text-[11px] font-black uppercase leading-relaxed ${idx === 0 ? 'text-white' : 'text-gray-400'}`}>{event.message}</p>
                 </div>
               ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default Timeline;
