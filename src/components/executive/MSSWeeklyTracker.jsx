import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SprayCan, TrendingUp, Loader2 } from "lucide-react";
import { format, isBefore, isWithinInterval } from "date-fns";
import { getFiscalYear, generateFiscalWeeks } from "@/lib/fiscalCalendar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

/* ── helpers ── */

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

function isMSSTask(t) {
  if (t.is_group) return false;
  // MSS = Master Sanitation Schedule = all recurring sanitation tasks.
  // Only exclude explicitly non-recurring one-off tasks.
  if (t.is_recurring === false) return false;
  return true;
}

function buildMastersByFreq(tasks) {
  const map = {};
  tasks.forEach(t => {
    if (t.is_group) return;
    const freq = normFreq(t.frequency);
    if (freq === "other") return;
    if (!map[freq]) map[freq] = new Map();
    const key = `${(t.title || "").toLowerCase().trim()}||${(t.area || "").toLowerCase().trim()}`;
    if (!map[freq].has(key)) {
      map[freq].set(key, { title: t.title, area: t.area, days_of_week: t.days_of_week });
    }
  });
  const result = {};
  let total = 0;
  Object.entries(map).forEach(([freq, m]) => {
    result[freq] = Array.from(m.values());
    total += result[freq].length;
  });
  return { byFreq: result, totalMasters: total };
}

function masterRunsOnDay(master, dow) {
  const days = master.days_of_week;
  if (!days || days.length === 0) return dow >= 1 && dow <= 5;
  return days.includes(DAY_NAMES[dow]);
}

function expectedForWeek(masters, freq, weekStart, weekEnd) {
  if (!masters || masters.length === 0) return 0;
  const count = masters.length;

  if (freq === "daily") {
    let sum = 0;
    const d = new Date(weekStart);
    while (d <= weekEnd) {
      masters.forEach(m => { if (masterRunsOnDay(m, d.getDay())) sum++; });
      d.setDate(d.getDate() + 1);
    }
    return sum;
  }

  const msPerDay = 86400000;
  const daysInWeek = Math.round((weekEnd - weekStart) / msPerDay) + 1;
  const cycleDays = {
    weekly: 7, biweekly: 14, monthly: 30, bimonthly: 60, quarterly: 91, annually: 365,
  }[freq] || 7;

  return Math.round((count * daysInWeek) / cycleDays);
}

/* ── component ── */

/**
 * Props:
 *   allTasks: array of Task records (already fetched by useMultiSiteData, with _org_id)
 *   orgIds: array of org IDs to filter to (when viewing a single site tab)
 *   selectedPeriod: { startDate, endDate } from fiscal period selector
 *   isLoading: boolean
 */
export default function MSSWeeklyTracker({ allTasks = [], orgIds = [], selectedPeriod, isLoading }) {
  // Filter to selected org(s) — all recurring tasks are part of MSS
  const mssTasks = useMemo(() => {
    const orgSet = new Set(orgIds);
    return allTasks
      .filter(t => orgSet.has(t._org_id || t.organization_id))
      .filter(isMSSTask);
  }, [allTasks, orgIds]);

  const { byFreq, totalMasters } = useMemo(() => buildMastersByFreq(mssTasks), [mssTasks]);

  const completedTasks = useMemo(
    () => mssTasks.filter(t => t.status === "completed" || t.status === "verified"),
    [mssTasks]
  );

  const weeklyData = useMemo(() => {
    if (totalMasters === 0) return [];

    const today = new Date();
    const fy = getFiscalYear(today);
    let weeks = generateFiscalWeeks(fy);

    if (selectedPeriod?.startDate && selectedPeriod?.endDate) {
      weeks = weeks.filter(w => w.end >= selectedPeriod.startDate && w.start <= selectedPeriod.endDate);
    }

    return weeks.map(week => {
      const weekEnd = new Date(Math.min(week.end.getTime(), today.getTime()));
      const isPast = isBefore(week.end, today);
      const isCurrent = isWithinInterval(today, { start: week.start, end: week.end });

      let expected = 0;
      Object.entries(byFreq).forEach(([freq, masters]) => {
        expected += expectedForWeek(masters, freq, week.start, weekEnd);
      });

      const completed = completedTasks.filter(t => {
        const dateStr = t.completed_at || t.due_date;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= week.start && d <= week.end;
      }).length;

      const rate = expected > 0 ? Math.min(Math.round((completed / expected) * 100), 100) : 0;

      return {
        week: week.week,
        label: `Wk ${week.week}`,
        dateLabel: `${format(week.start, "MMM d")} – ${format(week.end, "MMM d")}`,
        expected, completed, rate, isPast, isCurrent,
      };
    });
  }, [byFreq, completedTasks, totalMasters, selectedPeriod]);

  const totals = useMemo(() => {
    let expected = 0, completed = 0;
    weeklyData.forEach(w => { expected += w.expected; completed += w.completed; });
    const rate = expected > 0 ? Math.min(Math.round((completed / expected) * 100), 100) : 0;
    return { expected, completed, rate };
  }, [weeklyData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading MSS data…
        </CardContent>
      </Card>
    );
  }

  if (totalMasters === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <SprayCan className="w-4 h-4 text-blue-600" />
            MSS Program — Weekly Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500">
            No recurring sanitation tasks found for the selected site(s). ({allTasks.length} total tasks loaded, {mssTasks.length} matched filters)
          </p>
        </CardContent>
      </Card>
    );
  }

  const getBarColor = (rate) => {
    if (rate >= 90) return "#10b981";
    if (rate >= 70) return "#f59e0b";
    return "#ef4444";
  };

  const freqSummary = Object.entries(byFreq)
    .map(([f, m]) => `${m.length} ${f}`)
    .join(", ");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <SprayCan className="w-4 h-4 text-blue-600" />
            MSS Program — Weekly Score
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px]">
              {totalMasters} masters · {freqSummary}
            </Badge>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-lg font-bold",
                totals.rate >= 90 ? "text-emerald-600" : totals.rate >= 70 ? "text-amber-600" : "text-red-600"
              )}>
                {totals.rate}%
              </span>
              <span className="text-xs text-slate-500">overall</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {weeklyData.length > 0 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  interval={weeklyData.length > 20 ? Math.floor(weeklyData.length / 10) : 0}
                />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
                        <div className="font-semibold text-slate-900">{d.label} — {d.dateLabel}</div>
                        <div className="mt-1 space-y-0.5">
                          <div>Completed: <span className="font-medium text-emerald-600">{d.completed}</span></div>
                          <div>Scheduled: <span className="font-medium">{d.expected}</span></div>
                          <div>Rate: <span className={cn("font-bold", d.rate >= 90 ? "text-emerald-600" : d.rate >= 70 ? "text-amber-600" : "text-red-600")}>{d.rate}%</span></div>
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={90} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} />
                <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
                  {weeklyData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.isCurrent ? "#3b82f6" : getBarColor(entry.rate)}
                      opacity={entry.isPast || entry.isCurrent ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="overflow-x-auto max-h-60">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200">
                <th className="text-left py-1.5 px-2 font-medium text-slate-500">Week</th>
                <th className="text-left py-1.5 px-2 font-medium text-slate-500">Dates</th>
                <th className="text-center py-1.5 px-2 font-medium text-emerald-600">Done</th>
                <th className="text-center py-1.5 px-2 font-medium text-slate-500">Scheduled</th>
                <th className="text-center py-1.5 px-2 font-medium text-slate-500">Rate</th>
              </tr>
            </thead>
            <tbody>
              {weeklyData.map(w => (
                <tr
                  key={w.week}
                  className={cn(
                    "border-b border-slate-50",
                    w.isCurrent && "bg-blue-50 font-medium",
                    !w.isPast && !w.isCurrent && "opacity-50"
                  )}
                >
                  <td className="py-1.5 px-2 font-medium text-slate-700">
                    {w.label}
                    {w.isCurrent && <span className="ml-1 text-blue-600">●</span>}
                  </td>
                  <td className="py-1.5 px-2 text-slate-500">{w.dateLabel}</td>
                  <td className="text-center py-1.5 px-2 text-emerald-600 font-semibold">{w.completed}</td>
                  <td className="text-center py-1.5 px-2 text-slate-600">{w.expected}</td>
                  <td className="text-center py-1.5 px-2">
                    <span className={cn(
                      "font-bold",
                      w.rate >= 90 ? "text-emerald-600" : w.rate >= 70 ? "text-amber-600" : "text-red-600"
                    )}>
                      {w.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Period Total</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-600 font-semibold">{totals.completed} completed</span>
            <span className="text-slate-500">/ {totals.expected} scheduled</span>
            <span className={cn(
              "font-bold text-sm",
              totals.rate >= 90 ? "text-emerald-600" : totals.rate >= 70 ? "text-amber-600" : "text-red-600"
            )}>
              {totals.rate}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}