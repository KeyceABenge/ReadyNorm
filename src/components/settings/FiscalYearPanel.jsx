import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, Trash2, Wand2, Info } from "lucide-react";
import {
  getFiscalYear,
  getFiscalYearStart,
  getFiscalYearEnd,
  getWeeksInFiscalYear,
  generateFiscalWeeks,
} from "@/lib/fiscalCalendar";
import { format } from "date-fns";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function getLastDay(month) {
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function getMonthName(m) {
  return MONTHS.find(mo => mo.value === m)?.label || "";
}

function generateQuarterlyPeriods(startMonth, startDay) {
  const periods = [];
  for (let i = 0; i < 4; i++) {
    const sMonth = ((startMonth - 1 + i * 3) % 12) + 1;
    const eMonth = ((startMonth - 1 + (i + 1) * 3) % 12) + 1;
    const actualEndMonth = startDay === 1 ? ((eMonth - 2 + 12) % 12) + 1 : ((eMonth - 2 + 12) % 12) + 1;
    const eDay = startDay === 1 ? getLastDay(actualEndMonth) : startDay - 1;
    periods.push({
      id: `q${i + 1}`,
      name: `Q${i + 1}`,
      start_month: sMonth,
      start_day: startDay,
      end_month: actualEndMonth,
      end_day: eDay,
    });
  }
  return periods;
}

function generateMonthlyPeriods(startMonth, startDay) {
  const periods = [];
  for (let i = 0; i < 12; i++) {
    const sMonth = ((startMonth - 1 + i) % 12) + 1;
    const eDay = startDay === 1 ? getLastDay(sMonth) : startDay - 1;
    const eMonth = startDay === 1 ? sMonth : ((sMonth) % 12) + 1;
    periods.push({
      id: `p${i + 1}`,
      name: `Period ${i + 1} (${getMonthName(sMonth)})`,
      start_month: sMonth,
      start_day: startDay,
      end_month: startDay === 1 ? sMonth : eMonth,
      end_day: startDay === 1 ? eDay : startDay - 1,
    });
  }
  return periods;
}

export default function FiscalYearPanel({ settings, onChange }) {
  const fiscal = settings?.fiscal_year_settings || {};
  const [mode, setMode] = useState(fiscal.fiscal_calendar_mode || "custom");
  const [startMonth, setStartMonth] = useState(fiscal.fiscal_year_start_month || "");
  const [startDay, setStartDay] = useState(fiscal.fiscal_year_start_day || 1);
  const [periods, setPeriods] = useState(fiscal.tracking_periods || []);

  // Sync from props
  useEffect(() => {
    if (settings?.fiscal_year_settings) {
      const f = settings.fiscal_year_settings;
      if (f.fiscal_calendar_mode) setMode(f.fiscal_calendar_mode);
      if (f.fiscal_year_start_month) setStartMonth(f.fiscal_year_start_month);
      if (f.fiscal_year_start_day) setStartDay(f.fiscal_year_start_day);
      if (f.tracking_periods?.length) setPeriods(f.tracking_periods);
    }
  }, [settings?.fiscal_year_settings]);

  // Notify parent
  useEffect(() => {
    if (mode === "weekly_october") {
      onChange({
        fiscal_calendar_mode: "weekly_october",
        fiscal_year_start_month: 10,
        fiscal_year_start_day: 1,
        tracking_periods: [], // Generated dynamically by lib/fiscalCalendar
      });
    } else {
      onChange({
        fiscal_calendar_mode: "custom",
        fiscal_year_start_month: startMonth || null,
        fiscal_year_start_day: startDay || 1,
        tracking_periods: periods,
      });
    }
  }, [mode, startMonth, startDay, periods]);

  // Preview for weekly mode
  const currentFY = getFiscalYear(new Date());
  const weeklyPreview = useMemo(() => {
    if (mode !== "weekly_october") return null;
    const fyStart = getFiscalYearStart(currentFY);
    const fyEnd = getFiscalYearEnd(currentFY);
    const totalWeeks = getWeeksInFiscalYear(currentFY);
    const weeks = generateFiscalWeeks(currentFY);
    return { fyStart, fyEnd, totalWeeks, weeks };
  }, [mode, currentFY]);

  const maxDay = startMonth ? getLastDay(startMonth) : 31;

  const addPeriod = () => {
    setPeriods(prev => [
      ...prev,
      {
        id: `period_${Date.now()}`,
        name: `Period ${prev.length + 1}`,
        start_month: startMonth || 1,
        start_day: startDay || 1,
        end_month: startMonth || 1,
        end_day: getLastDay(startMonth || 1),
      },
    ]);
  };

  const updatePeriod = (index, field, value) => {
    setPeriods(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePeriod = (index) => {
    setPeriods(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Fiscal Year & Tracking Periods
        </CardTitle>
        <CardDescription>
          Set when your fiscal year starts and define how to track data periods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode selector */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Calendar Mode</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("weekly_october")}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                mode === "weekly_october"
                  ? "border-slate-900 bg-slate-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="font-medium text-sm text-slate-900">Weekly Fiscal Calendar</div>
              <p className="text-xs text-slate-500 mt-1">
                Oct 1 boundary, Sun–Sat weeks, Week 1–52/53. FY named by ending year.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                mode === "custom"
                  ? "border-slate-900 bg-slate-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="font-medium text-sm text-slate-900">Custom Periods</div>
              <p className="text-xs text-slate-500 mt-1">
                Define your own fiscal year start and custom tracking periods.
              </p>
            </button>
          </div>
        </div>

        {/* Weekly October Mode */}
        {mode === "weekly_october" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 space-y-1">
                  <p className="font-medium">How the Weekly Fiscal Calendar works:</p>
                  <ul className="list-disc ml-4 text-xs space-y-0.5 text-blue-700">
                    <li>Fiscal year runs from the <strong>first Sunday on or before October 1</strong></li>
                    <li>Each week runs <strong>Sunday through Saturday</strong></li>
                    <li>Weeks are numbered <strong>1 through 52</strong> (or 53 in applicable years)</li>
                    <li>Named by ending year: <strong>FY2025 = Oct 1, 2024 – Sep 30, 2025</strong></li>
                    <li>All weeks are continuous and non-overlapping</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Preview current FY */}
            {weeklyPreview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    FY{currentFY} Preview
                  </Label>
                  <span className="text-xs text-slate-500">
                    {weeklyPreview.totalWeeks} weeks
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">Starts:</span>{" "}
                      <span className="font-medium">{format(weeklyPreview.fyStart, "MMM d, yyyy")} (Sun)</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Ends:</span>{" "}
                      <span className="font-medium">{format(weeklyPreview.fyEnd, "MMM d, yyyy")} (Sat)</span>
                    </div>
                  </div>
                </div>

                {/* Week table preview (show first/last few) */}
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-slate-600">Week</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-600">Start (Sun)</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-600">End (Sat)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyPreview.weeks.map((w) => (
                        <tr key={w.week} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 font-medium text-slate-900">{w.label}</td>
                          <td className="px-3 py-1.5 text-slate-600">{format(w.start, "MMM d, yyyy")}</td>
                          <td className="px-3 py-1.5 text-slate-600">{format(w.end, "MMM d, yyyy")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Mode */}
        {mode === "custom" && (
          <div className="space-y-6">
            {/* Fiscal Year Start */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Fiscal Year Start Month</Label>
                <Select
                  value={startMonth ? String(startMonth) : ""}
                  onValueChange={(v) => setStartMonth(Number(v))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select month..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={maxDay}
                  value={startDay}
                  onChange={(e) => setStartDay(Math.min(maxDay, Math.max(1, Number(e.target.value))))}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">Day of month (1-{maxDay})</p>
              </div>
            </div>

            {!startMonth && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  Please set a fiscal year start month before defining tracking periods.
                </p>
              </div>
            )}

            {/* Tracking Periods */}
            {startMonth && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Tracking Periods</Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define the periods you want to track data by
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (startMonth) setPeriods(generateQuarterlyPeriods(startMonth, startDay || 1));
                  }} className="text-xs">
                    <Wand2 className="w-3.5 h-3.5 mr-1" />
                    Generate Quarterly
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (startMonth) setPeriods(generateMonthlyPeriods(startMonth, startDay || 1));
                  }} className="text-xs">
                    <Wand2 className="w-3.5 h-3.5 mr-1" />
                    Generate Monthly
                  </Button>
                </div>

                {periods.length > 0 && (
                  <div className="space-y-3">
                    {periods.map((period, idx) => (
                      <PeriodRow
                        key={period.id}
                        period={period}
                        index={idx}
                        onUpdate={updatePeriod}
                        onRemove={removePeriod}
                      />
                    ))}
                  </div>
                )}

                {periods.length === 0 && (
                  <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <CalendarDays className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No tracking periods defined yet</p>
                    <p className="text-xs text-slate-400 mt-1">Use the auto-generate buttons or add custom periods</p>
                  </div>
                )}

                <Button type="button" variant="outline" size="sm" onClick={addPeriod} className="w-full border-dashed">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Custom Period
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PeriodRow({ period, index, onUpdate, onRemove }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2">
        <div className="sm:col-span-1">
          <Label className="text-xs text-slate-500">Name</Label>
          <Input
            value={period.name}
            onChange={(e) => onUpdate(index, "name", e.target.value)}
            className="mt-1 h-8 text-sm"
            placeholder="e.g., Q1"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-500">Start Month</Label>
          <Select value={String(period.start_month)} onValueChange={(v) => onUpdate(index, "start_month", Number(v))}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label.slice(0, 3)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Start Day</Label>
          <Input type="number" min={1} max={31} value={period.start_day}
            onChange={(e) => onUpdate(index, "start_day", Number(e.target.value))} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-500">End Month</Label>
          <Select value={String(period.end_month)} onValueChange={(v) => onUpdate(index, "end_month", Number(v))}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label.slice(0, 3)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500">End Day</Label>
          <Input type="number" min={1} max={31} value={period.end_day}
            onChange={(e) => onUpdate(index, "end_day", Number(e.target.value))} className="mt-1 h-8 text-sm" />
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)}
        className="h-8 w-8 text-slate-400 hover:text-rose-500 mt-5">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}