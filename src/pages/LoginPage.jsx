"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldAlert, RefreshCw, Lock, User, Key, Frown, ClipboardList, CheckCircle2, Users, ArrowRight, Award, ShieldCheck, Linkedin, Activity } from "lucide-react";
import sbhLogo from "../assets/logo.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Controls button-level loading spinner
  const [visible, setVisible] = useState(false);
  const [masterData, setMasterData] = useState({
    userCredentials: {},
  });
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [showSadEmoji, setShowSadEmoji] = useState(false);

  // Captcha and Lockout States
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: 0 });
  const [captchaInput, setCaptchaInput] = useState("");
  const [lockedUsers, setLockedUsers] = useState([]);

  // Initialize failedAttempts registry directly from localStorage to survive page refresh
  const [failedAttempts, setFailedAttempts] = useState(() => {
    try {
      const stored = localStorage.getItem("failedAttemptsRegistry");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // Generate a random mathematical captcha
  const generateCaptcha = () => {
    const isMinus = Math.random() < 0.5;
    let num1, num2, answer, op;
    if (isMinus) {
      num1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
      num2 = Math.floor(Math.random() * (num1 - 1)) + 1; // 1 to num1 - 1
      answer = num1 - num2;
      op = "-";
    } else {
      num1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
      num2 = Math.floor(Math.random() * 8) + 1; // 1 to 8
      answer = num1 + num2;
      op = "+";
    }
    setCaptcha({ num1, num2, op, answer });
    setCaptchaInput("");
  };

  const isInactiveRole = (role) => {
    if (!role) return false;
    const normalizedRole = String(role).toLowerCase().trim();
    return (
      normalizedRole === "inactive" ||
      normalizedRole === "in active" ||
      normalizedRole === "inactiv" ||
      normalizedRole === "in activ"
    );
  };

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec";
  const SPREADSHEET_ID = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0";

  // Fetch master data and locked users on mount
  useEffect(() => {
    generateCaptcha();
    const fetchMasterData = async () => {
      // 1. Try to load from localStorage first for instant access
      let localLocked = [];
      let localCreds = null;
      try {
        const localStored = localStorage.getItem("locallyLockedUsers");
        if (localStored) {
          localLocked = JSON.parse(localStored);
        }
        const cachedCreds = localStorage.getItem("cachedUserCredentials");
        if (cachedCreds) {
          localCreds = JSON.parse(cachedCreds);
        }
      } catch (e) {
        console.warn("Local storage read failed", e);
      }

      if (localLocked.length > 0) {
        setLockedUsers(localLocked);
      }
      if (localCreds) {
        setMasterData({ userCredentials: localCreds });
        // Since we have cached data, we don't need to show the loading state!
        setIsDataLoading(false);
      } else {
        setIsDataLoading(true);
      }

      try {
        // Fetch locked users and user list in parallel
        const lockedPromise = fetch(`${SCRIPT_URL}?action=getLockedUsers`)
          .then(res => res.ok ? res.text() : null)
          .then(text => {
            if (text && (text.startsWith("{") || text.startsWith("["))) {
              const data = JSON.parse(text);
              if (data && data.success) {
                return data.lockedUsers || [];
              }
            }
            return null;
          })
          .catch(() => null);

        const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Whatsapp`;
        const credsPromise = fetch(sheetUrl)
          .then(res => res.text())
          .then(text => {
            const jsonString = text.substring(47).slice(0, -2);
            const data = JSON.parse(jsonString);
            const userCredentials = {};
            if (data.table && data.table.rows) {
              for (let i = 1; i < data.table.rows.length; i++) {
                const row = data.table.rows[i];
                const username = row.c[2] ? String(row.c[2].v || "").trim() : "";
                const password = row.c[3] ? String(row.c[3].v || "").trim() : "";
                const role = row.c[4] ? String(row.c[4].v || "").trim() : "user";
                const email = row.c[5] ? String(row.c[5].v || "").trim() : "";

                if (username && password && password.trim() !== "") {
                  if (isInactiveRole(role)) continue;
                  
                  const lowerUser = username.toLowerCase().trim();
                  userCredentials[lowerUser] = {
                    username: username, 
                    password: password,
                    role: role.toLowerCase(),
                    email: email
                  };
                }
              }
            }
            return userCredentials;
          })
          .catch(() => null);

        const [serverLocked, serverCreds] = await Promise.all([lockedPromise, credsPromise]);

        if (serverLocked) {
          setLockedUsers(serverLocked);
          localStorage.setItem("locallyLockedUsers", JSON.stringify(serverLocked));
        }
        if (serverCreds && Object.keys(serverCreds).length > 0) {
          setMasterData({ userCredentials: serverCreds });
          localStorage.setItem("cachedUserCredentials", JSON.stringify(serverCreds));
        }
      } catch (error) {
        console.error("Error Fetching Master Data:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const logAttendance = async (username, role) => {
    try {
      let clientIp = "—";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          clientIp = ipData.ip;
        }
      } catch (ipErr) {
        console.warn("Could not fetch client IP:", ipErr);
      }

      const userAgent = navigator.userAgent;
      let browserName = "Unknown";
      if (userAgent.indexOf("Firefox") > -1) browserName = "Firefox";
      else if (userAgent.indexOf("Chrome") > -1) browserName = "Chrome";
      else if (userAgent.indexOf("Safari") > -1) browserName = "Safari";
      else if (userAgent.indexOf("MSIE") > -1 || !!document.documentMode === true) browserName = "IE";

      let devicePlatform = navigator.platform || "Unknown";

      const recordPayload = new FormData();
      recordPayload.append("action", "recordLogin");
      recordPayload.append("username", username);
      recordPayload.append("ip", clientIp);
      recordPayload.append("browser", browserName);
      recordPayload.append("device", devicePlatform);

      fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: recordPayload,
      }).catch((err) => console.error("Login History logging failed", err));

      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Attendance%20Login`;
      const response = await fetch(sheetUrl);
      const text = await response.text();
      const jsonString = text.substring(47).slice(0, -2);
      const data = JSON.parse(jsonString);

      let rowIndex = -1;
      if (data.table && data.table.rows) {
        for (let i = 0; i < data.table.rows.length; i++) {
          const row = data.table.rows[i];
          const cellValue = row.c && row.c[1] ? String(row.c[1].v || "").trim().toLowerCase() : "";
          if (cellValue === username.trim().toLowerCase()) {
            rowIndex = i + 2;
            break;
          }
        }
      }

      if (rowIndex === -1) return;

      const now = new Date();
      const day = now.getDate().toString().padStart(2, "0");
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const year = now.getFullYear();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      const formattedTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      const payload = new FormData();
      payload.append("sheetName", "Attendance Login");
      payload.append("action", "update");
      payload.append("rowIndex", rowIndex.toString());

      const rowData = ["", "", formattedTimestamp];
      payload.append("rowData", JSON.stringify(rowData));

      fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: payload,
      }).catch((err) => console.error("Attendance logging failed", err));
    } catch (error) {
      console.error("Error preparing attendance log:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowSadEmoji(false);

    const trimmedUsername = formData.username.trim();
    const lowercaseUsername = trimmedUsername.toLowerCase();
    const trimmedPassword = formData.password.trim();

    // Fetch immediate local storage block fallback
    let localLocked = [];
    try {
      const localStored = localStorage.getItem("locallyLockedUsers");
      if (localStored) {
        localLocked = JSON.parse(localStored);
      }
    } catch (err) {
      console.warn(err);
    }

    // 1. Check if user is locked (case-insensitive check against both local + DB list)
    const isUserLocked = lockedUsers.some(
      (u) => String(u).toLowerCase().trim() === lowercaseUsername
    ) || localLocked.some(
      (u) => String(u).toLowerCase().trim() === lowercaseUsername
    );

    if (isUserLocked) {
      showToast("😞 Account is locked! Please contact AM Sir (Dr. A.M.) to unlock it.", "error");
      setIsSubmitting(false);
      return;
    }

    // 2. Validate Captcha
    if (parseInt(captchaInput) !== captcha.answer) {
      showToast("🤖 Incorrect Captcha calculation. Please try again.", "error");
      generateCaptcha();
      setIsSubmitting(false);
      return;
    }

    // 3. Authenticate
    if (lowercaseUsername in masterData.userCredentials) {
      const userRecord = masterData.userCredentials[lowercaseUsername];
      const correctPassword = userRecord.password;
      const userRole = userRecord.role;
      const userEmail = userRecord.email || "";
      const originalUsername = userRecord.username;

      if (correctPassword === trimmedPassword) {
        // Success Path - Clear attempts from state & localStorage
        setFailedAttempts((prev) => {
          const updated = { ...prev };
          delete updated[lowercaseUsername];
          try {
            localStorage.setItem("failedAttemptsRegistry", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        sessionStorage.setItem("username", originalUsername);
        sessionStorage.setItem("email", userEmail);
        setLoggedInUsername(originalUsername);

        const isAdmin = userRole === "admin";
        sessionStorage.setItem("role", isAdmin ? "admin" : "user");

        if (isAdmin) {
          sessionStorage.setItem("department", "all");
          sessionStorage.setItem("isAdmin", "true");
        } else {
          sessionStorage.setItem("department", originalUsername);
          sessionStorage.setItem("isAdmin", "false");
        }

        // Attendance logger triggers
        logAttendance(originalUsername, userRole);
        
        setIsSubmitting(false);
        setShowSuccessPopup(true);

        setTimeout(() => {
          navigate("/dashboard/admin");
        }, 1800);

        showToast(`Login successful. Welcome back, ${originalUsername}!`, "success");
        return;
      } else {
        // Correct username but WRONG password -> Count attempts and persist
        const currentAttempts = (failedAttempts[lowercaseUsername] || 0) + 1;
        
        setFailedAttempts((prev) => {
          const updated = { ...prev, [lowercaseUsername]: currentAttempts };
          try {
            localStorage.setItem("failedAttemptsRegistry", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        
        setShowSadEmoji(true);

        if (currentAttempts >= 5) {
          // Lock user locally inside localStorage first
          const updatedLocked = Array.from(new Set([...lockedUsers, ...localLocked, originalUsername]));
          setLockedUsers(updatedLocked);
          try {
            localStorage.setItem("locallyLockedUsers", JSON.stringify(updatedLocked));
          } catch (e) {
            console.warn(e);
          }

          // Use mode: 'no-cors' to guarantee writing to LockedAccounts sheet by bypassing CORS blocks
          try {
            fetch(`${SCRIPT_URL}?action=lockUser&username=${encodeURIComponent(originalUsername)}`, {
              mode: 'no-cors'
            });
            showToast("🔴 5 failed attempts! This account has been LOCKED. Please contact AM Sir.", "error");
          } catch (err) {
            console.error("Failed to lock user in database:", err);
            showToast("🔴 5 failed attempts! Account is locked locally.", "error");
          }
        } else {
          showToast(
            `😢 Wrong password. Attempt ${currentAttempts}/5. ${5 - currentAttempts} attempts remaining before lockout!`,
            "error"
          );
        }
        generateCaptcha();
        setIsSubmitting(false);
        return;
      }
    }

    // 4. Username does NOT exist in sheet database
    showToast("😢 Username does not exist or credentials incorrect!", "error");
    setShowSadEmoji(true);
    generateCaptcha();
    setIsSubmitting(false);
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 4500);
  };

  const togglePasswordVisibility = () => {
    setVisible(!visible);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 md:p-6 pb-16 md:pb-20" style={{ background: 'linear-gradient(135deg, #eef7f2 0%, #ffffff 50%, #fef6f0 100%)', backgroundColor: '#eef7f2' }}>
      
      {/* Main Container: Split screen on md+ */}
      <div className="w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col md:flex-row min-h-[580px]">
        
        {/* Left Side: Creative Office/Management Board with exact Fluid Gradient matching Footer code: Orange to Green */}
        <div 
          className="hidden md:flex md:w-1/2 p-8 flex-col justify-between text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(to right, #f59e0b, #10b981, #2e7d32)' }}
        >
          
          {/* Subtle patterns for visual richness (No white overlays) */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          
          {/* Header block of Illustration side */}
          <div className="flex items-center gap-2 z-10">
            <div className="bg-black/10 p-2 rounded-xl backdrop-blur-md">
              <ShieldCheck className="h-5 w-5 text-yellow-100" />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-black text-white/90">
              Official Administrative System
            </span>
          </div>

          {/* Center Illustration: Styled Cartoon Dashboard / System Interface Mockup */}
          <div className="my-8 space-y-6 z-10">
            <h2 className="text-3xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
              SBH Operations & <br />
              <span className="text-[#ffd54f]">Compliance Hub</span>
            </h2>
            <p className="text-white/90 text-xs font-medium leading-relaxed max-w-sm drop-shadow-xs">
              Real-time daily logins, streak monitoring, leaves logs, and task delegations managed inside one centralized administration shield.
            </p>

            {/* Creative System mockup cards representing office tasks */}
            <div className="space-y-3 pt-2">
              
              {/* Checklist template indicator card */}
              <div className="bg-black/15 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5 hover:bg-black/20 transition-all">
                <div className="bg-[#f59e0b] p-2.5 rounded-xl shadow-md shrink-0">
                  <ClipboardList className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Checklist Verification</h4>
                  <p className="text-[10px] text-white/85 mt-0.5">Automated morning logs generation at 12:00 PM</p>
                </div>
              </div>

              {/* Active employee statistics indicator card */}
              <div className="bg-black/15 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5 hover:bg-black/20 transition-all">
                <div className="bg-[#10b981] p-2.5 rounded-xl shadow-md shrink-0">
                  <Users className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Active Staff Directory</h4>
                  <p className="text-[10px] text-white/85 mt-0.5">Synced dynamically with central database</p>
                </div>
              </div>

              {/* Scorecard compliance indicator card */}
              <div className="bg-black/15 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5 hover:bg-black/20 transition-all">
                <div className="bg-[#2e7d32] p-2.5 rounded-xl shadow-md shrink-0">
                  <Award className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Auto Performance Penalties</h4>
                  <p className="text-[10px] text-white/85 mt-0.5">Automatic point deductions on pending logins</p>
                </div>
              </div>

            </div>
          </div>

          {/* Footer block of Illustration side */}
          <div className="text-[10px] text-white/85 font-black z-10 drop-shadow-xs">
            &copy; {new Date().getFullYear()} SBH Group of Hospitals. Administrative Portal.
          </div>

        </div>

        {/* Right Side: Clean Login Form */}
        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center space-y-6">
          
          {/* Header containing SBH Logo */}
          <div className="text-center md:text-left space-y-3">
            <div className="flex justify-center md:justify-start">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl inline-block shadow-sm">
                <img src={sbhLogo} alt="SBH Logo" className="h-14 w-auto object-contain" />
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Portal Authentication</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Enter your credentials below to log in to the CDMSBH dashboard
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* User locked alert notification */}
            {lockedUsers.length > 0 && formData.username && lockedUsers.some(u => String(u).toLowerCase().trim() === formData.username.toLowerCase().trim()) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2.5 animate-bounce">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold block">Account Blocked!</span>
                  This user has been locked due to 5 consecutive wrong attempts. Contact AM Sir to unblock.
                </div>
              </div>
            )}

            {/* Sad face wrong password prompt */}
            {showSadEmoji && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
                <Frown className="h-7 w-7 text-orange-500 shrink-0" />
                <div className="text-xs font-bold text-orange-900">
                  Wrong username or password attempt 😞. Lockout attempts are monitored.
                </div>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1">
              <label htmlFor="username" className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
                Username / Identifier
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#387f39] focus:border-transparent transition-all text-xs font-semibold text-slate-800 bg-[#f4f6f9]"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
                Access Password
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={visible ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#387f39] focus:border-transparent transition-all text-xs font-semibold text-slate-800 bg-[#f4f6f9]"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#387f39]"
                >
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Mathematical Captcha - Dark background for maximum contrast */}
            <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
                  Security Captcha Verification
                </span>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="text-[#387f39] hover:text-emerald-700 p-0.5 rounded transition-colors"
                  title="Reload Captcha"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 text-slate-800 font-extrabold text-sm border border-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-center tracking-wider select-none shrink-0 min-w-[100px] shadow-sm">
                  {captcha.num1} {captcha.op || "+"} {captcha.num2} =
                </div>
                <input
                  type="number"
                  placeholder="Answer"
                  required
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#387f39] focus:border-transparent text-sm font-extrabold text-slate-800 text-center bg-white placeholder-slate-400 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Submit Button - Solid Hospital Green */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#387f39] hover:bg-[#2d662e] py-3.5 px-4 text-white font-extrabold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                disabled={isSubmitting || isDataLoading}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    <span>Verifying...</span>
                  </div>
                ) : isDataLoading ? (
                  <span>Loading Database...</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Login</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>

      {/* Official Footer Component Layout - Sleeker & Thinner Padding */}
      <footer 
        className="fixed bottom-0 left-0 w-full py-0.5 md:py-1 z-[150] overflow-hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.3)] select-none border-t border-white/10"
        style={{ background: 'linear-gradient(to right, #f59e0b, #10b981, #2e7d32)' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-white/5"></div>
        <div className="max-w-full mx-auto px-4 md:px-10 relative z-10">

          {/* 📱 MOBILE VIEW */}
          <div className="flex flex-col items-center justify-center md:hidden py-0.5">
            <a href="https://www.sbhhospital.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 no-underline">
              <ShieldCheck size={10} className="text-white" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                SBH Group Of Hospitals
              </span>
            </a>
            <a href="https://www.linkedin.com/in/ignamanmishra" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 no-underline mt-0.5 opacity-90">
              <span className="text-[7.5px] font-bold text-white uppercase tracking-widest italic leading-none">
                Architected by <span className="ml-1 text-[8.5px] font-black text-white uppercase tracking-widest not-italic">Naman Mishra</span>
              </span>
              <Linkedin size={7.5} className="text-[#0077b5] bg-white rounded-[1px] p-[0.5px]" />
            </a>
          </div>

          {/* 💻 DESKTOP VIEW */}
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

            <a href="https://www.linkedin.com/in/ignamanmishra" target="_blank" rel="noopener noreferrer" className="flex flex-col text-right group no-underline">
              <span className="text-[7px] font-bold text-white/80 uppercase tracking-widest italic leading-none mb-0.5">Architected by</span>
              <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center justify-end gap-1 leading-none text-white">
                Naman Mishra
                <Linkedin size={8} className="text-[#0077b5] bg-white rounded-[1px] p-[0.5px] opacity-100" />
              </span>
            </a>
          </div>
        </div>
      </footer>

      {/* Success Popup Modal */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-[10000]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-emerald-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 size={36} className="text-[#387f39]" />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Access Granted</h3>
            <p className="text-xs text-slate-500 font-bold mt-2">
              Welcome back, <span className="text-[#387f39] font-extrabold">{loggedInUsername}</span>! Redirecting to secure node...
            </p>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default LoginPage;
