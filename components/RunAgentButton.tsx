"use client";

import React from "react";

interface Props {
  onClick: () => void;
  disabled: boolean;
  status: string;
}

const RunAgentButton: React.FC<Props> = ({ onClick, disabled, status }) => {
  const getButtonText = () => {
    switch (status) {
      case "scanning": return "Scanning Yields...";
      case "thinking": return "Analyzing Assets...";
      case "purchasing": return "Buying Premium Data...";
      case "logging": return "Recording Proof...";
      default: return "Run Autonomous Agent";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-[10px] sm:text-xs transition-all transform active:scale-95 flex items-center justify-center space-x-4 shadow-[0_12px_48px_rgba(0,0,0,0.4)] ${
        disabled
          ? "bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"
          : "bg-[#B3A288] text-black hover:bg-[#C5B499] hover:shadow-[#B3A288]/20 hover:scale-[1.02]"
      }`}
    >
      {status !== "idle" && (
        <span className="w-2 h-2 rounded-full bg-black/40 animate-ping mr-2" />
      )}
      <span className="relative z-10">{getButtonText()}</span>
    </button>
  );
};

export default RunAgentButton;
