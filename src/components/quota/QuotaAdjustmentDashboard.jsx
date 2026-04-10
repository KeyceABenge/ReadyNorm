// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, TrendingUp, Users, AlertTriangle, 
  RefreshCw, Loader2, ArrowUp, ArrowDown, Target, Clock,
  Calendar, Zap, Shield
} from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { toast } from "sonner";
import { EmployeeRepo, EmployeeSessionRepo, EmployeeTrainingRepo, SiteSettingsRepo, TaskRepo } from "@/lib/adapters/database";

export default function QuotaAdjustmentDashboard({ organizationId, fatigueSignals = null }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ["quota_tasks", organizationId],
    queryFn: () => TaskRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["quota_employees", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["quota_sessions", organizationId],
    queryFn: () => EmployeeSessionRepo.filter({ 
      organization_id: organizationId,
      session_date: format(new Date(), "yyyy-MM-dd")
    }),
    enabled: !!organizationId
  });

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["quota_settings", organizationId],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["quota_trainings", organizationId],
    queryFn: () => EmployeeTrainingRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const settings = siteSettings[0] || {};
  const baseQuotas = settings.task_quotas || {};

  // Calculate completion metrics
  const calculateMetrics = () => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const metrics = {
      daily: { due: 0, completed: 0, overdue: 0 },
      weekly: { due: 0, completed: 0, overdue: 0 },
      monthly: { due: 0, completed: 0, overdue: 0 },
      overall: { due: 0, completed: 0, overdue: 0 }
    };

    tasks.forEach(task => {
      if (task.is_group) return;
      
      const freq = task.frequency?.toLowerCase() || '';
      const isCompleted = task.status === 'completed' || task.status === 'verified';
      const dueDate = task.due_date ? parseISO(task.due_date) : null;
      const isOverdue = dueDate && dueDate < now && !isCompleted;

      if (freq === 'daily') {
        metrics.daily.due++;
        if (isCompleted) metrics.daily.completed++;
        if (isOverdue) metrics.daily.overdue++;
      } else if (freq === 'weekly') {
        metrics.weekly.due++;
        if (isCompleted) metrics.weekly.completed++;
        if (isOverdue) metrics.weekly.overdue++;
      } else if (freq === 'monthly' || freq === 'bi-weekly' || freq === 'biweekly') {
        metrics.monthly.due++;
        if (isCompleted) metrics.monthly.completed++;
        if (isOverdue) metrics.monthly.overdue++;
      }

      metrics.overall.due++;
      if (isCompleted) metrics.overall.completed++;
      if (isOverdue) metrics.overall.overdue++;
    });

    return metrics;
  };

  // Calculate employee capacity and workload
  const calculateEmployeeWorkload = () => {
    const activeEmployees = employees.filter(e => 
      sessions.some(s => s.employee_id === e.id && s.status === 'active')
    );

    return activeEmployees.map(emp => {
      const assignedTasks = tasks.filter(t => 
        t.assigned_to === emp.email && 
        t.status !== 'completed' && 
        t.status !== 'verified'
      );
      
      const completedToday = tasks.filter(t => 
        t.assigned_to === emp.email && 
        (t.status === 'completed' || t.status === 'verified') &&
        t.completed_at && 
        isWithinInterval(parseISO(t.completed_at), { 
          start: startOfDay(new Date()), 
          end: endOfDay(new Date()) 
        })
      );

      const trainingCompleted = trainings.filter(t => t.employee_id === emp.id).length;
      const standardCapacity = 8; // tasks per shift
      const currentLoad = assignedTasks.length;
      const capacityUsed = Math.round((currentLoad / standardCapacity) * 100);

      return {
        ...emp,
        assignedTasks: assignedTasks.length,
        completedToday: completedToday.length,
        trainingCompleted,
        capacityUsed,
        availableCapacity: Math.max(0, standardCapacity - currentLoad),
        canTakeMore: capacityUsed < 120
      };
    });
  };

  // Generate AI quota recommendations
  const generateRecommendations = async () => {
    setIsAnalyzing(true);
    
    const metrics = calculateMetrics();
    const workloads = calculateEmployeeWorkload();
    
    // Calculate buffer factors based on historical performance
    const dailyMissRate = metrics.daily.due > 0 
      ? (metrics.daily.due - metrics.daily.completed) / metrics.daily.due 
      : 0;
    const weeklyMissRate = metrics.weekly.due > 0 
      ? (metrics.weekly.due - metrics.weekly.completed) / metrics.weekly.due 
      : 0;
    
    // Aggressive buffer calculation
    const dailyBuffer = 1 + (dailyMissRate * 1.5) + (metrics.daily.overdue / Math.max(1, metrics.daily.due) * 0.5);
    const weeklyBuffer = 1 + (weeklyMissRate * 1.5) + (metrics.weekly.overdue / Math.max(1, metrics.weekly.due) * 0.5);

    const baseDaily = baseQuotas.daily || 5;
    const baseWeekly = baseQuotas.weekly || 3;

    // Apply fatigue adjustment if signals indicate team stress
    const fatigueAdjustment = fatigueSignals?.recommendedQuotaAdjustment || 0;
    const fatigueMultiplier = 1 + fatigueAdjustment; // e.g., -0.2 becomes 0.8

    const recommendedQuotas = {
      daily: Math.ceil(baseDaily * Math.min(dailyBuffer, 1.5) * fatigueMultiplier),
      weekly: Math.ceil(baseWeekly * Math.min(weeklyBuffer, 1.4) * fatigueMultiplier),
      'bi-weekly': Math.ceil((baseQuotas['bi-weekly'] || 2) * 1.2 * fatigueMultiplier),
      monthly: Math.ceil((baseQuotas.monthly || 2) * 1.15 * fatigueMultiplier)
    };

    // Calculate per-employee assignments
    const employeeAssignments = workloads.map(emp => {
      const overdueForEmp = tasks.filter(t => 
        t.assigned_to === emp.email && 
        t.due_date && 
        parseISO(t.due_date) < new Date() &&
        t.status !== 'completed' && 
        t.status !== 'verified'
      ).length;

      const recommendedExtra = Math.min(
        emp.availableCapacity,
        Math.ceil(overdueForEmp * 0.5) + (emp.capacityUsed < 80 ? 2 : 0)
      );

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        currentAssigned: emp.assignedTasks,
        completedToday: emp.completedToday,
        capacityUsed: emp.capacityUsed,
        recommendedExtra,
        totalRecommended: emp.assignedTasks + recommendedExtra,
        priority: overdueForEmp > 0 ? 'high' : emp.capacityUsed < 50 ? 'medium' : 'low'
      };
    });

    // Calculate projected completion
    const totalCapacity = workloads.reduce((sum, w) => sum + w.availableCapacity, 0);
    const totalOverdue = metrics.overall.overdue;
    const projectedCompletion = Math.min(100, Math.round(
      ((metrics.overall.completed + totalCapacity) / Math.max(1, metrics.overall.due)) * 100
    ));

    setRecommendations({
      metrics,
      currentQuotas: baseQuotas,
      recommendedQuotas,
      bufferFactors: {
        daily: dailyBuffer,
        weekly: weeklyBuffer
      },
      fatigueAdjustment: fatigueAdjustment !== 0 ? Math.round(fatigueAdjustment * 100) : null,
      employeeAssignments,
      projectedCompletion,
      riskLevel: totalOverdue > 5 ? 'high' : totalOverdue > 2 ? 'medium' : 'low',
      activeEmployees: workloads.length,
      totalCapacity,
      timestamp: new Date().toISOString()
    });

    setIsAnalyzing(false);
  };

  // Apply recommended quotas
  const applyQuotasMutation = useMutation({
    mutationFn: async () => {
      if (!recommendations) {
        throw new Error("No recommendations to apply");
      }
      
      // Find settings record - settings is an array
      const settingsRecord = siteSettings[0];
      if (!settingsRecord?.id) {
        throw new Error("No settings record found");
      }
      
      console.log("Applying quotas:", recommendations.recommendedQuotas);
      console.log("To settings record:", settingsRecord.id);
      
      await SiteSettingsRepo.update(settingsRecord.id, {
        task_quotas: recommendations.recommendedQuotas
      });
    },
    onSuccess: () => {
      // Invalidate all settings queries to ensure SiteSettings page reloads
      queryClient.invalidateQueries({ queryKey: ["quota_settings"] });
      queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("Quotas updated successfully! Refresh the Quotas & Regeneration page to see changes.");
    },
    onError: (error) => {
      console.error("Failed to update quotas:", error);
      toast.error("Failed to update quotas: " + (error.message || "Unknown error"));
    }
  });

  const metrics = calculateMetrics();
  const workloads = calculateEmployeeWorkload();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-100">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Quota Adjustment</h2>
            <p className="text-xs text-slate-500">Intelligent over-assignment for 100% MSS completion</p>
          </div>
        </div>
        <Button 
          onClick={generateRecommendations}
          disabled={isAnalyzing}
          className="bg-purple-600 hover:bg-purple-700 text-sm h-9 w-full sm:w-auto"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1.5" />
          )}
          Analyze & Optimize
        </Button>
      </div>

      {/* Current Status Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Daily Progress</p>
                <p className="text-xl font-bold">
                  {metrics.daily.due > 0 ? Math.round((metrics.daily.completed / metrics.daily.due) * 100) : 0}%
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-100">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <Progress 
              value={metrics.daily.due > 0 ? (metrics.daily.completed / metrics.daily.due) * 100 : 0} 
              className="mt-2 h-1.5" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Weekly Progress</p>
                <p className="text-xl font-bold">
                  {metrics.weekly.due > 0 ? Math.round((metrics.weekly.completed / metrics.weekly.due) * 100) : 0}%
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-100">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <Progress 
              value={metrics.weekly.due > 0 ? (metrics.weekly.completed / metrics.weekly.due) * 100 : 0} 
              className="mt-2 h-1.5" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Overdue Tasks</p>
                <p className="text-xl font-bold text-rose-600">{metrics.overall.overdue}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-100">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Active Employees</p>
                <p className="text-xl font-bold">{workloads.length}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-100">
                <Users className="w-4 h-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations Section */}
      {recommendations && (
        <Tabs defaultValue="quotas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="quotas">Quota Recommendations</TabsTrigger>
            <TabsTrigger value="employees">Employee Assignments</TabsTrigger>
            <TabsTrigger value="projection">Completion Projection</TabsTrigger>
          </TabsList>

          <TabsContent value="quotas">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Recommended Quota Adjustments
                  </CardTitle>
                  <Button 
                    onClick={() => applyQuotasMutation.mutate()}
                    disabled={applyQuotasMutation.isPending}
                    size="sm"
                  >
                    {applyQuotasMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Apply Recommendations
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(recommendations.recommendedQuotas).map(([freq, value]) => {
                    const current = recommendations.currentQuotas[freq] || 0;
                    const diff = value - current;
                    const buffer = recommendations.bufferFactors[freq];
                    
                    return (
                      <div key={freq} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{freq}</span>
                          {diff > 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <ArrowUp className="w-3 h-3 mr-1" />
                              +{diff}
                            </Badge>
                          ) : diff < 0 ? (
                            <Badge className="bg-rose-100 text-rose-700">
                              <ArrowDown className="w-3 h-3 mr-1" />
                              {diff}
                            </Badge>
                          ) : (
                            <Badge variant="outline">No change</Badge>
                          )}
                        </div>
                        <div className="flex items-end gap-2">
                          <span className="text-slate-400 line-through">{current}</span>
                          <span className="text-2xl font-bold text-slate-900">{value}</span>
                        </div>
                        {buffer && (
                          <p className="text-xs text-slate-500 mt-1">
                            Buffer: {((buffer - 1) * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Employee Task Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.employeeAssignments.map(emp => (
                    <div key={emp.employeeId} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-medium">
                            {emp.employeeName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'E'}
                          </div>
                          <div>
                            <p className="font-medium">{emp.employeeName}</p>
                            <p className="text-xs text-slate-500">
                              {emp.completedToday} completed today
                            </p>
                          </div>
                        </div>
                        <Badge className={
                          emp.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                          emp.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }>
                          {emp.priority} priority
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-3">
                        <div className="text-center">
                          <p className="text-lg font-bold">{emp.currentAssigned}</p>
                          <p className="text-xs text-slate-500">Current</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-emerald-600">+{emp.recommendedExtra}</p>
                          <p className="text-xs text-slate-500">Add</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{emp.totalRecommended}</p>
                          <p className="text-xs text-slate-500">Total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{emp.capacityUsed}%</p>
                          <p className="text-xs text-slate-500">Capacity</p>
                        </div>
                      </div>
                      <Progress value={emp.capacityUsed} className="mt-2 h-2" />
                    </div>
                  ))}
                  {recommendations.employeeAssignments.length === 0 && (
                    <p className="text-center text-slate-500 py-8">No active employees on shift</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projection">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Completion Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-slate-50 rounded-lg">
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-3xl font-bold ${
                      recommendations.projectedCompletion >= 95 ? 'bg-emerald-100 text-emerald-700' :
                      recommendations.projectedCompletion >= 80 ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {recommendations.projectedCompletion}%
                    </div>
                    <p className="mt-3 font-medium">Projected Completion</p>
                    <p className="text-sm text-slate-500">With recommended adjustments</p>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-slate-600" />
                      <span className="font-medium">Risk Assessment</span>
                    </div>
                    <Badge className={`text-lg px-4 py-2 ${
                      recommendations.riskLevel === 'high' ? 'bg-rose-100 text-rose-700' :
                      recommendations.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {recommendations.riskLevel.toUpperCase()} RISK
                    </Badge>
                    <p className="text-sm text-slate-500 mt-3">
                      {recommendations.riskLevel === 'high' 
                        ? 'Immediate attention required' 
                        : recommendations.riskLevel === 'medium'
                        ? 'Monitor closely'
                        : 'On track for completion'}
                    </p>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-slate-600" />
                      <span className="font-medium">Capacity Summary</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Active Staff</span>
                        <span className="font-bold">{recommendations.activeEmployees}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Available Capacity</span>
                        <span className="font-bold">{recommendations.totalCapacity} tasks</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Overdue Backlog</span>
                        <span className="font-bold text-rose-600">{recommendations.metrics.overall.overdue}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-900">Strategy</p>
                      <p className="text-sm text-purple-700 mt-1">
                        Applying aggressive buffering strategy with {((recommendations.bufferFactors.daily - 1) * 100).toFixed(0)}% 
                        daily buffer and {((recommendations.bufferFactors.weekly - 1) * 100).toFixed(0)}% weekly buffer 
                        to account for historical miss rates and ensure 100% MSS completion across all time horizons.
                        {recommendations.fatigueAdjustment && (
                          <span className="block mt-2 text-rose-700">
                            ⚠️ Team fatigue detected: quotas reduced by {Math.abs(recommendations.fatigueAdjustment)}% to protect employee wellbeing.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* No Recommendations Yet */}
      {!recommendations && !isAnalyzing && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Brain className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Ready to Optimize</h3>
            <p className="text-slate-500 mb-4">
              Click "Analyze & Optimize" to generate quota recommendations
            </p>
            <Button onClick={generateRecommendations} className="bg-purple-600 hover:bg-purple-700">
              <Brain className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}