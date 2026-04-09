import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight, Shield, CheckCircle2, AlertTriangle } from "lucide-react";
import { format, parseISO, isWithinInterval, endOfDay, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Compact narrative preview widget for the Overview dashboard
 */
export default function NarrativePreview({
  tasks = [],
  areaSignOffs = [],
  drainCleaningRecords = [],
  rainDiverters = [],
  onNavigate
}) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfDay(now);

  // Calculate quick summary metrics for current week
  const summary = useMemo(() => {
    const workTasks = tasks.filter(t => !t.is_group);
    
    const completedThisWeek = workTasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = parseISO(t.completed_at);
      return isWithinInterval(completedDate, { start: weekStart, end: weekEnd });
    }).length;

    const dueThisWeek = workTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = parseISO(t.due_date);
      return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
    }).length;

    const completionRate = dueThisWeek > 0 ? Math.round((completedThisWeek / dueThisWeek) * 100) : 100;

    // ATP metrics
    const atpTests = areaSignOffs.filter(s => {
      if (!s.atp_tested_at || !s.atp_test_result || s.atp_test_result === "not_required") return false;
      const testedDate = parseISO(s.atp_tested_at);
      return isWithinInterval(testedDate, { start: weekStart, end: weekEnd });
    });
    const atpPassed = atpTests.filter(s => s.atp_test_result === "pass").length;
    const atpPassRate = atpTests.length > 0 ? Math.round((atpPassed / atpTests.length) * 100) : 100;

    // Overdue
    const overdue = workTasks.filter(t => {
      if (t.status === "completed" || t.status === "verified") return false;
      if (!t.due_date) return false;
      return parseISO(t.due_date) < now;
    }).length;

    // Wet diverters
    const wetDiverters = rainDiverters.filter(d => d.status === "active" && d.last_finding === "wet").length;

    // Health score approximation
    const healthScore = Math.round(
      (completionRate * 0.4) +
      (atpPassRate * 0.3) +
      (Math.max(0, 100 - overdue * 10) * 0.2) +
      (Math.max(0, 100 - wetDiverters * 15) * 0.1)
    );

    // Generate quick headline
    let headline = "";
    if (healthScore >= 90) {
      headline = "Strong sanitation performance this week";
    } else if (healthScore >= 75) {
      headline = "Solid progress with minor areas to address";
    } else if (healthScore >= 60) {
      headline = "Several areas need attention this week";
    } else {
      headline = "Immediate action required on multiple fronts";
    }

    // Key highlight
    let highlight = "";
    if (completionRate >= 95 && atpPassRate >= 95) {
      highlight = `Maintained ${completionRate}% task completion with ${atpPassRate}% ATP first-pass rate`;
    } else if (overdue === 0) {
      highlight = "Zero overdue tasks - schedule fully on track";
    } else if (atpPassRate >= 95) {
      highlight = `Excellent ATP testing with ${atpPassRate}% pass rate`;
    } else if (completionRate >= 90) {
      highlight = `${completedThisWeek} tasks completed this week (${completionRate}% rate)`;
    } else {
      highlight = `${completedThisWeek} tasks completed, ${overdue} overdue items need attention`;
    }

    return {
      healthScore,
      completionRate,
      atpPassRate,
      overdue,
      wetDiverters,
      headline,
      highlight,
      period: `Week of ${format(weekStart, "MMM d")}`
    };
  }, [tasks, areaSignOffs, rainDiverters, weekStart, weekEnd]);

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span className="text-xs font-medium text-indigo-600 truncate">{summary.period} Summary</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5 leading-tight line-clamp-1">{summary.headline}</h3>
            <p className="text-xs text-slate-600 leading-snug line-clamp-1">{summary.highlight}</p>
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={cn(
                "text-[10px] px-1.5 py-0 flex-shrink-0",
                summary.healthScore >= 85 ? "bg-emerald-100 text-emerald-700" :
                summary.healthScore >= 70 ? "bg-amber-100 text-amber-700" :
                "bg-rose-100 text-rose-700"
              )}>
                <Shield className="w-2.5 h-2.5 mr-0.5" />
                {summary.healthScore}/100
              </Badge>
              
              {summary.overdue > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-rose-300 text-rose-700 flex-shrink-0">
                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                  {summary.overdue} overdue
                </Badge>
              )}
              
              {summary.overdue === 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-700 flex-shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                  On track
                </Badge>
              )}
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-shrink-0 border-indigo-300 text-indigo-700 hover:bg-indigo-100 text-xs h-7 px-2"
            onClick={() => onNavigate?.("analytics")}
          >
            Full Report
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}