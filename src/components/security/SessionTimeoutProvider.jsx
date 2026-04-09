/**
 * Session Timeout Provider
 * Auto-logs out idle users after a configurable period.
 * Tracks mouse, keyboard, touch, and scroll activity.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { logout } from "@/lib/adapters/auth";
import useSecurityLogger from "@/hooks/useSecurityLogger";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const DEFAULT_TIMEOUT_MINUTES = 30;
const WARNING_BEFORE_SECONDS = 60; // Show warning 60s before logout

export default function SessionTimeoutProvider({ children, timeoutMinutes, organizationId }) {
  const timeout = (timeoutMinutes || DEFAULT_TIMEOUT_MINUTES) * 60 * 1000;
  const warningAt = timeout - WARNING_BEFORE_SECONDS * 1000;
  const lastActivityRef = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_BEFORE_SECONDS);
  const { logEvent } = useSecurityLogger();

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) setShowWarning(false);
  }, [showWarning]);

  // Track user activity
  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, resetTimer));
  }, [resetTimer]);

  // Check for timeout every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeout) {
        clearInterval(interval);
        if (organizationId) {
          logEvent("logout", organizationId, "Auto-logout due to inactivity");
        }
        logout(window.location.href);
        return;
      }

      if (elapsed >= warningAt && !showWarning) {
        setShowWarning(true);
        setCountdown(Math.ceil((timeout - elapsed) / 1000));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [timeout, warningAt, showWarning, organizationId, logEvent]);

  // Countdown ticker when warning is shown
  useEffect(() => {
    if (!showWarning) return;
    const tick = setInterval(() => {
      const remaining = Math.ceil((timeout - (Date.now() - lastActivityRef.current)) / 1000);
      if (remaining <= 0) {
        clearInterval(tick);
        if (organizationId) {
          logEvent("logout", organizationId, "Auto-logout due to inactivity");
        }
        logout(window.location.href);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [showWarning, timeout, organizationId, logEvent]);

  return (
    <>
      {children}
      <AlertDialog open={showWarning}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Session Expiring
            </AlertDialogTitle>
            <AlertDialogDescription>
              You'll be logged out in <strong>{countdown}s</strong> due to inactivity.
              Move your mouse or click to stay signed in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={resetTimer} className="bg-slate-900 hover:bg-slate-800 w-full">
              Stay Signed In
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}