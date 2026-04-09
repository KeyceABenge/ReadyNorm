/**
 * Hook for logging security events from frontend code.
 * Wraps the logSecurityEvent backend function.
 */
import { useCallback } from "react";
import { invokeFunction } from "@/lib/adapters/functions";

export default function useSecurityLogger() {
  const logEvent = useCallback(async (eventType, organizationId, details, targetUserEmail) => {
    // Fire and forget — don't block UI for security logging
    invokeFunction("logSecurityEvent", {
      event_type: eventType,
      organization_id: organizationId,
      details: details || null,
      target_user_email: targetUserEmail || null,
    }).catch(() => {
      // Silently fail — security logging should never break the app
    });
  }, []);

  return { logEvent };
}