"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import sbhLogo from "../assets/logo.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [masterData, setMasterData] = useState({
    userCredentials: {}, // Object where keys are usernames and values are passwords
    userRoles: {},
    userEmails: {}, // Object where keys are usernames and values are roles
  });
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");

  // Function to check if a role is any variation of "inactive"
  const isInactiveRole = (role) => {
    if (!role) return false;

    // Convert to lowercase
    const normalizedRole = String(role).toLowerCase().trim();

    // Check for different variations of "inactive" status
    return (
      normalizedRole === "inactive" ||
      normalizedRole === "in active" ||
      normalizedRole === "inactiv" ||
      normalizedRole === "in activ"
    );
  };

  // Fetch master data on component mount
  useEffect(() => {
    const fetchMasterData = async () => {
      const SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec";

      try {
        setIsDataLoading(true);

        // Get the spreadsheet ID from your Apps Script
        const SPREADSHEET_ID = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0";

        // Construct the URL to read the sheet data directly
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=master`;

        const response = await fetch(sheetUrl);
        const text = await response.text();

        // Parse the Google Sheets JSON response
        const jsonString = text.substring(47).slice(0, -2); // Remove Google's wrapper
        const data = JSON.parse(jsonString);

        // Create userCredentials and userRoles objects from the sheet data
        const userCredentials = {};
        const userRoles = {};
        const userEmails = {};

        // Process the data rows (skip header row if it exists)
        if (data.table && data.table.rows) {
          //console.log("Raw sheet data:", data.table.rows);

          // Start from index 1 to skip header row (adjust if needed)
          for (let i = 1; i < data.table.rows.length; i++) {
            const row = data.table.rows[i];

            // Extract data from columns C, D, E (indices 2, 3, 4)
            const username = row.c[2]
              ? String(row.c[2].v || "").trim()
              : "";
            const password = row.c[3] ? String(row.c[3].v || "").trim() : "";
            const role = row.c[4] ? String(row.c[4].v || "").trim() : "user";
            const email = row.c[5] ? String(row.c[5].v || "").trim() : "";

            //console.log(`Processing row ${i}: username=${username}, password=${password}, role=${role}`);

            // Only process if we have both username and password
            if (username && password && password.trim() !== "") {
              // Check if the role is any kind of inactive status
              if (isInactiveRole(role)) {
                //console.log(`Skipping inactive user: ${username} with role: ${role}`);
                continue; // Skip this user
              }

              // Store normalized role for comparison
              const normalizedRole = role.toLowerCase();

              // Store in our maps
              userCredentials[username] = password;
              userRoles[username] = normalizedRole;
              userEmails[username] = email;

              //console.log(`Added credential for: ${username}, Role: ${normalizedRole}`);
            }
          }
        }

        setMasterData({ userCredentials, userRoles, userEmails });
        //console.log("Loaded credentials from master sheet:", Object.keys(userCredentials).length)
        //console.log("Credentials map:", userCredentials)
        //console.log("Roles map:", userRoles)

        // Debug - check admin roles specifically
        const adminUsers = Object.entries(userRoles)
          .filter(([, role]) => role === "admin")
          .map(([username]) => username);
        //console.log("Admin users found:", adminUsers);
      } catch (error) {
        console.error("Error Fetching Master Data:", error);

        // Fallback: Try the alternative method using your Apps Script
        try {
          //console.log("Trying alternative method...");
          const fallbackResponse = await fetch(SCRIPT_URL, {
            method: "GET",
          });

          if (fallbackResponse.ok) {
            //console.log("Apps Script is accessible, but getMasterData action needs to be implemented");
            showToast(
              "Unable to load user data. Please contact administrator.",
              "error"
            );
          }
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }

        showToast(
          `Network error: ${error.message}. Please try again later.`,
          "error"
        );
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
    const SCRIPT_URL =
      "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec";
    const SPREADSHEET_ID = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0";

    try {
      // Fetch IP
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

      // Detect Browser
      const userAgent = navigator.userAgent;
      let browserName = "Unknown";
      if (userAgent.indexOf("Firefox") > -1) browserName = "Firefox";
      else if (userAgent.indexOf("Chrome") > -1) browserName = "Chrome";
      else if (userAgent.indexOf("Safari") > -1) browserName = "Safari";
      else if (userAgent.indexOf("MSIE") > -1 || !!document.documentMode === true) browserName = "IE";

      // Detect Device/OS
      let devicePlatform = navigator.platform || "Unknown";

      // Call recordLogin action
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

      // Step 1: Fetch sheet data using GVIZ to find the user's row
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Attendance%20Login`;
      const response = await fetch(sheetUrl);
      const text = await response.text();
      const jsonString = text.substring(47).slice(0, -2);
      const data = JSON.parse(jsonString);

      let rowIndex = -1;
      // Search for the username in Column B (index 1)
      if (data.table && data.table.rows) {
        for (let i = 0; i < data.table.rows.length; i++) {
          const row = data.table.rows[i];
          const cellValue =
            row.c && row.c[1]
              ? String(row.c[1].v || "")
                .trim()
                .toLowerCase()
              : "";

          if (cellValue === username.trim().toLowerCase()) {
            // i is 0-based index from the rows array
            // User reported it was writing 1 row too high, so we increment by 2
            // i=0 (likely first data row after header) -> should be Row 2 in sheet
            rowIndex = i + 2;
            break;
          }
        }
      }

      if (rowIndex === -1) {
        console.warn(
          "User not found in Attendance Login sheet for attendance logging"
        );
        return;
      }

      // Step 2: Update the specific row
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

      // We send a flat array to update specific columns
      // Index 0 -> Column A: "" (No change)
      // Index 1 -> Column B: "" (No change)
      // Index 2 -> Column C: Timestamp
      const rowData = ["", "", formattedTimestamp];

      payload.append("rowData", JSON.stringify(rowData));

      // Fire and forget - don't await to avoid blocking UI
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
    setIsLoginLoading(true);

    try {
      const trimmedUsername = formData.username.trim();
      const trimmedPassword = formData.password.trim();

      //console.log("Login Attempt Details:")
      //console.log("Entered Username:", trimmedUsername)
      //console.log("Entered Password:", trimmedPassword) // For debugging (remove in production)
      //console.log("Available Credentials Count:", Object.keys(masterData.userCredentials).length)
      //console.log("Current userCredentials:", masterData.userCredentials)
      //console.log("Current userRoles:", masterData.userRoles)

      // Check if the username exists in our credentials map
      if (trimmedUsername in masterData.userCredentials) {
        const correctPassword = masterData.userCredentials[trimmedUsername];
        const userRole = masterData.userRoles[trimmedUsername];
        const userEmail = masterData.userEmails[trimmedUsername] || "";

        //console.log("Found user in credentials map")
        //console.log("Expected Password:", correctPassword)
        //console.log("Password Match:", correctPassword === trimmedPassword)
        //console.log("User Role:", userRole)
        //console.log("User Email:", userEmail)

        // Check if password matches
        if (correctPassword === trimmedPassword) {
          // Store user info in sessionStorage
          sessionStorage.setItem("username", trimmedUsername);
          sessionStorage.setItem("email", userEmail);
          setLoggedInUsername(trimmedUsername); // Set the username for the popup

          // Check if user is admin - explicitly compare with the string "admin"
          const isAdmin = userRole === "admin";
          //console.log(`User ${trimmedUsername} is admin: ${isAdmin}`);

          // Set role based on the fetched role
          sessionStorage.setItem("role", isAdmin ? "admin" : "user");

          // For admin users, we don't want to restrict by department
          if (isAdmin) {
            sessionStorage.setItem("department", "all"); // Admin sees all departments
            sessionStorage.setItem("isAdmin", "true"); // Additional flag to ensure admin permissions
            //console.log("ADMIN LOGIN - Setting full access permissions");
          } else {
            sessionStorage.setItem("department", trimmedUsername);
            sessionStorage.setItem("isAdmin", "false");
            //console.log("USER LOGIN - Setting restricted access");
          }

          // Log attendance to Google Sheet
          logAttendance(trimmedUsername, userRole);

          // Show success popup
          setShowSuccessPopup(true);

          // After 2 seconds, navigate to dashboard
          setTimeout(() => {
            navigate("/dashboard/admin");
          }, 2000);

          showToast(
            `Login successful. Welcome, ${trimmedUsername}!`,
            "success"
          );
          return;
        } else {
          showToast(
            "Username or password is incorrect. Please try again.",
            "error"
          );
        }
      } else {
        showToast(
          "Username or password is incorrect. Please try again.",
          "error"
        );
      }

      // If we got here, login failed
      console.error("Login Failed", {
        usernameExists: trimmedUsername in masterData.userCredentials,
        passwordMatch:
          trimmedUsername in masterData.userCredentials
            ? "Password did not match"
            : "Username not found",
        userRole: masterData.userRoles[trimmedUsername] || "No role",
      });
    } catch (error) {
      console.error("Login Error:", error);
      showToast(`Login failed: ${error.message}. Please try again.`, "error");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 5000); // Toast duration
  };

  const togglePasswordVisibility = () => {
    setVisible(!visible);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50/50 via-white to-emerald-50/50 p-4">
      <div className="w-full max-w-md shadow-2xl border border-slate-100 rounded-3xl bg-white overflow-hidden transition-all duration-300">
        <div className="space-y-2 p-6 login-header-gradient rounded-t-3xl border-b-4 border-emerald-500 text-center">
          <div className="flex flex-col items-center justify-center mb-1 gap-2">
            <img src={sbhLogo} alt="SBH Group of Hospitals" className="w-56 h-auto object-contain drop-shadow-md mb-1" />
            <h2 className="text-2xl font-black text-indigo-900 tracking-tight">
              Checklist & Delegation
            </h2>
          </div>
          <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
            Login to access your tasks and delegations
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="flex items-center text-slate-700 text-xs font-bold uppercase tracking-wider"
            >
              <i className="fas fa-user h-3.5 w-3.5 mr-2 text-indigo-600"></i>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter your username"
              required
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm text-slate-800 font-medium"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="flex items-center text-slate-700 text-xs font-bold uppercase tracking-wider"
            >
              <i className="fas fa-key h-3.5 w-3.5 mr-2 text-indigo-600"></i>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={visible ? "text" : "password"}
                placeholder="Enter your password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm text-slate-800 font-medium pr-10"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600"
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full login-btn-gradient py-3.5 px-4 text-white font-extrabold rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg text-sm tracking-wide"
              disabled={isLoginLoading || isDataLoading}
            >
              {isLoginLoading
                ? "Logging in..."
                : isDataLoading
                  ? "Loading..."
                  : "Login"}
            </button>
          </div>
        </form>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-12 right-4 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 z-[9999] ${toast.type === "success"
            ? "bg-green-100 text-green-800 border-l-4 border-green-500"
            : "bg-red-100 text-red-800 border-l-4 border-red-500"
            }`}
        >
          {toast.message}
        </div>
      )}

      {/* Success Popup Modal */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl transform transition-all duration-300 scale-100 opacity-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">
                Login Successful!
              </h3>
              <div className="mt-2 px-4 py-3">
                <p className="text-xl text-gray-600">
                  Welcome{" "}
                  <span className="font-semibold text-blue-600">
                    {loggedInUsername}
                  </span>
                  , you have successfully logged in.
                </p>
              </div>
              <div className="mt-4">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Redirecting to dashboard...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="fixed left-0 right-0 bottom-0 py-1.5 px-4 login-footer-gradient text-white text-center text-xs shadow-md z-[999] font-bold tracking-wider">
        Architecture by Naman Mishra
      </div>
    </div>
  );
};

export default LoginPage;
