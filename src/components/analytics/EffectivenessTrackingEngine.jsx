// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle,
  GraduationCap, Users, Droplets, FlaskConical, FileText, Zap,
  ChevronDown, Target, RefreshCw, Calendar, Clock,
  Bug, Microscope
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays, subDays, isWithinInterval } from "date-fns";

const INTERVENTION_TYPES = {
  retraining: { label: "Retraining", icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
  competency_eval: { label: "Competency Evaluation", icon: Target, color: "text-indigo-600", bg: "bg-indigo-50" },
  task_reassignment: { label: "Task Reassignment", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  ssop_update: { label: "SSOP Update", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
  drain_cleaning: { label: "Drain Intervention", icon: Droplets, color: "text-cyan-600", bg: "bg-cyan-50" },
  diverter_repair: { label: "Diverter Repair", icon: Droplets, color: "text-blue-600", bg: "bg-blue-50" },
  chemical_reorder: { label: "Chemical Reorder", icon: FlaskConical, color: "text-amber-600", bg: "bg-amber-50" },
  quota_adjustment: { label: "Quota Adjustment", icon: RefreshCw, color: "text-slate-600", bg: "bg-slate-50" },
  pest_control: { label: "Pest Control Action", icon: Bug, color: "text-orange-600", bg: "bg-orange-50" },
  emp_corrective: { label: "EMP Corrective Action", icon: Microscope, color: "text-rose-600", bg: "bg-rose-50" }
};

export default function EffectivenessTrackingEngine({
  tasks = [],
  employees = [],
  areaSignOffs = [],
  drainLocations = [],
  drainCleaningRecords = [],
  rainDiverters = [],
  diverterInspections = [],
  competencyEvaluations = [],
  employeeTrainings = [],
  timeRange = "30days",
  // Pest Control data
  pestFindings = [],
  pestEscalationMarkers = [],
  // Environmental Monitoring data
  empSamples = [],
  empSites = []
}) {
  const [expandedIntervention, setExpandedIntervention] = useState(null);

  // Calculate date ranges for analysis
  const getDateRanges = () => {
    const now = new Date();
    const days = timeRange === "7days" ? 7 : timeRange === "90days" ? 90 : 30;
    return {
      current: { start: subDays(now, days), end: now },
      prior: { start: subDays(now, days * 2), end: subDays(now, days) }
    };
  };

  const { current, prior } = getDateRanges();

  // Analyze all interventions and their outcomes
  const interventionAnalysis = useMemo(() => {
    const interventions = [];

    // 1. RETRAINING INTERVENTIONS
    const recentTrainings = employeeTrainings.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = parseISO(t.completed_at);
      return isWithinInterval(completedDate, { start: current.start, end: current.end });
    });

    // Group by training document to see patterns
    const trainingByDoc = {};
    recentTrainings.forEach(t => {
      if (!trainingByDoc[t.document_id]) {
        trainingByDoc[t.document_id] = { 
          title: t.document_title || "Training", 
          employees: [], 
          completedAt: t.completed_at 
        };
      }
      trainingByDoc[t.document_id].employees.push(t.employee_name || t.employee_email);
    });

    Object.entries(trainingByDoc).forEach(([docId, data]) => {
      // Measure outcome: task completion rate before/after for trained employees
      const trainedEmployeeEmails = recentTrainings
        .filter(t => t.document_id === docId)
        .map(t => t.employee_email);

      const beforeTasks = tasks.filter(t => 
        trainedEmployeeEmails.includes(t.assigned_to) &&
        t.completed_at &&
        isWithinInterval(parseISO(t.completed_at), { start: prior.start, end: prior.end })
      ).length;

      const afterTasks = tasks.filter(t =>
        trainedEmployeeEmails.includes(t.assigned_to) &&
        t.completed_at &&
        isWithinInterval(parseISO(t.completed_at), { start: current.start, end: current.end })
      ).length;

      const improvement = beforeTasks > 0 ? Math.round(((afterTasks - beforeTasks) / beforeTasks) * 100) : afterTasks > 0 ? 100 : 0;

      interventions.push({
        id: `training-${docId}`,
        type: "retraining",
        title: `${data.title} training`,
        description: `${data.employees.length} employee${data.employees.length > 1 ? 's' : ''} completed training`,
        date: data.completedAt,
        metrics: {
          before: beforeTasks,
          after: afterTasks,
          change: improvement,
          unit: "task completions"
        },
        effectiveness: improvement >= 20 ? "effective" : improvement >= 0 ? "partial" : "ineffective",
        summary: improvement >= 20 
          ? `Training improved task completion by ${improvement}% over ${differenceInDays(current.end, current.start)} days`
          : improvement >= 0
          ? `Training maintained performance levels (${improvement}% change)`
          : `Training did not improve performance (${improvement}% change) - consider different approach`,
        affectedEmployees: data.employees
      });
    });

    // 2. COMPETENCY EVALUATION INTERVENTIONS
    const recentEvaluations = competencyEvaluations.filter(e => {
      if (!e.evaluated_at) return false;
      const evalDate = parseISO(e.evaluated_at);
      return isWithinInterval(evalDate, { start: current.start, end: current.end });
    });

    if (recentEvaluations.length > 0) {
      const passedEvals = recentEvaluations.filter(e => e.result === "pass" || e.status === "competent");
      const passRate = Math.round((passedEvals.length / recentEvaluations.length) * 100);

      // Check if evaluated employees have better task completion
      const evaluatedEmails = [...new Set(recentEvaluations.map(e => e.employee_email))];
      const taskCompletionAfterEval = tasks.filter(t =>
        evaluatedEmails.includes(t.assigned_to) &&
        (t.status === "completed" || t.status === "verified")
      ).length;

      interventions.push({
        id: "competency-evals",
        type: "competency_eval",
        title: "Competency evaluations completed",
        description: `${recentEvaluations.length} evaluations, ${passRate}% pass rate`,
        date: recentEvaluations[0]?.evaluated_at,
        metrics: {
          total: recentEvaluations.length,
          passed: passedEvals.length,
          passRate,
          unit: "evaluations"
        },
        effectiveness: passRate >= 80 ? "effective" : passRate >= 60 ? "partial" : "ineffective",
        summary: passRate >= 80
          ? `${passRate}% competency pass rate indicates strong skill verification`
          : passRate >= 60
          ? `${passRate}% pass rate - ${recentEvaluations.length - passedEvals.length} employees need coaching`
          : `Low ${passRate}% pass rate suggests training gaps need addressing first`,
        affectedEmployees: evaluatedEmails
      });
    }

    // 3. DRAIN CLEANING INTERVENTIONS
    const recentDrainCleanings = drainCleaningRecords.filter(r => {
      if (!r.cleaned_at) return false;
      const cleanedDate = parseISO(r.cleaned_at);
      return isWithinInterval(cleanedDate, { start: current.start, end: current.end });
    });

    if (recentDrainCleanings.length > 0) {
      // Check for repeat issues on same drains
      const drainCounts = {};
      recentDrainCleanings.forEach(r => {
        drainCounts[r.drain_id] = (drainCounts[r.drain_id] || 0) + 1;
      });

      const repeatDrains = Object.values(drainCounts).filter(c => c > 1).length;
      const uniqueDrains = Object.keys(drainCounts).length;
      const repeatRate = uniqueDrains > 0 ? Math.round((repeatDrains / uniqueDrains) * 100) : 0;

      // Check overdue drains before vs after
      const overdueNow = drainLocations.filter(d => {
        if (!d.next_due_date) return false;
        return new Date(d.next_due_date) < new Date();
      }).length;

      interventions.push({
        id: "drain-cleanings",
        type: "drain_cleaning",
        title: "Drain cleaning program",
        description: `${recentDrainCleanings.length} cleanings on ${uniqueDrains} drains`,
        date: recentDrainCleanings[0]?.cleaned_at,
        metrics: {
          cleanings: recentDrainCleanings.length,
          uniqueDrains,
          repeatRate,
          overdueNow,
          unit: "drains"
        },
        effectiveness: repeatRate <= 10 && overdueNow === 0 ? "effective" : repeatRate <= 25 ? "partial" : "ineffective",
        summary: repeatRate <= 10 && overdueNow === 0
          ? `Drain program effective - ${repeatRate}% repeat findings, no overdue drains`
          : repeatRate <= 25
          ? `${repeatRate}% repeat findings on drains - monitor for persistent issues`
          : `High ${repeatRate}% repeat rate suggests root cause not addressed`,
        details: { repeatDrains, overdueNow }
      });
    }

    // 4. DIVERTER REPAIR INTERVENTIONS
    const recentDiverterInspections = diverterInspections.filter(i => {
      if (!i.inspection_date) return false;
      const inspDate = parseISO(i.inspection_date);
      return isWithinInterval(inspDate, { start: current.start, end: current.end });
    });

    if (recentDiverterInspections.length > 0) {
      const wetFindings = recentDiverterInspections.filter(i => i.finding === "wet").length;
      const dryFindings = recentDiverterInspections.filter(i => i.finding === "dry").length;
      const wetRate = recentDiverterInspections.length > 0 
        ? Math.round((wetFindings / recentDiverterInspections.length) * 100) 
        : 0;

      // Compare to prior period
      const priorInspections = diverterInspections.filter(i => {
        if (!i.inspection_date) return false;
        const inspDate = parseISO(i.inspection_date);
        return isWithinInterval(inspDate, { start: prior.start, end: prior.end });
      });
      const priorWetRate = priorInspections.length > 0
        ? Math.round((priorInspections.filter(i => i.finding === "wet").length / priorInspections.length) * 100)
        : 0;

      const improvement = priorWetRate - wetRate;

      interventions.push({
        id: "diverter-inspections",
        type: "diverter_repair",
        title: "Rain diverter monitoring",
        description: `${recentDiverterInspections.length} inspections, ${dryFindings} dry findings`,
        date: recentDiverterInspections[0]?.inspection_date,
        metrics: {
          inspections: recentDiverterInspections.length,
          wetRate,
          priorWetRate,
          improvement,
          unit: "inspections"
        },
        effectiveness: wetRate <= 10 ? "effective" : wetRate <= 30 ? "partial" : "ineffective",
        summary: improvement > 0
          ? `Wet findings reduced by ${improvement}% (${priorWetRate}% → ${wetRate}%)`
          : wetRate <= 10
          ? `Diverter program effective with only ${wetRate}% wet findings`
          : `${wetRate}% wet rate - repairs not resolving root cause`,
        details: { wetFindings, dryFindings }
      });
    }

    // 5. TASK REASSIGNMENT EFFECTIVENESS
    // Look for tasks that were reassigned (different assigned_to vs created_by patterns)
    const tasksWithMultipleAssignees = tasks.filter(t => 
      t.assigned_to && t.status === "completed" &&
      t.completed_at && isWithinInterval(parseISO(t.completed_at), { start: current.start, end: current.end })
    );

    if (tasksWithMultipleAssignees.length > 0) {
      const completionRate = Math.round((tasksWithMultipleAssignees.length / tasks.length) * 100);
      interventions.push({
        id: "task-assignments",
        type: "task_reassignment",
        title: "Task assignment optimization",
        description: `${tasksWithMultipleAssignees.length} tasks completed by assigned employees`,
        date: new Date().toISOString(),
        metrics: {
          completed: tasksWithMultipleAssignees.length,
          total: tasks.length,
          completionRate,
          unit: "tasks"
        },
        effectiveness: completionRate >= 85 ? "effective" : completionRate >= 70 ? "partial" : "ineffective",
        summary: completionRate >= 85
          ? `Strong ${completionRate}% task completion rate with current assignments`
          : completionRate >= 70
          ? `${completionRate}% completion - consider workload balancing`
          : `Low ${completionRate}% completion suggests assignment mismatches`
      });
    }

    // 6. PEST CONTROL INTERVENTIONS
    const recentPestFindings = pestFindings.filter(f => {
      if (!f.service_date) return false;
      const serviceDate = parseISO(f.service_date);
      return isWithinInterval(serviceDate, { start: current.start, end: current.end });
    });

    const priorPestFindings = pestFindings.filter(f => {
      if (!f.service_date) return false;
      const serviceDate = parseISO(f.service_date);
      return isWithinInterval(serviceDate, { start: prior.start, end: prior.end });
    });

    if (recentPestFindings.length > 0 || priorPestFindings.length > 0) {
      const recentExceedances = recentPestFindings.filter(f => f.threshold_exceeded).length;
      const priorExceedances = priorPestFindings.filter(f => f.threshold_exceeded).length;
      const exceedanceRate = recentPestFindings.length > 0 
        ? Math.round((recentExceedances / recentPestFindings.length) * 100) 
        : 0;
      const priorRate = priorPestFindings.length > 0 
        ? Math.round((priorExceedances / priorPestFindings.length) * 100) 
        : 0;
      const improvement = priorRate - exceedanceRate;

      const resolvedEscalations = pestEscalationMarkers.filter(e => 
        e.status === "resolved" &&
        e.resolved_date &&
        isWithinInterval(parseISO(e.resolved_date), { start: current.start, end: current.end })
      ).length;

      interventions.push({
        id: "pest-control",
        type: "pest_control",
        title: "Pest control program",
        description: `${recentPestFindings.length} findings, ${recentExceedances} exceedances, ${resolvedEscalations} escalations resolved`,
        date: recentPestFindings[0]?.service_date || new Date().toISOString(),
        metrics: {
          findings: recentPestFindings.length,
          exceedances: recentExceedances,
          exceedanceRate,
          priorRate,
          improvement,
          resolved: resolvedEscalations,
          unit: "pest findings"
        },
        effectiveness: exceedanceRate === 0 ? "effective" : improvement > 0 ? "partial" : "ineffective",
        summary: exceedanceRate === 0
          ? `Pest control effective - zero threshold exceedances`
          : improvement > 0
          ? `Pest activity reduced by ${improvement}% (${priorRate}% → ${exceedanceRate}%)`
          : improvement === 0
          ? `Pest activity stable at ${exceedanceRate}% exceedance rate`
          : `Pest activity worsening - exceedances increased ${Math.abs(improvement)}%`,
        details: { recentExceedances, resolvedEscalations }
      });
    }

    // 7. ENVIRONMENTAL MONITORING CORRECTIVE ACTIONS
    const recentEmpSamples = empSamples.filter(s => {
      if (!s.collection_date) return false;
      const collectionDate = parseISO(s.collection_date);
      return isWithinInterval(collectionDate, { start: current.start, end: current.end });
    });

    const priorEmpSamples = empSamples.filter(s => {
      if (!s.collection_date) return false;
      const collectionDate = parseISO(s.collection_date);
      return isWithinInterval(collectionDate, { start: prior.start, end: prior.end });
    });

    if (recentEmpSamples.length > 0) {
      const recentFailures = recentEmpSamples.filter(s => s.overall_result === "fail").length;
      const priorFailures = priorEmpSamples.filter(s => s.overall_result === "fail").length;
      
      const failureRate = Math.round((recentFailures / recentEmpSamples.length) * 100);
      const priorFailureRate = priorEmpSamples.length > 0 
        ? Math.round((priorFailures / priorEmpSamples.length) * 100) 
        : 0;
      const improvement = priorFailureRate - failureRate;

      const pathogenPositives = recentEmpSamples.filter(s => 
        s.overall_result === "fail" && 
        s.test_results?.some(t => 
          (t.test_type === "listeria_mono" || t.test_type === "salmonella") && 
          t.result === "positive"
        )
      ).length;

      const reswabsCompleted = recentEmpSamples.filter(s => s.is_reswab && s.overall_result === "pass").length;

      interventions.push({
        id: "emp-program",
        type: "emp_corrective",
        title: "Environmental monitoring program",
        description: `${recentEmpSamples.length} samples, ${pathogenPositives} pathogen positive${pathogenPositives > 0 ? 's' : ''}`,
        date: recentEmpSamples[0]?.collection_date || new Date().toISOString(),
        metrics: {
          samples: recentEmpSamples.length,
          failures: recentFailures,
          failureRate,
          priorFailureRate,
          improvement,
          pathogenPositives,
          reswabsCompleted,
          unit: "samples"
        },
        effectiveness: pathogenPositives === 0 && failureRate <= 5 ? "effective" : improvement > 0 ? "partial" : "ineffective",
        summary: pathogenPositives === 0 && failureRate <= 5
          ? `EMP program highly effective - ${failureRate}% failure rate, zero pathogen detections`
          : improvement > 0
          ? `Positive failure rate reduced by ${improvement}% (${priorFailureRate}% → ${failureRate}%)`
          : pathogenPositives > 0
          ? `CRITICAL: ${pathogenPositives} pathogen positive(s) - corrective actions needed`
          : `${failureRate}% failure rate requires enhanced sanitation focus`,
        details: { pathogenPositives, recentFailures, reswabsCompleted }
      });
    }

    return interventions.sort((a, b) => {
      // Sort by effectiveness (effective first) then by date
      const effectivenessOrder = { effective: 0, partial: 1, ineffective: 2 };
      if (effectivenessOrder[a.effectiveness] !== effectivenessOrder[b.effectiveness]) {
        return effectivenessOrder[a.effectiveness] - effectivenessOrder[b.effectiveness];
      }
      return new Date(b.date) - new Date(a.date);
    });
  }, [tasks, employees, areaSignOffs, drainLocations, drainCleaningRecords, rainDiverters, diverterInspections, competencyEvaluations, employeeTrainings, pestFindings, pestEscalationMarkers, empSamples, empSites, current, prior]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const effective = interventionAnalysis.filter(i => i.effectiveness === "effective").length;
    const partial = interventionAnalysis.filter(i => i.effectiveness === "partial").length;
    const ineffective = interventionAnalysis.filter(i => i.effectiveness === "ineffective").length;
    const total = interventionAnalysis.length;

    return {
      effective,
      partial,
      ineffective,
      total,
      effectiveRate: total > 0 ? Math.round((effective / total) * 100) : 0
    };
  }, [interventionAnalysis]);

  const getEffectivenessIcon = (effectiveness) => {
    switch (effectiveness) {
      case "effective": return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case "partial": return <Minus className="w-4 h-4 text-amber-600" />;
      case "ineffective": return <TrendingDown className="w-4 h-4 text-rose-600" />;
      default: return null;
    }
  };

  const getEffectivenessBadge = (effectiveness) => {
    switch (effectiveness) {
      case "effective": return <Badge className="bg-emerald-100 text-emerald-800">Effective</Badge>;
      case "partial": return <Badge className="bg-amber-100 text-amber-800">Partial</Badge>;
      case "ineffective": return <Badge className="bg-rose-100 text-rose-800">Ineffective</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Intervention Effectiveness</h2>
                <p className="text-sm text-slate-300">Closed-loop tracking of actions → outcomes</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{summaryStats.effectiveRate}%</p>
              <p className="text-sm text-slate-300">actions effective</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-2xl font-bold">{summaryStats.effective}</span>
              </div>
              <p className="text-xs text-slate-300">Effective</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Minus className="w-4 h-4 text-amber-400" />
                <span className="text-2xl font-bold">{summaryStats.partial}</span>
              </div>
              <p className="text-xs text-slate-300">Partial</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span className="text-2xl font-bold">{summaryStats.ineffective}</span>
              </div>
              <p className="text-xs text-slate-300">Ineffective</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intervention List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Recent Interventions & Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {interventionAnalysis.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No interventions tracked in this period</p>
              <p className="text-sm">Actions like training, evaluations, and cleanings will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interventionAnalysis.map((intervention) => {
                const typeConfig = INTERVENTION_TYPES[intervention.type] || INTERVENTION_TYPES.task_reassignment;
                const Icon = typeConfig.icon;
                const isExpanded = expandedIntervention === intervention.id;

                return (
                  <Collapsible 
                    key={intervention.id} 
                    open={isExpanded} 
                    onOpenChange={() => setExpandedIntervention(isExpanded ? null : intervention.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className={cn(
                        "rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md",
                        intervention.effectiveness === "effective" ? "border-emerald-200 bg-emerald-50/50" :
                        intervention.effectiveness === "partial" ? "border-amber-200 bg-amber-50/50" :
                        "border-rose-200 bg-rose-50/50"
                      )}>
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                            <Icon className={cn("w-4 h-4", typeConfig.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-slate-900">{intervention.title}</h3>
                                <p className="text-sm text-slate-600">{intervention.description}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {getEffectivenessBadge(intervention.effectiveness)}
                                <ChevronDown className={cn(
                                  "w-4 h-4 text-slate-400 transition-transform",
                                  isExpanded && "rotate-180"
                                )} />
                              </div>
                            </div>
                            <p className="text-sm text-slate-700 mt-2 font-medium">{intervention.summary}</p>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="ml-12 mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          {Object.entries(intervention.metrics).map(([key, value]) => {
                            if (key === "unit") return null;
                            return (
                              <div key={key} className="text-center">
                                <p className="text-lg font-bold text-slate-900">
                                  {typeof value === "number" ? (key.includes("Rate") || key.includes("change") ? `${value}%` : value) : value}
                                </p>
                                <p className="text-xs text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              </div>
                            );
                          })}
                        </div>
                        {intervention.date && (
                          <p className="text-xs text-slate-500">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {format(parseISO(intervention.date), "MMM d, yyyy")}
                          </p>
                        )}
                        {intervention.affectedEmployees && intervention.affectedEmployees.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-slate-500 mb-1">Affected employees:</p>
                            <div className="flex flex-wrap gap-1">
                              {intervention.affectedEmployees.slice(0, 5).map((emp, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{emp}</Badge>
                              ))}
                              {intervention.affectedEmployees.length > 5 && (
                                <Badge variant="outline" className="text-xs">+{intervention.affectedEmployees.length - 5} more</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations from Learning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            What's Working
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {interventionAnalysis.filter(i => i.effectiveness === "effective").length === 0 ? (
              <p className="text-sm text-slate-500">No clearly effective interventions identified yet</p>
            ) : (
              interventionAnalysis
                .filter(i => i.effectiveness === "effective")
                .slice(0, 3)
                .map(i => (
                  <div key={i.id} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm text-emerald-900">{i.summary}</p>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {interventionAnalysis.filter(i => i.effectiveness === "ineffective").length === 0 ? (
              <p className="text-sm text-slate-500">No ineffective interventions identified</p>
            ) : (
              interventionAnalysis
                .filter(i => i.effectiveness === "ineffective")
                .slice(0, 3)
                .map(i => (
                  <div key={i.id} className="flex items-center gap-2 p-2 bg-rose-50 rounded-lg">
                    <TrendingDown className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <p className="text-sm text-rose-900">{i.summary}</p>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}