import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, UserCheck, ShieldCheck, AlertCircle, Sparkles, X } from 'lucide-react';
import { recordPunchIn, getPunchStatus } from '../../utils/punchService';

export default function DailyPunchModal({ isOpen, onClose, userName }) {
  const [loading, setLoading] = useState(false);
  const [punchState, setPunchState] = useState({ isPunched: false, punchTime: null });
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const activeUser = userName || sessionStorage.getItem('username') || localStorage.getItem('username') || 'User';
      const status = getPunchStatus(activeUser);
      setPunchState(status);
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePunchSubmit = async () => {
    setLoading(true);
    try {
      const res = await recordPunchIn(userName || 'Admin');
      if (res.success) {
        setPunchState({ isPunched: true, punchTime: res.punchTime });
        setSuccessMsg(`✅ Attendance Punched Successfully at ${res.punchTime}!`);
      }
    } catch (err) {
      console.error('Punch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      {/* WHITE CARD MODAL (Matching Theme Footer Color) */}
      <div className="w-full max-w-md rounded-2xl bg-white p-6 border-2 border-[#2e7d32] shadow-2xl text-slate-900 relative overflow-hidden">
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f5e9] border border-[#a5d6a7] text-xs font-extrabold text-[#2e7d32] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> SBH ATTENDANCE SYSTEM
          </span>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Icon */}
        <div className="flex items-center justify-center my-3">
          <div className="w-16 h-16 rounded-2xl bg-[#2e7d32] text-white flex items-center justify-center shadow-lg shadow-emerald-700/30">
            {punchState.isPunched ? (
              <CheckCircle className="w-9 h-9" />
            ) : (
              <Clock className="w-9 h-9 animate-pulse" />
            )}
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-black text-slate-900">
            {punchState.isPunched ? 'Daily Attendance Recorded' : "☀️ Today's Attendance Punch-In"}
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {todayStr}
          </p>
        </div>

        {/* User Info Box */}
        <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 mb-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2e7d32] text-white font-black flex items-center justify-center text-sm shadow-sm">
              {userName ? userName.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Staff Member</div>
              <div className="text-sm font-extrabold text-slate-900">{userName || 'Admin'}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Status</div>
            <div className="text-xs font-black">
              {punchState.isPunched ? (
                <span className="text-[#2e7d32]">PUNCHED</span>
              ) : (
                <span className="text-amber-600">PENDING</span>
              )}
            </div>
          </div>
        </div>

        {/* Success Alert Message */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#e8f5e9] border border-[#a5d6a7] text-[#2e7d32] text-xs font-extrabold text-center animate-fade-in">
            {successMsg}
          </div>
        )}

        {!punchState.isPunched && !successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold text-center">
            ⚠️ Checklist & Task Assignment require today's Attendance Punch-In.
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {!punchState.isPunched ? (
            <button
              onClick={handlePunchSubmit}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-black text-sm shadow-lg shadow-emerald-800/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-emerald-600 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  🟢 TOUCH TO PUNCH-IN ATTENDANCE
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-black text-sm shadow-lg shadow-emerald-800/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              OKAY / CONTINUE TO DASHBOARD
            </button>
          )}

          {punchState.isPunched && (
            <button
              onClick={handlePunchSubmit}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all"
            >
              Need to Re-Punch Attendance? Click Here
            </button>
          )}
        </div>

        {/* Sync Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2e7d32]" />
          Punch record automatically saves to Google Sheets Attendance Login.
        </div>
      </div>
    </div>
  );
}
