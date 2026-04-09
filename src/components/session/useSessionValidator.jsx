import { useEffect, useRef } from "react";
import { EmployeeSessionRepo, OrganizationRepo } from "@/lib/adapters/database";
import { format } from "date-fns";
import { findOrCreateShiftSession, shouldAutoEndSession, autoEndSession } from "./ShiftSessionEngine";

export function useSessionValidator(employee, session, setSession, siteSettings, checkIntervalMs = 60000, crews = []) {
  const hasValidated = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!employee || hasValidated.current) return;
    hasValidated.current = true;

    const validate = async () => {
      const storedRaw = localStorage.getItem("employeeSession");
      if (!storedRaw) return;

      let localSession;
      try {
        localSession = JSON.parse(storedRaw);
      } catch {
        return;
      }

      try {
        const dbSessions = await EmployeeSessionRepo.filter({
          organization_id: employee.organization_id,
          employee_id: employee.id,
          session_date: format(new Date(), "yyyy-MM-dd"),
          status: "active"
        });

        const stillActive = dbSessions.find(s => s.id === localSession.id);

        if (stillActive) {
          setSession(stillActive);
          localStorage.setItem("employeeSession", JSON.stringify(stillActive));
        } else {
          console.log("[SessionValidator] Previous session no longer active, creating new session");
          const settings = siteSettings?.[0] || {};
          const orgList = await OrganizationRepo.filter({ id: employee.organization_id });
          if (orgList.length > 0) {
            const { session: newSession } = await findOrCreateShiftSession(employee, orgList[0], settings, crews);
            setSession(newSession);
            localStorage.setItem("employeeSession", JSON.stringify(newSession));
          }
        }
      } catch (e) {
        console.error("[SessionValidator] Validation failed:", e);
      }
    };

    validate();
  }, [employee, siteSettings]);

  useEffect(() => {
    if (!session || session.status !== "active" || !siteSettings?.length) return;

    const autoEndSettings = siteSettings[0]?.auto_end_settings || {
      enabled: true,
      grace_period_minutes: 60,
      idle_threshold_minutes: 30,
      reopen_incomplete_tasks: true
    };

    if (!autoEndSettings.enabled) return;

    const checkAndAutoEnd = async () => {
      const { shouldEnd, reason } = shouldAutoEndSession(session, autoEndSettings, new Date());
      if (!shouldEnd) return;

      console.log("[SessionValidator] Auto-ending session:", reason);
      try {
        await autoEndSession(session, autoEndSettings, reason);
        const settings = siteSettings[0] || {};
        const orgList = await OrganizationRepo.filter({ id: employee.organization_id });
        if (orgList.length > 0) {
          const { session: newSession } = await findOrCreateShiftSession(employee, orgList[0], settings, crews);
          setSession(newSession);
          localStorage.setItem("employeeSession", JSON.stringify(newSession));
        }
      } catch (e) {
        console.error("[SessionValidator] Auto-end failed:", e);
      }
    };

    checkAndAutoEnd();
    intervalRef.current = setInterval(checkAndAutoEnd, checkIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session?.id, session?.status, siteSettings, employee, checkIntervalMs]);
}

export default useSessionValidator;