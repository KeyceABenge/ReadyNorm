/**
 * Hook to calculate which employees work on which days based on crew schedule patterns.
 * Returns a map: { "YYYY-MM-DD": [ { employee, crew, crewSchedule } ] }
 */
import { useMemo } from "react";
import { eachDayOfInterval, format, startOfMonth, endOfMonth, differenceInCalendarDays, parseISO } from "date-fns";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function useScheduleCalculator({ currentMonth, crews, crewSchedules, employees, employeeShifts, plantExceptions }) {
  return useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Build lookup: employee email -> crew
    const emailToCrews = {};
    crews.filter(c => c.status === "active").forEach(crew => {
      (crew.members || []).forEach(email => {
        if (!emailToCrews[email]) emailToCrews[email] = [];
        emailToCrews[email].push(crew);
      });
    });

    // Build lookup: crew_id -> crewSchedule
    const crewIdToSchedule = {};
    crewSchedules.forEach(cs => {
      if (cs.crew_id) crewIdToSchedule[cs.crew_id] = cs;
    });
    // Also match by crew_name if crew_id not set
    crewSchedules.forEach(cs => {
      if (cs.crew_name) {
        const matchingCrew = crews.find(c => c.name === cs.crew_name);
        if (matchingCrew && !crewIdToSchedule[matchingCrew.id]) {
          crewIdToSchedule[matchingCrew.id] = cs;
        }
      }
    });

    // Build override map from EmployeeShift records: "email|date" -> shift
    const overrideMap = {};
    employeeShifts.forEach(shift => {
      const key = `${shift.employee_email}|${shift.shift_date}`;
      overrideMap[key] = shift;
    });

    // Plant closures set
    const closedDates = new Set();
    plantExceptions.forEach(pe => closedDates.add(pe.exception_date));

    // For each day, compute which employees are scheduled
    const scheduleMap = {}; // "YYYY-MM-DD" -> [ { employee, crew, crewSchedule, status, isOverride } ]

    const activeEmployees = employees.filter(e => e.status === "active");

    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayOfWeek = DAY_NAMES[day.getDay()];
      const entries = [];

      const isClosed = closedDates.has(dateStr);

      activeEmployees.forEach(emp => {
        const overrideKey = `${emp.email}|${dateStr}`;
        const override = overrideMap[overrideKey];

        // Check if employee is in any crew
        const empCrews = emailToCrews[emp.email] || [];

        let scheduled = false;
        let matchedCrew = null;
        let matchedSchedule = null;

        for (const crew of empCrews) {
          // First check crew's own schedule_pattern
          const pattern = crew.schedule_pattern;
          const patternStart = crew.schedule_pattern_start_date;

          if (pattern && pattern.length > 0 && patternStart) {
            const startDate = parseISO(patternStart);
            const daysDiff = differenceInCalendarDays(day, startDate);
            if (daysDiff < 0) continue; // before pattern start

            const weekIndex = Math.floor(daysDiff / 7) % pattern.length;
            const weekPattern = pattern[weekIndex]; // array of 7 booleans (Sun-Sat)

            if (Array.isArray(weekPattern) && weekPattern[day.getDay()]) {
              scheduled = true;
              matchedCrew = crew;
              // Find matching crewSchedule for times
              matchedSchedule = crewIdToSchedule[crew.id] || null;
              break;
            }
          } else {
            // Fall back to CrewSchedule pattern (day name arrays)
            const cs = crewIdToSchedule[crew.id];
            if (cs && cs.schedule_pattern && cs.schedule_pattern.length > 0) {
              const csPatternStart = cs.schedule_pattern_start_date;
              let weekIndex = 0;
              if (csPatternStart) {
                const startDate = parseISO(csPatternStart);
                const daysDiff = differenceInCalendarDays(day, startDate);
                if (daysDiff >= 0) {
                  weekIndex = Math.floor(daysDiff / 7) % cs.schedule_pattern.length;
                }
              }
              const weekDays = cs.schedule_pattern[weekIndex]; // array of day name strings
              if (Array.isArray(weekDays) && weekDays.includes(dayOfWeek)) {
                scheduled = true;
                matchedCrew = crew;
                matchedSchedule = cs;
                break;
              }
            }
          }
        }

        // Determine final status
        if (override) {
          entries.push({
            employee: emp,
            crew: matchedCrew,
            crewSchedule: matchedSchedule,
            status: override.status, // scheduled, absent, cancelled (vacation)
            isOverride: true,
            shiftRecord: override,
            isClosed,
          });
        } else if (scheduled) {
          entries.push({
            employee: emp,
            crew: matchedCrew,
            crewSchedule: matchedSchedule,
            status: isClosed ? "closed" : "scheduled",
            isOverride: false,
            shiftRecord: null,
            isClosed,
          });
        }
        // If not scheduled and no override, employee simply doesn't appear for this day
      });

      scheduleMap[dateStr] = entries;
    });

    return { scheduleMap, closedDates, days };
  }, [currentMonth, crews, crewSchedules, employees, employeeShifts, plantExceptions]);
}