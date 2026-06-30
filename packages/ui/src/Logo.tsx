import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = "h-8", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 select-none min-w-0 ${className}`}>
      {/* Prism-Edge Geometric Refraction SVG Logo */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto shrink-0"
        id="prism-edge-svg-logo"
      >
        <defs>
          {/* Cyan to Electric Blue gradient for Left wing of 'M' */}
          <linearGradient id="leftM" x1="10" y1="100" x2="50" y2="20">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#2f5f85" />
          </linearGradient>

          {/* Purple to Indigo gradient for Right wing of 'M' */}
          <linearGradient id="rightM" x1="110" y1="100" x2="70" y2="20">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          {/* Glassmorphic Prism body center fill */}
          <linearGradient id="prismGrad" x1="60" y1="30" x2="60" y2="95">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
          </linearGradient>

          {/* Refracted beam gradients */}
          <linearGradient id="refractCyan" x1="60" y1="65" x2="90" y2="75">
            <stop offset="0%" stopColor="#3b6f91" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2f5f85" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="refractPurple" x1="60" y1="65" x2="95" y2="90">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter underlay */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Underlying Glow Nodes */}
        <circle cx="60" cy="65" r="10" fill="#3b6f91" opacity="0.15" filter="url(#neonGlow)" />
        
        {/* 2. Micro Candlestick/K-Line behind the logo (structural theme harmony) */}
        {/* Bearish candle line left */}
        <line x1="25" y1="40" x2="25" y2="85" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <rect x="22" y="55" width="6" height="20" fill="#f43f5e" rx="1.5" opacity="0.5" />

        {/* Bullish candle line right */}
        <line x1="95" y1="35" x2="95" y2="75" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <rect x="92" y="45" width="6" height="18" fill="#10b981" rx="1.5" opacity="0.5" />

        {/* 3. The Letter 'M' Outer framework */}
        {/* Left Ascent */}
        <path
          d="M 12 100 L 12 40 L 32 40 L 45 65"
          stroke="url(#leftM)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right Ascent */}
        <path
          d="M 108 100 L 108 40 L 88 40 L 75 65"
          stroke="url(#rightM)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 4. Center Glassmorphic Refractive Prism (Triangle) */}
        {/* Outer Prism structure */}
        <polygon
          points="60,25 35,85 85,85"
          fill="url(#prismGrad)"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.95"
        />

        {/* 5. Refracted spectral light beams inside and shooting out from the prism */}
        {/* Incident white light entering from top-left */}
        <line x1="20" y1="35" x2="52" y2="55" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        <line x1="20" y1="35" x2="52" y2="55" stroke="#ffffff" strokeWidth="6" opacity="0.25" filter="url(#neonGlow)" />

        {/* Split Refractive Beams exiting to the right */}
        {/* Cyan beam */}
        <path d="M 68 55 L 88 48 L 102 44" stroke="url(#refractCyan)" strokeWidth="3" strokeLinecap="round" />
        {/* Electric purple beam */}
        <path d="M 68 55 L 88 64 L 104 68" stroke="url(#refractPurple)" strokeWidth="3.5" strokeLinecap="round" />

        {/* Precise refraction focal point (Apex crystal spark) */}
        <circle cx="68" cy="55" r="2" fill="#ffffff" filter="url(#neonGlow)" />
      </svg>

      {showText && (
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-sans font-bold text-sm tracking-tight text-white whitespace-nowrap">
              Prism<span className="text-blue-300/75">-Edge</span>
            </span>
            <span className="text-[10px] font-mono font-medium px-1 py-0.5 rounded bg-blue-950/70 text-blue-300/75 border border-blue-900/65">
              M1+
            </span>
          </div>
          <span className="text-[8px] font-sans text-slate-400 leading-none tracking-widest mt-1 uppercase whitespace-nowrap">
            棱镜先生 • Edge Trading System
          </span>
        </div>
      )}
    </div>
  );
}
