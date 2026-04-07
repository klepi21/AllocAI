"use client";

import React from "react";

const Header: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between w-full">
      <div className="flex items-center group cursor-pointer hover:scale-105 transition-transform duration-300">
        <img src="/logo-v2.png" alt="AllocAI" className="h-14 w-auto px-2" />
      </div>
      {/* Navigation removed to keep it minimal as per user request */}
    </div>
  );
};

export default Header;
