import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInDays, subWeeks, format, parseISO } from "date-fns";

export default function PerformanceScoresCard({ scores, expectedTasks = {}, lineAssignments = [], areaSignOffs = [] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const now = new Date();

  const calculatePredictedScores = (refDate = now) => {
    // For each period, calculate how much time has elapsed and predict final score
    const predictions = {};
    
    // Week prediction
    const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
    const weekElapsed = differenceInDays(refDate, weekStart) + 1;
    const weekTotal = differenceInDays(weekEnd, weekStart) + 1;
    const weekProgress = weekElapsed / weekTotal;
    predictions.week = weekProgress < 1 ? Math.min(100, Math.round((scores.week / weekProgress))) : scores.week;

    // Month prediction
    const monthStart = startOfMonth(refDate);
    const monthEnd = endOfMonth(refDate);
    const monthElapsed = differenceInDays(refDate, monthStart) + 1;
    const monthTotal = differenceInDays(monthEnd, monthStart) + 1;
    const monthProgress = monthElapsed / monthTotal;
    predictions.month = monthProgress < 1 ? Math.min(100, Math.round((scores.month / monthProgress))) : scores.month;

    // Quarter prediction
    const quarterStart = startOfQuarter(refDate);
    const quarterEnd = endOfQuarter(refDate);
    const quarterElapsed = differenceInDays(refDate, quarterStart) + 1;
    const quarterTotal = differenceInDays(quarterEnd, quarterStart) + 1;
    const quarterProgress = quarterElapsed / quarterTotal;
    predictions.quarter = quarterProgress < 1 ? Math.min(100, Math.round((scores.quarter / quarterProgress))) : scores.quarter;

    // Year prediction
    const yearStart = startOfYear(refDate);
    const yearEnd = endOfYear(refDate);
    const yearElapsed = differenceInDays(refDate, yearStart) + 1;
    const yearTotal = differenceInDays(yearEnd, yearStart) + 1;
    const yearProgress = yearElapsed / yearTotal;
    predictions.year = yearProgress < 1 ? Math.min(100, Math.round((scores.year / yearProgress))) : scores.year;

    return predictions;
  };

  const predictions = calculatePredictedScores(viewDate);
  const isCurrentPeriod = differenceInDays(viewDate, now) >= 0;

  const periods = [
    { key: "shift", label: "Shift", short: "SHI" },
    { key: "day", label: "Day", short: "DAY" },
    { key: "week", label: "Week", short: "WK" },
    { key: "month", label: "Month", short: "MO" },
    { key: "quarter", label: "Quarter", short: "QT" },
    { key: "year", label: "Year", short: "YR" }
  ];

  const getScoreStatus = (score) => {
    if (score >= 95) return { color: "#059669", label: "Excellent", bg: "#ecfdf5" };
    if (score >= 85) return { color: "#0891b2", label: "Good", bg: "#ecf0ff" };
    if (score >= 70) return { color: "#f59e0b", label: "Fair", bg: "#fef3c7" };
    return { color: "#dc2626", label: "Needs Work", bg: "#fee2e2" };
  };

  // Line Cleaning Performance - calculate from assignments and sign-offs
  const getLineCleaningPerformance = () => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    
    const weekAssignments = lineAssignments.filter(a => {
      if (!a.scheduled_date) return false;
      try {
        const d = parseISO(a.scheduled_date);
        return d >= weekStart && d <= now;
      } catch { return false; }
    });

    const completedAssignments = weekAssignments.filter(a => a.status === "completed");
    const totalAssignments = weekAssignments.length;
    
    // Count sign-offs that passed inspection this week
    const weekSignOffs = areaSignOffs.filter(s => {
      if (!s.signed_off_at) return false;
      try {
        const d = parseISO(s.signed_off_at);
        return d >= weekStart && d <= now;
      } catch { return false; }
    });
    
    const passedSignOffs = weekSignOffs.filter(s => s.status === "passed_inspection").length;
    const totalSignOffs = weekSignOffs.length;
    const passRate = totalSignOffs > 0 ? Math.round((passedSignOffs / totalSignOffs) * 100) : 0;

    return {
      completedAssignments: completedAssignments.length,
      totalAssignments,
      completionRate: totalAssignments > 0 ? Math.round((completedAssignments.length / totalAssignments) * 100) : 0,
      passedSignOffs,
      totalSignOffs,
      passRate
    };
  };

  const linePerf = getLineCleaningPerformance();
  const linePerfStatus = getScoreStatus(linePerf.completionRate);

  return (
    <div className="space-y-2 md:space-y-4">
      {/* Period Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs md:text-sm font-semibold text-slate-900">Performance Across Periods</p>
          <div className="hidden md:flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setViewDate(subWeeks(viewDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 w-32 text-center">
              {format(viewDate, "MMM d, yyyy")}
            </span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setViewDate(subWeeks(viewDate, -1))}
              disabled={isCurrentPeriod}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1 md:gap-2">
          {periods.map(({ key, label, short }) => {
            const completed = scores[`${key}Completed`] || 0;
            const total = scores[`${key}Total`] || expectedTasks[key] || 0;
            const score = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
            const predicted = predictions[key] || score;
            const periodStatus = getScoreStatus(score);
            const predictedStatus = getScoreStatus(predicted);
            const showPrediction = ["week", "month", "quarter", "year"].includes(key) && score !== predicted;
            
            return (
              <div 
                key={key}
                className="relative"
              >
                <div 
                  className="p-1.5 md:p-3 rounded-lg border md:border-2 text-center transition-all hover:shadow-md cursor-default min-h-[60px] md:min-h-[100px] flex flex-col justify-center overflow-hidden"
                  style={{
                    backgroundColor: periodStatus.bg,
                    borderColor: periodStatus.color
                  }}
                >
                  <div className="text-sm md:text-xl font-bold truncate" style={{ color: periodStatus.color }}>
                    {score}%
                  </div>
                  {total > 0 && (
                    <div className="text-[9px] md:text-xs text-slate-600 truncate">
                      {completed}/{total}
                    </div>
                  )}
                  <div className="hidden md:block h-4 overflow-hidden">
                    {showPrediction && (
                      <div className="text-[10px] font-medium truncate" style={{ color: predictedStatus.color }}>
                        Pred: {predicted}%
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] md:text-xs font-medium text-slate-600 truncate">{short}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] md:text-xs text-slate-500 mt-2 hidden md:block">
          <Zap className="w-3 h-3 inline mr-1" />
          Badges show predicted final scores based on current pace
        </p>
      </div>

      {/* Line Cleaning Performance */}
      <Card className="p-2 md:p-4 border md:border-2 transition-all" style={{ backgroundColor: linePerfStatus.bg, borderColor: linePerfStatus.color }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] md:text-xs font-semibold mb-1" style={{ color: linePerfStatus.color }}>LINE CLEANING PERFORMANCE</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-base md:text-2xl font-bold" style={{ color: linePerfStatus.color }}>
                {linePerf.completedAssignments}/{linePerf.totalAssignments}
              </p>
              <span className="text-[10px] md:text-xs text-slate-600">
                lines completed
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[9px] md:text-xs text-slate-600">
                {linePerf.completionRate}% completion
              </span>
              <span className="text-[9px] md:text-xs text-slate-400">•</span>
              <span className="text-[9px] md:text-xs text-slate-600">
                {linePerf.passedSignOffs}/{linePerf.totalSignOffs} sign-offs passed ({linePerf.passRate}%)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 md:w-14 md:h-14 relative flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={linePerfStatus.color} strokeWidth="8" strokeDasharray={`${(linePerf.completionRate / 100) * 283} 283`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[8px] md:text-xs font-bold" style={{ color: linePerfStatus.color }}>{linePerf.completionRate}%</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}