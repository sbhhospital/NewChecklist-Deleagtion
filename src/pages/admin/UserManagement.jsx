"use client"

import { useState, useEffect, useMemo } from "react"
import { Users, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, Upload, Mail, Phone, Shield, Eye, EyeOff, Clipboard, AlertCircle } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec",
  SPREADSHEET_ID: "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0",
  DRIVE_FOLDER_ID: "1Jxb5aE-VymJfVkMTvPELt8yRgslSFNXd"
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [checklistSubmitLoading, setChecklistSubmitLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState("")

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
  
  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  
  // Unique dropdown options fetched from Master/Whatsapp sheets
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [givenByOptions, setGivenByOptions] = useState([])

  // Modals / Forms
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [checklists, setChecklists] = useState([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  
  // Form states for user
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    role: "user",
    email: "",
    phone: "",
    department: "all",
    photoUrl: ""
  })
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [editingRowIndex, setEditingRowIndex] = useState(-1)
  const [showPasswordMap, setShowPasswordMap] = useState({})
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  
  // Form states for checklist
  const [checklistForm, setChecklistForm] = useState({
    taskId: "",
    department: "",
    givenBy: "",
    doer: "",
    description: "",
    frequency: "Daily",
    reminders: "Yes",
    attachment: "No"
  })
  const [isEditingChecklist, setIsEditingChecklist] = useState(false)
  const [editingChecklistRowIndex, setEditingChecklistRowIndex] = useState(-1)
  const [checklistSearchTerm, setChecklistSearchTerm] = useState("")
  const [checklistModalMessage, setChecklistModalMessage] = useState({ text: "", type: "" })

  // Fetch unique options for checklist inputs from both master and Whatsapp sheets
  const fetchDropdownOptions = async () => {
    try {
      const depts = new Set(["sales", "jockey", "md", "all"])
      const givenBy = new Set(["admin"])

      const processSheet = async (sheetName) => {
        try {
          const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`
          const resp = await fetch(url)
          if (!resp.ok) return
          const text = await resp.text()
          const start = text.indexOf('{')
          const end = text.lastIndexOf('}')
          const data = JSON.parse(text.substring(start, end + 1))
          
          if (data && data.table && data.table.rows && data.table.rows.length > 0) {
            const headers = data.table.cols 
              ? data.table.cols.map(c => c.label ? c.label.toLowerCase().trim() : "") 
              : []
            
            const deptIdx = headers.findIndex(h => h.includes("department") || h === "dept")
            const givenByIdx = headers.findIndex(h => h.includes("given by") || h.includes("givenby") || h.includes("assigner"))
            
            data.table.rows.forEach(row => {
              if (!row || !row.c) return
              
              if (deptIdx !== -1 && row.c[deptIdx] && row.c[deptIdx].v) {
                depts.add(row.c[deptIdx].v.toString().trim())
              }
              
              if (givenByIdx !== -1 && row.c[givenByIdx] && row.c[givenByIdx].v) {
                givenBy.add(row.c[givenByIdx].v.toString().trim())
              }
            })
          }
        } catch (err) {
          console.error(`Error processing ${sheetName} for dropdowns:`, err)
        }
      }

      await processSheet("master")
      await processSheet("Whatsapp")

      setDepartmentOptions([...depts].filter(Boolean).sort())
      setGivenByOptions([...givenBy].filter(Boolean).sort())
    } catch (err) {
      console.error("Error fetching dropdown options:", err)
    }
  }

  // Fetch users list from Master sheet
  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Whatsapp`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch users from Whatsapp sheet")
      const text = await response.text()
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Invalid master sheet response format")
      }
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonString)
      console.log("DEBUG - raw table rows from sheet:", data?.table?.rows)
      
      if (!data.table || !data.table.rows || data.table.rows.length === 0) {
        setUsers([])
        return
      }

      const headers = data.table.cols 
        ? data.table.cols.map(c => c.label ? c.label.toLowerCase().trim() : "") 
        : []

      const deptIdx = headers.findIndex(h => h.includes("department") || h === "dept")
      const usernameIdx = headers.indexOf("username")
      const passwordIdx = headers.indexOf("password")
      const roleIdx = headers.indexOf("role")
      const emailIdx = headers.findIndex(h => h.includes("email") || h === "email id")
      const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("number"))
      const photoIdx = headers.findIndex(h => h.includes("photo") || h.includes("profile"))

      const parsedUsers = data.table.rows.map((row, idx) => {
        const getVal = (colIdx, fallbackIdx) => {
          const targetIdx = colIdx !== -1 ? colIdx : fallbackIdx
          if (!row || !row.c || targetIdx >= row.c.length || !row.c[targetIdx]) return ""
          return row.c[targetIdx].v !== undefined && row.c[targetIdx].v !== null ? row.c[targetIdx].v : ""
        }
        return {
          rowIndex: idx + 2, // Row index is ALWAYS idx + 2 (row 1 is headers)
          department: getVal(deptIdx, 1),
          username: getVal(usernameIdx, 2),
          password: getVal(passwordIdx, 3),
          role: getVal(roleIdx, 4) || "user",
          email: getVal(emailIdx, 5),
          phone: getVal(phoneIdx, 6),
          photoUrl: getVal(photoIdx, 7)
        }
      }).filter(user => user.username && String(user.username).trim() !== "")
      
      console.log("DEBUG - parsed users to set:", parsedUsers)
      setUsers(parsedUsers)
    } catch (err) {
      console.error("Error fetching users list:", err)
      setError("Error fetching users list. Please try again.")
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Fetch unique checklists
  const fetchChecklists = async (silent = false) => {
    if (!silent) setChecklistLoading(true)
    try {
      // Fetch directly from spreadsheet viz for high performance
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Unique&t=${Date.now()}`)
      if (!response.ok) throw new Error("Failed to fetch checklists")
      const text = await response.text()
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1))

      if (!data.table || !data.table.rows) throw new Error("Invalid data format")

      const headers = data.table.cols
        ? data.table.cols.map(c => c.label ? c.label.toLowerCase().trim() : "")
        : []

      const taskIdIdx = headers.findIndex(h => h.includes("task id") || h === "taskid")
      const deptIdx = headers.findIndex(h => h.includes("department") || h === "dept")
      const givenByIdx = headers.findIndex(h => h.includes("given by") || h.includes("givenby"))
      const doerIdx = headers.findIndex(h => h.includes("doer") || h === "name" || h === "doers")
      const descIdx = headers.findIndex(h => h.includes("description") || h === "task description")
      const startDateIdx = headers.findIndex(h => h.includes("start date") || h.includes("startdate"))
      const freqIdx = headers.findIndex(h => h.includes("freq") || h === "frequency")
      const remindersIdx = headers.findIndex(h => h.includes("reminder") || h.includes("reminders"))
      const attachIdx = headers.findIndex(h => h.includes("attachment") || h.includes("attachments") || h.includes("require"))

      const parsedChecklists = data.table.rows.map((row, idx) => {
        const getVal = (colIdx, fallbackIdx) => {
          const targetIdx = colIdx !== -1 ? colIdx : fallbackIdx
          if (!row || !row.c || targetIdx >= row.c.length || !row.c[targetIdx]) return ""
          const v = row.c[targetIdx].v
          return v !== undefined && v !== null ? v : ""
        }
        return {
          rowIndex: idx + 2,
          taskId: String(getVal(taskIdIdx, 1)).trim(),
          department: getVal(deptIdx, 2),
          givenBy: getVal(givenByIdx, 3),
          doer: getVal(doerIdx, 4),
          description: getVal(descIdx, 5),
          startDate: getVal(startDateIdx, 6),
          frequency: getVal(freqIdx, 7),
          reminders: getVal(remindersIdx, 8),
          attachment: getVal(attachIdx, 9)
        }
      }).filter(item => item.taskId || item.description) // skip completely empty rows
      setChecklists(parsedChecklists)
    } catch (err) {
      console.error("fetchChecklists error:", err)
    } finally {
      if (!silent) setChecklistLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchDropdownOptions()
  }, [])

  // Filtered users list (excluding department match checks in main search queries if not needed)
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const uName = user.username ? String(user.username) : "";
      const uEmail = user.email ? String(user.email) : "";
      const uRole = user.role ? String(user.role) : "";

      const matchesSearch = 
        uName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uEmail.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesRole = 
        roleFilter === "all" ||
        uRole.toLowerCase().trim() === roleFilter.toLowerCase().trim()
      
      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, roleFilter])

  // Filtered checklists for selected user
  const userChecklists = useMemo(() => {
    if (!selectedUser) return []
    return checklists.filter(item => {
      const matchesUser = item.doer.toLowerCase().trim() === selectedUser.username.toLowerCase().trim()
      const matchesSearch = item.description.toLowerCase().includes(checklistSearchTerm.toLowerCase()) ||
                            item.department.toLowerCase().includes(checklistSearchTerm.toLowerCase())
      return matchesUser && matchesSearch
    })
  }, [checklists, selectedUser, checklistSearchTerm])

  // Handle Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setUploadingPhoto(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        const base64Data = reader.result
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            action: "uploadFile",
            base64Data: base64Data,
            fileName: `profile_${Date.now()}_${file.name}`,
            mimeType: file.type,
            folderId: CONFIG.DRIVE_FOLDER_ID
          })
        })
        const result = await response.json()
        if (result.success) {
          setUserForm(prev => ({ ...prev, photoUrl: result.fileUrl }))
          showToast("Photo uploaded successfully!", "success")
        } else {
          showToast("Photo upload failed: " + result.error, "error")
        }
      }
    } catch (err) {
      console.error(err)
      showToast("Error uploading file.", "error")
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Manage User Submission (Insert or Update)
  const handleUserSubmit = async (e) => {
    e.preventDefault()
    setSubmitLoading(true)
    try {
      const rowData = [
        new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        userForm.department || "all",
        String(userForm.username).trim(),
        String(userForm.password).trim(),
        userForm.role,
        String(userForm.email).trim(),
        String(userForm.phone).trim(),
        userForm.photoUrl || ""
      ]
      
      const payload = {
        action: "manageUser",
        subAction: isEditingUser ? "update" : "insert",
        rowData: JSON.stringify(rowData)
      }
      
      if (isEditingUser) {
        payload.rowIndex = editingRowIndex
      }
      
      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(payload)
      })
      const result = await response.json()
      
      if (result.success) {
        showToast(isEditingUser ? "User updated successfully!" : "User added successfully!", "success")
        setIsUserModalOpen(false)
        fetchUsers(true) // Silent refresh
      } else {
        showToast("Error: " + result.error, "error")
      }
    } catch (err) {
      console.error(err)
      showToast("Failed to save user.", "error")
    } finally {
      setSubmitLoading(false)
    }
  }

  // Delete User
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) return
    setSubmitLoading(true)
    try {
      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "manageUser",
          subAction: "delete",
          rowIndex: user.rowIndex,
          rowData: JSON.stringify([])
        })
      })
      const result = await response.json()
      if (result.success) {
        showToast("User deleted successfully!", "success")
        fetchUsers(true) // Silent reload in background
      } else {
        showToast("Error: " + result.error, "error")
      }
    } catch (err) {
      console.error(err)
      showToast("Failed to delete user.", "error")
    } finally {
      setSubmitLoading(false)
    }
  }

  // Manage Checklist Submission (Insert or Update)
  const handleChecklistSubmit = async (e) => {
    e.preventDefault()
    setChecklistSubmitLoading(true)
    setChecklistModalMessage({ text: "Saving template to sheet... Please wait.", type: "info" })

    const taskId = isEditingChecklist ? checklistForm.taskId : `task_${Date.now()}`
    const rowData = [
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      taskId,
      checklistForm.department || selectedUser.department || "all",
      checklistForm.givenBy || "admin",
      selectedUser.username,
      checklistForm.description.trim(),
      formatDateToDDMMYYYY(new Date()),
      checklistForm.frequency,
      checklistForm.reminders,
      checklistForm.attachment
    ]

    const payload = {
      action: "manageUniqueChecklist",
      subAction: isEditingChecklist ? "update" : "insert",
      taskId: taskId,
      rowData: JSON.stringify(rowData)
    }

    if (isEditingChecklist) {
      payload.rowIndex = editingChecklistRowIndex
    }

    try {
      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(payload)
      })
      const result = await response.json()

      if (result.success) {
        // ✅ Optimistic UI update — reflect changes immediately in local state
        if (isEditingChecklist) {
          setChecklists(prev => prev.map(item =>
            item.taskId === checklistForm.taskId
              ? {
                  ...item,
                  department: checklistForm.department || item.department,
                  givenBy: checklistForm.givenBy || item.givenBy,
                  description: checklistForm.description.trim(),
                  frequency: checklistForm.frequency,
                  reminders: checklistForm.reminders,
                  attachment: checklistForm.attachment
                }
              : item
          ))
        } else {
          const newItem = {
            rowIndex: -1, // Temporary until background refresh
            taskId: taskId,
            department: checklistForm.department || selectedUser.department || "all",
            givenBy: checklistForm.givenBy || "admin",
            doer: selectedUser.username,
            description: checklistForm.description.trim(),
            startDate: formatDateToDDMMYYYY(new Date()),
            frequency: checklistForm.frequency,
            reminders: checklistForm.reminders,
            attachment: checklistForm.attachment
          }
          setChecklists(prev => [...prev, newItem])
        }

        // Reset form
        const emptyForm = {
          taskId: "",
          department: departmentOptions[0] || "all",
          givenBy: givenByOptions[0] || "admin",
          doer: selectedUser.username,
          description: "",
          frequency: "Daily",
          reminders: "Yes",
          attachment: "No"
        }
        setChecklistForm(emptyForm)
        setIsEditingChecklist(false)
        setChecklistModalMessage({
          text: isEditingChecklist ? "Checklist template updated successfully!" : "Checklist template added successfully!",
          type: "success"
        })
        
        // Hide message after 4 seconds
        setTimeout(() => {
          setChecklistModalMessage({ text: "", type: "" })
        }, 4000)

        // Silent background refresh to get accurate rowIndexes from sheet
        fetchChecklists(true)
      } else {
        console.error("Sheet save error:", result.error)
        setChecklistModalMessage({ text: "Error: " + result.error, type: "error" })
      }
    } catch (err) {
      console.error("Network error saving checklist:", err)
      setChecklistModalMessage({ text: "Network error — please check your internet connection.", type: "error" })
    } finally {
      setChecklistSubmitLoading(false)
    }
  }

  // Delete Checklist
  const handleDeleteChecklist = async (item) => {
    if (!window.confirm("Are you sure you want to delete this checklist task?")) return
    setChecklistSubmitLoading(true)
    setChecklistModalMessage({ text: "Deleting template... Please wait.", type: "info" })
    try {
      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "manageUniqueChecklist",
          subAction: "delete",
          rowIndex: item.rowIndex,
          taskId: item.taskId,
          rowData: JSON.stringify([])
        })
      })
      const result = await response.json()
      if (result.success) {
        setChecklists(prev => prev.filter(c => c.taskId !== item.taskId))
        setChecklistModalMessage({ text: "Checklist template deleted successfully!", type: "success" })
        setTimeout(() => {
          setChecklistModalMessage({ text: "", type: "" })
        }, 4000)
        fetchChecklists(true)
      } else {
        setChecklistModalMessage({ text: "Error: " + result.error, type: "error" })
      }
    } catch (err) {
      console.error(err)
      setChecklistModalMessage({ text: "Failed to delete checklist due to connection error.", type: "error" })
    } finally {
      setChecklistSubmitLoading(false)
    }
  }

  const showToast = (msg, type = "success") => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(""), 4000)
  }

  const formatDateToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Robust Drive Image Exporter from Dashboard.jsx
  const getDisplayableImageUrl = (url) => {
    if (!url) return null;
    try {
      const urlStr = String(url).trim();
      if (urlStr.includes("thumbnail?id=")) {
        return urlStr;
      }
      const anyIdMatch = urlStr.match(/([a-zA-Z0-9_-]{25,})/);
      if (anyIdMatch && anyIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${anyIdMatch[1]}&sz=w150`;
      }
      return urlStr;
    } catch (e) {
      console.error("Error processing image URL:", url, e);
      return url;
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20">
        {/* Header Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 w-fit">
              <Shield className="h-3 w-3" />
              Administrative Controls
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-slate-900">
              Staff & User Management
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Manage system access credentials, edit roles, deactivate employees, and configure customized checklists.
            </p>
          </div>
          <button
            onClick={() => {
              setIsEditingUser(false)
              setUserForm({
                username: "",
                password: "",
                role: "user",
                email: "",
                phone: "",
                department: "all",
                photoUrl: ""
              })
              setIsUserModalOpen(true)
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-sm"
          >
            <Plus className="h-4 w-4" />
            Add New User
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold text-sm">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-92">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none w-full text-sm font-semibold transition-all"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-2 px-4 border border-slate-200 rounded-xl bg-slate-50/50 outline-none text-sm font-semibold cursor-pointer w-full md:w-auto"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative min-h-[300px]">
          {loading ? (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 rounded-2xl">
              <div className="flex flex-col items-center justify-center space-y-4 max-w-xs w-full text-center">
                  <div className="relative flex items-center justify-center">
                    <svg className="animate-spin h-10 w-10 text-[#9333EA]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="spinner-grad-users" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#9333EA" />
                          <stop offset="100%" stopColor="#DB2777" />
                        </linearGradient>
                      </defs>
                      <circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-90" fill="url(#spinner-grad-users)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-slate-800 text-xs font-semibold tracking-wide animate-pulse">
                      {funnyMsg}
                    </p>
                    <p className="text-[9px] uppercase font-black tracking-widest bg-gradient-to-r from-[#9333EA] to-[#DB2777] bg-clip-text text-transparent">
                      Loading Workforce...
                    </p>
                  </div>
                </div>
              </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4">Profile</th>
                    <th className="px-6 py-4">Username</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Password</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredUsers.map((user) => {
                    const rawRole = user.role ? String(user.role).toLowerCase().trim() : "user";
                    const isInactive = rawRole === "inactive" || rawRole === "in active"
                    return (
                      <tr key={user.rowIndex} className={`hover:bg-slate-50/50 transition-colors ${isInactive ? 'bg-slate-50/70 opacity-60' : ''}`}>
                        <td className="px-6 py-4">
                          <img
                            src={getDisplayableImageUrl(user.photoUrl) || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"}
                            alt={user.username}
                            className="h-10 w-10 rounded-full object-cover border border-slate-200"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150";
                            }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-slate-900 text-sm block">{user.username}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">Row ID: {user.rowIndex}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            rawRole === "admin"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : isInactive
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            {isInactive ? "INACTIVE" : rawRole.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono relative">
                          <div className="flex items-center gap-1.5">
                            <span>{showPasswordMap[user.rowIndex] ? user.password : "••••••••"}</span>
                            <button
                              onClick={() => setShowPasswordMap(prev => ({ ...prev, [user.rowIndex]: !prev[user.rowIndex] }))}
                              className="text-slate-400 hover:text-slate-600 outline-none"
                            >
                              {showPasswordMap[user.rowIndex] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 space-y-1 font-medium text-slate-500">
                          <div className="flex items-center gap-1"><Mail size={12} /> {user.email || "—"}</div>
                          <div className="flex items-center gap-1"><Phone size={12} /> {user.phone || "—"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                fetchChecklists()
                                setChecklistForm({
                                  department: user.department || departmentOptions[0] || "all",
                                  givenBy: givenByOptions[0] || "admin",
                                  doer: user.username,
                                  description: "",
                                  frequency: "Daily",
                                  reminders: "Yes",
                                  attachment: "No"
                                })
                                setIsChecklistModalOpen(true)
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all border border-indigo-100 text-[10px]"
                            >
                              <Clipboard className="h-3.5 w-3.5" />
                              Manage Checklists
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingUser(true)
                                setEditingRowIndex(user.rowIndex)
                                
                                const rawRole = user.role ? String(user.role).toLowerCase().trim() : "user";
                                const roleVal = (rawRole === "inactive" || rawRole === "in active") ? "inactive" : rawRole;

                                setUserForm({
                                  username: user.username,
                                  password: user.password,
                                  role: roleVal,
                                  email: user.email,
                                  phone: user.phone,
                                  department: user.department || "all",
                                  photoUrl: user.photoUrl
                                })
                                setIsUserModalOpen(true)
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-all cursor-pointer"
                              title="Edit User"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100 transition-all cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Form Modal */}
        {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300">
              <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  {isEditingUser ? "Modify User Credentials" : "Register New Staff Member"}
                </h3>
                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                    <input
                      type="text"
                      required
                      value={userForm.username}
                      onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="e.g. NAMAN MISHRA"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none text-sm font-semibold transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                    <input
                      type="text"
                      required
                      value={userForm.password}
                      onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none text-sm font-semibold transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">System Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none text-sm font-semibold transition-all cursor-pointer"
                    >
                      <option value="user">User (Standard)</option>
                      <option value="admin">Admin (Full Control)</option>
                      <option value="inactive">Inactive (Deactivated)</option>
                    </select>
                  </div>
                  
                  {/* Phone number & Photo on the same row */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number</label>
                    <input
                      type="text"
                      value={userForm.phone}
                      onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none text-sm font-semibold transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Email ID</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. name@hospital.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none text-sm font-semibold transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Profile Photo</label>
                    <div className="flex items-center gap-3">
                      <img
                        src={getDisplayableImageUrl(userForm.photoUrl) || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"}
                        className="h-10 w-10 rounded-full object-cover border border-slate-200"
                        alt="Preview"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150";
                        }}
                      />
                      <label className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-all text-xs font-bold flex-1 text-center justify-center">
                        <Upload className="h-3.5 w-3.5 text-indigo-600" />
                        {uploadingPhoto ? "..." : "Upload"}
                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="px-4 py-2 text-slate-500 hover:bg-slate-50 font-bold rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Checklist Management Modal */}
        {isChecklistModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 text-slate-100 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-800 overflow-hidden transform transition-all duration-300 max-h-[90vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
                <div>
                  <h3 className="font-extrabold text-indigo-400 text-lg flex items-center gap-2">
                    <Clipboard className="h-5 w-5 text-indigo-400 animate-pulse" />
                    Manage Checklists: {selectedUser.username}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Assign, modify, or remove checklist configuration templates for this employee.</p>
                </div>
                <button onClick={() => setIsChecklistModalOpen(false)} className="text-slate-400 hover:text-rose-400 transition-colors">
                  <XCircle className="h-7 w-7" />
                </button>
              </div>

              {/* Modal Alert Message (Inside Popup) */}
              {checklistModalMessage.text && (
                <div className="px-6 pt-4 flex-shrink-0">
                  <div className={`p-4 rounded-2xl flex items-center gap-3 border text-xs font-bold transition-all ${
                    checklistModalMessage.type === "success" 
                      ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                      : checklistModalMessage.type === "error"
                      ? "bg-rose-950/40 border-rose-800 text-rose-400"
                      : "bg-indigo-950/40 border-indigo-800 text-indigo-400"
                  }`}>
                    {checklistModalMessage.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                    {checklistModalMessage.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400" />}
                    {checklistModalMessage.type === "info" && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400"></div>}
                    <span>{checklistModalMessage.text}</span>
                  </div>
                </div>
              )}

              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                
                {/* Form to Add / Edit Checklist Template */}
                <div className="bg-slate-950/60 border border-slate-800/80 p-6 rounded-2xl space-y-4">
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    {isEditingChecklist ? <Edit2 className="h-4 w-4 text-amber-500" /> : <Plus className="h-4 w-4 text-indigo-400" />}
                    {isEditingChecklist ? "Modify Configured Template" : "Assign New Template"}
                  </h4>
                  <form onSubmit={handleChecklistSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Department Select */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</label>
                        <select
                          value={checklistForm.department}
                          onChange={(e) => setChecklistForm(prev => ({ ...prev, department: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs font-semibold transition-all cursor-pointer text-slate-100"
                        >
                          {departmentOptions.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>

                      {/* Given By */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Given By</label>
                        <select
                          value={checklistForm.givenBy}
                          onChange={(e) => setChecklistForm(prev => ({ ...prev, givenBy: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs font-semibold transition-all cursor-pointer text-slate-100"
                        >
                          {givenByOptions.map(user => (
                            <option key={user} value={user}>{user}</option>
                          ))}
                        </select>
                      </div>

                      {/* Frequency */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frequency</label>
                        <select
                          value={checklistForm.frequency}
                          onChange={(e) => setChecklistForm(prev => ({ ...prev, frequency: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs font-semibold transition-all cursor-pointer text-slate-100"
                        >
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Fortnightly">Fortnightly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task Description</label>
                      <textarea
                        required
                        rows={2}
                        value={checklistForm.description}
                        onChange={(e) => setChecklistForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Define the checklist details or activity requirements..."
                        className="w-full px-4 py-2 border border-slate-800 rounded-xl bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs font-semibold transition-all resize-none text-slate-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Reminders</label>
                        <select
                          value={checklistForm.reminders}
                          onChange={(e) => setChecklistForm(prev => ({ ...prev, reminders: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs font-semibold transition-all cursor-pointer text-slate-100"
                        >
                          <option value="Yes">Yes (Enabled)</option>
                          <option value="No">No (Disabled)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Require Receipt Attachment</label>
                        <select
                          value={checklistForm.attachment}
                          onChange={(e) => setChecklistForm(prev => ({ ...prev, attachment: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs font-semibold transition-all cursor-pointer text-slate-100"
                        >
                          <option value="No">No (Optional Upload)</option>
                          <option value="Yes">Yes (Mandatory Upload)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
                      {isEditingChecklist && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingChecklist(false)
                            setChecklistForm({
                              department: departmentOptions[0] || "all",
                              givenBy: givenByOptions[0] || "admin",
                              doer: selectedUser.username,
                              description: "",
                              frequency: "Daily",
                              reminders: "Yes",
                              attachment: "No"
                            })
                          }}
                          className="px-4 py-2 text-slate-400 hover:text-slate-200 font-bold rounded-xl text-xs transition-colors"
                        >
                          Cancel Edit
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={checklistSubmitLoading}
                        className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        {checklistSubmitLoading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>}
                        {isEditingChecklist ? "Save Changes" : "Create Template"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Templates List */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-300 text-sm">Configured Checklist Templates ({userChecklists.length})</h4>
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={checklistSearchTerm}
                      onChange={(e) => setChecklistSearchTerm(e.target.value)}
                      className="px-3 py-1.5 border border-slate-800 rounded-lg text-xs font-semibold focus:border-indigo-500 outline-none bg-slate-950 text-slate-100"
                    />
                  </div>

                  {checklistLoading ? (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 inline-block"></div>
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 max-h-60 overflow-y-auto custom-scrollbar">
                      {userChecklists.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 text-xs font-semibold">
                          No unique checklist templates assigned to this employee.
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                              <th className="px-4 py-3">Description</th>
                              <th className="px-4 py-3">Frequency</th>
                              <th className="px-4 py-3">Reminders</th>
                              <th className="px-4 py-3">Attachment</th>
                              <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 text-[11px] font-semibold text-slate-300">
                            {userChecklists.map((item) => (
                              <tr key={item.rowIndex} className="hover:bg-slate-900/50 transition-colors">
                                <td className="px-4 py-3 text-slate-100 font-bold max-w-sm truncate" title={item.description}>
                                  {item.description}
                                </td>
                                <td className="px-4 py-3 text-indigo-400">{item.frequency}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${item.reminders === "Yes" ? "bg-emerald-950 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                                    {item.reminders === "Yes" ? "Enabled" : "Disabled"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${item.attachment === "Yes" ? "bg-amber-950 text-amber-400" : "bg-slate-800 text-slate-400"}`}>
                                    {item.attachment === "Yes" ? "Mandatory" : "Optional"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setIsEditingChecklist(true)
                                        setEditingChecklistRowIndex(item.rowIndex)
                                        setChecklistForm({
                                          taskId: item.taskId,
                                          department: item.department,
                                          givenBy: item.givenBy,
                                          doer: item.doer,
                                          description: item.description,
                                          frequency: item.frequency,
                                          reminders: item.reminders,
                                          attachment: item.attachment
                                        })
                                      }}
                                      className="p-1.5 text-amber-400 hover:text-amber-300 bg-slate-900 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                      title="Edit Template"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteChecklist(item)}
                                      className="p-1.5 text-rose-400 hover:text-rose-300 bg-slate-900 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                      title="Delete Template"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  Done & Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
