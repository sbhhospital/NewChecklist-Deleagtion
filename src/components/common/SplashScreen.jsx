"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Linkedin, Sparkles, HeartPulse } from "lucide-react";

export default function SplashScreen({ onFinish }) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFade(true);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 500);
    }, 2800);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-gradient-to-br from-slate-950 via-[#072412] to-slate-900 flex flex-col justify-between items-center p-6 text-white transition-opacity duration-500 select-none ${
        fade ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Ambient Radial Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#387f39]/25 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-[#f0a04b]/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      {/* Top Badge */}
      <div className="pt-8 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl shadow-lg shadow-emerald-950/40">
        <Sparkles className="h-4 w-4 text-emerald-400 animate-spin" />
        <span className="text-[11px] font-black tracking-widest text-emerald-300 uppercase">SBH Group Of Hospitals</span>
      </div>

      {/* Main Logo & Animated Text */}
      <div className="flex flex-col items-center text-center space-y-6 my-auto max-w-sm px-4">
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-[#387f39] via-emerald-400 to-[#f0a04b] rounded-3xl blur-2xl opacity-80 animate-pulse"></div>
          <div className="relative w-32 h-32 bg-slate-900/90 rounded-3xl p-4 shadow-2xl flex items-center justify-center border-2 border-emerald-400/50 backdrop-blur-md">
            <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-[#387f39] to-emerald-500 flex flex-col items-center justify-center shadow-inner">
              <span className="text-4xl font-black tracking-tighter text-white drop-shadow-md">SB<span className="text-amber-300">H</span></span>
              <span className="text-[8px] font-black tracking-widest text-emerald-100 uppercase mt-0.5">Hospitals</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
            Welcome To <br />
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
              SBH Group Of Hospitals
            </span>
          </h1>
          <p className="text-xs font-semibold text-slate-300 tracking-wide max-w-xs mx-auto flex items-center justify-center gap-1.5">
            <HeartPulse className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> Excellence in Healthcare & Delegation
          </p>
        </div>

        {/* Animated Loading Progress Bar */}
        <div className="w-56 space-y-1.5 pt-2">
          <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden border border-emerald-500/30 p-0.5 shadow-inner">
            <div className="h-full bg-gradient-to-r from-[#387f39] via-emerald-400 to-[#f0a04b] rounded-full animate-[pulse_1s_infinite] w-full"></div>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Initializing Modules...</span>
        </div>
      </div>

      {/* Footer Credits */}
      <div className="pb-6 text-center space-y-2 w-full max-w-xs">
        <div className="py-2.5 px-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-xl flex flex-col items-center justify-center gap-1 shadow-xl">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              SBH Group Of Hospitals
            </span>
          </div>
          <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-300 uppercase tracking-widest">
            <span>Architected by</span>
            <span className="text-amber-400 font-black flex items-center gap-1">
              Naman Mishra <Linkedin className="h-3 w-3 text-[#0077b5] inline bg-white rounded-xs p-[0.5px]" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
