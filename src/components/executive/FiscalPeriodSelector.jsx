import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { getFiscalYear, getFiscalYearStart, getFiscalYearEnd, generateFiscalWeeks } from "@/lib/fiscalCalendar";

/**
 * Builds period options from site settings.
 * Supports:
 *   - weekly_october mode: generates fiscal weeks from fiscalCalendar lib
 *   - custom mode: uses tracking_periods from settings
 *   - Always includes "Year to Date" and "All Time"
 */
function buildPeriodOptions(fiscalSettings) {
  const mode = fiscalSettings?.fiscal_calendar_mode;
  const today = new Date();
  const periods = [];

  // Use weekly_october mode if explicitly set OR if no mode is configured (default)
  if (mode === "weekly_october" || !mode || mode === "") {
    const fy = getFiscalYear(today);
    const fyStart = getFiscalYearStart(fy);
    const fyEnd = getFiscalYearEnd(fy);
    const weeks = generateFiscalWeeks(fy);

    // Add quarterly groupings (13 weeks each)
    const quartersCount = Math.ceil(weeks.length / 13);
    for (let q = 0; q < quartersCount; q++) {
      const qWeeks = weeks.slice(q * 13, (q + 1) * 13);
      if (qWeeks.length === 0) continue;
      periods.push({
        id: `q${q + 1}`,
        name: `Q${q + 1}`,
        description: `Weeks ${qWeeks[0].week}–${qWeeks[qWeeks.length - 1].week}`,
        startDate: qWeeks[0].start,
        endDate: qWeeks[qWeeks.length - 1].end,
        type: "quarter",
      });
    }

    // Add individual weeks
    weeks.forEach(w => {
      periods.push({
        id: `fw_${w.week}`,
        name: `Wk ${w.week}`,
        description: `${format(w.start, "MMM d")} – ${format(w.end, "MMM d, yyyy")}`,
        startDate: w.start,
        endDate: w.end,
        type: "week",
      });
    });

    // Year to date
    periods.push({
      id: "ytd",
      name: "Year to Date",
      description: `FY${fy} through today`,
      startDate: fyStart,
      endDate: today,
      type: "summary",
    });

    // Full year
    periods.push({
      id: "full_year",
      name: `Full FY${fy}`,
      description: `${format(fyStart, "MMM d, yyyy")} – ${format(fyEnd, "MMM d, yyyy")}`,
      startDate: fyStart,
      endDate: fyEnd,
      type: "summary",
    });
  } else if (mode === "custom" && fiscalSettings?.tracking_periods?.length > 0) {
    const fyStartMonth = fiscalSettings.fiscal_year_start_month || 1;
    const fyStartDay = fiscalSettings.fiscal_year_start_day || 1;
    const currentYear = today.getFullYear();

    let fyStartDate = new Date(currentYear, fyStartMonth - 1, fyStartDay);
    if (today < fyStartDate) {
      fyStartDate = new Date(currentYear - 1, fyStartMonth - 1, fyStartDay);
    }

    fiscalSettings.tracking_periods.forEach((p) => {
      const startYear = p.start_month < fyStartMonth ? fyStartDate.getFullYear() + 1 : fyStartDate.getFullYear();
      const endYear = p.end_month < fyStartMonth ? fyStartDate.getFullYear() + 1 : fyStartDate.getFullYear();
      const startDate = new Date(startYear, p.start_month - 1, p.start_day);
      const endDate = new Date(endYear, p.end_month - 1, p.end_day, 23, 59, 59);

      periods.push({
        id: p.id,
        name: p.name,
        description: `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`,
        startDate,
        endDate,
        type: "period",
      });
    });

    periods.push({
      id: "ytd",
      name: "Year to Date",
      description: `${format(fyStartDate, "MMM d, yyyy")} through today`,
      startDate: fyStartDate,
      endDate: today,
      type: "summary",
    });
  }

  // All time (always available)
  periods.push({
    id: "all_time",
    name: "All Time",
    description: "No date filter",
    startDate: null,
    endDate: null,
    type: "summary",
  });

  return periods;
}

export default function FiscalPeriodSelector({ fiscalSettings, selectedPeriodId, onPeriodChange }) {
  const periods = useMemo(() => buildPeriodOptions(fiscalSettings), [fiscalSettings]);
  const [showWeeks, setShowWeeks] = useState(false);

  if (periods.length <= 1) return null;

  const summaryPeriods = periods.filter(p => p.type === "summary");
  const quarterPeriods = periods.filter(p => p.type === "quarter");
  const weekPeriods = periods.filter(p => p.type === "week");
  const customPeriods = periods.filter(p => p.type === "period");

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId) || periods.find(p => p.id === "ytd") || periods[0];

  const today = new Date();
  const currentWeek = weekPeriods.find(w => today >= w.startDate && today <= w.endDate);

  const pillClass = (isActive, color = "slate") => cn(
    "text-[11px] h-6 px-2.5 rounded-full font-medium transition-all cursor-pointer border",
    isActive
      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
      : color === "blue"
      ? "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Icon + label */}
      <div className="flex items-center gap-1.5 mr-1">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-500">Period</span>
      </div>

      {/* Summary pills */}
      {summaryPeriods.map((p) => (
        <button key={p.id} className={pillClass(selectedPeriod.id === p.id)} onClick={() => onPeriodChange(p.id)}>
          {p.name}
        </button>
      ))}

      {/* Divider */}
      {(quarterPeriods.length > 0 || customPeriods.length > 0) && (
        <div className="w-px h-4 bg-slate-200" />
      )}

      {/* Quarters */}
      {quarterPeriods.map((p) => (
        <button key={p.id} className={pillClass(selectedPeriod.id === p.id, "blue")} onClick={() => onPeriodChange(p.id)}>
          {p.name}
        </button>
      ))}

      {/* Custom periods */}
      {customPeriods.map((p) => (
        <button key={p.id} className={pillClass(selectedPeriod.id === p.id, "blue")} onClick={() => onPeriodChange(p.id)}>
          {p.name}
        </button>
      ))}

      {/* Weeks toggle */}
      {weekPeriods.length > 0 && (
        <>
          <div className="w-px h-4 bg-slate-200" />
          <button
            onClick={() => setShowWeeks(!showWeeks)}
            className={cn(
              "text-[11px] h-6 px-2.5 rounded-full font-medium border flex items-center gap-1 transition-all",
              showWeeks
                ? "bg-slate-100 text-slate-700 border-slate-300"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            )}
          >
            {showWeeks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {currentWeek && !showWeeks ? currentWeek.name : "Weeks"}
          </button>
        </>
      )}

      {/* Date range indicator */}
      {selectedPeriod.description && selectedPeriod.id !== "all_time" && (
        <span className="text-[10px] text-slate-400 ml-auto">{selectedPeriod.description}</span>
      )}

      {/* Expanded weeks row */}
      {showWeeks && weekPeriods.length > 0 && (
        <div className="w-full flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto">
          {weekPeriods.map((p) => {
            const isCurrent = currentWeek?.id === p.id;
            return (
              <button
                key={p.id}
                className={cn(
                  "text-[10px] h-5 px-2 rounded-full font-medium border transition-all cursor-pointer",
                  selectedPeriod.id === p.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : isCurrent
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                )}
                onClick={() => onPeriodChange(p.id)}
              >
                {p.name}{isCurrent && selectedPeriod.id !== p.id && " ●"}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { buildPeriodOptions };