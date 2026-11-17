import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import nmLogo from '../../assets/nm-logo.png';

export const HospitalFooter = () => {
  if (Capacitor.isNativePlatform()) return null;

  return (
    <footer
      id="hospital-fixed-footer"
      className="fixed bottom-0 left-0 right-0 w-full py-0.5 md:py-1 z-[2000] overflow-hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.3)] select-none border-t border-white/10"
      style={{ background: 'linear-gradient(to right, #f59e0b, #10b981, #2e7d32)' }}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-white/5"></div>
      <div className="max-w-full mx-auto px-4 md:px-10 relative z-10">
        {/* 📱 MOBILE WEB VIEW */}
        <div className="flex flex-col items-center justify-center md:hidden py-0.5">
          <a
            href="https://www.sbhhospital.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 no-underline text-white"
          >
            <ShieldCheck size={10} className="text-white" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
              SBH Group Of Hospitals
            </span>
          </a>
          <a
            href="https://namanmishra.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 no-underline mt-0.5 opacity-90 hover:opacity-100 text-white transition-opacity"
            title="Visit Developer Portfolio — Naman Mishra"
          >
            <span className="text-[7.5px] font-bold text-white uppercase tracking-widest italic leading-none">
              Architected by{' '}
              <span className="ml-1 text-[8.5px] font-black text-white uppercase tracking-widest not-italic">
                Naman Mishra
              </span>
            </span>
            <span className="bg-white/95 rounded-[3px] p-[1.5px] flex items-center justify-center shadow-xs">
              <img src={nmLogo} alt="Naman Mishra" className="h-3 w-auto object-contain rounded-xs" />
            </span>
          </a>
        </div>

        {/* 💻 DESKTOP WEB VIEW */}
        <div className="hidden md:flex items-center justify-between gap-6 h-6 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-5.5 h-5.5 rounded-md bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md shadow-sm">
              <Activity size={11} className="text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                SBH INTEL
              </span>
              <span className="text-[7px] font-extrabold text-white/80 tracking-wider mt-0.5">
                SYSTEM OPERATIONAL
              </span>
            </div>
          </div>

          <a
            href="https://www.sbhhospital.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 py-0.5 px-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 backdrop-blur-lg transition-all transform hover:scale-105 group no-underline shadow-sm text-white"
          >
            <ShieldCheck size={10} className="text-white" />
            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-1 leading-none">
              SBH Group Of Hospitals
            </span>
          </a>

          <a
            href="https://namanmishra.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col text-right group no-underline hover:opacity-95 text-white transition-opacity"
            title="Visit Developer Portfolio — Naman Mishra"
          >
            <span className="text-[7px] font-bold text-white/80 uppercase tracking-widest italic leading-none mb-0.5">
              Architected by
            </span>
            <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center justify-end gap-1.5 leading-none text-white">
              Naman Mishra
              <span className="bg-white/95 rounded-[3px] p-[1.5px] flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                <img src={nmLogo} alt="Naman Mishra" className="h-3.5 w-auto object-contain rounded-xs" />
              </span>
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default HospitalFooter;
