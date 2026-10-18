import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec';
const SPREADSHEET_ID = '1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0';

export const getTodayKey = (userName = '') => {
  const d = new Date();
  const nameToUse = (userName || sessionStorage.getItem('username') || localStorage.getItem('username') || 'user')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return `punch_${nameToUse}_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
};

export const getPunchStatus = (userName = '') => {
  const nameToUse = (userName || sessionStorage.getItem('username') || localStorage.getItem('username') || '').trim();
  const isMobile = Capacitor.isNativePlatform();
  const todayKey = getTodayKey(nameToUse);
  const saved = localStorage.getItem(todayKey);

  // If already punched today (via Web OR APK)
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { isPunched: true, punchTime: parsed.time || 'Done', source: parsed.source || 'Punched Today' };
    } catch (e) {
      return { isPunched: true, punchTime: 'Done', source: 'Punched Today' };
    }
  }

  // On Web Browser, auto punch-in if not yet punched
  if (!isMobile) {
    if (nameToUse) {
      recordPunchIn(nameToUse);
      return { isPunched: true, punchTime: 'Web Auto-Punched', source: 'Web Browser' };
    }
  }

  // On Mobile APK, requires manual punch-in if not punched yet today
  return { isPunched: false, punchTime: null, source: null };
};

export const scheduleDailyReminder = async (userName = '') => {
  try {
    if (!Capacitor.isNativePlatform()) return;

    const activeUser = (userName || sessionStorage.getItem('username') || localStorage.getItem('username') || '').trim();
    if (!activeUser) return;

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    try {
      await LocalNotifications.createChannel({
        id: 'sbh_attendance_channel',
        name: 'SBH Attendance Reminders',
        description: 'Daily attendance punch reminders for SBH Staff',
        importance: 5,
        visibility: 1,
        vibration: true
      });
    } catch (e) {}

    const status = getPunchStatus(activeUser);
    if (!status.isPunched) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `⏰ Attendance Reminder for ${activeUser}`,
            body: `Hello ${activeUser}, please complete your Daily Attendance Punch-In!`,
            id: 600,
            channelId: 'sbh_attendance_channel',
            schedule: {
              on: { hour: 10, minute: 0 },
              repeats: true
            }
          }
        ]
      });
    }
  } catch (err) {
    console.log('Local Notification Schedule Notice:', err.message);
  }
};

// Helper to get GPS Location Coordinates
const getDeviceLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve('Location Not Supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        resolve(coords);
      },
      (err) => {
        console.log('Location permission error:', err.message);
        resolve('Location Permission Denied');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
};

export const recordPunchIn = async (userName = '') => {
  const activeUser = (userName || sessionStorage.getItem('username') || localStorage.getItem('username') || 'User').trim();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const todayKey = getTodayKey(activeUser);

  const isMobile = Capacitor.isNativePlatform();
  const deviceSource = isMobile ? 'Mobile App (APK)' : 'Web Browser';

  // Get GPS Location Coordinates
  const locationCoords = await getDeviceLocation();

  const record = {
    userName: activeUser,
    date: now.toISOString().split('T')[0],
    time: timeStr,
    source: deviceSource,
    location: locationCoords,
    timestamp: now.toISOString()
  };

  // Save locally so both Web and APK recognize punch status
  localStorage.setItem(todayKey, JSON.stringify(record));

  // Send to Google Sheet (Attendance Login) with Location & Device Source
  try {
    const payload = {
      action: 'recordAttendance',
      spreadsheetId: SPREADSHEET_ID,
      sheetName: 'Attendance Login',
      userName: activeUser,
      punchTime: timeStr,
      date: record.date,
      source: deviceSource,
      deviceInfo: `${deviceSource} | GPS: ${locationCoords}`,
      location: locationCoords
    };

    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.error('Sheet punch fetch error:', e));
  } catch (e) {
    console.error('Google sheet sync exception:', e);
  }

  // Trigger immediate success notification on Mobile APK
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: '✅ Attendance Punched Successfully',
            body: `Hello ${activeUser}, your attendance has been recorded at ${timeStr} (${locationCoords}).`,
            id: Date.now() % 100000,
            schedule: { at: new Date(Date.now() + 1000) }
          }
        ]
      });
    }
  } catch (e) {
    console.log('Notification trigger notice:', e.message);
  }

  return { success: true, punchTime: timeStr, source: deviceSource, location: locationCoords };
};

scheduleDailyReminder();
