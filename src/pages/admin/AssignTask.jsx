import { useState, useEffect } from "react";
import { BellRing, FileCheck, Calendar, Clock, Mic, MicOff, X } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const TaskTypePopup = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-purple-700">
            Select Task Type
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <button
            onClick={() => onSelect("checklist")}
            className="w-full p-4 border border-purple-200 rounded-lg text-left hover:bg-purple-50 transition-colors"
          >
            <div className="font-medium text-purple-700">Checklist Task</div>
            <div className="text-sm text-purple-600 mt-1">
              All frequencies of Daily,Weekly,Monthly,Yearly etc. Tasks will be
              stored in the Checklist sheet.
            </div>
          </button>
          <button
            onClick={() => onSelect("delegation")}
            className="w-full p-4 border border-purple-200 rounded-lg text-left hover:bg-purple-50 transition-colors"
          >
            <div className="font-medium text-purple-700">Delegation Task</div>
            <div className="text-sm text-purple-600 mt-1">
              Only for 'One-Time', 'Critical' and 'Urgent' frequency.
              sheet.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Calendar Component (defined outside)
const CalendarComponent = ({ date, onChange, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onChange(selectedDate);
    onClose();
  };

  const renderDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );
    const firstDayOfMonth = getFirstDayOfMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        date &&
        date.getDate() === day &&
        date.getMonth() === currentMonth.getMonth() &&
        date.getFullYear() === currentMonth.getFullYear();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${isSelected
            ? "bg-purple-600 text-white"
            : "hover:bg-purple-100 text-gray-700"
            }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  return (
    <div className="p-2 bg-white border border-gray-200 rounded-md shadow-md">
      <div className="flex justify-between items-center mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          &lt;
        </button>
        <div className="text-sm font-medium">
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
          {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="h-8 w-8 flex items-center justify-center text-xs text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
};

// Helper functions for date manipulation
const formatDate = (date) => {
  if (!date) return "";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

const addMonths = (date, months) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

const addYears = (date, years) => {
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + years);
  return newDate;
};

export default function AssignTask() {
  // const [showTaskTypePopup, setShowTaskTypePopup] = useState(true);
  const [selectedTaskType, setSelectedTaskType] = useState(null);
  const [date, setSelectedDate] = useState(null);
  const [time, setTime] = useState("09:00"); // Default time 9:00 AM
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);

  // Add new state variables for dropdown options
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [givenByOptions, setGivenByOptions] = useState([]);
  const [doerOptions, setDoerOptions] = useState([]);

  const browserSupportsSpeechRecognition = SpeechRecognition.browserSupportsSpeechRecognition();
  const [isMicrophoneAvailable, setIsMicrophoneAvailable] = useState(true);
  const [isDateDisabled, setIsDateDisabled] = useState(false);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition: browserSupports
  } = useSpeechRecognition();

  const getFrequencies = () => {
    if (selectedTaskType === "delegation") {
      return [
        { value: "one-time", label: "One Time" },
        { value: "critical", label: "Critical" },
        { value: "urgent", label: "Urgent" }
      ];
    } else {
      return [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "fortnightly", label: "Fortnightly" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "yearly", label: "Yearly" },
        { value: "end-of-1st-week", label: "End of 1st Week" },
        { value: "end-of-2nd-week", label: "End of 2nd Week" },
        { value: "end-of-3rd-week", label: "End of 3rd Week" },
        { value: "end-of-4th-week", label: "End of 4th Week" },
        { value: "end-of-last-week", label: "End of Last Week" },
      ];
    }
  };

  const [formData, setFormData] = useState({
    taskType: "", // 'checklist' or 'delegation'
    department: "",
    givenBy: "",
    doer: "",
    description: "",
    frequency: "daily",
    enableReminders: true,
    requireAttachment: false,
  });

  // Add this function to handle task type selection
  const handleTaskTypeSelect = (type) => {
    setSelectedTaskType(type);
    setFormData((prev) => ({
      ...prev,
      taskType: type,
      frequency: type === "delegation" ? "one-time" : "daily",
    }));
    setIsDateDisabled(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "taskType") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        frequency: value === "delegation" ? "one-time" : "daily",
      }));
    } else if (name === "frequency") {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Check if it's delegation task with critical/urgent frequency
      if (selectedTaskType === "delegation" && (value === "critical" || value === "urgent")) {
        setIsDateDisabled(true);
        // Set date to today
        const today = new Date();
        setSelectedDate(today);
      } else {
        setIsDateDisabled(false);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (name, e) => {
    setFormData((prev) => ({ ...prev, [name]: e.target.checked }));
  };

  // Function to fetch options from master sheet
  const fetchMasterSheetOptions = async () => {
    try {
      const masterSheetId = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0";
      const masterSheetName = "master";

      const url = `https://docs.google.com/spreadsheets/d/${masterSheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        masterSheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch master data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows) {
        console.log("No master data found");
        return;
      }

      // Extract options from columns A, B, and C
      const departments = [];
      const givenBy = [];
      const doers = [];

      // Process all rows starting from index 1 (skip header)
      data.table.rows.slice(1).forEach((row) => {
        // Column A - Departments
        if (row.c && row.c[0] && row.c[0].v) {
          const value = row.c[0].v.toString().trim();
          if (value !== "") {
            departments.push(value);
          }
        }
        // Column B - Given By
        if (row.c && row.c[1] && row.c[1].v) {
          const value = row.c[1].v.toString().trim();
          if (value !== "") {
            givenBy.push(value);
          }
        }
        // Column C - Doers
        if (row.c && row.c[2] && row.c[2].v) {
          const value = row.c[2].v.toString().trim();
          if (value !== "") {
            doers.push(value);
          }
        }
      });

      // Remove duplicates and sort
      setDepartmentOptions([...new Set(departments)].sort());
      setGivenByOptions([...new Set(givenBy)].sort());
      setDoerOptions([...new Set(doers)].sort());

      console.log("Master sheet options loaded successfully", {
        departments: [...new Set(departments)],
        givenBy: [...new Set(givenBy)],
        doers: [...new Set(doers)],
      });
    } catch (error) {
      console.error("Error fetching master sheet options:", error);
      // Set default options if fetch fails
      setDepartmentOptions(["Department 1", "Department 2"]);
      setGivenByOptions(["User 1", "User 2"]);
      setDoerOptions(["Doer 1", "Doer 2"]);
    }
  };

  // Update date display format
  const getFormattedDate = (date) => {
    if (!date) return "Select a date";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // NEW: Function to combine date and time into DD/MM/YYYY HH:MM:SS format
  const formatDateTimeForStorage = (date, time) => {
    if (!date || !time) return "";

    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    const timeWithSeconds = time + ":00";
    return `${day}/${month}/${year} ${timeWithSeconds}`;
  };

  // NEW: Function to get current timestamp in DD/MM/YYYY HH:MM:SS format
  const getCurrentTimestamp = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    const hour = now.getHours().toString().padStart(2, "0");
    const minute = now.getMinutes().toString().padStart(2, "0");
    const second = now.getSeconds().toString().padStart(2, "0");

    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  };

  // NEW: Function to get formatted display for date and time
  const getFormattedDateTime = () => {
    if (!date) return "Select date and time";

    const dateStr = formatDate(date);
    const timeStr = time || "09:00";

    return `${dateStr} at ${timeStr}`;
  };

  const handleCancel = () => {
    const userRole = sessionStorage.getItem("role");
    const username = sessionStorage.getItem("username");

    const resetFormData = {
      department: "",
      givenBy: "",
      doer: userRole !== "admin" && username ? formData.doer : "",
      description: "",
      frequency: "daily",
      enableReminders: true,
      requireAttachment: false,
    };

    setFormData(resetFormData);
    setSelectedDate(new Date()); // Reset to today's date
    setTime("09:00");
    setGeneratedTasks([]);
    setAccordionOpen(false);
    setSelectedTaskType(null);
  };

  useEffect(() => {
    if (transcript) {
      setFormData(prev => ({
        ...prev,
        description: transcript
      }));
    }
  }, [transcript]);

  useEffect(() => {
    const checkMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setIsMicrophoneAvailable(true);
      } catch (error) {
        setIsMicrophoneAvailable(false);
      }
    };

    checkMicrophone();
  }, []);

  useEffect(() => {
    fetchMasterSheetOptions();
  }, []);

  useEffect(() => {
    const fetchDoerOptions = async () => {
      try {
        // Get user role from session storage
        const userRole = sessionStorage.getItem("role");
        const username = sessionStorage.getItem("username");

        console.log("Current user details:", { userRole, username });

        // Fetch all doers first
        const masterSheetId = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0";
        const masterSheetName = "master";
        const url = `https://docs.google.com/spreadsheets/d/${masterSheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
          masterSheetName
        )}`;

        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`Failed to fetch master data: ${response.status}`);

        const text = await response.text();
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        const jsonString = text.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonString);

        if (!data.table || !data.table.rows) {
          console.log("No master data found");
          return;
        }

        // Extract doers from column C (index 2)
        const allDoers = [];
        data.table.rows.slice(1).forEach((row) => {
          if (row.c && row.c[2] && row.c[2].v) {
            const value = row.c[2].v.toString().trim();
            if (value !== "") allDoers.push(value);
          }
        });

        console.log("All doers from sheet:", allDoers);

        // Filter based on user role
        let filteredDoers;
        let selectedDoer = "";

        if (userRole === "admin") {
          // Admin sees all doers
          filteredDoers = [...new Set(allDoers)].sort();
        } else if (userRole === "user" && username) {
          // For regular users, find their exact name from the sheet (case-insensitive match)
          const matchedDoer = allDoers.find(
            (doer) =>
              doer.toLowerCase().trim() === username.toLowerCase().trim()
          );

          if (matchedDoer) {
            // Use the exact name from the sheet
            filteredDoers = [matchedDoer];
            selectedDoer = matchedDoer;
          } else {
            // If no exact match, try partial match
            const partialMatch = allDoers.find(
              (doer) =>
                doer.toLowerCase().includes(username.toLowerCase()) ||
                username.toLowerCase().includes(doer.toLowerCase())
            );

            if (partialMatch) {
              filteredDoers = [partialMatch];
              selectedDoer = partialMatch;
            } else {
              // Last resort: use the username as is
              filteredDoers = [username];
              selectedDoer = username;
            }
          }
        } else {
          // Default fallback
          filteredDoers = username ? [username] : ["Default User"];
          selectedDoer = username || "Default User";
        }

        console.log("Filtered doers:", filteredDoers);
        console.log("Selected doer for prefetch:", selectedDoer);

        setDoerOptions(filteredDoers);

        // Always prefetch for non-admin users
        if (userRole !== "admin" && selectedDoer) {
          setFormData((prev) => ({
            ...prev,
            doer: selectedDoer,
          }));
          console.log("Prefetched doer field with:", selectedDoer);
        }
      } catch (error) {
        console.error("Error fetching doer options:", error);
        // Fallback to current user if fetch fails
        const userRole = sessionStorage.getItem("role");
        const username = sessionStorage.getItem("username");

        if (userRole === "admin") {
          setDoerOptions(["Doer 1", "Doer 2"]);
        } else {
          const fallbackName = username || "Default User";
          setDoerOptions([fallbackName]);
          setFormData((prev) => ({
            ...prev,
            doer: fallbackName,
          }));
          console.log("Fallback: Prefetched doer field with:", fallbackName);
        }
      }
    };

    fetchDoerOptions();
  }, []);

  useEffect(() => {
    if (selectedTaskType) {
      const today = new Date();
      setSelectedDate(today);
    }
  }, [selectedTaskType]);

  // Add a function to get the last task ID from the specified sheet
  const getLastTaskId = async (sheetName) => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows || data.table.rows.length === 0) {
        return 0; // Start from 1 if no tasks exist
      }

      // Get the last task ID from column B (index 1)
      let lastTaskId = 0;
      data.table.rows.forEach((row) => {
        if (row.c && row.c[1] && row.c[1].v) {
          const taskId = parseInt(row.c[1].v);
          if (!isNaN(taskId) && taskId > lastTaskId) {
            lastTaskId = taskId;
          }
        }
      });

      return lastTaskId;
    } catch (error) {
      console.error("Error fetching last task ID:", error);
      return 0;
    }
  };

  // UPDATED: Date formatting function to return DD/MM/YYYY format (for working days comparison)
  const formatDateToDDMMYYYY = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Function to fetch working days from the Working Day Calendar sheet
  const fetchWorkingDays = async () => {
    try {
      const sheetId = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0";
      const sheetName = "Working Day Calendar";

      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch working days: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows) {
        console.log("No working day data found");
        return [];
      }

      // Extract dates from column A
      const workingDays = [];
      data.table.rows.forEach((row) => {
        if (row.c && row.c[0] && row.c[0].v) {
          let dateValue = row.c[0].v;

          // Handle Google Sheets Date(year,month,day) format
          if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
            const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateValue);
            if (match) {
              const year = parseInt(match[1], 10);
              const month = parseInt(match[2], 10); // 0-indexed in Google's format
              const dateDay = parseInt(match[3], 10);

              dateValue = `${dateDay.toString().padStart(2, "0")}/${(month + 1)
                .toString()
                .padStart(2, "0")}/${year}`;
            }
          } else if (dateValue instanceof Date) {
            // If it's a Date object
            dateValue = formatDateToDDMMYYYY(dateValue);
          }

          if (
            typeof dateValue === "string" &&
            dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/) // DD/MM/YYYY pattern
          ) {
            workingDays.push(dateValue);
          }
        }
      });

      console.log(`Fetched ${workingDays.length} working days`);
      return workingDays;
    } catch (error) {
      console.error("Error fetching working days:", error);
      return []; // Return empty array if fetch fails
    }
  };

  // NEW: Helper function to find next working day for a given date
  const findNextWorkingDay = (targetDate, workingDays) => {
    const targetDateStr = formatDateToDDMMYYYY(targetDate);

    // If target date is already a working day, return it
    if (workingDays.includes(targetDateStr)) {
      return targetDateStr;
    }

    // Otherwise, find the next working day
    let checkDate = new Date(targetDate);
    for (let i = 1; i <= 30; i++) {
      // Check up to 30 days ahead
      checkDate = addDays(targetDate, i);
      const checkDateStr = formatDateToDDMMYYYY(checkDate);
      if (workingDays.includes(checkDateStr)) {
        return checkDateStr;
      }
    }

    // If no working day found in 30 days, return the original target date
    return targetDateStr;
  };

  const handleTaskAssignmentSuccess = () => {
    // Show success message
    alert("Task assigned successfully!");

    // Reset form and return to task selection
    const userRole = sessionStorage.getItem("role");
    const username = sessionStorage.getItem("username");

    setFormData({
      department: "",
      givenBy: "",
      doer: userRole !== "admin" && username ? formData.doer : "",
      description: "",
      frequency: "daily",
      enableReminders: true,
      requireAttachment: false,
    });
    setSelectedDate(null);
    setTime("09:00");
    setGeneratedTasks([]);
    setAccordionOpen(false);
    setSelectedTaskType(null); // This will return to the task selection page
  };

  // const generateTasks = async () => {
  //   if (
  //     !date ||
  //     !time ||
  //     !formData.doer ||
  //     !formData.description ||
  //     !formData.frequency
  //   ) {
  //     alert("Please fill in all required fields including date and time.");
  //     return;
  //   }

  //   // Fetch working days from the sheet
  //   const workingDays = await fetchWorkingDays();
  //   if (workingDays.length === 0) {
  //     alert(
  //       "Could not retrieve working days. Please make sure the Working Day Calendar sheet is properly set up."
  //     );
  //     return;
  //   }

  //   // Sort the working days chronologically
  //   const sortedWorkingDays = [...workingDays].sort((a, b) => {
  //     const [dayA, monthA, yearA] = a.split("/").map(Number);
  //     const [dayB, monthB, yearB] = b.split("/").map(Number);
  //     return (
  //       new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB)
  //     );
  //   });

  //   const selectedDate = new Date(date);
  //   const tasks = [];

  //   // Handle all delegation task frequencies (one-time, critical, urgent)
  //   if (selectedTaskType === "delegation") {
  //     // Filter out dates before the selected date (no back dates)
  //     const futureDates = sortedWorkingDays.filter((dateStr) => {
  //       const [dateDay, month, year] = dateStr.split("/").map(Number);
  //       const dateObj = new Date(year, month - 1, dateDay);
  //       return dateObj >= selectedDate;
  //     });

  //     if (futureDates.length === 0) {
  //       alert(
  //         "No working days found on or after your selected date. Please choose a different start date or update the Working Day Calendar."
  //       );
  //       return;
  //     }

  //     const startDateStr = formatDateToDDMMYYYY(selectedDate);
  //     let startIndex = futureDates.findIndex((d) => d === startDateStr);

  //     if (startIndex === -1) {
  //       startIndex = 0;
  //       alert(
  //         `The selected date (${startDateStr}) is not in the Working Day Calendar. The next available working day will be used instead: ${futureDates[0]}`
  //       );
  //     }

  //     const taskDateStr = futureDates[startIndex];
  //     const taskDateTimeStr = formatDateTimeForStorage(
  //       new Date(taskDateStr.split("/").reverse().join("-")),
  //       time
  //     );

  //     tasks.push({
  //       description: formData.description,
  //       department: formData.department,
  //       givenBy: formData.givenBy,
  //       doer: formData.doer,
  //       dueDate: taskDateTimeStr,
  //       status: "pending",
  //       frequency: formData.frequency,
  //       enableReminders: formData.enableReminders,
  //       requireAttachment: formData.requireAttachment,
  //     });
  //   }
  //   // Handle checklist tasks (all frequencies)
  //   else if (selectedTaskType === "checklist") {
  //     // Filter out dates before the selected date (no back dates)
  //     const futureDates = sortedWorkingDays.filter((dateStr) => {
  //       const [dateDay, month, year] = dateStr.split("/").map(Number);
  //       const dateObj = new Date(year, month - 1, dateDay);
  //       return dateObj >= selectedDate;
  //     });

  //     if (futureDates.length === 0) {
  //       alert(
  //         "No working days found on or after your selected date. Please choose a different start date or update the Working Day Calendar."
  //       );
  //       return;
  //     }

  //     const startDateStr = formatDateToDDMMYYYY(selectedDate);
  //     let startIndex = futureDates.findIndex((d) => d === startDateStr);

  //     if (startIndex === -1) {
  //       startIndex = 0;
  //       alert(
  //         `The selected date (${startDateStr}) is not in the Working Day Calendar. The next available working day will be used instead: ${futureDates[0]}`
  //       );
  //     }

  //     const taskDateStr = futureDates[startIndex];
  //     const taskDateTimeStr = formatDateTimeForStorage(
  //       new Date(taskDateStr.split("/").reverse().join("-")),
  //       time
  //     );

  //     tasks.push({
  //       description: formData.description,
  //       department: formData.department,
  //       givenBy: formData.givenBy,
  //       doer: formData.doer,
  //       dueDate: taskDateTimeStr,
  //       status: "pending",
  //       frequency: formData.frequency,
  //       enableReminders: formData.enableReminders,
  //       requireAttachment: formData.requireAttachment,
  //     });
  //   }

  //   setGeneratedTasks(tasks);
  //   setAccordionOpen(true);
  // };

  // Helper function to find the closest working day to a target date

  const generateTasks = async () => {
    if (
      !date ||
      !time ||
      !formData.doer ||
      !formData.description ||
      !formData.frequency
    ) {
      alert("Please fill in all required fields including date and time.");
      return;
    }

    const selectedDate = new Date(date);
    const tasks = [];

    // Handle all delegation task frequencies (one-time, critical, urgent)
    if (selectedTaskType === "delegation") {
      const taskDateTimeStr = formatDateTimeForStorage(selectedDate, time);

      tasks.push({
        description: formData.description,
        department: formData.department,
        givenBy: formData.givenBy,
        doer: formData.doer,
        dueDate: taskDateTimeStr,
        status: "pending",
        frequency: formData.frequency,
        enableReminders: formData.enableReminders,
        requireAttachment: formData.requireAttachment,
      });
    }
    // Handle checklist tasks (all frequencies)
    else if (selectedTaskType === "checklist") {
      const taskDateTimeStr = formatDateTimeForStorage(selectedDate, time);

      tasks.push({
        description: formData.description,
        department: formData.department,
        givenBy: formData.givenBy,
        doer: formData.doer,
        dueDate: taskDateTimeStr,
        status: "pending",
        frequency: formData.frequency,
        enableReminders: formData.enableReminders,
        requireAttachment: formData.requireAttachment,
      });
    }

    setGeneratedTasks(tasks);
    setAccordionOpen(true);
  };

  const findClosestWorkingDayIndex = (workingDays, targetDateStr) => {
    // Parse the target date (DD/MM/YYYY format)
    const [targetDay, targetMonth, targetYear] = targetDateStr
      .split("/")
      .map(Number);
    const targetDate = new Date(targetYear, targetMonth - 1, targetDay);

    // Find the closest working day (preferably after the target date)
    let closestIndex = -1;
    let minDifference = Infinity;

    for (let i = 0; i < workingDays.length; i++) {
      const [workingDay, workingMonth, workingYear] = workingDays[i]
        .split("/")
        .map(Number);
      const currentDate = new Date(workingYear, workingMonth - 1, workingDay);

      // Calculate difference in days
      const difference = Math.abs(
        (currentDate - targetDate) / (1000 * 60 * 60 * 24)
      );

      if (currentDate >= targetDate && difference < minDifference) {
        minDifference = difference;
        closestIndex = i;
      }
    }

    // If no working day found after the target date, find the closest one before
    if (closestIndex === -1) {
      for (let i = workingDays.length - 1; i >= 0; i--) {
        const [workingDay2, workingMonth2, workingYear2] = workingDays[i]
          .split("/")
          .map(Number);
        const currentDate2 = new Date(
          workingYear2,
          workingMonth2 - 1,
          workingDay2
        );

        if (currentDate2 < targetDate) {
          closestIndex = i;
          break;
        }
      }
    }

    return closestIndex !== -1 ? closestIndex : workingDays.length - 1;
  };

  // Helper function to find the date for the end of a specific week in a month
  const findEndOfWeekDate = (date, weekNumber, workingDays) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Get all working days in the target month (DD/MM/YYYY format)
    const daysInMonth = workingDays.filter((dateStr) => {
      const [, m, y] = dateStr.split("/").map(Number);
      return y === year && m === month + 1;
    });

    // Sort them chronologically
    daysInMonth.sort((a, b) => {
      const [dayA] = a.split("/").map(Number);
      const [dayB] = b.split("/").map(Number);
      return dayA - dayB;
    });

    // Group by weeks (assuming Monday is the first day of the week)
    const weekGroups = [];
    let currentWeek = [];
    let lastWeekDay = -1;

    for (const dateStr of daysInMonth) {
      const [workingDay2, m, y] = dateStr.split("/").map(Number);
      const dateObj = new Date(y, m - 1, workingDay2);
      const weekDay = dateObj.getDay(); // 0 for Sunday, 1 for Monday, etc.

      if (weekDay <= lastWeekDay || currentWeek.length === 0) {
        if (currentWeek.length > 0) {
          weekGroups.push(currentWeek);
        }
        currentWeek = [dateStr];
      } else {
        currentWeek.push(dateStr);
      }

      lastWeekDay = weekDay;
    }

    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek);
    }

    // Return the last day of the requested week
    if (weekNumber === -1) {
      // Last week of the month
      return (
        weekGroups[weekGroups.length - 1]?.[
        weekGroups[weekGroups.length - 1].length - 1
        ] || daysInMonth[daysInMonth.length - 1]
      );
    } else if (weekNumber > 0 && weekNumber <= weekGroups.length) {
      // Specific week
      return (
        weekGroups[weekNumber - 1]?.[weekGroups[weekNumber - 1].length - 1] ||
        daysInMonth[daysInMonth.length - 1]
      );
    } else {
      // Default to the last day of the month if the requested week doesn't exist
      return daysInMonth[daysInMonth.length - 1];
    }
  };

  const submitToUniqueSheet = async (taskData, taskId) => {
    try {
      const uniqueSheetName = "UNIQUE"; // Define your unique sheet name here

      const formPayload = new FormData();
      formPayload.append("sheetName", uniqueSheetName);
      formPayload.append("action", "insert");
      formPayload.append("batchInsert", "false");
      formPayload.append(
        "rowData",
        JSON.stringify([
          {
            ...taskData,
            taskId: taskId.toString(),
          },
        ])
      );

      await fetch(
        "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec",
        {
          method: "POST",
          body: formPayload,
          mode: "no-cors",
        }
      );

      console.log(`First task submitted to ${uniqueSheetName} sheet`);
    } catch (error) {
      console.error("Error submitting to unique sheet:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (generatedTasks.length === 0) {
        alert(
          "Please generate tasks first by clicking Preview Generated Tasks"
        );
        setIsSubmitting(false);
        return;
      }

      if (!formData.department || formData.department.trim() === "") {
        alert("Please select a department before submitting tasks");
        setIsSubmitting(false);
        return;
      }

      // Determine the main sheet based on task type
      let submitSheetName;
      if (formData.taskType === "delegation") {
        submitSheetName = "DELEGATION";
      } else {
        submitSheetName = "UNIQUE";
      }

      // Check if selected date is today
      const isToday = () => {
        if (!date) return false;
        const today = new Date();
        const selectedDate = new Date(date);

        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        return selectedDate.getTime() === today.getTime();
      };

      let tasksToSubmit = generatedTasks;

      // If today's date is selected, only submit today's task
      if (isToday()) {
        const todayDateStr = formatDateToDDMMYYYY(date);
        tasksToSubmit = generatedTasks.filter((task) => {
          const taskDateStr = task.dueDate.split(" ")[0]; // Get date part (DD/MM/YYYY)
          return taskDateStr === todayDateStr;
        });

        if (tasksToSubmit.length === 0) {
          tasksToSubmit = [generatedTasks[0]]; // Fallback to first task
        }
      }

      // Get task IDs for main sheet
      const lastTaskIdMain = await getLastTaskId(submitSheetName);
      let nextTaskIdMain = lastTaskIdMain + 1;

      // Prepare tasks data
      const tasksDataMain = tasksToSubmit.map((task, index) => ({
        timestamp: getCurrentTimestamp(),
        taskId: (nextTaskIdMain + index).toString(),
        firm: task.department,
        givenBy: task.givenBy,
        name: task.doer,
        description: task.description,
        startDate: task.dueDate,
        freq: task.frequency,
        enableReminders: task.enableReminders ? "Yes" : "No",
        requireAttachment: task.requireAttachment ? "Yes" : "No",
      }));

      // Submit to main sheet (Delegation / Checklist)
      const formPayloadMain = new FormData();
      formPayloadMain.append("sheetName", submitSheetName);
      formPayloadMain.append("action", "insert");
      formPayloadMain.append("batchInsert", "true");
      formPayloadMain.append("rowData", JSON.stringify(tasksDataMain));

      await fetch(
        "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec",
        {
          method: "POST",
          body: formPayloadMain,
          mode: "no-cors",
        }
      );

      // ✅ Submit to UNIQUE sheet only if:
      // 1. Task type is "checklist" AND 
      // 2. Frequency is NOT "one-time", "critical", or "urgent"
      const isDelegationFrequency = ["one-time", "critical", "urgent"].includes(formData.frequency);

      // if (formData.taskType === "checklist" && !isDelegationFrequency) {
      //   const lastTaskIdUnique = await getLastTaskId("UNIQUE");
      //   let nextTaskIdUnique = lastTaskIdUnique + 1;

      //   const tasksDataUnique = tasksToSubmit.map((task, index) => ({
      //     timestamp: getCurrentTimestamp(),
      //     taskId: (nextTaskIdUnique + index).toString(),
      //     firm: task.department,
      //     givenBy: task.givenBy,
      //     name: task.doer,
      //     description: task.description,
      //     startDate: task.dueDate,
      //     freq: task.frequency,
      //     enableReminders: task.enableReminders ? "Yes" : "No",
      //     requireAttachment: task.requireAttachment ? "Yes" : "No",
      //   }));

      //   const formPayloadUnique = new FormData();
      //   formPayloadUnique.append("sheetName", "UNIQUE");
      //   formPayloadUnique.append("action", "insert");
      //   formPayloadUnique.append("batchInsert", "true");
      //   formPayloadUnique.append("rowData", JSON.stringify(tasksDataUnique));

      //   await fetch(
      //     "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec",
      //     {
      //       method: "POST",
      //       body: formPayloadUnique,
      //       mode: "no-cors",
      //     }
      //   );
      // }

      // Success message
      const taskCount = tasksToSubmit.length;
      let successMessage = `Successfully submitted ${taskCount} task(s) to ${submitSheetName}`;

      if (formData.taskType === "checklist" && !isDelegationFrequency) {
        successMessage += ` and UNIQUE sheets!`;
      }
      if (isToday()) {
        successMessage =
          `Today's date selected - submitted ${taskCount} task(s) to ${submitSheetName}` +
          (formData.taskType === "checklist" && !isDelegationFrequency ? " and UNIQUE sheets!" : "!");
      }

      // alert(successMessage);

      // Reset form
      const userRole = sessionStorage.getItem("role");
      const username = sessionStorage.getItem("username");

      setFormData({
        department: "",
        givenBy: "",
        doer: userRole !== "admin" && username ? formData.doer : "",
        description: "",
        frequency: "daily",
        enableReminders: true,
        requireAttachment: false,
      });
      setSelectedDate(null);
      setTime("09:00");
      setGeneratedTasks([]);
      setAccordionOpen(false);
      handleTaskAssignmentSuccess();
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to assign tasks. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to format date for display in preview
  const formatDateForDisplay = (dateTimeStr) => {
    // dateTimeStr is in format "DD/MM/YYYY HH:MM:SS"
    return dateTimeStr;
  };

  // NEW: Function to get the target sheet display name for preview
  const getTargetSheetDisplay = () => {
    if (!formData.department) return "Please select a department first";

    if (formData.frequency === "one-time") {
      return "DELEGATION sheet";
    } else {
      return "Checklist sheet";
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6 text-purple-500">
          Assign New Task
        </h1>

        {!selectedTaskType ? (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Checklist Task Option */}
            <div
              onClick={() => handleTaskTypeSelect("checklist")}
              className="cursor-pointer p-6 border-2 border-purple-200 rounded-lg bg-white shadow-md hover:shadow-lg transition-all hover:border-purple-400"
            >
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-purple-700 mb-2">
                  Checklist Task
                </h3>
                <p className="text-sm text-purple-600">
                  All frequencies of Daily , Weekly , Monthly , Yearly etc.
                </p>
                <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                  Select Checklist
                </button>
              </div>
            </div>

            {/* Delegation Task Option */}
            <div
              onClick={() => handleTaskTypeSelect("delegation")}
              className="cursor-pointer p-6 border-2 border-purple-200 rounded-lg bg-white shadow-md hover:shadow-lg transition-all hover:border-purple-400"
            >
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BellRing className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-purple-700 mb-2">
                  Delegation Task
                </h3>
                <p className="text-sm text-purple-600">
                  Only for 'One-Time' , 'Critical' and 'Urgent' frequency.
                </p>
                <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                  Select Delegation
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 p-3 bg-purple-100 rounded-lg flex justify-between items-center">
              <div>
                <span className="font-medium text-purple-700">
                  {selectedTaskType === "checklist"
                    ? "Checklist Task"
                    : "Delegation Task"}
                </span>
                <span className="text-sm text-purple-600 ml-2">
                  {selectedTaskType === "checklist"
                    ? "(All frequencies except One-Time)"
                    : "(One-Time frequency only)"}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedTaskType(null);
                  setFormData((prev) => ({ ...prev, taskType: "" }));
                }}
                className="text-purple-600 hover:text-purple-800 text-sm"
              >
                Change Task Type
              </button>
            </div>

            <div className="rounded-lg border border-purple-200 bg-white shadow-md overflow-hidden">
              <form onSubmit={handleSubmit}>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-purple-100">
                  <h2 className="text-xl font-semibold text-purple-700">
                    Task Details
                  </h2>
                  <p className="text-purple-600">
                    Fill in the details to assign a new task to a staff member.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  {/* Department Name Dropdown */}
                  <div className="space-y-2">
                    <label
                      htmlFor="department"
                      className="block text-sm font-medium text-purple-700"
                    >
                      Department Name *
                    </label>
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select Department</option>
                      {departmentOptions.map((dept, index) => (
                        <option key={index} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    {formData.department && (
                      <p className="text-xs text-purple-600">
                        Tasks will be stored in Checklist sheet
                      </p>
                    )}
                  </div>

                  {/* Given By Dropdown */}
                  <div className="space-y-2">
                    <label
                      htmlFor="givenBy"
                      className="block text-sm font-medium text-purple-700"
                    >
                      Given By
                    </label>
                    <select
                      id="givenBy"
                      name="givenBy"
                      value={formData.givenBy}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select Given By</option>
                      {givenByOptions.map((person, index) => (
                        <option key={index} value={person}>
                          {person}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Doer's Name Dropdown */}
                  <div className="space-y-2">
                    <label
                      htmlFor="doer"
                      className="block text-sm font-medium text-purple-700"
                    >
                      Doer's Name
                    </label>
                    <select
                      id="doer"
                      name="doer"
                      value={formData.doer}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select Doer</option>
                      {doerOptions.map((doer, index) => (
                        <option key={index} value={doer}>
                          {doer}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  {/* Description with Voice Input */}
                  <div className="space-y-2">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-purple-700"
                    >
                      Task Description *
                    </label>
                    <div className="relative">
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Enter task description or use voice input"
                        rows={4}
                        required
                        className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 pr-10"
                      />

                      {/* Voice Input Button */}
                      {browserSupportsSpeechRecognition && isMicrophoneAvailable && (
                        <div className="absolute bottom-2 right-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (listening) {
                                SpeechRecognition.stopListening();
                              } else {
                                SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
                              }
                            }}
                            className={`p-2 rounded-full ${listening
                              ? 'bg-red-100 text-red-600'
                              : 'bg-purple-100 text-purple-600'
                              } hover:opacity-80 transition-all`}
                            title={listening ? 'Stop listening' : 'Start voice typing'}
                          >
                            {listening ? <MicOff size={16} /> : <Mic size={16} />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Voice Input Status */}
                    {browserSupportsSpeechRecognition && isMicrophoneAvailable && (
                      <div className="flex items-center text-sm text-gray-500">
                        {listening && (
                          <div className="flex items-center mr-2">
                            <span className="relative flex h-3 w-3 mr-1">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Listening... Speak clearly
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={resetTranscript}
                          disabled={!transcript}
                          className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Clear voice input
                        </button>
                      </div>
                    )}

                    {/* Browser Support Message */}
                    {!browserSupportsSpeechRecognition && (
                      <div className="text-sm text-amber-600 mt-1">
                        Voice input is not supported in your browser. Please use Chrome for best experience.
                      </div>
                    )}

                    {!isMicrophoneAvailable && (
                      <div className="text-sm text-amber-600 mt-1">
                        Microphone access is blocked. Please allow microphone access to use voice input.
                      </div>
                    )}
                  </div>

                  {/* Date, Time and Frequency */}
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Date Picker */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-purple-700">
                        Task Deadline Date
                        {(selectedTaskType === "delegation" && (formData.frequency === "critical" || formData.frequency === "urgent")) && (
                          <span className="text-xs text-purple-600 ml-1"></span>
                        )}
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => !isDateDisabled && setShowCalendar(!showCalendar)}
                          disabled={isDateDisabled}
                          className={`w-full flex justify-start items-center rounded-md border border-purple-200 p-2 text-left focus:outline-none focus:ring-1 focus:ring-purple-500 ${isDateDisabled ? "bg-gray-100 cursor-not-allowed opacity-75" : ""
                            }`}
                        >
                          <Calendar className="mr-2 h-4 w-4 text-purple-500" />
                          {date ? getFormattedDate(date) : "Select a date"}
                          {isDateDisabled && (
                            <span className="ml-2 text-xs text-gray-500"></span>
                          )}
                        </button>
                        {showCalendar && !isDateDisabled && (
                          <div className="absolute z-10 mt-1">
                            <CalendarComponent
                              date={date}
                              onChange={setSelectedDate}
                              onClose={() => setShowCalendar(false)}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* NEW: Time Picker */}
                    <div className="space-y-2">
                      <label
                        htmlFor="time"
                        className="block text-sm font-medium text-purple-700"
                      >
                        Time
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          id="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          required
                          className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 pl-8"
                        />
                        <Clock className="absolute left-2 top-2.5 h-4 w-4 text-purple-500" />
                      </div>
                    </div>

                    {/* Frequency */}
                    <div className="space-y-2">
                      <label
                        htmlFor="frequency"
                        className="block text-sm font-medium text-purple-700"
                      >
                        Frequency
                      </label>
                      <select
                        id="frequency"
                        name="frequency"
                        value={formData.frequency}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      // disabled={selectedTaskType === "delegation"} // Disable for delegation
                      >
                        {getFrequencies().map((freq) => (
                          <option key={freq.value} value={freq.value}>
                            {freq.label}
                          </option>
                        ))}
                      </select>
                      {selectedTaskType === "delegation" && (
                        <p className="text-xs text-purple-600">
                          {/* Delegation tasks can only have One-Time frequency */}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* NEW: DateTime Display */}
                  {date && time && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                      <p className="text-sm text-purple-700">
                        <strong>Selected Date & Time:</strong>{" "}
                        {getFormattedDateTime()}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Will be stored as:{" "}
                        {formatDateTimeForStorage(date, time)}
                      </p>
                    </div>
                  )}

                  {/* Additional Options */}
                  <div className="space-y-4 pt-2 border-t border-purple-100">
                    <h3 className="text-lg font-medium text-purple-700 pt-2">
                      Additional Options
                    </h3>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label
                          htmlFor="enable-reminders"
                          className="text-purple-700 font-medium"
                        >
                          Enable Reminders
                        </label>
                        <p className="text-sm text-purple-600">
                          Send reminders before task due date
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BellRing className="h-4 w-4 text-purple-500" />
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            id="enable-reminders"
                            checked={formData.enableReminders}
                            onChange={(e) =>
                              handleSwitchChange("enableReminders", e)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-16 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label
                          htmlFor="require-attachment"
                          className="text-purple-700 font-medium"
                        >
                          Require Attachment
                        </label>
                        <p className="text-sm text-purple-600">
                          User must upload a file when completing task
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileCheck className="h-4 w-4 text-purple-500" />
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            id="require-attachment"
                            checked={formData.requireAttachment}
                            onChange={(e) =>
                              handleSwitchChange("requireAttachment", e)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-16 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Preview and Submit Buttons */}
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={generateTasks}
                      className="w-full rounded-md border border-purple-200 bg-purple-50 py-2 px-4 text-purple-700 hover:bg-purple-100 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      Preview Generated Tasks
                    </button>

                    {generatedTasks.length > 0 && (
                      <div className="w-full">
                        <div className="border border-purple-200 rounded-md">
                          <button
                            type="button"
                            onClick={() => setAccordionOpen(!accordionOpen)}
                            className="w-full flex justify-between items-center p-4 text-purple-700 hover:bg-purple-50 focus:outline-none"
                          >
                            <span className="font-medium">
                              {generatedTasks.length} Tasks Generated
                              {formData.frequency === "one-time" ||
                                formData.frequency === "critical" ||
                                formData.frequency === "urgent"
                                ? " (Will be stored in DELEGATION sheet)"
                                : ` (Will be stored in Unique sheet)`}
                            </span>
                            <svg
                              className={`w-5 h-5 transition-transform ${accordionOpen ? "rotate-180" : ""
                                }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          {accordionOpen && (
                            <div className="p-4 border-t border-purple-200">
                              <div className="max-h-60 overflow-y-auto space-y-2">
                                {generatedTasks
                                  .slice(0, 20)
                                  .map((task, index) => (
                                    <div
                                      key={index}
                                      className="text-sm p-2 border rounded-md border-purple-200 bg-purple-50"
                                    >
                                      <div className="font-medium text-purple-700">
                                        {task.description}
                                      </div>
                                      <div className="text-xs text-purple-600">
                                        Due:{" "}
                                        {formatDateForDisplay(task.dueDate)} |
                                        Department: {task.department}
                                      </div>
                                      <div className="flex space-x-2 mt-1">
                                        {task.enableReminders && (
                                          <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                            <BellRing className="h-3 w-3 mr-1" />{" "}
                                            Reminders
                                          </span>
                                        )}
                                        {task.requireAttachment && (
                                          <span className="inline-flex items-center text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                            <FileCheck className="h-3 w-3 mr-1" />{" "}
                                            Attachment Required
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                {generatedTasks.length > 20 && (
                                  <div className="text-sm text-center text-purple-600 py-2">
                                    ...and {generatedTasks.length - 20} more
                                    tasks
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-t border-purple-100">
                  <button
                    type="button"
                    onClick={() => {
                      // Get user role for proper reset behavior
                      const userRole = sessionStorage.getItem("role");
                      const username = sessionStorage.getItem("username");

                      // Reset form but preserve doer for non-admin users
                      const resetFormData = {
                        department: "",
                        givenBy: "",
                        doer:
                          userRole !== "admin" && username ? formData.doer : "",
                        description: "",
                        frequency: "daily",
                        enableReminders: true,
                        requireAttachment: false,
                      };

                      setFormData(resetFormData);
                      setSelectedDate(new Date());
                      setTime("09:00");
                      setGeneratedTasks([]);
                      setAccordionOpen(false);
                      setSelectedTaskType(null); // Add this line to reset the task type selection
                    }}
                    className="rounded-md border border-purple-200 py-2 px-4 text-purple-700 hover:border-purple-300 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-52 gradient-bg py-3 px-4 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSubmitting ? "Assigning..." : "Assign Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
