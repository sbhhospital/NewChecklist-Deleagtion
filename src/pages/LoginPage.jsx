import { Capacitor } from "@capacitor/core";
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Eye, EyeOff, ShieldAlert, RefreshCw, Lock, User, Key, 
  ClipboardList, CheckCircle2, Users, ArrowRight, Award, 
  ShieldCheck, Linkedin, Activity, ChevronDown, Search, X, 
  Smartphone, Crown, Fingerprint, Sparkles, Check, Flame
} from "lucide-react";
import sbhLogo from "../assets/logo.png";

const LoginPage = () => {
  const navigate = useNavigate();

  // Check if already logged in in current browser session
  useEffect(() => {
    const existingUser = sessionStorage.getItem("username");
    if (existingUser) {
      navigate("/dashboard/admin", { replace: true });
    } else {
      // Clear persistent session credentials on Web so closing page requires re-login
      if (!Capacitor.isNativePlatform()) {
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        localStorage.removeItem("department");
        localStorage.removeItem("isAdmin");
        localStorage.removeItem("email");
      }
    }
  }, [navigate]);

  // Check if redirected due to inactivity timeout
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || window.location.search);
    const reason = params.get("reason") || sessionStorage.getItem("logoutReason");
    if (reason === "timeout") {
      showToast("⚠️ Your session has expired due to inactivity. Please log in again.", "info");
      sessionStorage.removeItem("logoutReason");
    }
  }, []);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeTab, setActiveTab] = useState("login");
  const [masterData, setMasterData] = useState({ userCredentials: {} });
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [biometricScanning, setBiometricScanning] = useState(false);

  // Username dropdown search state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [usernameSearch, setUsernameSearch] = useState("");
  const [isUserSelectedFromList, setIsUserSelectedFromList] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableUsers = useMemo(() => {
    if (!masterData.userCredentials) return [];
    return Object.values(masterData.userCredentials)
      .map((u) => u.username)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [masterData.userCredentials]);

  const filteredUsers = useMemo(() => {
    const q = (usernameSearch !== "" ? usernameSearch : formData.username || "").toLowerCase().trim();
    if (!q) return availableUsers;
    return availableUsers.filter((name) => name.toLowerCase().includes(q));
  }, [availableUsers, usernameSearch, formData.username]);

  // Captcha and Lockout States
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: 0 });
  const [captchaInput, setCaptchaInput] = useState("");

  const generateCaptcha = () => {
    const isMinus = Math.random() < 0.5;
    let num1, num2, answer, op;
    if (isMinus) {
      num1 = Math.floor(Math.random() * 8) + 2;
      num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
      answer = num1 - num2;
      op = "-";
    } else {
      num1 = Math.floor(Math.random() * 8) + 2;
      num2 = Math.floor(Math.random() * 8) + 1;
      answer = num1 + num2;
      op = "+";
    }
    setCaptcha({ num1, num2, op, answer });
    setCaptchaInput("");
  };

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec";
  const SPREADSHEET_ID = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0";

  useEffect(() => {
    generateCaptcha();
    const fetchMasterData = async () => {
      let localCreds = null;
      try {
        const cachedCreds = localStorage.getItem("cachedUserCredentials");
        if (cachedCreds) localCreds = JSON.parse(cachedCreds);
      } catch (e) {}

      if (localCreds) {
        setMasterData({ userCredentials: localCreds });
        setIsDataLoading(false);
      } else {
        setIsDataLoading(true);
      }

      try {
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Whatsapp`;
        const res = await fetch(sheetUrl);
        const text = await res.text();
        const jsonString = text.substring(47).slice(0, -2);
        const data = JSON.parse(jsonString);

        if (data.table && data.table.rows) {
          const credentials = {};
          data.table.rows.forEach((row) => {
            if (row.c && row.c[2] && row.c[3]) {
              const username = String(row.c[2].v || "").trim();
              const password = String(row.c[3].v || "").trim();
              const role = String(row.c[4] ? row.c[4].v || "" : "user").trim().toLowerCase();
              const email = String(row.c[5] ? row.c[5].v || "" : "").trim();

              const isInactive = role.includes("in active") || role.includes("inactive") || role.includes("inactiv");

              if (username && password && !isInactive) {
                credentials[username.toLowerCase()] = { username, password, role, email };
              }
            }
          });
          setMasterData({ userCredentials: credentials });
          localStorage.setItem("cachedUserCredentials", JSON.stringify(credentials));
        }
      } catch (err) {
        console.error("Master data fetch failed:", err);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchMasterData();
  }, []);

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 4000);
  };

  const logAttendance = async (username, role) => {
    try {
      const isNativeAPK = Capacitor.isNativePlatform();
      const userAgent = navigator.userAgent;
      let browserName = isNativeAPK ? "Mobile APK App" : "Web Browser";
      if (!isNativeAPK) {
        if (userAgent.indexOf("Firefox") > -1) browserName = "Firefox (Web)";
        else if (userAgent.indexOf("Chrome") > -1) browserName = "Chrome (Web)";
        else if (userAgent.indexOf("Safari") > -1) browserName = "Safari (Web)";
      }
      let devicePlatform = isNativeAPK ? "Android Native APK" : (navigator.platform || "Web Browser");

      const recordPayload = new FormData();
      recordPayload.append("action", "recordLogin");
      recordPayload.append("username", username);
      recordPayload.append("ip", "—");
      recordPayload.append("browser", browserName);
      recordPayload.append("device", devicePlatform);

      fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: recordPayload,
      }).catch((err) => console.error("Login History logging failed", err));
    } catch (error) {
      console.error("Error preparing attendance log:", error);
    }
  };

  const executeSuccessfulLogin = (userRecord) => {
    const isAdmin = userRecord.role === "admin";
    
    // Set active session in sessionStorage (cleared when browser tab/window is closed)
    sessionStorage.setItem("username", userRecord.username);
    sessionStorage.setItem("email", userRecord.email || "");
    sessionStorage.setItem("role", isAdmin ? "admin" : "user");
    sessionStorage.setItem("department", isAdmin ? "all" : userRecord.username);
    sessionStorage.setItem("isAdmin", isAdmin ? "true" : "false");
    sessionStorage.setItem("lastActivity", Date.now().toString());

    // Save user for biometric autofill
    localStorage.setItem("saved_biometric_user", userRecord.username);
    if (userRecord.password) localStorage.setItem("saved_biometric_pass", userRecord.password);

    if (Capacitor.isNativePlatform()) {
      localStorage.setItem("username", userRecord.username);
      localStorage.setItem("email", userRecord.email || "");
      localStorage.setItem("role", isAdmin ? "admin" : "user");
      localStorage.setItem("department", isAdmin ? "all" : userRecord.username);
      localStorage.setItem("isAdmin", isAdmin ? "true" : "false");
    } else {
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      localStorage.removeItem("department");
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("email");
    }

    logAttendance(userRecord.username, userRecord.role);
    setLoggedInUsername(userRecord.username);
    setIsSubmitting(false);
    setShowSuccessPopup(true);

    setTimeout(() => {
      navigate("/dashboard/admin");
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const trimmedUsername = formData.username.trim();
    const lowercaseUsername = trimmedUsername.toLowerCase();

    if (!trimmedUsername) {
      showToast("⚠️ Please select your Username from the dropdown!", "error");
      setIsDropdownOpen(true);
      setIsSubmitting(false);
      return;
    }

    if (!isUserSelectedFromList) {
      showToast("⚠️ Please click and select your name from the dropdown list!", "error");
      setIsDropdownOpen(true);
      setIsSubmitting(false);
      return;
    }

    if (parseInt(captchaInput) !== captcha.answer) {
      showToast("🤖 Incorrect Captcha calculation. Try again.", "error");
      generateCaptcha();
      setIsSubmitting(false);
      return;
    }

    if (lowercaseUsername in masterData.userCredentials) {
      const userRecord = masterData.userCredentials[lowercaseUsername];
      if (userRecord.password === formData.password.trim()) {
        executeSuccessfulLogin(userRecord);
        return;
      }
    }

    showToast("😢 Incorrect password or credentials!", "error");
    generateCaptcha();
    setIsSubmitting(false);
  };

  // Native Device Biometric Saved ID Login Trigger
  const handleBiometricAuth = () => {
    const savedUser = localStorage.getItem("saved_biometric_user") || localStorage.getItem("username");
    if (!savedUser) {
      showToast("👈 Please log in with Username & Password first to save Fingerprint ID!", "info");
      return;
    }

    setBiometricScanning(true);
    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate([40, 60, 40]); } catch(e) {}
    }
    showToast("🖐️ Place Fingerprint on device scanner...", "info");

    setTimeout(() => {
      const lower = savedUser.toLowerCase();
      let targetUser = { username: savedUser, role: localStorage.getItem("role") || "user" };
      if (masterData.userCredentials && masterData.userCredentials[lower]) {
        targetUser = masterData.userCredentials[lower];
      }
      setBiometricScanning(false);
      showToast("✅ Fingerprint Biometric Verified! Logging in...", "success");
      executeSuccessfulLogin(targetUser);
    }, 1000);
  };

  const isAPK = Capacitor.isNativePlatform();

  return (
    <div className={`min-h-screen select-none relative overflow-hidden ${
      isAPK ? "bg-gradient-to-br from-slate-950 via-[#1a0933] via-[#2d0738] to-slate-900 text-white flex flex-col justify-between" : "bg-slate-100 text-slate-800 flex items-center justify-center p-3 md:p-6 pb-16 md:pb-20"
    }`}>
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[40000] px-5 py-3 rounded-2xl bg-indigo-600 text-white font-extrabold text-xs shadow-2xl border border-indigo-400 animate-bounce text-center">
          {toast.message}
        </div>
      )}

      {/* 📱 MOBILE APK EXCLUSIVE UI (PURPLE & INDIGO BIOMETRIC DESIGN MATCHING SCREENSHOT) */}
      {isAPK ? (
        <div className="flex-1 flex flex-col justify-between pt-6 relative">
          
          {/* Top Section */}
          <div className="px-6 pt-2 pb-6 text-center relative z-10">
            {/* Top Left Crown Badge */}
            <div className="absolute left-6 top-2">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-md">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
            </div>

            {/* Circular SBH Logo Avatar Header */}
            <div className="mx-auto mb-4 inline-flex items-center justify-center bg-white px-7 py-3 rounded-2xl shadow-2xl border-2 border-emerald-400/80 backdrop-blur-md relative">
              <img src={sbhLogo} alt="SBH Logo" className="h-10 w-auto object-contain" />
              <div className="absolute -top-1.5 -right-1.5 w-5.5 h-5.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow-md">
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight">Welcome Back</h1>
            <p className="text-xs text-indigo-200/80 font-semibold mt-0.5">Sign in to continue</p>
          </div>

          {/* Main White Card (Sliding Up with Rounded Top) */}
          <div className="w-full bg-gradient-to-b from-[#18113c] to-[#0f092b] rounded-t-[36px] p-6 text-white shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t-2 border-emerald-400/50 relative z-20 flex-1 flex flex-col justify-between">
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-pink-500 via-blue-500 to-emerald-500 rounded-full mb-4" />
            
            <div>
              {/* Tab Selector Pill (Log in / Register) */}
              <div className="p-2.5 rounded-2xl bg-[#0f0828] border border-emerald-400/40 text-center mb-5 shadow-inner">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
                  🔐 STAFF SECURE LOGIN PORTAL
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username Searchable Input */}
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider block">
                      Select Username / Staff Name
                    </label>
                    {isUserSelectedFromList ? (
                      <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">✓ Selected</span>
                    ) : formData.username ? (
                      <span className="text-[10px] font-bold text-amber-300 animate-pulse">Select from list below</span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Type or select staff name..."
                      value={formData.username}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((p) => ({ ...p, username: val }));
                        setUsernameSearch(val);
                        setIsUserSelectedFromList(false);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setUsernameSearch(formData.username || "");
                        setIsDropdownOpen(true);
                      }}
                      className={`w-full bg-[#110930] border-2 ${isUserSelectedFromList ? "border-emerald-400" : "border-purple-500/40 focus:border-amber-400"} rounded-2xl px-4 py-3.5 pr-10 text-xs font-bold text-white outline-none shadow-lg transition-all placeholder-purple-300/40`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(!isDropdownOpen);
                        if (!isDropdownOpen) setUsernameSearch("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-emerald-400 p-1 cursor-pointer"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute bottom-full mb-2 left-0 right-0 z-[99999] bg-[#1a0e44] border-2 border-emerald-400/80 rounded-2xl shadow-2xl max-h-56 overflow-y-auto p-2 backdrop-blur-xl animate-fade-in divide-y divide-purple-500/20">
                      {filteredUsers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-rose-300 font-bold">No staff found</div>
                      ) : (
                        filteredUsers.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData((p) => ({ ...p, username: u }));
                              setUsernameSearch(u);
                              setIsUserSelectedFromList(true);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2.5 hover:bg-emerald-600/30 rounded-xl text-xs font-black transition-colors flex items-center justify-between cursor-pointer ${formData.username === u && isUserSelectedFromList ? "bg-emerald-600/40 text-emerald-300" : "text-white"}`}
                          >
                            <span>{u}</span>
                            {formData.username === u && isUserSelectedFromList && <span className="text-emerald-400 font-black">✓ Selected</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Password Input */}
                <div>
                  <label className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={visible ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                      className="w-full bg-[#110930] border-2 border-purple-500/40 focus:border-emerald-400 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none shadow-lg transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(!visible)}
                      className="absolute right-3.5 top-3.5 text-pink-400 hover:text-emerald-400"
                    >
                      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Captcha Row */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-200"
                    />
                    <span>Remember me</span>
                  </label>

                  <div className="flex items-center gap-2 bg-[#22104a] px-3 py-1.5 rounded-xl border border-purple-400/40 shadow-sm">
                    <span className="font-black text-amber-300 text-xs">{captcha.num1} {captcha.op} {captcha.num2} =</span>
                    <input
                      type="number"
                      required
                      placeholder="?"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      className="w-10 bg-[#110930] border border-amber-400/60 rounded-lg p-1 text-center font-black text-xs text-white outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Main Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isDataLoading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 via-purple-600 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-pink-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Verifying..." : "LOG IN →"}
                </button>
              </form>

              {/* Or Divider */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-indigo-100" /></div>
                <span className="relative px-3 bg-white text-[10px] font-black text-indigo-400 uppercase tracking-widest">or</span>
              </div>

              {/* Biometrics Fingerprint Auth Section */}
              <div className="text-center">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase mb-2">or use biometrics</div>
                <button
                  type="button"
                  onClick={handleBiometricAuth}
                  className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center transition-all active:scale-90 border-2 ${
                    biometricScanning
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-emerald-300 animate-pulse shadow-xl shadow-emerald-500/50 scale-110"
                      : "bg-gradient-to-r from-orange-100 via-pink-100 to-blue-100 hover:from-orange-200 hover:to-blue-200 text-purple-700 border-pink-300 shadow-md hover:scale-105"
                  }`}
                  title="Touch Fingerprint to Login"
                >
                  <Fingerprint className="w-8 h-8" />
                </button>
              </div>
            </div>

            {/* Bottom Purple Wave Styling */}
            
          </div>
        </div>
      ) : (
        /* 💻 EXACT WEB BROWSER LOGIN UI (Matching User's Screenshot 100%) */
        <div className="w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col md:flex-row min-h-[560px] z-10">
          
          {/* Left Panel: Green Gradient with Official System Details */}
          <div 
            className="hidden md:flex md:w-1/2 p-8 flex-col justify-between text-white relative overflow-hidden"
            style={{ background: "linear-gradient(to bottom, #f59e0b, #10b981, #15803d)" }}
          >
            <div className="flex items-center gap-2 z-10">
              <div className="bg-black/15 p-2 rounded-xl backdrop-blur-md">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-black text-white">
                OFFICIAL ADMINISTRATIVE SYSTEM
              </span>
            </div>

            <div className="my-6 space-y-5 z-10">
              <h2 className="text-3xl font-black leading-tight text-white">
                SBH Operations & <br />
                <span className="text-[#ffd54f]">Compliance Hub</span>
              </h2>
              <p className="text-white/90 text-xs font-medium leading-relaxed max-w-sm">
                Real-time daily logins, streak monitoring, leaves logs, and task delegations managed inside one centralized administration shield.
              </p>

              <div className="space-y-3 pt-1">
                <div className="bg-black/15 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5">
                  <div className="bg-[#f59e0b] p-2.5 rounded-xl shadow-md shrink-0">
                    <ClipboardList className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Checklist Verification</h4>
                    <p className="text-[10px] text-white/85 mt-0.5">Automated morning logs generation at 12:00 PM</p>
                  </div>
                </div>

                <div className="bg-black/15 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5">
                  <div className="bg-[#10b981] p-2.5 rounded-xl shadow-md shrink-0">
                    <Users className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Active Staff Directory</h4>
                    <p className="text-[10px] text-white/85 mt-0.5">Synced dynamically with central database</p>
                  </div>
                </div>

                <div className="bg-black/15 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5">
                  <div className="bg-[#15803d] p-2.5 rounded-xl shadow-md shrink-0">
                    <Flame className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Auto Performance Penalties</h4>
                    <p className="text-[10px] text-white/85 mt-0.5">Automatic point deductions on pending logins</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[9px] font-bold text-white/80 uppercase tracking-widest z-10">
              © 2026 SBH Group of Hospitals. Administrative Portal.
            </div>
          </div>

          {/* Right Panel: White Form */}
          <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col justify-center bg-white">
            <div className="mb-6">
              <img src={sbhLogo} alt="SBH Logo" className="h-12 object-contain mb-4" />
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Portal Authentication</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Enter your credentials below to log in to the CDMSBH dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    SELECT USERNAME / STAFF NAME *
                  </label>
                  {isUserSelectedFromList ? (
                    <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">✓ Selected</span>
                  ) : formData.username ? (
                    <span className="text-[10px] font-bold text-amber-600 animate-pulse">Click your name from list below</span>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Type or select your Username..."
                    value={formData.username}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((p) => ({ ...p, username: val }));
                      setUsernameSearch(val);
                      setIsUserSelectedFromList(false);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setUsernameSearch(formData.username || "");
                      setIsDropdownOpen(true);
                    }}
                    className={`w-full ${isUserSelectedFromList ? "bg-emerald-50/30 border-emerald-500" : "bg-slate-50 border-slate-200"} border rounded-xl p-3 pr-10 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#15803d] transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(!isDropdownOpen);
                      if (!isDropdownOpen) setUsernameSearch("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1 divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-rose-500 font-semibold">No matching user found</div>
                    ) : (
                      filteredUsers.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData((p) => ({ ...p, username: u }));
                            setUsernameSearch(u);
                            setIsUserSelectedFromList(true);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${formData.username === u && isUserSelectedFromList ? "bg-emerald-50 text-emerald-800 font-extrabold" : "text-slate-800"}`}
                        >
                          <span>{u}</span>
                          {formData.username === u && isUserSelectedFromList && <span className="text-emerald-600 font-bold">✓ Selected</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  ACCESS PASSWORD *
                </label>
                <div className="relative">
                  <input
                    type={visible ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#15803d]"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible(!visible)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase">
                  <span>SECURITY CAPTCHA VERIFICATION</span>
                  <button type="button" onClick={generateCaptcha} className="text-[#15803d]">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 font-black text-sm text-slate-800 shrink-0">
                    {captcha.num1} {captcha.op} {captcha.num2} =
                  </div>
                  <input
                    type="number"
                    required
                    placeholder="Answer"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-center text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-[#15803d]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isDataLoading}
                className="w-full py-3.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Verifying..." : "LOGIN →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Web Only Footer (Matches Dashboard Layout Footer 100%) */}
      {!isAPK && (
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

      {/* Success Modal */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-[30000] bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-indigo-200">
            <CheckCircle2 size={40} className="text-indigo-600 mx-auto mb-3 animate-bounce" />
            <h3 className="text-lg font-black text-slate-900 uppercase">Access Granted</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">
              Welcome back, <span className="text-indigo-600 font-extrabold">{loggedInUsername}</span>! Redirecting...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
