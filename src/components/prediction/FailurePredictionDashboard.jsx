import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TaskRepo, EmployeeRepo, EmployeeTrainingRepo, TrainingDocumentRepo,
  EmployeeSessionRepo, AreaSignOffRepo, PreOpInspectionRepo, TitrationRecordRepo
} from "@/lib/adapters/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, Shield, Brain, Loader2, Users, MapPin, CheckCircle2,
  XCircle, AlertCircle, Zap, TrendingDown, Eye
} from "lucide-react";
import AskMeWhyButton from "@/components/explainer/AskMeWhyButton";
import { format, parseISO, subDays, isWithinInterval } from "date-fns";

const SEVERITY_CONFIG = {
  critical: { color: "bg-rose-100 text-rose-700 border-rose-200", icon: XCircle, label: "Critical" },
  high: { color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle, label: "High" },
  moderate: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle, label: "Moderate" },
  low: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Eye, label: "Low" }
};

const HIGH_RISK_CATEGORIES = ["rte", "allergen", "allergens", "drain", "drains", "ready to eat"];

export default function FailurePredictionDashboard({ 
  organizationId,
  pestFindings = [],
  pestEscalationMarkers = [],
  empSamples = [],
  empSites = []
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["prediction_tasks", organizationId],
    queryFn: () => TaskRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["prediction_employees", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["prediction_trainings", organizationId],
    queryFn: () => EmployeeTrainingRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: trainingDocs = [] } = useQuery({
    queryKey: ["prediction_docs", organizationId],
    queryFn: () => TrainingDocumentRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["prediction_sessions", organizationId],
    queryFn: () => EmployeeSessionRepo.filter({ 
      organization_id: organizationId,
      session_date: format(new Date(), "yyyy-MM-dd")
    }),
    enabled: !!organizationId
  });

  const { data: areaSignOffs = [] } = useQuery({
    queryKey: ["prediction_signoffs", organizationId],
    queryFn: () => AreaSignOffRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: preOpInspections = [] } = useQuery({
    queryKey: ["prediction_preop", organizationId],
    queryFn: () => PreOpInspectionRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: titrationRecords = [] } = useQuery({
    queryKey: ["prediction_titrations", organizationId],
    queryFn: () => TitrationRecordRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Calculate risk scores and predictions
  const analyzeRisks = () => {
    setIsAnalyzing(true);

    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const current = { start: thirtyDaysAgo, end: now };
    const alerts = [];
    const employeeRisks = [];
    const areaRisks = [];

    // Analyze each active employee
    employees.forEach(emp => {
      const empTrainings = trainings.filter(t => t.employee_id === emp.id);
      const completedDocIds = new Set(empTrainings.map(t => t.document_id));
      const trainingCompletion = trainingDocs.length > 0 
        ? (completedDocIds.size / trainingDocs.length) * 100 
        : 100;

      // Get assigned tasks
      const assignedTasks = tasks.filter(t => 
        t.assigned_to === emp.email && 
        !t.is_group &&
        t.status !== 'completed' && 
        t.status !== 'verified'
      );

      // Calculate overdue tasks
      const overdueTasks = assignedTasks.filter(t => 
        t.due_date && parseISO(t.due_date) < now
      );

      // Historical performance (last 30 days)
      const recentCompletions = tasks.filter(t => 
        t.assigned_to === emp.email &&
        t.completed_at &&
        isWithinInterval(parseISO(t.completed_at), { start: thirtyDaysAgo, end: now })
      );

      const recentAssignments = tasks.filter(t =>
        t.assigned_to === emp.email &&
        t.created_date &&
        isWithinInterval(parseISO(t.created_date), { start: thirtyDaysAgo, end: now })
      );

      const completionRate = recentAssignments.length > 0
        ? (recentCompletions.length / recentAssignments.length) * 100
        : 100;

      // Check for high-risk area assignments without proper training
      const highRiskAssignments = assignedTasks.filter(t => {
        const category = (t.category || t.area || '').toLowerCase();
        return HIGH_RISK_CATEGORIES.some(hr => category.includes(hr));
      });

      // ATP failure history
      const empSignOffs = areaSignOffs.filter(s => s.employee_email === emp.email);
      const atpFailures = empSignOffs.filter(s => s.atp_test_result === 'fail');
      const atpFailureRate = empSignOffs.length > 0 
        ? (atpFailures.length / empSignOffs.length) * 100 
        : 0;

      // Calculate composite risk score
      const trainingGapScore = 100 - trainingCompletion;
      const performanceRiskScore = 100 - completionRate;
      const workloadScore = Math.min(100, (assignedTasks.length / 8) * 100);
      const overdueScore = Math.min(100, overdueTasks.length * 25);

      const compositeRisk = Math.round(
        (trainingGapScore * 0.3) +
        (performanceRiskScore * 0.25) +
        (workloadScore * 0.2) +
        (overdueScore * 0.15) +
        (atpFailureRate * 0.1)
      );

      const severity = compositeRisk >= 80 ? 'critical' : 
                       compositeRisk >= 60 ? 'high' : 
                       compositeRisk >= 40 ? 'moderate' : 'low';

      const riskFactors = [];
      if (trainingCompletion < 70) riskFactors.push(`Only ${Math.round(trainingCompletion)}% training complete`);
      if (overdueTasks.length > 0) riskFactors.push(`${overdueTasks.length} overdue tasks`);
      if (completionRate < 80) riskFactors.push(`${Math.round(completionRate)}% completion rate (30d)`);
      if (workloadScore > 100) riskFactors.push("Overloaded with tasks");
      if (atpFailureRate > 10) riskFactors.push(`${Math.round(atpFailureRate)}% ATP failure rate`);

      employeeRisks.push({
        employee: emp,
        riskScore: compositeRisk,
        severity,
        trainingCompletion,
        completionRate,
        assignedTasks: assignedTasks.length,
        overdueTasks: overdueTasks.length,
        highRiskAssignments: highRiskAssignments.length,
        atpFailureRate,
        riskFactors
      });

      // Generate specific alerts
      if (trainingCompletion < 50 && highRiskAssignments.length > 0) {
        alerts.push({
          type: "pre_op_failure",
          severity: "critical",
          employee: emp.name,
          title: "High Risk of Pre-Op Failure",
          description: `${emp.name} is assigned to ${highRiskAssignments.length} high-risk area task(s) but has only completed ${Math.round(trainingCompletion)}% of required training.`,
          actions: [
            { type: "training", label: "Assign Refresher Training", priority: "high" },
            { type: "reassign", label: "Reassign High-Risk Tasks", priority: "high" }
          ]
        });
      }

      if (workloadScore > 100 && overdueTasks.length > 2) {
        alerts.push({
          type: "step_omission",
          severity: "high",
          employee: emp.name,
          title: "Likely Step Omission Risk",
          description: `${emp.name} has ${assignedTasks.length} tasks with ${overdueTasks.length} overdue. High quota pressure may lead to rushing and step omissions.`,
          actions: [
            { type: "quota", label: "Reduce Task Load", priority: "high" },
            { type: "inspection", label: "Flag for Extra QA Checks", priority: "medium" }
          ]
        });
      }

      if (atpFailureRate > 20) {
        alerts.push({
          type: "atp_failure",
          severity: "high",
          employee: emp.name,
          title: "Repeat ATP Failure Pattern",
          description: `${emp.name} has a ${Math.round(atpFailureRate)}% ATP failure rate. Pattern suggests technique issues requiring intervention.`,
          actions: [
            { type: "training", label: "ATP Technique Training", priority: "high" },
            { type: "buddy", label: "Assign Buddy for Supervision", priority: "medium" }
          ]
        });
      }
    });

    // Analyze area risks
    const areaCategories = [...new Set(tasks.map(t => t.area || t.category).filter(Boolean))];
    
    areaCategories.forEach(area => {
      const areaTasks = tasks.filter(t => (t.area === area || t.category === area) && !t.is_group);
      const completedTasks = areaTasks.filter(t => t.status === 'completed' || t.status === 'verified');
      const overdueTasks = areaTasks.filter(t => 
        t.due_date && parseISO(t.due_date) < now && 
        t.status !== 'completed' && t.status !== 'verified'
      );

      const isHighRisk = HIGH_RISK_CATEGORIES.some(hr => area.toLowerCase().includes(hr));
      const completionRate = areaTasks.length > 0 ? (completedTasks.length / areaTasks.length) * 100 : 100;
      const overdueRate = areaTasks.length > 0 ? (overdueTasks.length / areaTasks.length) * 100 : 0;

      const areaRiskScore = Math.round(
        (100 - completionRate) * 0.4 +
        overdueRate * 0.3 +
        (isHighRisk ? 30 : 0)
      );

      if (areaRiskScore > 30) {
        areaRisks.push({
          area,
          riskScore: areaRiskScore,
          severity: areaRiskScore >= 70 ? 'critical' : areaRiskScore >= 50 ? 'high' : 'moderate',
          isHighRisk,
          totalTasks: areaTasks.length,
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          completionRate
        });
      }

      if (isHighRisk && overdueRate > 20) {
        alerts.push({
          type: "contamination_risk",
          severity: "critical",
          area,
          title: "Cross-Contamination Risk",
          description: `${area} is a high-risk area with ${overdueTasks.length} overdue sanitation tasks (${Math.round(overdueRate)}% overdue rate). Immediate attention required.`,
          actions: [
            { type: "priority", label: "Prioritize Area Tasks", priority: "critical" },
            { type: "inspection", label: "Immediate QA Inspection", priority: "critical" }
          ]
        });
      }
    });

    // 6. PEST CONTROL RISK PREDICTIONS
    const recentPestFindings = pestFindings.filter(f => {
      if (!f.service_date) return false;
      const serviceDate = parseISO(f.service_date);
      return isWithinInterval(serviceDate, { start: current.start, end: current.end });
    });

    const pestExceedances = recentPestFindings.filter(f => f.threshold_exceeded);
    const criticalPestExceedances = pestExceedances.filter(f => f.exceedance_severity === "critical");
    const activeEscalations = pestEscalationMarkers.filter(e => e.status === "active");
    
    if (criticalPestExceedances.length > 0) {
      alerts.push({
        type: "pest_contamination",
        severity: "critical",
        title: "Critical Pest Activity Detected",
        description: `${criticalPestExceedances.length} critical pest threshold exceedance(s) in recent service reports. Immediate intervention required to prevent contamination.`,
        actions: [
          { type: "pest_vendor", label: "Contact Pest Vendor Immediately", priority: "critical" },
          { type: "sanitation", label: "Enhanced Cleaning of Affected Areas", priority: "high" }
        ],
        details: { count: criticalPestExceedances.length }
      });
    }

    if (activeEscalations.length > 2) {
      const criticalEscalations = activeEscalations.filter(e => e.severity === "critical");
      alerts.push({
        type: "pest_trend",
        severity: criticalEscalations.length > 0 ? "critical" : "high",
        title: "Pest Escalation Pattern",
        description: `${activeEscalations.length} active pest escalation markers suggest ongoing pest pressure. Pattern indicates potential sanitation gaps.`,
        actions: [
          { type: "inspection", label: "Deep Sanitation Audit", priority: "high" },
          { type: "pest_vendor", label: "Review Pest Control Strategy", priority: "medium" }
        ],
        details: { activeEscalations: activeEscalations.length, critical: criticalEscalations.length }
      });
    }

    // 7. ENVIRONMENTAL MONITORING - PATHOGEN RISK (HIGHEST PRIORITY)
    const recentEmpSamples = empSamples.filter(s => {
      if (!s.collection_date) return false;
      const collectionDate = parseISO(s.collection_date);
      return isWithinInterval(collectionDate, { start: current.start, end: current.end });
    });

    const pathogenPositives = recentEmpSamples.filter(s => 
      s.overall_result === "fail" && 
      s.test_results?.some(t => 
        (t.test_type === "listeria_mono" || t.test_type === "salmonella") && 
        t.result === "positive"
      )
    );

    const zone1Positives = pathogenPositives.filter(s => s.zone_classification === "zone_1");
    
    if (pathogenPositives.length > 0) {
      alerts.push({
        type: "pathogen_detection",
        severity: "critical",
        title: zone1Positives.length > 0 ? "ZONE 1 PATHOGEN POSITIVE" : "Pathogen Detection",
        description: `${pathogenPositives.length} pathogen positive sample(s) detected${zone1Positives.length > 0 ? ` including ${zone1Positives.length} in Zone 1 (product contact)` : ''}. Immediate corrective action and reswab required.`,
        actions: [
          { type: "sanitation", label: "Enhanced Cleaning Protocol", priority: "critical" },
          { type: "reswab", label: "Schedule Immediate Reswab", priority: "critical" },
          { type: "capa", label: "Initiate CAPA Investigation", priority: "high" }
        ],
        details: { pathogenPositives: pathogenPositives.length, zone1: zone1Positives.length }
      });
    }

    // Overdue reswabs
    const overdueReswabs = empSamples.filter(s => 
      s.requires_reswab && 
      s.status !== "closed" &&
      s.reswab_due_date && 
      new Date(s.reswab_due_date) < now
    );

    if (overdueReswabs.length > 0) {
      alerts.push({
        type: "overdue_reswab",
        severity: "critical",
        title: "Overdue Environmental Reswabs",
        description: `${overdueReswabs.length} reswab(s) past due date. Delayed reswabs cannot verify effectiveness of corrective actions.`,
        actions: [
          { type: "sampling", label: "Collect Reswabs Immediately", priority: "critical" },
          { type: "review", label: "Review Sampling Schedule", priority: "medium" }
        ],
        details: { count: overdueReswabs.length }
      });
    }

    // Indicator organism trends (early warning)
    const indicatorFailures = recentEmpSamples.filter(s => 
      s.overall_result === "fail" && 
      !s.test_results?.some(t => 
        (t.test_type === "listeria_mono" || t.test_type === "salmonella") && 
        t.result === "positive"
      )
    );

    if (indicatorFailures.length > 5) {
      alerts.push({
        type: "indicator_trend",
        severity: "high",
        title: "Elevated Indicator Organisms",
        description: `${indicatorFailures.length} indicator organism failures detected. This is an early warning signal that sanitation effectiveness may be declining.`,
        actions: [
          { type: "sanitation", label: "Review Sanitation Procedures", priority: "high" },
          { type: "training", label: "Refresher Training on Critical Steps", priority: "medium" }
        ],
        details: { count: indicatorFailures.length }
      });
    }

    // Sort by risk score
    employeeRisks.sort((a, b) => b.riskScore - a.riskScore);
    areaRisks.sort((a, b) => b.riskScore - a.riskScore);
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Calculate overall metrics
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highRiskEmployees = employeeRisks.filter(e => e.severity === 'critical' || e.severity === 'high').length;
    const avgRiskScore = employeeRisks.length > 0
      ? Math.round(employeeRisks.reduce((sum, e) => sum + e.riskScore, 0) / employeeRisks.length)
      : 0;

    setPredictions({
      alerts,
      employeeRisks,
      areaRisks,
      summary: {
        totalAlerts: alerts.length,
        criticalAlerts,
        highRiskEmployees,
        avgRiskScore,
        analysisTime: new Date().toISOString()
      }
    });

    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-100">
            <Shield className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Risk Prediction</h2>
            <p className="text-sm text-slate-500">Proactive risk detection & prevention</p>
          </div>
        </div>
        <Button 
          onClick={analyzeRisks}
          disabled={isAnalyzing}
          className="bg-rose-600 hover:bg-rose-700"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Brain className="w-4 h-4 mr-2" />
          )}
          Analyze Risks
        </Button>
      </div>

      {/* Summary Cards */}
      {predictions && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={predictions.summary.criticalAlerts > 0 ? "border-rose-200 bg-rose-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Critical Alerts</p>
                  <p className={`text-2xl font-bold ${predictions.summary.criticalAlerts > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {predictions.summary.criticalAlerts}
                  </p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${predictions.summary.criticalAlerts > 0 ? 'text-rose-500' : 'text-slate-300'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">High-Risk Employees</p>
                  <p className="text-2xl font-bold text-slate-900">{predictions.summary.highRiskEmployees}</p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Alerts</p>
                  <p className="text-2xl font-bold text-slate-900">{predictions.summary.totalAlerts}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Avg Risk Score</p>
                  <p className="text-2xl font-bold text-slate-900">{predictions.summary.avgRiskScore}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Predictions Content */}
      {predictions && (
        <Tabs defaultValue="alerts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="alerts">
              Active Alerts ({predictions.alerts.length})
            </TabsTrigger>
            <TabsTrigger value="employees">
              Employee Risk ({predictions.employeeRisks.length})
            </TabsTrigger>
            <TabsTrigger value="areas">
              Area Risk ({predictions.areaRisks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            {predictions.alerts.length === 0 ? (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                  <h3 className="text-lg font-medium text-emerald-900">No Active Alerts</h3>
                  <p className="text-emerald-700">All risk indicators are within acceptable ranges.</p>
                </CardContent>
              </Card>
            ) : (
              predictions.alerts.map((alert, idx) => {
                const config = SEVERITY_CONFIG[alert.severity];
                const Icon = config.icon;
                return (
                  <Card key={idx} className={`border ${config.color.split(' ')[2]}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${config.color.split(' ').slice(0, 2).join(' ')}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                            <Badge variant="default" className={config.color}>{config.label}</Badge>
                            {/* @ts-ignore */}
                            <AskMeWhyButton
                              context="risk_flag"
                              data={{
                                title: alert.title,
                                type: alert.type,
                                severity: alert.severity,
                                description: alert.description,
                                employee: alert.employee,
                                area: alert.area
                              }}
                              iconOnly={true}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            />
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{alert.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {alert.actions.map((action, aidx) => (
                              <Button 
                                key={aidx} 
                                size="sm" 
                                variant={action.priority === 'critical' || action.priority === 'high' ? 'default' : 'outline'}
                                className={action.priority === 'critical' ? 'bg-rose-600 hover:bg-rose-700' : ''}
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Employee Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.employeeRisks.map(emp => {
                    const config = SEVERITY_CONFIG[emp.severity];
                    return (
                      <div key={emp.employee.id} className={`p-4 rounded-lg border ${config.color.split(' ')[2]} bg-slate-50`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-medium">
                              {emp.employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'E'}
                            </div>
                            <div>
                              <p className="font-medium">{emp.employee.name}</p>
                              <p className="text-xs text-slate-500">{emp.employee.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className={config.color}>{emp.riskScore} Risk Score</Badge>
                            {/* @ts-ignore */}
                            <AskMeWhyButton
                              context="prediction"
                              data={{
                                employeeName: emp.employee.name,
                                riskScore: emp.riskScore,
                                severity: emp.severity,
                                trainingCompletion: emp.trainingCompletion,
                                completionRate: emp.completionRate,
                                assignedTasks: emp.assignedTasks,
                                overdueTasks: emp.overdueTasks,
                                riskFactors: emp.riskFactors
                              }}
                              iconOnly={true}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 mb-3 text-center text-sm">
                          <div>
                            <p className="text-slate-500">Training</p>
                            <p className={`font-bold ${emp.trainingCompletion < 70 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {Math.round(emp.trainingCompletion)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Completion</p>
                            <p className={`font-bold ${emp.completionRate < 80 ? 'text-amber-600' : 'text-slate-900'}`}>
                              {Math.round(emp.completionRate)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Assigned</p>
                            <p className="font-bold">{emp.assignedTasks}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Overdue</p>
                            <p className={`font-bold ${emp.overdueTasks > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {emp.overdueTasks}
                            </p>
                          </div>
                        </div>

                        {emp.riskFactors.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {emp.riskFactors.map((factor, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="areas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Area Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.areaRisks.map((area, idx) => {
                    const config = SEVERITY_CONFIG[area.severity];
                    return (
                      <div key={idx} className={`p-4 rounded-lg border ${config.color.split(' ')[2]} bg-slate-50`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{area.area}</span>
                            {area.isHighRisk && (
                              <Badge variant="destructive" className="bg-rose-100 text-rose-700">High-Risk Zone</Badge>
                            )}
                          </div>
                          <Badge variant="default" className={config.color}>{area.riskScore} Risk</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Completion</p>
                            <p className="font-bold">{Math.round(area.completionRate)}%</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Total Tasks</p>
                            <p className="font-bold">{area.totalTasks}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Overdue</p>
                            <p className={`font-bold ${area.overdueTasks > 0 ? 'text-rose-600' : ''}`}>
                              {area.overdueTasks}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {predictions.areaRisks.length === 0 && (
                    <p className="text-center text-slate-500 py-8">No area risks detected</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Initial State */}
      {!predictions && !isAnalyzing && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Predictive Analysis Ready</h3>
            <p className="text-slate-500 mb-4">
              Click "Analyze Risks" to identify potential failures before they occur
            </p>
            <Button onClick={analyzeRisks} className="bg-rose-600 hover:bg-rose-700">
              <Brain className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}