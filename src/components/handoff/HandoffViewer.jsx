import { useState, useRef } from "react";
import { ShiftHandoffRepo } from "@/lib/adapters/database";
import { sendEmail } from "@/lib/adapters/integrations";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Download, Mail, Edit, Save, CheckCircle2, AlertTriangle,
  Users, TrendingUp, Clock, AlertCircle,
  ChevronDown, ChevronUp, Loader2, Sparkles, X, RefreshCw
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function HandoffViewer({ handoff, organizationId, settings, onUpdate, onNewHandoff }) {
  const [isEditing, setIsEditing] = useState(false);
  const [managerNotes, setManagerNotes] = useState(handoff.manager_notes || "");
  const [expandedSections, setExpandedSections] = useState({
    team: true,
    performance: true,
    quality: false,
    completed: false,
    incomplete: true,
    carryovers: true,
    priorities: true
  });
  const [isSending, setIsSending] = useState(false);
  const contentRef = useRef(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateMutation = useMutation({
    mutationFn: (data) => ShiftHandoffRepo.update(handoff.id, data),
    onSuccess: (updated) => {
      onUpdate(updated);
      toast.success("Handoff updated");
    }
  });

  const handleSave = () => {
    updateMutation.mutate({ 
      manager_notes: managerNotes,
      status: "reviewed"
    });
    setIsEditing(false);
  };

  const handleFinalize = () => {
    updateMutation.mutate({ status: "finalized" });
  };

  const handleEmail = async () => {
    if (!settings.email_recipients || settings.email_recipients.length === 0) {
      toast.error("No email recipients configured. Go to Settings to add recipients.");
      return;
    }

    setIsSending(true);
    try {
      const htmlContent = generateEmailHTML(handoff);
      
      for (const recipient of settings.email_recipients) {
        await sendEmail({
          to: recipient,
          subject: `Shift Handoff: ${handoff.shift_name} - ${format(parseISO(handoff.handoff_date), "MMM d, yyyy")}`,
          body: htmlContent
        });
      }

      await ShiftHandoffRepo.update(handoff.id, {
        emailed_to: settings.email_recipients,
        emailed_at: new Date().toISOString()
      });

      toast.success(`Handoff emailed to ${settings.email_recipients.length} recipient(s)`);
    } catch (error) {
      toast.error("Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = () => {
    const content = generatePlainText(handoff);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handoff-${handoff.handoff_date}-${handoff.shift_name.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Handoff downloaded");
  };

  const { team_summary, performance_metrics, quality_signals, completed_items, incomplete_items, critical_carryovers, top_priorities } = handoff;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn(
                  handoff.status === "finalized" ? "bg-emerald-600" :
                  handoff.status === "reviewed" ? "bg-blue-600" :
                  "bg-slate-500"
                )}>
                  {handoff.status}
                </Badge>
                <span className="text-sm text-slate-500">
                  {format(parseISO(handoff.generated_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {handoff.shift_name} Handoff
              </h2>
              <p className="text-slate-500">
                {format(parseISO(handoff.period_start), "MMM d, h:mm a")} — {format(parseISO(handoff.period_end), "h:mm a")}
                <span className="ml-2 text-slate-400">({handoff.hours_covered}h)</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onNewHandoff}>
                <RefreshCw className="w-4 h-4 mr-1" />
                New
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEmail}
                disabled={isSending}
              >
                {isSending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />}
                Email
              </Button>
              {handoff.status !== "finalized" && (
                <Button size="sm" onClick={handleFinalize} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Finalize
                </Button>
              )}
            </div>
          </div>

          {handoff.emailed_at && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
              <span className="text-blue-700">
                ✉️ Emailed to {handoff.emailed_to?.length || 0} recipient(s) on {format(parseISO(handoff.emailed_at), "MMM d 'at' h:mm a")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Narrative */}
      {handoff.ai_narrative && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900 mb-2">Executive Summary</h3>
                <p className="text-indigo-800">{handoff.ai_narrative}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Priorities */}
      {top_priorities && top_priorities.length > 0 && (
        <CollapsibleSection
          title="Top Priorities Next Shift"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          bgColor="bg-amber-50"
          expanded={expandedSections.priorities}
          onToggle={() => toggleSection("priorities")}
          badge={top_priorities.length}
        >
          <div className="space-y-3">
            {top_priorities.map((p, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-white rounded-lg border">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-amber-700">{p.priority}</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{p.action}</p>
                  <p className="text-sm text-slate-500">{p.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Team Summary */}
      {team_summary && (
        <CollapsibleSection
          title="Team Summary"
          icon={Users}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
          expanded={expandedSections.team}
          onToggle={() => toggleSection("team")}
          badge={team_summary.total_employees}
        >
          <div className="space-y-2">
            {team_summary.employees?.map((emp, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="font-medium text-slate-900">{emp.name}</p>
                  <p className="text-xs text-slate-500">{emp.role}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{emp.tasks_completed}/{emp.tasks_selected} tasks</p>
                  <Badge className={emp.completion_rate >= 80 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                    {emp.completion_rate}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Performance Metrics */}
      {performance_metrics && (
        <CollapsibleSection
          title="Performance Metrics"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          bgColor="bg-emerald-50"
          expanded={expandedSections.performance}
          onToggle={() => toggleSection("performance")}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="MSS Completion" value={`${performance_metrics.mss_completion_pct}%`} />
            <MetricCard label="Quota Target" value={performance_metrics.quota_target} />
            <MetricCard label="Quota Actual" value={performance_metrics.quota_actual} />
            <MetricCard 
              label="Health Score" 
              value={`${performance_metrics.health_score_end}`}
              change={performance_metrics.health_score_change}
            />
          </div>
        </CollapsibleSection>
      )}

      {/* Critical Carryovers */}
      {critical_carryovers && (
        <CollapsibleSection
          title="Critical Carryovers"
          icon={AlertCircle}
          iconColor="text-red-600"
          bgColor="bg-red-50"
          expanded={expandedSections.carryovers}
          onToggle={() => toggleSection("carryovers")}
          badge={
            (critical_carryovers.overdue_tasks?.length || 0) +
            (critical_carryovers.open_incidents?.length || 0) +
            (critical_carryovers.drains_due?.length || 0)
          }
        >
          <div className="space-y-4">
            {critical_carryovers.overdue_tasks?.length > 0 && (
              <CarryoverGroup title="Overdue Tasks" items={critical_carryovers.overdue_tasks} type="task" />
            )}
            {critical_carryovers.high_risk_tasks?.length > 0 && (
              <CarryoverGroup title="High Risk Tasks" items={critical_carryovers.high_risk_tasks} type="task" />
            )}
            {critical_carryovers.drains_due?.length > 0 && (
              <CarryoverGroup title="Drains Due" items={critical_carryovers.drains_due} type="drain" />
            )}
            {critical_carryovers.wet_diverters?.length > 0 && (
              <CarryoverGroup title="Wet Diverters" items={critical_carryovers.wet_diverters} type="diverter" />
            )}
            {critical_carryovers.open_incidents?.length > 0 && (
              <CarryoverGroup title="Open Incidents" items={critical_carryovers.open_incidents} type="incident" />
            )}
            {critical_carryovers.training_gaps?.length > 0 && (
              <CarryoverGroup title="Training Gaps" items={critical_carryovers.training_gaps} type="training" />
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Incomplete Items */}
      {incomplete_items && incomplete_items.length > 0 && (
        <CollapsibleSection
          title="Incomplete / Reopened"
          icon={Clock}
          iconColor="text-amber-600"
          bgColor="bg-amber-50"
          expanded={expandedSections.incomplete}
          onToggle={() => toggleSection("incomplete")}
          badge={incomplete_items.length}
        >
          <div className="space-y-2">
            {incomplete_items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.reason}</p>
                </div>
                <Badge className={
                  item.priority === "critical" ? "bg-red-100 text-red-700" :
                  item.priority === "high" ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-700"
                }>
                  {item.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Completed Items */}
      {completed_items && completed_items.length > 0 && (
        <CollapsibleSection
          title="Completed Work"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          bgColor="bg-emerald-50"
          expanded={expandedSections.completed}
          onToggle={() => toggleSection("completed")}
          badge={completed_items.length}
        >
          <div className="space-y-2">
            {completed_items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  {item.notes && <p className="text-xs text-slate-500">{item.notes}</p>}
                </div>
                <span className="text-sm text-slate-500">{item.completed_by}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Manager Notes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Manager Notes</CardTitle>
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              placeholder="Add notes for the incoming shift..."
              rows={4}
            />
          ) : (
            <p className="text-slate-600 whitespace-pre-wrap">
              {handoff.manager_notes || "No notes added."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, iconColor, bgColor, expanded, onToggle, badge, children }) {
  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bgColor)}>
            <Icon className={cn("w-4 h-4", iconColor)} />
          </div>
          <span className="font-semibold text-slate-900">{title}</span>
          {badge > 0 && <Badge variant="secondary">{badge}</Badge>}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      {expanded && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

function MetricCard({ label, value, change }) {
  return (
    <div className="p-3 bg-white rounded-lg border text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      {change !== undefined && (
        <p className={cn("text-xs", change >= 0 ? "text-emerald-600" : "text-red-600")}>
          {change >= 0 ? "+" : ""}{change}
        </p>
      )}
    </div>
  );
}

function CarryoverGroup({ title, items, type }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-2">{title}</h4>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="p-2 bg-white rounded border text-sm">
            {type === "task" && <span>{item.title}</span>}
            {type === "drain" && <span>Drain {item.drain_id} - {item.location}</span>}
            {type === "diverter" && <span>Diverter {item.diverter_id} - {item.location}</span>}
            {type === "incident" && (
              <span className="flex items-center gap-2">
                {item.title}
                <Badge className="bg-red-100 text-red-700 text-xs">{item.severity}</Badge>
              </span>
            )}
            {type === "training" && <span>{item.employee} - {item.task}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function generateEmailHTML(handoff) {
  return `
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1e293b;">${handoff.shift_name} Handoff</h1>
      <p style="color: #64748b;">${format(parseISO(handoff.period_start), "MMM d, h:mm a")} — ${format(parseISO(handoff.period_end), "h:mm a")}</p>
      
      <div style="background: #eef2ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0; color: #4f46e5;">Executive Summary</h3>
        <p style="margin: 0; color: #3730a3;">${handoff.ai_narrative || "No summary available."}</p>
      </div>

      <h3 style="color: #1e293b;">Top Priorities</h3>
      <ol>
        ${(handoff.top_priorities || []).map(p => `<li><strong>${p.action}</strong> - ${p.reason}</li>`).join("")}
      </ol>

      <h3 style="color: #1e293b;">Performance</h3>
      <ul>
        <li>MSS Completion: ${handoff.performance_metrics?.mss_completion_pct || 0}%</li>
        <li>Quota: ${handoff.performance_metrics?.quota_actual || 0}/${handoff.performance_metrics?.quota_target || 0}</li>
      </ul>

      ${handoff.manager_notes ? `
        <h3 style="color: #1e293b;">Manager Notes</h3>
        <p>${handoff.manager_notes}</p>
      ` : ""}

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px;">Generated ${format(parseISO(handoff.generated_at), "MMM d, yyyy 'at' h:mm a")}</p>
    </body>
    </html>
  `;
}

function generatePlainText(handoff) {
  return `
${handoff.shift_name} HANDOFF
${format(parseISO(handoff.period_start), "MMM d, h:mm a")} — ${format(parseISO(handoff.period_end), "h:mm a")}
${"=".repeat(50)}

EXECUTIVE SUMMARY
${handoff.ai_narrative || "No summary available."}

TOP PRIORITIES
${(handoff.top_priorities || []).map((p, i) => `${i + 1}. ${p.action}\n   Reason: ${p.reason}`).join("\n")}

PERFORMANCE
- MSS Completion: ${handoff.performance_metrics?.mss_completion_pct || 0}%
- Quota: ${handoff.performance_metrics?.quota_actual || 0}/${handoff.performance_metrics?.quota_target || 0}
- Health Score: ${handoff.performance_metrics?.health_score_end || 0} (${handoff.performance_metrics?.health_score_change >= 0 ? "+" : ""}${handoff.performance_metrics?.health_score_change || 0})

TEAM (${handoff.team_summary?.total_employees || 0} employees)
${(handoff.team_summary?.employees || []).map(e => `- ${e.name}: ${e.tasks_completed}/${e.tasks_selected} tasks (${e.completion_rate}%)`).join("\n")}

${handoff.manager_notes ? `MANAGER NOTES\n${handoff.manager_notes}` : ""}

Generated: ${format(parseISO(handoff.generated_at), "MMM d, yyyy 'at' h:mm a")}
  `.trim();
}