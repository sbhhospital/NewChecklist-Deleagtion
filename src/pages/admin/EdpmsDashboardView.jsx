"use client"

import { useState, useMemo, useRef, useEffect, useDeferredValue } from "react"
import {
  TrendingUp,
  AlertTriangle,
  Award,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Users,
  Search,
  Download,
  Calendar,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
  CalendarDays,
  User,
  History,
  CheckSquare,
  Lock,
  ChevronRight,
  X
} from "lucide-react"
import Papa from "papaparse"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

const parseDateFromDDMMYYYY = (dateStr) => {
  if (!dateStr) return null
  if (dateStr instanceof Date) return dateStr
  const str = String(dateStr).trim()
  if (str.includes("/")) {
    const parts = str.split("/")
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      }
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
    }
  } else if (str.includes("-")) {
    const parts = str.split("-")
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      }
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
    }
  }
  const parsed = Date.parse(str)
  if (!isNaN(parsed)) {
    return new Date(parsed)
  }
  return null
}

const getTierBadge = (tier) => {
  switch (tier) {
    case "Platinum":
      return "bg-gradient-to-r from-slate-200 to-indigo-100 text-indigo-950 border border-indigo-200 font-extrabold"
    case "Gold":
      return "bg-amber-100 text-amber-900 border border-amber-200 font-bold"
    case "Silver":
      return "bg-slate-100 text-slate-900 border border-slate-200 font-semibold"
    case "Bronze":
      return "bg-orange-100 text-orange-900 border border-orange-200 font-semibold"
    case "Needs Improvement":
      return "bg-red-100 text-red-950 border border-red-200 font-semibold"
    default:
      return "bg-red-200 text-red-900 border border-red-300 font-extrabold animate-pulse"
  }
}

const insightRecommendation = (level) => {
  if (level === "Critical" || level === "High") {
    return "Immediate workload redistribution suggested. Delay penalty risk."
  }
  if (level === "Medium") {
    return "Monitor closely. Extensions have reached warning thresholds."
  }
  return "Workload balanced. Suitable for high priority deliverables."
}

const getWeekNumber = (d) => {
  const tempDate = new Date(d.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

// ================================================================
// CHECKLIST SCORING SYSTEM — Frequency-Based with Grace Period
// ================================================================
// Points per frequency  | Grace margin | Day1 | Day2 | Day3 (=overdue threshold)
//   Daily      = 10 pts | 0 days       | N/A  | N/A  | N/A  (miss = -10 immediately)
//   Weekly     =  5 pts | 3 days       |  -1  |  -3  |  -5
//   Fortnightly= 10 pts | 3 days       |  -2  |  -7  | -10
//   Monthly    = 20 pts | 3 days       |  -5  | -15  | -20
//   Quarterly  = 20 pts | 3 days       |  -5  | -15  | -20
//   Half-yearly= 20 pts | 3 days       |  -5  | -15  | -20
//   Yearly     = 20 pts | 3 days       |  -5  | -15  | -20
// Login missed = -10 pts per day
// ================================================================

const getChecklistFrequencyConfig = (freq) => {
  const f = String(freq || "daily").toLowerCase().trim();
  if (f === "daily") {
    return { points: 10, marginDays: 0, delayPenalties: [10, 10, 10], label: "Daily" };
  }
  if (f === "weekly") {
    return { points: 5, marginDays: 3, delayPenalties: [1, 3, 5], label: "Weekly" };
  }
  if (f === "fortnightly" || f === "bi-weekly" || f === "biweekly") {
    return { points: 10, marginDays: 3, delayPenalties: [2, 7, 10], label: "Fortnightly" };
  }
  // Monthly, Quarterly, Half-yearly, Yearly, Bi-monthly, 6-monthly → 20 pts
  return { points: 20, marginDays: 3, delayPenalties: [5, 15, 20], label: f.charAt(0).toUpperCase() + f.slice(1) };
};

// Derive the group's natural due/end date from task dueDate or computed from period
const getGroupDueDate = (group) => {
  // Prefer max dueDate from tasks
  let maxDue = null;
  group.tasks.forEach(t => {
    if (t.dueDate) {
      const d = parseDateFromDDMMYYYY(t.dueDate);
      if (d) {
        const dc = new Date(d); dc.setHours(0,0,0,0);
        if (!maxDue || dc > maxDue) maxDue = dc;
      }
    }
  });
  if (maxDue) return maxDue;

  // Fallback: derive from taskStartDate + frequency
  const s = parseDateFromDDMMYYYY(group.date);
  if (!s) return null;
  s.setHours(0,0,0,0);
  const f = String(group.frequency || "daily").toLowerCase().trim();
  if (f === "daily") return s;
  if (f === "weekly") {
    const dow = s.getDay();
    const toSat = dow === 0 ? 6 : 6 - dow;
    const end = new Date(s); end.setDate(s.getDate() + toSat); return end;
  }
  if (f === "fortnightly" || f === "bi-weekly" || f === "biweekly") {
    if (s.getDate() <= 15) return new Date(s.getFullYear(), s.getMonth(), 15);
    return new Date(s.getFullYear(), s.getMonth() + 1, 0);
  }
  if (f === "monthly") return new Date(s.getFullYear(), s.getMonth() + 1, 0);
  if (f === "quarterly") {
    const qEnd = (Math.floor(s.getMonth() / 3) + 1) * 3;
    return new Date(s.getFullYear(), qEnd, 0);
  }
  if (f.includes("half") || f.includes("6") || f.includes("six")) {
    const hEnd = s.getMonth() < 6 ? 6 : 12;
    return new Date(s.getFullYear(), hEnd, 0);
  }
  if (f === "yearly") return new Date(s.getFullYear(), 11, 31);
  return s;
};

// Check if a task is currently in the 1-3 day grace/margin window (for blink effect)
const isTaskInMarginPeriod = (task) => {
  if (!task || !task.dueDate) return false;
  const f = String(task.frequency || "daily").toLowerCase();
  if (f === "daily") return false; // no margin for daily
  if (task.status === "completed" || task.status === "overdue") return false;
  const due = parseDateFromDDMMYYYY(task.dueDate);
  if (!due) return false;
  due.setHours(0,0,0,0);
  const tod = new Date(); tod.setHours(0,0,0,0);
  const days = Math.floor((tod.getTime() - due.getTime()) / 86400000);
  return days >= 1 && days <= 3;
};

// Score a single period group — returns { penalty, status, delayDays }
const scoreChecklistGroup = (group, today) => {
  const config = getChecklistFrequencyConfig(group.frequency);
  const dueDate = getGroupDueDate(group);
  if (!dueDate) return { penalty: 0, status: "unknown", delayDays: 0, config };

  const msPerDay = 86400000;
  const allCompleted = group.tasks.every(t => t.status === "completed");
  const allOverdue   = group.tasks.every(t => t.status === "overdue");

  const effectiveDueDate = new Date(dueDate);
  const cutoffDate = new Date(2026, 6, 29);
  cutoffDate.setHours(0, 0, 0, 0);

  // If the original due date is before the cutoff, completely excuse it (no penalties, no delays)
  if (effectiveDueDate < cutoffDate) {
    return { penalty: 0, status: "excused", delayDays: 0, config };
  }

  const daysAfterDue = Math.max(0, Math.floor((today.getTime() - effectiveDueDate.getTime()) / msPerDay));

  if (allCompleted) {
    // Use max delayDays recorded on the tasks at time of completion
    const maxDelay = Math.max(0, ...group.tasks.map(t => Number(t.delayDays) || 0));
    if (maxDelay === 0) {
      return { penalty: 0, status: "completed_ontime", delayDays: 0, config };
    }
    if (config.marginDays > 0 && maxDelay <= config.marginDays) {
      const idx = Math.min(maxDelay - 1, 2);
      return { penalty: config.delayPenalties[idx], status: `completed_delay${maxDelay}`, delayDays: maxDelay, config };
    }
    // Completed but past margin
    return { penalty: config.points, status: "completed_late", delayDays: maxDelay, config };
  }

  // Not yet completed
  if (daysAfterDue === 0) {
    return { penalty: 0, status: "pending", delayDays: 0, config }; // still within period
  }

  // Daily has no margin — immediate full penalty
  if (config.marginDays === 0 || allOverdue || daysAfterDue > config.marginDays) {
    return { penalty: config.points, status: "overdue", delayDays: daysAfterDue, config };
  }

  // Within 1-3 day grace window — pending with progressive penalty + blink
  const idx = Math.min(daysAfterDue - 1, 2);
  return { penalty: config.delayPenalties[idx], status: `pending_delay${daysAfterDue}`, delayDays: daysAfterDue, config };
};

// Build period groups from a flat tasks array
const buildChecklistGroups = (tasks, userKey) => {
  const groups = {};
  tasks.forEach(t => {
    if (!t.taskStartDate || !t.assignedTo) return;
    const dateStr = t.taskStartDate;
    const user = t.assignedTo.toLowerCase().trim();
    if (userKey && user !== userKey) return;
    const dateObj = parseDateFromDDMMYYYY(dateStr);
    if (!dateObj) return;
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();
    const weekNumber = getWeekNumber(dateObj);
    const freq = String(t.frequency || "daily").toLowerCase().trim();
    let periodKey = "";
    let periodLabel = "";
    if (freq === "daily") {
      periodKey = `daily_${dateStr}`;
      periodLabel = `Daily (${dateStr})`;
    } else if (freq === "weekly") {
      periodKey = `weekly_${year}_w${weekNumber}`;
      periodLabel = `Weekly (Week ${weekNumber}, ${year})`;
    } else if (freq === "fortnightly" || freq === "bi-weekly" || freq === "biweekly") {
      const fn = day <= 15 ? 1 : 2;
      periodKey = `fortnightly_${year}_m${month}_f${fn}`;
      periodLabel = `Fortnightly (${fn === 1 ? "1st–15th" : "16th–End"}, ${month+1}/${year})`;
    } else if (freq === "monthly") {
      periodKey = `monthly_${year}_m${month}`;
      periodLabel = `Monthly (${month+1}/${year})`;
    } else if (freq === "quarterly") {
      const q = Math.floor(month / 3) + 1;
      periodKey = `quarterly_${year}_q${q}`;
      periodLabel = `Quarterly (Q${q}, ${year})`;
    } else if (freq === "yearly") {
      periodKey = `yearly_${year}`;
      periodLabel = `Yearly (${year})`;
    } else {
      periodKey = `${freq.replace(/\s+/g,'_')}_${year}_m${month}`;
      periodLabel = `${t.frequency || freq} (${month+1}/${year})`;
    }
    const key = userKey ? `${periodKey}` : `${user}_${periodKey}`;
    if (!groups[key]) {
      groups[key] = { user, originalUser: t.assignedTo, date: dateStr, periodLabel, frequency: t.frequency || "Daily", tasks: [] };
    }
    groups[key].tasks.push(t);
  });
  return groups;
};

const calculateChecklistPenalties = (tasks) => {
  const groups = buildChecklistGroups(tasks);
  let totalPenalties = 0;
  let missedDays = 0;
  let completedDays = 0;
  let delayedDays = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const missedDates = [];

  Object.values(groups).forEach(group => {
    const dueDate = getGroupDueDate(group);
    if (!dueDate) return;
    // Skip groups whose period hasn't started yet (dueDate strictly in future)
    if (dueDate > today && !(group.tasks.some(t => t.status === "overdue"))) return;
    const scored = scoreChecklistGroup(group, today);
    totalPenalties += scored.penalty;
    const s = scored.status;
    if (s === "completed_ontime") {
      completedDays++;
      missedDates.push({ date: group.date, reason: `✅ ${group.frequency} Completed On Time — ${group.periodLabel} (${group.tasks.length} tasks)`, deducted: 0 });
    } else if (s.startsWith("completed_delay")) {
      delayedDays++;
      missedDates.push({ date: group.date, reason: `⏱ ${group.frequency} Completed ${scored.delayDays} Day${scored.delayDays>1?"s":""} Late — ${group.periodLabel} (-${scored.penalty} pts)`, deducted: scored.penalty });
    } else if (s === "completed_late" || s === "overdue") {
      missedDays++;
      missedDates.push({ date: group.date, reason: `❌ ${group.frequency} Missed/Overdue — ${group.periodLabel} (-${scored.penalty} pts)`, deducted: scored.penalty });
    } else if (s.startsWith("pending_delay")) {
      delayedDays++;
      missedDates.push({ date: group.date, reason: `⚠️ ${group.frequency} Pending — ${scored.delayDays} Day${scored.delayDays>1?"s":""} Grace Period — ${group.periodLabel} (-${scored.penalty} pts so far)`, deducted: scored.penalty });
    }
  });

  return { totalPenalties, totalBonuses: 0, missedDays, completedDays, delayedDays, missedDates };
};

const calculateAllUsersChecklistStats = (tasks) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const userResults = {};
  // Build all groups across all users
  const allGroups = buildChecklistGroups(tasks);

  Object.values(allGroups).forEach(group => {
    const user = group.user;
    const dueDate = getGroupDueDate(group);
    if (!dueDate) return;
    if (dueDate > today && !(group.tasks.some(t => t.status === "overdue"))) return;
    if (!userResults[user]) {
      userResults[user] = { totalPenalties: 0, totalBonuses: 0, missedDays: 0, completedDays: 0, delayedDays: 0, missedDates: [] };
    }
    const scored = scoreChecklistGroup(group, today);
    userResults[user].totalPenalties += scored.penalty;
    const s = scored.status;
    if (s === "completed_ontime") {
      userResults[user].completedDays++;
      userResults[user].missedDates.push({ date: group.date, reason: `✅ ${group.frequency} Completed On Time — ${group.periodLabel} (${group.tasks.length} tasks)`, deducted: 0 });
    } else if (s.startsWith("completed_delay")) {
      userResults[user].delayedDays = (userResults[user].delayedDays || 0) + 1;
      userResults[user].missedDates.push({ date: group.date, reason: `⏱ ${group.frequency} Completed ${scored.delayDays} Day${scored.delayDays>1?"s":""} Late — ${group.periodLabel} (-${scored.penalty} pts)`, deducted: scored.penalty });
    } else if (s === "completed_late" || s === "overdue") {
      userResults[user].missedDays++;
      userResults[user].missedDates.push({ date: group.date, reason: `❌ ${group.frequency} Missed/Overdue — ${group.periodLabel} (-${scored.penalty} pts)`, deducted: scored.penalty });
    } else if (s.startsWith("pending_delay")) {
      userResults[user].delayedDays = (userResults[user].delayedDays || 0) + 1;
      userResults[user].missedDates.push({ date: group.date, reason: `⚠️ ${group.frequency} Pending — ${scored.delayDays} Day${scored.delayDays>1?"s":""} Grace — ${group.periodLabel} (-${scored.penalty} pts so far)`, deducted: scored.penalty });
    }
  });
  return userResults;
};

export default function EdpmsDashboardView({
  allTasks = [],
  staffMembers = [],
  isAdmin = true,
  currentUsername = "",
  departmentOptions = [],
  doerOptions = [],
  activeSource = "delegation",
  setActiveSource = () => {},
  loginHistory = [],
  pointDeductions = [],
  tabLoading = false,
  inactiveUsers = []
}) {
  const [selectedStaffName, setSelectedStaffName] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)
  const [showDownloadAlert, setShowDownloadAlert] = useState(false)
  const [timeRange, setTimeRange] = useState("overall") // overall, yearly, quarterly, monthly, weekly, daily, custom
  const [filterDept, setFilterDept] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [checklistFrequencyFilter, setChecklistFrequencyFilter] = useState("all") // all, daily, weekly, monthly, other
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [staffSearchText, setStaffSearchText] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [deptSearchText, setDeptSearchText] = useState("")

  const [funnyMsg, setFunnyMsg] = useState("🏥 Updating SBH Group of Hospitals analytics...")
  useEffect(() => {
    if (!tabLoading) return
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
    let idx = 0
    const timer = setInterval(() => {
      idx = (idx + 1) % messages.length
      setFunnyMsg(messages[idx])
    }, 2500)
    return () => clearInterval(timer)
  }, [tabLoading])
  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false)

  const activeDoerOptions = useMemo(() => {
    return doerOptions.filter(doer => !inactiveUsers.some(name => name.toLowerCase() === doer.toLowerCase()))
  }, [doerOptions, inactiveUsers])

  const employeeRef = useRef(null)
  const deptRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (employeeRef.current && !employeeRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
      if (deptRef.current && !deptRef.current.contains(e.target)) {
        setShowDeptSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("touchstart", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("touchstart", handleOutsideClick)
    }
  }, [])

  // Custom Calendar date range pickers
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  // Deferred values: date picker updates instantly; expensive useMemo recomputes asynchronously
  const deferredCustomStartDate = useDeferredValue(customStartDate)
  const deferredCustomEndDate = useDeferredValue(customEndDate)

  // Custom Month/Year selectors
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()) // e.g. 2026

  // Deferred values: selections update instantly; expensive useMemo recomputes asynchronously
  const deferredTimeRange = useDeferredValue(timeRange)
  const deferredSelectedMonth = useDeferredValue(selectedMonth)
  const deferredSelectedYear = useDeferredValue(selectedYear)

  // Mock department mapping for users (fallback if master sheet departments are empty)
  const getDepartment = (name) => {
    const n = name.toLowerCase()
    if (n.includes("account") || n.includes("billing") || n.includes("delegation")) return "Accounts & Billing"
    if (n.includes("purchase") || n.includes("store")) return "Purchase & Logistics"
    if (n.includes("service") || n.includes("maintenance")) return "Biomedical & Services"
    if (n.includes("jockey") || n.includes("coordinator")) return "Operations Coordination"
    if (n.includes("managing") || n.includes("director") || n.includes("coo") || n.includes("naman")) return "Administration & Management"
    return "Clinical & Nursing Support"
  }

  // Helper to calculate previous week's Monday to Saturday range (last completed week)
  const getLastWeekMonToSatRange = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const currentDay = today.getDay() // 0: Sun, 1: Mon, ..., 6: Sat
    
    // Find days to subtract to reach the previous Monday
    let daysSinceMonday = currentDay - 1
    if (daysSinceMonday < 0) {
      daysSinceMonday = 6 // Sunday is 6 days after Monday
    }
    
    // Previous Monday is current Monday minus 7 days
    const lastMonday = new Date(today)
    lastMonday.setDate(today.getDate() - daysSinceMonday - 7)
    
    // Previous Saturday is previous Monday plus 5 days
    const lastSaturday = new Date(lastMonday)
    lastSaturday.setDate(lastMonday.getDate() + 5)
    
    return { start: lastMonday, end: lastSaturday }
  }

  // Filter tasks based on selected employee (userwise selection) and checklist frequency filter if active
  const filteredTasksByUser = useMemo(() => {
    let tasks = allTasks
    if (selectedEmployee && selectedEmployee !== "all") {
      tasks = tasks.filter(t => t.assignedTo.toLowerCase() === selectedEmployee.toLowerCase())
    }
    if (activeSource === "checklist" && checklistFrequencyFilter && checklistFrequencyFilter !== "all") {
      tasks = tasks.filter(t => {
        const freq = String(t.frequency || "daily").toLowerCase().trim()
        if (checklistFrequencyFilter === "daily") return freq === "daily"
        if (checklistFrequencyFilter === "weekly") return freq === "weekly"
        if (checklistFrequencyFilter === "fortnightly") return freq === "fortnightly"
        if (checklistFrequencyFilter === "monthly") return freq === "monthly"
        if (checklistFrequencyFilter === "quarterly") return freq === "quarterly"
        if (checklistFrequencyFilter === "yearly") return freq === "yearly"
        return true
      })
    }
    return tasks
  }, [allTasks, selectedEmployee, activeSource, checklistFrequencyFilter])

  // Filter staff members based on selected employee and filter out inactive users
  const filteredStaffMembers = useMemo(() => {
    const activeStaff = staffMembers.filter(s => !inactiveUsers.some(name => name.toLowerCase() === s.name.toLowerCase()))
    if (selectedEmployee === "all" || !selectedEmployee) return activeStaff
    return activeStaff.filter(s => s.name.toLowerCase() === selectedEmployee.toLowerCase())
  }, [staffMembers, selectedEmployee, inactiveUsers])

  const processedStats = useMemo(() => {
    // Filter tasks by selected timeRange and date inputs
    const filteredTasks = filteredTasksByUser.filter(t => {
      const date = parseDateFromDDMMYYYY(t.taskStartDate)
      if (!date) return false

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (deferredTimeRange === "overall") {
        return true
      } else if (deferredTimeRange === "daily") {
        return date.getTime() === today.getTime()
      } else if (deferredTimeRange === "weekly") {
        // Last completed week: Monday to Saturday
        const { start, end } = getLastWeekMonToSatRange()
        return date >= start && date <= end
      } else if (deferredTimeRange === "monthly") {
        // If user selects custom month/year
        return date.getMonth() === Number(deferredSelectedMonth) && date.getFullYear() === Number(deferredSelectedYear)
      } else if (deferredTimeRange === "quarterly") {
        const currentQuarter = Math.floor(today.getMonth() / 3)
        const taskQuarter = Math.floor(date.getMonth() / 3)
        return currentQuarter === taskQuarter && date.getFullYear() === today.getFullYear()
      } else if (deferredTimeRange === "yearly") {
        return date.getFullYear() === Number(deferredSelectedYear)
      } else if (deferredTimeRange === "custom") {
        if (!deferredCustomStartDate || !deferredCustomEndDate) return true
        const startParts = deferredCustomStartDate.split("-")
        const endParts = deferredCustomEndDate.split("-")
        if (startParts.length !== 3 || endParts.length !== 3) return true
        const start = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]), 0, 0, 0, 0)
        const end = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]), 23, 59, 59, 999)
        return date >= start && date <= end
      }
      return true
    })

    // Basic task counters
    const activeTasks = filteredTasks.filter(t => t.status === "pending" || t.status === "overdue")
    const pendingTasks = filteredTasks.filter(t => t.status === "pending")
    const completedTasks = filteredTasks.filter(t => t.status === "completed")
    const overdueTasks = filteredTasks.filter(t => t.status === "overdue")
    
    // Extensions, Reopens, Penalties
    let extensionRequests = 0
    let reopenedTasks = 0
    let verifyPending = 0
    let escalatedTasks = 0
    let criticalTasks = 0

    filteredTasks.forEach(t => {
      if (t.frequency === "daily" && t.status === "overdue") {
        criticalTasks++
      }
      if (t.originalStatus === "Verify Pending") {
        verifyPending++
      }
      if (t.status === "overdue" && t.penalty > 40) {
        escalatedTasks++
      }
      if (t.extensionCount > 0) {
        extensionRequests += t.extensionCount
      }
      if (t.title.toLowerCase().includes("reopen") || (t.penalty > 50 && t.status === "pending")) {
        reopenedTasks++
      }
    })

    // SLA compliance / On-Time Completion Rate: count tasks with 0 penalty points out of all tasks in date range
    const onTimeTasksCount = filteredTasks.filter(t => t.status === "completed" && t.penalty === 0).length
    const totalFinishedTasks = filteredTasks.filter(t => t.status === "completed" || t.status === "overdue").length
    const slaCompliance = totalFinishedTasks > 0 ? Math.round((onTimeTasksCount / totalFinishedTasks) * 100) : 100

    // PRE-INDEX/GROUP DATA FOR O(1) LOOKUPS
    const tasksByUser = {}
    filteredTasks.forEach(t => {
      if (t.assignedTo) {
        const u = t.assignedTo.toLowerCase().trim()
        if (!tasksByUser[u]) tasksByUser[u] = []
        tasksByUser[u].push(t)
      }
    })

    const loginsByUser = {}
    ;(loginHistory || []).forEach(l => {
      if (l.username) {
        const u = l.username.toLowerCase().trim()
        if (!loginsByUser[u]) loginsByUser[u] = []
        loginsByUser[u].push(l)
      }
    })

    const deductionsByUser = {}
    ;(pointDeductions || []).forEach(d => {
      if (d.username) {
        const u = d.username.toLowerCase().trim()
        if (!deductionsByUser[u]) deductionsByUser[u] = []
        deductionsByUser[u].push(d)
      }
    })

    // Pre-calculate checklist stats for all users once
    const allChecklistStats = activeSource === "checklist" ? calculateAllUsersChecklistStats(filteredTasks) : {}

    // Dynamic 1000-Point Performance Score calculation for active filtered tasks
    let overallChecklistPenalties = 0
    let overallMissedChecklistDays = 0

    // Checklist scoring: pure penalty deduction from 100
    if (activeSource === "checklist") {
      Object.keys(allChecklistStats).forEach(user => {
        const res = allChecklistStats[user]
        overallChecklistPenalties += res.totalPenalties
        overallMissedChecklistDays += res.missedDays
      })
    }

    const totalPenalties = activeSource === "checklist" ? overallChecklistPenalties : filteredTasks.reduce((sum, t) => sum + (t.penalty || 0), 0)
    const totalBonuses = activeSource === "checklist"
      ? 0  // checklist: penalty-only scoring (no bonus inflation)
      : filteredTasks.filter(t => t.status === "completed" && (t.extensionCount || 0) === 0 && (t.delayDays || 0) === 0).length * 20
    const net100Score = activeSource === "checklist"
      ? Math.max(0, Math.min(100, Math.round(100 - totalPenalties)))
      : Math.max(0, Math.round(100 - totalPenalties + totalBonuses))

    // Calculate details per staff
    const staffCalculated = filteredStaffMembers.map(staff => {
      const name = staff.name
      const dept = getDepartment(name)
      const nameKey = name.toLowerCase().trim()
      const tasks = tasksByUser[nameKey] || []
      
      const completed = tasks.filter(t => t.status === "completed")
      const pending = tasks.filter(t => t.status === "pending")
      const overdue = tasks.filter(t => t.status === "overdue")
      const active = tasks.filter(t => t.status === "pending" || t.status === "overdue")

      // Frequency breakdowns
      const freqBreakdown = {
        daily: { total: 0, completed: 0, pending: 0, overdue: 0, delay: 0 },
        weekly: { total: 0, completed: 0, pending: 0, overdue: 0, delay: 0 },
        fortnightly: { total: 0, completed: 0, pending: 0, overdue: 0, delay: 0 },
        monthly: { total: 0, completed: 0, pending: 0, overdue: 0, delay: 0 },
        other: { total: 0, completed: 0, pending: 0, overdue: 0, delay: 0 }
      }

      tasks.forEach(t => {
        const freq = String(t.frequency || "daily").toLowerCase().trim()
        let cat = "other"
        if (freq === "daily") cat = "daily"
        else if (freq === "weekly") cat = "weekly"
        else if (freq === "fortnightly" || freq === "bi-weekly" || freq === "biweekly") cat = "fortnightly"
        else if (freq === "monthly") cat = "monthly"

        freqBreakdown[cat].total++
        if (t.status === "completed") {
          freqBreakdown[cat].completed++
          if ((Number(t.delayDays) || 0) > 0) {
            freqBreakdown[cat].delay++
          }
        } else if (t.status === "pending") {
          freqBreakdown[cat].pending++
          if (isTaskInMarginPeriod(t)) {
            freqBreakdown[cat].delay++
          }
        } else if (t.status === "overdue") {
          freqBreakdown[cat].overdue++
        }
      })

      const extensions = tasks.reduce((sum, t) => sum + (t.extensionCount || 0), 0)
      const delayTasks = tasks.reduce((sum, t) => sum + (t.delayDays || 0), 0)

      const checklistStaffRes = activeSource === "checklist" ? (allChecklistStats[nameKey] || {
        totalPenalties: 0,
        totalBonuses: 0,
        missedDays: 0,
        completedDays: 0,
        missedDates: []
      }) : null

      const totalPenalties = checklistStaffRes
        ? checklistStaffRes.totalPenalties
        : tasks.reduce((sum, t) => sum + (t.mainScorePenalty || 0), 0)
      let totalBonuses = 0

      const reopens = tasks.filter(t => t.title.toLowerCase().includes("reopen")).length

      const dynamicPointLogs = [];
      if (activeSource === "checklist") {
        if (checklistStaffRes) {
          checklistStaffRes.missedDates.forEach(md => {
            dynamicPointLogs.push({
              date: md.date,
              reason: md.reason,
              deducted: md.deducted,
              type: md.deducted < 0 ? "bonus" : "penalty"
            });
          });
        }
      } else {
        tasks.forEach(t => {
          if (t.penalty > 0) {
            dynamicPointLogs.push({
              date: t.completionDate || t.taskStartDate || "—",
              reason: `Task ID ${t.id} Overdue/Extension Penalty`,
              deducted: t.penalty,
              type: "penalty"
            });
          }
          if (t.status === "completed" && (t.extensionCount || 0) === 0 && (t.delayDays || 0) === 0) {
            dynamicPointLogs.push({
              date: t.completionDate || "—",
              reason: `Task ID ${t.id} On-Time Completion Bonus`,
              deducted: -20,
              type: "bonus"
            });
          }
        });
      }

      // Login tracking calculations
      const userLogins = loginsByUser[nameKey] || []
      const uniqueDates = [...new Set(userLogins.map(l => l.date))].map(d => parseDateFromDDMMYYYY(d)).filter(Boolean)
      uniqueDates.sort((a, b) => b - a)

      // For checklist mode: no login bonus, only login penalty (-10/day)
      // For delegation mode: login bonus is 1 pt per day
      const loginBonus = activeSource === "checklist" ? 0 : [...new Set(userLogins.map(l => l.date))].length * 1
      
      let delegationTotalTaskRewards = 0;
      let delegationTotalMainScorePenalties = 0;
      if (activeSource !== "checklist") {
        tasks.forEach(t => {
          if (t.originalStatus === "Done") {
            delegationTotalTaskRewards += (t.score || 0);
          }
          delegationTotalMainScorePenalties += (t.mainScorePenalty || 0);
        });
      }

      totalBonuses = checklistStaffRes
        ? 0  // checklist: penalty-only, no bonus
        : delegationTotalTaskRewards + loginBonus;
      
      // Update totalPenalties for delegation mode to only show the main score penalties + login deduction in the UI overview
      if (activeSource !== "checklist") {
        // Here we can assign it just for display purposes in the stat cards.
        // The finalScore math already handles it natively.
      }

      const uniqueLoginDatesList = [...new Set(userLogins.map(l => l.date))]
      uniqueLoginDatesList.forEach(dateStr => {
        if (activeSource !== "checklist") {
          dynamicPointLogs.push({
            date: dateStr,
            reason: "Daily Login Reward",
            deducted: -20,
            type: "bonus"
          });
        }
      });

      // Calculate current & longest login streaks
      let currentStreak = 0
      let longestStreak = 0
      const todayDate = new Date()
      todayDate.setHours(0,0,0,0)
      const yesterdayDate = new Date(todayDate)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      
      const hasToday = uniqueDates.some(d => d.getTime() === todayDate.getTime())
      const hasYesterday = uniqueDates.some(d => d.getTime() === yesterdayDate.getTime())
      if (hasToday || hasYesterday) {
        let check = hasToday ? todayDate : yesterdayDate
        while (uniqueDates.some(d => d.getTime() === check.getTime())) {
          currentStreak++
          check.setDate(check.getDate() - 1)
        }
      }

      const sortedAsc = [...uniqueDates].sort((a, b) => a - b)
      if (sortedAsc.length > 0) {
        let tempStreak = 1
        longestStreak = 1
        for (let i = 1; i < sortedAsc.length; i++) {
          const diff = sortedAsc[i] - sortedAsc[i-1]
          const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24))
          if (diffDays === 1) {
            tempStreak++
            longestStreak = Math.max(longestStreak, tempStreak)
          } else if (diffDays > 1) {
            tempStreak = 1
          }
        }
      }

      // Missed daily logins deductions (Filtered by selected date range)
      const rawUserDeductions = deductionsByUser[nameKey] || []
      const userDeductions = rawUserDeductions.filter(d => {
        // Parse date for filtering
        const parts = String(d.date || "").split("/");
        let deductionDate = null;
        if (parts.length === 3) {
          deductionDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          deductionDate = new Date(d.date);
        }
        if (isNaN(deductionDate.getTime())) return true; // keep if invalid
        
        // Global Cutoff: July 29, 2026
        const globalCutoff = new Date(2026, 6, 29);
        globalCutoff.setHours(0, 0, 0, 0);
        if (deductionDate < globalCutoff) return false;
        
        const now = new Date();
        if (deferredTimeRange === "weekly") {
          const currentDay = now.getDay();
          const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
          const monday = new Date(now);
          monday.setDate(now.getDate() + distanceToMon);
          monday.setHours(0,0,0,0);
          const saturday = new Date(monday);
          saturday.setDate(monday.getDate() + 5);
          saturday.setHours(23,59,59,999);
          return deductionDate >= monday && deductionDate <= saturday;
        }
        if (deferredTimeRange === "monthly") {
          return deductionDate.getMonth() === deferredSelectedMonth && deductionDate.getFullYear() === deferredSelectedYear;
        }
        if (deferredTimeRange === "yearly") {
          return deductionDate.getFullYear() === deferredSelectedYear;
        }
        if (deferredTimeRange === "custom") {
          let start = null;
          let end = null;
          if (deferredCustomStartDate) {
            const startParts = deferredCustomStartDate.split("-");
            start = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]), 0, 0, 0, 0);
          }
          if (deferredCustomEndDate) {
            const endParts = deferredCustomEndDate.split("-");
            end = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]), 23, 59, 59, 999);
          }
          if (start && end) return deductionDate >= start && deductionDate <= end;
          if (start) return deductionDate >= start;
          if (end) return deductionDate <= end;
        }
        return true; // Overall
      })
      // Filter login missed deductions specific to the active source
      const loginMissedDeductions = userDeductions.filter(d => {
        if (!d.reason || !String(d.reason).includes("Login Missed")) return false;
        if (activeSource === "checklist") {
          return String(d.reason).includes("(Checklist)");
        } else {
          return String(d.reason).includes("(Delegation)");
        }
      });
      const loginDisciplineDeduction = loginMissedDeductions.reduce((sum, d) => sum + (d.deducted || 0), 0);
      const totalMissedLoginDays = loginMissedDeductions.length;

      // Score breakdown depending on source
      let finalScore = 0
      let performancePercent = 0
      let scoreTaskCompletion = 0
      let scoreTaskQuality = 0
      let scoreLoginDiscipline = 0

      if (activeSource === "checklist") {
        // Pure penalty system: start from 100, deduct for each missed/delayed checklist and login
        finalScore = Math.max(0, Math.min(100, 100 - totalPenalties - loginDisciplineDeduction))
        performancePercent = Math.round(finalScore)
        scoreTaskCompletion = completed.length
        scoreTaskQuality = totalPenalties
        scoreLoginDiscipline = loginDisciplineDeduction
      } else {
        // Dynamic Point System: Base 100 + Task Rewards - Main Score Penalties - Login Deductions
        let totalTaskRewards = 0;
        let totalMainScorePenalties = 0;
        
        tasks.forEach(t => {
          if (t.originalStatus === "Done") {
            totalTaskRewards += (t.score || 0); // Task reward (remaining after task-level deductions)
          }
          totalMainScorePenalties += (t.mainScorePenalty || 0);
        });

        scoreTaskCompletion = completed.length
        scoreTaskQuality = totalMainScorePenalties // Renaming quality to just reflect penalties
        scoreLoginDiscipline = loginDisciplineDeduction

        const baseScore = 100;
        const totalPenaltiesDelegation = totalMainScorePenalties + loginDisciplineDeduction;
        const netPenalty = Math.max(0, totalPenaltiesDelegation - totalTaskRewards);
        finalScore = Math.max(0, baseScore - netPenalty);
        performancePercent = Math.round(finalScore);
      }

      let tier = "Bronze"
      const scoreForTier = activeSource === "checklist" ? finalScore * 10 : (finalScore >= 100 ? finalScore * 10 : finalScore * 10) // Map to existing tier system which uses 1000 scale
      // Actually, since finalScore is now based on 100 (which can go over 100), we should map it proportionally.
      // If base is 100, >100 is excellent.
      if (activeSource === "checklist") {
        if (finalScore >= 95) tier = "Platinum"
        else if (finalScore >= 85) tier = "Gold"
        else if (finalScore >= 70) tier = "Silver"
        else if (finalScore >= 50) tier = "Bronze"
        else if (finalScore >= 0) tier = "Needs Improvement"
        else tier = "Critical/Under Performing"
      } else {
        if (finalScore >= 100) tier = "Platinum"
        else if (finalScore >= 85) tier = "Gold"
        else if (finalScore >= 70) tier = "Silver"
        else if (finalScore >= 50) tier = "Bronze"
        else if (finalScore >= 0) tier = "Needs Improvement"
        else tier = "Critical/Under Performing"
      }

      // Performance Indexes (Percentage)
      const completionRate = tasks.length > 0 ? (completed.length / tasks.length) : 1
      const productivityIndex = Math.round(completionRate * 100)
      const accountabilityIndex = Math.round(Math.max(0, Math.min(100, 100 - (extensions * 15))))
      const efficiencyIndex = Math.round(Math.max(0, Math.min(100, 100 - (delayTasks * 10))))
      const disciplineIndex = Math.round(Math.max(0, Math.min(100, 100 - (totalPenalties / 4))))
      const consistencyIndex = Math.round(Math.max(0, Math.min(100, 100 - (reopens * 30))))
      const qualityIndex = Math.round(Math.max(0, Math.min(100, 100 - (totalPenalties / 6))))
      const teamworkIndex = Math.round(75 + (completed.length % 5) * 5)
      const leadershipIndex = Math.round(60 + (completed.length > 10 ? 25 : 10))
      const slaIndex = Math.round(tasks.length > 0 ? (completed.filter(t => t.penalty === 0).length / tasks.length) * 100 : 90)
      const improvementIndex = Math.round(80 + (extensions === 0 ? 15 : -10))

      return {
        ...staff,
        department: dept,
        aiScore: finalScore,
        freqBreakdown,
        performancePercent,
        tier,
        indexes: {
          productivityIndex,
          accountabilityIndex,
          efficiencyIndex,
          disciplineIndex,
          qualityIndex,
          consistencyIndex,
          teamworkIndex,
          leadershipIndex,
          slaIndex,
          improvementIndex
        },
        extensions,
        reopens,
        delayTasks,
        totalPenalties,
        totalTasks: tasks.length,
        completedTasks: completed.length,
        pendingTasks: pending.length,
        activeTasks: active.length,
        overdueTasks: overdue.length,
        loginStreak: currentStreak,
        longestStreak,
        missedLoginDays: totalMissedLoginDays,
        loginDeductions: loginDisciplineDeduction,
        dynamicPointLogs,
        totalBonuses,
        missedChecklistDays: checklistStaffRes ? checklistStaffRes.missedDays : 0,
        completedChecklistDays: checklistStaffRes ? checklistStaffRes.completedDays : 0,
        scoreBreakdown: {
          completion: scoreTaskCompletion,
          quality: scoreTaskQuality,
          login: scoreLoginDiscipline
        }
      }
    })

    // Aggregated frequency breakdown
    const totalFreqBreakdown = {
      daily: { total: 0, completed: 0, pending: 0, overdue: 0, delay: 0 },
      weekly: { total: 0, completed: 0, pending: 0, overdue: 0, delay: 0 },
      fortnightly: { total: 0, completed: 0, pending: 0, overdue: 0, delay: 0 },
      monthly: { total: 0, completed: 0, pending: 0, overdue: 0, delay: 0 },
      other: { total: 0, completed: 0, pending: 0, overdue: 0, delay: 0 }
    }

    filteredTasks.forEach(t => {
      const freq = String(t.frequency || "daily").toLowerCase().trim()
      let cat = "other"
      if (freq === "daily") cat = "daily"
      else if (freq === "weekly") cat = "weekly"
      else if (freq === "fortnightly" || freq === "bi-weekly" || freq === "biweekly") cat = "fortnightly"
      else if (freq === "monthly") cat = "monthly"

      totalFreqBreakdown[cat].total++
      if (t.status === "completed") {
        totalFreqBreakdown[cat].completed++
        if ((Number(t.delayDays) || 0) > 0) {
          totalFreqBreakdown[cat].delay++
        }
      } else if (t.status === "pending") {
        totalFreqBreakdown[cat].pending++
        if (isTaskInMarginPeriod(t)) {
          totalFreqBreakdown[cat].delay++
        }
      } else if (t.status === "overdue") {
        totalFreqBreakdown[cat].overdue++
      }
    })

    // Filter out users who have zero tasks in Checklist mode
    let filteredStaffList = staffCalculated
    if (activeSource === "checklist") {
      filteredStaffList = staffCalculated.filter(s => s.totalTasks > 0)
    }

    const sortedPerformers = [...filteredStaffList].sort((a, b) => {
      if (b.aiScore !== a.aiScore) {
        return b.aiScore - a.aiScore
      }
      return a.name.localeCompare(b.name)
    })
    const topPerformers = sortedPerformers.slice(0, 10)
    const bottomPerformers = sortedPerformers.slice().reverse().slice(0, 10)

    // Calculate aggregated net score
    const avgScore = filteredStaffList.length > 0 ? Math.round(filteredStaffList.reduce((sum, s) => sum + s.aiScore, 0) / filteredStaffList.length) : 100
    const missedChecklistDays = overallMissedChecklistDays

    return {
      missedChecklistDays,
      totalTasks: filteredTasks.length,
      activeDelegations: activeTasks.length,
      completedToday: completedTasks.length,
      pending: pendingTasks.length,
      overdue: overdueTasks.length,
      criticalTasks,
      slaCompliance,
      net1000Score: avgScore,
      totalPenalties,
      totalBonuses: 0,
      topPerformers,
      bottomPerformers,
      averageCompletionTime: "4.8 Hours",
      extensionRequests,
      reopenedTasks,
      approvalPending: verifyPending,
      escalatedTasks,
      staffMembersDetail: filteredStaffList,
      totalFreqBreakdown,
      filteredTasks
    }
  }, [filteredTasksByUser, filteredStaffMembers, deferredTimeRange, deferredSelectedMonth, deferredSelectedYear, deferredCustomStartDate, deferredCustomEndDate, loginHistory, pointDeductions])

  const displayTotalTasks = useMemo(() => {
    if (selectedEmployee && selectedEmployee !== "all") {
      const match = processedStats.staffMembersDetail.find(s => s.name.toLowerCase() === selectedEmployee.toLowerCase())
      return match ? match.totalTasks : 0
    }
    return processedStats.totalTasks
  }, [selectedEmployee, processedStats])

  const displayMissedLogins = useMemo(() => {
    if (selectedEmployee && selectedEmployee !== "all") {
      const match = processedStats.staffMembersDetail.find(s => s.name.toLowerCase() === selectedEmployee.toLowerCase())
      return match ? match.missedLoginDays : 0
    }
    return processedStats.staffMembersDetail.reduce((sum, s) => sum + s.missedLoginDays, 0)
  }, [selectedEmployee, processedStats])

  const displayMissedChecklistDays = useMemo(() => {
    if (selectedEmployee && selectedEmployee !== "all") {
      const match = processedStats.staffMembersDetail.find(s => s.name.toLowerCase() === selectedEmployee.toLowerCase())
      return match && match.dynamicPointLogs ? match.dynamicPointLogs.filter(l => l.type === "penalty").length : 0
    }
    return processedStats.missedChecklistDays
  }, [selectedEmployee, processedStats])

  const displayTotalBonuses = useMemo(() => {
    if (selectedEmployee && selectedEmployee !== "all") {
      const match = processedStats.staffMembersDetail.find(s => s.name.toLowerCase() === selectedEmployee.toLowerCase())
      return match ? match.totalBonuses : 0
    }
    return processedStats.staffMembersDetail.reduce((sum, s) => sum + (s.totalBonuses || 0), 0)
  }, [selectedEmployee, processedStats])

  const displayNet1000Score = useMemo(() => {
    if (selectedEmployee && selectedEmployee !== "all") {
      const match = processedStats.staffMembersDetail.find(s => s.name.toLowerCase() === selectedEmployee.toLowerCase())
      return match ? match.aiScore : 0
    }
    return processedStats.net1000Score
  }, [selectedEmployee, processedStats])

  const displayTotalPenalties = useMemo(() => {
    if (selectedEmployee && selectedEmployee !== "all") {
      const match = processedStats.staffMembersDetail.find(s => s.name.toLowerCase() === selectedEmployee.toLowerCase())
      return match ? match.totalPenalties : 0
    }
    return processedStats.totalPenalties
  }, [selectedEmployee, processedStats])

  // Filter staff by department and search queries, sorted by score descending
  const filteredStaff = useMemo(() => {
    return processedStats.staffMembersDetail.filter(s => {
      const matchDept = !filterDept || filterDept === "all" || s.department === filterDept
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.department.toLowerCase().includes(searchQuery.toLowerCase())
      return matchDept && matchSearch
    }).sort((a, b) => {
      if (b.aiScore !== a.aiScore) {
        return b.aiScore - a.aiScore
      }
      return a.name.localeCompare(b.name)
    })
  }, [processedStats.staffMembersDetail, filterDept, searchQuery])

  const predictiveInsights = useMemo(() => {
    return processedStats.staffMembersDetail.map(s => {
      const currentActive = filteredTasksByUser.filter(t => t.assignedTo.toLowerCase() === s.name.toLowerCase() && t.status !== "completed").length
      const historicalDelayRate = s.delayTasks / (s.totalTasks || 1)
      
      let riskLevel = "Low"
      let riskScore = Math.round(currentActive * 15 + historicalDelayRate * 400)
      if (riskScore > 75) riskLevel = "Critical"
      else if (riskScore > 50) riskLevel = "High"
      else if (riskScore > 25) riskLevel = "Medium"

      return {
        name: s.name,
        department: s.department,
        activeTasks: currentActive,
        riskLevel,
        riskScore: Math.min(100, riskScore),
        recommendation: insightRecommendation(riskLevel)
      }
    }).sort((a, b) => b.riskScore - a.riskScore)
  }, [processedStats.staffMembersDetail, filteredTasksByUser])

  // Find dynamic selection staff profile currently matching filters
  const activeStaffProfile = useMemo(() => {
    if (!selectedStaffName) return null
    return filteredStaff.find(s => s.name === selectedStaffName) || null
  }, [filteredStaff, selectedStaffName])

  // Filter tasks list to display in the main list table
  const displayTasksList = useMemo(() => {
    return processedStats.filteredTasks.filter(t => {
      const matchDept = !filterDept || filterDept === "all" || getDepartment(t.assignedTo) === filterDept
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.assignedTo.toLowerCase().includes(searchQuery.toLowerCase())
      return matchDept && matchSearch
    })
  }, [processedStats.filteredTasks, filterDept, searchQuery])

  const handleExport = (format) => {
    if (format === "csv" || format === "xlsx") {
      setXlsxLoading(true)
    } else if (format === "pdf") {
      setPdfLoading(true)
    }

    setTimeout(() => {
      try {
        if (format === "csv" || format === "xlsx") {
          if (format === "xlsx") {
            const wb = XLSX.utils.book_new()
            
            let usersToExport = []
            if (selectedEmployee && selectedEmployee !== "all") {
              const single = filteredStaff.find(s => s.name.toLowerCase() === selectedEmployee.toLowerCase())
              if (single) usersToExport = [single]
            } else {
              usersToExport = filteredStaff
            }

            const isChecklist = activeSource === "checklist"

            // Create a summary sheet containing all employees' performance metrics
            const summaryRows = []
            if (isChecklist) {
              const freqStr = checklistFrequencyFilter !== "all" ? ` (${checklistFrequencyFilter.toUpperCase()})` : ""
              summaryRows.push([`EMPLOYEE CHECKLIST${freqStr} PERFORMANCE SUMMARY REPORT`])
            } else {
              summaryRows.push(["EMPLOYEE DELEGATION PERFORMANCE SUMMARY REPORT"])
            }
            summaryRows.push([`Generated on: ${new Date().toLocaleString()}`])
            if (timeRange === "custom") {
              summaryRows.push([`Date Range: ${customStartDate} to ${customEndDate}`])
            } else {
              summaryRows.push([`Time Range: ${timeRange.toUpperCase()}`])
            }
            summaryRows.push([])

            if (isChecklist) {
              if (checklistFrequencyFilter === "all") {
                summaryRows.push([
                  "Employee Name", "Score (100)", 
                  "Daily (Done/Active/Grace/Esc)", 
                  "Weekly (Done/Active/Grace/Esc)", 
                  "Fortnightly (Done/Active/Grace/Esc)", 
                  "Monthly (Done/Active/Grace/Esc)", 
                  "Others (Done/Active/Grace/Esc)", 
                  "Missed Logins (Days)", "Missed Logins (Deduction)", "Missed Checklists (Deduction)"
                ])
                usersToExport.forEach(staff => {
                  summaryRows.push([
                    staff.name,
                    staff.aiScore,
                    `${staff.freqBreakdown?.daily?.completed || 0}/${staff.freqBreakdown?.daily?.total || 0}/${staff.freqBreakdown?.daily?.pending || 0}/${staff.freqBreakdown?.daily?.overdue || 0}`,
                    `${staff.freqBreakdown?.weekly?.completed || 0}/${staff.freqBreakdown?.weekly?.total || 0}/${staff.freqBreakdown?.weekly?.pending || 0}/${staff.freqBreakdown?.weekly?.overdue || 0}`,
                    `${staff.freqBreakdown?.fortnightly?.completed || 0}/${staff.freqBreakdown?.fortnightly?.total || 0}/${staff.freqBreakdown?.fortnightly?.pending || 0}/${staff.freqBreakdown?.fortnightly?.overdue || 0}`,
                    `${staff.freqBreakdown?.monthly?.completed || 0}/${staff.freqBreakdown?.monthly?.total || 0}/${staff.freqBreakdown?.monthly?.pending || 0}/${staff.freqBreakdown?.monthly?.overdue || 0}`,
                    `${staff.freqBreakdown?.other?.completed || 0}/${staff.freqBreakdown?.other?.total || 0}/${staff.freqBreakdown?.other?.pending || 0}/${staff.freqBreakdown?.other?.overdue || 0}`,
                    staff.missedLoginDays,
                    `-${staff.loginDeductions} Pts`,
                    `-${staff.totalPenalties} Pts`
                  ])
                })
              } else {
                summaryRows.push([
                  "Employee Name", "Score (100)", "Assigned Checklists", "Completed", "Pending", "Overdue",
                  "Missed Logins (Days)", "Missed Logins (Deduction)", "Missed Checklists (Days)", "Missed Checklists (Deduction)"
                ])
                usersToExport.forEach(staff => {
                  summaryRows.push([
                    staff.name,
                    staff.aiScore,
                    staff.totalTasks,
                    staff.completedTasks,
                    staff.pendingTasks,
                    staff.overdueTasks,
                    staff.missedLoginDays,
                    `-${staff.loginDeductions} Pts`,
                    staff.totalTasks - staff.completedTasks,
                    `-${staff.totalPenalties} Pts`
                  ])
                })
              }
            } else {
              summaryRows.push([
                "Employee Name", "Department", "Score", "Completed Tasks", "Total Tasks", "On-Time Rate", "Overdue", "Extensions", "Missed Logins", "Login Penalty"
              ])
              usersToExport.forEach(staff => {
                summaryRows.push([
                  staff.name,
                  staff.department || "-",
                  staff.aiScore,
                  staff.completedTasks,
                  staff.totalTasks,
                  `${staff.indexes.slaIndex}%`,
                  staff.overdueTasks,
                  staff.extensions,
                  `${staff.missedLoginDays} Days`,
                  `-${staff.loginDeductions} Pts`
                ])
              })
            }

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
            XLSX.utils.book_append_sheet(wb, summarySheet, "Summary View")

            // Create individual sheets for each employee
            usersToExport.forEach(staff => {
              const rows = []
              const staffTasks = displayTasksList.filter(t => t.assignedTo.toLowerCase() === staff.name.toLowerCase())
              
              rows.push(["EMPLOYEE PERFORMANCE REPORT"])
              rows.push(["Employee Name:", staff.name])
              if (!isChecklist) {
                rows.push(["Department:", staff.department || "—"])
              }
              if (timeRange === "custom") {
                rows.push(["Date Range:", `${customStartDate} to ${customEndDate}`])
              } else {
                rows.push(["Time Range:", timeRange.toUpperCase()])
              }
              rows.push([])
              
              rows.push(["METRICS SUMMARY CARD POINTS"])
              const headerRow = ["Total Tasks", "Active Tasks", "Completed Tasks", "On-Time Rate", "Score", "Bonus", "Penalties", "Late Tasks", "Extended Tasks", "Missed Logins"]
              if (isChecklist) {
                headerRow.push("Missed Checklist Days")
              }
              rows.push(headerRow)

              const valueRow = [
                staff.totalTasks,
                staff.activeTasks,
                staff.completedTasks,
                `${staff.indexes.slaIndex}%`,
                `${staff.aiScore}/100`,
                `+${staff.totalBonuses || 0} pts`,
                `-${staff.totalPenalties || 0} pts`,
                staff.overdueTasks,
                staff.extensions,
                `${staff.missedLoginDays} Days (-${staff.loginDeductions} Pts)`
              ]
              if (isChecklist) {
                valueRow.push(`${staff.missedChecklistDays || 0} Days`)
              }
              rows.push(valueRow)
              rows.push([])

              const completedTasks = staffTasks.filter(t => t.status === "completed")
              const pendingOrOverdueTasks = staffTasks.filter(t => t.status !== "completed")

              rows.push(["PENDING & OVERDUE TASK LIST"])
              rows.push([
                "Task ID", "Description", "Start Date", "Deadline", 
                "Status", "Extensions Count", "Delay Days", "Penalty Points"
              ])
              pendingOrOverdueTasks.forEach(t => {
                rows.push([
                  t.id, t.title, t.taskStartDate || "—", t.dueDate,
                  t.status, t.extensionCount ?? 0, t.delayDays ?? 0, t.penalty ?? 0
                ])
              })
              if (pendingOrOverdueTasks.length === 0) {
                rows.push(["No pending or overdue tasks."])
              }
              rows.push([])

              rows.push(["COMPLETED TASK LIST"])
              rows.push([
                "Task ID", "Description", "Start Date", "Deadline", "Completion Date", 
                "Status", "Extensions Count", "Delay Days", "Score Received"
              ])
              completedTasks.forEach(t => {
                rows.push([
                  t.id, t.title, t.taskStartDate || "—", t.dueDate, t.completionDate || "—",
                  t.status, t.extensionCount ?? 0, t.delayDays ?? 0, t.score ?? 100
                ])
              })
              if (completedTasks.length === 0) {
                rows.push(["No completed tasks."])
              }
              rows.push([])

              const ws = XLSX.utils.aoa_to_sheet(rows)
              const sheetName = staff.name.substring(0, 30).replace(/[*?:\\/\[\]]/g, '') // remove illegal chars
              XLSX.utils.book_append_sheet(wb, ws, sheetName)
            })

            XLSX.writeFile(wb, `SBH_Performance_Excel_Report_${Date.now()}.xlsx`)
          } else {
            const dataToExport = displayTasksList.map(t => ({
              "Task ID": t.id,
              "Description": t.title,
              "Assigned Employee": t.assignedTo,
              "Start Date": t.taskStartDate,
              "Deadline": t.dueDate,
              "Completion Date": t.completionDate || "-",
              "Status": t.status,
              "Extensions Count": t.extensionCount ?? 0,
              "Delay Days": t.delayDays ?? 0,
              "Task Score (100)": t.score ?? 100,
              "Penalty Deducted": t.penalty ?? 0
            }))

            const csv = Papa.unparse(dataToExport)
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const link = document.createElement("a")
            link.href = URL.createObjectURL(blob)
            link.setAttribute("download", `SBH_Workforce_Tasks_Report_${Date.now()}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
        } else if (format === "pdf") {
          const doc = new jsPDF(activeSource === "checklist" ? "landscape" : "portrait")
          doc.setFont("helvetica", "bold")
          doc.setFontSize(16)
          const freqStr = (activeSource === "checklist" && checklistFrequencyFilter !== "all") ? ` (${checklistFrequencyFilter.toUpperCase()})` : ""
          doc.text(activeSource === "checklist" ? `SBH Checklist${freqStr} Performance Report` : "SBH Performance Tasks Report", 14, 20)
          doc.setFontSize(10)
          doc.setFont("helvetica", "normal")
          doc.text("Managed by IT Department | SBH Group of Hospitals", 14, 26)
          let dateRangeStr = `Time Range: ${timeRange.toUpperCase()}`
          if (timeRange === "custom") {
            dateRangeStr = `Date Range: ${customStartDate} to ${customEndDate}`
          }
          doc.text(dateRangeStr, 14, 32)
          doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38)
          
          doc.setFont("helvetica", "bold")
          doc.setFontSize(9)
          doc.setTextColor(100, 100, 100)
          doc.text("Legend: D = Done | A = Assigned | G = Grace (Pending) | E = Escalated (Overdue)", 14, 44)
          doc.setFont("helvetica", "normal")
          doc.setTextColor(0, 0, 0)

          if (activeSource === "checklist") {
            let columns = []
            let rows = []
            if (checklistFrequencyFilter === "all") {
              columns = [
                "Employee Name", "Score (100)", 
                "Daily (D/A/G/E)", "Weekly (D/A/G/E)", "Fortnightly (D/A/G/E)", "Monthly (D/A/G/E)", "Others (D/A/G/E)",
                "Missed Logins (Days)", "Login Penalty", "Checklist Penalty"
              ]
              rows = filteredStaff.map(staff => [
                staff.name,
                staff.aiScore,
                `${staff.freqBreakdown?.daily?.completed || 0}/${staff.freqBreakdown?.daily?.total || 0}/${staff.freqBreakdown?.daily?.pending || 0}/${staff.freqBreakdown?.daily?.overdue || 0}`,
                `${staff.freqBreakdown?.weekly?.completed || 0}/${staff.freqBreakdown?.weekly?.total || 0}/${staff.freqBreakdown?.weekly?.pending || 0}/${staff.freqBreakdown?.weekly?.overdue || 0}`,
                `${staff.freqBreakdown?.fortnightly?.completed || 0}/${staff.freqBreakdown?.fortnightly?.total || 0}/${staff.freqBreakdown?.fortnightly?.pending || 0}/${staff.freqBreakdown?.fortnightly?.overdue || 0}`,
                `${staff.freqBreakdown?.monthly?.completed || 0}/${staff.freqBreakdown?.monthly?.total || 0}/${staff.freqBreakdown?.monthly?.pending || 0}/${staff.freqBreakdown?.monthly?.overdue || 0}`,
                `${staff.freqBreakdown?.other?.completed || 0}/${staff.freqBreakdown?.other?.total || 0}/${staff.freqBreakdown?.other?.pending || 0}/${staff.freqBreakdown?.other?.overdue || 0}`,
                staff.missedLoginDays,
                `-${staff.loginDeductions} Pts`,
                `-${staff.totalPenalties} Pts`
              ])
            } else {
              columns = [
                "Employee Name", "Score (100)", "Assigned", "Completed", "Pending", "Overdue",
                "Missed Logins (Days)", "Login Penalty", "Missed Checklists (Days)", "Checklist Penalty"
              ]
              rows = filteredStaff.map(staff => [
                staff.name,
                staff.aiScore,
                staff.totalTasks,
                staff.completedTasks,
                staff.pendingTasks,
                staff.overdueTasks,
                staff.missedLoginDays,
                `-${staff.loginDeductions} Pts`,
                staff.totalTasks - staff.completedTasks,
                `-${staff.totalPenalties} Pts`
              ])
            }

            autoTable(doc, {
              startY: 48,
              head: [columns],
              body: rows,
              theme: "striped",
              headStyles: { fillColor: [79, 70, 229] },
              styles: { fontSize: 8 },
              didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 1) { // Score column
                  const val = parseFloat(data.cell.raw);
                  if (val >= 85) {
                    data.cell.styles.textColor = [16, 185, 129]; // Emerald Green
                    data.cell.styles.fontStyle = 'bold';
                  } else if (val >= 50) {
                    data.cell.styles.textColor = [245, 158, 11]; // Amber
                    data.cell.styles.fontStyle = 'bold';
                  } else {
                    data.cell.styles.textColor = [239, 68, 68]; // Rose Red
                    data.cell.styles.fontStyle = 'bold';
                  }
                }
              }
            })
          } else {
            const columns = [
              "Employee Name", "Score", "Completed Tasks", "Total Tasks", "On-Time Rate", "Overdue", "Extensions", "Missed Logins", "Login Penalty"
            ]
            const rows = filteredStaff.map(staff => [
              staff.name,
              staff.aiScore,
              staff.completedTasks,
              staff.totalTasks,
              `${staff.indexes.slaIndex}%`,
              staff.overdueTasks,
              staff.extensions,
              `${staff.missedLoginDays} Days`,
              `-${staff.loginDeductions} Pts`
            ])

            autoTable(doc, {
              startY: 48,
              head: [columns],
              body: rows,
              theme: "striped",
              headStyles: { fillColor: [79, 70, 229] },
              styles: { fontSize: 8 },
              didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 1) { // Score column
                  const val = parseFloat(data.cell.raw);
                  if (val >= 850) {
                    data.cell.styles.textColor = [16, 185, 129]; // Emerald Green
                    data.cell.styles.fontStyle = 'bold';
                  } else if (val >= 500) {
                    data.cell.styles.textColor = [245, 158, 11]; // Amber
                    data.cell.styles.fontStyle = 'bold';
                  } else {
                    data.cell.styles.textColor = [239, 68, 68]; // Rose Red
                    data.cell.styles.fontStyle = 'bold';
                  }
                }
              }
            })
          }
          doc.save(`SBH_${activeSource === "checklist" ? "Checklist" : "Performance"}_Report_${Date.now()}.pdf`)
        }

        // Show successful download alert bar
        setShowDownloadAlert(true)
        setTimeout(() => setShowDownloadAlert(false), 2000)
      } catch (err) {
        console.error("Export error:", err)
        alert("Failed to export data: " + err.message)
      } finally {
        setXlsxLoading(false)
        setPdfLoading(false)
      }
    }, 100)
  }

  const open360Profile = (staff) => {
    setSelectedStaffName(staff.name)
    setShowProfileModal(true)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Successful Download Alert Bar */}
      {showDownloadAlert && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 border border-emerald-500 text-white px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[9999] animate-bounce font-extrabold text-sm">
          <CheckCircle2 className="h-5 w-5 text-white animate-pulse" />
          <span>Report Downloaded Successfully!</span>
        </div>
      )}
      
      {/* Source Selection Tabs */}
      <div className="flex border-b-2 border-slate-200 bg-white p-1 rounded-t-xl gap-2">
        <button
          onClick={() => setActiveSource("delegation")}
          className={`py-3 px-6 font-extrabold text-sm border-b-4 rounded-t-lg transition-all cursor-pointer ${
            activeSource === "delegation"
              ? "border-purple-600 text-purple-600 bg-purple-50/40"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Delegation Performance
        </button>
        <button
          onClick={() => setActiveSource("checklist")}
          className={`py-3 px-6 font-extrabold text-sm border-b-4 rounded-t-lg transition-all cursor-pointer ${
            activeSource === "checklist"
              ? "border-purple-600 text-purple-600 bg-purple-50/40"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Checklist Performance
        </button>
      </div>
      
      {/* Checklist Frequency Selection Sub-Tabs */}
      {activeSource === "checklist" && (
        <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: "all", label: "📋 All Checklists" },
            { id: "daily", label: "☀️ Daily" },
            { id: "weekly", label: "📅 Weekly" },
            { id: "fortnightly", label: "🌗 Fortnightly" },
            { id: "monthly", label: "🗓️ Monthly" },
            { id: "quarterly", label: "📑 Quarterly" },
            { id: "yearly", label: "📆 Yearly" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setChecklistFrequencyFilter(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                checklistFrequencyFilter === tab.id
                  ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                  : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Dashboard Container Wrap with Loading Overlay */}
      <div className="relative space-y-6">
        {tabLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 rounded-2xl">
            <div className="sticky top-[150px] h-[60vh] w-full flex flex-col items-center justify-center p-4">
              <div className="flex flex-col items-center justify-center space-y-4 max-w-xs w-full text-center">
                <div className="relative flex items-center justify-center">
                  <svg className="animate-spin h-12 w-12 text-[#9333EA]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="spinner-grad-edpms" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#9333EA" />
                        <stop offset="100%" stopColor="#DB2777" />
                      </linearGradient>
                    </defs>
                    <circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-90" fill="url(#spinner-grad-edpms)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-slate-800 text-sm font-semibold tracking-wide animate-pulse">
                    {funnyMsg}
                  </p>
                  <p className="text-[10px] uppercase font-black tracking-widest bg-gradient-to-r from-[#9333EA] to-[#DB2777] bg-clip-text text-transparent">
                    Loading Performance...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Header Board - Light background with high contrast plain text */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm w-fit">
              <Sparkles className="h-3 w-3 text-purple-600 animate-pulse" />
              v3.0 SBH Platform
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-slate-900">
            SBH Performance Intelligence
          </h1>
          <p className="text-slate-500 text-sm max-w-xl font-medium">
            Real-Time Workforce Accountability, Progressive Penalties & Checklist/Delegation Performance.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() => handleExport("xlsx")}
            disabled={xlsxLoading || pdfLoading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {xlsxLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Download className="h-4 w-4" />
            )}
            {xlsxLoading ? "Exporting..." : "Excel Export"}
          </button>

          <button
            onClick={() => handleExport("pdf")}
            disabled={xlsxLoading || pdfLoading}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {pdfLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {pdfLoading ? "Generating..." : "PDF Report"}
          </button>
        </div>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center w-full">
            
            {/* Employee Autocomplete */}
            <div ref={employeeRef} className="flex items-center gap-2 relative">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Employee:</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type name to search..."
                  value={staffSearchText}
                  onChange={(e) => {
                    const txt = e.target.value
                    setStaffSearchText(txt)
                    setShowSuggestions(true)
                    
                    const matched = activeDoerOptions.find(d => d.toLowerCase() === txt.trim().toLowerCase())
                    if (matched) {
                      setSelectedEmployee(matched)
                    } else if (txt.trim().toLowerCase() === "all" || txt.trim().toLowerCase() === "all employees") {
                      setSelectedEmployee("all")
                    } else if (txt === "") {
                      setSelectedEmployee("")
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none w-full sm:w-48 cursor-pointer uppercase"
                />
                {showSuggestions && (
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 divide-y divide-slate-50 min-w-[200px]">
                    <div
                      onClick={() => {
                        setSelectedEmployee("all")
                        setStaffSearchText("All Employees")
                        setShowSuggestions(false)
                      }}
                      className="px-3 py-2 hover:bg-slate-50 text-[10px] font-bold text-slate-500 uppercase cursor-pointer"
                    >
                      All Employees
                    </div>
                    {activeDoerOptions.filter(d => d.toLowerCase().includes(staffSearchText.toLowerCase())).map(doer => (
                      <div
                        key={doer}
                        onClick={() => {
                          setSelectedEmployee(doer)
                          setStaffSearchText(doer)
                          setShowSuggestions(false)
                        }}
                        className="px-3 py-2 hover:bg-purple-600 hover:text-white text-[10px] font-bold text-slate-700 uppercase cursor-pointer"
                      >
                        {doer}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Department Autocomplete — hidden in Checklist mode */}
            {activeSource !== "checklist" && (
            <div ref={deptRef} className="flex items-center gap-2 relative">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Department:</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type dept to search..."
                  value={deptSearchText}
                  onChange={(e) => {
                    const txt = e.target.value
                    setDeptSearchText(txt)
                    setShowDeptSuggestions(true)
                    const matched = departmentOptions.find(d => d.toLowerCase() === txt.trim().toLowerCase())
                    if (matched) {
                      setFilterDept(matched)
                    } else if (txt.trim().toLowerCase() === "all" || txt.trim().toLowerCase() === "all departments") {
                      setFilterDept("all")
                    } else if (txt === "") {
                      setFilterDept("")
                    }
                  }}
                  onFocus={() => setShowDeptSuggestions(true)}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none w-full sm:w-48 cursor-pointer uppercase"
                />
                {showDeptSuggestions && (
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 divide-y divide-slate-50 min-w-[200px]">
                    <div
                      onClick={() => {
                        setFilterDept("all")
                        setDeptSearchText("All Departments")
                        setShowDeptSuggestions(false)
                      }}
                      className="px-3 py-2 hover:bg-slate-50 text-[10px] font-bold text-slate-500 uppercase cursor-pointer"
                    >
                      All Departments
                    </div>
                    {departmentOptions.filter(d => d.toLowerCase().includes(deptSearchText.toLowerCase())).map(dept => (
                      <div
                        key={dept}
                        onClick={() => {
                          setFilterDept(dept)
                          setDeptSearchText(dept)
                          setShowDeptSuggestions(false)
                        }}
                        className="px-3 py-2 hover:bg-purple-600 hover:text-white text-[10px] font-bold text-slate-700 uppercase cursor-pointer"
                      >
                        {dept}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Performance Range */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Performance Range:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none w-full sm:w-44 cursor-pointer"
              >
                <option value="overall">Overall</option>
                <option value="weekly">Weekly (Last Mon-Sat)</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="quarterly">Quarterly</option>
                <option value="daily">Daily</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Inline Custom Range Start/End Date Pickers */}
            {timeRange === "custom" && (
              <div className="flex flex-wrap items-center gap-2 animate-fade-in text-xs">
                <span className="font-bold text-slate-500">Start:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value)
                    setTimeRange("custom")
                  }}
                  className="border border-slate-205 rounded-lg p-1 bg-white outline-none cursor-pointer text-xs font-semibold text-slate-700"
                />
                <span className="font-bold text-slate-500">End:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value)
                    setTimeRange("custom")
                  }}
                  className="border border-slate-205 rounded-lg p-1 bg-white outline-none cursor-pointer text-xs font-semibold text-slate-700"
                />
              </div>
            )}

            {/* Month selector inline dropdown when timeRange is Monthly */}
            {timeRange === "monthly" && (
              <div className="flex items-center gap-2 animate-fade-in text-xs">
                <span className="font-bold text-slate-500">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg p-1 bg-white outline-none cursor-pointer text-xs font-semibold text-slate-700"
                >
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>
                <span className="font-bold text-slate-500">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg p-1 bg-white outline-none cursor-pointer text-xs font-semibold text-slate-700"
                >
                  {[2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

          </div>
        </div>
      </div>

      {!(selectedEmployee || filterDept) ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center max-w-xl mx-auto space-y-4 my-10">
          <div className="bg-purple-50 text-purple-600 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto shadow-sm">
            <Search className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-lg">Performance Dashboard Matrix</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {activeSource === "checklist"
              ? <>Please search and select an <strong>Employee</strong> to load checklist metrics. Select <strong>"All Employees"</strong> to see everyone.</>
              : <>Please search and select an <strong>Employee</strong> or choose a <strong>Department</strong> to load metrics. Select <strong>"All Employees"</strong> to see all.</>}
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 ${activeSource === "checklist" ? "lg:grid-cols-9" : "lg:grid-cols-8"} gap-3`}>
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Total Tasks</span>
            <Users className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-800">{displayTotalTasks}</span>
            <span className="text-[9px] text-slate-500 block font-medium mt-0.5">Overall count</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Active Tasks</span>
            <Activity className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-800">{processedStats.activeDelegations}</span>
            <span className="text-[9px] text-purple-600 block font-medium mt-0.5">Live tracking</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Completed Tasks</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-800">{processedStats.completedToday}</span>
            <span className="text-[9px] text-emerald-600 block font-medium mt-0.5">Within range</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">On-Time Rate</span>
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-800">{processedStats.slaCompliance}%</span>
            <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${processedStats.slaCompliance}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between col-span-1 lg:col-span-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">{activeSource === "checklist" ? "Performance Score" : "Performance Points"}</span>
            <Award className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className={`text-sm font-black block ${displayNet1000Score >= (activeSource === "checklist" ? 95 : 100) ? "text-emerald-600" : displayNet1000Score >= (activeSource === "checklist" ? 70 : 70) ? "text-indigo-600" : "text-rose-600"}`}>
              {displayNet1000Score}/100
            </span>
            <span className="text-[8px] text-emerald-600 block mt-0.5 truncate font-bold">
              Bonus: +{displayTotalBonuses} pts
            </span>
            <span className="text-[8px] text-rose-500 block mt-0.5 truncate font-bold">
              Penalties: -{displayTotalPenalties} pts
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Late Tasks</span>
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-rose-600">{processedStats.overdue}</span>
            <span className="text-[9px] text-rose-500 block font-medium mt-0.5">{processedStats.escalatedTasks} escalated</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Extended Tasks</span>
            <Calendar className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-800">{processedStats.extensionRequests}</span>
            <span className="text-[9px] text-amber-600 block font-medium mt-0.5">Extensions total</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Missed Logins</span>
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-rose-600">{displayMissedLogins} Days</span>
            <span className="text-[9px] text-rose-500 block font-medium mt-0.5">Deduction logged</span>
          </div>
        </div>

        {activeSource === "checklist" && (
          <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[9px] font-bold uppercase tracking-wider">Missed Checklist Days</span>
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <div className="mt-2">
              <span className="text-lg font-extrabold text-rose-600">{displayMissedChecklistDays} Days</span>
              <span className="text-[9px] text-rose-500 block font-medium mt-0.5">Total Missed Days</span>
            </div>
          </div>
        )}
      </div>

      {/* Checklist Frequency Breakdown Matrix Section */}
      {activeSource === "checklist" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 animate-fade-in">
          {[
            { id: "daily", label: "☀️ Daily Checklists" },
            { id: "weekly", label: "📅 Weekly Checklists" },
            { id: "fortnightly", label: "⏳ Fortnightly" },
            { id: "monthly", label: "🗓️ Monthly Checklists" },
            { id: "other", label: "⚙️ Others" }
          ].map(freq => {
            const data = processedStats.totalFreqBreakdown?.[freq.id] || { total: 0, completed: 0, pending: 0, overdue: 0 }
            return (
              <div key={freq.id} className="bg-white rounded-xl border border-slate-100 p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">{freq.label}</span>
                  <span className="text-[10px] bg-purple-50 text-purple-700 font-extrabold px-2 py-0.5 rounded-full">Act: {data.total}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1 text-[9px] border-t border-slate-50 pt-2 font-bold text-center">
                  <div className="text-emerald-600 bg-emerald-50/50 p-1.5 rounded-lg">
                    <div>Done</div>
                    <div className="text-xs font-black mt-0.5">{data.completed}</div>
                  </div>
                  <div className="text-amber-600 bg-amber-50/50 p-1.5 rounded-lg">
                    <div>Grace</div>
                    <div className="text-xs font-black mt-0.5">{data.pending}</div>
                  </div>
                  <div className="text-rose-600 bg-rose-50/50 p-1.5 rounded-lg">
                    <div>Esc</div>
                    <div className="text-xs font-black mt-0.5">{data.overdue}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rankings, Statistics and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-indigo-50/20">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Workforce Scoring & Accountability Map</h3>
                <p className="text-slate-500 text-xs mt-0.5">Live index computation from Google Sheet tasks.</p>
              </div>
              <span className="text-xs bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full">
                {filteredStaff.length} Employees
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-max md:min-w-0">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-3.5 py-2.5 text-center">Analyze</th>
                    <th className="px-3.5 py-2.5">Employee</th>
                    {activeSource !== "checklist" && <th className="px-3.5 py-2.5">Department</th>}
                    <th className="px-3.5 py-2.5">AI Score</th>
                    {activeSource === "checklist" ? (
                      <>
                        <th className="px-3.5 py-2.5 text-center">Assigned</th>
                        <th className="px-3.5 py-2.5 text-center">Completed</th>
                        <th className="px-3.5 py-2.5 text-center">Pending</th>
                        <th className="px-3.5 py-2.5 text-center">Overdue</th>
                        <th className="px-3.5 py-2.5 text-center">Missed Logins</th>
                        <th className="px-3.5 py-2.5 text-center">Missed Checklist</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3.5 py-2.5">Task Deliveries</th>
                        <th className="px-3.5 py-2.5">On-Time Rate</th>
                        <th className="px-3.5 py-2.5 text-center">Missed Logins</th>
                        <th className="px-3.5 py-2.5 text-center">Login Penalty</th>
                        <th className="px-3.5 py-2.5">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStaff.map((staff, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/10 transition-colors">
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          onClick={() => open360Profile(staff)}
                          className="text-[10px] bg-slate-100 hover:bg-purple-600 hover:text-white px-2.5 py-1 rounded-lg font-bold text-slate-700 transition-all cursor-pointer"
                        >
                          Analyze
                        </button>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-purple-100 text-purple-700 font-bold flex items-center justify-center rounded-xl text-xs shadow-sm">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{staff.name}</p>
                            <p className="text-[9px] text-slate-400">Rank: #{idx + 1}</p>
                          </div>
                        </div>
                      </td>
                      {activeSource !== "checklist" && (
                        <td className="px-3.5 py-2.5 text-[11px] font-medium text-slate-500">
                          {staff.department}
                        </td>
                      )}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-black text-xs ${
                            staff.aiScore >= 95 ? "text-emerald-600" :
                            staff.aiScore >= 70 ? "text-amber-600" : "text-rose-600"
                          }`}>{staff.aiScore}/100</span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${getTierBadge(staff.tier)}`}>
                            {staff.tier}
                          </span>
                        </div>
                      </td>
                      {activeSource === "checklist" ? (
                        <>
                          <td className="px-3.5 py-2.5 font-bold text-slate-600 text-center">{staff.totalTasks}</td>
                          <td className="px-3.5 py-2.5 font-bold text-emerald-600 text-center">{staff.completedTasks}</td>
                          <td className="px-3.5 py-2.5 font-bold text-amber-600 text-center">{staff.pendingTasks}</td>
                          <td className="px-3.5 py-2.5 font-bold text-rose-600 text-center">{staff.overdueTasks}</td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className="font-bold text-slate-700">{staff.missedLoginDays} Days</span>
                            <span className="text-[10px] text-rose-600 block">-{staff.loginDeductions} Pts</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className="font-bold text-slate-700">{staff.missedChecklistDays || 0} Days</span>
                            <span className="text-[10px] text-rose-600 block">-{staff.totalPenalties} Pts</span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600">
                            {staff.completedTasks} / {staff.totalTasks} Done
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-purple-600 h-full rounded-full" style={{ width: `${staff.indexes.slaIndex}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-slate-700">{staff.indexes.slaIndex}%</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-slate-700">
                            {staff.missedLoginDays} Days
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className="text-[10px] text-rose-600 block">-{staff.loginDeductions} Pts</span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              staff.aiScore >= 700 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                              staff.aiScore >= 500 ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                              "bg-rose-50 text-rose-700 border border-rose-100"
                            }`}>
                              {staff.aiScore >= 700 ? "Outstanding" : "Under review"}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Tasks List Table */}
          {activeSource === "delegation" && (
            (selectedEmployee || filterDept) ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-indigo-50/20">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Detailed Tasks Reference Map</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Filtered task rows for detailed review.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport("xlsx")}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      Download Excel
                    </button>
                    <button
                      onClick={() => handleExport("pdf")}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto w-full max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse min-w-max md:min-w-0">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="px-3.5 py-2.5">Task ID</th>
                        <th className="px-3.5 py-2.5">Description</th>
                        <th className="px-3.5 py-2.5">Assigned To</th>
                        <th className="px-3.5 py-2.5">Deadline</th>
                        <th className="px-3.5 py-2.5">Status</th>
                        <th className="px-3.5 py-2.5 text-center">Ext.</th>
                        <th className="px-3.5 py-2.5 text-center">Delays</th>
                        <th className="px-3.5 py-2.5 text-center">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {displayTasksList.map((task, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3.5 py-2.5 font-bold text-slate-700">{task.id}</td>
                          <td className="px-3.5 py-2.5 max-w-xs truncate font-medium text-slate-800">{task.title}</td>
                          <td className="px-3.5 py-2.5 font-semibold text-slate-600">{task.assignedTo}</td>
                          <td className="px-3.5 py-2.5 font-medium text-slate-500">{task.dueDate}</td>
                          <td className="px-3.5 py-2.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              task.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                              task.status === "overdue" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                              "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-slate-600">{task.extensionCount ?? 0}</td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-rose-600">{task.delayDays ?? 0}d</td>
                          <td className="px-3.5 py-2.5 text-center font-extrabold text-slate-800">
                            <div className="flex flex-col items-center justify-center">
                              <span>{task.score} Pts</span>
                              <span className="text-[9px] text-gray-500 font-normal mt-0.5 whitespace-nowrap">
                                Base: {task.baseScore || 100}
                                {task.completionReward > 0 && ` | +${task.completionReward}`}
                                {task.extensionPenalty > 0 && ` | -${task.extensionPenalty}`}
                                {task.delayPenalty > 0 && ` | -${task.delayPenalty}`}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 font-semibold space-y-2">
                <Search className="h-8 w-8 mx-auto text-slate-300" />
                <h5 className="font-bold text-slate-700 text-sm">Detailed Tasks Reference Map</h5>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  To maintain high site performance, detailed task rows are deferred. Please search/select a specific <strong>Employee</strong> or choose a <strong>Department</strong> to load detailed tasks.
                </p>
              </div>
            )
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Dynamic Performance Insights
            </h4>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {predictiveInsights.slice(0, 5).map((insight, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-xs">{insight.name}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      insight.riskLevel === "Critical" ? "bg-rose-100 text-rose-800" :
                      insight.riskLevel === "High" ? "bg-orange-100 text-orange-800" :
                      insight.riskLevel === "Medium" ? "bg-amber-100 text-amber-800" :
                      "bg-emerald-100 text-emerald-800"
                    }`}>
                      {insight.riskLevel} Risk
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {insight.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-base">
              <AlertOctagon className="h-5 w-5 text-rose-600" />
              SLA Auto-Escalation Status
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="flex-1 font-semibold text-slate-700">24 Hours Delay</span>
                <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  {Math.round(processedStats.activeDelegations * 0.3) || 0} Tasks
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                <span className="flex-1 font-semibold text-slate-700">48 Hours Delay</span>
                <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  {Math.round(processedStats.activeDelegations * 0.1) || 0} Tasks
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="h-2 w-2 rounded-full bg-rose-600"></span>
                <span className="flex-1 font-semibold text-slate-700">72 Hours Escalated</span>
                <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  {processedStats.escalatedTasks} Tasks
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-normal">
              Reminders are dispatched via Email and WhatsApp at each delay threshold.
            </p>
          </div>
        </div>
      </div>
      </>
      )}
      </div>

      {/* 360 Degree Profile Modal */}
      {showProfileModal && activeStaffProfile && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="gradient-bg p-6 text-white flex justify-between items-start">
              <div>
                <span className="bg-white/20 text-white border border-white/20 text-xs font-semibold px-3 py-1 rounded-full">
                  Employee Performance Analytics Profile
                </span>
                <h3 className="text-3xl font-black mt-2 text-white block select-text leading-tight">{activeStaffProfile.name}</h3>
                <p className="text-slate-100 text-xs mt-1 font-medium">{activeStaffProfile.department} | SBH Group of Hospitals</p>
              </div>
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  setSelectedStaffName(null)
                }}
                className="text-white hover:text-white/80 p-1 transition-all cursor-pointer font-bold outline-none"
              >
                <X className="h-7 w-7 stroke-[3]" />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between items-center text-center">
                  <h4 className="font-bold text-slate-700 text-sm">AI Score Engine</h4>
                  <div className="my-4">
                    <span className="text-5xl font-black text-indigo-700">{activeStaffProfile.aiScore}/100</span>
                    <span className="text-slate-400 text-xs block mt-1">Total Score</span>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full font-bold text-xs ${getTierBadge(activeStaffProfile.tier)}`}>
                    {activeStaffProfile.tier} Class
                  </span>
                </div>
 
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 md:col-span-2 flex flex-col justify-between">
                  <h4 className="font-bold text-slate-700 text-sm mb-4">
                    {activeSource === "checklist" ? "Performance Score Breakdown" : "Performance Points Breakdown"}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        {activeSource === "checklist" ? "Completed Checklists" : "Task Completion"}
                      </span>
                      <span className="text-lg font-black text-indigo-600">
                        {activeSource === "checklist" ? `${activeStaffProfile.completedChecklistDays} Days` : `${activeStaffProfile.scoreBreakdown.completion} / 500`}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        {activeSource === "checklist" ? "Missed Checklists" : "Task Quality"}
                      </span>
                      <span className="text-lg font-black text-indigo-600">
                        {activeSource === "checklist" ? `${activeStaffProfile.missedChecklistDays} Days` : `${activeStaffProfile.scoreBreakdown.quality} / 300`}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        {activeSource === "checklist" ? "Missed Logins" : "Login Discipline"}
                      </span>
                      <span className="text-lg font-black text-indigo-600">
                        {activeSource === "checklist" ? `${activeStaffProfile.missedLoginDays} Days` : `${activeStaffProfile.scoreBreakdown.login} / 200`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Analytics Matrix */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-600" />
                  Daily Login Analytics Matrix
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Login Days</span>
                    <span className="text-base font-extrabold text-slate-800">{(loginHistory || []).filter(l => l && l.username && typeof l.username === 'string' && l.username.toLowerCase() === activeStaffProfile.name.toLowerCase()).length} Days</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Missed Logins</span>
                    <span className="text-base font-extrabold text-rose-600">{activeStaffProfile.missedLoginDays} Days</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Current Streak</span>
                    <span className="text-base font-extrabold text-emerald-600">{activeStaffProfile.loginStreak} Days</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Longest Streak</span>
                    <span className="text-base font-extrabold text-indigo-600">{activeStaffProfile.longestStreak} Days</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Points Deducted</span>
                    <span className="text-base font-extrabold text-rose-600">-{activeStaffProfile.loginDeductions} Pts</span>
                  </div>
                </div>
              </div>

              {/* Point Deductions History Log */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h5 className="font-bold text-slate-800 text-sm">Point History & Audit Trail (Deducted / Earned)</h5>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Reason</th>
                        <th className="px-4 py-2">Points Change</th>
                        <th className="px-4 py-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(() => {
                        const staticDeductions = (pointDeductions || [])
                          .filter(d => d && d.username && typeof d.username === "string" && d.username.toLowerCase() === activeStaffProfile.name.toLowerCase())
                          .map(d => ({
                            date: d.date,
                            reason: d.reason,
                            deducted: d.deducted,
                            balance: d.balance
                          }));

                        const dynamicDeductions = (activeStaffProfile.dynamicPointLogs || [])
                          .map(d => ({
                            date: d.date,
                            reason: d.reason,
                            deducted: d.deducted,
                            balance: "—"
                          }));

                        const combined = [...staticDeductions, ...dynamicDeductions];
                        
                        combined.sort((a, b) => {
                          const dateA = parseDateFromDDMMYYYY(a.date) || new Date(0);
                          const dateB = parseDateFromDDMMYYYY(b.date) || new Date(0);
                          return dateB - dateA;
                        });

                        if (combined.length === 0) {
                          return (
                            <tr>
                              <td colSpan="4" className="px-4 py-4 text-center text-slate-400">No point deductions logged. Perfect compliance!</td>
                            </tr>
                          );
                        }

                        return combined.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-medium text-slate-500">{d.date}</td>
                            <td className={`px-4 py-2 font-semibold ${d.deducted < 0 ? "text-emerald-600" : "text-rose-600"}`}>{d.reason}</td>
                            <td className={`px-4 py-2 font-bold ${d.deducted < 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {d.deducted < 0 ? `+${Math.abs(d.deducted)}` : `-${d.deducted}`} pts
                            </td>
                            <td className="px-4 py-2 font-extrabold text-slate-800">{d.balance !== "—" ? `${d.balance} pts` : "—"}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Task Details & Timelines */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h5 className="font-bold text-slate-800 text-sm">Task Timeline & Details Log</h5>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                        <th className="px-4 py-2">Task</th>
                        <th className="px-4 py-2">Timeline Journey</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2 text-center">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {displayTasksList.filter(t => t.assignedTo.toLowerCase() === activeStaffProfile.name.toLowerCase()).map((t, idx) => {
                        const inMargin = isTaskInMarginPeriod(t);
                        const freqCfg = getChecklistFrequencyConfig(t.frequency);
                        // Compute delay days for margin tasks
                        let marginDelay = 0;
                        if (inMargin && t.dueDate) {
                          const due = parseDateFromDDMMYYYY(t.dueDate);
                          if (due) { due.setHours(0,0,0,0); const tod = new Date(); tod.setHours(0,0,0,0); marginDelay = Math.max(0, Math.floor((tod-due)/86400000)); }
                        }
                        const penaltyNow = inMargin ? freqCfg.delayPenalties[Math.min(marginDelay-1,2)] : 0;
                        return (
                        <tr key={idx} className={`hover:bg-slate-50 ${inMargin ? "animate-pulse border-l-2 border-amber-400 bg-amber-50/40" : ""}`}>
                          <td className="px-4 py-2">
                            <p className="font-bold text-slate-800">{t.id}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{t.title}</p>
                            {inMargin && (
                              <p className="text-[9px] font-bold text-amber-600 mt-0.5">
                                ⚠️ Grace Day {marginDelay}/3 · -{penaltyNow} pts
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold">
                              <span>Start: {t.taskStartDate}</span>
                              <span>→</span>
                              <span className="text-indigo-600">Due: {t.dueDate}</span>
                              {t.completionDate && (
                                <>
                                  <span>→</span>
                                  <span className="text-emerald-600">Done: {t.completionDate}</span>
                                </>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 mt-0.5">{t.frequency || "Daily"}</p>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                              t.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                              t.status === "overdue" ? "bg-rose-50 text-rose-700" :
                              inMargin ? "bg-amber-50 text-amber-700 animate-pulse" : "bg-amber-50 text-amber-700"
                            }`}>{inMargin ? `⚠️ Grace (${marginDelay}d)` : t.status}</span>
                          </td>
                          <td className="px-4 py-2 text-center font-extrabold text-slate-800">
                            {activeSource === "checklist"
                              ? (t.status === "completed"
                                  ? `+${freqCfg.points - (Number(t.delayDays)||0 > 0 ? freqCfg.delayPenalties[Math.min(Number(t.delayDays)-1,2)] : 0)}`
                                  : inMargin ? `-${penaltyNow}` : t.status === "overdue" ? `-${freqCfg.points}` : "—")
                              : (t.score ?? 100)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
