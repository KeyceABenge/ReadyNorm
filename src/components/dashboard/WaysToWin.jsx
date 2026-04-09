// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Target,
  CheckCircle2, ChevronDown, ChevronUp, CalendarClock, Timer
} from "lucide-react";
import { format } from "date-fns";

const HORIZON_CONFIG = {
  shift: { label: "This Shift", icon: Timer, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  day: { label: "Today", icon: CalendarClock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  strategic: { label: "This Week+", icon: Target, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function InsightRow({ insight }) {
  const severityDot = {
    critical: "bg-rose-500",
    high: "bg-amber-500",
    medium: "bg-blue-400",
    low: "bg-slate-300"
  };

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-slate-50 transition-colors">
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${severityDot[insight.priority] || severityDot.medium}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-800 truncate">{insight.title}</span>
          {insight.count > 1 && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-bold">
              {insight.count}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{insight.action}</p>
      </div>
      {insight.metric && (
        <span className={`text-[10px] font-bold flex-shrink-0 mt-0.5 ${
          insight.metricColor || "text-slate-600"
        }`}>
          {insight.metric}
        </span>
      )}
    </div>
  );
}

function HorizonSection({ horizon, insights, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const config = HORIZON_CONFIG[horizon];
  const Icon = config.icon;
  const critCount = insights.filter(i => i.priority === "critical" || i.priority === "high").length;

  return (
    <div className={`rounded-lg border ${config.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 ${config.bg} transition-colors hover:opacity-90`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${config.color}`} />
          <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
          {insights.length > 0 && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
              {insights.length} item{insights.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {critCount > 0 && (
            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-rose-100 text-rose-700 border-rose-200">
              {critCount} urgent
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && (
        <div className="px-1 py-1 bg-white divide-y divide-slate-50">
          {insights.length === 0 ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              No actions needed
            </div>
          ) : (
            insights.map((insight, idx) => <InsightRow key={idx} insight={insight} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function WaysToWin({ 
  employees,
  sessions, 
  tasks, 
  completedTasks,
  lineAssignments,
  signOffs,
  verificationQueue,
  shiftSettings,
  crews = [],
  organizationId,
  onActionTaken,
  pestFindings = [],
  pestEscalationMarkers = [],
  empSamples = [],
  empSites = []
}) {
  const allInsights = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const now = new Date();
    const shifts = shiftSettings?.shifts || [];
    
    // --- Determine current shift ---
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let currentShift = null;
    for (const shift of shifts) {
      if (!shift.start_time || !shift.end_time) continue;
      const [sH, sM] = shift.start_time.split(":").map(Number);
      const [eH, eM] = shift.end_time.split(":").map(Number);
      const start = sH * 60 + sM;
      const end = eH * 60 + eM;
      if (end < start) {
        if (nowMin >= start || nowMin < end) { currentShift = shift; break; }
      } else {
        if (nowMin >= start && nowMin < end) { currentShift = shift; break; }
      }
    }
    
    // Shift progress
    let shiftProgress = 0;
    let shiftTotalMin = 480;
    if (currentShift) {
      const [sH, sM] = currentShift.start_time.split(":").map(Number);
      const [eH, eM] = currentShift.end_time.split(":").map(Number);
      const startMin = sH * 60 + sM;
      const endMin = eH * 60 + eM;
      shiftTotalMin = endMin > startMin ? endMin - startMin : (1440 - startMin + endMin);
      let elapsed = nowMin - startMin;
      if (elapsed < 0) elapsed += 1440;
      shiftProgress = Math.min(100, (elapsed / shiftTotalMin) * 100);
    }

    // --- Sessions ---
    const todaySessions = sessions.filter(s => s.session_date === today);
    const activeSessions = todaySessions.filter(s => s.status === "active" || s.task_selection_completed);

    // --- Expected headcount from crews ---
    const expectedCount = (() => {
      if (!currentShift || crews.length === 0) return 0;
      const selectedId = currentShift.id;
      const [selStartH] = (currentShift.start_time || "06:00").split(":").map(Number);
      const [selEndH] = (currentShift.end_time || "14:30").split(":").map(Number);
      const selIsNight = selEndH <= selStartH;
      const emails = new Set();
      for (const crew of crews) {
        if (crew.status !== "active" || !crew.members?.length) continue;
        if (crew.shift_id) { if (crew.shift_id !== selectedId) continue; }
        else {
          const isPrimary = selectedId === "shift_1" || selectedId === "shift_2";
          if (!isPrimary) continue;
          const cStart = crew.shift_start_time; const cEnd = crew.shift_end_time;
          let crewIsNight = false;
          if (cStart && cEnd) crewIsNight = parseInt(cEnd.split(":")[0]) <= parseInt(cStart.split(":")[0]);
          else if (!cStart && cEnd) crewIsNight = true;
          else crewIsNight = (crew.name || "").toLowerCase().includes("night");
          if (crewIsNight !== selIsNight) continue;
        }
        if (crew.schedule_pattern?.length > 0 && crew.schedule_pattern_start_date) {
          const patternStart = new Date(crew.schedule_pattern_start_date + "T00:00:00Z");
          const targetDate = new Date(today + "T00:00:00Z");
          const diffDays = Math.floor((targetDate - patternStart) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) continue;
          const totalPatternDays = crew.schedule_pattern.length * 7;
          const dayInPattern = ((diffDays % totalPatternDays) + totalPatternDays) % totalPatternDays;
          const weekIndex = Math.floor(dayInPattern / 7);
          const dayOfWeek = dayInPattern % 7;
          if (!crew.schedule_pattern[weekIndex]?.[dayOfWeek]) continue;
        } else continue;
        crew.members.forEach(e => emails.add(e));
      }
      return emails.size;
    })();

    const shiftInsights = [];
    const dayInsights = [];
    const strategicInsights = [];

    // ========== SHIFT INSIGHTS ==========

    // 1. Staffing gap
    const staffGap = expectedCount > 0 ? expectedCount - activeSessions.length : 0;
    if (staffGap > 0 && shiftProgress > 10) {
      shiftInsights.push({
        priority: staffGap >= 3 ? "critical" : "high",
        title: `${staffGap} employee${staffGap > 1 ? "s" : ""} missing`,
        action: `${activeSessions.length} of ${expectedCount} expected have started`,
        count: staffGap,
        metric: `${Math.round((activeSessions.length / expectedCount) * 100)}%`,
        metricColor: staffGap >= 3 ? "text-rose-600" : "text-amber-600"
      });
    }

    // 2. Falling behind employees (grouped)
    const behindEmployees = activeSessions.filter(s => {
      const sel = s.tasks_selected_count || s.selected_tasks?.length || 0;
      const comp = s.tasks_completed_count || s.completed_tasks?.length || 0;
      const progress = sel > 0 ? (comp / sel) * 100 : 0;
      return shiftProgress > 30 && progress < shiftProgress - 25;
    });
    
    if (behindEmployees.length > 0) {
      const names = behindEmployees.slice(0, 3).map(s => {
        const emp = employees.find(e => e.id === s.employee_id);
        return emp?.name?.split(" ")[0] || "Employee";
      });
      const moreCount = behindEmployees.length - 3;
      shiftInsights.push({
        priority: behindEmployees.length >= 3 ? "critical" : "high",
        title: `${behindEmployees.length} behind pace`,
        action: names.join(", ") + (moreCount > 0 ? ` +${moreCount} more` : "") + " — consider reassignment",
        count: behindEmployees.length,
        metric: `${Math.round(shiftProgress)}% elapsed`,
        metricColor: "text-amber-600"
      });
    }

    // 3. Overloaded employees
    const overloaded = activeSessions.filter(s => {
      const remaining = (s.tasks_selected_count || s.selected_tasks?.length || 0) - (s.tasks_completed_count || s.completed_tasks?.length || 0);
      const pctLeft = 100 - shiftProgress;
      const minsLeft = (pctLeft / 100) * shiftTotalMin;
      return remaining > 0 && minsLeft > 0 && (remaining / (minsLeft / 60)) > 4; // > 4 tasks/hr remaining
    });
    if (overloaded.length > 0) {
      shiftInsights.push({
        priority: "medium",
        title: `${overloaded.length} with heavy workload`,
        action: "Redistribute tasks to balance team load",
        count: overloaded.length
      });
    }

    // 4. Shift completion projection
    const totalSel = activeSessions.reduce((s, sess) => s + (sess.tasks_selected_count || sess.selected_tasks?.length || 0), 0);
    const totalComp = activeSessions.reduce((s, sess) => s + (sess.tasks_completed_count || sess.completed_tasks?.length || 0), 0);
    if (totalSel > 0 && shiftProgress > 20) {
      const projectedRate = Math.min(100, Math.round((totalComp / totalSel) * 100 / (shiftProgress / 100)));
      if (projectedRate < 85) {
        shiftInsights.push({
          priority: projectedRate < 60 ? "high" : "medium",
          title: "Shift projected below target",
          action: `At current pace, shift will finish at ~${projectedRate}%`,
          metric: `${projectedRate}%`,
          metricColor: projectedRate < 60 ? "text-rose-600" : "text-amber-600"
        });
      }
    }

    // ========== DAY INSIGHTS ==========

    // 1. Verification backlog
    const pendingVerif = verificationQueue?.length || 0;
    if (pendingVerif > 3) {
      dayInsights.push({
        priority: pendingVerif > 10 ? "high" : "medium",
        title: "Verification backlog",
        action: `${pendingVerif} completed tasks awaiting manager verification`,
        count: pendingVerif,
        metric: `${pendingVerif}`,
        metricColor: pendingVerif > 10 ? "text-rose-600" : "text-amber-600"
      });
    }

    // 2. Unassigned high-priority tasks
    const unassignedCritical = tasks.filter(t => 
      !t.assigned_to && (t.priority === "high" || t.priority === "critical") && t.status === "pending" && !t.is_group
    );
    if (unassignedCritical.length > 0) {
      dayInsights.push({
        priority: "critical",
        title: "Critical tasks unassigned",
        action: `${unassignedCritical.length} high/critical priority tasks need assignment`,
        count: unassignedCritical.length,
        metric: `${unassignedCritical.length}`,
        metricColor: "text-rose-600"
      });
    }

    // 3. Tasks due soon but not started
    const dueSoon = tasks.filter(t => {
      if (t.status === "completed" || t.status === "verified" || t.is_group) return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date + "T23:59:59");
      const hoursLeft = (dueDate - now) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft < 8 && t.status !== "in_progress";
    });
    if (dueSoon.length > 0) {
      dayInsights.push({
        priority: "high",
        title: `${dueSoon.length} task${dueSoon.length > 1 ? "s" : ""} due soon`,
        action: "Approaching deadline — prioritize or escalate",
        count: dueSoon.length,
        metric: "<8h",
        metricColor: "text-amber-600"
      });
    }

    // 4. Line cleaning status
    const todayAssignments = lineAssignments?.filter(a => a.scheduled_date === today) || [];
    const notStarted = todayAssignments.filter(a => a.status === "scheduled");
    if (notStarted.length > 0 && shiftProgress > 20) {
      dayInsights.push({
        priority: "medium",
        title: `${notStarted.length} line cleaning${notStarted.length > 1 ? "s" : ""} not started`,
        action: `${notStarted.map(a => a.production_line_name || "Line").join(", ")}`.slice(0, 60),
        count: notStarted.length
      });
    }

    // ========== STRATEGIC (WEEK+) INSIGHTS ==========

    // 1. Pathogen positives (EMP)
    const recentEmp = empSamples.filter(s => {
      if (!s.collection_date) return false;
      return Math.floor((now - new Date(s.collection_date)) / (1000 * 60 * 60 * 24)) <= 7;
    });
    const pathogenPos = recentEmp.filter(s => 
      s.overall_result === "fail" && s.test_results?.some(t => 
        (t.test_type === "listeria_mono" || t.test_type === "salmonella") && t.result === "positive"
      )
    );
    if (pathogenPos.length > 0) {
      strategicInsights.push({
        priority: "critical",
        title: `${pathogenPos.length} pathogen positive${pathogenPos.length > 1 ? "s" : ""}`,
        action: "Review corrective actions and reswab immediately",
        count: pathogenPos.length,
        metric: "CRITICAL",
        metricColor: "text-rose-600"
      });
    }

    // 2. Overdue reswabs
    const overdueReswabs = empSamples.filter(s => 
      s.requires_reswab && s.status !== "closed" && s.reswab_due_date && new Date(s.reswab_due_date) < now
    );
    if (overdueReswabs.length > 0) {
      strategicInsights.push({
        priority: "critical",
        title: `${overdueReswabs.length} overdue reswab${overdueReswabs.length > 1 ? "s" : ""}`,
        action: "Collect reswabs — verification of corrective actions delayed",
        count: overdueReswabs.length
      });
    }

    // 3. Critical pest exceedances
    const recentPest = pestFindings.filter(f => f.service_date && Math.floor((now - new Date(f.service_date)) / (1000 * 60 * 60 * 24)) <= 14);
    const critPest = recentPest.filter(f => f.threshold_exceeded && f.exceedance_severity === "critical");
    if (critPest.length > 0) {
      strategicInsights.push({
        priority: "high",
        title: `${critPest.length} critical pest exceedance${critPest.length > 1 ? "s" : ""}`,
        action: "Escalate to pest vendor — thresholds critically exceeded",
        count: critPest.length
      });
    }

    // 4. Active pest escalations
    const activeEscalations = pestEscalationMarkers.filter(e => e.status === "active" && e.severity === "critical");
    if (activeEscalations.length > 0) {
      strategicInsights.push({
        priority: "high",
        title: `${activeEscalations.length} active pest escalation${activeEscalations.length > 1 ? "s" : ""}`,
        action: "Pest sightings require immediate response",
        count: activeEscalations.length
      });
    }

    // 5. Overdue tasks (weekly view)
    const overdueTasks = tasks.filter(t => {
      if (t.is_group || t.status === "completed" || t.status === "verified") return false;
      if (!t.due_date) return false;
      return new Date(t.due_date + "T23:59:59") < now;
    });
    if (overdueTasks.length > 0) {
      strategicInsights.push({
        priority: overdueTasks.length > 10 ? "high" : "medium",
        title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
        action: "Review and reschedule or complete outstanding tasks",
        count: overdueTasks.length,
        metric: `${overdueTasks.length}`,
        metricColor: overdueTasks.length > 10 ? "text-rose-600" : "text-amber-600"
      });
    }

    // Sort each by severity
    const sort = (arr) => arr.sort((a, b) => (SEVERITY_ORDER[a.priority] ?? 3) - (SEVERITY_ORDER[b.priority] ?? 3));
    return {
      shift: sort(shiftInsights),
      day: sort(dayInsights),
      strategic: sort(strategicInsights)
    };
  }, [employees, sessions, tasks, verificationQueue, shiftSettings, crews, lineAssignments, pestFindings, pestEscalationMarkers, empSamples]);

  const totalCount = allInsights.shift.length + allInsights.day.length + allInsights.strategic.length;
  const urgentCount = [...allInsights.shift, ...allInsights.day, ...allInsights.strategic]
    .filter(i => i.priority === "critical" || i.priority === "high").length;

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Ways to Win
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {urgentCount > 0 && (
              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-rose-100 text-rose-700 border-rose-200">
                {urgentCount} urgent
              </Badge>
            )}
            {totalCount === 0 && (
              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 border-emerald-200">
                All clear
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-3 px-3 flex-1 flex flex-col gap-2">
        {totalCount === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
            <p className="text-sm font-medium text-slate-600">Looking good!</p>
            <p className="text-xs text-slate-400">No interventions needed right now</p>
          </div>
        ) : (
          <>
            <HorizonSection horizon="shift" insights={allInsights.shift} defaultOpen={allInsights.shift.length > 0} />
            <HorizonSection horizon="day" insights={allInsights.day} defaultOpen={allInsights.shift.length === 0 && allInsights.day.length > 0} />
            <HorizonSection horizon="strategic" insights={allInsights.strategic} defaultOpen={allInsights.shift.length === 0 && allInsights.day.length === 0} />
          </>
        )}
      </CardContent>
    </Card>
  );
}