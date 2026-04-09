// @ts-nocheck
import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, TrendingUp, ChevronLeft, ChevronRight
} from "lucide-react";
import { 
  format, parseISO, endOfWeek, endOfMonth,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  isWithinInterval, isBefore, subDays
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import PeriodBucketCard from "./PeriodBucketCard";

/**
 * Identify unique "master" (template) tasks for this frequency.
 * A master task = unique combination of title + area.
 */
function getMasterTasks(allTasks, frequency) {
  const seen = new Map();
  allTasks.forEach(t => {
    // Skip group header tasks — they are not actual work tasks
    if (t.is_group) return;
    const freq = t.frequency?.toLowerCase().trim();
    if (freq !== frequency.toLowerCase()) return;
    const key = `${(t.title || '').toLowerCase().trim()}||${(t.area || '').toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.set(key, { title: t.title, area: t.area, key, days_of_week: t.days_of_week });
    }
  });
  return Array.from(seen.values());
}

/**
 * For daily tasks: does this master task run on a given day-of-week?
 */
function masterRunsOnDay(master, dayOfWeek) {
  // dayOfWeek: 0=Sun..6=Sat
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dow = master.days_of_week;
  if (!dow || dow.length === 0) {
    // Default: Mon-Fri
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  return dow.includes(dayNames[dayOfWeek]);
}

/**
 * Build time buckets based on frequency:
 * - daily → each day in range, grouped into weeks
 * - weekly → each Sun-Sat week in range
 * - biweekly → every 2 weeks
 * - monthly → each month
 * - quarterly → each quarter
 * - annually → each year
 */
function buildBuckets(frequency, rangeStart, rangeEnd) {
  const buckets = [];
  
  if (frequency === "daily") {
    // Build week-level groups, each containing days
    const weeks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 0 });
    weeks.forEach(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const clampedStart = isBefore(weekStart, rangeStart) ? rangeStart : weekStart;
      const clampedEnd = isBefore(rangeEnd, weekEnd) ? rangeEnd : weekEnd;
      const days = eachDayOfInterval({ start: clampedStart, end: clampedEnd });
      
      buckets.push({
        id: format(weekStart, "yyyy-'W'II"),
        label: `Week of ${format(clampedStart, "MMM d")} – ${format(clampedEnd, "MMM d, yyyy")}`,
        start: clampedStart,
        end: clampedEnd,
        days: days.map(d => ({
          date: d,
          label: format(d, "EEEE, MMM d"),
          dayOfWeek: d.getDay(),
        })),
      });
    });
  } else if (frequency === "weekly") {
    const weeks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 0 });
    weeks.forEach(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      buckets.push({
        id: format(weekStart, "yyyy-'W'II"),
        label: `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`,
        start: weekStart,
        end: weekEnd,
      });
    });
  } else if (frequency === "bi-weekly" || frequency === "biweekly") {
    const weeks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 0 });
    for (let i = 0; i < weeks.length; i += 2) {
      const start = weeks[i];
      const end = endOfWeek(weeks[Math.min(i + 1, weeks.length - 1)], { weekStartsOn: 0 });
      buckets.push({
        id: format(start, "yyyy-'W'II"),
        label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
        start,
        end,
      });
    }
  } else if (frequency === "monthly") {
    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
    months.forEach(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      buckets.push({
        id: format(monthStart, "yyyy-MM"),
        label: format(monthStart, "MMMM yyyy"),
        start: monthStart,
        end: monthEnd,
      });
    });
  } else if (frequency === "quarterly") {
    // Group by 3-month blocks starting from range
    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
    for (let i = 0; i < months.length; i += 3) {
      const start = months[i];
      const end = endOfMonth(months[Math.min(i + 2, months.length - 1)]);
      const qNum = Math.floor(start.getMonth() / 3) + 1;
      buckets.push({
        id: `${start.getFullYear()}-Q${qNum}`,
        label: `Q${qNum} ${start.getFullYear()}`,
        start,
        end,
      });
    }
  } else if (frequency === "annually") {
    buckets.push({
      id: `${rangeStart.getFullYear()}`,
      label: `${rangeStart.getFullYear()}`,
      start: rangeStart,
      end: rangeEnd,
    });
  } else {
    // Fallback: single bucket
    buckets.push({
      id: "all",
      label: `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`,
      start: rangeStart,
      end: rangeEnd,
    });
  }

  return buckets;
}

/**
 * Match task instances to a bucket based on their due_date or completed_at.
 */
function matchTaskToBucket(task, bucket) {
  const dateStr = task.completed_at || task.due_date;
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  return isWithinInterval(d, { start: bucket.start, end: bucket.end });
}

/**
 * For daily buckets, match to a specific day.
 */
function matchTaskToDay(task, dayDate) {
  const dateStr = task.completed_at || task.due_date;
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  return format(d, "yyyy-MM-dd") === format(dayDate, "yyyy-MM-dd");
}

export default function FrequencyRecordsTab({
  frequency,
  tasks = [],
  siteSettings = {},
  dateRange = {},
  onViewTask,
  onAddComment
}) {
  const [viewMode, setViewMode] = useState("all");
  const [expandedBuckets, setExpandedBuckets] = useState({});

  const now = new Date();
  const rangeStart = dateRange.start ? parseISO(dateRange.start) : subDays(now, 30);
  const rangeEnd = dateRange.end ? parseISO(dateRange.end) : now;

  // Filter tasks to this frequency only
  const freqTasks = useMemo(() => 
    tasks.filter(t => t.frequency?.toLowerCase().trim() === frequency.toLowerCase()),
    [tasks, frequency]
  );

  const masterTasks = useMemo(() => getMasterTasks(tasks, frequency), [tasks, frequency]);

  // Build time buckets
  const buckets = useMemo(() => buildBuckets(frequency, rangeStart, rangeEnd), [frequency, rangeStart, rangeEnd]);

  // For each bucket, compute expected, completed, missed
  const bucketData = useMemo(() => {
    return buckets.map(bucket => {
      const isDaily = frequency === "daily";

      if (isDaily && bucket.days) {
        // Daily: compute per-day within this week bucket
        let weekExpected = 0;
        let weekCompleted = 0;
        let weekMissed = 0;
        const weekAllTasks = [];
        const weekMissedTasks = [];

        const dayBreakdowns = bucket.days.map(day => {
          // Expected: count masters that should run on this day
          const expectedMasters = masterTasks.filter(m => masterRunsOnDay(m, day.dayOfWeek));
          const expected = expectedMasters.length;

          // Find task instances for this day
          const dayTasks = freqTasks.filter(t => matchTaskToDay(t, day.date));

          const completed = dayTasks.filter(t => t.status === "completed" || t.status === "verified");
          const isPast = isBefore(day.date, now);

          // Missed = expected masters that have no completed instance for this day
          const missedMasters = isPast ? expectedMasters.filter(master => {
            return !completed.some(c => c.title === master.title && c.area === master.area);
          }) : [];

          // Build "all" list: completed tasks + missed placeholder tasks
          const allItems = [
            ...completed.map(t => ({ ...t, _status: "completed" })),
            ...missedMasters.map(m => ({
              _status: "missed",
              title: m.title,
              area: m.area,
              key: m.key,
              due_date: format(day.date, "yyyy-MM-dd"),
              missedReason: "overdue",
            })),
          ];

          weekExpected += expected;
          weekCompleted += completed.length;
          weekMissed += missedMasters.length;
          weekAllTasks.push(...allItems);
          weekMissedTasks.push(...missedMasters.map(m => ({
            _status: "missed",
            title: m.title,
            area: m.area,
            due_date: format(day.date, "yyyy-MM-dd"),
            missedReason: "overdue",
          })));

          return {
            ...day,
            expected,
            completed: completed.length,
            missed: missedMasters.length,
            allItems,
            completedTasks: completed,
            missedTasks: missedMasters.map(m => ({
              _status: "missed", title: m.title, area: m.area,
              due_date: format(day.date, "yyyy-MM-dd"), missedReason: "overdue",
            })),
          };
        });

        return {
          ...bucket,
          dayBreakdowns,
          expected: weekExpected,
          completed: weekCompleted,
          missed: weekMissed,
          allTasks: weekAllTasks,
          missedTasks: weekMissedTasks,
        };
      } else {
        // Non-daily: single bucket period
        const expected = masterTasks.length;
        const bucketTasks = freqTasks.filter(t => matchTaskToBucket(t, bucket));
        const completed = bucketTasks.filter(t => t.status === "completed" || t.status === "verified");
        const isPast = isBefore(bucket.end, now);

        const missedMasters = isPast ? masterTasks.filter(master => {
          return !completed.some(c => c.title === master.title && c.area === master.area);
        }) : [];

        const allItems = [
          ...completed.map(t => ({ ...t, _status: "completed" })),
          ...missedMasters.map(m => ({
            _status: "missed", title: m.title, area: m.area, key: m.key,
            due_date: format(bucket.end, "yyyy-MM-dd"), missedReason: "overdue",
          })),
        ];

        return {
          ...bucket,
          expected,
          completed: completed.length,
          missed: missedMasters.length,
          allTasks: allItems,
          missedTasks: missedMasters.map(m => ({
            _status: "missed", title: m.title, area: m.area,
            due_date: format(bucket.end, "yyyy-MM-dd"), missedReason: "overdue",
          })),
        };
      }
    });
  }, [buckets, freqTasks, masterTasks, frequency, now]);

  // Grand totals
  const totals = useMemo(() => {
    let expected = 0, completed = 0, missed = 0;
    bucketData.forEach(b => {
      expected += b.expected;
      completed += b.completed;
      missed += b.missed;
    });
    const rate = expected > 0 ? Math.round((completed / expected) * 100) : 100;
    return { expected, completed, missed, rate };
  }, [bucketData]);

  const toggleBucket = (id) => {
    setExpandedBuckets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const freqLabel = frequency.charAt(0).toUpperCase() + frequency.slice(1);

  // Find the index of the "current" bucket (contains today)
  const currentBucketIndex = useMemo(() => {
    const today = new Date();
    const idx = bucketData.findIndex(b => 
      isWithinInterval(today, { start: b.start, end: b.end })
    );
    return idx >= 0 ? idx : bucketData.length - 1;
  }, [bucketData]);

  const [selectedBucketIndex, setSelectedBucketIndex] = useState(currentBucketIndex);
  const scrollRef = useRef(null);
  const pillRefs = useRef({});

  // Scroll the selected pill into view
  useEffect(() => {
    const el = pillRefs.current[selectedBucketIndex];
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedBucketIndex]);

  // Clamp index
  const safeIndex = Math.min(selectedBucketIndex, bucketData.length - 1);
  const selectedBucket = bucketData[safeIndex];

  const goToPrev = () => setSelectedBucketIndex(i => Math.max(0, i - 1));
  const goToNext = () => setSelectedBucketIndex(i => Math.min(bucketData.length - 1, i + 1));

  return (
    <div className="space-y-4">
      {/* Grand Total Banner */}
      <Card className="border-slate-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-slate-600" />
              <div>
                <h3 className="font-semibold text-slate-900">{freqLabel} Tasks — Total</h3>
                <p className="text-xs text-slate-500">{masterTasks.length} unique scheduled tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-emerald-600">{totals.completed}</div>
                <div className="text-[10px] text-slate-500">Completed</div>
              </div>
              <div className="text-center">
                <div className={cn("font-bold", totals.missed > 0 ? "text-red-600" : "text-slate-400")}>{totals.missed}</div>
                <div className="text-[10px] text-slate-500">Missed</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-slate-700">{totals.expected}</div>
                <div className="text-[10px] text-slate-500">Expected</div>
              </div>
              <div className={cn(
                "text-lg font-bold",
                totals.rate >= 90 ? "text-emerald-600" : totals.rate >= 70 ? "text-amber-600" : "text-red-600"
              )}>
                {totals.rate}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horizontal Period Selector */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={goToPrev} disabled={safeIndex === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div ref={scrollRef} className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 px-1 py-1">
            {bucketData.map((bucket, idx) => {
              const isCurrent = idx === currentBucketIndex;
              const isSelected = idx === safeIndex;
              const rate = bucket.expected > 0 ? Math.round((bucket.completed / bucket.expected) * 100) : 100;
              
              // Short label for the pill
              let shortLabel = bucket.label;
              if (frequency === "daily") {
                // Show "Mar 15 – 21" style
                shortLabel = `${format(bucket.start, "MMM d")} – ${format(bucket.end, "d")}`;
              } else if (frequency === "weekly") {
                shortLabel = `${format(bucket.start, "MMM d")} – ${format(bucket.end, "d")}`;
              } else if (frequency === "monthly") {
                shortLabel = format(bucket.start, "MMM yyyy");
              }

              return (
                <button
                  key={bucket.id}
                  ref={el => pillRefs.current[idx] = el}
                  onClick={() => setSelectedBucketIndex(idx)}
                  className={cn(
                    "flex flex-col items-center px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all shrink-0 border",
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : isCurrent
                      ? "bg-blue-50 text-blue-700 border-blue-300 font-semibold"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <span className="font-medium">{shortLabel}</span>
                  <span className={cn(
                    "text-[10px] mt-0.5",
                    isSelected ? "text-white/70" : "text-slate-500"
                  )}>
                    {bucket.completed}/{bucket.expected}
                  </span>
                  <span className={cn(
                    "text-[10px]",
                    isSelected ? "text-white/70" : rate >= 90 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-red-500"
                  )}>
                    {rate}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={goToNext} disabled={safeIndex >= bucketData.length - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs: All | Missed | Summary */}
      {selectedBucket && (
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList className="bg-white border rounded-full">
            <TabsTrigger value="all" className="rounded-full">All Records</TabsTrigger>
            <TabsTrigger value="missed" className="relative rounded-full">
              Missed
              {selectedBucket.missed > 0 && (
                <Badge className="ml-1.5 bg-red-100 text-red-700 text-xs rounded-full">{selectedBucket.missed}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="summary" className="rounded-full">Summary</TabsTrigger>
          </TabsList>

          {/* ALL RECORDS */}
          <TabsContent value="all" className="mt-4">
            <PeriodBucketCard
              bucket={selectedBucket}
              frequency={frequency}
              expanded={true}
              onToggle={() => {}}
              mode="all"
              onAddComment={onAddComment}
              onViewTask={onViewTask}
              hideHeader={true}
            />
          </TabsContent>

          {/* MISSED ONLY */}
          <TabsContent value="missed" className="mt-4">
            {selectedBucket.missed === 0 ? (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-emerald-700 font-medium">No Missed Tasks</p>
                  <p className="text-emerald-600 text-sm">All scheduled tasks completed this period</p>
                </CardContent>
              </Card>
            ) : (
              <PeriodBucketCard
                bucket={selectedBucket}
                frequency={frequency}
                expanded={true}
                onToggle={() => {}}
                mode="missed"
                onAddComment={onAddComment}
                onViewTask={onViewTask}
                hideHeader={true}
              />
            )}
          </TabsContent>

          {/* SUMMARY */}
          <TabsContent value="summary" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-medium text-slate-900 mb-4">{selectedBucket.label}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Expected</span>
                    <span className="font-medium">{selectedBucket.expected}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Completed</span>
                    <span className="font-medium text-emerald-600">{selectedBucket.completed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Missed</span>
                    <span className={cn("font-medium", selectedBucket.missed > 0 ? "text-red-600" : "text-slate-400")}>{selectedBucket.missed}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm font-medium text-slate-700">Completion Rate</span>
                    {(() => {
                      const r = selectedBucket.expected > 0 ? Math.round((selectedBucket.completed / selectedBucket.expected) * 100) : 100;
                      return (
                        <span className={cn("text-lg font-bold", r >= 90 ? "text-emerald-600" : r >= 70 ? "text-amber-600" : "text-red-600")}>
                          {r}%
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* For daily: show day breakdown table within this week */}
            {frequency === "daily" && selectedBucket.dayBreakdowns && (
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-medium text-slate-900 mb-4">Daily Breakdown</h4>
                  <div className="space-y-2">
                    {selectedBucket.dayBreakdowns.map(day => {
                      const dayRate = day.expected > 0 ? Math.round((day.completed / day.expected) * 100) : 100;
                      return (
                        <div key={day.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700 font-medium">{day.label}</span>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-emerald-600 font-semibold">{day.completed} ✓</span>
                            {day.missed > 0 && <span className="text-red-600 font-semibold">{day.missed} ✗</span>}
                            <span className="text-slate-500">/ {day.expected}</span>
                            <span className={cn("font-bold text-sm w-12 text-right", dayRate >= 90 ? "text-emerald-600" : dayRate >= 70 ? "text-amber-600" : "text-red-600")}>
                              {dayRate}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overall period breakdown table */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-medium text-slate-900 mb-4">All Periods Overview</h4>
                <div className="space-y-2">
                  {bucketData.map((b, idx) => {
                    const r = b.expected > 0 ? Math.round((b.completed / b.expected) * 100) : 100;
                    return (
                      <div 
                        key={b.id} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                          idx === safeIndex ? "bg-slate-200" : "bg-slate-50 hover:bg-slate-100"
                        )}
                        onClick={() => setSelectedBucketIndex(idx)}
                      >
                        <span className="text-sm text-slate-700 font-medium">{b.label}</span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-emerald-600 font-semibold">{b.completed} ✓</span>
                          {b.missed > 0 && <span className="text-red-600 font-semibold">{b.missed} ✗</span>}
                          <span className="text-slate-500">/ {b.expected}</span>
                          <span className={cn("font-bold text-sm w-12 text-right", r >= 90 ? "text-emerald-600" : r >= 70 ? "text-amber-600" : "text-red-600")}>
                            {r}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}