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

const parseDateValue = (cell) => {
  if (!cell) return null;
  const val = cell.v;
  if (!val) return null;
  
  const valStr = String(val);
  if (valStr.startsWith("Date(")) {
    const match = /Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/.exec(valStr);
    if (match) {
      return new Date(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10));
    }
  }
  
  const fmt = cell.f || valStr;
  const parts = fmt.split("/");
  if (parts.length === 3) {
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  return null;
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

const isChecklistTaskOverdue = (taskStartDateStr, frequencyStr) => {
  const dateObj = parseDateFromDDMMYYYY(taskStartDateStr)
  if (!dateObj) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const freq = String(frequencyStr || "daily").toLowerCase().trim()
  let deadline = new Date(dateObj)
  
  if (freq === "daily") {
    deadline.setHours(23, 59, 59, 999)
  } else if (freq === "weekly" || freq.includes("week")) {
    const day = dateObj.getDay()
    const diffToSunday = day === 0 ? 0 : 7 - day
    deadline.setDate(dateObj.getDate() + diffToSunday)
    deadline.setHours(23, 59, 59, 999)
  } else if (freq === "fortnightly") {
    if (dateObj.getDate() <= 15) {
      deadline.setDate(15)
    } else {
      deadline.setMonth(deadline.getMonth() + 1)
      deadline.setDate(0)
    }
    deadline.setHours(23, 59, 59, 999)
  } else if (freq === "monthly") {
    deadline.setMonth(deadline.getMonth() + 1)
    deadline.setDate(0)
    deadline.setHours(23, 59, 59, 999)
  } else if (freq === "quarterly") {
    const month = dateObj.getMonth()
    const quarterEndMonth = Math.floor(month / 3) * 3 + 2
    deadline = new Date(dateObj.getFullYear(), quarterEndMonth + 1, 0, 23, 59, 59, 999)
  } else if (freq === "yearly") {
    deadline = new Date(dateObj.getFullYear(), 11, 31, 23, 59, 59, 999)
  } else {
    deadline.setHours(23, 59, 59, 999)
  }
  
  return today > deadline
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

const calculateTaskScore = (taskObj, historyList, isChecklist = false) => {
  const taskId = taskObj.id;

    // Global cutoff handled per module.

  if (isChecklist) {
    // Count extensions
    let extensionCount = 0;
    if (historyList && Array.isArray(historyList)) {
      extensionCount = historyList.filter(
        (h) => String(h.taskId).trim() === String(taskId).trim() && String(h.action).toLowerCase() === "extend date"
      ).length;
    }
    
    if (extensionCount === 0 && taskObj.dueDate && taskObj.taskStartDate && taskObj.dueDate !== taskObj.taskStartDate) {
      extensionCount = 1;
    }

    let delayDays = 0;
    const deadlineDate = parseDateFromDDMMYYYY(taskObj.dueDate || taskObj.taskStartDate);
    const isDone = taskObj.originalStatus === "Done";
    const isVerifyPending = taskObj.originalStatus === "Verify Pending";
    const actualDate = parseDateFromDDMMYYYY(taskObj.completionDate);

    const cutoffDate = new Date(2026, 7, 1); // August 1, 2026
    cutoffDate.setHours(0, 0, 0, 0);

    if (deadlineDate) {
      let effectiveDeadline = new Date(deadlineDate);
      if (effectiveDeadline < cutoffDate) {
        effectiveDeadline = new Date(cutoffDate);
        extensionCount = 0; // Do not count extensions for past checklists
        delayDays = 0; // Past tasks have no delays
      } else {
        if (isDone || isVerifyPending) {
          if (actualDate > effectiveDeadline) {
            const diffTime = actualDate - effectiveDeadline;
            delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (today > effectiveDeadline) {
            const diffTime = today - effectiveDeadline;
            delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        }
      }
    }

    // Calculate custom extension penalty
    let extensionPenalty = 0;
    if (extensionCount === 1) {
      extensionPenalty = 10;
    } else if (extensionCount === 2) {
      extensionPenalty = 20;
    } else if (extensionCount >= 3) {
      extensionPenalty = 50;
    }

    if (deadlineDate && deadlineDate < cutoffDate) {
      extensionPenalty = 0;
    }

    // Calculate progressive delay penalty
    let delayPenalty = 0;
    if (delayDays > 0) {
      if (isDone || isVerifyPending) {
        if (delayDays <= 7) {
          delayPenalty = delayDays * 10;
        } else {
          delayPenalty = 70 + (delayDays - 7) * 20;
        }
      } else {
        delayPenalty = delayDays * 3;
      }
    }

    const totalPenalty = extensionPenalty + delayPenalty;
    
    let baseScore = 100;
    const ratingVal = parseInt(taskObj.rating, 10);
    if (!isNaN(ratingVal)) {
      if (ratingVal === 5) baseScore = 100;
      else if (ratingVal === 4) baseScore = 80;
      else if (ratingVal === 3) baseScore = 60;
      else if (ratingVal === 2) baseScore = 40;
      else if (ratingVal === 1) baseScore = 20;
    }

    let completionReward = 0;
    if (isDone || isVerifyPending) {
      if (delayDays === 0) {
        if (extensionCount === 0) {
          completionReward = 25;
        } else if (extensionCount === 1) {
          completionReward = 15;
        }
      }
    }

    const score = Math.max(0, baseScore + completionReward - totalPenalty);

    return {
      score,
      baseScore,
      completionReward,
      penalty: totalPenalty,
      extensionCount,
      delayDays,
      extensionPenalty,
      delayPenalty,
      mainScorePenalty: 0
    };
  } else {
    // --- DELEGATION SCORING LOGIC ---
    const taskWeight = parseInt(taskObj.weight, 10) || 3; // 3, 5, or 10

    // Count extensions
    let extensionCount = 0;
    if (historyList && Array.isArray(historyList)) {
      extensionCount = historyList.filter(
        (h) => String(h.taskId).trim() === String(taskId).trim() && String(h.action).toLowerCase() === "extend date"
      ).length;
    }
    if (taskObj.sheetExtensionCount) {
      extensionCount = Math.max(extensionCount, taskObj.sheetExtensionCount);
    }
    if (extensionCount === 0 && taskObj.dueDate && taskObj.taskStartDate && taskObj.dueDate !== taskObj.taskStartDate) {
      extensionCount = 1;
    }

    let delayDays = 0;
    const deadlineDate = parseDateFromDDMMYYYY(taskObj.dueDate || taskObj.taskStartDate);
    const isDone = taskObj.originalStatus === "Done";
    const isVerifyPending = taskObj.originalStatus === "Verify Pending";
    const actualDate = parseDateFromDDMMYYYY(taskObj.completionDate);

    const cutoffDate = new Date(2026, 7, 1); // August 1, 2026
    cutoffDate.setHours(0, 0, 0, 0);

    if (deadlineDate) {
      let effectiveDeadline = new Date(deadlineDate);
      if (effectiveDeadline < cutoffDate) {
        effectiveDeadline = new Date(cutoffDate);
      }

      if (isDone || isVerifyPending) {
        if (actualDate && actualDate > effectiveDeadline) {
          const diffTime = actualDate - effectiveDeadline;
          delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else if (actualDate && actualDate <= effectiveDeadline) {
          delayDays = 0;
        }
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (today > effectiveDeadline) {
          const diffTime = today - effectiveDeadline;
          delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }
    }

    // Calculate extension and delay penalties based on task value
    let extensionPenalty = 0;
    let delayPenaltyOnTask = 0;
    let mainScorePenalty = 0;

    if (taskWeight === 3) {
      if (extensionCount === 1) extensionPenalty = 1;
      else if (extensionCount >= 2) extensionPenalty = 3;
      if (extensionCount > 2) mainScorePenalty += (extensionCount - 2) * 3;

      if (delayDays === 1) delayPenaltyOnTask = 1;
      else if (delayDays === 2) delayPenaltyOnTask = 3;
      else if (delayDays >= 3) delayPenaltyOnTask = 3;
      if (delayDays > 2) mainScorePenalty += (delayDays - 2) * 3;
    } else if (taskWeight === 5) {
      if (extensionCount === 1) extensionPenalty = 2;
      else if (extensionCount >= 2) extensionPenalty = 5;
      if (extensionCount > 2) mainScorePenalty += (extensionCount - 2) * 5;

      if (delayDays === 1) delayPenaltyOnTask = 1;
      else if (delayDays === 2) delayPenaltyOnTask = 3;
      else if (delayDays >= 3) delayPenaltyOnTask = 5;
      if (delayDays > 3) mainScorePenalty += (delayDays - 3) * 5;
    } else if (taskWeight >= 10) {
      if (extensionCount === 1) extensionPenalty = 2;
      else if (extensionCount === 2) extensionPenalty = 5;
      else if (extensionCount >= 3) extensionPenalty = 10;
      if (extensionCount > 3) mainScorePenalty += (extensionCount - 3) * 10;

      if (delayDays === 1) delayPenaltyOnTask = 2;
      else if (delayDays === 2) delayPenaltyOnTask = 5;
      else if (delayDays >= 3) delayPenaltyOnTask = 10;
      if (delayDays > 3) mainScorePenalty += (delayDays - 3) * 10;
    }

    if (deadlineDate && deadlineDate < cutoffDate) {
      extensionPenalty = 0;
      // Subtract any main score penalties that came from extensions
      if (taskWeight === 3 && extensionCount > 2) mainScorePenalty -= (extensionCount - 2) * 3;
      else if (taskWeight === 5 && extensionCount > 2) mainScorePenalty -= (extensionCount - 2) * 5;
      else if (taskWeight >= 10 && extensionCount > 3) mainScorePenalty -= (extensionCount - 3) * 10;
    }

    // Task Reward is added to score only if completed
    let taskReward = 0;
    if (isDone || isVerifyPending) {
      taskReward = Math.max(0, taskWeight - extensionPenalty - delayPenaltyOnTask);
    }

    return {
      score: taskReward,
      baseScore: taskWeight,
      completionReward: taskReward,
      penalty: extensionPenalty + delayPenaltyOnTask,
      extensionCount,
      delayDays,
      extensionPenalty,
      delayPenalty: delayPenaltyOnTask,
      mainScorePenalty
    };
  }
}

export default function PerformanceDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeSource, setActiveSource] = useState("delegation") // delegation or checklist
  const [tabLoading, setTabLoading] = useState(false)
  const [funnyMsg, setFunnyMsg] = useState("🏥 Updating SBH Group of Hospitals analytics...")

  useEffect(() => {
    if (!loading && !tabLoading) return
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
  }, [loading, tabLoading])
  
  const handleTabChange = (source) => {
    setTabLoading(true)
    setTimeout(() => {
      import("react").then(({ startTransition }) => {
        startTransition(() => {
          setActiveSource(source)
          setTimeout(() => setTabLoading(false), 50)
        })
      }).catch(() => {
        setActiveSource(source)
        setTimeout(() => setTabLoading(false), 50)
      })
    }, 10)
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
    pointDeductions: [],
    leavesList: []
  })

  // Check if current user is admin
  const isAdminUser = () => {
    const role = sessionStorage.getItem("role")
    const isAdminFlag = sessionStorage.getItem("isAdmin")
    return role === "admin" || isAdminFlag === "true"
  }

  const fetchPerformanceData = async (signal) => {
    let masterJson, delegationJson, checklistJson, historyJson = null, loginJson = null, deductionsJson = null, whatsappJson = null;

    try {
      setLoading(true)
      setError(null)
      
      const spreadsheetId = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0"
      
      const masterUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=master&t=${Date.now()}`
      const delegationUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=DELEGATION&t=${Date.now()}`
      const checklistUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Checklist&t=${Date.now()}`
      const historyUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=DELEGATION%20DONE&t=${Date.now()}`
      const loginUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Login%20History&t=${Date.now()}`
      const deductionsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Point%20Deductions&t=${Date.now()}`
      const whatsappUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Whatsapp&t=${Date.now()}`
      const leavesUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Leaves&t=${Date.now()}`

      const [masterRes, delegationRes, checklistRes, historyRes, loginRes, deductionsRes, whatsappRes, leavesRes] = await Promise.all([
        fetch(masterUrl, { signal }),
        fetch(delegationUrl, { signal }),
        fetch(checklistUrl, { signal }),
        fetch(historyUrl, { signal }).catch(() => null),
        fetch(loginUrl, { signal }).catch(() => null),
        fetch(deductionsUrl, { signal }).catch(() => null),
        fetch(whatsappUrl, { signal }).catch(() => null),
        fetch(leavesUrl, { signal }).catch(() => null)
      ])

      if (!masterRes.ok || !delegationRes.ok || !checklistRes.ok || !whatsappRes.ok) {
        throw new Error("Failed to retrieve Google Sheet performance datasets.")
      }

      const parseResponseJson = async (res) => {
        const text = await res.text()
        const start = text.indexOf("{")
        const end = text.lastIndexOf("}")
        const jsonStr = text.substring(start, end + 1)
        return JSON.parse(jsonStr)
      }

      masterJson = await parseResponseJson(masterRes)
      delegationJson = await parseResponseJson(delegationRes)
      checklistJson = await parseResponseJson(checklistRes)
      whatsappJson = await parseResponseJson(whatsappRes)
      let leavesJson = null
      
      if (leavesRes && leavesRes.ok) {
        leavesJson = await parseResponseJson(leavesRes).catch(() => null)
      }
      
      if (historyRes && historyRes.ok) {
        historyJson = await parseResponseJson(historyRes)
      }

      if (loginRes && loginRes.ok) {
        loginJson = await parseResponseJson(loginRes).catch(() => null)
      }

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

      const leavesList = []
      if (leavesJson && leavesJson.table && leavesJson.table.rows) {
        leavesJson.table.rows.forEach(row => {
          if (row.c) {
            const uName = row.c[1] && row.c[1].v ? String(row.c[1].v).trim().toLowerCase() : "";
            const startDateObj = parseDateValue(row.c[2]);
            const endDateObj = parseDateValue(row.c[3]);
            const targetSheet = row.c[4] && row.c[4].v ? String(row.c[4].v).trim() : "both";
            if (uName && startDateObj && endDateObj) {
              leavesList.push({
                username: uName,
                startDateObj,
                endDateObj,
                targetSheet
              });
            }
          }
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

      // Process master sheet options (for departments)
      const departments = []
      if (masterJson.table && masterJson.table.rows) {
        masterJson.table.rows.slice(1).forEach((row) => {
          if (row.c && row.c[0] && row.c[0].v) {
            const val = row.c[0].v.toString().trim()
            if (val !== "") departments.push(val)
          }
        })
      }

      // Process Whatsapp sheet for active/inactive users, roles, and doers
      const doers = []
      const inactiveUsers = new Set()
      const activeUsers = new Set()
      if (whatsappJson && whatsappJson.table && whatsappJson.table.rows) {
        whatsappJson.table.rows.forEach((row, idx) => {
          if (idx === 0) return // Skip header row
          const username = row.c && row.c[2] && row.c[2].v ? row.c[2].v.toString().trim() : ""
          const role = row.c && row.c[4] && row.c[4].v ? row.c[4].v.toString().trim().toLowerCase() : ""
          
          if (username) {
            const usernameLower = username.toLowerCase()
            if (role === "inactive" || role === "in active") {
              inactiveUsers.add(usernameLower)
            } else {
              activeUsers.add(usernameLower)
              doers.push(username)
            }
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
          if (assignedTo && !activeUsers.has(assignedTo.toLowerCase())) return

          // Skip Leave
          const columnQValue = getCellValue(row, 16)
          const columnMValue = getCellValue(row, 12)
          if (
            (columnQValue && columnQValue.toString().trim().toLowerCase() === "leave") ||
            (columnMValue && columnMValue.toString().trim().toLowerCase() === "leave")
          ) return

          const taskStartDateVal = getCellValue(row, 6) // Column G
          const taskStartDate = taskStartDateVal ? parseGoogleSheetsDate(String(taskStartDateVal)) : ""

          // Dynamic leave check
          const taskDateObj = parseDateFromDDMMYYYY(taskStartDate)
          if (taskDateObj && assignedTo) {
            const isL = leavesList.some(l => {
              if (l.username !== assignedTo.trim().toLowerCase()) return false;
              if (l.targetSheet !== "both" && l.targetSheet !== "DELEGATION") return false;
              
              const startD = new Date(l.startDateObj);
              const endD = new Date(l.endDateObj);
              startD.setHours(0,0,0,0);
              endD.setHours(23,59,59,999);
              return taskDateObj >= startD && taskDateObj <= endD;
            });
            if (isL) return; // Skip
          }

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
            rating: getCellValue(row, 17) || "",
            weight: parseInt(getCellValue(row, 21), 10) || 3,
            sheetExtensionCount: parseInt(getCellValue(row, 22), 10) || 0
          }

          // Compute penalty and score matching calculateTaskScore
          let scoreDetails = { score: 0, baseScore: 3, completionReward: 0, penalty: 0, extensionCount: 0, delayDays: 0, extensionPenalty: 0, delayPenalty: 0, mainScorePenalty: 0 }
          try {
            scoreDetails = calculateTaskScore(rawTask, historyList, false)
          } catch (scoreErr) {
            console.error("Error calculating delegation task score:", scoreErr, rawTask)
          }
          rawTask.score = scoreDetails.score
          rawTask.baseScore = scoreDetails.baseScore
          rawTask.completionReward = scoreDetails.completionReward
          rawTask.penalty = scoreDetails.penalty
          rawTask.extensionCount = scoreDetails.extensionCount
          rawTask.delayDays = scoreDetails.delayDays
          rawTask.extensionPenalty = scoreDetails.extensionPenalty
          rawTask.delayPenalty = scoreDetails.delayPenalty
          rawTask.mainScorePenalty = scoreDetails.mainScorePenalty

          delegationTasks.push(rawTask)

          const s = delegationStaffTracking.get(assignedTo)
          s.totalTasks++
          if (status === "completed") s.completedTasks++
          else s.pendingTasks++
        })
      }

      const delegationStaff = Array.from(delegationStaffTracking.values())
        .filter(staff => activeUsers.has(staff.name.toLowerCase()))
        .map(staff => ({
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

          let taskId = getCellValue(row, 1) // Column B
          const assignedToRaw = getCellValue(row, 4) // Column E
          const assignedTo = assignedToRaw ? String(assignedToRaw).trim() : ""

          if (!assignedTo || assignedTo === "") return
          if (assignedTo && !activeUsers.has(assignedTo.toLowerCase())) return

          if (!taskId || taskId === "" || String(taskId).trim().toLowerCase() === "null") {
            taskId = `row_${rowIndex}`
          }

          // Skip Leave
          const columnQValue = getCellValue(row, 16)
          const columnMValue = getCellValue(row, 12)
          if (
            (columnQValue && columnQValue.toString().trim().toLowerCase() === "leave") ||
            (columnMValue && columnMValue.toString().trim().toLowerCase() === "leave")
          ) return

          const taskStartDateVal = getCellValue(row, 6) // Column G
          const taskStartDate = taskStartDateVal ? parseGoogleSheetsDate(String(taskStartDateVal)) : ""

          // Dynamic leave check
          const taskDateObj = parseDateFromDDMMYYYY(taskStartDate)
          if (taskDateObj && assignedTo) {
            const isL = leavesList.some(l => {
              if (l.username !== assignedTo.trim().toLowerCase()) return false;
              if (l.targetSheet !== "both" && l.targetSheet !== "Checklist") return false;
              
              const startD = new Date(l.startDateObj);
              const endD = new Date(l.endDateObj);
              startD.setHours(0,0,0,0);
              endD.setHours(23,59,59,999);
              return taskDateObj >= startD && taskDateObj <= endD;
            });
            if (isL) return; // Skip
          }

          const completionDateVal = getCellValue(row, 10) // Column K
          const completionDate = completionDateVal ? parseGoogleSheetsDate(String(completionDateVal)) : ""

          if (!checklistStaffTracking.has(assignedTo)) {
            checklistStaffTracking.set(assignedTo, {
              name: assignedTo, totalTasks: 0, completedTasks: 0, pendingTasks: 0
            })
          }

          let status = "pending"
          const freq = getCellValue(row, 7) || "daily"
          if (completionDate && completionDate !== "") {
            status = "completed"
          } else if (isChecklistTaskOverdue(taskStartDate, freq)) {
            status = "overdue"
          }

          const rawTask = {
            id: String(taskId).trim(),
            title: getCellValue(row, 5) || "Untitled Checklist",
            assignedTo,
            taskStartDate,
            dueDate: taskStartDate,
            completionDate,
            status,
            frequency: getCellValue(row, 7) || "daily",
            originalStatus: completionDate ? "Done" : "Pending"
          }

          let scoreDetails = { score: 100, baseScore: 100, completionReward: 0, penalty: 0, extensionCount: 0, delayDays: 0, extensionPenalty: 0, delayPenalty: 0 }
          try {
            scoreDetails = calculateTaskScore(rawTask, [], true)
          } catch (scoreErr) {
            console.error("Error calculating checklist task score:", scoreErr, rawTask)
          }
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

      const checklistStaff = Array.from(checklistStaffTracking.values())
        .filter(staff => activeUsers.has(staff.name.toLowerCase()))
        .map(staff => ({
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
        pointDeductions: deductionsList,
        inactiveUsers: Array.from(inactiveUsers),
        leavesList
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
      <div className="relative min-h-[500px]">
        {loading ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 rounded-2xl">
            <div className="flex flex-col items-center justify-center space-y-4 max-w-xs w-full text-center">
              <div className="relative flex items-center justify-center">
                <svg className="animate-spin h-12 w-12 text-[#9333EA]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="spinner-grad-perf" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9333EA" />
                      <stop offset="100%" stopColor="#DB2777" />
                    </linearGradient>
                  </defs>
                  <circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-90" fill="url(#spinner-grad-perf)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="text-center space-y-1">
                <p className="text-slate-800 text-xs font-semibold tracking-wide animate-pulse">
                  {funnyMsg}
                </p>
                <p className="text-[10px] uppercase font-black tracking-widest bg-gradient-to-r from-[#9333EA] to-[#DB2777] bg-clip-text text-transparent">
                  Loading Performance...
                </p>
              </div>
            </div>
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
            inactiveUsers={data.inactiveUsers || []}
            leavesList={data.leavesList}
            onRefresh={() => fetchPerformanceData(null, true)}
          />
        )}
      </div>
    </AdminLayout>
  )
}
