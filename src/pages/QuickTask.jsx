"use client"
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';
import { Search, ChevronDown, Filter, Calendar } from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import DelegationPage from "./delegation-data";

export default function QuickTask() {
    const [tasks, setTasks] = useState([]);
    const [delegationTasks, setDelegationTasks] = useState([]);
    const [inactiveUsers, setInactiveUsers] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [delegationLoading, setDelegationLoading] = useState(false);
    const [userLoading, setUserLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [activeTab, setActiveTab] = useState('checklist');
    const [nameFilter, setNameFilter] = useState('');
    const [freqFilter, setFreqFilter] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState({
        name: false,
        frequency: false
    });
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
    const [leaveStartDate, setLeaveStartDate] = useState("")
    const [leaveEndDate, setLeaveEndDate] = useState("")
    const [leaveEmployee, setLeaveEmployee] = useState("")
    const [leaveTargetSheet, setLeaveTargetSheet] = useState("both")
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

    const [funnyMsg, setFunnyMsg] = useState("🏥 Updating SBH Group of Hospitals analytics...")
    useEffect(() => {
        if (!loading && !delegationLoading) return
        const messages = [
            "🏥 Updating SBH Group of Hospitals analytics...",
            "💼 Assembling the management team for synergy...",
            "☕ NM is approving the latest entries... please hold!",
            "📊 Polishing employee scorecards for the monthly review...",
            "📁 Finding files that were definitely archived correctly...",
            "📧 Drafting emails that could have been quick meetings...",
            "✨ Boosting team performance metrics by 200%...",
            "🍪 Stealing biscuits from the office breakroom..."
        ]
        let idx = 0;
        const timer = setInterval(() => {
            idx = (idx + 1) % messages.length
            setFunnyMsg(messages[idx])
        }, 2500)
        return () => clearInterval(timer)
    }, [loading, delegationLoading])

    const CONFIG = {
        SHEET_ID: "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0",
        WHATSAPP_SHEET: "Whatsapp", // For login credentials and user roles
        CHECKLIST_SHEET: "Checklist", // For unique checklist tasks
        DELEGATION_SHEET: "Delegation", // For delegation tasks
        PAGE_CONFIG: {
            title: "Task Management",
            description: "Showing your tasks"
        }
    };

    // Auto-detect current user from login session and get role from Whatsapp sheet
    const fetchCurrentUser = useCallback(async () => {
        try {
            setUserLoading(true);
            setError(null);

            // Get user data from your login system (sessionStorage)
            const loggedInUsername = sessionStorage.getItem('username');

            console.log("Session data found:");
            console.log("Username from session:", loggedInUsername);

            if (!loggedInUsername) {
                throw new Error("No user logged in. Please log in to access tasks.");
            }

            // Fetch user role from Whatsapp sheet
            const whatsappSheetUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${CONFIG.WHATSAPP_SHEET}`;
            const response = await fetch(whatsappSheetUrl);
            const text = await response.text();

            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}') + 1;
            const jsonData = text.substring(jsonStart, jsonEnd);
            const data = JSON.parse(jsonData);

            if (data?.table?.rows) {
                let foundUser = null;
                const inactiveSet = new Set();

                // Skip header row and search for user
                data.table.rows.slice(1).forEach((row) => {
                    if (row.c) {
                        const doerName = row.c[2]?.v || ""; // Column C - Doer's Name
                        const role = row.c[4]?.v || "user"; // Column E - Role
                        const roleLower = role.toLowerCase().trim();

                        if (roleLower === "inactive" || roleLower === "in active") {
                            inactiveSet.add(doerName.toLowerCase().trim());
                        }

                        // Match by username (case-insensitive)
                        if (doerName.toLowerCase().trim() === loggedInUsername.toLowerCase().trim()) {
                            foundUser = {
                                name: doerName,
                                role: roleLower,
                                department: row.c[0]?.v || "", // Column A - Department
                                givenBy: row.c[1]?.v || "", // Column B - Given By
                                email: row.c[5]?.v || "" // Column F - ID/Email
                            };
                        }
                    }
                });
                setInactiveUsers(inactiveSet);

                if (foundUser) {
                    setCurrentUser(foundUser.name);
                    setUserRole(foundUser.role);
                    console.log("User found in Whatsapp sheet:", foundUser);
                } else {
                    throw new Error(`User "${loggedInUsername}" not found in Whatsapp sheet. Please contact administrator.`);
                }
            } else {
                throw new Error("Could not fetch user data from Whatsapp sheet");
            }
        } catch (err) {
            console.error("Error fetching user:", err);
            setError(err.message);
        } finally {
            setUserLoading(false);
        }
    }, []);

    const handleLeaveSubmit = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        setLeaveStartDate(dateStr);
        setLeaveEndDate(dateStr);
        setLeaveEmployee(currentUser || "");
        setLeaveTargetSheet("both");
        setIsLeaveModalOpen(true);
    };

    const confirmLeaveSubmit = async () => {
        if (!leaveStartDate || !leaveEndDate) {
            alert("Please select both start and end dates for the leave.");
            return;
        }

        const startObj = new Date(leaveStartDate);
        startObj.setHours(0, 0, 0, 0);
        const endObj = new Date(leaveEndDate);
        endObj.setHours(23, 59, 59, 999);

        if (startObj > endObj) {
            alert("Start date cannot be after end date.");
            return;
        }

        const targetEmployee = leaveEmployee || currentUser || "";
        if (!targetEmployee) {
            alert("Please specify an employee.");
            return;
        }

        setIsLeaveModalOpen(false);
        setIsSubmittingLeave(true);
        try {
            // 1. Log the leave range to the centralized "Leaves" sheet for login compliance
            const logParams = new URLSearchParams();
            logParams.append("action", "applyLeave");
            logParams.append("username", targetEmployee);
            logParams.append("startDate", leaveStartDate);
            logParams.append("endDate", leaveEndDate);
            logParams.append("targetSheet", leaveTargetSheet);

            await fetch("https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec", {
                method: "POST",
                body: logParams,
            });

            // 2. Update individual task rows in Checklist / DELEGATION sheets
            const startObj = new Date(leaveStartDate);
            startObj.setHours(0, 0, 0, 0);
            const endObj = new Date(leaveEndDate);
            endObj.setHours(23, 59, 59, 999);

            const todayObj = new Date();
            const todayFormatted = `${String(todayObj.getDate()).padStart(2, '0')}/${String(todayObj.getMonth() + 1).padStart(2, '0')}/${todayObj.getFullYear()}`;

            const sheetsToUpdate = [];
            if (leaveTargetSheet === "both" || leaveTargetSheet === "Checklist") {
                sheetsToUpdate.push("Checklist");
            }
            if (leaveTargetSheet === "both" || leaveTargetSheet === "DELEGATION") {
                sheetsToUpdate.push("DELEGATION");
            }

            let totalTasksUpdatedCount = 0;

            for (const currentSheetName of sheetsToUpdate) {
                const spreadsheetId = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0";
                const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(currentSheetName)}&t=${Date.now()}`;
                const response = await fetch(sheetUrl);
                if (!response.ok) continue;
                const text = await response.text();
                let data;
                const jsonStart = text.indexOf("{");
                const jsonEnd = text.lastIndexOf("}");
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
                } else {
                    continue;
                }

                let rows = [];
                if (data.table && data.table.rows) {
                    rows = data.table.rows;
                }

                const tasksToUpdate = [];

                rows.forEach((row, rowIndex) => {
                    if (rowIndex === 0) return;
                    let rowValues = [];
                    if (row.c) {
                        rowValues = row.c.map(cell => (cell && cell.v !== undefined ? cell.v : ""));
                    }

                    const assignedTo = rowValues[4] || "Unassigned";
                    const isUserMatch = assignedTo.toLowerCase() === targetEmployee.toLowerCase();

                    if (isUserMatch) {
                        const colG = rowValues[6];
                        const dateValStr = colG ? String(colG).trim() : "";
                        let formattedDate = dateValStr;
                        if (dateValStr.startsWith("Date(")) {
                            const match = /Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/.exec(dateValStr);
                            if (match) {
                                formattedDate = `${match[3].padStart(2, '0')}/${(parseInt(match[2], 10) + 1).toString().padStart(2, '0')}/${match[1]}`;
                            }
                        }
                        const parts = formattedDate.split('/');
                        const taskDate = parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : null;

                        if (taskDate && taskDate >= startObj && taskDate <= endObj) {
                            const taskId = rowValues[1];
                            if (taskId) {
                                const rowDataPayload = Array(17).fill("");
                                rowDataPayload[10] = todayFormatted; // Column K (Actual Completion Date)
                                rowDataPayload[12] = "Leave";          // Column M (Status / Delay)
                                rowDataPayload[16] = "Leave";          // Column Q (Leave Status)

                                tasksToUpdate.push({
                                    rowIndex: rowIndex + 1,
                                    taskId: taskId,
                                    rowData: rowDataPayload
                                });
                            }
                        }
                    }
                });

                if (tasksToUpdate.length > 0) {
                    const updatePromises = tasksToUpdate.map(async (task) => {
                        const formData = new FormData();
                        formData.append("sheetName", currentSheetName);
                        formData.append("action", "update");
                        formData.append("rowIndex", task.rowIndex);
                        formData.append("rowData", JSON.stringify(task.rowData));

                        const res = await fetch("https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec", {
                            method: "POST",
                            body: formData,
                        });
                        return res.json();
                    });

                    const results = await Promise.all(updatePromises);
                    const failures = results.filter(r => !r.success);

                    if (failures.length === 0) {
                        totalTasksUpdatedCount += tasksToUpdate.length;
                    }
                }
            }

            alert(`Successfully marked leave and updated ${totalTasksUpdatedCount} tasks!`);
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error("Error submitting Leave:", error);
            alert("Error occurred during Leave submission. Please try again.");
        } finally {
            setIsSubmittingLeave(false);
        }
    };

    const fetchChecklistData = useCallback(async () => {
        if (!currentUser || userLoading) return;

        try {
            setLoading(true);

            // Fetch from Checklist sheet
            const checklistUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${CONFIG.CHECKLIST_SHEET}&t=${Date.now()}`;
            const response = await fetch(checklistUrl);
            const text = await response.text();

            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}') + 1;
            const jsonData = text.substring(jsonStart, jsonEnd);
            const data = JSON.parse(jsonData);

            if (data?.table?.rows) {
                const rows = data.table.rows.slice(1); // Skip header

                // Map columns according to your specification (C-J from Checklist sheet)
                const transformedData = rows.map((row, rowIndex) => {
                    const baseData = {
                        _id: `checklist_${rowIndex}_${Math.random().toString(36).substring(2, 15)}`,
                        _rowIndex: rowIndex + 2,
                        // Mapping columns C-J from Checklist sheet
                        Department: row.c[2]?.v || "",          // Column C - Department
                        'Given By': row.c[3]?.v || "",          // Column D - Given By
                        Name: row.c[4]?.v || "",                // Column E - Name
                        'Task Description': row.c[5]?.v || "",  // Column F - Task Description
                        'Start Date': formatDate(row.c[6]?.v), // Column G - Start Date
                        Frequency: row.c[7]?.v || "",           // Column H - Frequency
                        Reminders: row.c[8]?.v || "",           // Column I - Reminders
                        Attachment: row.c[9]?.v || "",          // Column J - Attachment
                        Task: 'Checklist'
                    };
                    return baseData;
                }).filter(item => {
                    // Filter out rows where both Name and Task Description are empty
                    return item.Name && item['Task Description'];
                });

                console.log(`Total checklist tasks before uniqueness filter:`, transformedData.length);

                // Create unique tasks based on Name + Task Description combination
                const uniqueTasksMap = new Map();
                transformedData.forEach(task => {
                    const key = `${task.Name?.toLowerCase().trim()}_${task['Task Description']?.toLowerCase().trim()}`;
                    if (!uniqueTasksMap.has(key)) {
                        uniqueTasksMap.set(key, task);
                    }
                });

                const uniqueTasks = Array.from(uniqueTasksMap.values());
                console.log(`Unique tasks after filtering:`, uniqueTasks.length);
                console.log("User role:", userRole, "Current user:", currentUser);

                // Apply role-based filtering
                let filteredData;
                if (userRole === 'admin') {
                    // Admin sees all unique tasks except for inactive users
                    filteredData = uniqueTasks.filter(item => {
                        const itemName = (item.Name || '').toString().toLowerCase().trim();
                        return !inactiveUsers.has(itemName);
                    });
                    console.log("Admin access: showing all unique checklist tasks (excluding inactive users)");
                } else {
                    // Regular user sees only their tasks (where Name matches current user)
                    filteredData = uniqueTasks.filter(item => {
                        const itemName = (item.Name || '').toString().toLowerCase().trim();
                        const currentUserLower = currentUser.toLowerCase().trim();

                        return itemName === currentUserLower;
                    });
                    console.log(`User access: filtered checklist tasks for ${currentUser}:`, filteredData.length);
                }

                setTasks(filteredData);
            } else {
                throw new Error("Invalid checklist data format");
            }
        } catch (err) {
            console.error("Checklist fetch error:", err);
            setError(err.message || "Failed to load checklist data");
        } finally {
            setLoading(false);
        }
    }, [currentUser, userRole, userLoading]);

    const fetchDelegationData = useCallback(async () => {
        if (!currentUser || userLoading) return;

        try {
            setDelegationLoading(true);

            // Fetch from Delegation sheet
            const delegationUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${CONFIG.DELEGATION_SHEET}&t=${Date.now()}`;
            const response = await fetch(delegationUrl);
            const text = await response.text();

            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}') + 1;
            const jsonData = text.substring(jsonStart, jsonEnd);
            const data = JSON.parse(jsonData);

            if (data?.table?.rows) {
                const rows = data.table.rows.slice(1); // Skip header
                const transformedData = rows.map((row, rowIndex) => {
                    const baseData = {
                        _id: `delegation_${rowIndex}_${Math.random().toString(36).substring(2, 15)}`,
                        _rowIndex: rowIndex + 2,
                        // Map columns from Delegation sheet (keep existing mapping)
                        Timestamp: formatDate(row.c[0]?.v),
                        'Task ID': row.c[1]?.v || "",
                        Department: row.c[2]?.v || "",
                        'Given By': row.c[3]?.v || "",
                        Name: row.c[4]?.v || "",
                        'Task Description': row.c[5]?.v || "",
                        'Task Start Date': formatDate(row.c[6]?.v),
                        Freq: row.c[7]?.v || "",
                        'Enable Reminders': row.c[8]?.v || "",
                        'Require Attachment': row.c[9]?.v || "",
                    };
                    return baseData;
                });

                console.log(`Total delegation tasks:`, transformedData.length);

                // Apply role-based filtering (unchanged from original)
                let filteredData;
                if (userRole === 'admin') {
                    // Admin sees all tasks except for inactive users
                    filteredData = transformedData.filter(item => {
                        const itemName = (item.Name || '').toString().toLowerCase().trim();
                        return !inactiveUsers.has(itemName);
                    });
                    console.log("Admin access: showing all delegation tasks (excluding inactive users)");
                } else {
                    // Regular user sees only their tasks
                    filteredData = transformedData.filter(item => {
                        const itemName = (item.Name || '').toString().toLowerCase().trim();
                        const itemGivenBy = (item['Given By'] || '').toString().toLowerCase().trim();
                        const currentUserLower = currentUser.toLowerCase().trim();

                        const isAssignedToUser = itemName === currentUserLower;
                        const isGivenByUser = itemGivenBy === currentUserLower;

                        return isAssignedToUser || isGivenByUser;
                    });
                    console.log(`User access: filtered delegation tasks for ${currentUser}:`, filteredData.length);
                }

                setDelegationTasks(filteredData);
            } else {
                throw new Error("Invalid delegation data format");
            }
        } catch (err) {
            console.error("Delegation fetch error:", err);
            setError(err.message || "Failed to load delegation data");
        } finally {
            setDelegationLoading(false);
        }
    }, [currentUser, userRole, userLoading]);

    const formatDate = (dateValue) => {
        if (!dateValue) return "";
        try {
            // Handle Google Sheets date format like "Date(2025,6,4)"
            if (typeof dateValue === 'string' && dateValue.startsWith('Date(')) {
                const match = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/);
                if (match) {
                    const year = parseInt(match[1]);
                    const month = parseInt(match[2]); // Note: Google Sheets month is 0-based like JS
                    const day = parseInt(match[3]);
                    const date = new Date(year, month, day);
                    return format(date, 'dd/MM/yyyy');
                }
            }

            // Handle regular date objects/strings
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return format(date, 'dd/MM/yyyy');
            }

            return dateValue;
        } catch {
            return dateValue;
        }
    };

    const requestSort = (key) => {
        if (loading) return;
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleDropdown = (dropdown) => {
        setDropdownOpen(prev => ({
            ...prev,
            [dropdown]: !prev[dropdown]
        }));
    };

    const handleNameFilterSelect = (name) => {
        setNameFilter(name);
        setDropdownOpen({ ...dropdownOpen, name: false });
    };

    const handleFrequencyFilterSelect = (freq) => {
        setFreqFilter(freq);
        setDropdownOpen({ ...dropdownOpen, frequency: false });
    };

    const clearNameFilter = () => {
        setNameFilter('');
        setDropdownOpen({ ...dropdownOpen, name: false });
    };

    const clearFrequencyFilter = () => {
        setFreqFilter('');
        setDropdownOpen({ ...dropdownOpen, frequency: false });
    };

    // Get filter options based on active tab
    const getFilterOptions = () => {
        const currentTasks = activeTab === 'checklist' ? tasks : delegationTasks;

        const names = [...new Set(currentTasks.map(task => task.Name))]
            .filter(name => name && typeof name === 'string' && name.trim() !== '');

        // For checklist, use 'Frequency' field, for delegation use 'Freq'
        const frequencies = activeTab === 'checklist'
            ? [...new Set(currentTasks.map(task => task.Frequency))]
                .filter(freq => freq && typeof freq === 'string' && freq.trim() !== '')
            : [...new Set(currentTasks.map(task => task.Freq))]
                .filter(freq => freq && typeof freq === 'string' && freq.trim() !== '');

        return { names, frequencies };
    };

    const { names: currentNames, frequencies: currentFrequencies } = getFilterOptions();

    // Reset filters when changing tabs
    useEffect(() => {
        setNameFilter('');
        setFreqFilter('');
        setDropdownOpen({ name: false, frequency: false });
    }, [activeTab]);

    const filteredChecklistTasks = tasks.filter(task => {
        const nameFilterPass = !nameFilter || task.Name === nameFilter;
        const freqFilterPass = !freqFilter || task.Frequency === freqFilter;
        const searchTermPass = Object.values(task).some(
            value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
        return nameFilterPass && freqFilterPass && searchTermPass;
    }).sort((a, b) => {
        if (!sortConfig.key) return 0;
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Auto-detect user on component mount
    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    // Fetch task data when user is loaded
    useEffect(() => {
        if (currentUser && userRole && !userLoading) {
            console.log("Fetching data for user:", currentUser, "with role:", userRole);
            fetchChecklistData();
            fetchDelegationData();
        }
    }, [fetchChecklistData, fetchDelegationData, currentUser, userRole, userLoading]);

    // Show error if user not found or not logged in
    if (error) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border border-red-200">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
                            <p className="text-sm text-gray-600 mb-4">{error}</p>
                            <button
                                onClick={() => window.location.href = '/login'}
                                className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                            >
                                Go to Login
                            </button>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const isAnyLoading = userLoading || loading || delegationLoading;

    return (
      <AdminLayout>
        <div className="relative min-h-[500px]">
          {isAnyLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 rounded-2xl">
              <div className="sticky top-[150px] h-[60vh] w-full flex flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center justify-center space-y-4 max-w-xs w-full text-center">
                  <div className="relative flex items-center justify-center">
                    <svg className="animate-spin h-12 w-12 text-[#9333EA]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="spinner-grad-quick" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#9333EA" />
                          <stop offset="100%" stopColor="#DB2777" />
                        </linearGradient>
                      </defs>
                      <circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-90" fill="url(#spinner-grad-quick)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-slate-800 text-sm font-semibold tracking-wide animate-pulse">
                      {funnyMsg}
                    </p>
                    <p className="text-[10px] uppercase font-black tracking-widest bg-gradient-to-r from-[#9333EA] to-[#DB2777] bg-clip-text text-transparent">
                      Loading Quick Tasks...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="sticky top-0 z-30 bg-white pb-4 border-b border-gray-200">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-purple-700 pl-3">
                {CONFIG.PAGE_CONFIG.title}
              </h1>
              <p className="text-purple-600 text-sm pl-3">
                {currentUser && `Welcome ${currentUser}`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
              <div className="flex border border-purple-200 rounded-md overflow-hidden self-start">
                <button
                  className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                    activeTab === "checklist"
                      ? "bg-purple-600 text-white"
                      : "bg-white text-purple-600 hover:bg-purple-50"
                  }`}
                  onClick={() => setActiveTab("checklist")}
                >
                  Checklist
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                    activeTab === "delegation"
                      ? "bg-purple-600 text-white"
                      : "bg-white text-purple-600 hover:bg-purple-50"
                  }`}
                  onClick={() => setActiveTab("delegation")}
                >
                  Delegation
                </button>
              </div>

              <button
                onClick={handleLeaveSubmit}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-md transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Apply Leave
              </button>

              <div className="relative flex-1 min-w-[200px]">
                <Search
                  className="absolute left-3 top-7 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading || delegationLoading}
                />
              </div>

              <div className="flex gap-2">
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown("name")}
                    className="flex items-center gap-2 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Filter className="h-4 w-4" />
                    {nameFilter || "Filter by Name"}
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        dropdownOpen.name ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {dropdownOpen.name && (
                    <div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto">
                      <div className="py-1">
                        <button
                          onClick={clearNameFilter}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            !nameFilter
                              ? "bg-purple-100 text-purple-900"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          All Names
                        </button>
                        {currentNames.map((name) => (
                          <button
                            key={name}
                            onClick={() => handleNameFilterSelect(name)}
                            className={`block w-full text-left px-4 py-2 text-sm ${
                              nameFilter === name
                                ? "bg-purple-100 text-purple-900"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => toggleDropdown("frequency")}
                    className="flex items-center gap-2 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Filter className="h-4 w-4" />
                    {freqFilter || "Filter by Frequency"}
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        dropdownOpen.frequency ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {dropdownOpen.frequency && (
                    <div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto">
                      <div className="py-1">
                        <button
                          onClick={clearFrequencyFilter}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            !freqFilter
                              ? "bg-purple-100 text-purple-900"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          All Frequencies
                        </button>
                        {currentFrequencies.map((freq) => (
                          <button
                            key={freq}
                            onClick={() => handleFrequencyFilterSelect(freq)}
                            className={`block w-full text-left px-4 py-2 text-sm ${
                              freqFilter === freq
                                ? "bg-purple-100 text-purple-900"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {currentUser && (
          <>
            {activeTab === "checklist" ? (
              <div className="mt-4 rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                  <h2 className="text-purple-700 font-medium">
                    {userRole === "admin"
                      ? "All Unique Tasks"
                      : "My Unique Tasks"}
                  </h2>
                  <p className="text-purple-600 text-sm">
                    {userRole === "admin"
                      ? "Showing all unique tasks from checklist"
                      : CONFIG.PAGE_CONFIG.description}
                  </p>
                </div>

                <div
                  className="overflow-x-auto"
                  style={{ maxHeight: "calc(100vh - 220px)" }}
                >
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-20">
                      <tr>
                        {[
                          { key: "Department", label: "Department" },
                          { key: "Given By", label: "Given By" },
                          { key: "Name", label: "Name" },
                          {
                            key: "Task Description",
                            label: "Task Description",
                            minWidth: "min-w-[300px]",
                          },
                          {
                            key: "Start Date",
                            label: "Start Date",
                            bg: "bg-yellow-50",
                          },
                          { key: "Frequency", label: "Frequency" },
                          { key: "Reminders", label: "Reminders" },
                          { key: "Attachment", label: "Attachment" },
                        ].map((column) => (
                          <th
                            key={column.label}
                            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                              column.bg || ""
                            } ${column.minWidth || ""} ${
                              column.key
                                ? "cursor-pointer hover:bg-gray-100"
                                : ""
                            }`}
                            onClick={() =>
                              column.key && requestSort(column.key)
                            }
                          >
                            <div className="flex items-center">
                              {column.label}
                              {sortConfig.key === column.key && (
                                <span className="ml-1">
                                  {sortConfig.direction === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredChecklistTasks.length > 0 ? (
                        filteredChecklistTasks.map((task) => (
                          <tr key={task._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {task.Department || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {task["Given By"] || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {task.Name || "—"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 min-w-[300px] max-w-[400px]">
                              <div className="whitespace-normal break-words">
                                {task["Task Description"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 bg-yellow-50">
                              {task["Start Date"] || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  task.Frequency === "Daily"
                                    ? "bg-blue-100 text-blue-800"
                                    : task.Frequency === "Weekly"
                                    ? "bg-green-100 text-green-800"
                                    : task.Frequency === "Monthly"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {task.Frequency || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {task.Reminders || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {task.Attachment || "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-4 text-center text-gray-500"
                          >
                            {searchTerm || nameFilter || freqFilter
                              ? "No tasks matching your filters"
                              : userRole === "admin"
                              ? "No unique tasks available"
                              : "No unique tasks assigned to you"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <DelegationPage
                searchTerm={searchTerm}
                nameFilter={nameFilter}
                freqFilter={freqFilter}
                setNameFilter={setNameFilter}
                setFreqFilter={setFreqFilter}
                currentUser={currentUser}
                userRole={userRole}
                CONFIG={CONFIG}
                delegationTasks={delegationTasks}
                delegationLoading={delegationLoading}
                loading={delegationLoading}
              />
            )}
          </>
        )}

        {isLeaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4 font-sans">Apply Leave & Clear Penalty</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Applying Leave For</label>
                <input
                  type="text"
                  value={currentUser ? currentUser : ''}
                  disabled={true}
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Apply Leave To</label>
                <select
                  value={leaveTargetSheet}
                  onChange={(e) => setLeaveTargetSheet(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-800"
                >
                  <option value="both">Both (Checklist & Delegation)</option>
                  <option value="Checklist">Checklist Only</option>
                  <option value="DELEGATION">Delegation Only</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-bold text-xs"
                  disabled={isSubmittingLeave}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeaveSubmit}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors font-bold text-xs"
                  disabled={isSubmittingLeave}
                >
                  {isSubmittingLeave ? "Submitting..." : "Confirm Leave"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </AdminLayout>
    );
}