import { useEffect, useState } from "react";
import { EmployeeSessionRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { shouldAutoEndSession, autoEndSession } from "./ShiftSessionEngine";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

/**
 * Session Auto-End Monitor
 * 
 * Runs in the background to check for sessions that should be auto-ended.
 * Can be used by managers to monitor and manually close sessions.
 */

export const useSessionAutoEndMonitor = (organizationId, siteSettings, checkIntervalMs = 60000) => {
  const [lastCheck, setLastCheck] = useState(null);
  const [autoEndedCount, setAutoEndedCount] = useState(0);
  
  const autoEndSettings = siteSettings?.auto_end_settings || {
    enabled: true,
    grace_period_minutes: 60,
    idle_threshold_minutes: 30,
    reopen_incomplete_tasks: true
  };
  
  // Fetch active sessions
  const { data: activeSessions = [], refetch } = useQuery({
    queryKey: ["active_sessions_monitor", organizationId],
    queryFn: () => EmployeeSessionRepo.filter({
      organization_id: organizationId,
      status: "active"
    }),
    enabled: !!organizationId && autoEndSettings.enabled,
    refetchInterval: checkIntervalMs
  });
  
  // Check and auto-end sessions
  useEffect(() => {
    if (!autoEndSettings.enabled || activeSessions.length === 0) return;
    
    const checkSessions = async () => {
      const now = new Date();
      let endedCount = 0;
      
      for (const session of activeSessions) {
        const { shouldEnd, reason } = shouldAutoEndSession(session, autoEndSettings, now);
        
        if (shouldEnd) {
          try {
            await autoEndSession(session, autoEndSettings, reason);
            endedCount++;
            console.log(`Auto-ended session for ${session.employee_name}: ${reason}`);
          } catch (e) {
            console.error("Failed to auto-end session:", session.id, e);
          }
        }
      }
      
      if (endedCount > 0) {
        setAutoEndedCount(prev => prev + endedCount);
        refetch();
      }
      
      setLastCheck(now);
    };
    
    checkSessions();
  }, [activeSessions, autoEndSettings]);
  
  return {
    activeSessions,
    lastCheck,
    autoEndedCount,
    refetch
  };
};

// Component for managers to view and manage active sessions
export default function SessionAutoEndMonitor({ organizationId, siteSettings }) {
  const { activeSessions, lastCheck, autoEndedCount, refetch } = useSessionAutoEndMonitor(
    organizationId, 
    siteSettings
  );
  
  const autoEndSettings = siteSettings?.auto_end_settings || {};
  
  const handleManualEnd = async (session) => {
    if (!confirm(`End session for ${session.employee_name}? Incomplete tasks will be reopened.`)) return;
    
    try {
      await autoEndSession(session, autoEndSettings, "manager_closed");
      toast.success(`Session ended for ${session.employee_name}`);
      refetch();
    } catch (e) {
      toast.error("Failed to end session");
    }
  };
  
  if (activeSessions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p className="text-sm">No active employee sessions</p>
        {lastCheck && (
          <p className="text-xs mt-2">Last checked: {format(lastCheck, "h:mm a")}</p>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{activeSessions.length} active session{activeSessions.length !== 1 ? "s" : ""}</span>
        {lastCheck && <span>Last check: {format(lastCheck, "h:mm a")}</span>}
      </div>
      
      {activeSessions.map(session => {
        const { shouldEnd, reason, idleMinutes } = shouldAutoEndSession(session, autoEndSettings);
        
        return (
          <div 
            key={session.id} 
            className={`p-3 rounded-lg border ${shouldEnd ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-slate-900">{session.employee_name}</p>
                <p className="text-xs text-slate-500">
                  {session.shift_name || "Unknown Shift"} • Started {format(parseISO(session.start_time), "h:mm a")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Tasks: {session.tasks_completed_count || 0}/{session.tasks_selected_count || 0} completed
                  {idleMinutes !== undefined && ` • Idle ${idleMinutes}m`}
                </p>
              </div>
              <button
                onClick={() => handleManualEnd(session)}
                className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50"
              >
                End Session
              </button>
            </div>
            {shouldEnd && (
              <p className="text-xs text-amber-700 mt-2">
                ⚠️ Eligible for auto-end ({reason === "auto_idle" ? "idle timeout" : "shift ended"})
              </p>
            )}
          </div>
        );
      })}
      
      {autoEndedCount > 0 && (
        <p className="text-xs text-slate-500 text-center mt-4">
          {autoEndedCount} session{autoEndedCount !== 1 ? "s" : ""} auto-ended this check cycle
        </p>
      )}
    </div>
  );
}