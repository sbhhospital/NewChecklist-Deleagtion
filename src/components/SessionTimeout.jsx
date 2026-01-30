import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const SessionTimeout = () => {
    const navigate = useNavigate();
    // Use a ref to track the session start time
    const sessionStartRef = useRef(Date.now());

    useEffect(() => {
        // 30 minutes in milliseconds
        const TIMEOUT_MS = 30 * 60 * 1000;
        // Check every second (to update checks)
        const CHECK_INTERVAL = 1000;

        const checkAndSetSessionStart = () => {
            const storedStart = sessionStorage.getItem("lastActivity");
            const username = sessionStorage.getItem("username");

            // If not logged in, we don't care
            if (!username) return;

            if (storedStart) {
                const startTime = parseInt(storedStart, 10);
                const now = Date.now();

                // If existing session is already expired
                if (now - startTime > TIMEOUT_MS) {
                    console.log("Session expired (on load)");
                    sessionStorage.clear();
                    window.location.href = "/login";
                    return;
                }

                // RESTORE existing start time
                sessionStartRef.current = startTime;
            } else {
                // First time setting it for this session (Login)
                sessionStartRef.current = Date.now();
                sessionStorage.setItem("lastActivity", sessionStartRef.current.toString());
            }
        };

        // Run immediate check on mount
        checkAndSetSessionStart();

        const updateSessionActivity = () => {
            if (sessionStorage.getItem("username")) {
                const now = Date.now();
                sessionStorage.setItem("lastActivity", now.toString());
                sessionStartRef.current = now;
            }
        };

        // Throttling to prevent excessive writes
        let lastUpdate = 0;
        const THROTTLE_MS = 1000;

        // Event listeners for activity
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastUpdate > THROTTLE_MS) {
                updateSessionActivity();
                lastUpdate = now;
            }
        };

        // Add event listeners
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        const checkTimeout = () => {
            const username = sessionStorage.getItem("username");

            // Only enforce timeout if user is logged in
            if (username) {
                const now = Date.now();
                // Read directly from storage to sync across tabs/updates
                const storedActivity = sessionStorage.getItem("lastActivity");
                const startTime = storedActivity ? parseInt(storedActivity, 10) : sessionStartRef.current;

                if (now - startTime > TIMEOUT_MS) {
                    console.log("Session expired due to time limit");
                    sessionStorage.clear();
                    window.location.href = "/login";
                }
            }
        };

        // Start the interval check
        const intervalId = setInterval(checkTimeout, CHECK_INTERVAL);

        // Cleanup
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
        };
    }, [navigate]);

    return null;
};

export default SessionTimeout;
