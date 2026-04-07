"use client";

import React from "react";
import { TimelineEvent } from "@/lib/types";

interface Props {
  events: TimelineEvent[];
}

const Timeline: React.FC<Props> = ({ events }) => {
  return (
    <div className="glass-card p-8 rounded-[2rem] flex flex-col h-full relative bg-black/60 shadow-black/90 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#B3A288]/5 blur-3xl transition-all rounded-full" />
      
      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4 flex-shrink-0">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#B3A288]">Agent Workflow</h3>
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{events.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
          {events.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
               <p className="text-[10px] font-black uppercase tracking-widest text-center leading-relaxed">System Connected.<br/>Awaiting Execution.</p>
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
