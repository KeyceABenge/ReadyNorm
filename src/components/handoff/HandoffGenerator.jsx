import { useState } from "react";
import { invokeLLM } from "@/lib/adapters/integrations";
import {
  EmployeeSessionRepo, TaskRepo, IncidentRepo, SiteSettingsRepo,
  EMPSampleRepo, PestFindingRepo, EmployeeRepo, DrainLocationRepo,
  RainDiverterRepo, TaskTrainingGapRepo, PestEscalationMarkerRepo,
  PestServiceReportRepo, EMPSiteRepo, ShiftHandoffRepo
} from "@/lib/adapters/database";
import { getCurrentUser } from "@/lib/adapters/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, Loader2, Clock, Users, CheckCircle2, AlertTriangle, AlertCircle,
  Bug, Microscope
} from "lucide-react";
import { format, subHours, parseISO, isWithinInterval } from "date-fns";
import { toast } from "sonner";

export default function HandoffGenerator({ organizationId, settings, onGenerated }) {
  const [hours, setHours] = useState(settings.default_hours || 12);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");

  const periodEnd = new Date();
  const periodStart = subHours(periodEnd, hours);

  // Optimized: Fetch only essential preview data initially
  // Full data is fetched on-demand during generation
  const queryConfig = {
    staleTime: 60000,
    refetchOnWindowFocus: false
  };

  // Essential preview data - fetch in parallel
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["handoff_sessions", organizationId, format(periodStart, "yyyy-MM-dd")],
    queryFn: () => EmployeeSessionRepo.filter({ 
      organization_id: organizationId,
      session_date: format(periodStart, "yyyy-MM-dd")
    }, "-start_time", 50),
    enabled: !!organizationId,
    ...queryConfig
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["handoff_tasks", organizationId],
    queryFn: () => TaskRepo.filter({ organization_id: organizationId }, "-created_date", 100),
    enabled: !!organizationId,
    ...queryConfig
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["handoff_incidents", organizationId],
    queryFn: () => IncidentRepo.filter({ organization_id: organizationId, status: "open" }, "-created_date", 20),
    enabled: !!organizationId,
    ...queryConfig
  });

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["site_settings"],
    queryFn: () => SiteSettingsRepo.list(),
    ...queryConfig
  });

  // Lightweight counts for preview - only fetch recent critical items
  const { data: empSamples = [] } = useQuery({
    queryKey: ["handoff_emp_preview", organizationId],
    queryFn: () => EMPSampleRepo.filter({ organization_id: organizationId }, "-collection_date", 20),
    enabled: !!organizationId,
    ...queryConfig
  });

  const { data: pestFindings = [] } = useQuery({
    queryKey: ["handoff_pest_preview", organizationId],
    queryFn: () => PestFindingRepo.filter({ organization_id: organizationId }, "-service_date", 30),
    enabled: !!organizationId,
    ...queryConfig
  });

  // Fetch full data only during generation to reduce mobile load
  const fetchFullDataForGeneration = async () => {
    const [employees, drains, diverters, trainingGaps, pestEscalations, pestReports, empSites] = await Promise.all([
      EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
      DrainLocationRepo.filter({ organization_id: organizationId, status: "active" }),
      RainDiverterRepo.filter({ organization_id: organizationId, status: "active" }),
      TaskTrainingGapRepo.filter({ organization_id: organizationId, status: "open" }),
      PestEscalationMarkerRepo.filter({ organization_id: organizationId, status: "active" }),
      PestServiceReportRepo.filter({ organization_id: organizationId }, "-service_date", 10),
      EMPSiteRepo.filter({ organization_id: organizationId, status: "active" })
    ]);
    return { employees, drains, diverters, trainingGaps, pestEscalations, pestReports, empSites };
  };

  const generateHandoff = async () => {
    setIsGenerating(true);
    
    try {
      // Step 1: Fetch full data on-demand
      setGenerationStep("Loading data...");
      const { employees, drains, diverters, trainingGaps, pestEscalations, pestReports, empSites } = await fetchFullDataForGeneration();
      
      // Step 2: Compile team data
      setGenerationStep("Analyzing team performance...");
      
      const activeSessions = sessions.filter(s => {
        const sessionStart = s.start_time ? parseISO(s.start_time) : null;
        return sessionStart && isWithinInterval(sessionStart, { start: periodStart, end: periodEnd });
      });

      const teamSummary = {
        employees: activeSessions.map(s => {
          const emp = employees.find(e => e.id === s.employee_id);
          return {
            name: s.employee_name || emp?.name || "Unknown",
            email: s.employee_email,
            role: emp?.role || "Employee",
            tasks_selected: s.tasks_selected_count || 0,
            tasks_completed: s.tasks_completed_count || 0,
            completion_rate: s.completion_rate || 0
          };
        }),
        helpers: [],
        total_employees: activeSessions.length,
        total_helpers: 0
      };

      // Step 3: Calculate performance metrics
      setGenerationStep("Calculating performance metrics...");
      
      const completedTasks = tasks.filter(t => 
        t.status === "completed" && 
        t.completed_at && 
        isWithinInterval(parseISO(t.completed_at), { start: periodStart, end: periodEnd })
      );
      
      const totalSelected = teamSummary.employees.reduce((sum, e) => sum + e.tasks_selected, 0);
      const totalCompleted = teamSummary.employees.reduce((sum, e) => sum + e.tasks_completed, 0);
      
      const performanceMetrics = {
        mss_completion_pct: totalSelected > 0 ? Math.round((totalCompleted / totalSelected) * 100) : 0,
        quota_target: totalSelected,
        quota_actual: totalCompleted,
        health_score_start: 75, // Would calculate from historical data
        health_score_end: 78,
        health_score_change: 3,
        top_risk_drivers: []
      };

      // Step 4: Identify quality signals
      setGenerationStep("Identifying quality signals...");
      
      const reopenedTasks = tasks.filter(t => 
        activeSessions.some(s => (s.reopened_tasks || []).includes(t.id))
      );
      
      const qualitySignals = {
        late_signoffs: 0,
        low_confidence_completions: 0,
        reopened_carryovers: reopenedTasks.length,
        verification_issues: []
      };

      // Step 5: Compile completed items
      setGenerationStep("Compiling completed work...");
      
      const completedItems = completedTasks.slice(0, 20).map(t => ({
        type: "task",
        title: t.title,
        completed_by: t.assigned_to_name || t.assigned_to,
        notes: t.completion_notes || ""
      }));

      // Step 6: Identify incomplete items
      setGenerationStep("Flagging incomplete items...");
      
      const incompleteTasks = tasks.filter(t => 
        t.status === "pending" || t.status === "in_progress" || t.status === "overdue"
      );
      
      const incompleteItems = incompleteTasks.slice(0, 15).map(t => ({
        type: "task",
        title: t.title,
        reason: t.status === "overdue" ? "Overdue" : "Not started",
        priority: t.priority || "medium"
      }));

      // Step 7: Critical carryovers
      setGenerationStep("Analyzing critical carryovers...");
      
      const overdueTasks = tasks.filter(t => t.status === "overdue");
      const highRiskTasks = tasks.filter(t => t.priority === "critical" || t.priority === "high");
      const drainsDue = drains.filter(d => {
        if (!d.next_due_date) return false;
        return parseISO(d.next_due_date) <= new Date();
      });
      const wetDiverters = diverters.filter(d => d.last_finding === "wet");
      const eligibleForRemoval = diverters.filter(d => d.eligible_for_removal);
      const openIncidents = incidents.filter(i => i.status !== "closed");
      
      // Pest Control carryovers
      const recentPestFindings = pestFindings.filter(f => {
        if (!f.service_date) return false;
        return isWithinInterval(parseISO(f.service_date), { start: subHours(periodEnd, 72), end: periodEnd });
      });
      const pestExceedances = recentPestFindings.filter(f => f.threshold_exceeded);
      const criticalPestExceedances = pestExceedances.filter(f => f.exceedance_severity === "critical");
      const activeEscalations = pestEscalations.filter(e => e.status === "active");
      const pendingPestReports = pestReports.filter(r => r.review_status === "pending_review");

      // EMP carryovers
      const recentEmpSamples = empSamples.filter(s => {
        if (!s.collection_date) return false;
        return isWithinInterval(parseISO(s.collection_date), { start: subHours(periodEnd, 72), end: periodEnd });
      });
      const pathogenPositives = recentEmpSamples.filter(s => 
        s.overall_result === "fail" && 
        s.test_results?.some(t => 
          (t.test_type === "listeria_mono" || t.test_type === "salmonella") && 
          t.result === "positive"
        )
      );
      const pendingReswabs = empSamples.filter(s => s.requires_reswab && s.status !== "closed");
      const overdueReswabs = pendingReswabs.filter(s => 
        s.reswab_due_date && new Date(s.reswab_due_date) < new Date()
      );

      const criticalCarryovers = {
        overdue_tasks: overdueTasks.slice(0, 10).map(t => ({ id: t.id, title: t.title, due_date: t.due_date })),
        high_risk_tasks: highRiskTasks.slice(0, 10).map(t => ({ id: t.id, title: t.title, priority: t.priority })),
        drains_due: drainsDue.slice(0, 10).map(d => ({ id: d.id, drain_id: d.drain_id, location: d.location_description })),
        wet_diverters: wetDiverters.slice(0, 10).map(d => ({ id: d.id, diverter_id: d.diverter_id, location: d.location_description })),
        diverters_eligible_removal: eligibleForRemoval.slice(0, 5).map(d => ({ id: d.id, diverter_id: d.diverter_id })),
        inventory_alerts: [],
        titration_issues: [],
        open_incidents: openIncidents.slice(0, 5).map(i => ({ id: i.id, title: i.title, severity: i.severity, status: i.status })),
        corrective_actions: openIncidents.filter(i => i.status === "corrective_action").slice(0, 5).map(i => ({ id: i.id, title: i.title })),
        training_gaps: trainingGaps.slice(0, 5).map(g => ({ employee: g.employee_name, task: g.task_title })),
        // Pest Control
        pest_exceedances: pestExceedances.slice(0, 5).map(f => ({ 
          id: f.id, device_code: f.device_code, pest_type: f.pest_type, count: f.count, severity: f.exceedance_severity 
        })),
        pest_escalations: activeEscalations.slice(0, 5).map(e => ({ 
          id: e.id, pest_category: e.pest_category, severity: e.severity, area: e.area_description 
        })),
        pending_pest_reports: pendingPestReports.length,
        // Environmental Monitoring
        pathogen_positives: pathogenPositives.slice(0, 5).map(s => ({ 
          id: s.id, site_code: s.site_code, zone: s.zone_classification, test_type: s.test_results?.find(t => t.result === "positive")?.test_type 
        })),
        pending_reswabs: pendingReswabs.slice(0, 5).map(s => ({ 
          id: s.id, site_code: s.site_code, zone: s.zone_classification, due_date: s.reswab_due_date 
        })),
        overdue_reswabs: overdueReswabs.length
      };

      // Step 8: Generate AI narrative and priorities
      setGenerationStep("Generating AI summary...");
      
      const prompt = `Generate a concise shift handoff summary for a sanitation team.

Period: ${format(periodStart, "MMM d, h:mm a")} to ${format(periodEnd, "h:mm a")}

Team Performance:
- ${teamSummary.total_employees} employees worked
- ${performanceMetrics.quota_actual}/${performanceMetrics.quota_target} tasks completed (${performanceMetrics.mss_completion_pct}%)
- ${qualitySignals.reopened_carryovers} tasks were reopened/carried over

Critical Issues:
- ${criticalCarryovers.overdue_tasks.length} overdue tasks
- ${criticalCarryovers.drains_due.length} drains due for cleaning
- ${criticalCarryovers.wet_diverters.length} wet rain diverters
- ${criticalCarryovers.open_incidents.length} open incidents
- ${criticalCarryovers.training_gaps.length} training gaps

Pest Control:
- ${criticalCarryovers.pest_exceedances.length} threshold exceedances${criticalPestExceedances.length > 0 ? ` (${criticalPestExceedances.length} CRITICAL)` : ''}
- ${criticalCarryovers.pest_escalations.length} active escalation markers
- ${criticalCarryovers.pending_pest_reports} reports pending review

Environmental Monitoring (HIGH PRIORITY):
- ${criticalCarryovers.pathogen_positives.length} pathogen positives${pathogenPositives.some(s => s.zone_classification === "zone_1") ? ' (ZONE 1 AFFECTED)' : ''}
- ${criticalCarryovers.pending_reswabs.length} pending reswabs (${criticalCarryovers.overdue_reswabs} overdue)

Please provide:
1. A 2-3 sentence executive summary (prioritize pathogen positives and pest exceedances if present)
2. Top 3-5 priorities for the next shift with brief reasoning (EMP and pest issues should be top priorities when present)

Format as JSON: { "narrative": "...", "priorities": [{"priority": 1, "action": "...", "reason": "..."}] }`;

      const aiResponse = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            narrative: { type: "string" },
            priorities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "number" },
                  action: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Step 9: Save handoff
      setGenerationStep("Saving handoff...");
      
      const user = await getCurrentUser();
      
      const handoffData = {
        organization_id: organizationId,
        handoff_date: format(new Date(), "yyyy-MM-dd"),
        shift_name: getShiftName(siteSettings[0]?.shifts, new Date()),
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        hours_covered: hours,
        generated_at: new Date().toISOString(),
        generated_by: user.email,
        status: "draft",
        team_summary: teamSummary,
        performance_metrics: performanceMetrics,
        quality_signals: qualitySignals,
        completed_items: completedItems,
        incomplete_items: incompleteItems,
        critical_carryovers: criticalCarryovers,
        top_priorities: aiResponse.priorities || [],
        ai_narrative: aiResponse.narrative || "",
        manager_notes: ""
      };

      const created = await ShiftHandoffRepo.create(handoffData);
      
      toast.success("Handoff generated successfully!");
      onGenerated(created);
      
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate handoff");
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  const getShiftName = (shifts, date) => {
    if (!shifts || shifts.length === 0) return "Shift";
    const hour = date.getHours();
    const shift = shifts.find(s => {
      const [startH] = s.start_time.split(":").map(Number);
      const [endH] = s.end_time.split(":").map(Number);
      if (startH < endH) {
        return hour >= startH && hour < endH;
      } else {
        return hour >= startH || hour < endH;
      }
    });
    return shift?.name || "Shift";
  };

  // Preview stats
  const activeSessions = sessions.filter(s => s.status === "active" || s.status === "ended");
  const overdueTasks = tasks.filter(t => t.status === "overdue");
  const openIncidents = incidents.filter(i => i.status !== "closed");
  const pathogenPositivesCount = empSamples.filter(s => 
    s.overall_result === "fail" && 
    s.test_results?.some(t => 
      (t.test_type === "listeria_mono" || t.test_type === "salmonella") && 
      t.result === "positive"
    )
  ).length;
  const pestExceedancesCount = pestFindings.filter(f => f.threshold_exceeded).length;

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Generate Shift Handoff
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Hours to Cover</Label>
              <Select value={String(hours)} onValueChange={v => setHours(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">Last 6 hours</SelectItem>
                  <SelectItem value="8">Last 8 hours</SelectItem>
                  <SelectItem value="10">Last 10 hours</SelectItem>
                  <SelectItem value="12">Last 12 hours</SelectItem>
                  <SelectItem value="24">Last 24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Period Covered</Label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg border text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4" />
                  {format(periodStart, "MMM d, h:mm a")} — {format(periodEnd, "h:mm a")}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Team</span>
              </div>
              <p className="text-xl font-bold text-blue-900">{activeSessions.length}</p>
              <p className="text-xs text-blue-600">worked</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">Done</span>
              </div>
              <p className="text-xl font-bold text-emerald-900">
                {tasks.filter(t => t.status === "completed").length}
              </p>
              <p className="text-xs text-emerald-600">tasks</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">Overdue</span>
              </div>
              <p className="text-xl font-bold text-amber-900">{overdueTasks.length}</p>
              <p className="text-xs text-amber-600">tasks</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Incidents</span>
              </div>
              <p className="text-xl font-bold text-red-900">{openIncidents.length}</p>
              <p className="text-xs text-red-600">open</p>
            </div>
            <div className={`p-3 rounded-lg border ${pathogenPositivesCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className={`flex items-center gap-2 mb-1 ${pathogenPositivesCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                <Microscope className="w-4 h-4" />
                <span className="text-xs font-medium">EMP</span>
              </div>
              <p className={`text-xl font-bold ${pathogenPositivesCount > 0 ? 'text-rose-900' : 'text-emerald-900'}`}>{pathogenPositivesCount}</p>
              <p className={`text-xs ${pathogenPositivesCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>positives</p>
            </div>
            <div className={`p-3 rounded-lg border ${pestExceedancesCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className={`flex items-center gap-2 mb-1 ${pestExceedancesCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                <Bug className="w-4 h-4" />
                <span className="text-xs font-medium">Pest</span>
              </div>
              <p className={`text-xl font-bold ${pestExceedancesCount > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>{pestExceedancesCount}</p>
              <p className={`text-xs ${pestExceedancesCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>exceedances</p>
            </div>
          </div>

          <Button 
            onClick={generateHandoff} 
            disabled={isGenerating}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {generationStep || "Generating..."}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Handoff Summary
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}