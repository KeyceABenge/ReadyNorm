import { useEffect } from "react";
import { EmployeeSessionRepo, TaskRepo } from "@/lib/adapters/database";
import { parseISO, differenceInMinutes, format } from "date-fns";

/**
 * Shift Session Engine - Handles automatic shift inference and session management
 * 
 * Features:
 * - Infers active shift based on current time and manager-defined shift windows
 * - Creates or resumes shift sessions automatically
 * - Tracks last activity for idle detection
 * - Auto-ends sessions based on shift end + grace period + idle time
 * - Reopens incomplete tasks when session auto-ends
 */

// Parse time string (HH:MM) to minutes since midnight
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// Get current time in minutes since midnight
export const getCurrentTimeMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

// Check if current time is within a shift window (including buffers)
export const isWithinShiftWindow = (shift, currentMinutes) => {
  const startMinutes = parseTimeToMinutes(shift.start_time);
  const endMinutes = parseTimeToMinutes(shift.end_time);
  const bufferBefore = shift.buffer_before_minutes || 30;
  const bufferAfter = shift.buffer_after_minutes || 30;
  
  const windowStart = startMinutes - bufferBefore;
  const windowEnd = endMinutes + bufferAfter;
  
  // Handle overnight shifts (e.g., 17:00 - 05:00)
  if (endMinutes < startMinutes) {
    // Shift crosses midnight
    return currentMinutes >= windowStart || currentMinutes <= windowEnd;
  }
  
  return currentMinutes >= windowStart && currentMinutes <= windowEnd;
};

// Infer the active shift based on current time
export const inferActiveShift = (shifts) => {
  if (!shifts || shifts.length === 0) {
    // Default shifts if none configured
    return {
      id: "default",
      name: "Default Shift",
      start_time: "00:00",
      end_time: "23:59",
      buffer_before_minutes: 0,
      buffer_after_minutes: 0
    };
  }
  
  const currentMinutes = getCurrentTimeMinutes();
  
  // Find the shift that matches current time
  for (const shift of shifts) {
    if (isWithinShiftWindow(shift, currentMinutes)) {
      return shift;
    }
  }
  
  // If no shift matches, return the closest upcoming shift
  let closestShift = shifts[0];
  let minDistance = Infinity;
  
  for (const shift of shifts) {
    const startMinutes = parseTimeToMinutes(shift.start_time);
    let distance = startMinutes - currentMinutes;
    if (distance < 0) distance += 1440; // Add 24 hours if in the past today
    
    if (distance < minDistance) {
      minDistance = distance;
      closestShift = shift;
    }
  }
  
  return closestShift;
};

// Check if a session should be auto-ended
// IMPORTANT: Auto-end only applies AFTER the shift has ended + grace period.
// The idle threshold measures inactivity AFTER that point — NOT during the shift.
// Employees may clean for hours without using the app, then return to sign off.
// We never prematurely end a session during or shortly after a shift.
export const shouldAutoEndSession = (session, settings, currentTime = new Date()) => {
  if (!session || session.status !== "active") return { shouldEnd: false };
  if (!settings?.enabled) return { shouldEnd: false };
  
  const gracePeriod = settings.grace_period_minutes || 60;
  const idleThreshold = settings.idle_threshold_minutes || 30;
  
  // Calculate shift end time for today
  const sessionDate = session.session_date;
  const shiftEnd = session.shift_end || "23:59";
  const [endHours, endMinutes] = shiftEnd.split(":").map(Number);
  
  let shiftEndDate = new Date(sessionDate);
  shiftEndDate.setHours(endHours, endMinutes, 0, 0);
  
  // Handle overnight shifts - if shift end is before shift start, it's next day
  if (session.shift_start) {
    const [startHours] = session.shift_start.split(":").map(Number);
    if (endHours < startHours) {
      shiftEndDate.setDate(shiftEndDate.getDate() + 1);
    }
  }
  
  // Add grace period — this is the earliest we even consider auto-ending
  const autoEndThreshold = new Date(shiftEndDate.getTime() + gracePeriod * 60 * 1000);
  
  // If we haven't passed shift end + grace period, never auto-end
  if (currentTime < autoEndThreshold) {
    return { shouldEnd: false, reason: "within_grace_period" };
  }
  
  // We are now past shift end + grace period.
  // Check if the employee has been active SINCE the shift ended.
  // The idle timer starts from whichever is LATER:
  //   - the shift end + grace period threshold (autoEndThreshold)
  //   - the employee's last activity
  // This ensures employees who were cleaning (not using the app) during their shift
  // are not immediately auto-ended just because their last app interaction was hours ago.
  const lastActivity = session.last_activity_at ? parseISO(session.last_activity_at) : parseISO(session.start_time);
  const idleStartTime = lastActivity > autoEndThreshold ? lastActivity : autoEndThreshold;
  const idleMinutes = differenceInMinutes(currentTime, idleStartTime);
  
  // Also compute raw idle from last activity for display purposes
  const rawIdleMinutes = differenceInMinutes(currentTime, lastActivity);
  
  if (idleMinutes < idleThreshold) {
    return { shouldEnd: false, reason: "still_active", idleMinutes: rawIdleMinutes };
  }
  
  return {
    shouldEnd: true,
    reason: "auto_idle",
    idleMinutes: rawIdleMinutes,
    shiftEndedAt: shiftEndDate
  };
};

// Infer shift from employee's crew data if available
export const inferShiftFromCrew = (employee, crews) => {
  if (!crews || !employee) return null;
  const crew = crews.find(c => c.members?.includes(employee.email) && c.status === "active");
  if (!crew || !crew.shift_start_time || !crew.shift_end_time) return null;
  return {
    id: `crew_${crew.id}`,
    name: crew.name,
    start_time: crew.shift_start_time,
    end_time: crew.shift_end_time,
    buffer_before_minutes: 30,
    buffer_after_minutes: 30
  };
};

// Check if today is a work day for this employee based on crew schedule pattern
export const isCrewWorkDay = (employee, crews) => {
  if (!crews || !employee) return true; // default to work day
  const crew = crews.find(c => c.members?.includes(employee.email) && c.status === "active");
  if (!crew?.schedule_pattern?.length || !crew.schedule_pattern_start_date) return true;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const patternStart = new Date(crew.schedule_pattern_start_date + "T00:00:00");
  const daysSince = Math.floor((today.getTime() - patternStart.getTime()) / (1000 * 60 * 60 * 24));
  const totalPatternDays = crew.schedule_pattern.length * 7;
  const dayInPattern = ((daysSince % totalPatternDays) + totalPatternDays) % totalPatternDays;
  const weekIdx = Math.floor(dayInPattern / 7);
  const dayIdx = today.getDay(); // 0=Sun
  
  return crew.schedule_pattern[weekIdx]?.[dayIdx] ?? true;
};

// Find or create session for current shift
export const findOrCreateShiftSession = async (employee, organization, siteSettings, crews) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const shifts = siteSettings?.shifts || [];
  
  // Try crew-specific shift first, fall back to site-wide shifts
  const crewShift = inferShiftFromCrew(employee, crews);
  const activeShift = crewShift || inferActiveShift(shifts);
  
  // Look for existing active session for this shift
  const existingSessions = await EmployeeSessionRepo.filter({
    organization_id: organization.id,
    employee_id: employee.id,
    session_date: today,
    shift_id: activeShift.id,
    status: "active"
  });
  
  if (existingSessions.length > 0) {
    // Resume existing session - update last activity
    const session = existingSessions[0];
    await EmployeeSessionRepo.update(session.id, {
      last_activity_at: new Date().toISOString()
    });
    return { session, isNew: false, shift: activeShift };
  }
  
  // Check for any ended sessions for this shift today (already completed)
  const endedSessions = await EmployeeSessionRepo.filter({
    organization_id: organization.id,
    employee_id: employee.id,
    session_date: today,
    shift_id: activeShift.id
  });
  
  const hasEndedSession = endedSessions.some(s => s.status === "ended" || s.status === "auto_ended");
  
  // Create new session for this shift
  const newSession = await EmployeeSessionRepo.create({
    organization_id: organization.id,
    employee_id: employee.id,
    employee_email: employee.email,
    employee_name: employee.name,
    session_date: today,
    shift_id: activeShift.id,
    shift_name: activeShift.name,
    shift_start: activeShift.start_time,
    shift_end: activeShift.end_time,
    start_time: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
    status: "active",
    selected_tasks: [],
    completed_tasks: [],
    reopened_tasks: [],
    task_selection_completed: false,
    tasks_selected_count: 0,
    tasks_completed_count: 0,
    completion_rate: 0
  });
  
  return { 
    session: newSession, 
    isNew: true, 
    shift: activeShift,
    previousShiftEnded: hasEndedSession 
  };
};

// Auto-end a session and handle task reopening
// Queries ALL tasks assigned to the employee (not just selected_tasks) to ensure
// tasks added mid-shift via "Add Tasks" are also properly returned to the pool.
export const autoEndSession = async (session, settings, reason = "auto_idle") => {
  const completedTaskIds = session.completed_tasks || [];
  const selectedTasks = session.selected_tasks || [];
  
  // Fetch ALL tasks currently assigned to this employee in this org
  let allAssignedTasks = [];
  if (session.employee_email && session.organization_id) {
    try {
      allAssignedTasks = await TaskRepo.filter({
        organization_id: session.organization_id,
        assigned_to: session.employee_email
      });
    } catch (e) {
      console.error("Failed to fetch assigned tasks for auto-end:", e);
    }
  }
  
  // Find incomplete tasks — any assigned task that isn't completed/verified
  const incompleteTasks = allAssignedTasks
    .filter(t => t.status !== "completed" && t.status !== "verified")
    .map(t => t.id);
  
  // Reopen all incomplete tasks — they go back to the pool
  for (const taskId of incompleteTasks) {
    try {
      await TaskRepo.update(taskId, {
        assigned_to: null,
        assigned_to_name: null,
        status: "pending"
      });
    } catch (e) {
      console.error("Failed to reopen task:", taskId, e);
    }
  }
  
  // Calculate completion stats based on selected_tasks for tracking
  const tasksSelectedCount = selectedTasks.length;
  const tasksCompletedCount = completedTaskIds.length;
  const completionRate = tasksSelectedCount > 0 
    ? Math.round((tasksCompletedCount / tasksSelectedCount) * 100) 
    : 0;
  
  // Update session
  await EmployeeSessionRepo.update(session.id, {
    status: "auto_ended",
    end_time: new Date().toISOString(),
    end_reason: reason,
    reopened_tasks: incompleteTasks,
    tasks_selected_count: tasksSelectedCount,
    tasks_completed_count: tasksCompletedCount,
    completion_rate: completionRate
  });
  
  return { 
    reopenedTasks: incompleteTasks, 
    completionRate,
    tasksSelectedCount,
    tasksCompletedCount
  };
};

// Update session activity timestamp
export const updateSessionActivity = async (sessionId) => {
  try {
    await EmployeeSessionRepo.update(sessionId, {
      last_activity_at: new Date().toISOString()
    });
  } catch (e) {
    console.error("Failed to update session activity:", e);
  }
};

// Record task completion in session
export const recordTaskCompletion = async (session, taskId) => {
  const completedTasks = [...(session.completed_tasks || [])];
  if (!completedTasks.includes(taskId)) {
    completedTasks.push(taskId);
  }
  
  const tasksSelectedCount = (session.selected_tasks || []).length;
  const tasksCompletedCount = completedTasks.length;
  const completionRate = tasksSelectedCount > 0 
    ? Math.round((tasksCompletedCount / tasksSelectedCount) * 100) 
    : 0;
  
  await EmployeeSessionRepo.update(session.id, {
    completed_tasks: completedTasks,
    tasks_completed_count: tasksCompletedCount,
    completion_rate: completionRate,
    last_activity_at: new Date().toISOString()
  });
  
  return { completedTasks, tasksCompletedCount, completionRate };
};

// Hook for session activity tracking (debounced to prevent API flooding)
export const useSessionActivityTracker = (session, intervalMs = 60000) => {
  useEffect(() => {
    if (!session?.id || session.status !== "active") return;
    
    const interval = setInterval(() => {
      updateSessionActivity(session.id);
    }, intervalMs);
    
    // Debounce user interaction tracking — fire at most once per 30 seconds
    let lastActivityUpdate = 0;
    const DEBOUNCE_MS = 30000;
    
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityUpdate < DEBOUNCE_MS) return;
      lastActivityUpdate = now;
      updateSessionActivity(session.id);
    };
    
    window.addEventListener("click", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("keydown", handleActivity);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [session?.id, session?.status, intervalMs]);
};

export default {
  inferActiveShift,
  inferShiftFromCrew,
  isCrewWorkDay,
  findOrCreateShiftSession,
  shouldAutoEndSession,
  autoEndSession,
  updateSessionActivity,
  recordTaskCompletion,
  useSessionActivityTracker,
  parseTimeToMinutes,
  getCurrentTimeMinutes,
  isWithinShiftWindow
};