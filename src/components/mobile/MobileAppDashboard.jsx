import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, CheckCircle, Clock, Zap, 
  ListCheck, UserCheck, Smartphone, CheckSquare, 
  AlertTriangle, Layers, ChevronRight, SlidersHorizontal
} from 'lucide-react';
import { getPunchStatus } from '../../utils/punchService';
import DailyPunchModal from '../common/DailyPunchModal';
import sbhLogo from '../../assets/logo.png';

export default function MobileAppDashboard({ 
  username = 'Admin', 
  totalTasks = 33348, 
  completedTasks = 23887, 
  pendingTasks = 9461, 
  overdueTasks = 8742 
}) {
  const navigate = useNavigate();
  const [punchState, setPunchState] = useState({ isPunched: false, punchTime: null });
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState('Checklist');

  useEffect(() => {
    const activeUser = username || sessionStorage.getItem('username') || localStorage.getItem('username') || 'Admin';
    const status = getPunchStatus(activeUser);
    setPunchState(status);
    // Automatic Popup for specific user if not punched today
    if (!status.isPunched) {
      setIsPunchModalOpen(true);
    }
  }, [username]);

  const todayStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short' });

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <div className="space-y-4 pb-20 px-3 pt-2 bg-slate-100 text-slate-800 min-h-screen">
      {/* Daily Punch Modal (White Card Theme) */}
      <DailyPunchModal 
        isOpen={isPunchModalOpen} 
        onClose={() => {
          setIsPunchModalOpen(false);
          setPunchState(getPunchStatus(username || sessionStorage.getItem('username') || localStorage.getItem('username') || 'Admin'));
        }}
        userName={username} 
      />

      {/* 🔴 Top Hero Banner Card - Solid Dark Emerald Theme with 100% Solid White Text */}
      <div className="relative overflow-hidden rounded-2xl bg-[#064e3b] p-4 shadow-xl border border-emerald-900 text-white">
        {/* Top Greeting Row */}
        <div className="flex items-center justify-between gap-2 mb-3 pl-11">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white border-2 border-emerald-400 flex items-center justify-center font-black text-sm shadow-md">
              {username ? username.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-700/80 border border-emerald-400/50 text-[10px] font-extrabold text-white uppercase tracking-wider mb-0.5 shadow-sm">
                <Smartphone className="w-3 h-3 text-emerald-200" /> WELCOME TO SBH
              </div>
              <h1 className="text-base font-extrabold text-white leading-tight">
                Hello, {username || 'Admin'} 👋
              </h1>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider">TODAY</div>
            <div className="flex items-center gap-1 text-xs font-black text-white">
              <Calendar className="w-3.5 h-3.5 text-emerald-300" /> {todayStr}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-emerald-600/50 my-3" />

        {/* Punch Attendance Status Strip */}
        <div className="flex items-center justify-between bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-500/40 shadow-inner">
          <div className="flex items-center gap-2.5">
            {punchState.isPunched ? (
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold animate-pulse">
                <Clock className="w-4.5 h-4.5" />
              </div>
            )}
            <div>
              <div className="text-xs font-extrabold text-white">
                {punchState.isPunched ? (
                  <span>Attendance Punched: <strong className="text-emerald-300 underline decoration-emerald-400">{punchState.punchTime}</strong></span>
                ) : (
                  <span className="text-amber-300 font-black">⚠️ Attendance Not Punched Today</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsPunchModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 shadow-md flex items-center gap-1.5 ${
              punchState.isPunched
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-300'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-white animate-bounce'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {punchState.isPunched ? 'RE-PUNCH' : 'PUNCH NOW'}
          </button>
        </div>
      </div>

      {/* 4 Stats Cards Grid (Matching Original Screenshot Colors) */}
      <div className="grid grid-cols-2 gap-3">
        {/* 1. TOTAL TASKS (Navy Dark Card) */}
        <div className="p-4 rounded-2xl bg-[#0b1329] text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-slate-300 tracking-wider uppercase">TOTAL TASKS</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 text-slate-300 flex items-center justify-center border border-slate-700">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-white">{totalTasks}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">Assigned Count</div>
        </div>

        {/* 2. COMPLETED (Vibrant Green Card) */}
        <div className="p-4 rounded-2xl bg-[#2e7d32] text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-emerald-100 tracking-wider uppercase">COMPLETED</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center border border-white/30">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-white">{completedTasks}</div>
          <div className="text-[10px] text-emerald-100/90 mt-1 font-medium">Done Tasks</div>
        </div>

        {/* 3. PENDING (Vibrant Orange Card) */}
        <div className="p-4 rounded-2xl bg-[#f57c00] text-slate-950 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-slate-900 tracking-wider uppercase">PENDING</span>
            <div className="w-8 h-8 rounded-xl bg-black/15 text-slate-900 flex items-center justify-center border border-black/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-950">{pendingTasks}</div>
          <div className="text-[10px] text-slate-900/80 mt-1 font-extrabold">Action Needed</div>
        </div>

        {/* 4. OVERDUE (Vibrant Magenta Card) */}
        <div className="p-4 rounded-2xl bg-[#d81b60] text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-pink-100 tracking-wider uppercase">OVERDUE</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center border border-white/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-white">{overdueTasks}</div>
          <div className="text-[10px] text-pink-100/90 mt-1 font-medium">Delayed Tasks</div>
        </div>
      </div>

      {/* QUICK ACTIONS CARD (White Container with Pill Buttons) */}
      <div className="rounded-2xl bg-white p-4 shadow-md border border-slate-200/80">
        <div className="text-[11px] font-black text-slate-400 tracking-wider uppercase mb-3">
          QUICK ACTIONS
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleNavigate('/dashboard/assign-task')}
            className="flex items-center justify-between p-3 rounded-xl bg-[#e8f5e9] hover:bg-[#c8e6c9] border border-[#a5d6a7] text-[#2e7d32] font-extrabold text-xs transition-all active:scale-95 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-[#2e7d32] flex items-center justify-center font-bold text-xs">+</div>
              <span>Assign Task</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#2e7d32]" />
          </button>

          <button
            onClick={() => handleNavigate('/dashboard/data/sales')}
            className="flex items-center justify-between p-3 rounded-xl bg-[#fff8e1] hover:bg-[#ffecb3] border border-[#ffe082] text-[#f57f17] font-extrabold text-xs transition-all active:scale-95 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <ListCheck className="w-4 h-4 text-[#f57f17]" />
              <span>Fill Checklist</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#f57f17]" />
          </button>
        </div>
      </div>

      {/* CHECKLIST SELECTOR & TOTAL CHECKLISTS CARD */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-10 px-3 py-1 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
            <img src={sbhLogo} alt="SBH" className="h-7 w-auto object-contain" />
          </div>
          <select
            value={selectedChecklist}
            onChange={(e) => setSelectedChecklist(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
          >
            <option value="Checklist">Checklist</option>
          </select>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-md border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-blue-600">Total Checklists</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalTasks}</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
