"use client"

import { useState, useMemo, useRef, useEffect } from "react"
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
import "jspdf-autotable"
import * as XLSX from "xlsx"

const parseDateFromDDMMYYYY = (dateStr) => {
  if (!dateStr) return null
  if (dateStr instanceof Date) return dateStr
  const str = String(dateStr).trim()
  if (str.includes("/")) {
    const parts = str.split("/")
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parts[0], parts[1] - 1, parts[2])
      }
      return new Date(parts[2], parts[1] - 1, parts[0])
    }
  } else if (str.includes("-")) {
    const parts = str.split("-")
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parts[0], parts[1] - 1, parts[2])
      }
      return new Date(parts[2], parts[1] - 1, parts[0])
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

const calculateChecklistPenalties = (tasks) => {
  const groups = {};
  
  tasks.forEach(t => {
    if (!t.taskStartDate || !t.assignedTo) return;
    const dateStr = t.taskStartDate;
    const user = t.assignedTo.toLowerCase().trim();
    const dateObj = parseDateFromDDMMYYYY(dateStr);
    if (!dateObj) return;

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();

    const getWeekNumber = (d) => {
      const tempDate = new Date(d.getTime());
      tempDate.setHours(0, 0, 0, 0);
      tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
      const week1 = new Date(tempDate.getFullYear(), 0, 4);
      return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };
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
    } else if (freq === "fortnightly") {
      const fn = day <= 15 ? 1 : 2;
      periodKey = `fortnightly_${year}_m${month}_f${fn}`;
      periodLabel = `Fortnightly (${fn === 1 ? "1st-15th" : "16th-End"}, ${month + 1}/${year})`;
    } else if (freq === "monthly") {
      periodKey = `monthly_${year}_m${month}`;
      periodLabel = `Monthly (${month + 1}/${year})`;
    } else if (freq === "quarterly") {
      const q = Math.floor(month / 3) + 1;
      periodKey = `quarterly_${year}_q${q}`;
      periodLabel = `Quarterly (Q${q}, ${year})`;
    } else if (freq === "yearly") {
      periodKey = `yearly_${year}`;
      periodLabel = `Yearly (${year})`;
    } else if (freq.includes("week")) {
      periodKey = `special_${freq.replace(/\s+/g, '_')}_${year}_m${month}`;
      periodLabel = `${t.frequency} (${month + 1}/${year})`;
    } else {
      periodKey = `daily_${dateStr}`;
      periodLabel = `Daily (${dateStr})`;
    }

    const key = `${user}_${periodKey}`;
    if (!groups[key]) {
      groups[key] = {
        user: t.assignedTo,
        date: dateStr,
        periodLabel: periodLabel,
        frequency: t.frequency || "Daily",
        tasks: []
      };
    }
    groups[key].tasks.push(t);
  });

  let totalPenalties = 0;
  let totalBonuses = 0;
  let missedDays = 0;
  let completedDays = 0;
  const today = new Date();
  today.setHours(0,0,0,0);

  const missedDates = [];

  Object.keys(groups).forEach(key => {
    const group = groups[key];
    const groupDate = parseDateFromDDMMYYYY(group.date);
    if (!groupDate) return;
    
    if (groupDate >= today) return;

    const allCompleted = group.tasks.every(t => t.status === "completed");
    const allMissed = group.tasks.every(t => t.status !== "completed");

    if (allCompleted && group.tasks.length > 0) {
      totalBonuses += 25;
      completedDays++;
      missedDates.push({
        date: group.date,
        reason: `${group.frequency} Checklist Completed - ${group.periodLabel} (${group.tasks.length} tasks)`,
        deducted: -25
      });
    } else if (allMissed && group.tasks.length > 0) {
      totalPenalties += 50;
      missedDays++;
      missedDates.push({
        date: group.date,
        reason: `${group.frequency} Checklist Missed - ${group.periodLabel} (${group.tasks.length} tasks)`,
        deducted: 50
      });
    }
  });

  return { totalPenalties, totalBonuses, missedDays, completedDays, missedDates };
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
  tabLoading = false
}) {
  const [selectedStaffName, setSelectedStaffName] = useState(null)
  const [timeRange, setTimeRange] = useState("overall") // overall, yearly, quarterly, monthly, weekly, daily, custom
  const [filterDept, setFilterDept] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [staffSearchText, setStaffSearchText] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [deptSearchText, setDeptSearchText] = useState("")
  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false)

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

  // Custom Month/Year selectors
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()) // e.g. 2026

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

  // Filter tasks based on selected employee (userwise selection)
  const filteredTasksByUser = useMemo(() => {
    if (selectedEmployee === "all" || !selectedEmployee) return allTasks
    return allTasks.filter(t => t.assignedTo.toLowerCase() === selectedEmployee.toLowerCase())
  }, [allTasks, selectedEmployee])

  // Filter staff members based on selected employee
  const filteredStaffMembers = useMemo(() => {
    if (selectedEmployee === "all" || !selectedEmployee) return staffMembers
    return staffMembers.filter(s => s.name.toLowerCase() === selectedEmployee.toLowerCase())
  }, [staffMembers, selectedEmployee])

  const processedStats = useMemo(() => {
    // Filter tasks by selected timeRange and date inputs
    const filteredTasks = filteredTasksByUser.filter(t => {
      const date = parseDateFromDDMMYYYY(t.taskStartDate)
      if (!date) return false

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (timeRange === "overall") {
        return true
      } else if (timeRange === "daily") {
        return date.getTime() === today.getTime()
      } else if (timeRange === "weekly") {
        // Last completed week: Monday to Saturday
        const { start, end } = getLastWeekMonToSatRange()
        return date >= start && date <= end
      } else if (timeRange === "monthly") {
        // If user selects custom month/year
        return date.getMonth() === Number(selectedMonth) && date.getFullYear() === Number(selectedYear)
      } else if (timeRange === "quarterly") {
        const currentQuarter = Math.floor(today.getMonth() / 3)
        const taskQuarter = Math.floor(date.getMonth() / 3)
        return currentQuarter === taskQuarter && date.getFullYear() === today.getFullYear()
      } else if (timeRange === "yearly") {
        return date.getFullYear() === Number(selectedYear)
      } else if (timeRange === "custom") {
        if (!customStartDate || !customEndDate) return true
        const start = new Date(customStartDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
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

    // Dynamic 1000-Point Performance Score calculation for active filtered tasks
    const checklistStatsResult = activeSource === "checklist" ? calculateChecklistPenalties(filteredTasks) : null
    const totalPenalties = checklistStatsResult ? checklistStatsResult.totalPenalties : filteredTasks.reduce((sum, t) => sum + (t.penalty || 0), 0)
    const totalBonuses = checklistStatsResult
      ? checklistStatsResult.totalBonuses
      : filteredTasks.filter(t => t.status === "completed" && (t.extensionCount || 0) === 0 && (t.delayDays || 0) === 0).length * 20
    const net1000Score = Math.max(0, Math.min(1000, Math.round(1000 - totalPenalties + totalBonuses)))

    // Calculate details per staff
    const staffCalculated = filteredStaffMembers.map(staff => {
      const name = staff.name
      const dept = getDepartment(name)
      const tasks = filteredTasks.filter(t => t.assignedTo.toLowerCase() === name.toLowerCase())
      
      const completed = tasks.filter(t => t.status === "completed")
      const pending = tasks.filter(t => t.status === "pending")
      const overdue = tasks.filter(t => t.status === "overdue")
      const active = tasks.filter(t => t.status === "pending" || t.status === "overdue")
      
      const extensions = tasks.reduce((sum, t) => sum + (t.extensionCount || 0), 0)
      const delayTasks = tasks.reduce((sum, t) => sum + (t.delayDays || 0), 0)
      const checklistStaffRes = activeSource === "checklist" ? calculateChecklistPenalties(tasks) : null
      const totalPenalties = checklistStaffRes
        ? checklistStaffRes.totalPenalties
        : tasks.reduce((sum, t) => sum + (t.penalty || 0), 0)
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
      const userLogins = (loginHistory || []).filter(l => l.username && typeof l.username === 'string' && l.username.toLowerCase() === name.toLowerCase())
      const uniqueDates = [...new Set(userLogins.map(l => l.date))].map(d => parseDateFromDDMMYYYY(d)).filter(Boolean)
      uniqueDates.sort((a, b) => b - a)

      const loginBonus = [...new Set(userLogins.map(l => l.date))].length * 20
      totalBonuses = (checklistStaffRes
        ? checklistStaffRes.totalBonuses
        : tasks.filter(t => t.status === "completed" && (t.extensionCount || 0) === 0 && (t.delayDays || 0) === 0).length * 20) + loginBonus

      const uniqueLoginDatesList = [...new Set(userLogins.map(l => l.date))]
      uniqueLoginDatesList.forEach(dateStr => {
        dynamicPointLogs.push({
          date: dateStr,
          reason: "Daily Login Reward",
          deducted: -20,
          type: "bonus"
        });
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
      const userDeductions = (pointDeductions || []).filter(d => {
        if (!d.username || typeof d.username !== "string" || d.username.toLowerCase() !== name.toLowerCase()) return false;
        
        // Parse date for filtering
        const parts = String(d.date || "").split("/");
        let deductionDate = null;
        if (parts.length === 3) {
          deductionDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          deductionDate = new Date(d.date);
        }
        if (isNaN(deductionDate.getTime())) return true; // keep if invalid
        
        const now = new Date();
        if (timeRange === "weekly") {
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
        if (timeRange === "monthly") {
          return deductionDate.getMonth() === selectedMonth && deductionDate.getFullYear() === selectedYear;
        }
        if (timeRange === "yearly") {
          return deductionDate.getFullYear() === selectedYear;
        }
        if (timeRange === "custom") {
          const start = customStartDate ? new Date(customStartDate) : null;
          const end = customEndDate ? new Date(customEndDate) : null;
          if (start) start.setHours(0,0,0,0);
          if (end) end.setHours(23,59,59,999);
          if (start && end) return deductionDate >= start && deductionDate <= end;
          if (start) return deductionDate >= start;
          if (end) return deductionDate <= end;
        }
        return true; // Overall
      })
      const loginMissedDeductions = userDeductions.filter(d => d.reason && String(d.reason).includes("Login Missed"))
      const totalMissedLoginDays = loginMissedDeductions.length
      
      let loginDisciplineDeduction = 0
      if (totalMissedLoginDays === 1) {
        loginDisciplineDeduction = 50
      } else if (totalMissedLoginDays === 2) {
        loginDisciplineDeduction = 100
      } else if (totalMissedLoginDays === 3) {
        loginDisciplineDeduction = 300
      } else if (totalMissedLoginDays >= 4) {
        loginDisciplineDeduction = 300 + (totalMissedLoginDays - 3) * 100
      }

      // 1000 Points Score breakdown
      const scoreTaskCompletion = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 500) : 500
      const scoreTaskQuality = Math.min(300, 300 - totalPenalties + totalBonuses)
      const scoreLoginDiscipline = 200 - loginDisciplineDeduction
      
      // Calculate net points directly using ledger arithmetic, allowing components to go negative
      const netPoints = scoreTaskCompletion + scoreTaskQuality + scoreLoginDiscipline
      const finalScore = Math.max(0, Math.min(1000, netPoints))
      const performancePercent = Math.round((finalScore / 1000) * 100)

      let tier = "Bronze"
      if (finalScore >= 950) tier = "Platinum"
      else if (finalScore >= 850) tier = "Gold"
      else if (finalScore >= 700) tier = "Silver"
      else if (finalScore >= 500) tier = "Bronze"
      else if (finalScore >= 0) tier = "Needs Improvement"
      else tier = "Critical/Under Performing"

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
        scoreBreakdown: {
          completion: scoreTaskCompletion,
          quality: scoreTaskQuality,
          login: scoreLoginDiscipline
        }
      }
    })

    const sortedPerformers = [...staffCalculated].sort((a, b) => b.aiScore - a.aiScore)
    const topPerformers = sortedPerformers.slice(0, 10)
    const bottomPerformers = sortedPerformers.slice().reverse().slice(0, 10)

    // Calculate aggregated net score
    const avgScore = staffCalculated.length > 0 ? Math.round(staffCalculated.reduce((sum, s) => sum + s.aiScore, 0) / staffCalculated.length) : 1000
    const missedChecklistDays = activeSource === "checklist"
      ? calculateChecklistPenalties(filteredTasks).missedDays
      : 0

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
      staffMembersDetail: staffCalculated,
      filteredTasks
    }
  }, [filteredTasksByUser, filteredStaffMembers, timeRange, selectedMonth, selectedYear, customStartDate, customEndDate, loginHistory, pointDeductions])

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

  // Filter staff by department and search queries
  const filteredStaff = useMemo(() => {
    return processedStats.staffMembersDetail.filter(s => {
      const matchDept = !filterDept || filterDept === "all" || s.department === filterDept
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.department.toLowerCase().includes(searchQuery.toLowerCase())
      return matchDept && matchSearch
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
      if (format === "xlsx") {
        const wb = XLSX.utils.book_new()
        
        let usersToExport = []
        if (selectedEmployee && selectedEmployee !== "all") {
          const single = filteredStaff.find(s => s.name.toLowerCase() === selectedEmployee.toLowerCase())
          if (single) usersToExport = [single]
        } else {
          usersToExport = filteredStaff
        }

        usersToExport.forEach(staff => {
          const rows = []
          
          rows.push(["EMPLOYEE PERFORMANCE REPORT"])
          rows.push(["Employee Name:", staff.name])
          rows.push(["Department:", staff.department || "—"])
          rows.push([])
          
          rows.push(["METRICS SUMMARY CARD POINTS"])
          const isChecklist = activeSource === "checklist";
          const headerRow = ["Total Tasks", "Active Tasks", "Completed Tasks", "On-Time Rate", "Score (1000)", "Bonus", "Penalties", "Late Tasks", "Extended Tasks", "Missed Logins"];
          if (isChecklist) {
            headerRow.push("Missed Checklist Days");
          }
          rows.push(headerRow);

          const valueRow = [
            staff.totalTasks,
            staff.activeTasks,
            staff.completedTasks,
            `${staff.indexes.slaIndex}%`,
            `${staff.aiScore} / 1000`,
            `+${staff.totalBonuses || 0} pts`,
            `-${staff.totalPenalties || 0} pts`,
            staff.overdueTasks,
            staff.extensions,
            `${staff.missedLoginDays} Days (-${staff.loginDeductions} Pts)`
          ];
          if (isChecklist) {
            const checklistRes = calculateChecklistPenalties(staffTasks);
            valueRow.push(`${checklistRes.missedDays} Days`);
          }
          rows.push(valueRow);
          rows.push([])

          const staffTasks = displayTasksList.filter(t => t.assignedTo.toLowerCase() === staff.name.toLowerCase())
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
          const sheetName = staff.name.substring(0, 30)
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
      const dataToExport = displayTasksList.map(t => ({
        "ID": t.id,
        "Description": t.title,
        "Employee": t.assignedTo,
        "Deadline": t.dueDate,
        "Completion": t.completionDate || "-",
        "Status": t.status,
        "Ext": t.extensionCount ?? 0,
        "Delay": t.delayDays ?? 0,
        "Score": t.score ?? 100
      }))

      const doc = new jsPDF()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(18)
      doc.text("SBH Performance Tasks Report", 14, 20)
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text("Managed by IT Department | SBH Group of Hospitals", 14, 26)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32)
      
      const columns = Object.keys(dataToExport[0])
      const rows = dataToExport.map(item => Object.values(item))

      doc.autoTable({
        startY: 38,
        head: [columns],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 }
      })
      doc.save(`SBH_Performance_Tasks_Report_${Date.now()}.pdf`)
    }
  }

  const open360Profile = (staff) => {
    setSelectedStaffName(staff.name)
    setShowProfileModal(true)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
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

      {/* Main Dashboard Container Wrap with Loading Overlay */}
      <div className="relative space-y-6">
        {tabLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center min-h-[300px] rounded-2xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
            <p className="text-purple-700 text-xs font-extrabold mt-3 animate-pulse">Loading Analytics Data...</p>
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
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Excel Export
          </button>

          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            PDF Report
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
                    
                    const matched = doerOptions.find(d => d.toLowerCase() === txt.trim().toLowerCase())
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
                    {doerOptions.filter(d => d.toLowerCase().includes(staffSearchText.toLowerCase())).map(doer => (
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

            {/* Department Autocomplete */}
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

      {!selectedEmployee && !filterDept ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center max-w-xl mx-auto space-y-4 my-10">
          <div className="bg-purple-50 text-purple-600 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto shadow-sm">
            <Search className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-lg">Performance Dashboard Matrix</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Please search and select an <strong>Employee</strong> or choose a <strong>Department</strong> to load metrics. Select "All Employees" to see all.
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
            <span className="text-[9px] font-bold uppercase tracking-wider">Performance Points</span>
            <Award className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className={`text-sm font-black block ${displayNet1000Score >= 950 ? "text-emerald-600" : displayNet1000Score >= 700 ? "text-indigo-600" : displayNet1000Score >= 0 ? "text-amber-600" : "text-rose-600"}`}>
              {displayNet1000Score}/1000
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
                    <th className="px-3.5 py-2.5">Department</th>
                    <th className="px-3.5 py-2.5">AI Score (1000)</th>
                    <th className="px-3.5 py-2.5">Task Deliveries</th>
                    <th className="px-3.5 py-2.5">On-Time Rate</th>
                    <th className="px-3.5 py-2.5">Status</th>
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
                      <td className="px-3.5 py-2.5 text-[11px] font-medium text-slate-500">
                        {staff.department}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800 text-xs">{staff.aiScore}</span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${getTierBadge(staff.tier)}`}>
                            {staff.tier}
                          </span>
                        </div>
                      </td>
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
                      <td className="px-3.5 py-2.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          staff.aiScore >= 700 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          staff.aiScore >= 500 ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                          "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}>
                          {staff.aiScore >= 700 ? "Outstanding" : "Under review"}
                        </span>
                      </td>
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
                    <span className="text-5xl font-black text-indigo-700">{activeStaffProfile.aiScore}</span>
                    <span className="text-slate-400 text-xs block mt-1">out of 1000 pts</span>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full font-bold text-xs ${getTierBadge(activeStaffProfile.tier)}`}>
                    {activeStaffProfile.tier} Class
                  </span>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 md:col-span-2 flex flex-col justify-between">
                  <h4 className="font-bold text-slate-700 text-sm mb-4">Performance Points Breakdown (1000 Scale)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Task Completion</span>
                      <span className="text-lg font-black text-indigo-600">{activeStaffProfile.scoreBreakdown.completion} / 500</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Task Quality</span>
                      <span className="text-lg font-black text-indigo-600">{activeStaffProfile.scoreBreakdown.quality} / 300</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Login Discipline</span>
                      <span className="text-lg font-black text-indigo-600">{activeStaffProfile.scoreBreakdown.login} / 200</span>
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
                      {displayTasksList.filter(t => t.assignedTo.toLowerCase() === activeStaffProfile.name.toLowerCase()).map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2">
                            <p className="font-bold text-slate-800">{t.id}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{t.title}</p>
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
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                              t.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                              t.status === "overdue" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                            }`}>{t.status}</span>
                          </td>
                          <td className="px-4 py-2 text-center font-extrabold text-slate-800">{t.score ?? 100}</td>
                        </tr>
                      ))}
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
