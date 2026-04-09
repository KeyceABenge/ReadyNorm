/**
 * MSS completion calculation utilities for the Executive Command Center.
 * Computes completion percentage of recurring tasks within a given date range.
 */

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function normFreq(f) {
  if (!f) return "other";
  const l = f.toLowerCase().trim().replace(/[-_\s]+/g, "");
  if (l === "daily") return "daily";
  if (l === "weekly") return "weekly";
  if (l === "biweekly") return "biweekly";
  if (l === "monthly") return "monthly";
  if (l === "bimonthly") return "bimonthly";
  if (l === "quarterly") return "quarterly";
  if (l === "annually" || l === "annual") return "annually";
  return "other";
}

/**
 * Returns the current week range (Sunday to Saturday).
 */
export function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Compute MSS completion for a set of tasks within a date range.
 * Returns { completed, scheduled, rate, byFrequency }
 */
export function computeMSSCompletion(tasks, weekStart, weekEnd) {
  if (!tasks || tasks.length === 0) {
    return { completed: 0, scheduled: 0, rate: 0, byFrequency: {} };
  }

  // Only recurring, non-group tasks
  const mssTasks = tasks.filter(t => !t.is_group && t.is_recurring !== false);

  // Build master set by frequency (deduplicate by title+area)
  const mastersByFreq = {};
  mssTasks.forEach(t => {
    const freq = normFreq(t.frequency);
    if (freq === "other") return;
    if (!mastersByFreq[freq]) mastersByFreq[freq] = new Map();
    const key = `${(t.title || "").toLowerCase().trim()}||${(t.area || "").toLowerCase().trim()}`;
    if (!mastersByFreq[freq].has(key)) {
      mastersByFreq[freq].set(key, { title: t.title, area: t.area, days_of_week: t.days_of_week });
    }
  });

  // Calculate expected per frequency
  let totalExpected = 0;
  const byFrequency = {};

  Object.entries(mastersByFreq).forEach(([freq, masterMap]) => {
    const masters = Array.from(masterMap.values());
    let expected = 0;

    if (freq === "daily") {
      const d = new Date(weekStart);
      while (d <= weekEnd) {
        masters.forEach(m => {
          const days = m.days_of_week;
          const dow = d.getDay();
          if (!days || days.length === 0) {
            if (dow >= 1 && dow <= 5) expected++;
          } else if (days.includes(DAY_NAMES[dow])) {
            expected++;
          }
        });
        d.setDate(d.getDate() + 1);
      }
    } else {
      const msPerDay = 86400000;
      const daysInRange = Math.round((weekEnd - weekStart) / msPerDay) + 1;
      const cycleDays = { weekly: 7, biweekly: 14, monthly: 30, bimonthly: 60, quarterly: 91, annually: 365 }[freq] || 7;
      expected = Math.round((masters.length * daysInRange) / cycleDays);
    }

    // Count completed in range
    const completed = mssTasks.filter(t => {
      if (normFreq(t.frequency) !== freq) return false;
      if (t.status !== "completed" && t.status !== "verified") return false;
      const dateStr = t.completed_at || t.due_date;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= weekStart && d <= weekEnd;
    }).length;

    byFrequency[freq] = {
      masters: masters.length,
      expected,
      completed,
      rate: expected > 0 ? Math.min(Math.round((completed / expected) * 100), 100) : 0,
    };
    totalExpected += expected;
  });

  const totalCompleted = Object.values(byFrequency).reduce((s, f) => s + f.completed, 0);
  const totalMasters = Object.values(byFrequency).reduce((s, f) => s + f.masters, 0);
  const rate = totalExpected > 0 ? Math.min(Math.round((totalCompleted / totalExpected) * 100), 100) : 0;

  return { completed: totalCompleted, scheduled: totalExpected, rate, masters: totalMasters, byFrequency };
}