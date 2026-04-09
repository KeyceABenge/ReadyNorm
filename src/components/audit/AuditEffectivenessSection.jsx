import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target, Download, TrendingUp, CheckCircle2,
  RefreshCw, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { cn } from "@/lib/utils";

export default function AuditEffectivenessSection({
  tasks,
  areaSignOffs,
  drainCleaningRecords,
  diverterInspections,
  competencyEvaluations,
  dateRange
}) {
  // Calculate month-over-month trends
  const monthlyTrends = useMemo(() => {
    const months = [];
    let current = startOfMonth(dateRange.start);
    const endDate = endOfMonth(dateRange.end);
    
    while (current <= endDate) {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);
      
      const monthTasks = tasks.filter(t => {
        if (!t.completed_at) return false;
        const completedDate = parseISO(t.completed_at);
        return isWithinInterval(completedDate, { start: monthStart, end: monthEnd });
      });

      const monthDueTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        const dueDate = parseISO(t.due_date);
        return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
      });

      const completionRate = monthDueTasks.length > 0 
        ? Math.round((monthTasks.length / monthDueTasks.length) * 100)
        : 100;

      const monthATP = areaSignOffs.filter(s => {
        if (!s.atp_tested_at || s.atp_test_result === "not_required") return false;
        const testedDate = parseISO(s.atp_tested_at);
        return isWithinInterval(testedDate, { start: monthStart, end: monthEnd });
      });
      const atpPassed = monthATP.filter(s => s.atp_test_result === "pass").length;
      const atpRate = monthATP.length > 0 ? Math.round((atpPassed / monthATP.length) * 100) : 100;

      const drainIssues = drainCleaningRecords.filter(r => {
        if (!r.cleaned_at || !r.issues_found) return false;
        const cleanedDate = parseISO(r.cleaned_at);
        return isWithinInterval(cleanedDate, { start: monthStart, end: monthEnd });
      }).length;

      months.push({
        month: format(current, "MMM yy"),
        completionRate,
        atpRate,
        drainIssues,
        tasksCompleted: monthTasks.length
      });
      
      current = new Date(current.setMonth(current.getMonth() + 1));
    }
    
    return months;
  }, [tasks, areaSignOffs, drainCleaningRecords, dateRange]);

  // Calculate improvements
  const improvements = useMemo(() => {
    const items = [];
    
    if (monthlyTrends.length >= 2) {
      const first = monthlyTrends[0];
      const last = monthlyTrends[monthlyTrends.length - 1];
      
      const completionDiff = last.completionRate - first.completionRate;
      if (completionDiff !== 0) {
        items.push({
          metric: "Task Completion Rate",
          change: completionDiff,
          from: first.completionRate,
          to: last.completionRate,
          improved: completionDiff > 0
        });
      }

      const atpDiff = last.atpRate - first.atpRate;
      if (atpDiff !== 0) {
        items.push({
          metric: "ATP Pass Rate",
          change: atpDiff,
          from: first.atpRate,
          to: last.atpRate,
          improved: atpDiff > 0
        });
      }

      const drainDiff = last.drainIssues - first.drainIssues;
      if (drainDiff !== 0) {
        items.push({
          metric: "Drain Issues",
          change: drainDiff,
          from: first.drainIssues,
          to: last.drainIssues,
          improved: drainDiff < 0
        });
      }
    }
    
    return items;
  }, [monthlyTrends]);

  // Closed-loop examples
  const closedLoopExamples = useMemo(() => {
    const examples = [];

    // Find competency improvements after coaching
    const coachingCases = competencyEvaluations.filter(e => e.result === "needs_coaching");
    const reEvaluations = competencyEvaluations.filter(e => 
      (e.status === "competent" || e.result === "pass") &&
      coachingCases.some(c => c.employee_id === e.employee_id && c.training_id === e.training_id)
    );
    
    if (reEvaluations.length > 0) {
      examples.push({
        type: "competency",
        title: "Competency Improvements Through Coaching",
        description: `${reEvaluations.length} employee(s) achieved competency certification after targeted coaching intervention`,
        impact: "Reduced non-conformance risk through verified skill development"
      });
    }

    // Find drain issues resolved
    const issuesDrains = drainCleaningRecords.filter(r => r.issues_found);
    const resolvedDrains = new Set();
    issuesDrains.forEach(issue => {
      const laterCleanings = drainCleaningRecords.filter(r => 
        r.drain_id === issue.drain_id && 
        !r.issues_found && 
        new Date(r.cleaned_at) > new Date(issue.cleaned_at)
      );
      if (laterCleanings.length > 0) {
        resolvedDrains.add(issue.drain_id);
      }
    });

    if (resolvedDrains.size > 0) {
      examples.push({
        type: "drain",
        title: "Drain Issues Identified and Resolved",
        description: `${resolvedDrains.size} drain location(s) with issues were addressed and subsequently passed inspection`,
        impact: "Prevented repeat failures through corrective action tracking"
      });
    }

    // Diverter dry streaks
    const dryDiverters = diverterInspections.filter(i => i.finding === "dry");
    if (dryDiverters.length > 0) {
      examples.push({
        type: "diverter",
        title: "Rain Diverter Control Maintained",
        description: `${dryDiverters.length} dry inspections recorded, demonstrating effective leak prevention`,
        impact: "Sustained environmental control through regular monitoring"
      });
    }

    return examples;
  }, [competencyEvaluations, drainCleaningRecords, diverterInspections]);

  const exportEffectivenessReport = () => {
    const csvContent = `Effectiveness & Continuous Improvement Report\nGenerated: ${format(new Date(), "yyyy-MM-dd HH:mm")}\nPeriod: ${format(dateRange.start, "yyyy-MM-dd")} to ${format(dateRange.end, "yyyy-MM-dd")}\n\nMONTHLY TRENDS\nMonth,Completion Rate,ATP Pass Rate,Drain Issues,Tasks Completed\n${monthlyTrends.map(m => `${m.month},${m.completionRate}%,${m.atpRate}%,${m.drainIssues},${m.tasksCompleted}`).join('\n')}\n\nIMPROVEMENTS\nMetric,From,To,Change\n${improvements.map(i => `${i.metric},${i.from}%,${i.to}%,${i.change > 0 ? '+' : ''}${i.change}%`).join('\n')}\n\nCLOSED-LOOP ACTIONS\n${closedLoopExamples.map(e => `${e.title}\n${e.description}\nImpact: ${e.impact}`).join('\n\n')}`;
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `effectiveness_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-600" />
            Effectiveness & Continuous Improvement
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Closed-loop actions and trend analysis
          </p>
        </div>
        <Button variant="outline" onClick={exportEffectivenessReport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Improvement Summary */}
      {improvements.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {improvements.map((item, idx) => (
            <Card key={idx} className={cn(
              "border-2",
              item.improved ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">{item.metric}</span>
                  {item.improved ? (
                    <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-rose-600" />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    "text-2xl font-bold",
                    item.improved ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {item.change > 0 ? "+" : ""}{item.change}
                    {item.metric.includes("Issues") ? "" : "%"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {item.from}{item.metric.includes("Issues") ? "" : "%"} → {item.to}{item.metric.includes("Issues") ? "" : "%"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trend Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="completionRate" 
                    name="Completion %" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="atpRate" 
                    name="ATP Pass %" 
                    stroke="#059669" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Task Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="tasksCompleted" name="Tasks Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Closed-Loop Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-600" />
            Closed-Loop Improvements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {closedLoopExamples.length > 0 ? (
            <div className="space-y-4">
              {closedLoopExamples.map((example, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-slate-900">{example.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{example.description}</p>
                      <p className="text-xs text-purple-600 mt-2 font-medium">{example.impact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">
              No closed-loop improvements identified in the selected period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Continuous Improvement Statement */}
      <Card className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Target className="w-8 h-8 text-indigo-300 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Continuous Improvement Commitment</h3>
              <p className="text-indigo-200 leading-relaxed">
                This sanitation program demonstrates a commitment to continuous improvement through:
                systematic monitoring and trend analysis, closed-loop corrective actions with verification,
                competency-based training with re-evaluation, and proactive risk identification and mitigation.
                All improvements are documented, timestamped, and traceable to specific actions and responsible parties.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}