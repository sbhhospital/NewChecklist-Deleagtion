"use client";

import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { AlertCircle, LogOut, X } from "lucide-react";

export default function AndroidExitModal() {
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backButtonListener = CapApp.addListener("backButton", (event) => {
      // Show exit confirmation modal on Android back button press
      setShowExitModal(true);
    });

    return () => {
      backButtonListener.then(l => l.remove()).catch(() => {});
    };
  }, []);

  const handleExitApp = () => {
    CapApp.exitApp();
  };

  if (!showExitModal) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 text-center">
        
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-md">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Close SBH Application?</h3>
          <p className="text-xs font-semibold text-slate-500">
            Are you sure you want to exit the SBH Hospital application?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => setShowExitModal(false)}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleExitApp}
            className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <LogOut className="h-4 w-4" /> Exit App
          </button>
        </div>

      </div>
    </div>
  );
}
