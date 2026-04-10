import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Play, History, TrendingUp, TrendingDown, Trophy } from "lucide-react";
import { format, differenceInMinutes, parseISO } from "date-fns";
import ShiftSelector from "./ShiftSelector";
import ShiftTeamBreakdown from "./ShiftTeamBreakdown";

export default function LiveShiftProgress({ 
  employees, 
  sessions, 
  tasks, 
  completedTasks,
  shiftSettings,
  crews,
  onEmployeeClick,
  areaSignOffs = [],
  expectedTasks = {}
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const shifts = shiftSettings?.shifts || [];

  // Determine the live current shift
  const liveShift = useMemo(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    
    for (const shift of shifts) {
      if (!shift.start_time || !shift.end_time) continue;
      const [sH, sM] = shift.start_time.split(":").map(Number);
      const [eH, eM] = shift.end_time.split(":").map(Number);
      const start = sH * 60 + sM;
      const end = eH * 60 + eM;
      
      if (end < start) {
        if (mins >= start || mins < end) return shift;
      } else {
        if (mins >= start && mins < end) return shift;
      }
    }
    return shifts[0] || { id: "default", name: "Shift", start_time: "06:00", end_time: "14:30" };
  }, [shifts, currentTime]);

  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedShiftId, setSelectedShiftId] = useState(liveShift?.id || "default");

  // Auto-update selected shift when live shift changes
  useEffect(() => {
    if (selectedDate === today && liveShift?.id) {
      setSelectedShiftId(liveShift.id);
    }
  }, [liveShift?.id, today, selectedDate]);

  const isLive = selectedDate === today && selectedShiftId === (liveShift?.id || "default");

  // Tick every minute when live
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Get the selected shift definition
  const selectedShiftDef = useMemo(() => {
    return shifts.find(s => s.id === selectedShiftId) || liveShift;
  }, [shifts, selectedShiftId, liveShift]);

  // Get sessions for selected date + shift
  const filteredSessions = useMemo(() => {
    // Match sessions for selected date — try shift-specific first, then broaden
    const dateSessions = sessions.filter(s => {
      if (s.session_date !== selectedDate) return false;
      // Include any session that was meaningfully started — don't filter by status alone
      // because status values vary (active, ended, auto_ended, in_progress, etc.)
      if (s.task_selection_completed) return true;
      if (s.status && s.status !== "pending" && s.status !== "cancelled") return true;
      return false;
    });
    
    // Try matching by shift_id or shift_name
    const shiftMatched = dateSessions.filter(s => {
      if (s.shift_id) return s.shift_id === selectedShiftId;
      if (s.shift_name && selectedShiftDef?.name) {
        return s.shift_name.toLowerCase() === selectedShiftDef.name.toLowerCase();
      }
      return selectedShiftId === (shifts[0]?.id || "default");
    });
    
    // Use shift-matched if found, otherwise use all date sessions
    // (prevents showing empty when shift_id init hasn't synced yet)
    return shiftMatched.length > 0 ? shiftMatched : dateSessions;
  }, [sessions, selectedDate, selectedShiftId, selectedShiftDef, shifts]);

  // Calculate shift time progress
  const shiftProgress = useMemo(() => {
    if (!selectedShiftDef) return { percentComplete: 0, elapsedMinutes: 0, remainingMinutes: 0, totalMinutes: 480, shiftStart: new Date(), shiftEnd: new Date() };
    
    const [sH, sM] = (selectedShiftDef.start_time || "06:00").split(":").map(Number);
    const [eH, eM] = (selectedShiftDef.end_time || "14:30").split(":").map(Number);
    
    const refDate = parseISO(selectedDate);
    const shiftStart = new Date(refDate);
    shiftStart.setHours(sH, sM, 0, 0);
    const shiftEnd = new Date(refDate);
    shiftEnd.setHours(eH, eM, 0, 0);
    if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);
    
    const totalMinutes = differenceInMinutes(shiftEnd, shiftStart);
    
    if (isLive) {
      const now = new Date();
      const elapsed = Math.max(0, differenceInMinutes(now, shiftStart));
      const remaining = Math.max(0, differenceInMinutes(shiftEnd, now));
      return { totalMinutes, elapsedMinutes: elapsed, remainingMinutes: remaining, percentComplete: Math.min(100, (elapsed / totalMinutes) * 100), shiftStart, shiftEnd };
    } else {
      // Historical - show as 100% complete
      return { totalMinutes, elapsedMinutes: totalMinutes, remainingMinutes: 0, percentComplete: 100, shiftStart, shiftEnd };
    }
  }, [selectedShiftDef, selectedDate, isLive, currentTime]);

  // Determine which crew(s) are scheduled for the selected shift
  const scheduledCrewMembers = useMemo(() => {
    if (!crews || crews.length === 0 || !selectedShiftDef) return new Set();
    
    const memberEmails = new Set();
    const selectedId = selectedShiftDef.id || selectedShiftId;
    const [selStartH] = (selectedShiftDef.start_time || "06:00").split(":").map(Number);
    const [selEndH] = (selectedShiftDef.end_time || "14:30").split(":").map(Number);
    const selIsNight = selEndH <= selStartH;
    
    for (const crew of crews) {
      if (crew.status !== "active") continue;
      if (!crew.members || crew.members.length === 0) continue;
      
      // Step 1: Match crew to shift
      // If crew has an explicit shift_id, use it (exact match only)
      if (crew.shift_id) {
        if (crew.shift_id !== selectedId) continue;
      } else {
        // Legacy fallback: match by day/night heuristic
        // Use this for primary shifts (shift_1 / shift_2) and the "default" fallback
        // For custom shifts (Painter, Bulk Sanitation, etc.), require explicit shift_id
        const isPrimaryShift = selectedId === "shift_1" || selectedId === "shift_2" || selectedId === "default";
        if (!isPrimaryShift) continue;
        
        const crewStartStr = crew.shift_start_time;
        const crewEndStr = crew.shift_end_time;
        
        let crewIsNight = false;
        if (crewStartStr && crewEndStr) {
          const cSH = parseInt(crewStartStr.split(":")[0]);
          const cEH = parseInt(crewEndStr.split(":")[0]);
          crewIsNight = cEH <= cSH;
        } else if (!crewStartStr && crewEndStr) {
          crewIsNight = true;
        } else if (crewStartStr && !crewEndStr) {
          crewIsNight = false;
        } else {
          const name = (crew.name || "").toLowerCase();
          crewIsNight = name.includes("night");
        }
        
        if (crewIsNight !== selIsNight) continue;
      }
      
      // Step 2: Check if crew works on selectedDate per their schedule_pattern
      if (crew.schedule_pattern && crew.schedule_pattern.length > 0 && crew.schedule_pattern_start_date) {
        const patternStart = new Date(crew.schedule_pattern_start_date + "T00:00:00Z");
        const targetDate = new Date(selectedDate + "T00:00:00Z");
        const diffDays = Math.floor((targetDate - patternStart) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) continue;
        
        const pattern = crew.schedule_pattern;
        const totalPatternDays = pattern.length * 7;
        const dayInPattern = ((diffDays % totalPatternDays) + totalPatternDays) % totalPatternDays;
        const weekIndex = Math.floor(dayInPattern / 7);
        const dayOfWeek = dayInPattern % 7;
        const weekPattern = pattern[weekIndex];
        
        if (!weekPattern || weekPattern[dayOfWeek] !== true) continue;
      } else {
        continue;
      }
      
      for (const email of crew.members) {
        memberEmails.add(email);
      }
    }
    
    return memberEmails;
  }, [crews, selectedDate, selectedShiftDef, selectedShiftId]);

  // Calculate employee progress — show ONLY scheduled crew members, merge with session data
  const employeeProgress = useMemo(() => {
    // Group sessions by employee_email AND employee_id for robust matching
    const bestSessionByEmail = {};
    const bestSessionById = {};
    for (const session of filteredSessions) {
      const email = session.employee_email;
      const empId = session.employee_id;
      
      const pickBetter = (existing, session) => {
        if (!existing) return session;
        const isActiveNew = session.status === "active";
        const isActiveOld = existing.status === "active";
        if (isActiveNew && !isActiveOld) return session;
        if (isActiveNew === isActiveOld && (session.created_date || "") > (existing.created_date || "")) return session;
        return existing;
      };
      
      if (email) bestSessionByEmail[email] = pickBetter(bestSessionByEmail[email], session);
      if (empId) bestSessionById[empId] = pickBetter(bestSessionById[empId], session);
    }

    // Build progress entries from scheduled crew members AND anyone with an active session
    // This ensures employees who are actually working show up even if schedule pattern doesn't match
    const allEmails = new Set(scheduledCrewMembers);
    for (const session of filteredSessions) {
      if (session.employee_email) allEmails.add(session.employee_email);
    }

    return Array.from(allEmails).map(email => {
      // Try matching by email first, then by employee_id
      let session = bestSessionByEmail[email];
      if (!session) {
        const employee = employees.find(e => e.email === email);
        if (employee) session = bestSessionById[employee.id];
      }
      const employee = employees.find(e => e.email === email) 
        || (session ? employees.find(e => e.id === session.employee_id) : null);
      
      // Prefer numeric counts (tasks_selected_count/tasks_completed_count) over array lengths
      // because simulation may populate counts without filling the arrays
      const selectedCount = session?.tasks_selected_count || session?.selected_tasks?.length || 0;
      const completedCount = session?.tasks_completed_count || session?.completed_tasks?.length || 0;
      
      const expectedProgress = Math.min(100, shiftProgress.percentComplete);
      const actualProgress = selectedCount > 0 ? (completedCount / selectedCount) * 100 : 0;
      
      let status = "on_track";
      if (!session) {
        // No session = not started yet
        status = shiftProgress.percentComplete > 15 ? "delayed" : "on_track";
      } else if (actualProgress >= 100) {
        // Completed all tasks — always on track
        status = "on_track";
      } else if (actualProgress < expectedProgress - 20) {
        status = "delayed";
      } else if (actualProgress < expectedProgress - 10) {
        status = "at_risk";
      }

      const displayEmployee = employee || {
        name: session?.employee_name || email.split("@")[0],
        email: email,
        color: "#64748b"
      };

      return {
        ...(session || {}),
        id: session?.id || email,
        employee: displayEmployee,
        employee_email: email,
        selectedCount,
        completedCount,
        expectedProgress,
        actualProgress,
        status,
        hasSession: !!session,
        session_status: session?.status || null
      };
    }).sort((a, b) => {
      // Sort: active sessions first, then by progress
      if (a.hasSession && !b.hasSession) return -1;
      if (!a.hasSession && b.hasSession) return 1;
      return b.actualProgress - a.actualProgress;
    });
  }, [filteredSessions, employees, shiftProgress, scheduledCrewMembers]);

  // Count UNIQUE tasks completed during this shift window (deduplicated by title+area)
  // Prevents inflated counts from simulation/recurring records with duplicate titles
  const shiftCompletedCount = useMemo(() => {
    if (!selectedShiftDef) return 0;
    const [sH, sM] = (selectedShiftDef.start_time || "06:00").split(":").map(Number);
    const [eH, eM] = (selectedShiftDef.end_time || "14:30").split(":").map(Number);
    const refDate = parseISO(selectedDate);
    const shiftStart = new Date(refDate); shiftStart.setHours(sH, sM, 0, 0);
    const shiftEnd = new Date(refDate); shiftEnd.setHours(eH, eM, 0, 0);
    if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

    const seenKeys = new Set();
    tasks.forEach(t => {
      if (t.is_group) return;
      if (t.status !== "completed" && t.status !== "verified") return;
      if (!t.completed_at) return;
      const d = parseISO(t.completed_at);
      if (d < shiftStart || d > shiftEnd) return;
      const key = `${(t.title || "").toLowerCase().trim()}|${(t.area || "").toLowerCase().trim()}`;
      seenKeys.add(key);
    });
    return seenKeys.size;
  }, [tasks, selectedShiftDef, selectedDate]);

  // Team totals — scoped to THIS shift's employee sessions only
  // IMPORTANT: Use session-reported counts as the single source of truth.
  // The raw task entity count (shiftCompletedCount) includes all accumulated simulation records
  // and will be inflated. Session data reflects what employees actually selected/completed per shift.
  const teamTotals = useMemo(() => {
    const totalSelected = employeeProgress.reduce((s, ep) => s + ep.selectedCount, 0);
    const totalCompleted = employeeProgress.reduce((s, ep) => s + ep.completedCount, 0);
    const onTrack = employeeProgress.filter(ep => ep.status === "on_track").length;
    const atRisk = employeeProgress.filter(ep => ep.status === "at_risk").length;
    const delayed = employeeProgress.filter(ep => ep.status === "delayed").length;
    
    // Use session data as the source of truth when available
    // Only fall back to shiftCompletedCount if there are zero sessions
    const effectiveTotal = totalSelected > 0 ? totalSelected : shiftCompletedCount;
    const effectiveCompleted = totalSelected > 0 ? totalCompleted : shiftCompletedCount;
    
    return { totalSelected: effectiveTotal, totalCompleted: effectiveCompleted, onTrack, atRisk, delayed };
  }, [employeeProgress, shiftCompletedCount]);

  // Prediction (only for live, needs sufficient data)
  const prediction = useMemo(() => {
    if (!isLive || teamTotals.totalSelected === 0) return null;
    // Need at least 15 minutes elapsed AND at least 1 task completed to make a meaningful prediction
    if (shiftProgress.elapsedMinutes < 15 || teamTotals.totalCompleted === 0) return null;
    const rate = teamTotals.totalCompleted / shiftProgress.elapsedMinutes;
    const remaining = teamTotals.totalSelected - teamTotals.totalCompleted;
    if (remaining <= 0) return { willComplete: true, estimatedCompletionTime: new Date(), minutesOverUnder: shiftProgress.remainingMinutes };
    const minsNeeded = remaining / rate;
    const willComplete = minsNeeded <= shiftProgress.remainingMinutes;
    const minutesOverUnder = shiftProgress.remainingMinutes - minsNeeded;
    return { willComplete, estimatedCompletionTime: new Date(Date.now() + minsNeeded * 60000), minutesOverUnder };
  }, [teamTotals, shiftProgress, isLive]);

  const handleShiftSelect = (date, shiftId) => {
    setSelectedDate(date);
    setSelectedShiftId(shiftId);
  };

  // Historical completion rate
  const completionRate = teamTotals.totalSelected > 0 
    ? Math.round((teamTotals.totalCompleted / teamTotals.totalSelected) * 100) 
    : 0;

  // Shift performance target status
  // Compare actual completion % vs where they should be based on elapsed shift time
  const shiftTargetStatus = useMemo(() => {
    if (teamTotals.totalSelected === 0) return { status: "no_data", label: "No Target", pacePercent: 0, expectedAtThisPoint: 0 };
    
    const completionPercent = (teamTotals.totalCompleted / teamTotals.totalSelected) * 100;
    const timePercent = shiftProgress.percentComplete;
    
    // How many tasks should be done by now based on time elapsed
    const expectedAtThisPoint = Math.round((timePercent / 100) * teamTotals.totalSelected);
    // Pace: how far ahead/behind (positive = ahead)
    const delta = teamTotals.totalCompleted - expectedAtThisPoint;
    const pacePercent = timePercent > 0 ? Math.round(completionPercent - timePercent) : (teamTotals.totalCompleted > 0 ? 100 : 0);
    
    if (!isLive) {
      // Historical: final result
      if (completionPercent >= 100) return { status: "exceeding", label: "Exceeded Target", pacePercent: Math.round(completionPercent - 100), expectedAtThisPoint: teamTotals.totalSelected, delta };
      if (completionPercent >= 90) return { status: "on_target", label: "Hit Target", pacePercent, expectedAtThisPoint: teamTotals.totalSelected, delta };
      return { status: "below_target", label: "Below Target", pacePercent: Math.round(completionPercent - 100), expectedAtThisPoint: teamTotals.totalSelected, delta };
    }
    
    // Live: compare pace
    if (pacePercent >= 15) return { status: "exceeding", label: "Above & Beyond", pacePercent, expectedAtThisPoint, delta };
    if (pacePercent >= -10) return { status: "on_target", label: "On Target", pacePercent, expectedAtThisPoint, delta };
    return { status: "below_target", label: "Below Target", pacePercent, expectedAtThisPoint, delta };
  }, [teamTotals, shiftProgress, isLive]);

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            {isLive ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <History className="w-3.5 h-3.5 text-slate-400" />}
            Shift Progress
          </CardTitle>
          <span className="text-xs text-slate-500">{isLive ? format(currentTime, "h:mm a") : ""}</span>
        </div>
        {/* Shift navigation */}
        <div className="mt-1">
          <ShiftSelector
            sessions={sessions}
            shifts={shifts.length > 0 ? shifts : [{ id: "default", name: "Shift", start_time: "06:00", end_time: "14:30" }]}
            selectedDate={selectedDate}
            selectedShiftId={selectedShiftId}
            onSelect={handleShiftSelect}
            isLive={isLive}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 flex-1 flex flex-col">
        {/* Shift Timeline */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>{format(shiftProgress.shiftStart, "h:mm a")}</span>
            <span className="font-medium text-slate-700">{Math.round(shiftProgress.percentComplete)}%</span>
            <span>{format(shiftProgress.shiftEnd, "h:mm a")}</span>
          </div>
          <Progress value={shiftProgress.percentComplete} className="h-1.5" />
        </div>

        {/* Shift Target Status Banner */}
        {shiftTargetStatus.status !== "no_data" && (
          <div className={`rounded-lg p-2.5 flex items-center justify-between ${
            shiftTargetStatus.status === "exceeding" 
              ? "bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200" 
              : shiftTargetStatus.status === "on_target" 
                ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200" 
                : "bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200"
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                shiftTargetStatus.status === "exceeding" 
                  ? "bg-emerald-100" 
                  : shiftTargetStatus.status === "on_target" 
                    ? "bg-blue-100" 
                    : "bg-rose-100"
              }`}>
                {shiftTargetStatus.status === "exceeding" 
                  ? <Trophy className="w-4 h-4 text-emerald-600" /> 
                  : shiftTargetStatus.status === "on_target" 
                    ? <TrendingUp className="w-4 h-4 text-blue-600" /> 
                    : <TrendingDown className="w-4 h-4 text-rose-600" />}
              </div>
              <div>
                <p className={`text-xs font-semibold ${
                  shiftTargetStatus.status === "exceeding" 
                    ? "text-emerald-800" 
                    : shiftTargetStatus.status === "on_target" 
                      ? "text-blue-800" 
                      : "text-rose-800"
                }`}>
                  {shiftTargetStatus.label}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isLive 
                    ? `${teamTotals.totalCompleted} done · ${shiftTargetStatus.expectedAtThisPoint} expected by now`
                    : `${teamTotals.totalCompleted}/${teamTotals.totalSelected} completed`
                  }
                </p>
              </div>
            </div>
            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${
              shiftTargetStatus.status === "exceeding" 
                ? "bg-emerald-100 text-emerald-700 border-emerald-300" 
                : shiftTargetStatus.status === "on_target" 
                  ? "bg-blue-100 text-blue-700 border-blue-300" 
                  : "bg-rose-100 text-rose-700 border-rose-300"
            }`}>
              {shiftTargetStatus.pacePercent > 0 ? "+" : ""}{shiftTargetStatus.pacePercent}%
            </Badge>
          </div>
        )}

        {/* Status Summary */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className="bg-slate-50 rounded p-1.5 text-center">
            <p className="text-lg font-bold text-slate-900">{employeeProgress.filter(ep => ep.hasSession).length}<span className="text-xs font-normal text-slate-400">/{employeeProgress.length}</span></p>
            <p className="text-[10px] text-slate-500">Active</p>
          </div>
          <div className="bg-emerald-50 rounded p-1.5 text-center">
            <p className="text-lg font-bold text-emerald-700">{teamTotals.onTrack}</p>
            <p className="text-[10px] text-emerald-600">On Track</p>
          </div>
          <div className="bg-amber-50 rounded p-1.5 text-center">
            <p className="text-lg font-bold text-amber-700">{teamTotals.atRisk}</p>
            <p className="text-[10px] text-amber-600">At Risk</p>
          </div>
          <div className="bg-rose-50 rounded p-1.5 text-center">
            <p className="text-lg font-bold text-rose-700">{teamTotals.delayed}</p>
            <p className="text-[10px] text-rose-600">Delayed</p>
          </div>
        </div>

        {/* Task Progress */}
        <div className="bg-slate-50 rounded p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium">Tasks</span>
            <span className="text-xs font-bold">{teamTotals.totalCompleted}/{teamTotals.totalSelected}</span>
          </div>
          <Progress value={teamTotals.totalSelected > 0 ? (teamTotals.totalCompleted / teamTotals.totalSelected) * 100 : 0} className="h-2" />
          {isLive && prediction && (
            <p className={`text-[10px] mt-1.5 ${prediction.willComplete ? "text-emerald-600" : "text-rose-600"}`}>
              {prediction.willComplete ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Est. done {format(prediction.estimatedCompletionTime, "h:mm a")}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  ~{Math.abs(Math.round(prediction.minutesOverUnder)) >= 120 
                    ? `${Math.round(Math.abs(prediction.minutesOverUnder) / 60)}h over`
                    : `${Math.abs(Math.round(prediction.minutesOverUnder))}m over`
                  }
                </span>
              )}
            </p>
          )}
          {!isLive && (
            <p className={`text-[10px] mt-1.5 font-medium ${completionRate >= 90 ? "text-emerald-600" : completionRate >= 70 ? "text-amber-600" : "text-rose-600"}`}>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {completionRate}% completed
              </span>
            </p>
          )}
        </div>

        {/* Team & Employee Breakdown */}
        <ShiftTeamBreakdown
          employeeProgress={employeeProgress}
          crews={crews}
          onEmployeeClick={onEmployeeClick}
          isLive={isLive}
          scheduledCrewMembers={scheduledCrewMembers}
        />
      </CardContent>
    </Card>
  );
}