import { useState, useEffect } from "react"
import AdminLayout from "../../components/layout/AdminLayout.jsx"
import EdpmsDashboardView from "./EdpmsDashboardView.jsx"

// Robust date parsing supporting DD/MM/YYYY, YYYY-MM-DD, and native JS date formats
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

const isDateInPast = (dateStr) => {
  const date = parseDateFromDDMMYYYY(dateStr)
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

const isDateToday = (dateStr) => {
  const date = parseDateFromDDMMYYYY(dateStr)
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() === today.getTime()
}

const parseGoogleSheetsDate = (dateStr) => {
  if (!dateStr) return ""
  if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
    const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10)
      const day = parseInt(match[3], 10)
      return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
    }
  }
  return dateStr
}

const getCellValue = (row, index) => {
  if (!row || !row.c || index >= row.c.length) return null
  const cell = row.c[index]
  return cell && "v" in cell ? cell.v : null
}

// Progressive scoring system matching user's custom specs:
// - 1st Extension: -10 points
// - 2nd Extension: -20 points
// - 3rd or more: -50 points
// - Delay Days: -10 points daily for first 7 days, then -20 points daily
const calculateTaskScore = (taskObj, historyList) => {
  const taskId = taskObj.id
  
  // Count extensions
  let extensionCount = 0
  if (historyList && Array.isArray(historyList)) {
    extensionCount = historyList.filter(
      (h) => String(h.taskId).trim() === String(taskId).trim() && String(h.action).toLowerCase() === "extend date"
    ).length
  }
  
  if (extensionCount === 0 && taskObj.dueDate && taskObj.taskStartDate && taskObj.dueDate !== taskObj.taskStartDate) {
    extensionCount = 1
  }

  let delayDays = 0
  const deadlineDate = parseDateFromDDMMYYYY(taskObj.dueDate || taskObj.taskStartDate)
  const isDone = taskObj.originalStatus === "Done"
  const isVerifyPending = taskObj.originalStatus === "Verify Pending"
  const actualDate = parseDateFromDDMMYYYY(taskObj.completionDate)

  const cutoffDate = new Date(2026, 5, 24) // June 24, 2026
  cutoffDate.setHours(0, 0, 0, 0)

  if ((isDone || isVerifyPending) && actualDate && actualDate < cutoffDate) {
    extensionCount = 0
    delayDays = 0
  } else {
    if (deadlineDate) {
      if (isDone || isVerifyPending) {
        if (actualDate && actualDate > deadlineDate) {
          const diffTime = actualDate - deadlineDate
          delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (today > deadlineDate) {
          const diffTime = today - deadlineDate
          delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }
      }
    }
  }

  // Calculate custom extension penalty
  let extensionPenalty = 0
  if (extensionCount === 1) {
    extensionPenalty = 10
  } else if (extensionCount === 2) {
    extensionPenalty = 20
  } else if (extensionCount >= 3) {
    extensionPenalty = 50
  }

  // Calculate progressive delay penalty: 10/day for week 1, then 20/day (completed tasks), or 3/day (pending tasks)
  let delayPenalty = 0
  if (delayDays > 0) {
    if (isDone || isVerifyPending) {
      if (delayDays <= 7) {
        delayPenalty = delayDays * 10
      } else {
        delayPenalty = 70 + (delayDays - 7) * 20
      }
    } else {
      delayPenalty = delayDays * 3 // Mild penalty for pending delayed tasks
    }
  }

  const totalPenalty = extensionPenalty + delayPenalty
  
  let baseScore = 100
  const ratingVal = parseInt(taskObj.rating, 10)
  if (!isNaN(ratingVal)) {
    if (ratingVal === 5) baseScore = 100
    else if (ratingVal === 4) baseScore = 80
    else if (ratingVal === 3) baseScore = 60
    else if (ratingVal === 2) baseScore = 40
    else if (ratingVal === 1) baseScore = 20
  }

  // Completion Reward: 25 for on-time no extension, 15 for on-time 1 extension
  let completionReward = 0
  if (isDone || isVerifyPending) {
    if (delayDays === 0) {
      if (extensionCount === 0) {
        completionReward = 25
      } else if (extensionCount === 1) {
        completionReward = 15
      }
    }
  }

  const score = Math.max(0, baseScore + completionReward - totalPenalty)

  return {
    score,
    baseScore,
    completionReward,
    penalty: totalPenalty,
    extensionCount,
    delayDays,
    extensionPenalty,
    delayPenalty
  }
}

export default function PerformanceDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeSource, setActiveSource] = useState("delegation") // delegation or checklist
  const [tabLoading, setTabLoading] = useState(false)
  
  const handleTabChange = (source) => {
    setTabLoading(true)
    setTimeout(() => {
      setActiveSource(source)
      setTimeout(() => {
        setTabLoading(false)
      }, 100)
    }, 50)
  }
  
  const [data, setData] = useState({
    delegationTasks: [],
    delegationStaff: [],
    checklistTasks: [],
    checklistStaff: [],
    departmentOptions: [],
    doerOptions: [],
    historyData: [],
    loginHistory: [],
    pointDeductions: []
  })

  // Check if current user is admin
  const isAdminUser = () => {
    const role = sessionStorage.getItem("role")
    const isAdminFlag = sessionStorage.getItem("isAdmin")
    return role === "admin" || isAdminFlag === "true"
  }

  const fetchPerformanceData = async (signal) => {
    setLoading(true)
    setError(null)

    try {
      const spreadsheetId = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0"
      
      const masterUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=master`
      const delegationUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=DELEGATION`
      const checklistUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Checklist`
      const historyUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=DELEGATION%20DONE`
      const loginUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Login%20History`
      const deductionsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Point%20Deductions`

      const [masterRes, delegationRes, checklistRes, historyRes, loginRes, deductionsRes] = await Promise.all([
        fetch(masterUrl, { signal }),
        fetch(delegationUrl, { signal }),
        fetch(checklistUrl, { signal }),
        fetch(historyUrl, { signal }).catch(() => null),
        fetch(loginUrl, { signal }).catch(() => null),
        fetch(deductionsUrl, { signal }).catch(() => null)
      ])

      if (!masterRes.ok || !delegationRes.ok || !checklistRes.ok) {
        throw new Error("Failed to retrieve Google Sheet performance datasets.")
      }

      const parseResponseJson = async (res) => {
        const text = await res.text()
        const start = text.indexOf("{")
        const end = text.lastIndexOf("}")
        const jsonStr = text.substring(start, end + 1)
        return JSON.parse(jsonStr)
      }

      const masterJson = await parseResponseJson(masterRes)
      const delegationJson = await parseResponseJson(delegationRes)
      const checklistJson = await parseResponseJson(checklistRes)
      
      let historyJson = null
      if (historyRes && historyRes.ok) {
        historyJson = await parseResponseJson(historyRes)
      }

      let loginJson = null
      if (loginRes && loginRes.ok) {
        loginJson = await parseResponseJson(loginRes).catch(() => null)
      }

      let deductionsJson = null
      if (deductionsRes && deductionsRes.ok) {
        deductionsJson = await parseResponseJson(deductionsRes).catch(() => null)
      }

      const loginList = []
      if (loginJson && loginJson.table && loginJson.table.rows) {
        loginJson.table.rows.slice(1).forEach(row => {
          loginList.push({
            date: getCellValue(row, 0),
            username: getCellValue(row, 1),
            loginTime: getCellValue(row, 2),
            logoutTime: getCellValue(row, 3),
            ip: getCellValue(row, 4),
            browser: getCellValue(row, 5),
            device: getCellValue(row, 6)
          })
        })
      }

      const deductionsList = []
      if (deductionsJson && deductionsJson.table && deductionsJson.table.rows) {
        deductionsJson.table.rows.slice(1).forEach(row => {
          deductionsList.push({
            date: getCellValue(row, 0),
            username: getCellValue(row, 1),
            reason: getCellValue(row, 2),
            deducted: parseFloat(getCellValue(row, 3)) || 0,
            balance: parseFloat(getCellValue(row, 4)) || 0
          })
        })
      }

      // Process history entries for matching extensions
      const historyList = []
      if (historyJson && historyJson.table && historyJson.table.rows) {
        historyJson.table.rows.forEach((row, idx) => {
          if (idx === 0) return
          const taskId = getCellValue(row, 1) // col1
          const action = getCellValue(row, 2) // col2
          if (taskId) {
            historyList.push({
              taskId: String(taskId).trim(),
              action: action ? String(action).trim() : ""
            })
          }
        })
      }

      // Process master sheet options
      const departments = []
      const doers = []
      if (masterJson.table && masterJson.table.rows) {
        masterJson.table.rows.slice(1).forEach((row) => {
          if (row.c && row.c[0] && row.c[0].v) {
            const val = row.c[0].v.toString().trim()
            if (val !== "") departments.push(val)
          }
          if (row.c && row.c[2] && row.c[2].v) {
            const val = row.c[2].v.toString().trim()
            if (val !== "") doers.push(val)
          }
        })
      }
      const departmentOptions = [...new Set(departments)].sort()
      const doerOptions = [...new Set(doers)].sort()

      // Parse Delegation Sheet
      const delegationTasks = []
      const delegationStaffTracking = new Map()

      if (delegationJson.table && delegationJson.table.rows) {
        delegationJson.table.rows.forEach((row, rowIndex) => {
          if (rowIndex === 0) return

          const taskId = getCellValue(row, 1) // Column B
          const assignedToRaw = getCellValue(row, 4) // Column E
          const assignedTo = assignedToRaw ? String(assignedToRaw).trim() : ""

          if (!taskId || taskId === "" || !assignedTo || assignedTo === "") return

          // Skip Leave
          const columnQValue = getCellValue(row, 16)
          if (columnQValue && columnQValue.toString().trim().toLowerCase() === "leave") return

          const taskStartDateVal = getCellValue(row, 6) // Column G
          const taskStartDate = taskStartDateVal ? parseGoogleSheetsDate(String(taskStartDateVal)) : ""

          const completionDateVal = getCellValue(row, 11) // Column L
          const completionDate = completionDateVal ? parseGoogleSheetsDate(String(completionDateVal)) : ""

          const statusColumnU = getCellValue(row, 20) // Column U

          if (!delegationStaffTracking.has(assignedTo)) {
            delegationStaffTracking.set(assignedTo, {
              name: assignedTo, totalTasks: 0, completedTasks: 0, pendingTasks: 0
            })
          }

          let status = "pending"
          if (statusColumnU === "Done") {
            status = "completed"
          } else if (isDateInPast(taskStartDate) && !isDateToday(taskStartDate)) {
            status = "overdue"
          }

          const rawTask = {
            id: String(taskId).trim(),
            title: getCellValue(row, 5) || "Untitled Task",
            assignedTo,
            taskStartDate,
            dueDate: parseGoogleSheetsDate(getCellValue(row, 10)) || taskStartDate, // Column K Target Date
            completionDate,
            status,
            frequency: getCellValue(row, 7) || "one-time",
            originalStatus: statusColumnU,
            rating: getCellValue(row, 17) || ""
          }

          // Compute penalty and score matching calculateTaskScore
          const scoreDetails = calculateTaskScore(rawTask, historyList)
          rawTask.score = scoreDetails.score
          rawTask.baseScore = scoreDetails.baseScore
          rawTask.completionReward = scoreDetails.completionReward
          rawTask.penalty = scoreDetails.penalty
          rawTask.extensionCount = scoreDetails.extensionCount
          rawTask.delayDays = scoreDetails.delayDays
          rawTask.extensionPenalty = scoreDetails.extensionPenalty
          rawTask.delayPenalty = scoreDetails.delayPenalty

          delegationTasks.push(rawTask)

          const s = delegationStaffTracking.get(assignedTo)
          s.totalTasks++
          if (status === "completed") s.completedTasks++
          else s.pendingTasks++
        })
      }

      const delegationStaff = Array.from(delegationStaffTracking.values()).map(staff => ({
        id: staff.name.replace(/\s+/g, "-").toLowerCase(),
        name: staff.name,
        email: `${staff.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        totalTasks: staff.totalTasks,
        completedTasks: staff.completedTasks,
        pendingTasks: staff.pendingTasks,
        progress: staff.totalTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0
      }))

      // Parse Checklist Sheet
      const checklistTasks = []
      const checklistStaffTracking = new Map()

      if (checklistJson.table && checklistJson.table.rows) {
        checklistJson.table.rows.forEach((row, rowIndex) => {
          if (rowIndex === 0) return

          const taskId = getCellValue(row, 1) // Column B
          const assignedToRaw = getCellValue(row, 4) // Column E
          const assignedTo = assignedToRaw ? String(assignedToRaw).trim() : ""

          if (!taskId || taskId === "" || !assignedTo || assignedTo === "") return

          // Skip Leave
          const columnQValue = getCellValue(row, 16)
          if (columnQValue && columnQValue.toString().trim().toLowerCase() === "leave") return

          const taskStartDateVal = getCellValue(row, 6) // Column G
          const taskStartDate = taskStartDateVal ? parseGoogleSheetsDate(String(taskStartDateVal)) : ""

          const completionDateVal = getCellValue(row, 10) // Column K
          const completionDate = completionDateVal ? parseGoogleSheetsDate(String(completionDateVal)) : ""

          if (!checklistStaffTracking.has(assignedTo)) {
            checklistStaffTracking.set(assignedTo, {
              name: assignedTo, totalTasks: 0, completedTasks: 0, pendingTasks: 0
            })
          }

          let status = "pending"
          if (completionDate && completionDate !== "") {
            status = "completed"
          } else if (isDateInPast(taskStartDate) && !isDateToday(taskStartDate)) {
            status = "overdue"
          }

          const rawTask = {
            id: String(taskId).trim(),
            title: getCellValue(row, 5) || "Untitled Checklist",
            assignedTo,
            taskStartDate,
            dueDate: parseGoogleSheetsDate(getCellValue(row, 10)) || taskStartDate,
            completionDate,
            status,
            frequency: getCellValue(row, 7) || "daily",
            originalStatus: completionDate ? "Done" : "Pending"
          }

          const scoreDetails = calculateTaskScore(rawTask, [])
          rawTask.score = scoreDetails.score
          rawTask.baseScore = scoreDetails.baseScore
          rawTask.completionReward = scoreDetails.completionReward
          rawTask.penalty = scoreDetails.penalty
          rawTask.extensionCount = scoreDetails.extensionCount
          rawTask.delayDays = scoreDetails.delayDays
          rawTask.extensionPenalty = scoreDetails.extensionPenalty
          rawTask.delayPenalty = scoreDetails.delayPenalty

          checklistTasks.push(rawTask)

          const s = checklistStaffTracking.get(assignedTo)
          s.totalTasks++
          if (status === "completed") s.completedTasks++
          else s.pendingTasks++
        })
      }

      const checklistStaff = Array.from(checklistStaffTracking.values()).map(staff => ({
        id: staff.name.replace(/\s+/g, "-").toLowerCase(),
        name: staff.name,
        email: `${staff.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        totalTasks: staff.totalTasks,
        completedTasks: staff.completedTasks,
        pendingTasks: staff.pendingTasks,
        progress: staff.totalTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0
      }))

      setData({
        delegationTasks,
        delegationStaff,
        checklistTasks,
        checklistStaff,
        departmentOptions,
        doerOptions,
        historyData: historyList,
        loginHistory: loginList,
        pointDeductions: deductionsList
      })

    } catch (err) {
      if (err.name === "AbortError") return
      console.error("Error fetching performance analytics data:", err)
      setError(err.message || "Failed to load performance metrics.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchPerformanceData(controller.signal)
    return () => controller.abort()
  }, [])

  return (
    <AdminLayout>
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="text-slate-500 font-semibold animate-pulse text-sm">
            Loading SBH Performance Intelligence Engine...
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-center max-w-md mx-auto my-12">
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => fetchPerformanceData()}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
          >
            Retry Fetching Data
          </button>
        </div>
      ) : (
        <EdpmsDashboardView
          allTasks={activeSource === "delegation" ? data.delegationTasks : data.checklistTasks}
          staffMembers={activeSource === "delegation" ? data.delegationStaff : data.checklistStaff}
          isAdmin={isAdminUser()}
          currentUsername={sessionStorage.getItem("username") || ""}
          departmentOptions={data.departmentOptions}
          doerOptions={data.doerOptions}
          activeSource={activeSource}
          setActiveSource={handleTabChange}
          loginHistory={data.loginHistory}
          pointDeductions={data.pointDeductions}
          tabLoading={tabLoading}
        />
      )}
    </AdminLayout>
  )
}
