import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import DailyPunchModal from "../common/DailyPunchModal";
import { getPunchStatus } from "../../utils/punchService";
"use client";

import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, Linkedin, Activity, LogOut, Home, CheckSquare, ClipboardList, Users } from "lucide-react";

const UserLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [username, setUsername] = useState("")
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    const storedUsername = (sessionStorage.getItem("username") || localStorage.getItem("username") || "");
    
    if (!storedUsername) {
      // Redirect to login if no username found
      navigate('/login');
      return;
    }

    setUsername(storedUsername);
    setIsAdmin(storedUsername.toLowerCase() === 'admin');
  }, [navigate]);

  // Logout handler
  const handleLogout = () => {
    const user = sessionStorage.getItem('username');
    if (user) {
      try {
        const payload = new FormData();
        payload.append("action", "recordLogout");
        payload.append("username", user);
        fetch("https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec", {
          method: "POST",
          mode: "no-cors",
          body: payload
        }).catch(() => {});
      } catch (e) {}
    }
    sessionStorage.clear();
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('department');
    localStorage.removeItem('isAdmin');
    navigate("/login");
  };

  const routes = isAdmin 
    ? [
        { href: "/admin/dashboard", label: "Dashboard", icon: "home" },
        { href: "/admin/assign-task", label: "Assign Task", icon: "check-square" },
        { href: "/admin/tasks", label: "All Tasks", icon: "clipboard-list" },
      ]
    : [
        { href: "/user/dashboard", label: "Dashboard", icon: "home" },
        { href: "/user/tasks", label: "My Tasks", icon: "clipboard-list" },
        { href: "/user/completed-tasks", label: "Completed Tasks", icon: "check-square" },
        { href: "/user/profile", label: "Profile", icon: "user" },
      ];

  const getIcon = (iconName) => {
    switch (iconName) {
      case "home":
        return <i className="fas fa-home w-4 h-4 text-slate-500"></i>;
      case "clipboard-list":
        return <i className="fas fa-clipboard-list w-4 h-4 text-slate-500"></i>;
      case "check-square":
        return <i className="fas fa-check-square w-4 h-4 text-slate-500"></i>;
      case "user":
        return <i className="fas fa-user w-4 h-4 text-slate-500"></i>;
      case "cog":
        return <i className="fas fa-cog w-4 h-4 text-slate-500"></i>;
      default:
        return <i className="fas fa-circle w-4 h-4 text-slate-500"></i>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-900 dark:to-teal-950">
      
      {/* Sidebar for desktop */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 md:flex md:flex-col menu-container-bg">
        <div className="flex h-14 items-center border-b border-slate-200 px-4 menu-header-gradient">
          <Link
            to={isAdmin ? "/admin/dashboard" : "/user/dashboard"}
            className="flex items-center gap-2 font-semibold text-[#387f39]"
          >
            <i className="fas fa-clipboard-list h-5 w-5 text-[#387f39]"></i>
            <span>Checklist & Delegation</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {routes.map((route) => (
              <li key={route.href}>
                <Link
                  to={route.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    location.pathname === route.href
                      ? "menu-active-gradient font-bold"
                      : "text-slate-700 hover:bg-slate-100/70"
                  }`}
                >
                  {getIcon(route.icon)}
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* pb-12 raises layout up to sit comfortably above footer */}
        <div className="border-t border-slate-200 p-4 pb-12 menu-header-gradient">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center border border-slate-350 shadow-xs">
                <span className="text-sm font-medium text-white">
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {isAdmin ? 'Admin' : 'Staff Member'}
                </p>
                <p className="text-xs text-slate-500 font-semibold">
                  {username}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-9 h-9 hover:scale-105 transition-all transform flex items-center justify-center rounded-xl cursor-pointer shadow-md shadow-red-500/10 hover:shadow-lg border border-red-200"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)', color: '#ffffff' }}
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5 text-white" style={{ stroke: '#ffffff' }} />
            </button>
          </div>
        </div>
      </aside>
      <DailyPunchModal isOpen={isPunchModalOpen} onClose={() => setIsPunchModalOpen(false)} userName={username} />

      {/* Mobile sidebar backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden ${isMobileMenuOpen ? "block" : "hidden"}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 menu-container-bg transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-200 ease-in-out md:hidden flex flex-col justify-between`}
      >
        <div>
          <div className="flex h-14 items-center border-b border-slate-200 px-4 menu-header-gradient">
            <Link
              to={isAdmin ? "/admin/dashboard" : "/user/dashboard"}
              className="flex items-center gap-2 font-semibold text-[#387f39]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <i className="fas fa-clipboard-list h-5 w-5 text-[#387f39]"></i>
              <span>Checklist & Delegation</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 menu-container-bg">
            <ul className="space-y-1">
              {routes.map((route) => (
                <li key={route.href}>
                  <Link
                    to={route.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      location.pathname === route.href
                        ? "menu-active-gradient font-bold"
                        : "text-slate-700 hover:bg-slate-100/70"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {getIcon(route.icon)}
                    {route.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        
        {/* pb-12 raises layout up to sit comfortably above footer */}
        <div className="border-t border-slate-200 p-4 pb-12 menu-header-gradient">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center border border-slate-350 shadow-xs">
                <span className="text-sm font-medium text-white">
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {isAdmin ? 'Admin' : 'Staff Member'}
                </p>
                <p className="text-xs text-slate-500 font-semibold">
                  {username}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-9 h-9 hover:scale-105 transition-all transform flex items-center justify-center rounded-xl cursor-pointer shadow-md shadow-red-500/10 hover:shadow-lg border border-red-200"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)', color: '#ffffff' }}
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5 text-white" style={{ stroke: '#ffffff' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-10 md:justify-between">
          <button 
            className="md:hidden text-[#387f39]" 
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <i className="fas fa-bars h-5 w-5"></i>
            <span className="sr-only">Toggle menu</span>
          </button>
          <h1 className="text-lg font-semibold text-[#387f39] md:hidden">
            {isAdmin ? 'Admin Dashboard' : 'Staff Dashboard'}
          </h1>
          
          {/* Saturated Fluid Gradient text matching the footer layout */}
          <h1 className="hidden md:flex text-sm md:text-xl font-bold items-center gap-2">
            <span className="footer-gradient-text">
              {(() => {
                const hour = new Date().getHours()
                let greeting = "Good Morning"
                if (hour >= 12 && hour < 18) greeting = "Good Afternoon"
                else if (hour >= 18) greeting = "Good Evening"

                return `${greeting}, ${username ? username.toUpperCase() : "USER"}! Welcome On Board`
              })()}
            </span>
            <span className="animate-bounce inline-block text-xl">👋</span>
          </h1>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-14 md:pb-16 relative">
          {children}
        </main>

        {/* 📱 VIBRANT STYLIZED MOBILE BOTTOM DOCK (Orange, Green, Blue, Pink & Active Animations) */}
        {Capacitor.isNativePlatform() && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-800 px-2 pt-2 pb-1.5 z-[2500] shadow-[0_-10px_30px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between gap-1 mb-1">
            {/* 1. HOME BUTTON */}
            <Link
              to="/dashboard/admin"
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
                (location.pathname === '/dashboard/admin' || location.pathname === '/dashboard')
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black shadow-lg shadow-orange-500/40 scale-105 border border-orange-300/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Home className="h-4 w-4 stroke-[2.5]" />
              <span className="text-[9.5px] font-black tracking-tight">Home</span>
              {(location.pathname === '/dashboard/admin' || location.pathname === '/dashboard') && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>

            {/* 2. ASSIGN TASK BUTTON */}
            <Link
              to="/dashboard/assign-task"
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
                location.pathname === '/dashboard/assign-task'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black shadow-lg shadow-purple-500/40 scale-105 border border-purple-300/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckSquare className="h-4 w-4 stroke-[2.5]" />
              <span className="text-[9.5px] font-black tracking-tight">Assign</span>
              {location.pathname === '/dashboard/assign-task' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>

            {/* 3. CHECKLIST BUTTON */}
            <Link
              to="/dashboard/data/sales"
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
                location.pathname === '/dashboard/data/sales'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black shadow-lg shadow-emerald-500/40 scale-105 border border-emerald-300/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="h-4 w-4 stroke-[2.5]" />
              <span className="text-[9.5px] font-black tracking-tight">Checklist</span>
              {location.pathname === '/dashboard/data/sales' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>

            {/* 4. DELEGATION BUTTON */}
            <Link
              to="/dashboard/delegation"
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
                (location.pathname === '/dashboard/delegation' || location.pathname === '/dashboard/data/delegation')
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-black shadow-lg shadow-blue-500/40 scale-105 border border-blue-300/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="h-4 w-4 stroke-[2.5]" />
              <span className="text-[9.5px] font-black tracking-tight">Delegation</span>
              {(location.pathname === '/dashboard/delegation' || location.pathname === '/dashboard/data/delegation') && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>

            {/* 5. EXIT / LOGOUT BUTTON */}
            <button
              onClick={() => setShowExitModal(true)}
              className="flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black shadow-md shadow-rose-500/30 active:scale-90 transition-all duration-200"
              title="Exit App"
            >
              <LogOut className="h-4 w-4 stroke-[2.5]" />
              <span className="text-[9.5px] font-black tracking-tight">Exit</span>
            </button>
          </div>

          
        </div>
      )}

      {!Capacitor.isNativePlatform() && (
        <footer 
          className="fixed bottom-0 left-0 right-0 w-full py-0.5 md:py-1 z-[2000] overflow-hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.3)] select-none border-t border-white/10"
          style={{ background: 'linear-gradient(to right, #f59e0b, #10b981, #2e7d32)' }}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-white/5"></div>
          <div className="max-w-full mx-auto px-4 md:px-10 relative z-10">

            {/* 📱 MOBILE WEB VIEW */}
            <div className="flex flex-col items-center justify-center md:hidden py-0.5">
              <a href="https://www.sbhhospital.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 no-underline">
                <ShieldCheck size={10} className="text-white" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                  SBH Group Of Hospitals
                </span>
              </a>
              <a href="https://www.linkedin.com/in/naman-mishra/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 no-underline mt-0.5 opacity-90 hover:opacity-100">
                <span className="text-[7.5px] font-bold text-white uppercase tracking-widest italic leading-none">
                  Architected by <span className="ml-1 text-[8.5px] font-black text-white uppercase tracking-widest not-italic">Naman Mishra</span>
                </span>
                <Linkedin size={7.5} className="text-[#0077b5] bg-white rounded-[1px] p-[0.5px]" />
              </a>
            </div>

            {/* 💻 DESKTOP WEB VIEW */}
            <div className="hidden md:flex items-center justify-between gap-6 h-6 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-5.5 h-5.5 rounded-md bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md shadow-sm">
                  <Activity size={11} className="text-white" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">SBH INTEL</span>
                  <span className="text-[7px] font-extrabold text-white/80 tracking-wider mt-0.5">SYSTEM OPERATIONAL</span>
                </div>
              </div>

              <a href="https://www.sbhhospital.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 py-0.5 px-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 backdrop-blur-lg transition-all transform hover:scale-105 group no-underline shadow-sm">
                <ShieldCheck size={10} className="text-white" />
                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-1 leading-none">
                  SBH Group Of Hospitals
                </span>
              </a>

              <a href="https://www.linkedin.com/in/naman-mishra/" target="_blank" rel="noopener noreferrer" className="flex flex-col text-right group no-underline hover:opacity-90">
                <span className="text-[7px] font-bold text-white/80 uppercase tracking-widest italic leading-none mb-0.5">Architected by</span>
                <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center justify-end gap-1 leading-none text-white">
                  Naman Mishra
                  <Linkedin size={8} className="text-[#0077b5] bg-white rounded-[1px] p-[0.5px] opacity-100" />
                </span>
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* 📱 Sleek Exit Confirmation Popup Modal for Mobile APK */}
      {showExitModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-rose-500/40 p-6 text-white text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-600 to-rose-700 text-white flex items-center justify-center mx-auto shadow-xl shadow-rose-500/40 scale-105 border border-rose-300/30">
              <LogOut className="w-8 h-8 stroke-[2.5]" />
            </div>
            
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Exit SBH App?</h3>
              <p className="text-xs text-slate-300 font-semibold mt-1.5 leading-relaxed">
                Aap logged in hi rahenge. Agli baar App kholne par re-login nahi karna padega.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 transition-all active:scale-95 shadow-md"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={() => {
                  try {
                    App.exitApp();
                  } catch (e) {
                    window.close();
                  }
                }}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-rose-700 hover:from-rose-600 hover:to-pink-800 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/40 transition-all active:scale-95 border border-rose-300/30"
              >
                Exit App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      </div>
);
}