import { parseISO, startOfDay } from "date-fns";

export function isTaskOverdue(task) {
  if (!task.assigned_to) return false;
  if (task.status === "completed" || task.status === "verified") return false;
  
  const now = new Date();
  const freq = task.frequency?.toLowerCase() || "";
  
  if (freq.includes("daily") || (freq.includes("week") && !freq.includes("bi") && !freq.includes("2"))) {
    if (task.due_date) {
      try { return parseISO(task.due_date) < startOfDay(now); } catch { return false; }
    }
    return false;
  }
  
  if (task.cycle_start_date) {
    try {
      const cycleStart = parseISO(task.cycle_start_date);
      let cycleEnd;
      if (freq.includes("bi-week") || freq.includes("biweek") || freq.includes("2 week")) {
        cycleEnd = new Date(cycleStart); cycleEnd.setDate(cycleEnd.getDate() + 14);
      } else if (freq.includes("month") && !freq.includes("bi")) {
        cycleEnd = new Date(cycleStart); cycleEnd.setMonth(cycleEnd.getMonth() + 1);
      } else if (freq.includes("bimonth") || freq.includes("bi-month") || freq.includes("2 month")) {
        cycleEnd = new Date(cycleStart); cycleEnd.setMonth(cycleEnd.getMonth() + 2);
      } else if (freq.includes("quarter")) {
        cycleEnd = new Date(cycleStart); cycleEnd.setMonth(cycleEnd.getMonth() + 3);
      } else if (freq.includes("annual") || freq.includes("year")) {
        cycleEnd = new Date(cycleStart); cycleEnd.setFullYear(cycleEnd.getFullYear() + 1);
      } else {
        if (task.due_date) { cycleEnd = parseISO(task.due_date); } else { return false; }
      }
      return now > cycleEnd;
    } catch { return false; }
  }
  
  if (task.due_date) {
    try { return parseISO(task.due_date) < startOfDay(now); } catch { return false; }
  }
  return false;
}