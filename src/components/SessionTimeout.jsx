import { Capacitor } from "@capacitor/core";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const SessionTimeout = () => {
    const isNative = Capacitor.isNativePlatform();
    const navigate = useNavigate();
    const sessionStartRef = useRef(Date.now());

    useEffect(() => {
        // Native APK never times out - keep session active
        if (isNative) return;

        // 15 minutes inactivity timeout (in ms)
        const TIMEOUT_MS = 15 * 60 * 1000;
        // Interval check every 2 seconds
        const CHECK_INTERVAL = 2000;

        const performLogout = () => {
            const username = sessionStorage.getItem("username");
            if (username) {
                try {
                    const payload = new FormData();
                    payload.append("action", "recordLogout");
                    payload.append("username", username);
                    fetch("https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec", {
                        method: "POST",
                        mode: "no-cors",
                        body: payload
                    }).catch(() => {});
                } catch (e) {}
            }

            // Clear session and all active user credentials from localStorage
            sessionStorage.clear();
            localStorage.removeItem("username");
            localStorage.removeItem("role");
            localStorage.removeItem("email");
            localStorage.removeItem("department");
            localStorage.removeItem("isAdmin");

            // Set timeout notification flag
            sessionStorage.setItem("logoutReason", "timeout");
            navigate("/login?reason=timeout", { replace: true });
        };

        const checkAndSetSessionStart = () => {
            const storedStart = sessionStorage.getItem("lastActivity");
            const username = sessionStorage.getItem("username");

            // If not logged in, ignore
            if (!username) return;

            if (storedStart) {
                const startTime = parseInt(storedStart, 10);
                const now = Date.now();

                // If already expired
                if (now - startTime > TIMEOUT_MS) {
                    performLogout();
                    return;
                }
                sessionStartRef.current = startTime;
            } else {
                sessionStartRef.current = Date.now();
                sessionStorage.setItem("lastActivity", sessionStartRef.current.toString());
            }
        };

        // Immediate check on mount
        checkAndSetSessionStart();

        let lastUpdate = 0;
        const THROTTLE_MS = 1000;

        const updateSessionActivity = () => {
            if (sessionStorage.getItem("username")) {
                const now = Date.now();
                sessionStorage.setItem("lastActivity", now.toString());
                sessionStartRef.current = now;
            }
        };

        // Event listeners for user interaction
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastUpdate > THROTTLE_MS) {
                updateSessionActivity();
                lastUpdate = now;
            }
        };

        // Check when user switches tabs or wakes up PC
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const username = sessionStorage.getItem("username");
                if (username) {
                    const storedActivity = sessionStorage.getItem("lastActivity");
                    const lastAct = storedActivity ? parseInt(storedActivity, 10) : sessionStartRef.current;
                    if (Date.now() - lastAct > TIMEOUT_MS) {
                        performLogout();
                    } else {
                        updateSessionActivity();
                    }
                }
            }
        };

        const checkTimeout = () => {
            const username = sessionStorage.getItem("username");
            if (username) {
                const now = Date.now();
                const storedActivity = sessionStorage.getItem("lastActivity");
                const lastAct = storedActivity ? parseInt(storedActivity, 10) : sessionStartRef.current;

                if (now - lastAct > TIMEOUT_MS) {
                    performLogout();
                }
            }
        };

        // Listen for all user interaction types including mobile touch & scrolling
        const events = ['mousemove', 'mousedown', 'keydown', 'keypress', 'touchstart', 'touchmove', 'click', 'scroll', 'wheel'];
        events.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const intervalId = setInterval(checkTimeout, CHECK_INTERVAL);

        return () => {
            clearInterval(intervalId);
            events.forEach(evt => window.removeEventListener(evt, handleActivity));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isNative, navigate]);

    return null;
};

export default SessionTimeout;
