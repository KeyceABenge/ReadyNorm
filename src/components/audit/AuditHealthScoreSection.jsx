import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Shield, TrendingUp, CheckCircle2, Download, Award
} from "lucide-react";
import { format, parseISO, isWithinInterval, eachWeekOfInterval, endOfWeek } from "date-fns";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { cn } from "@/lib/utils";

export default function AuditHealthScoreSection({ metrics, dateRange, tasks, areaSignOffs }) {
  // Calculate weekly health score trends
  const weeklyTrends = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }).map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    const weekTasks = tasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = parseISO(t.completed_at);
      return isWithinInterval(completedDate, { start: weekStart, end: weekEnd });
    });

    const weekDueTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = parseISO(t.due_date);
      return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
    });

    const completionRate = weekDueTasks.length > 0 
      ? Math.round((weekTasks.length / weekDueTasks.length) * 100)
      : 100;

    const weekATP = areaSignOffs.filter(s => {
      if (!s.atp_tested_at || s.atp_test_result === "not_required") return false;
      const testedDate = parseISO(s.atp_tested_at);
      return isWithinInterval(testedDate, { start: weekStart, end: weekEnd });
    });
    const atpPassed = weekATP.filter(s => s.atp_test_result === "pass").length;
    const atpRate = weekATP.length > 0 ? Math.round((atpPassed / weekATP.length) * 100) : 100;

    const score = Math.round((completionRate * 0.5) + (atpRate * 0.5));

    return {
      week: format(weekStart, "MMM d"),
      score,
      completionRate,
      atpRate
    };
  });

  const exportHealthReport = () => {
    const csvContent = `Sanitation Health Score Report\nGenerated: ${format(new Date(), "yyyy-MM-dd HH:mm")}\nPeriod: ${format(dateRange.start, "yyyy-MM-dd")} to ${format(dateRange.end, "yyyy-MM-dd")}\n\nOVERALL METRICS\nHealth Score,${metrics.healthScore}\nTask Completion Rate,${metrics.completionRate}%\nATP Pass Rate,${metrics.atpPassRate}%\nTraining Coverage,${metrics.trainingCoverage}%\nVerification Rate,${metrics.verificationRate}%\n\nWEEKLY TRENDS\nWeek,Health Score,Completion Rate,ATP Rate\n${weeklyTrends.map(w => `${w.week},${w.score},${w.completionRate}%,${w.atpRate}%`).join('\n')}`;
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health_score_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Sanitation Program Overview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {format(dateRange.start, "MMMM d, yyyy")} - {format(dateRange.end, "MMMM d, yyyy")}
          </p>
        </div>
        <Button variant="outline" onClick={exportHealthReport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Main Health Score Card */}
      <Card className={cn(
        "border-2",
        metrics.healthScore >= 85 ? "border-emerald-300 bg-emerald-50" :
        metrics.healthScore >= 70 ? "border-amber-300 bg-amber-50" :
        "border-rose-300 bg-rose-50"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Overall Sanitation Health Score</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={cn(
                  "text-5xl font-bold",
                  metrics.healthScore >= 85 ? "text-emerald-600" :
                  metrics.healthScore >= 70 ? "text-amber-600" :
                  "text-rose-600"
                )}>
                  {metrics.healthScore}
                </span>
                <span className="text-2xl text-slate-500">/100</span>
              </div>
              <Badge variant="default" className={cn(
                "mt-3",
                metrics.healthScore >= 85 ? "bg-emerald-600" :
                metrics.healthScore >= 70 ? "bg-amber-600" :
                "bg-rose-600"
              )}>
                {metrics.healthScore >= 85 ? "Excellent" :
                 metrics.healthScore >= 70 ? "Good" :
                 metrics.healthScore >= 50 ? "Needs Improvement" : "Critical"}
              </Badge>
            </div>
            
            <div className="text-right">
              <Award className={cn(
                "w-20 h-20",
                metrics.healthScore >= 85 ? "text-emerald-500" :
                metrics.healthScore >= 70 ? "text-amber-500" :
                "text-rose-500"
              )} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Components */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreComponent 
          label="Task Completion" 
          value={metrics.completionRate} 
          detail={`${metrics.completedTasks} of ${metrics.totalTasks} tasks`}
          weight="30%"
        />
        <ScoreComponent 
          label="ATP Pass Rate" 
          value={metrics.atpPassRate} 
          detail={`${metrics.atpTests} tests conducted`}
          weight="25%"
        />
        <ScoreComponent 
          label="Training Coverage" 
          value={metrics.trainingCoverage} 
          detail={`${metrics.activeEmployees} active employees`}
          weight="20%"
        />
        <ScoreComponent 
          label="Verification Rate" 
          value={metrics.verificationRate} 
          detail={`${metrics.verifiedTasks} verified records`}
          weight="15%"
        />
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Health Score Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => [`${value}%`, name === "score" ? "Health Score" : name]}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4f46e5" 
                  fill="#4f46e5" 
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Statement */}
      <Card className="bg-slate-900 text-white">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Compliance Statement</h3>
              <p className="text-slate-300 leading-relaxed">
                This sanitation program demonstrates active monitoring, systematic verification, 
                and continuous improvement practices. All records are timestamped and immutable, 
                providing a complete audit trail from task assignment through completion and verification.
                The program covers {metrics.activeEmployees} trained employees, {metrics.totalTasks} scheduled 
                sanitation tasks, and includes ATP verification testing to validate cleaning effectiveness.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreComponent({ label, value, detail, weight }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <Badge variant="outline" className="text-xs">{weight} weight</Badge>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className={cn(
            "text-3xl font-bold",
            value >= 90 ? "text-emerald-600" :
            value >= 70 ? "text-amber-600" :
            "text-rose-600"
          )}>
            {value}
          </span>
          <span className="text-slate-500">%</span>
        </div>
        {/* @ts-ignore */}
        <Progress 
          value={value} 
          className={cn(
            "h-2",
            value >= 90 ? "[&>div]:bg-emerald-500" :
            value >= 70 ? "[&>div]:bg-amber-500" :
            "[&>div]:bg-rose-500"
          )}
        />
        <p className="text-xs text-slate-500 mt-2">{detail}</p>
      </CardContent>
    </Card>
  );
}