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
                    navigate("/login");
                    return;
                }

                // RESTORE existing start time (do not reset)
                sessionStartRef.current = startTime;
            } else {
                // First time setting it for this session (Login)
                sessionStartRef.current = Date.now();
                sessionStorage.setItem("lastActivity", sessionStartRef.current.toString());
            }
        };

        // Run immediate check on mount
        checkAndSetSessionStart();

        const checkTimeout = () => {
            const username = sessionStorage.getItem("username");

            // Only enforce timeout if user is logged in
            if (username) {
                const now = Date.now();
                const startTime = sessionStartRef.current;

                // Sync the start time to storage (redundant but safe)
                // We do NOT update startTime on activity anymore.

                if (now - startTime > TIMEOUT_MS) {
                    console.log("Session expired due to time limit");
                    sessionStorage.clear();
                    navigate("/login");
                }
            }
        };

        // NO event listeners for activity tracking anymore.
        // The session is fixed length from login/start.

        // Start the interval check
        const intervalId = setInterval(checkTimeout, CHECK_INTERVAL);

        // Cleanup
        return () => {
            clearInterval(intervalId);
        };
    }, [navigate]);

    return null;
};

export default SessionTimeout;
