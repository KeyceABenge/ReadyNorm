import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear, parseISO, isWithinInterval } from "date-fns";
import {
  getFiscalYear,
  getFiscalYearStart,
  getFiscalWeek,
  generateFiscalWeeks,
} from "@/lib/fiscalCalendar";

/**
 * POOL-DRIVEN PERFORMANCE CALCULATIONS
 * 
 * The system auto-calculates targets from the actual task pool:
 * 
 *   1. Count unique task templates per frequency (deduplicated by title+area)
 *   2. Read working_days (e.g., M-F = 5) and shifts_per_day (e.g., 2) from settings
 *   3. For daily tasks, read reset_times from frequency_settings.daily to determine
 *      how many times per day the pool regenerates (dailyResetsPerDay).
 *      - If resets >= shifts → each shift gets the FULL pool (no splitting)
 *      - Per day = pool × dailyResetsPerDay (not × shiftsPerDay)
 *   4. For non-daily tasks:
 *      - Per shift = pool / (cycle_days × shifts_per_day)
 *      - Per day = per_shift × shifts_per_day
 *   5. 100% means every task in every pool gets completed within its cycle
 * 
 * Example: 40 daily tasks, 2 reset times (05:00 + 17:00), 2 shifts
 *   → per shift = 40 (full pool, tasks reset between shifts)
 *   → per day   = 40 × 2 resets = 80 (both shifts each complete the full pool)
 */

// ─── NORMALIZER ───────────────────────────────────────────────────
function normalizeFrequency(f) {
  if (!f) return "other";
  const lower = f.toLowerCase().trim().replace(/[-_\s]+/g, "");
  if (lower === "daily") return "daily";
  if (lower === "weekly") return "weekly";
  if (lower === "biweekly") return "biweekly";
  if (lower === "monthly") return "monthly";
  if (lower === "bimonthly") return "bimonthly";
  if (lower === "quarterly") return "quarterly";
  if (lower === "annually" || lower === "annual") return "annually";
  return "other";
}

// ─── SETTINGS HELPERS ─────────────────────────────────────────────
const DEFAULT_CYCLE_DAYS = {
  weekly: 5,
  biweekly: 10,
  monthly: 20,
  bimonthly: 40,
  quarterly: 60,
  annually: 250
};

function getTargetSettings(siteSettings) {
  const s = siteSettings || {};
  const cts = s.completion_target_settings || {};
  const workingDays = cts.working_days || ["monday", "tuesday", "wednesday", "thursday", "friday"];
  // shifts_per_day: prefer explicit setting, default 2
  const shiftsPerDay = cts.shifts_per_day || 2;
  const cycleDays = { ...DEFAULT_CYCLE_DAYS, ...(cts.cycle_days || {}) };
  
  // How many times per day do daily tasks regenerate?
  // Based on the number of reset times configured for daily frequency
  const freqSettings = s.frequency_settings || {};
  const dailyResets = (freqSettings.daily?.reset_times || []).length;
  const dailyResetsPerDay = Math.max(1, dailyResets);
  
  return { workingDays, wdCount: workingDays.length, shiftsPerDay, cycleDays, dailyResetsPerDay };
}

// ─── POOL COUNTING ────────────────────────────────────────────────
function countUniqueTaskPool(tasks) {
  // Count unique task templates by title+frequency+area across all statuses.
  // This represents the full master task list for the facility.
  const poolByFreq = {};
  const seen = new Set();
  tasks.filter(t => !t.is_group).forEach(t => {
    const f = normalizeFrequency(t.frequency);
    const key = `${(t.title || "").toLowerCase().trim()}|${f}|${(t.area || "").toLowerCase().trim()}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (!poolByFreq[f]) poolByFreq[f] = 0;
    poolByFreq[f]++;
  });
  return poolByFreq;
}

// ─── EXPECTED TASKS ───────────────────────────────────────────────
export function calculateExpectedTasks({ tasks, siteSettings }) {
  const { wdCount, shiftsPerDay, cycleDays, dailyResetsPerDay } = getTargetSettings(siteSettings);
  const poolByFreq = countUniqueTaskPool(tasks);
  
  const NON_DAILY = ["weekly", "biweekly", "monthly", "bimonthly", "quarterly", "annually"];
  
  // ── Manual quota overrides (from the Quotas tab) ──
  const manualQuotas = {};
  Object.entries((siteSettings || {}).task_quotas || {}).forEach(([key, val]) => {
    const nk = normalizeFrequency(key);
    const numVal = Number(val) || 0;
    if (numVal > 0) manualQuotas[nk] = Math.max(manualQuotas[nk] || 0, numVal);
  });

  // ── Per-shift targets ──
  const dailyPool = poolByFreq.daily || 0;
  // Daily tasks regenerate once per reset time. If resets >= shifts, each shift
  // gets the FULL pool (tasks reset between shifts — no splitting needed).
  // If there are more shifts than resets, remaining shifts share the remainder.
  const dailyPerShift = dailyResetsPerDay >= shiftsPerDay
    ? dailyPool
    : Math.ceil(dailyPool / Math.ceil(shiftsPerDay / dailyResetsPerDay));
  
  const perShiftByFreq = { daily: dailyPerShift };
  NON_DAILY.forEach(f => {
    const pool = poolByFreq[f] || 0;
    if (pool === 0) { perShiftByFreq[f] = 0; return; }
    
    // If manager set a manual quota override, use it (capped at pool size)
    if (manualQuotas[f]) {
      perShiftByFreq[f] = Math.min(manualQuotas[f], pool);
      return;
    }
    
    // Auto-calculate: pool / (cycle_days × shifts_per_day)
    const cd = cycleDays[f] || DEFAULT_CYCLE_DAYS[f] || 20;
    perShiftByFreq[f] = Math.ceil(pool / (cd * shiftsPerDay));
  });
  
  const perShift = Object.values(perShiftByFreq).reduce((s, v) => s + v, 0);
  // perDay for daily tasks = pool × how many times it regenerates today.
  // For non-daily tasks = per-shift × shifts-per-day (spread across the day).
  const dailyPerDay = dailyPool * dailyResetsPerDay;
  const nonDailyPerDay = NON_DAILY.reduce((s, f) => s + (perShiftByFreq[f] || 0), 0) * shiftsPerDay;
  const perDay = dailyPerDay + nonDailyPerDay;
  
  // ── Period targets ──
  // The goal: 100% = every task in every pool completed within its cycle.
  // For periods shorter than a cycle, we prorate.
  // For periods longer than a cycle, tasks regenerate so we multiply by cycles.
  
  const calcPeriod = (periodWorkingDays) => {
    let total = 0;
    // Daily: tasks regenerate dailyResetsPerDay times per day, each producing the full pool
    total += dailyPool * dailyResetsPerDay * periodWorkingDays;
    
    NON_DAILY.forEach(f => {
      const pool = poolByFreq[f] || 0;
      if (pool === 0) return;
      const cd = cycleDays[f] || DEFAULT_CYCLE_DAYS[f] || 20;
      // How many full cycles fit in this period?
      const cyclesInPeriod = periodWorkingDays / cd;
      // Target = pool × cycles (each cycle, the full pool should be completed)
      total += Math.round(pool * cyclesInPeriod);
    });
    
    return Math.round(total);
  };
  
  const perWeek = calcPeriod(wdCount);         // 1 week of working days
  const perMonth = calcPeriod(wdCount * 4);     // ~4 weeks
  const perQuarter = calcPeriod(wdCount * 13);  // ~13 weeks
  const perYear = calcPeriod(wdCount * 52);     // ~52 weeks

  return {
    shift: perShift,
    day: perDay,
    week: perWeek,
    month: perMonth,
    quarter: perQuarter,
    year: perYear,
    weekTasks: perWeek,
    weekCleanings: 0,
    shiftsPerDay,
    perShiftByFreq,
    poolByFreq,
    wdCount
  };
}

// ─── FISCAL PERIOD HELPERS ─────────────────────────────────────────
/**
 * Find the custom tracking period that contains the given date.
 * Returns { start: Date, end: Date } or null.
 */
function findCurrentCustomPeriod(fiscalSettings, date) {
  const periods = fiscalSettings?.tracking_periods || [];
  const fyStartMonth = fiscalSettings?.fiscal_year_start_month || 1;
  const fyStartDay = fiscalSettings?.fiscal_year_start_day || 1;
  const currentYear = date.getFullYear();

  let fyStartDate = new Date(currentYear, fyStartMonth - 1, fyStartDay);
  if (date < fyStartDate) {
    fyStartDate = new Date(currentYear - 1, fyStartMonth - 1, fyStartDay);
  }

  for (const p of periods) {
    const startYear = p.start_month < fyStartMonth ? fyStartDate.getFullYear() + 1 : fyStartDate.getFullYear();
    const endYear = p.end_month < fyStartMonth ? fyStartDate.getFullYear() + 1 : fyStartDate.getFullYear();
    const pStart = new Date(startYear, p.start_month - 1, p.start_day);
    const pEnd = new Date(endYear, p.end_month - 1, p.end_day, 23, 59, 59);
    if (date >= pStart && date <= pEnd) {
      return { start: pStart, end: pEnd };
    }
  }
  return null;
}

// ─── PERFORMANCE SCORES ───────────────────────────────────────────
export function calculatePerformanceScores({ tasks, areaSignOffs, siteSettings }) {
  const now = new Date();
  const settings = siteSettings || {};
  const expected = calculateExpectedTasks({ tasks, siteSettings });

  const getDateRange = (period) => {
    let start, end;
    const fiscalSettings = settings.fiscal_year_settings || {};
    const fiscalMode = fiscalSettings.fiscal_calendar_mode;

    switch (period) {
      case "shift": {
        const shifts = settings.shifts || [
          { start_time: "05:00", end_time: "17:00" },
          { start_time: "17:00", end_time: "05:00" }
        ];
        const mins = now.getHours() * 60 + now.getMinutes();
        let matchedShift = null;
        for (const shift of shifts) {
          const [sH, sM] = (shift.start_time || "05:00").split(":").map(Number);
          const [eH, eM] = (shift.end_time || "17:00").split(":").map(Number);
          const startMin = sH * 60 + sM;
          const endMin = eH * 60 + eM;
          if (endMin > startMin) {
            if (mins >= startMin && mins < endMin) { matchedShift = shift; break; }
          } else {
            if (mins >= startMin || mins < endMin) { matchedShift = shift; break; }
          }
        }
        if (!matchedShift) matchedShift = shifts[0] || { start_time: "05:00", end_time: "17:00" };
        const [sH, sM] = (matchedShift.start_time || "05:00").split(":").map(Number);
        const [eH, eM] = (matchedShift.end_time || "17:00").split(":").map(Number);
        start = new Date(now); start.setHours(sH, sM, 0, 0);
        end = new Date(now); end.setHours(eH, eM, 0, 0);
        if (end <= start) {
          if (mins < eH * 60 + eM) start.setDate(start.getDate() - 1);
          else end.setDate(end.getDate() + 1);
        }
        break;
      }
      case "day": start = startOfDay(now); end = endOfDay(now); break;
      case "week": {
        // Use fiscal week boundaries when configured
        if (fiscalMode === "weekly_october" || !fiscalMode || fiscalMode === "") {
          const { weekStart, weekEnd } = getFiscalWeek(now);
          start = weekStart;
          end = endOfDay(now); // through current moment, not full week end
        } else if (fiscalMode === "custom" && fiscalSettings.tracking_periods?.length > 0) {
          // Find the custom period the current date falls within
          const match = findCurrentCustomPeriod(fiscalSettings, now);
          if (match) {
            start = match.start;
            end = endOfDay(now);
          } else {
            start = startOfWeek(now, { weekStartsOn: 0 }); // fallback: Sun-Sat
            end = endOfDay(now);
          }
        } else {
          start = startOfWeek(now, { weekStartsOn: 0 });
          end = endOfDay(now);
        }
        break;
      }
      case "month": {
        if (fiscalMode === "weekly_october" || !fiscalMode || fiscalMode === "") {
          // Fiscal month = 4 or 5 fiscal weeks (13-week quarters / ~4.3 weeks per month)
          // Use the current fiscal quarter's month grouping
          const fy = getFiscalYear(now);
          const fyStart = getFiscalYearStart(fy);
          const weeks = generateFiscalWeeks(fy);
          const { fiscalWeek } = getFiscalWeek(now);
          // Group into 4-week "months" within the fiscal year
          const monthIdx = Math.floor((fiscalWeek - 1) / 4);
          const monthStartWeek = monthIdx * 4; // 0-indexed
          const monthWeeks = weeks.slice(monthStartWeek, monthStartWeek + 4);
          if (monthWeeks.length > 0) {
            start = monthWeeks[0].start;
            end = endOfDay(now);
          } else {
            start = startOfMonth(now);
            end = endOfDay(now);
          }
        } else {
          start = startOfMonth(now);
          end = endOfDay(now);
        }
        break;
      }
      case "quarter": {
        if (fiscalMode === "weekly_october" || !fiscalMode || fiscalMode === "") {
          const fy = getFiscalYear(now);
          const weeks = generateFiscalWeeks(fy);
          const { fiscalWeek } = getFiscalWeek(now);
          const qIdx = Math.floor((fiscalWeek - 1) / 13);
          const qWeeks = weeks.slice(qIdx * 13, (qIdx + 1) * 13);
          if (qWeeks.length > 0) {
            start = qWeeks[0].start;
            end = endOfDay(now);
          } else {
            start = startOfQuarter(now);
            end = endOfDay(now);
          }
        } else if (fiscalMode === "custom" && fiscalSettings.tracking_periods?.length > 0) {
          const match = findCurrentCustomPeriod(fiscalSettings, now);
          if (match) {
            start = match.start;
            end = endOfDay(now);
          } else {
            start = startOfQuarter(now);
            end = endOfDay(now);
          }
        } else {
          start = startOfQuarter(now);
          end = endOfDay(now);
        }
        break;
      }
      case "year": {
        if (fiscalMode === "weekly_october" || !fiscalMode || fiscalMode === "") {
          const fy = getFiscalYear(now);
          start = getFiscalYearStart(fy);
          end = endOfDay(now);
        } else if (fiscalMode === "custom" && fiscalSettings.fiscal_year_start_month) {
          const fyStartMonth = fiscalSettings.fiscal_year_start_month;
          const fyStartDay = fiscalSettings.fiscal_year_start_day || 1;
          let fyStart = new Date(now.getFullYear(), fyStartMonth - 1, fyStartDay);
          if (now < fyStart) fyStart = new Date(now.getFullYear() - 1, fyStartMonth - 1, fyStartDay);
          start = fyStart;
          end = endOfDay(now);
        } else {
          start = startOfYear(now);
          end = endOfDay(now);
        }
        break;
      }
      default: {
        if (fiscalMode === "weekly_october" || !fiscalMode || fiscalMode === "") {
          const { weekStart } = getFiscalWeek(now);
          start = weekStart;
        } else {
          start = startOfWeek(now, { weekStartsOn: 0 });
        }
        end = endOfDay(now);
      }
    }
    return { start, end };
  };

  const countCompleted = (period) => {
    const { start, end } = getDateRange(period);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return { tasksCompleted: 0, cleaningsCompleted: 0 };

    // Count unique completed tasks (deduplicated by title+frequency+area per date)
    const completedKeys = new Set();
    tasks.forEach(t => {
      if (t.is_group) return;
      if (t.status !== "completed" && t.status !== "verified") return;
      if (!t.completed_at) return;
      try {
        const d = parseISO(t.completed_at);
        if (isNaN(d.getTime())) return;
        if (!isWithinInterval(d, { start, end })) return;
        const dateKey = d.toISOString().split("T")[0];
        const f = normalizeFrequency(t.frequency);
        const key = `${(t.title || "").toLowerCase().trim()}|${f}|${(t.area || "").toLowerCase().trim()}|${dateKey}`;
        completedKeys.add(key);
      } catch { /* skip */ }
    });

    const cleaningsCompleted = areaSignOffs.filter(s => {
      if (s.status !== "passed_inspection") return false;
      if (!s.signed_off_at) return false;
      try {
        const d = parseISO(s.signed_off_at);
        if (isNaN(d.getTime())) return false;
        return isWithinInterval(d, { start, end });
      } catch { return false; }
    }).length;

    return { tasksCompleted: completedKeys.size, cleaningsCompleted };
  };

  const buildPeriodData = (period) => {
    const { tasksCompleted, cleaningsCompleted } = countCompleted(period);
    const totalCompleted = tasksCompleted + cleaningsCompleted;
    const expectedTotal = expected[period] || 0;
    const score = expectedTotal > 0 ? Math.min(100, Math.round((totalCompleted / expectedTotal) * 100)) : 0;
    return { score, completed: totalCompleted, total: expectedTotal, tasksCompleted, cleaningsCompleted };
  };

  const shiftData = buildPeriodData("shift");
  const dayData = buildPeriodData("day");
  const weekData = buildPeriodData("week");
  const monthData = buildPeriodData("month");
  const quarterData = buildPeriodData("quarter");
  const yearData = buildPeriodData("year");

  const weekCleaningsTotal = (() => {
    const uniqueAreas = new Set();
    areaSignOffs.forEach(s => {
      if (s.area_id) uniqueAreas.add(s.area_id);
      else if (s.production_line_id) uniqueAreas.add(s.production_line_id);
    });
    return Math.max(uniqueAreas.size * 5, weekData.cleaningsCompleted);
  })();

  return {
    shift: shiftData.score, shiftCompleted: shiftData.completed, shiftTotal: shiftData.total,
    day: dayData.score, dayCompleted: dayData.completed, dayTotal: dayData.total,
    week: weekData.score, weekCompleted: weekData.completed, weekTotal: weekData.total,
    month: monthData.score, monthCompleted: monthData.completed, monthTotal: monthData.total,
    quarter: quarterData.score, quarterCompleted: quarterData.completed, quarterTotal: quarterData.total,
    year: yearData.score, yearCompleted: yearData.completed, yearTotal: yearData.total,
    tasksCompleted: weekData.tasksCompleted, tasksTotal: expected.weekTasks || 0,
    cleaningsCompleted: weekData.cleaningsCompleted, cleaningsTotal: weekCleaningsTotal
  };
}