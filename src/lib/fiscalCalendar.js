/**
 * Fiscal Calendar Utility
 * 
 * Supports a weekly-based fiscal year starting in October.
 * - Fiscal year named by ending year: FY2025 = Oct 1 2024 – Sep 30 2025
 * - Weeks run Sunday–Saturday
 * - Week 1 begins on the first Sunday on or before October 1
 * - Continuous non-overlapping weeks: 52 or 53 per fiscal year
 */

/**
 * Get the Sunday on or before a given date.
 */
function getSundayOnOrBefore(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  return d;
}

/**
 * Get the fiscal year label for a given date.
 * FY is named by the ending calendar year.
 * FY2025 = Oct 1 2024 – Sep 30 2025
 * 
 * @param {Date|string} date
 * @returns {number} The fiscal year number (e.g., 2025)
 */
export function getFiscalYear(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // If month is Oct (9), Nov (10), Dec (11) → FY = calendar year + 1
  // If month is Jan-Sep → FY = calendar year
  const month = d.getMonth(); // 0-indexed
  return month >= 9 ? d.getFullYear() + 1 : d.getFullYear();
}

/**
 * Get the fiscal year label string (e.g., "FY2025")
 */
export function getFiscalYearLabel(date) {
  return `FY${getFiscalYear(date)}`;
}

/**
 * Get the start date of a fiscal year (the Sunday on or before Oct 1).
 * @param {number} fy - Fiscal year number (e.g., 2025 for FY2025)
 * @returns {Date}
 */
export function getFiscalYearStart(fy) {
  // FY2025 starts around Oct 1, 2024
  const oct1 = new Date(fy - 1, 9, 1); // Oct 1 of prior calendar year
  return getSundayOnOrBefore(oct1);
}

/**
 * Get the start date of the NEXT fiscal year.
 * The current FY ends the day before this.
 */
export function getFiscalYearEnd(fy) {
  // End is the Saturday before the next FY starts
  const nextFyStart = getFiscalYearStart(fy + 1);
  const end = new Date(nextFyStart);
  end.setDate(end.getDate() - 1);
  return end;
}

/**
 * Get the number of weeks in a fiscal year (52 or 53).
 */
export function getWeeksInFiscalYear(fy) {
  const start = getFiscalYearStart(fy);
  const nextStart = getFiscalYearStart(fy + 1);
  const diffMs = nextStart.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays / 7;
}

/**
 * Get the fiscal week number and fiscal year for a given date.
 * @param {Date|string} date
 * @returns {{ fiscalYear: number, fiscalWeek: number, weekStart: Date, weekEnd: Date }}
 */
export function getFiscalWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  const fy = getFiscalYear(d);
  const fyStart = getFiscalYearStart(fy);
  
  // If the date is before the FY start (can happen for dates in late Sep
  // that fall before the Sunday-aligned start), it belongs to previous FY
  if (d < fyStart) {
    const prevFy = fy - 1;
    const prevFyStart = getFiscalYearStart(prevFy);
    const diffMs = d.getTime() - prevFyStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weekNum = Math.floor(diffDays / 7) + 1;
    const weekStart = new Date(prevFyStart);
    weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return { fiscalYear: prevFy, fiscalWeek: weekNum, weekStart, weekEnd };
  }
  
  const diffMs = d.getTime() - fyStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weekNum = Math.floor(diffDays / 7) + 1;
  
  const weekStart = new Date(fyStart);
  weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  return { fiscalYear: fy, fiscalWeek: weekNum, weekStart, weekEnd };
}

/**
 * Get the fiscal week label (e.g., "FY2025 Week 12")
 */
export function getFiscalWeekLabel(date) {
  const { fiscalYear, fiscalWeek } = getFiscalWeek(date);
  return `FY${fiscalYear} Week ${fiscalWeek}`;
}

/**
 * Generate all fiscal weeks for a given fiscal year.
 * @param {number} fy - Fiscal year number
 * @returns {Array<{ week: number, start: Date, end: Date, label: string }>}
 */
export function generateFiscalWeeks(fy) {
  const totalWeeks = getWeeksInFiscalYear(fy);
  const fyStart = getFiscalYearStart(fy);
  const weeks = [];
  
  for (let i = 0; i < totalWeeks; i++) {
    const start = new Date(fyStart);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    weeks.push({
      week: i + 1,
      start,
      end,
      label: `Week ${i + 1}`,
    });
  }
  
  return weeks;
}

/**
 * Generate tracking periods (as used by SiteSettings) from the fiscal calendar.
 * @param {number} fy - Fiscal year number
 * @returns {Array} Periods compatible with fiscal_year_settings.tracking_periods
 */
export function generateFiscalWeekPeriods(fy) {
  const weeks = generateFiscalWeeks(fy);
  return weeks.map(w => ({
    id: `fw_${w.week}`,
    name: `Week ${w.week}`,
    start_month: w.start.getMonth() + 1,
    start_day: w.start.getDate(),
    end_month: w.end.getMonth() + 1,
    end_day: w.end.getDate(),
  }));
}

/**
 * Check if a date falls within a specific fiscal week.
 */
export function isDateInFiscalWeek(date, fy, weekNum) {
  const { fiscalYear, fiscalWeek } = getFiscalWeek(date);
  return fiscalYear === fy && fiscalWeek === weekNum;
}

/**
 * Get the date range for a specific fiscal week.
 */
export function getFiscalWeekRange(fy, weekNum) {
  const fyStart = getFiscalYearStart(fy);
  const start = new Date(fyStart);
  start.setDate(start.getDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}