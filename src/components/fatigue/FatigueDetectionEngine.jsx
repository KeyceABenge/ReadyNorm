// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle, Heart, TrendingDown, Clock, Users, Brain,
  ShieldAlert, Target, RefreshCw, ChevronDown, ChevronRight, Activity, UserMinus, Scale,
  MessageCircle, CheckCircle2, Timer, BarChart3
} from "lucide-react";
import { differenceInHours, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import CoachingActionButton from "@/components/coaching/CoachingActionButton";
import AskMeWhyButton from "@/components/explainer/AskMeWhyButton";

const FATIGUE_INDICATORS = {
  sustained_quota_pressure: {
    label: "Sustained Quota Pressure",
    icon: Target,
    description: "Consistently high workload over extended period",
    weight: 1.5
  },
  late_signoffs: {
    label: "Late/Retrospective Sign-offs",
    icon: Clock,
    description: "Tasks completed after deadline or signed off late",
    weight: 1.3
  },
  declining_performance: {
    label: "Declining Training/Quiz Performance",
    icon: TrendingDown,
    description: "Drop in training completion or quiz scores",
    weight: 1.2
  },
  task_avoidance: {
    label: "Task Avoidance Patterns",
    icon: UserMinus,
    description: "Skipping certain task types or areas",
    weight: 1.4
  },
  rushed_completions: {
    label: "Rushed Task Completions",
    icon: Timer,
    description: "Tasks completed faster than expected with low verification",
    weight: 1.3
  },
  workload_imbalance: {
    label: "Workload Imbalance",
    icon: Scale,
    description: "Uneven task distribution across team",
    weight: 1.1
  }
};

const RISK_LEVELS = {
  critical: { label: "Critical", color: "bg-rose-100 text-rose-700 border-rose-200", iconColor: "text-rose-600" },
  high: { label: "High", color: "bg-orange-100 text-orange-700 border-orange-200", iconColor: "text-orange-600" },
  moderate: { label: "Moderate", color: "bg-amber-100 text-amber-700 border-amber-200", iconColor: "text-amber-600" },
  low: { label: "Low", color: "bg-emerald-100 text-emerald-700 border-emerald-200", iconColor: "text-emerald-600" }
};

export default function FatigueDetectionEngine({
  tasks = [],
  employees = [],
  employeeSessions = [],
  employeeTrainings = [],
  competencyEvaluations = [],
  areaSignOffs = [],
  siteSettings = {},
  organizationId
}) {
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Analyze fatigue indicators for each employee
  const analyzeEmployee = (employee) => {
    const now = new Date();
    const last30Days = subDays(now, 30);
    const last7Days = subDays(now, 7);
    
    const indicators = [];
    let totalScore = 0;

    // Get employee's tasks
    const employeeTasks = tasks.filter(t => t.assigned_to === employee.email && !t.is_group);
    const completedTasks = employeeTasks.filter(t => t.status === "completed" || t.status === "verified");
    const recentCompletedTasks = completedTasks.filter(t => 
      t.completed_at && new Date(t.completed_at) >= last30Days
    );

    // 1. SUSTAINED QUOTA PRESSURE
    const currentPendingTasks = employeeTasks.filter(t => 
      t.status === "pending" || t.status === "in_progress"
    ).length;
    const quotaThreshold = siteSettings.task_quotas?.daily || 8;
    const quotaPressureRatio = currentPendingTasks / Math.max(1, quotaThreshold);
    
    if (quotaPressureRatio > 1.5) {
      const severity = quotaPressureRatio > 2 ? 30 : quotaPressureRatio > 1.7 ? 20 : 15;
      indicators.push({
        type: "sustained_quota_pressure",
        severity,
        detail: `${currentPendingTasks} pending tasks (${Math.round(quotaPressureRatio * 100)}% of quota)`,
        recommendation: "Consider redistributing tasks to other team members or temporarily reducing assignments"
      });
      totalScore += severity * FATIGUE_INDICATORS.sustained_quota_pressure.weight;
    }

    // 2. LATE/RETROSPECTIVE SIGN-OFFS
    const lateSignoffs = recentCompletedTasks.filter(t => {
      if (!t.due_date || !t.completed_at) return false;
      const dueDate = new Date(t.due_date);
      const completedDate = new Date(t.completed_at);
      // Consider late if completed more than 4 hours after due
      return differenceInHours(completedDate, dueDate) > 4;
    });
    const lateRatio = recentCompletedTasks.length > 0 
      ? lateSignoffs.length / recentCompletedTasks.length 
      : 0;

    if (lateRatio > 0.2) {
      const severity = lateRatio > 0.5 ? 25 : lateRatio > 0.35 ? 18 : 12;
      indicators.push({
        type: "late_signoffs",
        severity,
        detail: `${Math.round(lateRatio * 100)}% of tasks signed off late (${lateSignoffs.length} of ${recentCompletedTasks.length})`,
        recommendation: "Check if start times are realistic or if there are blockers causing delays"
      });
      totalScore += severity * FATIGUE_INDICATORS.late_signoffs.weight;
    }

    // 3. DECLINING TRAINING/QUIZ PERFORMANCE
    const employeeTrainingRecords = employeeTrainings.filter(t => t.employee_id === employee.id);
    const recentTrainings = employeeTrainingRecords.filter(t => 
      t.completed_at && new Date(t.completed_at) >= last30Days
    );
    const failedQuizzes = recentTrainings.filter(t => 
      t.quiz_score !== undefined && t.quiz_score < 70
    );
    
    if (failedQuizzes.length > 0 || (employeeTrainingRecords.length > 0 && recentTrainings.length === 0)) {
      const severity = failedQuizzes.length > 2 ? 20 : failedQuizzes.length > 0 ? 15 : 10;
      indicators.push({
        type: "declining_performance",
        severity,
        detail: failedQuizzes.length > 0 
          ? `${failedQuizzes.length} quiz failure(s) in past 30 days`
          : "No training activity in past 30 days",
        recommendation: "Schedule 1-on-1 to identify knowledge gaps or comprehension issues"
      });
      totalScore += severity * FATIGUE_INDICATORS.declining_performance.weight;
    }

    // 4. TASK AVOIDANCE PATTERNS
    const tasksByArea = {};
    const completedByArea = {};
    employeeTasks.forEach(t => {
      const area = t.area || "Unknown";
      tasksByArea[area] = (tasksByArea[area] || 0) + 1;
      if (t.status === "completed" || t.status === "verified") {
        completedByArea[area] = (completedByArea[area] || 0) + 1;
      }
    });
    
    const avoidedAreas = Object.entries(tasksByArea)
      .filter(([area, count]) => {
        const completed = completedByArea[area] || 0;
        return count >= 3 && (completed / count) < 0.3;
      })
      .map(([area]) => area);

    if (avoidedAreas.length > 0) {
      const severity = avoidedAreas.length > 2 ? 25 : avoidedAreas.length > 1 ? 18 : 12;
      indicators.push({
        type: "task_avoidance",
        severity,
        detail: `Low completion in: ${avoidedAreas.slice(0, 3).join(", ")}`,
        recommendation: "Discuss barriers with employee - may need additional training or equipment"
      });
      totalScore += severity * FATIGUE_INDICATORS.task_avoidance.weight;
    }

    // 5. RUSHED COMPLETIONS
    const tasksWithDuration = recentCompletedTasks.filter(t => t.duration && t.completed_at);
    const rushedTasks = tasksWithDuration.filter(t => {
      // If completed in less than 50% of expected duration, consider rushed
      // Note: This is a heuristic - actual duration tracking would be more accurate
      return t.duration && t.duration > 30; // Only check tasks > 30 min expected
    });
    
    // Check for sign-offs without signatures (low verification confidence)
    const unsignedCompletions = recentCompletedTasks.filter(t => 
      !t.signature_data && (t.status === "completed" || t.status === "verified")
    );
    const unsignedRatio = recentCompletedTasks.length > 0 
      ? unsignedCompletions.length / recentCompletedTasks.length 
      : 0;

    if (unsignedRatio > 0.4) {
      const severity = unsignedRatio > 0.7 ? 22 : unsignedRatio > 0.5 ? 15 : 10;
      indicators.push({
        type: "rushed_completions",
        severity,
        detail: `${Math.round(unsignedRatio * 100)}% of completions without signature verification`,
        recommendation: "Reinforce importance of proper sign-off procedures"
      });
      totalScore += severity * FATIGUE_INDICATORS.rushed_completions.weight;
    }

    // 6. WORKLOAD IMBALANCE (calculated at team level but shown per employee)
    const activeEmployees = employees.filter(e => e.status === "active");
    const avgTasksPerEmployee = tasks.filter(t => !t.is_group && (t.status === "pending" || t.status === "in_progress")).length / Math.max(1, activeEmployees.length);
    const employeeTaskRatio = currentPendingTasks / Math.max(1, avgTasksPerEmployee);

    if (employeeTaskRatio > 1.5 || employeeTaskRatio < 0.5) {
      const imbalanceType = employeeTaskRatio > 1.5 ? "overloaded" : "underutilized";
      const severity = Math.abs(employeeTaskRatio - 1) > 1 ? 15 : 10;
      indicators.push({
        type: "workload_imbalance",
        severity,
        detail: `${imbalanceType === "overloaded" ? "50%+ more" : "50%+ fewer"} tasks than team average`,
        recommendation: imbalanceType === "overloaded" 
          ? "Redistribute some tasks to underutilized team members"
          : "Check if employee is available for additional assignments"
      });
      totalScore += severity * FATIGUE_INDICATORS.workload_imbalance.weight;
    }

    // Calculate risk level
    let riskLevel = "low";
    if (totalScore >= 80) riskLevel = "critical";
    else if (totalScore >= 50) riskLevel = "high";
    else if (totalScore >= 25) riskLevel = "moderate";

    // Generate protective recommendations
    const protectiveActions = generateProtectiveActions(indicators, employee, riskLevel);

    return {
      employee,
      indicators,
      totalScore: Math.round(totalScore),
      riskLevel,
      protectiveActions,
      metrics: {
        currentPendingTasks,
        completedLast30Days: recentCompletedTasks.length,
        lateSignoffRate: Math.round(lateRatio * 100),
        quotaPressure: Math.round(quotaPressureRatio * 100)
      }
    };
  };

  // Generate protective (non-punitive) recommendations
  const generateProtectiveActions = (indicators, employee, riskLevel) => {
    const actions = [];

    if (riskLevel === "critical" || riskLevel === "high") {
      actions.push({
        type: "manager_checkin",
        priority: "high",
        title: "Schedule Manager Check-in",
        description: `Have a supportive conversation with ${employee.name} to understand challenges and offer help`,
        icon: MessageCircle
      });
    }

    const hasQuotaPressure = indicators.some(i => i.type === "sustained_quota_pressure");
    if (hasQuotaPressure) {
      actions.push({
        type: "quota_easing",
        priority: "high",
        title: "Temporary Quota Reduction",
        description: "Reduce daily task quota by 20-30% for the next 1-2 weeks to allow recovery",
        icon: Target
      });
    }

    const hasAvoidance = indicators.some(i => i.type === "task_avoidance");
    if (hasAvoidance) {
      actions.push({
        type: "task_rotation",
        priority: "medium",
        title: "Task Rotation",
        description: "Rotate task assignments to provide variety and address potential skill gaps",
        icon: RefreshCw
      });
    }

    const hasDecline = indicators.some(i => i.type === "declining_performance");
    if (hasDecline) {
      actions.push({
        type: "targeted_coaching",
        priority: "medium",
        title: "Targeted Coaching",
        description: "Provide additional training support or pair with experienced peer",
        icon: Brain
      });
    }

    const hasImbalance = indicators.some(i => i.type === "workload_imbalance");
    if (hasImbalance) {
      actions.push({
        type: "schedule_balancing",
        priority: "medium",
        title: "Schedule Balancing",
        description: "Adjust shift assignments or redistribute tasks across the team",
        icon: Scale
      });
    }

    if (riskLevel !== "low") {
      actions.push({
        type: "monitor",
        priority: "low",
        title: "Weekly Progress Check",
        description: "Monitor indicators weekly to track improvement and adjust interventions",
        icon: Activity
      });
    }

    return actions;
  };

  // Analyze all employees
  const employeeAnalysis = useMemo(() => {
    return employees
      .filter(e => e.status === "active")
      .map(analyzeEmployee)
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [employees, tasks, employeeSessions, employeeTrainings, siteSettings]);

  // Calculate team-level metrics
  const teamMetrics = useMemo(() => {
    const atRiskCount = employeeAnalysis.filter(a => a.riskLevel === "critical" || a.riskLevel === "high").length;
    const moderateCount = employeeAnalysis.filter(a => a.riskLevel === "moderate").length;
    const healthyCount = employeeAnalysis.filter(a => a.riskLevel === "low").length;
    
    const avgScore = employeeAnalysis.length > 0 
      ? Math.round(employeeAnalysis.reduce((sum, a) => sum + a.totalScore, 0) / employeeAnalysis.length)
      : 0;

    // Count indicator frequencies
    const indicatorFrequency = {};
    employeeAnalysis.forEach(a => {
      a.indicators.forEach(i => {
        indicatorFrequency[i.type] = (indicatorFrequency[i.type] || 0) + 1;
      });
    });

    const topIndicators = Object.entries(indicatorFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => ({ type, count, ...FATIGUE_INDICATORS[type] }));

    return {
      totalEmployees: employeeAnalysis.length,
      atRiskCount,
      moderateCount,
      healthyCount,
      avgScore,
      topIndicators,
      teamHealthScore: Math.max(0, 100 - avgScore)
    };
  }, [employeeAnalysis]);

  // Export fatigue signals for other components
  const getFatigueSignals = () => {
    return {
      atRiskEmployees: employeeAnalysis.filter(a => a.riskLevel === "critical" || a.riskLevel === "high"),
      teamHealthScore: teamMetrics.teamHealthScore,
      topIndicators: teamMetrics.topIndicators,
      recommendedQuotaAdjustment: teamMetrics.avgScore > 40 ? -0.2 : teamMetrics.avgScore > 25 ? -0.1 : 0
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-100">
            <Heart className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Team Health & Fatigue Detection</h2>
            <p className="text-sm text-slate-500">Monitor workload patterns and protect team wellbeing</p>
          </div>
        </div>
      </div>

      {/* Team Health Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-700">At Risk</p>
                <p className="text-3xl font-bold text-rose-900">{teamMetrics.atRiskCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <p className="text-xs text-rose-600 mt-1">Need immediate attention</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700">Moderate</p>
                <p className="text-3xl font-bold text-amber-900">{teamMetrics.moderateCount}</p>
              </div>
              <Activity className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-xs text-amber-600 mt-1">Monitor closely</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700">Healthy</p>
                <p className="text-3xl font-bold text-emerald-900">{teamMetrics.healthyCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-xs text-emerald-600 mt-1">Operating well</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-700">Team Health</p>
                <p className="text-3xl font-bold text-indigo-900">{teamMetrics.teamHealthScore}%</p>
              </div>
              <Heart className="w-8 h-8 text-indigo-400" />
            </div>
            <Progress value={teamMetrics.teamHealthScore} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Top Indicators Alert */}
      {teamMetrics.topIndicators.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-900">Most Common Fatigue Signals</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {teamMetrics.topIndicators.map(indicator => {
                    const Icon = indicator.icon;
                    return (
                      <Badge key={indicator.type} variant="outline" className="bg-white border-amber-300">
                        <Icon className="w-3 h-3 mr-1" />
                        {indicator.label} ({indicator.count})
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="overview">Individual View</TabsTrigger>
          <TabsTrigger value="actions">Recommendations</TabsTrigger>
          <TabsTrigger value="indicators">All Indicators</TabsTrigger>
        </TabsList>

        {/* Individual Employee View */}
        <TabsContent value="overview" className="space-y-3 mt-4">
          {employeeAnalysis.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No active employees to analyze</p>
            </Card>
          ) : (
            employeeAnalysis.map(analysis => (
              <EmployeeHealthCard
                key={analysis.employee.id}
                analysis={analysis}
                isExpanded={expandedEmployee === analysis.employee.id}
                onToggle={() => setExpandedEmployee(
                  expandedEmployee === analysis.employee.id ? null : analysis.employee.id
                )}
              />
            ))
          )}
        </TabsContent>

        {/* Recommended Actions */}
        <TabsContent value="actions" className="space-y-4 mt-4">
          {employeeAnalysis
            .filter(a => a.protectiveActions.length > 0)
            .map(analysis => (
              <Card key={analysis.employee.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-medium">
                        {analysis.employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'E'}
                      </div>
                      <div>
                        <CardTitle className="text-base">{analysis.employee.name}</CardTitle>
                        <Badge className={cn("text-xs", RISK_LEVELS[analysis.riskLevel].color)}>
                          {RISK_LEVELS[analysis.riskLevel].label} Risk
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {analysis.protectiveActions.map((action, idx) => {
                      const Icon = action.icon;
                      return (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className={cn(
                            "p-2 rounded-lg",
                            action.priority === "high" ? "bg-rose-100" :
                            action.priority === "medium" ? "bg-amber-100" : "bg-slate-200"
                          )}>
                            <Icon className={cn(
                              "w-4 h-4",
                              action.priority === "high" ? "text-rose-600" :
                              action.priority === "medium" ? "text-amber-600" : "text-slate-600"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-900">{action.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                          </div>
                          <CoachingActionButton
                            situationType="wellbeing"
                            title={action.title}
                            details={action.description}
                            additionalContext={{
                              employeeName: analysis.employee.name,
                              riskLevel: analysis.riskLevel,
                              indicators: analysis.indicators.map(i => i.type)
                            }}
                            variant="ghost"
                            size="sm"
                            label=""
                            className="h-8 w-8 p-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          
          {employeeAnalysis.every(a => a.protectiveActions.length === 0) && (
            <Card className="p-8 text-center bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
              <p className="font-medium text-emerald-900">Team is healthy!</p>
              <p className="text-sm text-emerald-700 mt-1">No protective actions needed at this time</p>
            </Card>
          )}
        </TabsContent>

        {/* All Indicators Reference */}
        <TabsContent value="indicators" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Fatigue Indicator Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(FATIGUE_INDICATORS).map(([key, indicator]) => {
                  const Icon = indicator.icon;
                  const count = teamMetrics.topIndicators.find(i => i.type === key)?.count || 0;
                  return (
                    <div key={key} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-white">
                          <Icon className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{indicator.label}</p>
                          {count > 0 && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {count} employee{count > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{indicator.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmployeeHealthCard({ analysis, isExpanded, onToggle }) {
  const { employee, indicators, totalScore, riskLevel, metrics, protectiveActions } = analysis;
  const riskConfig = RISK_LEVELS[riskLevel];

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className={cn(
        "transition-all",
        riskLevel === "critical" && "border-rose-200 bg-rose-50/30",
        riskLevel === "high" && "border-orange-200 bg-orange-50/30"
      )}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-medium">
                  {employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'E'}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{employee.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={cn("text-xs", riskConfig.color)}>
                      {riskConfig.label}
                    </Badge>
                    <span className="text-xs text-slate-500">Score: {totalScore}</span>
                    <AskMeWhyButton
                      context="fatigue_signal"
                      data={{
                        employeeName: employee.name,
                        riskLevel,
                        totalScore,
                        indicators: indicators.map(i => ({ type: i.type, detail: i.detail, severity: i.severity })),
                        metrics,
                        protectiveActions: protectiveActions.map(a => a.title)
                      }}
                      iconOnly
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-slate-500">{metrics.currentPendingTasks} pending</p>
                  <p className="text-xs text-slate-400">{metrics.quotaPressure}% quota</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>

            {/* Mini indicators */}
            {indicators.length > 0 && !isExpanded && (
              <div className="flex flex-wrap gap-1 mt-3">
                {indicators.slice(0, 3).map((indicator, idx) => {
                  const config = FATIGUE_INDICATORS[indicator.type];
                  const Icon = config.icon;
                  return (
                    <Badge key={idx} variant="outline" className="text-xs bg-white">
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  );
                })}
                {indicators.length > 3 && (
                  <Badge variant="outline" className="text-xs bg-white">
                    +{indicators.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-slate-100">
            {/* Detailed Metrics */}
            <div className="grid grid-cols-4 gap-4 py-4">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{metrics.currentPendingTasks}</p>
                <p className="text-xs text-slate-500">Pending Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{metrics.completedLast30Days}</p>
                <p className="text-xs text-slate-500">Completed (30d)</p>
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-lg font-bold",
                  metrics.lateSignoffRate > 30 ? "text-rose-600" : "text-slate-900"
                )}>
                  {metrics.lateSignoffRate}%
                </p>
                <p className="text-xs text-slate-500">Late Sign-offs</p>
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-lg font-bold",
                  metrics.quotaPressure > 150 ? "text-rose-600" : 
                  metrics.quotaPressure > 100 ? "text-amber-600" : "text-slate-900"
                )}>
                  {metrics.quotaPressure}%
                </p>
                <p className="text-xs text-slate-500">Quota Load</p>
              </div>
            </div>

            {/* Indicators */}
            {indicators.length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium text-slate-700">Detected Signals</h4>
                {indicators.map((indicator, idx) => {
                  const config = FATIGUE_INDICATORS[indicator.type];
                  const Icon = config.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Icon className={cn("w-4 h-4 mt-0.5", riskConfig.iconColor)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{config.label}</p>
                        <p className="text-xs text-slate-600">{indicator.detail}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">💡 {indicator.recommendation}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {indicator.severity}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Actions */}
            {protectiveActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {protectiveActions.slice(0, 2).map((action, idx) => (
                  <Button key={idx} variant="outline" size="sm" className="text-xs">
                    <action.icon className="w-3 h-3 mr-1" />
                    {action.title}
                  </Button>
                ))}
                <CoachingActionButton
                  situationType="wellbeing"
                  title={`Support ${employee.name}`}
                  details={`Risk level: ${riskLevel}. Indicators: ${indicators.map(i => FATIGUE_INDICATORS[i.type].label).join(', ')}`}
                  additionalContext={{
                    employeeName: employee.name,
                    metrics,
                    indicators: indicators.map(i => ({ type: i.type, detail: i.detail }))
                  }}
                  variant="default"
                  size="sm"
                  label="Get Coaching Advice"
                  className="text-xs"
                />
              </div>
            )}

            {indicators.length === 0 && (
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-sm text-emerald-700">No fatigue signals detected</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Export helper function for other components to consume fatigue data
export function useFatigueSignals(employeeAnalysis) {
  const atRiskEmployees = employeeAnalysis?.filter(a => 
    a.riskLevel === "critical" || a.riskLevel === "high"
  ) || [];
  
  const avgScore = employeeAnalysis?.length > 0
    ? employeeAnalysis.reduce((sum, a) => sum + a.totalScore, 0) / employeeAnalysis.length
    : 0;

  return {
    atRiskEmployees,
    teamHealthScore: Math.max(0, 100 - avgScore),
    recommendedQuotaAdjustment: avgScore > 40 ? -0.2 : avgScore > 25 ? -0.1 : 0,
    hasIssues: atRiskEmployees.length > 0
  };
}