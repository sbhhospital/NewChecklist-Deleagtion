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

const CONFIG = {
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec",
  MAIN_SPREADSHEET_ID: "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0"
}

export default function AttendanceReport() {
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Data lists
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [staffList, setStaffList] = useState([])
  const [deductions, setDeductions] = useState([])
  
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

      // Fetch master list for active employees
      const masterRes = await fetch(
        `https://docs.google.com/spreadsheets/d/${CONFIG.MAIN_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=master`
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
        parsedDeductions = dedJson.table.rows.slice(1).map(row => ({
          date: row.c[0]?.v || "",
          username: row.c[1]?.v || "",
          reason: row.c[2]?.v || "",
          deducted: Number(row.c[3]?.v || 0),
          balance: Number(row.c[4]?.v || 0)
        }))
      }

      setAttendanceLogs(parsedLogs)
      setStaffList(parsedStaff)
      setDeductions(parsedDeductions)
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

    // Sort by date descending
    return [...result].sort((a,b) => {
      const dA = parseDateStr(a.date)
      const dB = parseDateStr(b.date)
      if (!dA || !dB) return 0
      return dB.getTime() - dA.getTime()
    })
  }, [attendanceLogs, selectedEmployee, searchQuery, timeRange, customStartDate, customEndDate, selectedMonth, selectedYear])

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = filteredLogs.length
    const present = filteredLogs.filter(l => l && l.status && typeof l.status === "string" && l.status.toLowerCase() === "present").length
    const absent = filteredLogs.filter(l => l && l.status && typeof l.status === "string" && l.status.toLowerCase() === "absent").length
    const rate = total > 0 ? Math.round((present / total) * 100) : 100

    // Calculate Streak (from sorted logs)
    let currentStreak = 0
    const sortedAsc = [...filteredLogs].sort((a,b) => {
      const dA = parseDateStr(a.date)
      const dB = parseDateStr(b.date)
      if (!dA || !dB) return 0
      return dA.getTime() - dB.getTime()
    })
    
    for (let i = sortedAsc.length - 1; i >= 0; i--) {
      if (sortedAsc[i] && sortedAsc[i].status && typeof sortedAsc[i].status === "string" && sortedAsc[i].status.toLowerCase() === "present") {
        currentStreak++
      } else {
        break
      }
    }

    // Point Deductions sum
    let totalDeductions = 0
    if (selectedEmployee && selectedEmployee !== "all") {
      totalDeductions = deductions
        .filter(d => d && d.username && typeof d.username === "string" && d.username.toLowerCase() === selectedEmployee.toLowerCase() && d.reason === "Login Missed")
        .reduce((sum, d) => sum + d.deducted, 0)
    }

    return { total, present, absent, rate, currentStreak, totalDeductions }
  }, [filteredLogs, selectedEmployee, deductions])

  // Dynamic user suggestions (Combined from master list and actual attendance logs)
  const employeeNames = useMemo(() => {
    const list = new Set()
    staffList.forEach(s => {
      if (s.username) list.add(s.username.trim())
    })
    attendanceLogs.forEach(l => {
      if (l.username) list.add(l.username.trim())
    })
    return Array.from(list)
  }, [staffList, attendanceLogs])

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
        ["Total Recorded Days", "Days Present", "Days Absent", "Compliance Rate (%)", "Current Streak", "Point Deductions"],
        [stats.total, stats.present, stats.absent, `${stats.rate}%`, `${stats.currentStreak} Days`, `-${stats.totalDeductions} Pts`],
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
        ["Total Days", "Present Days", "Absent Days", "Attendance Rate"],
        [stats.total, stats.present, stats.absent, `${stats.rate}%`],
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
        .filter(l => l && l.status && typeof l.status === "string" && l.status.toLowerCase() === "absent")
        .map(l => l.date)

      const rows = [
        ["MONTHLY ATTENDANCE COMPLIANCE SUMMARY"],
        ["Employee Name:", employeeTitle],
        ["Month / Year:", `${selectedMonth + 1} / ${selectedYear}`],
        ["Generated Date:", timestampStr],
        [],
        ["ATTENDANCE LOG MATRIX"],
        ["Days Present", "Days Absent", "Compliance Rate", "Current Compliance Rating"],
        [stats.present, stats.absent, `${stats.rate}%`, stats.rate >= 90 ? "Excellent" : stats.rate >= 75 ? "Satisfactory" : "Under review"],
        [],
        ["MISSED LOGIN COMPLIANCE ESCALATIONS"],
        ["Absent Date", "Escalation Status"],
        ...absentDays.map(date => [date, "Deducted -50 points"])
      ]

      if (absentDays.length === 0) {
        rows.push(["Perfect monthly login compliance! No missed logins detected.", ""])
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
        const present = monthLogs.filter(l => l && l.status && typeof l.status === "string" && l.status.toLowerCase() === "present").length
        const absent = monthLogs.filter(l => l && l.status && typeof l.status === "string" && l.status.toLowerCase() === "absent").length
        return {
          month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][i],
          present,
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
        ["Month", "Present Days", "Absent Days", "Total Days", "Compliance Rate"],
        ...monthlySummary.map(m => {
          const total = m.present + m.absent
          const rate = total > 0 ? `${Math.round((m.present / total) * 100)}%` : "—"
          return [m.month, m.present, m.absent, total, rate]
        })
      ]

      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, "Yearly Performance")
    }

    XLSX.writeFile(wb, `SBH_Attendance_Report_${employeeTitle.replace(/\s+/g, "_")}.xlsx`)
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
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-sm"
          >
            <Download className="h-4 w-4" />
            Download Excel
          </button>
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
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-2xl border border-slate-100 shadow-sm py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
              <p className="text-slate-500 text-xs font-bold mt-4 animate-pulse">Fetching Attendance Analytics...</p>
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                
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
                    <span className="text-2xl font-black text-emerald-600">{stats.present} Days</span>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Successful logins</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-bold uppercase">Days Absent</span>
                    <XCircle className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-rose-600">{stats.absent} Days</span>
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
