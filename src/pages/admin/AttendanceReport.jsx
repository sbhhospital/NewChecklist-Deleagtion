"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  Calendar as CalendarIcon,
  Search,
  Download,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  Sparkles,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import sbhLogo from "../../assets/logo.png"

const CONFIG = {
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec",
  MAIN_SPREADSHEET_ID: "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0"
}

export default function AttendanceReport() {
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [error, setError] = useState(null)

  const [funnyMsg, setFunnyMsg] = useState("🏥 Updating SBH Group of Hospitals analytics...")
  useEffect(() => {
    if (!loading) return
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
  }, [loading])
  
  // Data lists
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [staffList, setStaffList] = useState([])
  const [deductions, setDeductions] = useState([])
  const [leavesList, setLeavesList] = useState([])
  
  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [timeRange, setTimeRange] = useState("overall") // overall, yearly, monthly, weekly, custom
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [staffSearchText, setStaffSearchText] = useState("")

  const employeeRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (employeeRef.current && !employeeRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("touchstart", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("touchstart", handleOutsideClick)
    }
  }, [])

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch Attendance logs
      const attRes = await fetch(
        `https://docs.google.com/spreadsheets/d/${CONFIG.MAIN_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Attendance`
      )
      if (!attRes.ok) throw new Error("Failed to load attendance logs")
      const attText = await attRes.text()
      const attJson = JSON.parse(attText.substring(attText.indexOf("{"), attText.lastIndexOf("}") + 1))
      
      const parsedLogs = attJson.table.rows.map(row => {
        const getVal = (colIdx) => {
          if (!row || !row.c || !row.c[colIdx]) return "";
          return row.c[colIdx].f || row.c[colIdx].v || "";
        };
        return {
          date: getVal(0),
          username: getVal(1),
          status: getVal(2),
          loginTime: getVal(3),
          ip: getVal(4),
          browser: getVal(5),
          device: getVal(6)
        };
      })

      const masterRes = await fetch(
        `https://docs.google.com/spreadsheets/d/${CONFIG.MAIN_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Whatsapp`
      )
      if (!masterRes.ok) throw new Error("Failed to load master employees")
      const masterText = await masterRes.text()
      const masterJson = JSON.parse(masterText.substring(masterText.indexOf("{"), masterText.lastIndexOf("}") + 1))
      
      const parsedStaff = masterJson.table.rows.slice(1).map(row => ({
        username: String(row.c[2]?.v || "").trim(),
        department: String(row.c[1]?.v || "").trim(),
        role: String(row.c[4]?.v || "").trim().toLowerCase()
      })).filter(s => s.username && s.role !== "inactive" && s.role !== "in active")

      // Fetch point deductions
      const dedRes = await fetch(
        `https://docs.google.com/spreadsheets/d/${CONFIG.MAIN_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Point%20Deductions`
      )
      let parsedDeductions = []
      if (dedRes.ok) {
        const dedText = await dedRes.text()
        const dedJson = JSON.parse(dedText.substring(dedText.indexOf("{"), dedText.lastIndexOf("}") + 1))
        parsedDeductions = dedJson.table.rows.slice(1).map(row => {
          const getVal = (colIdx) => {
            if (!row || !row.c || !row.c[colIdx]) return "";
            return row.c[colIdx].f || row.c[colIdx].v || "";
          };
          return {
            date: getVal(0),
            username: getVal(1),
            reason: getVal(2),
            deducted: Number(getVal(3)) || 0,
            balance: Number(getVal(4)) || 0
          };
        })
      }

      // Fetch Leaves
      const leavesRes = await fetch(
        `https://docs.google.com/spreadsheets/d/${CONFIG.MAIN_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Leaves`
      )
      let parsedLeaves = []
      if (leavesRes.ok) {
        const leavesText = await leavesRes.text()
        const leavesJson = JSON.parse(leavesText.substring(leavesText.indexOf("{"), leavesText.lastIndexOf("}") + 1))
        
        const parseGVizDateValue = (cell) => {
          if (!cell) return null;
          if (cell.v) {
            if (typeof cell.v === "string" && cell.v.startsWith("Date(2")) {
              const match = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/);
              if (match) {
                return new Date(Number(match[1]), Number(match[2]), Number(match[3]));
              }
            }
            const d = new Date(cell.v);
            if (!isNaN(d.getTime())) return d;
          }
          if (cell.f) {
            const d = parseDateStr(cell.f);
            if (d) return d;
          }
          return null;
        };

        if (leavesJson && leavesJson.table && leavesJson.table.rows) {
          leavesJson.table.rows.forEach(row => {
            if (row.c) {
              const uName = row.c[1] && row.c[1].v ? String(row.c[1].v).trim().toLowerCase() : "";
              const startDateObj = parseGVizDateValue(row.c[2]);
              const endDateObj = parseGVizDateValue(row.c[3]);
              const targetSheet = row.c[4] && row.c[4].v ? String(row.c[4].v).trim() : "both";
              if (uName && startDateObj && endDateObj) {
                parsedLeaves.push({
                  username: uName,
                  startDate: startDateObj,
                  endDate: endDateObj,
                  targetSheet
                });
              }
            }
          })
        }
      }

      setAttendanceLogs(parsedLogs)
      setStaffList(parsedStaff)
      setDeductions(parsedDeductions)
      setLeavesList(parsedLeaves)
    } catch (err) {
      console.error(err)
      setError(err.message || "Something went wrong loading attendance records.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Helper date parsing DD/MM/YYYY
  const parseDateStr = (dateStr) => {
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
  }

  const formatDateToVIP = (dateInput) => {
    if (!dateInput) return "—"
    const d = parseDateStr(dateInput)
    if (!d) return dateInput
    const months = ["July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May", "June"] // Sort of, let's use standard:
    const standardMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const day = String(d.getDate()).padStart(2, "0")
    const monthStr = standardMonths[d.getMonth()]
    const year = d.getFullYear()
    return `${day}-${monthStr}-${year}`
  }

  // Helper to check if user is on leave on a given date (for UI/State)
  const isUserOnLeaveLocal = (username, dateStr) => {
    if (!dateStr || !username) return false;
    const d = parseDateStr(dateStr);
    if (!d) return false;
    d.setHours(0,0,0,0);
    
    return leavesList.some(l => {
      if (l.username.toLowerCase() !== username.toLowerCase()) return false;
      const start = new Date(l.startDate);
      start.setHours(0,0,0,0);
      const end = new Date(l.endDate);
      end.setHours(23,59,59,999);
      return d >= start && d <= end;
    });
  };

  // Filter logs by selection
  const filteredLogs = useMemo(() => {
    if (!selectedEmployee) return []
    let result = attendanceLogs

    // Employee Filter
    if (selectedEmployee && selectedEmployee !== "all") {
      result = result.filter(l => l && l.username && typeof l.username === "string" && l.username.toLowerCase() === selectedEmployee.toLowerCase())
    }

    // Search Query (Date/Status/Username)
    if (searchQuery) {
      const sq = searchQuery.toLowerCase()
      result = result.filter(l => 
        (l.date && l.date.toLowerCase().includes(sq)) ||
        (l.username && typeof l.username === "string" && l.username.toLowerCase().includes(sq)) ||
        (l.status && typeof l.status === "string" && l.status.toLowerCase().includes(sq))
      )
    }

    // Time-range Filters
    const now = new Date()
    result = result.filter(l => {
      const d = parseDateStr(l.date)
      if (!d) return true // skip invalid date rows securely

      if (timeRange === "weekly") {
        // Monday to Saturday of the current week
        const currentDay = now.getDay()
        const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay
        const monday = new Date(now)
        monday.setDate(now.getDate() + distanceToMon)
        monday.setHours(0,0,0,0)

        const saturday = new Date(monday)
        saturday.setDate(monday.getDate() + 5)
        saturday.setHours(23,59,59,999)

        return d >= monday && d <= saturday
      }

      if (timeRange === "monthly") {
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
      }

      if (timeRange === "yearly") {
        return d.getFullYear() === selectedYear
      }

      if (timeRange === "custom") {
        const start = customStartDate ? new Date(customStartDate) : null
        const end = customEndDate ? new Date(customEndDate) : null
        if (start) start.setHours(0,0,0,0)
        if (end) end.setHours(23,59,59,999)

        if (start && end) return d >= start && d <= end
        if (start) return d >= start
        if (end) return d <= end
      }

      return true // Overall
    })

    // Map logs to override status to Leave if they were on leave
    const mapped = result.map(l => {
      const onLeave = isUserOnLeaveLocal(l.username, l.date)
      return {
        ...l,
        status: onLeave ? "Leave" : l.status
      }
    })

    // Sort by date descending
    return [...mapped].sort((a,b) => {
      const dA = parseDateStr(a.date)
      const dB = parseDateStr(b.date)
      if (!dA || !dB) return 0
      return dB.getTime() - dA.getTime()
    })
  }, [attendanceLogs, selectedEmployee, searchQuery, timeRange, customStartDate, customEndDate, selectedMonth, selectedYear, leavesList])

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = filteredLogs.length
    const present = filteredLogs.filter(l => l && l.status && String(l.status).toLowerCase() === "present").length
    const leaveDays = filteredLogs.filter(l => l && l.status && String(l.status).toLowerCase() === "leave").length
    const rate = total > 0 ? Math.round((present / total) * 100) : 100

    // Calculate Streak (from sorted logs, skipping leaves without breaking it)
    let currentStreak = 0
    const sortedAsc = [...filteredLogs].sort((a,b) => {
      const dA = parseDateStr(a.date)
      const dB = parseDateStr(b.date)
      if (!dA || !dB) return 0
      return dA.getTime() - dB.getTime()
    })
    
    for (let i = sortedAsc.length - 1; i >= 0; i--) {
      const statusLower = sortedAsc[i] && sortedAsc[i].status ? String(sortedAsc[i].status).toLowerCase() : "";
      if (statusLower === "present") {
        currentStreak++
      } else if (statusLower === "leave") {
        continue // Skip leave without breaking the streak
      } else {
        break
      }
    }

    // Calculate deductions ignoring leave dates
    const userDeds = deductions.filter(d => {
      if (!d || !d.username || !selectedEmployee) return false;
      if (selectedEmployee !== "all" && d.username.toLowerCase() !== selectedEmployee.toLowerCase()) return false;
      return true;
    })

    // Filter range for deductions
    const rangeFilteredDeds = userDeds.filter(d => {
      const dateVal = parseDateStr(d.date)
      if (!dateVal) return false
      const now = new Date()
      if (timeRange === "weekly") {
        const currentDay = now.getDay()
        const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay
        const monday = new Date(now)
        monday.setDate(now.getDate() + distanceToMon)
        monday.setHours(0,0,0,0)
        const saturday = new Date(monday)
        saturday.setDate(monday.getDate() + 5)
        saturday.setHours(23,59,59,999)
        return dateVal >= monday && dateVal <= saturday
      }
      if (timeRange === "monthly") {
        return dateVal.getMonth() === selectedMonth && dateVal.getFullYear() === selectedYear
      }
      if (timeRange === "yearly") {
        return dateVal.getFullYear() === selectedYear
      }
      if (timeRange === "custom") {
        const start = customStartDate ? new Date(customStartDate) : null
        const end = customEndDate ? new Date(customEndDate) : null
        if (start) start.setHours(0,0,0,0)
        if (end) end.setHours(23,59,59,999)
        if (start && end) return dateVal >= start && dateVal <= end
        if (start) return dateVal >= start
        if (end) return dateVal <= end
      }
      return true
    })

    // Count unique missed dates (not on leave)
    const checklistMissedDates = new Set()
    const delegationMissedDates = new Set()
    const totalMissedDates = new Set()

    rangeFilteredDeds.forEach(d => {
      const reason = d.reason ? String(d.reason) : ""
      if (reason.includes("Login Missed")) {
        const dDate = d.date ? String(d.date).trim() : ""
        if (dDate) {
          if (!isUserOnLeaveLocal(d.username, dDate)) {
            totalMissedDates.add(dDate)
            if (reason.includes("Checklist")) {
              checklistMissedDates.add(dDate)
            }
            if (reason.includes("Delegation")) {
              delegationMissedDates.add(dDate)
            }
          }
        }
      }
    })

    const checklistPenalty = checklistMissedDates.size * 5
    const delegationPenalty = delegationMissedDates.size * 5
    const totalPenalty = checklistPenalty + delegationPenalty

    const getRangeDays = () => {
      const now = new Date()
      if (timeRange === "weekly") {
        return 6;
      }
      if (timeRange === "monthly") {
        const year = selectedYear;
        const month = selectedMonth;
        const lastDay = new Date(year, month + 1, 0).getDate();
        if (now.getFullYear() === year && now.getMonth() === month) {
          return now.getDate();
        }
        return lastDay;
      }
      if (timeRange === "yearly") {
        if (now.getFullYear() === selectedYear) {
          const start = new Date(selectedYear, 0, 1);
          const diffTime = Math.abs(now - start);
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        return 365;
      }
      if (timeRange === "custom") {
        const start = customStartDate ? new Date(customStartDate) : null;
        const end = customEndDate ? new Date(customEndDate) : null;
        if (start && end) {
          const diffTime = Math.abs(end - start);
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
        return 0;
      }
      if (timeRange === "overall") {
        if (attendanceLogs.length === 0) return 0;
        const dates = attendanceLogs.map(l => parseDateStr(l.date)).filter(Boolean);
        if (dates.length === 0) return 0;
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const diffTime = Math.abs(maxDate - minDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
      return 0;
    };

    const rangeDays = getRangeDays();

    return { total, present, absent: totalMissedDates.size, rate, currentStreak, totalDeductions: totalPenalty, checklistPenalty, delegationPenalty, leaveDays, rangeDays }
  }, [filteredLogs, selectedEmployee, deductions, leavesList, timeRange, selectedMonth, selectedYear, customStartDate, customEndDate, attendanceLogs])

  // Dynamic user suggestions (Only active users in the WhatsApp/staff list)
  const employeeNames = useMemo(() => {
    const list = new Set()
    staffList.forEach(s => {
      if (s.username) list.add(s.username.trim())
    })
    return Array.from(list)
  }, [staffList])

  const handleSelectStaff = (name) => {
    setSelectedEmployee(name)
    setStaffSearchText(name)
    setShowSuggestions(false)
  }

  // Custom Excel Exports based on Time ranges
  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new()
    const employeeTitle = selectedEmployee === "all" ? "All Employees" : selectedEmployee
    const timestampStr = new Date().toLocaleDateString()

    // 1. Overall / Custom export sheet
    if (timeRange === "overall" || timeRange === "custom") {
      const rows = [
        ["SBH ATTENDANCE COMPLIANCE REPORT"],
        ["Employee Profile:", employeeTitle],
        ["Generated Date:", timestampStr],
        ["Time Range:", timeRange === "overall" ? "Overall History" : `${customStartDate} to ${customEndDate}`],
        [],
        ["SUMMARY PERFORMANCE INDEX"],
        ["Total Recorded Days", "Days Present", "Approved Leave Days", "Days Absent", "Compliance Rate (%)", "Current Streak", "Point Deductions"],
        [stats.total, stats.present, stats.leaveDays, stats.absent, `${stats.rate}%`, `${stats.currentStreak} Days`, `-${stats.totalDeductions} Pts`],
        [],
        ["DETAILED DAILY ATTENDANCE RECORDS"],
        ["Date", "Username", "Status", "First Login Time", "IP Address", "Browser", "Device"]
      ]

      filteredLogs.forEach(l => {
        rows.push([l.date, l.username, l.status, l.loginTime, l.ip, l.browser, l.device])
      })

      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, "Attendance Sheet")
    }

    // 2. Weekly (Mon to Sat layout)
    else if (timeRange === "weekly") {
      const rows = [
        ["WEEKLY WORKFORCE ATTENDANCE MATRIX"],
        ["Employee Profile:", employeeTitle],
        ["Time Range:", "Weekly (Monday to Saturday)"],
        ["Generated Date:", timestampStr],
        [],
        ["ATTENDANCE CARD SUMMARY"],
        ["Total Days", "Present Days", "Approved Leave Days", "Absent Days", "Attendance Rate"],
        [stats.total, stats.present, stats.leaveDays, stats.absent, `${stats.rate}%`],
        [],
        ["WEEKLY CALENDAR LAYOUT"],
        ["Date", "Username", "Status", "First Check-In", "Device Info"]
      ]

      filteredLogs.forEach(l => {
        rows.push([l.date, l.username, l.status, l.loginTime, `${l.device} (${l.browser})`])
      })

      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, "Weekly Calendar")
    }

    // 3. Monthly (Count of login/absent + absent dates list)
    else if (timeRange === "monthly") {
      const absentDays = filteredLogs
        .filter(l => l && l.status && String(l.status).toLowerCase() === "absent")
        .map(l => l.date)

      const leaveDays = filteredLogs
        .filter(l => l && l.status && String(l.status).toLowerCase() === "leave")
        .map(l => l.date)

      const rows = [
        ["MONTHLY ATTENDANCE COMPLIANCE SUMMARY"],
        ["Employee Name:", employeeTitle],
        ["Month / Year:", `${selectedMonth + 1} / ${selectedYear}`],
        ["Generated Date:", timestampStr],
        [],
        ["ATTENDANCE LOG MATRIX"],
        ["Days Present", "Approved Leave Days", "Days Absent", "Compliance Rate", "Current Compliance Rating"],
        [stats.present, stats.leaveDays, stats.absent, `${stats.rate}%`, stats.rate >= 90 ? "Excellent" : stats.rate >= 75 ? "Satisfactory" : "Under review"],
        [],
        ["MISSED LOGIN COMPLIANCE ESCALATIONS"],
        ["Absent Date", "Escalation Status"],
        ...absentDays.map(date => [date, "Deducted -50 points"])
      ]

      if (absentDays.length === 0) {
        rows.push(["Perfect monthly login compliance! No missed logins detected.", ""])
      }

      if (leaveDays.length > 0) {
        rows.push([], ["APPROVED LEAVE RECORDS"], ["Leave Date", "Status"])
        leaveDays.forEach(date => {
          rows.push([date, "Approved Leave - No Penalty"])
        })
      }

      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary")
    }

    // 4. Yearly (Month-by-month present vs absent counts)
    else if (timeRange === "yearly") {
      const monthlySummary = Array.from({ length: 12 }, (_, i) => {
        const monthLogs = filteredLogs.filter(l => {
          const d = parseDateStr(l.date)
          return d && d.getMonth() === i
        })
        const present = monthLogs.filter(l => l && l.status && String(l.status).toLowerCase() === "present").length
        const leave = monthLogs.filter(l => l && l.status && String(l.status).toLowerCase() === "leave").length
        const absent = monthLogs.filter(l => l && l.status && String(l.status).toLowerCase() === "absent").length
        return {
          month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][i],
          present,
          leave,
          absent
        }
      })

      const rows = [
        ["YEARLY WORKFORCE LOGIN MATRIX"],
        ["Employee Profile:", employeeTitle],
        ["Year:", selectedYear],
        ["Generated Date:", timestampStr],
        [],
        ["MONTH-BY-MONTH SUMMARY STATISTICS"],
        ["Month", "Present Days", "Approved Leave Days", "Absent Days", "Total Days", "Compliance Rate"],
        ...monthlySummary.map(m => {
          const total = m.present + m.leave + m.absent
          const rate = total > 0 ? `${Math.round((m.present / total) * 100)}%` : "—"
          return [m.month, m.present, m.leave, m.absent, total, rate]
        })
      ]

      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, "Yearly Performance")
    }

    XLSX.writeFile(wb, `SBH_Attendance_Report_${employeeTitle.replace(/\s+/g, "_")}.xlsx`)
  }

  const handleDownloadPDF = () => {
    const img = new Image()
    img.src = sbhLogo
    img.onload = () => {
      const doc = new jsPDF("portrait")
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Helper to parse dates securely
      const parseDateStrLocal = (dateStr) => {
        if (!dateStr) return null
        if (dateStr instanceof Date) return dateStr
        const str = String(dateStr).trim()
        if (str.includes("/")) {
          const parts = str.split("/")
          if (parts.length === 3) {
            if (parts[0].length === 4) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
          }
        } else if (str.includes("-")) {
          const parts = str.split("-")
          if (parts.length === 3) {
            if (parts[0].length === 4) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
          }
        }
        const parsed = Date.parse(str)
        return isNaN(parsed) ? null : new Date(parsed)
      }

      // Filter by time range helper
      const filterByRange = (dateStr) => {
        const d = parseDateStrLocal(dateStr)
        if (!d) return false
        const now = new Date()

        if (timeRange === "weekly") {
          const currentDay = now.getDay()
          const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay
          const monday = new Date(now)
          monday.setDate(now.getDate() + distanceToMon)
          monday.setHours(0,0,0,0)
          const saturday = new Date(monday)
          saturday.setDate(monday.getDate() + 5)
          saturday.setHours(23,59,59,999)
          return d >= monday && d <= saturday
        }
        if (timeRange === "monthly") {
          return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
        }
        if (timeRange === "yearly") {
          return d.getFullYear() === selectedYear
        }
        if (timeRange === "custom") {
          const start = customStartDate ? new Date(customStartDate) : null
          const end = customEndDate ? new Date(customEndDate) : null
          if (start) start.setHours(0,0,0,0)
          if (end) end.setHours(23,59,59,999)
          if (start && end) return d >= start && d <= end
          if (start) return d >= start
          if (end) return d <= end
        }
        return true // overall
      }

      // Helper to compute user stats
      // Helper to check if user is on leave on a given date
      const isUserOnLeave = (username, dateStr) => {
        if (!dateStr || !username) return false;
        const d = parseDateStrLocal(dateStr);
        if (!d) return false;
        d.setHours(0,0,0,0);
        
        return leavesList.some(l => {
          if (l.username.toLowerCase() !== username.toLowerCase()) return false;
          const start = new Date(l.startDate);
          start.setHours(0,0,0,0);
          const end = new Date(l.endDate);
          end.setHours(23,59,59,999);
          return d >= start && d <= end;
        });
      };

      // Helper to compute user stats
      const getUserLoginStats = (username) => {
        const userLogs = attendanceLogs.filter(l => l && l.username && l.username.toLowerCase() === username.toLowerCase())
        const userDeds = deductions.filter(d => d && d.username && d.username.toLowerCase() === username.toLowerCase())

        const rangeFilteredLogs = userLogs.filter(l => filterByRange(l.date))
        const rangeFilteredDeds = userDeds.filter(d => filterByRange(d.date))

        // Streak calculation (Overall active streak) - Leave days do not break the streak
        let streak = 0
        const sortedAsc = [...userLogs].sort((a,b) => {
          const dA = parseDateStrLocal(a.date)
          const dB = parseDateStrLocal(b.date)
          if (!dA || !dB) return 0
          return dA.getTime() - dB.getTime()
        })
        for (let i = sortedAsc.length - 1; i >= 0; i--) {
          const statusLower = sortedAsc[i] && sortedAsc[i].status ? String(sortedAsc[i].status).toLowerCase() : "";
          const onLeave = isUserOnLeave(username, sortedAsc[i].date);
          if (statusLower === "present") {
            streak++
          } else if (onLeave || statusLower === "leave") {
            // Keep going, don't break the streak
            continue
          } else {
            break
          }
        }

        // Missed logins unique dates to prevent duplicate rows in sheets, ignoring dates on leave
        const checklistMissedDates = new Set()
        const delegationMissedDates = new Set()
        const totalMissedDates = new Set()

        rangeFilteredDeds.forEach(d => {
          const reason = d.reason ? String(d.reason) : ""
          if (reason.includes("Login Missed")) {
            const dDate = d.date ? String(d.date).trim() : ""
            if (dDate) {
              if (!isUserOnLeave(username, dDate)) {
                totalMissedDates.add(dDate)
                if (reason.includes("Checklist")) {
                  checklistMissedDates.add(dDate)
                }
                if (reason.includes("Delegation")) {
                  delegationMissedDates.add(dDate)
                }
              }
            }
          }
        })

        const mappedLogs = rangeFilteredLogs.map(l => {
          const onLeave = isUserOnLeave(username, l.date)
          return {
            ...l,
            status: onLeave ? "Leave" : l.status
          }
        })

        const totalDays = mappedLogs.length
        const presentDays = mappedLogs.filter(l => l && l.status && String(l.status).toLowerCase() === "present").length
        const leaveDays = mappedLogs.filter(l => l && l.status && String(l.status).toLowerCase() === "leave").length
        const absentDays = totalMissedDates.size
        const checklistPenalty = checklistMissedDates.size * 5
        const delegationPenalty = delegationMissedDates.size * 5
        const totalPenalty = checklistPenalty + delegationPenalty
        const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100

        return {
          totalDays,
          presentDays,
          leaveDays,
          absentDays,
          checklistPenalty,
          delegationPenalty,
          totalPenalty,
          rate,
          streak,
          logs: [...mappedLogs].sort((a,b) => {
            const dA = parseDateStrLocal(a.date)
            const dB = parseDateStrLocal(b.date)
            if (!dA || !dB) return 0
            return dB.getTime() - dA.getTime()
          })
        }
      }

      const drawHeaderAndWatermark = (d) => {
        // Draw page borders (Green outer, Red inner)
        try {
          d.saveGraphicsState();
          d.setDrawColor(16, 185, 129) // Emerald Green
          d.setLineWidth(0.7)
          d.rect(5, 5, pageWidth - 10, pageHeight - 10)

          d.setDrawColor(239, 68, 68) // Rose Red
          d.setLineWidth(0.4)
          d.rect(6.5, 6.5, pageWidth - 13, pageHeight - 13)
          d.restoreGraphicsState();
        } catch (err) {
          console.error("Error drawing borders:", err)
        }

        // 1. Draw logo at top right
        try {
          d.addImage(img, 'PNG', pageWidth - 49, 8, 35, 10)
        } catch (err) {
          console.error("Error drawing logo:", err)
        }
        // 2. Draw light, colorful rotated watermark (bottom-left to top-right diagonal)
        try {
          d.saveGraphicsState()
          d.setGState(new d.GState({ opacity: 0.12 }))
          const watermarkWidth = 120
          const watermarkHeight = 35
          d.addImage(img, 'PNG', (pageWidth - watermarkWidth) / 2, (pageHeight - watermarkHeight) / 2, watermarkWidth, watermarkHeight, undefined, 'none', 30)
          d.restoreGraphicsState()
        } catch (err) {
          console.error("Error drawing watermark:", err)
        }
      }

      const drawUserSection = (username, startY) => {
        const uStats = getUserLoginStats(username)
        
        doc.setFont("helvetica", "bold")
        doc.setFontSize(11)
        doc.text(`Employee Performance Card: ${username.toUpperCase()}`, 14, startY)

        // Draw summary blocks on first page
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.rect(14, startY + 3, pageWidth - 28, 38)
        
        doc.setFont("helvetica", "normal")
        doc.text(`Total Days Tracked: ${uStats.totalDays} Days`, 18, startY + 9)
        doc.text(`Present Days: ${uStats.presentDays} Days`, 18, startY + 15)
        doc.text(`Approved Leave Days: ${uStats.leaveDays} Days`, 18, startY + 21)
        doc.text(`Absent / Missed Logins: ${uStats.absentDays} Days`, 18, startY + 27)
        doc.text(`Current Active Streak: ${uStats.streak} Days`, 18, startY + 33)

        doc.text(`Checklist Login Penalty (-5/day): -${uStats.checklistPenalty} Pts`, pageWidth / 2 + 10, startY + 9)
        doc.text(`Delegation Login Penalty (-5/day): -${uStats.delegationPenalty} Pts`, pageWidth / 2 + 10, startY + 15)
        doc.text(`Total Score Impact: -${uStats.totalPenalty} Pts`, pageWidth / 2 + 10, startY + 21)
        doc.text(`Attendance Compliance Rate: ${uStats.rate}%`, pageWidth / 2 + 10, startY + 27)

        const tblColumns = ["Date", "Status", "First Login Time", "IP Address", "Browser", "Device"]
        const tblRows = uStats.logs.map(l => [
          l.date,
          l.status && String(l.status).toLowerCase() === "present" ? "Present" : 
          l.status && String(l.status).toLowerCase() === "leave" ? "Leave" : "Absent",
          l.loginTime || "—",
          l.ip || "—",
          l.browser || "—",
          l.device || "—"
        ])

        autoTable(doc, {
          startY: startY + 46,
          margin: { top: 30, bottom: 15, left: 14, right: 14 },
          head: [tblColumns],
          body: tblRows,
          theme: "striped",
          headStyles: { fillColor: [79, 70, 229] },
          bodyStyles: { textColor: [0, 0, 0] },
          styles: { fontSize: 8 },
          didDrawPage: (data) => {
            drawHeaderAndWatermark(doc)
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) { // Status column
              if (data.cell.raw === "Present") {
                data.cell.styles.textColor = [16, 185, 129];
                data.cell.styles.fontStyle = 'bold';
              } else if (data.cell.raw === "Leave") {
                data.cell.styles.textColor = [59, 130, 246]; // Blue
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [239, 68, 68];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        })
      }

      // Draw header & watermark on first page
      drawHeaderAndWatermark(doc)

      // Title Section
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text("SBH Group of Hospitals", 14, 20)
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text("Attendance & Login Compliance Report", 14, 25)

      let dateRangeStr = `Time Range: ${timeRange.toUpperCase()}`
      if (timeRange === "custom") {
        dateRangeStr = `Date Range: ${customStartDate} to ${customEndDate}`
      } else if (timeRange === "monthly") {
        dateRangeStr = `Month: ${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][selectedMonth]} / Year: ${selectedYear}`
      } else if (timeRange === "yearly") {
        dateRangeStr = `Year: ${selectedYear}`
      }
      doc.text(dateRangeStr, 14, 30)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 35)

      // 1. IF SINGLE EMPLOYEE IS SELECTED
      if (selectedEmployee && selectedEmployee !== "all") {
        drawUserSection(selectedEmployee, 45)
      } else {
        // 2. IF ALL EMPLOYEES ARE SELECTED
        const allEmployees = employeeNames.filter(n => n.toLowerCase() !== "all").sort()

        // Calculate statistics per user and sort by compliance rate descending, then name alphabetically
        const employeesSummary = allEmployees.map(name => {
          const uStats = getUserLoginStats(name)
          return {
            name,
            ...uStats
          }
        })
        .filter(item => item.totalDays > 0)
        .sort((a, b) => {
          if (b.rate !== a.rate) {
            return b.rate - a.rate
          }
          if (a.absentDays !== b.absentDays) {
            return a.absentDays - b.absentDays
          }
          return a.name.localeCompare(b.name)
        })

        doc.setFont("helvetica", "bold")
        doc.setFontSize(11)
        doc.text("All Employees Attendance Summary Matrix", 14, 45)

        // Draw a summary table on Page 1
        const columns = ["Employee Name", "Total Days", "Present Days", "Absent Days", "Checklist Penalty (-5/d)", "Delegation Penalty (-5/d)", "Compliance Rate"]
        const rows = employeesSummary.map(emp => [
          emp.name,
          emp.totalDays,
          emp.presentDays,
          emp.absentDays,
          `-${emp.checklistPenalty} Pts`,
          `-${emp.delegationPenalty} Pts`,
          `${emp.rate}%`
        ])

        autoTable(doc, {
          startY: 48,
          margin: { top: 30, bottom: 15, left: 14, right: 14 },
          head: [columns],
          body: rows,
          theme: "striped",
          headStyles: { fillColor: [79, 70, 229] },
          bodyStyles: { textColor: [0, 0, 0] },
          styles: { fontSize: 8 },
          didDrawPage: (data) => {
            drawHeaderAndWatermark(doc)
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 6) { // Compliance column
              const val = parseFloat(data.cell.raw);
              if (val >= 90) {
                data.cell.styles.textColor = [16, 185, 129];
                data.cell.styles.fontStyle = 'bold';
              } else if (val >= 75) {
                data.cell.styles.textColor = [245, 158, 11];
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [239, 68, 68];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        })

        // Draw individual employee sections starting on new pages!
        employeesSummary.forEach(emp => {
          doc.addPage()
          drawHeaderAndWatermark(doc)
          // Title on each page
          doc.setFont("helvetica", "bold")
          doc.setFontSize(14)
          doc.text("SBH Group of Hospitals - Employee Log", 14, 20)
          doc.setFontSize(8)
          doc.setFont("helvetica", "normal")
          doc.text(`Time Range: ${dateRangeStr} | Generated: ${new Date().toLocaleDateString()}`, 14, 25)
          
          // Draw their full summary card and daily logs table
          drawUserSection(emp.name, 35)
        })
      }

      doc.save(`SBH_Attendance_Report_${new Date().getTime()}.pdf`)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 pb-16">
        
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-2">
              <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm w-fit">
                <Sparkles className="h-3 w-3 text-purple-600 animate-pulse" />
                SBH Group of Hospitals
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-slate-900">
              User Login & Attendance Report
            </h1>
            <p className="text-slate-500 text-sm max-w-xl font-medium">
              Real-time attendance matrices, daily logs tracking, streaks calculations, and custom time range downloads.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 z-10">
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-sm"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-sm"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Employee Autocomplete Selector */}
            <div ref={employeeRef} className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-bold text-slate-500">Search Employee</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type name to search..."
                  value={staffSearchText}
                  onChange={(e) => {
                    const val = e.target.value
                    setStaffSearchText(val)
                    setShowSuggestions(true)
                    
                    const matched = employeeNames.find(n => n.toLowerCase() === val.trim().toLowerCase())
                    if (matched) {
                      setSelectedEmployee(matched)
                    } else if (val.trim().toLowerCase() === "all" || val.trim().toLowerCase() === "all employees") {
                      setSelectedEmployee("all")
                    } else if (val === "") {
                      setSelectedEmployee("")
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none w-full text-sm font-semibold transition-all"
                />
                {staffSearchText && (
                  <button
                    onClick={() => {
                      setStaffSearchText("")
                      setSelectedEmployee("")
                      setShowSuggestions(false)
                    }}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {/* Autocomplete list overlay */}
              {showSuggestions && (
                <div className="absolute top-[64px] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  <div
                    onClick={() => handleSelectStaff("all")}
                    className="p-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    All Employees
                  </div>
                  {employeeNames
                    .filter(name => name.toLowerCase().includes(staffSearchText.toLowerCase()))
                    .map((name, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectStaff(name)}
                        className="p-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        {name}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Time-Range Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="py-2 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none text-sm font-semibold cursor-pointer"
              >
                <option value="overall">Overall Attendance</option>
                <option value="weekly">Weekly (Mon to Sat)</option>
                <option value="monthly">Monthly Summary</option>
                <option value="yearly">Yearly Matrix</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Monthly select overlay */}
            {timeRange === "monthly" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">Select Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="py-2 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none text-sm font-semibold cursor-pointer"
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="py-2 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none text-sm font-semibold cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map((y, idx) => (
                      <option key={idx} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Yearly selector */}
            {timeRange === "yearly" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500">Select Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="py-2 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none text-sm font-semibold cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map((y, idx) => (
                    <option key={idx} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Dates Selectors */}
            {timeRange === "custom" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="py-2 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none text-sm font-semibold cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="py-2 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none text-sm font-semibold cursor-pointer"
                  />
                </div>
              </>
            )}

          </div>
        </div>

        {/* Dashboard Grid Content wrapper */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 rounded-2xl">
              <div className="flex flex-col items-center justify-center space-y-4 max-w-xs w-full text-center">
                <div className="relative flex items-center justify-center">
                  <svg className="animate-spin h-10 w-10 text-[#9333EA]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="spinner-grad-attend" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#9333EA" />
                        <stop offset="100%" stopColor="#DB2777" />
                      </linearGradient>
                    </defs>
                    <circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-90" fill="url(#spinner-grad-attend)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-slate-800 text-xs font-semibold tracking-wide animate-pulse">
                    {funnyMsg}
                  </p>
                  <p className="text-[9px] uppercase font-black tracking-widest bg-gradient-to-r from-[#9333EA] to-[#DB2777] bg-clip-text text-transparent">
                    Loading Attendance...
                  </p>
                </div>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center max-w-md mx-auto">
              <p className="font-bold">{error}</p>
              <button
                onClick={fetchData}
                className="mt-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-4 py-2 rounded-lg transition-all"
              >
                Retry Load
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              
              {/* Stats Widgets */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-bold uppercase">Login Compliance</span>
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-slate-800">{stats.rate}%</span>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Attendance rate</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-bold uppercase">Days Present</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-emerald-600">{stats.present} / {stats.rangeDays} Days</span>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Successful logins</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-bold uppercase">Leave Days</span>
                    <CalendarIcon className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-blue-600">{stats.leaveDays} Days</span>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Approved leaves</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-bold uppercase">Days Absent</span>
                    <XCircle className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-rose-600">{stats.absent} / {stats.rangeDays} Days</span>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Missed logins</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-bold uppercase">Current Streak</span>
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-amber-600">{stats.currentStreak} Days</span>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Active compliance streak</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-bold uppercase">Streak Deductions</span>
                    <Activity className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-rose-600">-{stats.totalDeductions} Pts</span>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Login penalties</span>
                  </div>
                </div>

              </div>

              {/* Attendance Table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-indigo-50/20">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Attendance Log Matrix</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Day-wise log records compiled from spreadsheet checks.</p>
                  </div>
                  <span className="text-xs bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full">
                    {filteredLogs.length} Records
                  </span>
                </div>
                
                <div className="overflow-x-auto w-full max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left border-collapse min-w-max md:min-w-0">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Username</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">First Login Time</th>
                        <th className="px-5 py-3">IP Address</th>
                        <th className="px-5 py-3">Device / Browser</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-700">{formatDateToVIP(log.date)}</td>
                          <td className="px-5 py-3.5 font-extrabold text-slate-800">{log.username}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${
                              log.status && typeof log.status === "string" && log.status.toLowerCase() === "present"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : log.status && typeof log.status === "string" && log.status.toLowerCase() === "leave"
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-600">{log.loginTime}</td>
                          <td className="px-5 py-3.5 font-medium text-slate-500">{log.ip}</td>
                          <td className="px-5 py-3.5 font-medium text-slate-500">
                            {log.device !== "—" ? `${log.device} (${log.browser})` : "—"}
                          </td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-5 py-8 text-center text-slate-400 font-semibold">
                            {!selectedEmployee 
                              ? "Please search and select an employee from the dropdown list to load the attendance report matrix."
                              : "No attendance records match your filter criteria."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}
