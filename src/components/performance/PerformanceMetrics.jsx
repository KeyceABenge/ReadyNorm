import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, CheckCircle2, Clock, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PerformanceMetrics({ employee, tasks, signOffs, goals }) {
  // Calculate on-time completion rate
  const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "verified");
  const onTimeCompletions = completedTasks.filter(t => {
    if (!t.completed_at || !t.due_date) return false;
    return new Date(t.completed_at) <= new Date(t.due_date);
  });
  const onTimeRate = completedTasks.length > 0 
    ? Math.round((onTimeCompletions.length / completedTasks.length) * 100) 
    : 0;

  // Calculate ATP compliance
  const atpTests = signOffs.filter(s => s.atp_test_result && s.atp_test_result !== "not_required");
  const passedAtpTests = atpTests.filter(s => s.atp_test_result === "pass");
  const atpCompliance = atpTests.length > 0 
    ? Math.round((passedAtpTests.length / atpTests.length) * 100) 
    : 100;

  // Calculate efficiency (avg hours per task)
  const totalHours = signOffs.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
  const avgHoursPerTask = signOffs.length > 0 
    ? (totalHours / signOffs.length).toFixed(1) 
    : 0;

  // Calculate overall completion rate
  const allAssignedTasks = tasks.length;
  const completionRate = allAssignedTasks > 0 
    ? Math.round((completedTasks.length / allAssignedTasks) * 100) 
    : 0;

  const metrics = [
    {
      title: "On-Time Completion",
      value: `${onTimeRate}%`,
      icon: Clock,
      color: onTimeRate >= 90 ? "text-emerald-600" : onTimeRate >= 75 ? "text-amber-600" : "text-rose-600",
      bgColor: onTimeRate >= 90 ? "bg-emerald-50" : onTimeRate >= 75 ? "bg-amber-50" : "bg-rose-50",
      trend: onTimeRate >= 90 ? "up" : "down"
    },
    {
      title: "ATP Compliance",
      value: `${atpCompliance}%`,
      icon: Droplet,
      color: atpCompliance >= 95 ? "text-emerald-600" : atpCompliance >= 85 ? "text-amber-600" : "text-rose-600",
      bgColor: atpCompliance >= 95 ? "bg-emerald-50" : atpCompliance >= 85 ? "bg-amber-50" : "bg-rose-50",
      trend: atpCompliance >= 95 ? "up" : "down"
    },
    {
      title: "Task Completion",
      value: `${completionRate}%`,
      icon: CheckCircle2,
      color: completionRate >= 90 ? "text-emerald-600" : completionRate >= 75 ? "text-amber-600" : "text-rose-600",
      bgColor: completionRate >= 90 ? "bg-emerald-50" : completionRate >= 75 ? "bg-amber-50" : "bg-rose-50",
      trend: completionRate >= 90 ? "up" : "down"
    },
    {
      title: "Avg Hours/Task",
      value: avgHoursPerTask,
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: null
    }
  ];

  // Active goals progress
  const activeGoals = goals?.filter(g => g.status === "active") || [];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className={cn("p-2 rounded-lg w-fit mb-3", metric.bgColor)}>
                <metric.icon className={cn("w-5 h-5", metric.color)} />
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{metric.value}</p>
              <p className="text-sm text-slate-600">{metric.title}</p>
              {metric.trend && (
                <div className="flex items-center gap-1 mt-2">
                  {metric.trend === "up" ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-rose-600" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    metric.trend === "up" ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {metric.trend === "up" ? "Excellent" : "Needs Improvement"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Performance Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeGoals.map(goal => {
                const progress = goal.target_value > 0 
                  ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                  : 0;
                const isOnTrack = progress >= 75;

                return (
                  <div key={goal.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">{goal.title}</h4>
                        <p className="text-sm text-slate-600">{goal.description}</p>
                      </div>
                      <Badge className={isOnTrack ? "bg-emerald-600" : "bg-amber-500"}>
                        {progress}%
                      </Badge>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          isOnTrack ? "bg-emerald-600" : "bg-amber-500"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Current: {goal.current_value} / Target: {goal.target_value}</span>
                      <span>Due: {goal.end_date ? new Date(goal.end_date).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}