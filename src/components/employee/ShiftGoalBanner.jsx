/**
 * ShiftGoalBanner
 * Shows the employee's per-shift task quota and progress.
 * Uses the same quota system as the TaskSelectionModal (task_quotas from SiteSettings or RoleConfig).
 * After 2 hours into the shift, alerts if fewer employees are active than expected.
 */

import { useState, useEffect, useMemo } from "react";
import { EmployeeSessionRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Target, Users, User, AlertTriangle, X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { calculateExpectedTasks } from "@/components/dashboard/performanceCalculations";

function getCurrentShift(shifts) {
  if (!shifts || shifts.length === 0) return null;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  
  for (const shift of shifts) {
    const [sH, sM] = (shift.start_time || "05:00").split(":").map(Number);
    const [eH, eM] = (shift.end_time || "17:00").split(":").map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;
    
    if (endMin > startMin) {
      if (mins >= startMin && mins < endMin) return shift;
    } else {
      if (mins >= startMin || mins < endMin) return shift;
    }
  }
  return shifts[0];
}

function getShiftStartDate(shift) {
  if (!shift) return new Date();
  const now = new Date();
  const [sH, sM] = (shift.start_time || "05:00").split(":").map(Number);
  const start = new Date(now);
  start.setHours(sH, sM, 0, 0);
  
  const [eH, eM] = (shift.end_time || "17:00").split(":").map(Number);
  const endMin = eH * 60 + eM;
  const startMin = sH * 60 + sM;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  
  if (endMin <= startMin && nowMin < endMin) {
    start.setDate(start.getDate() - 1);
  }
  
  return start;
}

function getMinutesIntoShift(shift) {
  const shiftStart = getShiftStartDate(shift);
  const now = new Date();
  return Math.floor((now - shiftStart) / 60000);
}

function getExpectedCrewSize(crews, shift) {
  if (!crews || crews.length === 0 || !shift) return 0;
  
  const today = new Date();
  const dayIndex = today.getDay();
  
  let totalMembers = 0;
  
  for (const crew of crews) {
    if (crew.status !== "active") continue;
    
    const crewShiftStart = crew.shift_start_time;
    const crewShiftEnd = crew.shift_end_time;
    
    const shiftMatch = 
      (crewShiftStart === shift.start_time && crewShiftEnd === shift.end_time) ||
      (crew.name && shift.name && crew.name.toLowerCase().includes(shift.name.toLowerCase().split(" ")[0]));
    
    if (!shiftMatch) continue;
    
    if (crew.schedule_pattern && crew.schedule_pattern.length > 0 && crew.schedule_pattern_start_date) {
      const patternStart = new Date(crew.schedule_pattern_start_date);
      const daysSinceStart = Math.floor((today - patternStart) / 86400000);
      const totalPatternDays = crew.schedule_pattern.length * 7;
      const dayInPattern = ((daysSinceStart % totalPatternDays) + totalPatternDays) % totalPatternDays;
      const weekIndex = Math.floor(dayInPattern / 7);
      
      const week = crew.schedule_pattern[weekIndex];
      if (week && !week[dayIndex]) continue;
    }
    
    totalMembers += (crew.members || []).length;
  }
  
  return totalMembers;
}

export default function ShiftGoalBanner({ 
  employee, 
  session, 
  siteSettings, 
  crews,
  quotas,
  completedToday = 0,
  totalTasksForDay = 0,
  allOrgTasks = []
}) {
  const [dismissed, setDismissed] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const settings = siteSettings;
  const shifts = settings?.shifts || [];
  const currentShift = getCurrentShift(shifts);
  const minutesIntoShift = currentShift ? getMinutesIntoShift(currentShift) : 0;
  const twoHoursPassed = minutesIntoShift >= 120;
  
  // Calculate shift target from the auto-calculated completion_target_settings
  // This uses the same performanceCalculations module the manager sees
  const autoShiftTarget = useMemo(() => {
    if (!allOrgTasks || allOrgTasks.length === 0 || !settings) return 0;
    const expected = calculateExpectedTasks({ tasks: allOrgTasks, siteSettings: settings });
    return expected.shift || 0;
  }, [allOrgTasks, settings]);
  
  // Calculate individual shift goal from quotas (legacy manual system)
  const quotaGoal = useMemo(() => {
    if (!quotas || Object.keys(quotas).length === 0) return 0;
    let total = 0;
    Object.entries(quotas).forEach(([freq, count]) => {
      const num = Number(count) || 0;
      if (num > 0) total += num;
    });
    return total;
  }, [quotas]);
  
  // Priority: role-specific quotas (from RoleConfig) > auto-calculated shift target > assigned task count
  // Role quotas are the most precise since they're set per-role by the manager
  const individualGoal = quotaGoal > 0 
    ? quotaGoal 
    : autoShiftTarget > 0 
      ? autoShiftTarget 
      : totalTasksForDay;
  
  // Get expected crew size for this shift (for the team context display)
  const expectedTeamSize = useMemo(() => {
    return getExpectedCrewSize(crews, currentShift);
  }, [crews, currentShift]);
  
  // Fetch today's active sessions to see who's actually on shift
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: todaySessions = [] } = useQuery({
    queryKey: ["shift_sessions_today", employee?.organization_id, today],
    queryFn: () => EmployeeSessionRepo.filter({ 
      organization_id: employee?.organization_id,
      session_date: today
    }),
    enabled: !!employee?.organization_id,
    refetchInterval: 120000
  });
  
  // Count active sessions for this shift
  const activeCount = useMemo(() => {
    if (!currentShift) return 0;
    return todaySessions.filter(s => {
      if (s.status !== "active") return false;
      if (s.shift_id === currentShift.id) return true;
      if (s.shift_name && currentShift.name && 
          s.shift_name.toLowerCase() === currentShift.name.toLowerCase()) return true;
      return false;
    }).length;
  }, [todaySessions, currentShift]);
  
  const teamSize = twoHoursPassed ? Math.max(1, activeCount) : Math.max(1, expectedTeamSize || activeCount);
  
  const isSomeonesMissing = twoHoursPassed && expectedTeamSize > 0 && activeCount < expectedTeamSize;
  const missingCount = expectedTeamSize - activeCount;
  
  // Check if alert was already dismissed for this shift
  useEffect(() => {
    if (!currentShift) return;
    const key = `shift_alert_dismissed_${employee?.id}_${today}_${currentShift.id}`;
    if (localStorage.getItem(key)) {
      setAlertDismissed(true);
    }
  }, [currentShift, employee?.id, today]);
  
  const handleDismissAlert = () => {
    setAlertDismissed(true);
    if (currentShift) {
      const key = `shift_alert_dismissed_${employee?.id}_${today}_${currentShift.id}`;
      localStorage.setItem(key, "true");
    }
  };
  
  if (individualGoal === 0 || dismissed || !currentShift) return null;
  
  const progressPercent = individualGoal > 0 ? Math.min(100, Math.round((completedToday / individualGoal) * 100)) : 0;
  const isGoalMet = completedToday >= individualGoal;

  return (
    <div className="space-y-2">
      {/* Missing employees alert */}
      {isSomeonesMissing && !alertDismissed && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900 text-sm">Team Update</p>
              <p className="text-amber-800 text-xs mt-0.5">
                {missingCount} team member{missingCount !== 1 ? "s" : ""} {missingCount !== 1 ? "haven't" : "hasn't"} started yet.
              </p>
            </div>
            <button onClick={handleDismissAlert} className="p-1 text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main goal banner */}
      <div 
        className={cn(
          "bg-white border rounded-2xl shadow-sm overflow-hidden transition-all",
          isGoalMet ? "border-emerald-200" : "border-slate-200"
        )}
      >
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center gap-3 text-left"
        >
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
            isGoalMet ? "bg-emerald-100" : "bg-blue-100"
          )}>
            <Target className={cn("w-5 h-5", isGoalMet ? "text-emerald-600" : "text-blue-600")} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900 text-sm">Your Goal</p>
              {isGoalMet && (
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">Done!</Badge>
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={cn(
                "text-2xl font-bold",
                isGoalMet ? "text-emerald-600" : "text-slate-900"
              )}>
                {completedToday}
              </span>
              <span className="text-lg text-slate-400 font-medium">/ {individualGoal}</span>
              <span className="text-xs text-slate-400 ml-1">tasks</span>
            </div>
          </div>
          
          {/* Mini progress ring */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <circle 
                cx="24" cy="24" r="20" fill="none" 
                stroke={isGoalMet ? "#10b981" : "#3b82f6"} 
                strokeWidth="4"
                strokeDasharray={`${progressPercent * 1.257} 125.7`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-700">{progressPercent}%</span>
            </div>
          </div>
          
          <ChevronDown className={cn(
            "w-4 h-4 text-slate-400 transition-transform flex-shrink-0",
            expanded && "rotate-180"
          )} />
        </button>
        
        {/* Expanded details */}
        {expanded && (
          <div className="px-4 pb-4 pt-0 border-t border-slate-100">
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center mx-auto mb-1">
                  <Target className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <p className="text-lg font-bold text-slate-900">{individualGoal}</p>
                <p className="text-[10px] text-slate-500">Your Target</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center mx-auto mb-1">
                  <Users className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <p className="text-lg font-bold text-slate-900">{teamSize}</p>
                <p className="text-[10px] text-slate-500">
                  {twoHoursPassed ? "Active Now" : "On Shift"}
                </p>
              </div>
              <div className={cn(
                "rounded-xl p-3 text-center",
                isGoalMet ? "bg-emerald-50" : "bg-blue-50"
              )}>
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1",
                  isGoalMet ? "bg-emerald-200" : "bg-blue-200"
                )}>
                  <User className={cn("w-3.5 h-3.5", isGoalMet ? "text-emerald-600" : "text-blue-600")} />
                </div>
                <p className={cn("text-lg font-bold", isGoalMet ? "text-emerald-600" : "text-blue-600")}>
                  {completedToday}
                </p>
                <p className="text-[10px] text-slate-500">Completed</p>
              </div>
            </div>
            {quotaGoal > 0 && (
              <div className="mt-3 space-y-1">
                {Object.entries(quotas || {}).filter(([, v]) => Number(v) > 0).map(([freq, count]) => (
                  <div key={freq} className="flex justify-between text-xs text-slate-500">
                    <span className="capitalize">{freq} quota</span>
                    <span className="font-medium text-slate-700">{count} tasks</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}