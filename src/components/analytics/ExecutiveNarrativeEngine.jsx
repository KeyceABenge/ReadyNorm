// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  FileText, Mail, Calendar, Shield, TrendingUp,
  CheckCircle2, AlertTriangle, Users, Droplets, Target,
  Loader2, Copy, Award, Zap,
  Bug, Microscope
} from "lucide-react";
import { format, subWeeks, subMonths, parseISO, startOfDay, endOfDay,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { invokeLLM, sendEmail } from "@/lib/adapters/integrations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ExecutiveNarrativeEngine({
  tasks = [],
  employees = [],
  areaSignOffs = [],
  drainLocations = [],
  drainCleaningRecords = [],
  rainDiverters = [],
  diverterInspections = [],
  competencyEvaluations = [],
  employeeTrainings = [],
  employeeSessions = [],
  siteSettings = {},
  organizationId,
  // Pest Control data
  pestFindings = [],
  pestServiceReports = [],
  pestEscalationMarkers = [],
  // Environmental Monitoring data
  empSamples = [],
  empSites = []
}) {
  const [narrativePeriod, setNarrativePeriod] = useState("weekly");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNarrative, setGeneratedNarrative] = useState(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Calculate date range based on period
  const getDateRange = (period) => {
    const now = new Date();
    let start, end, label;
    
    switch (period) {
      case "daily":
        start = startOfDay(now);
        end = endOfDay(now);
        label = format(now, "MMMM d, yyyy");
        break;
      case "weekly":
        start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        label = `Week of ${format(start, "MMMM d")} - ${format(end, "MMMM d, yyyy")}`;
        break;
      case "monthly":
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        label = format(start, "MMMM yyyy");
        break;
      default:
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfDay(now);
        label = "Current Week";
    }
    
    return { start, end, label };
  };

  // Gather all metrics for the narrative
  const gatherMetrics = (period) => {
    const { start, end } = getDateRange(period);
    const now = new Date();
    
    // Task metrics
    const workTasks = tasks.filter(t => !t.is_group);
    const completedInPeriod = workTasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = parseISO(t.completed_at);
      return isWithinInterval(completedDate, { start, end });
    });
    
    const overdueInPeriod = workTasks.filter(t => {
      if (t.status === "completed" || t.status === "verified") return false;
      if (!t.due_date) return false;
      const dueDate = parseISO(t.due_date);
      return isWithinInterval(dueDate, { start, end }) && dueDate < now;
    });

    const totalDueInPeriod = workTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = parseISO(t.due_date);
      return isWithinInterval(dueDate, { start, end });
    });

    const completionRate = totalDueInPeriod.length > 0 
      ? Math.round((completedInPeriod.length / totalDueInPeriod.length) * 100)
      : 100;

    // ATP metrics
    const atpTests = areaSignOffs.filter(s => {
      if (!s.atp_tested_at || !s.atp_test_result || s.atp_test_result === "not_required") return false;
      const testedDate = parseISO(s.atp_tested_at);
      return isWithinInterval(testedDate, { start, end });
    });
    const atpPassed = atpTests.filter(s => s.atp_test_result === "pass").length;
    const atpPassRate = atpTests.length > 0 ? Math.round((atpPassed / atpTests.length) * 100) : 100;

    // Drain compliance
    const activeDrains = drainLocations.filter(d => d.status === "active" && !d.is_sealed);
    const drainCleaningsInPeriod = drainCleaningRecords.filter(r => {
      if (!r.cleaned_at) return false;
      const cleanedDate = parseISO(r.cleaned_at);
      return isWithinInterval(cleanedDate, { start, end });
    });
    const drainsWithIssues = drainCleaningsInPeriod.filter(r => r.issues_found);

    // Diverter metrics
    const activeDiverters = rainDiverters.filter(d => d.status === "active");
    const wetDiverters = activeDiverters.filter(d => d.last_finding === "wet");
    const diverterInspectionsInPeriod = diverterInspections.filter(i => {
      if (!i.inspection_date) return false;
      const inspDate = parseISO(i.inspection_date);
      return isWithinInterval(inspDate, { start, end });
    });

    // Competency metrics
    const evaluationsInPeriod = competencyEvaluations.filter(e => {
      if (!e.evaluated_at) return false;
      const evalDate = parseISO(e.evaluated_at);
      return isWithinInterval(evalDate, { start, end });
    });
    const competentResults = evaluationsInPeriod.filter(e => e.result === "pass" || e.status === "competent");
    const needsCoaching = evaluationsInPeriod.filter(e => e.result === "needs_coaching" || e.status === "needs_coaching");

    // Team health metrics (fatigue signals)
    const lateSignoffs = completedInPeriod.filter(t => {
      if (!t.due_date || !t.completed_at) return false;
      const dueDate = new Date(t.due_date);
      const completedDate = new Date(t.completed_at);
      return (completedDate - dueDate) > 4 * 60 * 60 * 1000;
    });
    const lateSignoffRate = completedInPeriod.length > 0 
      ? Math.round((lateSignoffs.length / completedInPeriod.length) * 100)
      : 0;

    // Shifts worked
    const shiftsInPeriod = employeeSessions.filter(s => {
      if (!s.session_date) return false;
      const sessionDate = parseISO(s.session_date);
      return isWithinInterval(sessionDate, { start, end });
    });

    // Calculate health score (simplified)
    const healthScore = Math.round(
      (completionRate * 0.35) +
      (atpPassRate * 0.25) +
      ((activeDrains.length > 0 ? ((activeDrains.length - drainsWithIssues.length) / activeDrains.length) * 100 : 100) * 0.15) +
      ((activeDiverters.length > 0 ? ((activeDiverters.length - wetDiverters.length) / activeDiverters.length) * 100 : 100) * 0.15) +
      (Math.max(0, 100 - lateSignoffRate) * 0.1)
    );

    // Pest Control metrics
    const recentPestFindings = pestFindings.filter(f => {
      if (!f.service_date) return false;
      const serviceDate = parseISO(f.service_date);
      return isWithinInterval(serviceDate, { start, end });
    });
    const pestExceedances = recentPestFindings.filter(f => f.threshold_exceeded);
    const criticalPestExceedances = pestExceedances.filter(f => f.exceedance_severity === "critical");
    const activeEscalations = pestEscalationMarkers.filter(e => e.status === "active");
    const pendingPestReports = pestServiceReports.filter(r => r.review_status === "pending_review");

    // Environmental Monitoring metrics
    const recentEmpSamples = empSamples.filter(s => {
      if (!s.collection_date) return false;
      const collectionDate = parseISO(s.collection_date);
      return isWithinInterval(collectionDate, { start, end });
    });
    const empFailures = recentEmpSamples.filter(s => s.overall_result === "fail");
    const pathogenPositives = empFailures.filter(s => 
      s.test_results?.some(t => 
        (t.test_type === "listeria_mono" || t.test_type === "salmonella") && 
        t.result === "positive"
      )
    );
    const indicatorFailures = empFailures.filter(s => 
      !s.test_results?.some(t => 
        (t.test_type === "listeria_mono" || t.test_type === "salmonella") && 
        t.result === "positive"
      )
    );
    const pendingReswabs = recentEmpSamples.filter(s => s.requires_reswab && s.status !== "closed");
    const overdueReswabs = pendingReswabs.filter(s => 
      s.reswab_due_date && new Date(s.reswab_due_date) < new Date()
    );
    const zone1Positives = pathogenPositives.filter(s => s.zone_classification === "zone_1");

    // Identify key achievements
    const achievements = [];
    if (completionRate >= 95) achievements.push(`Achieved ${completionRate}% task completion rate`);
    if (atpPassRate >= 95 && atpTests.length > 0) achievements.push(`Maintained ${atpPassRate}% ATP first-pass rate`);
    if (wetDiverters.length === 0 && activeDiverters.length > 0) achievements.push("All rain diverters reading dry");
    if (drainsWithIssues.length === 0 && drainCleaningsInPeriod.length > 0) achievements.push("Zero drain issues reported");
    if (competentResults.length > 0) achievements.push(`${competentResults.length} employee(s) achieved competency certification`);
    if (pathogenPositives.length === 0 && recentEmpSamples.length > 0) achievements.push("Zero pathogen detections in environmental monitoring");
    if (pestExceedances.length === 0 && recentPestFindings.length > 0) achievements.push("All pest activity within thresholds");

    // Identify risks addressed
    const risksAddressed = [];
    if (overdueInPeriod.length < 3) risksAddressed.push("Maintained minimal task backlog");
    if (needsCoaching.length > 0) risksAddressed.push(`Identified ${needsCoaching.length} coaching opportunity(ies) through evaluation`);
    if (pendingReswabs.length > 0 && overdueReswabs.length === 0) risksAddressed.push("All reswabs collected on schedule");
    if (activeEscalations.length === 0 && pestEscalationMarkers.length > 0) risksAddressed.push("Resolved all pest escalation markers");
    
    // Identify areas of concern
    const concerns = [];
    if (completionRate < 85) concerns.push(`Task completion rate at ${completionRate}% (below 85% target)`);
    if (atpPassRate < 90 && atpTests.length > 0) concerns.push(`ATP pass rate at ${atpPassRate}% requires attention`);
    if (wetDiverters.length > 0) concerns.push(`${wetDiverters.length} diverter(s) showing wet conditions`);
    if (lateSignoffRate > 25) concerns.push(`${lateSignoffRate}% of tasks signed off late - potential capacity issue`);
    if (overdueInPeriod.length > 5) concerns.push(`${overdueInPeriod.length} overdue tasks need resolution`);
    // Pest concerns
    if (criticalPestExceedances.length > 0) concerns.push(`${criticalPestExceedances.length} critical pest threshold exceedance(s)`);
    if (activeEscalations.length > 0) concerns.push(`${activeEscalations.length} active pest escalation marker(s)`);
    // EMP concerns (high priority)
    if (pathogenPositives.length > 0) concerns.push(`CRITICAL: ${pathogenPositives.length} pathogen positive(s)${zone1Positives.length > 0 ? ` (${zone1Positives.length} in Zone 1)` : ''}`);
    if (overdueReswabs.length > 0) concerns.push(`${overdueReswabs.length} overdue reswab(s) require immediate attention`);
    if (indicatorFailures.length > 2) concerns.push(`${indicatorFailures.length} indicator organism failures - sanitation effectiveness concern`);

    return {
      period: { start, end, label: getDateRange(period).label },
      tasks: {
        total: totalDueInPeriod.length,
        completed: completedInPeriod.length,
        overdue: overdueInPeriod.length,
        completionRate
      },
      atp: {
        total: atpTests.length,
        passed: atpPassed,
        passRate: atpPassRate
      },
      drains: {
        total: activeDrains.length,
        cleaned: drainCleaningsInPeriod.length,
        withIssues: drainsWithIssues.length
      },
      diverters: {
        total: activeDiverters.length,
        wet: wetDiverters.length,
        inspections: diverterInspectionsInPeriod.length
      },
      competency: {
        evaluations: evaluationsInPeriod.length,
        competent: competentResults.length,
        needsCoaching: needsCoaching.length
      },
      teamHealth: {
        shiftsWorked: shiftsInPeriod.length,
        lateSignoffRate,
        activeEmployees: employees.filter(e => e.status === "active").length
      },
      pest: {
        findings: recentPestFindings.length,
        exceedances: pestExceedances.length,
        criticalExceedances: criticalPestExceedances.length,
        activeEscalations: activeEscalations.length,
        pendingReports: pendingPestReports.length
      },
      emp: {
        samples: recentEmpSamples.length,
        failures: empFailures.length,
        pathogenPositives: pathogenPositives.length,
        zone1Positives: zone1Positives.length,
        indicatorFailures: indicatorFailures.length,
        pendingReswabs: pendingReswabs.length,
        overdueReswabs: overdueReswabs.length
      },
      healthScore,
      achievements,
      risksAddressed,
      concerns
    };
  };

  // Generate narrative using AI
  const generateNarrative = async () => {
    setIsGenerating(true);
    
    const metrics = gatherMetrics(narrativePeriod);
    
    const prompt = `You are writing an executive summary for a food manufacturing sanitation program. Generate a professional, clear narrative suitable for leadership, auditors, and cross-functional stakeholders.

PERIOD: ${metrics.period.label}
SANITATION HEALTH SCORE: ${metrics.healthScore}/100

KEY METRICS:
- Task Completion: ${metrics.tasks.completed}/${metrics.tasks.total} (${metrics.tasks.completionRate}%)
- Overdue Tasks: ${metrics.tasks.overdue}
- ATP Testing: ${metrics.atp.total} tests, ${metrics.atp.passRate}% pass rate
- Drain Cleaning: ${metrics.drains.cleaned} cleanings, ${metrics.drains.withIssues} with issues
- Active Drains: ${metrics.drains.total}
- Rain Diverters: ${metrics.diverters.total} active, ${metrics.diverters.wet} showing wet
- Diverter Inspections: ${metrics.diverters.inspections}
- Competency Evaluations: ${metrics.competency.evaluations} completed, ${metrics.competency.competent} passed, ${metrics.competency.needsCoaching} need coaching
- Team: ${metrics.teamHealth.activeEmployees} employees, ${metrics.teamHealth.shiftsWorked} shifts worked
- Late Sign-off Rate: ${metrics.teamHealth.lateSignoffRate}%

PEST CONTROL:
- Pest Findings: ${metrics.pest.findings} total, ${metrics.pest.exceedances} threshold exceedances (${metrics.pest.criticalExceedances} critical)
- Active Escalations: ${metrics.pest.activeEscalations}
- Reports Pending Review: ${metrics.pest.pendingReports}

ENVIRONMENTAL MONITORING (EMP):
- Samples Collected: ${metrics.emp.samples}
- Pathogen Positives: ${metrics.emp.pathogenPositives}${metrics.emp.zone1Positives > 0 ? ` (${metrics.emp.zone1Positives} Zone 1 - CRITICAL)` : ''}
- Indicator Failures: ${metrics.emp.indicatorFailures}
- Pending Reswabs: ${metrics.emp.pendingReswabs} (${metrics.emp.overdueReswabs} overdue)

ACHIEVEMENTS: ${metrics.achievements.join("; ") || "None identified"}
RISKS ADDRESSED: ${metrics.risksAddressed.join("; ") || "None identified"}
AREAS OF CONCERN: ${metrics.concerns.join("; ") || "None identified"}

Generate a JSON response with this exact structure:
{
  "headline": "A single compelling headline summarizing the period (max 15 words)",
  "executiveSummary": "2-3 sentences providing the high-level story of what happened and why it matters",
  "whatHappened": ["3-5 bullet points describing key activities and outcomes in plain language"],
  "risksAndActions": ["2-4 bullet points describing risks that were present and actions taken to address them"],
  "whatWasPrevented": ["2-3 bullet points describing negative outcomes that were avoided or improvements achieved"],
  "lookingAhead": "1-2 sentences on priorities or focus areas for the next period",
  "quotableHighlight": "A single sentence that could be shared with leadership (e.g., 'Prevented repeat drain failures on Line 3 after targeted coaching')"
}

Write in plain language, not metrics-heavy. Focus on the story of control and continuous improvement. Be specific where data supports it.`;

    try {
      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            executiveSummary: { type: "string" },
            whatHappened: { type: "array", items: { type: "string" } },
            risksAndActions: { type: "array", items: { type: "string" } },
            whatWasPrevented: { type: "array", items: { type: "string" } },
            lookingAhead: { type: "string" },
            quotableHighlight: { type: "string" }
          }
        }
      });

      setGeneratedNarrative({
        ...response,
        metrics,
        generatedAt: new Date().toISOString()
      });
      toast.success("Narrative generated successfully");
    } catch (error) {
      console.error("Narrative generation error:", error);
      toast.error("Failed to generate narrative");
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy narrative to clipboard
  const copyToClipboard = () => {
    if (!generatedNarrative) return;
    
    const text = `
SANITATION EXECUTIVE SUMMARY
${generatedNarrative.metrics.period.label}

${generatedNarrative.headline}

EXECUTIVE SUMMARY
${generatedNarrative.executiveSummary}

WHAT HAPPENED
${generatedNarrative.whatHappened.map(item => `• ${item}`).join('\n')}

RISKS & ACTIONS
${generatedNarrative.risksAndActions.map(item => `• ${item}`).join('\n')}

WHAT WAS PREVENTED/IMPROVED
${generatedNarrative.whatWasPrevented.map(item => `• ${item}`).join('\n')}

LOOKING AHEAD
${generatedNarrative.lookingAhead}

---
Health Score: ${generatedNarrative.metrics.healthScore}/100
Generated: ${format(new Date(generatedNarrative.generatedAt), "MMMM d, yyyy 'at' h:mm a")}
    `.trim();
    
    navigator.clipboard.writeText(text);
    toast.success("Narrative copied to clipboard");
  };

  // Send narrative via email
  const sendNarrativeEmail = async () => {
    if (!generatedNarrative || !emailAddress) return;
    
    setIsSending(true);
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 700px; margin: 0 auto; }
    .header { background: #0f172a; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 8px 0 0; opacity: 0.8; }
    .score-badge { display: inline-block; background: ${generatedNarrative.metrics.healthScore >= 85 ? '#059669' : generatedNarrative.metrics.healthScore >= 70 ? '#d97706' : '#dc2626'}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 16px 0; }
    .content { padding: 24px; }
    .headline { font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 16px; border-left: 4px solid #3b82f6; padding-left: 12px; }
    .summary { background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .section { margin-bottom: 24px; }
    .section h3 { color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .section ul { margin: 0; padding-left: 20px; }
    .section li { margin-bottom: 8px; }
    .highlight { background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin-top: 24px; }
    .highlight p { margin: 0; font-style: italic; color: #1e40af; }
    .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Sanitation Executive Summary</h1>
    <p>${generatedNarrative.metrics.period.label}</p>
    <div class="score-badge">Health Score: ${generatedNarrative.metrics.healthScore}/100</div>
  </div>
  
  <div class="content">
    <div class="headline">${generatedNarrative.headline}</div>
    
    <div class="summary">
      <p>${generatedNarrative.executiveSummary}</p>
    </div>
    
    <div class="section">
      <h3>📋 What Happened</h3>
      <ul>
        ${generatedNarrative.whatHappened.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
    
    <div class="section">
      <h3>🛡️ Risks & Actions Taken</h3>
      <ul>
        ${generatedNarrative.risksAndActions.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
    
    <div class="section">
      <h3>✅ What Was Prevented or Improved</h3>
      <ul>
        ${generatedNarrative.whatWasPrevented.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
    
    <div class="section">
      <h3>🔮 Looking Ahead</h3>
      <p>${generatedNarrative.lookingAhead}</p>
    </div>
    
    <div class="highlight">
      <p>"${generatedNarrative.quotableHighlight}"</p>
    </div>
  </div>
  
  <div class="footer">
    <p>Generated ${format(new Date(generatedNarrative.generatedAt), "MMMM d, yyyy 'at' h:mm a")}</p>
    <p>This is an automated sanitation intelligence report.</p>
  </div>
</body>
</html>
    `;
    
    try {
      await sendEmail({
        to: emailAddress,
        subject: `Sanitation Executive Summary - ${generatedNarrative.metrics.period.label}`,
        body: htmlBody
      });
      toast.success("Narrative sent successfully");
    } catch (error) {
      console.error("Email error:", error);
      toast.error("Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  // Quick metrics preview
  const previewMetrics = useMemo(() => gatherMetrics(narrativePeriod), [narrativePeriod, tasks, areaSignOffs, drainCleaningRecords, diverterInspections, competencyEvaluations, pestFindings, pestServiceReports, pestEscalationMarkers, empSamples, empSites]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100">
            <FileText className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900">Executive Narrative</h2>
            <p className="text-xs md:text-sm text-slate-500">Leadership-ready sanitation storytelling</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={narrativePeriod} onValueChange={setNarrativePeriod}>
            <SelectTrigger className="w-36 md:w-40 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Summary</SelectItem>
              <SelectItem value="weekly">Weekly Summary</SelectItem>
              <SelectItem value="monthly">Monthly Summary</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={generateNarrative}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 h-9 text-sm"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-1.5" />
            )}
            Generate Narrative
          </Button>
        </div>
      </div>

      {/* Quick Metrics Preview */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
        <MetricCard 
          icon={Shield} 
          label="Health Score" 
          value={`${previewMetrics.healthScore}`}
          color={previewMetrics.healthScore >= 85 ? "emerald" : previewMetrics.healthScore >= 70 ? "amber" : "rose"}
        />
        <MetricCard 
          icon={CheckCircle2} 
          label="Completion" 
          value={`${previewMetrics.tasks.completionRate}%`}
          color={previewMetrics.tasks.completionRate >= 90 ? "emerald" : "amber"}
        />
        <MetricCard 
          icon={Droplets} 
          label="ATP Pass" 
          value={`${previewMetrics.atp.passRate}%`}
          color={previewMetrics.atp.passRate >= 90 ? "emerald" : "amber"}
        />
        <MetricCard 
          icon={AlertTriangle} 
          label="Overdue" 
          value={previewMetrics.tasks.overdue}
          color={previewMetrics.tasks.overdue === 0 ? "emerald" : previewMetrics.tasks.overdue <= 3 ? "amber" : "rose"}
        />
        <MetricCard 
          icon={Target} 
          label="Evaluations" 
          value={previewMetrics.competency.evaluations}
          color="blue"
        />
        <MetricCard 
          icon={Bug} 
          label="Pest Issues" 
          value={previewMetrics.pest.exceedances}
          color={previewMetrics.pest.criticalExceedances > 0 ? "rose" : previewMetrics.pest.exceedances > 0 ? "amber" : "emerald"}
        />
        <MetricCard 
          icon={Microscope} 
          label="EMP Positives" 
          value={previewMetrics.emp.pathogenPositives}
          color={previewMetrics.emp.pathogenPositives > 0 ? "rose" : previewMetrics.emp.indicatorFailures > 0 ? "amber" : "emerald"}
        />
        <MetricCard 
          icon={Users} 
          label="Shifts" 
          value={previewMetrics.teamHealth.shiftsWorked}
          color="slate"
        />
      </div>

      {/* Generated Narrative */}
      {generatedNarrative ? (
        <Card className="border-indigo-200">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">{generatedNarrative.metrics.period.label}</p>
                <CardTitle className="text-white text-xl mt-1">{generatedNarrative.headline}</CardTitle>
              </div>
              <div className="text-right">
                <div className={cn(
                  "inline-flex items-center px-4 py-2 rounded-full font-bold",
                  generatedNarrative.metrics.healthScore >= 85 ? "bg-emerald-500" :
                  generatedNarrative.metrics.healthScore >= 70 ? "bg-amber-500" : "bg-rose-500"
                )}>
                  {generatedNarrative.metrics.healthScore}/100
                </div>
                <p className="text-indigo-100 text-xs mt-1">Health Score</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Executive Summary */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-700 text-lg leading-relaxed">{generatedNarrative.executiveSummary}</p>
            </div>

            {/* Main Sections */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* What Happened */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  What Happened
                </h3>
                <ul className="space-y-2">
                  {generatedNarrative.whatHappened.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks & Actions */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  Risks & Actions Taken
                </h3>
                <ul className="space-y-2">
                  {generatedNarrative.risksAndActions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* What Was Prevented */}
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                What Was Prevented or Improved
              </h3>
              <ul className="space-y-2">
                {generatedNarrative.whatWasPrevented.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Looking Ahead */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Looking Ahead
              </h3>
              <p className="text-slate-700">{generatedNarrative.lookingAhead}</p>
            </div>

            {/* Quotable Highlight */}
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-indigo-600 mb-1">SHAREABLE HIGHLIGHT</p>
                  <p className="text-indigo-900 font-medium italic">"{generatedNarrative.quotableHighlight}"</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button variant="outline" onClick={copyToClipboard}>
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>
              
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-56"
                />
                <Button 
                  onClick={sendNarrativeEmail}
                  disabled={!emailAddress || isSending}
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Send
                </Button>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-right">
              Generated {format(new Date(generatedNarrative.generatedAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Generate Executive Narrative</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              Transform your sanitation data into a clear, leadership-ready story. 
              Select a time period and click "Generate Narrative" to create your summary.
            </p>
            <Button 
              onClick={generateNarrative}
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Generate {narrativePeriod.charAt(0).toUpperCase() + narrativePeriod.slice(1)} Narrative
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    rose: "bg-rose-50 text-rose-600 border-rose-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200"
  };

  return (
    <div className={cn("p-2 md:p-3 rounded-lg border", colorClasses[color])}>
      <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
        <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span className="text-[10px] md:text-xs font-medium truncate">{label}</span>
      </div>
      <p className="text-base md:text-xl font-bold">{value}</p>
    </div>
  );
}