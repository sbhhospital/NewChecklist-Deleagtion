"use client"

import { useState, useEffect, useTransition } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { CheckSquare, ClipboardList, Home, LogOut, Menu, Database, ChevronDown, ChevronRight, Zap, FileText, X, Play, Pause, KeyRound, Video, Calendar, TrendingUp, Users, ShieldCheck, Linkedin, Activity } from 'lucide-react'
import sbhLogo from '../../assets/logo.png'

export default function AdminLayout({ children, darkMode, toggleDarkMode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDataSubmenuOpen, setIsDataSubmenuOpen] = useState(false)
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleNavClick = (e, path) => {
    e.preventDefault()
    setIsMobileMenuOpen(false)
    if (location.pathname !== path) {
      startTransition(() => {
        navigate(path)
      })
    }
  }
  // Check authentication on component mount
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username')
    const storedRole = sessionStorage.getItem('role')
    const storedEmail = sessionStorage.getItem('email')

    if (!storedUsername) {
      // Redirect to login if not authenticated
      navigate("/login")
      return
    }

    setUsername(storedUsername)
    setUserRole(storedRole || "user")
    setUserEmail(storedEmail || "")
  }, [navigate])

  // Session Timer Logic
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    const TIMEOUT_MS = 30 * 60 * 1000 // 30 Minutes

    const updateTimer = () => {
      const storedActivity = sessionStorage.getItem("lastActivity")
      if (storedActivity) {
        const lastActive = parseInt(storedActivity, 10)
        const now = Date.now()
        const elapsed = now - lastActive
        const remaining = Math.max(0, TIMEOUT_MS - elapsed)

        // Format time
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }
    }

    const intervalId = setInterval(updateTimer, 1000)
    updateTimer() // Initial call

    return () => clearInterval(intervalId)
  }, [])

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('department')
    sessionStorage.removeItem('email')
    navigate("/login")
  }


  // Filter dataCategories based on user role
  const dataCategories = [
    //{ id: "main", name: "PURAB", link: "/dashboard/data/main" },
    { id: "sales", name: "Checklist", link: "/dashboard/data/sales" },
    // { id: "service", name: "Service", link: "/dashboard/data/service" },
    //{ id: "account", name: "RKL", link: "/dashboard/data/account" },
    //{ id: "warehouse", name: "REFRASYNTH", link: "/dashboard/data/warehouse" },
    //{ id: "delegation", name: "Delegation", link: "/dashboard/data/delegation" },
    //{ id: "purchase", name: "Slag Crusher", link: "/dashboard/data/purchase" },
    //{ id: "director", name: "Hr", link: "/dashboard/data/director" },
    //{ id: "managing-director", name: "PURAB", link: "/dashboard/data/managing-director" },
    // { id: "coo", name: "COO", link: "/dashboard/data/coo" },
    // { id: "jockey", name: "Jockey", link: "/dashboard/data/jockey" },
  ]

  // Update the routes array based on user role
  const routes = [
    {
      href: "/dashboard/admin",
      label: "Dashboard",
      icon: Database,
      active: location.pathname === "/dashboard/admin",
      showFor: ["admin", "user"] // Show for both roles
    },
    {
      href: "/dashboard/performance",
      label: "Performance",
      icon: TrendingUp,
      active: location.pathname === "/dashboard/performance",
      showFor: ["admin"]
    },
    {
      href: "/dashboard/attendance-report",
      label: "Attendance Report",
      icon: Calendar,
      active: location.pathname === "/dashboard/attendance-report",
      showFor: ["admin"]
    },
    {
      href: "/dashboard/users",
      label: "User Management",
      icon: Users,
      active: location.pathname === "/dashboard/users",
      showFor: ["admin"]
    },
    {
      href: "/dashboard/quick-task",
      label: "Quick Task",
      icon: Zap,
      active: location.pathname === "/dashboard/quick-task",
      showFor: ["admin", "user"] // Only show for admin
    },
    {
      href: "/dashboard/assign-task",
      label: "Assign Task",
      icon: CheckSquare,
      active: location.pathname === "/dashboard/assign-task",
      showFor: ["admin", "user"] // Only show for admin
    },

    {
      href: "/dashboard/delegation",
      label: "Delegation",
      icon: ClipboardList,
      active: location.pathname === "/dashboard/delegation",
      showFor: ["admin", "user"] // Only show for admin
    },
    {
      href: "/dashboard/data/sales",
      label: "Checklist",
      icon: Database,
      active: location.pathname === "/dashboard/data/sales",
      showFor: ["admin", "user"] // Show for both roles
    },
    {
      href: "/dashboard/calendar",
      label: "Calendar",
      icon: Calendar,
      active: location.pathname === "/dashboard/calendar",
      showFor: ["admin", "user"] // Show for both roles
    },

    {
      href: "/dashboard/license",
      label: "License",
      icon: KeyRound,
      active: location.pathname === "/dashboard/license",
      showFor: [] // hidden
    },

    {
      href: "/dashboard/traning-video",
      label: "Training Video",
      icon: Video,
      active: location.pathname === "/dashboard/traning-video",
      showFor: ["admin", "user"] //  show both
    },
  ]

  const getAccessibleDepartments = () => {
    const userRole = sessionStorage.getItem('role') || 'user'
    return dataCategories.filter(cat =>
      !cat.showFor || cat.showFor.includes(userRole)
    )
  }

  // Filter routes based on user role
  const getAccessibleRoutes = () => {
    const userRole = sessionStorage.getItem('role') || 'user'
    return routes.filter(route =>
      route.showFor.includes(userRole)
    )
  }

  const getRouteActiveColor = (href) => {
    const orangeRoutes = [
      "/dashboard/quick-task",
      "/dashboard/assign-task",
      "/dashboard/delegation",
      "/dashboard/data/sales",
      "/dashboard/calendar",
      "/dashboard/traning-video"
    ];
    return orangeRoutes.includes(href) ? "menu-active-orange font-bold text-white" : "menu-active-gradient font-bold text-white";
  }

  // Check if the current path is a data category page
  const isDataPage = location.pathname.includes("/dashboard/data/")

  // If it's a data page, expand the submenu by default
  useEffect(() => {
    if (isDataPage && !isDataSubmenuOpen) {
      setIsDataSubmenuOpen(true)
    }
  }, [isDataPage, isDataSubmenuOpen])

  // Background pre-fetch of performance data for admins
  useEffect(() => {
    const role = sessionStorage.getItem('role')
    if (role !== 'admin') return

    // If already cached and fresh (less than 5 minutes old), don't prefetch
    const cachedTime = window.sbh_prefetch_performance_raw_time
    if (cachedTime && (Date.now() - Number(cachedTime) < 5 * 60 * 1000)) return

    const prefetch = async () => {
      try {
        console.log("Starting background prefetch of performance data...")
        const spreadsheetId = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0"
        const masterUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Whatsapp`
        const delegationUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=DELEGATION`
        const checklistUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Checklist`
        const historyUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=DELEGATION%20DONE`
        const loginUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Login%20History`
        const deductionsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Point%20Deductions`

        // Fetch sequentially to prevent Google Sheets 503 Rate Limits
        const masterRes = await fetch(masterUrl);
        const delegationRes = await fetch(delegationUrl);
        const checklistRes = await fetch(checklistUrl);
        const historyRes = await fetch(historyUrl).catch(() => null);
        const loginRes = await fetch(loginUrl).catch(() => null);
        const deductionsRes = await fetch(deductionsUrl).catch(() => null);

        if (!masterRes.ok || !delegationRes.ok || !checklistRes.ok) return

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
        const historyJson = historyRes && historyRes.ok ? await parseResponseJson(historyRes) : null
        const loginJson = loginRes && loginRes.ok ? await parseResponseJson(loginRes).catch(() => null) : null
        const deductionsJson = deductionsRes && deductionsRes.ok ? await parseResponseJson(deductionsRes).catch(() => null) : null

        const payload = {
          masterJson,
          delegationJson,
          checklistJson,
          historyJson,
          loginJson,
          deductionsJson
        }
        window.sbh_prefetch_performance_raw = payload
        window.sbh_prefetch_performance_raw_time = Date.now()
        console.log("Background prefetch of performance data completed successfully!")
      } catch (err) {
        console.warn("Background prefetch failed", err)
      }
    }
    
    // Defer the fetch slightly (1.5 seconds) so it doesn't slow down the main layout load
    const timer = setTimeout(prefetch, 1500)
    return () => clearTimeout(timer)
  }, [username])

  // Get accessible routes and departments
  const accessibleRoutes = getAccessibleRoutes()
  const accessibleDepartments = getAccessibleDepartments()

  // License Modal Component
  const LicenseModal = () => {
    // Function to convert YouTube URL to embed URL
    const getYouTubeEmbedUrl = (url) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11
        ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`
        : url;
    };


  }

  return (
    <div
      className={`flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50`}
    >
      {isPending && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9333EA] to-[#DB2777] animate-pulse z-[100000]" />
      )}
      {/* Sidebar for desktop */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 menu-container-bg md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-slate-200 px-4 menu-header-gradient">
          <Link
            to="/dashboard/admin"
            onClick={(e) => handleNavClick(e, "/dashboard/admin")}
            className="flex items-center gap-2 font-semibold text-[#387f39]"
          >
            <img src={sbhLogo} alt="Checklist & Delegation" className="ml-5 h-8 animate-pulse" />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {accessibleRoutes.map((route) => (
              <li key={route.label}>
                {route.submenu ? (
                  <div>
                    <button
                      onClick={() => setIsDataSubmenuOpen(!isDataSubmenuOpen)}
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${route.active
                        ? getRouteActiveColor(route.href)
                        : "text-slate-700 hover:bg-slate-100/70"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <route.icon
                          className={`h-4 w-4 ${route.active ? "text-white" : "text-slate-500"
                            }`}
                        />
                        {route.label}
                      </div>
                      {isDataSubmenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isDataSubmenuOpen && (
                      <ul className="mt-1 ml-6 space-y-1 border-l border-slate-200 pl-2">
                        {accessibleDepartments.map((category) => (
                          <li key={category.id}>
                            <Link
                              to={
                                category.link ||
                                `/dashboard/data/${category.id}`
                              }
                              onClick={(e) => handleNavClick(e, category.link || `/dashboard/data/${category.id}`)}
                              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${location.pathname ===
                                (category.link ||
                                  `/dashboard/data/${category.id}`)
                                ? "menu-active-orange font-bold text-white"
                                : "text-slate-600 hover:bg-slate-100/50 hover:text-slate-900"
                                }`}
                            >
                              {category.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={route.href}
                    onClick={(e) => handleNavClick(e, route.href)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${route.active
                      ? getRouteActiveColor(route.href)
                      : "text-slate-700 hover:bg-slate-100/70"
                      }`}
                  >
                    <route.icon
                      className={`h-4 w-4 ${route.active ? "text-white" : "text-slate-500"
                        }`}
                    />
                    {route.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-4 pb-12 bg-slate-50">
          {/* Session Timer */}
          <div className="mb-3 px-2 py-1.5 bg-blue-100/50 rounded-md border border-blue-200 flex justify-between items-center">
            <span className="text-xs font-medium text-blue-600">Session expires:</span>
            <span className={`text-xs font-mono font-bold ${timeLeft < "05:00" ? "text-red-500" : "text-blue-700"}`}>
              {timeLeft}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center border border-slate-300"
              >
                <span className="text-sm font-bold text-white">
                  {username ? username.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {username || "User"} {userRole === "admin" ? "(Admin)" : ""}
                </p>
                <p className="text-xs text-slate-500">
                  {userEmail ||
                    (username
                      ? `${username.toLowerCase()}@example.com`
                      : "user@example.com")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* <button
                onClick={() => setIsLicenseModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                title="License & Help"
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium">License</span>
              </button> */}
              {toggleDarkMode && (
                <button
                  onClick={toggleDarkMode}
                  className="text-slate-500 hover:text-slate-800 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  {darkMode ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  )}
                  <span className="sr-only">
                    {darkMode ? "Light mode" : "Dark mode"}
                  </span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-9 h-9 hover:scale-105 transition-all transform flex items-center justify-center rounded-xl cursor-pointer shadow-md shadow-red-500/10 hover:shadow-lg border border-red-200"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)', color: '#ffffff' }}
                title="Sign Out"
              >
                <LogOut className="h-4.5 w-4.5 text-white" style={{ stroke: '#ffffff' }} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed left-4 top-3 z-[100002] text-blue-700 p-2 rounded-md hover:bg-blue-100 bg-white shadow-md"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </button>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100001] md:hidden">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 w-64 menu-container-bg shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex h-14 items-center border-b border-slate-200 px-4 menu-header-gradient">
                <Link
                  to="/dashboard/admin"
                  onClick={(e) => handleNavClick(e, "/dashboard/admin")}
                  className="flex items-center gap-2 font-semibold text-[#387f39]"
                >
                  <img src={sbhLogo} alt="Checklist & Delegation" className="ml-12 h-6 object-contain" />
                </Link>
              </div>
              <nav className="flex-1 overflow-y-auto p-2 menu-container-bg">
                <ul className="space-y-1">
                  {accessibleRoutes.map((route) => (
                    <li key={route.label}>
                      {route.submenu ? (
                        <div>
                          <button
                            onClick={() =>
                              setIsDataSubmenuOpen(!isDataSubmenuOpen)
                            }
                            className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${route.active
                              ? getRouteActiveColor(route.href)
                              : "text-slate-700 hover:bg-slate-100/70"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <route.icon
                                className={`h-4 w-4 ${route.active ? "text-white" : "text-slate-500"
                                  }`}
                              />
                              {route.label}
                            </div>
                            {isDataSubmenuOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          {isDataSubmenuOpen && (
                            <ul className="mt-1 ml-6 space-y-1 border-l border-slate-200 pl-2">
                              {accessibleDepartments.map((category) => (
                                <li key={category.id}>
                                  <Link
                                    to={
                                      category.link ||
                                      `/dashboard/data/${category.id}`
                                    }
                                    onClick={(e) => handleNavClick(e, category.link || `/dashboard/data/${category.id}`)}
                                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${location.pathname ===
                                      (category.link ||
                                        `/dashboard/data/${category.id}`)
                                      ? "menu-active-orange font-bold text-white"
                                      : "text-slate-600 hover:bg-slate-100/50 hover:text-slate-900"
                                      }`}
                                  >
                                    {category.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <Link
                          to={route.href}
                          onClick={(e) => handleNavClick(e, route.href)}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${route.active
                            ? getRouteActiveColor(route.href)
                            : "text-slate-700 hover:bg-slate-100/70"
                            }`}
                        >
                          <route.icon
                            className={`h-4 w-4 ${route.active ? "text-white" : "text-slate-500"
                              }`}
                          />
                          {route.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="border-t border-slate-200 p-4 pb-12 bg-slate-50">
              {/* Session Timer */}
              <div className="mb-3 px-2 py-1.5 bg-slate-100 rounded-md border border-slate-200 flex justify-between items-center">
                <span className="text-xs font-medium text-blue-600">Session expires:</span>
                <span className={`text-xs font-mono font-bold ${timeLeft < "05:00" ? "text-red-500" : "text-blue-700"}`}>
                  {timeLeft}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center border border-slate-300"
                  >
                    <span className="text-sm font-bold text-white">
                      {username ? username.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {username || "User"}{" "}
                      {userRole === "admin" ? "(Admin)" : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {userEmail ||
                        (username
                          ? `${username.toLowerCase()}@example.com`
                          : "user@example.com")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* <button
                    onClick={() => setIsLicenseModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1"
                    title="License & Help"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="text-xs font-medium">License</span>
                  </button>
                  */}
                  {toggleDarkMode && (
                    <button
                      onClick={toggleDarkMode}
                      className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
                    >
                      {darkMode ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                          />
                        </svg>
                      )}
                      <span className="sr-only">
                        {darkMode ? "Light mode" : "Dark mode"}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-9 h-9 hover:scale-105 transition-all transform flex items-center justify-center rounded-xl cursor-pointer shadow-md shadow-red-500/10 hover:shadow-lg border border-red-200"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)', color: '#ffffff' }}
                    title="Sign Out"
                  >
                    <LogOut className="h-4.5 w-4.5 text-white" style={{ stroke: '#ffffff' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* License Modal */}
      {isLicenseModalOpen && <LicenseModal />}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <header className="flex h-14 items-center justify-center md:justify-between border-b border-blue-200 bg-white px-4 md:px-6 relative md:static">
          <div className="flex md:hidden w-8 absolute left-4"></div>
          <h1 className="text-sm md:text-xl font-bold flex items-center justify-center md:justify-start gap-2 w-full md:w-auto px-12 md:px-0">
            <span className="footer-gradient-text">
              {(() => {
                const hour = new Date().getHours()
                let greeting = "Good Morning"
                if (hour >= 12 && hour < 18) greeting = "Good Afternoon"
                else if (hour >= 18) greeting = "Good Evening"

                return `${greeting}, ${username ? username.toUpperCase() : "USER"}! Welcome On Board`
              })()}
            </span>
            <span className="animate-bounce inline-block text-2xl md:text-xl3">👋</span>
          </h1>
          {/*<button
            onClick={() => setIsLicenseModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            title="License & Help"
          >
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">License</span>
          </button>
          */}
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50 relative pb-14 md:pb-16">
          {children}
        </main>
      </div>
      <footer 
        className="fixed left-0 right-0 bottom-0 py-0.5 md:py-1 overflow-hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.3)] select-none border-t border-white/10 text-white z-[2000]"
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
          <div className="hidden md:flex items-center justify-between gap-6 h-6">
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
              <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center justify-end gap-1 leading-none">
                Naman Mishra
                <Linkedin size={8} className="text-[#0077b5] bg-white rounded-[1px] p-[0.5px] opacity-100" />
              </span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
