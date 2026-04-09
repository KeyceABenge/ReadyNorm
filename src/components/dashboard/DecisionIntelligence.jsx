// @ts-nocheck
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Zap, AlertTriangle, Clock, Users, GraduationCap, 
  Droplets, FlaskConical, CheckCircle2, ChevronDown,
  Target, ArrowRight, TrendingDown, Heart,
  Bug, Microscope, Biohazard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";
import { Clock as ClockIcon } from "lucide-react";
import CoachingActionButton from "@/components/coaching/CoachingActionButton";
import AskMeWhyButton from "@/components/explainer/AskMeWhyButton";

export default function DecisionIntelligence({
  tasks = [],
  employees = [],
  areaSignOffs = [],
  drainLocations = [],
  rainDiverters = [],
  diverterInspections = [],
  chemicalCountEntries = [],
  employeeTrainings = [],
  trainingDocuments = [],
  competencyEvaluations = [],
  taskGroups = [],
  productionLines = [],
  employeeSessions = [],
  downtimeEvents = [],
  capas = [],
  siteSettings = {},
  // Pest Control data
  pestFindings = [],
  pestServiceReports = [],
  pestEscalationMarkers = [],
  // Environmental Monitoring data
  empSamples = [],
  empSites = [],
  onAssignTask,
  onNavigate
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Generate all possible recommendations with priority scores
  const generateRecommendations = () => {
    const recommendations = [];
    const now = new Date();

    // 1. CRITICAL OVERDUE TASKS
    const overdueTasks = tasks.filter(t => {
      if (t.is_group || t.status === "completed" || t.status === "verified") return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate < now;
    });

    const criticalOverdue = overdueTasks.filter(t => t.priority === "critical" || t.priority === "high");
    if (criticalOverdue.length > 0) {
      const oldest = criticalOverdue.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
      const daysOverdue = differenceInDays(now, new Date(oldest.due_date));
      recommendations.push({
        id: "critical-overdue",
        priority: 100,
        urgency: "critical",
        icon: AlertTriangle,
        iconColor: "text-rose-600",
        bgColor: "bg-rose-50 border-rose-200",
        title: `Complete overdue ${oldest.priority} priority task`,
        action: `"${oldest.title}" in ${oldest.area}`,
        reason: `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. ${criticalOverdue.length > 1 ? `${criticalOverdue.length - 1} more high-priority tasks also overdue.` : 'High-priority tasks affect your health score significantly.'}`,
        actionType: "assign",
        actionData: { task: oldest },
        link: null
      });
    }

    // 2. UNASSIGNED TASKS DUE TODAY
    const unassignedToday = tasks.filter(t => {
      if (t.is_group || t.status === "completed" || t.status === "verified") return false;
      if (t.assigned_to) return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return format(dueDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    });

    if (unassignedToday.length > 0) {
      recommendations.push({
        id: "unassigned-today",
        priority: 95,
        urgency: "high",
        icon: Users,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 border-amber-200",
        title: `Assign ${unassignedToday.length} task${unassignedToday.length > 1 ? 's' : ''} due today`,
        action: unassignedToday.length === 1 
          ? `"${unassignedToday[0].title}" needs an owner`
          : `${unassignedToday.map(t => t.area).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2).join(', ')} areas`,
        reason: "Tasks without assignees won't get done. Assign now to ensure today's schedule is covered.",
        actionType: "navigate",
        link: "tasks"
      });
    }

    // 3. WET RAIN DIVERTERS
    const wetDiverters = rainDiverters.filter(d => d.status === "active" && d.last_finding === "wet");
    if (wetDiverters.length > 0) {
      const woMissing = wetDiverters.filter(d => !d.wo_tag_attached);
      recommendations.push({
        id: "wet-diverters",
        priority: 90,
        urgency: "high",
        icon: Droplets,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50 border-blue-200",
        title: `Address ${wetDiverters.length} wet diverter${wetDiverters.length > 1 ? 's' : ''}`,
        action: woMissing.length > 0 
          ? `${woMissing.length} need work order tags attached`
          : `Check status and schedule repairs`,
        reason: "Active leaks create contamination risk. Wet diverters need work orders to track resolution.",
        actionType: "navigate",
        link: "RainDiverters"
      });
    }

    // 4. OVERDUE DRAIN CLEANINGS
    const overdueDrains = drainLocations.filter(d => {
      if (d.status !== "active" || d.is_sealed) return false;
      if (!d.next_due_date) return false;
      return new Date(d.next_due_date) < now;
    });

    if (overdueDrains.length > 0) {
      const mostOverdue = overdueDrains.sort((a, b) => 
        new Date(a.next_due_date) - new Date(b.next_due_date)
      )[0];
      const daysOverdue = differenceInDays(now, new Date(mostOverdue.next_due_date));
      recommendations.push({
        id: "overdue-drains",
        priority: 85,
        urgency: "high",
        icon: Droplets,
        iconColor: "text-cyan-600",
        bgColor: "bg-cyan-50 border-cyan-200",
        title: `Clean ${overdueDrains.length} overdue drain${overdueDrains.length > 1 ? 's' : ''}`,
        action: `${mostOverdue.drain_id} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
        reason: "Drain cleaning prevents biofilm buildup and pest harborage. Overdue drains are audit findings.",
        actionType: "navigate",
        link: "DrainManagement"
      });
    }

    // 5. COMPETENCY GAPS - Employees needing evaluation
    const pendingEvaluations = competencyEvaluations.filter(e => 
      e.status === "evaluation_required" || e.status === "scheduled" || e.status === "not_evaluated"
    );
    
    if (pendingEvaluations.length > 0) {
      const byEmployee = {};
      pendingEvaluations.forEach(e => {
        if (!byEmployee[e.employee_name]) byEmployee[e.employee_name] = 0;
        byEmployee[e.employee_name]++;
      });
      const topEmployee = Object.entries(byEmployee).sort((a, b) => b[1] - a[1])[0];
      
      recommendations.push({
        id: "competency-gaps",
        priority: 75,
        urgency: "medium",
        icon: GraduationCap,
        iconColor: "text-purple-600",
        bgColor: "bg-purple-50 border-purple-200",
        title: `Complete ${pendingEvaluations.length} pending competency evaluation${pendingEvaluations.length > 1 ? 's' : ''}`,
        action: topEmployee ? `${topEmployee[0]} has ${topEmployee[1]} pending` : "Schedule evaluations for qualified employees",
        reason: "Unevaluated employees may not be qualified for assigned tasks. This creates compliance risk.",
        actionType: "navigate",
        link: "competency"
      });
    }

    // 6. CHEMICAL INVENTORY LOW STOCK
    const lowStockChemicals = chemicalCountEntries.filter(e => 
      e.on_hand_quantity !== undefined && 
      e.par_level && 
      e.on_hand_quantity < e.par_level
    );

    if (lowStockChemicals.length > 0) {
      const uniqueChemicals = [...new Set(lowStockChemicals.map(e => e.chemical_name))];
      recommendations.push({
        id: "low-stock",
        priority: 70,
        urgency: "medium",
        icon: FlaskConical,
        iconColor: "text-emerald-600",
        bgColor: "bg-emerald-50 border-emerald-200",
        title: `Reorder ${uniqueChemicals.length} chemical${uniqueChemicals.length > 1 ? 's' : ''} below par level`,
        action: uniqueChemicals.slice(0, 2).join(", ") + (uniqueChemicals.length > 2 ? ` +${uniqueChemicals.length - 2} more` : ""),
        reason: "Running out of chemicals stops sanitation work. Order now to maintain supply.",
        actionType: "navigate",
        link: "ChemicalInventory"
      });
    }

    // 7. QUOTA PRESSURE - Too many tasks per employee
    const activeEmployees = employees.filter(e => e.status === "active");
    const pendingTasks = tasks.filter(t => 
      !t.is_group && (t.status === "pending" || t.status === "in_progress")
    );
    
    if (activeEmployees.length > 0) {
      const tasksPerEmployee = pendingTasks.length / activeEmployees.length;
      if (tasksPerEmployee > 12) {
        recommendations.push({
          id: "quota-pressure",
          priority: 65,
          urgency: "medium",
          icon: Target,
          iconColor: "text-orange-600",
          bgColor: "bg-orange-50 border-orange-200",
          title: "Workload is too high",
          action: `${Math.round(tasksPerEmployee)} tasks per employee (target: 8-10)`,
          reason: "Overloaded employees skip steps or rush work. Consider redistributing or deferring low-priority tasks.",
          actionType: "navigate",
          link: "tasks"
        });
      }
    }

    // 8. TRAINING GAPS - Employees missing required training
    const employeesWithoutTraining = employees.filter(e => {
      if (e.status !== "active") return false;
      const hasTraining = employeeTrainings.some(t => 
        t.employee_id === e.id && t.status === "completed"
      );
      return !hasTraining;
    });

    if (employeesWithoutTraining.length > 0 && trainingDocuments.length > 0) {
      recommendations.push({
        id: "training-gaps",
        priority: 60,
        urgency: "low",
        icon: GraduationCap,
        iconColor: "text-indigo-600",
        bgColor: "bg-indigo-50 border-indigo-200",
        title: `${employeesWithoutTraining.length} employee${employeesWithoutTraining.length > 1 ? 's need' : ' needs'} training`,
        action: employeesWithoutTraining.slice(0, 2).map(e => e.name).join(", "),
        reason: "Untrained employees may not follow SSOPs correctly. Assign training to reduce errors.",
        actionType: "navigate",
        link: "training-docs"
      });
    }

    // 9. STALE DIVERTER INSPECTIONS
    const staleDiverters = rainDiverters.filter(d => {
      if (d.status !== "active") return false;
      if (!d.last_inspection_date) return true;
      const daysSinceInspection = differenceInDays(now, new Date(d.last_inspection_date));
      return daysSinceInspection > 7;
    });

    if (staleDiverters.length > 0) {
      recommendations.push({
        id: "stale-inspections",
        priority: 55,
        urgency: "low",
        icon: Clock,
        iconColor: "text-slate-600",
        bgColor: "bg-slate-100 border-slate-200",
        title: `${staleDiverters.length} diverter${staleDiverters.length > 1 ? 's' : ''} need${staleDiverters.length === 1 ? 's' : ''} inspection`,
        action: "No inspection in over 7 days",
        reason: "Regular inspections catch leaks early. Add diverter inspection to today's tasks.",
        actionType: "navigate",
        link: "RainDiverters"
      });
    }

    // 10. TEAM FATIGUE/BURNOUT SIGNALS
    // Analyze late sign-offs and workload imbalance as fatigue indicators
    const completedTasks = tasks.filter(t => 
      (t.status === "completed" || t.status === "verified") && t.completed_at
    );
    const recentCompletions = completedTasks.filter(t => {
      const completedDate = new Date(t.completed_at);
      return differenceInDays(now, completedDate) <= 7;
    });
    
    const lateSignoffs = recentCompletions.filter(t => {
      if (!t.due_date || !t.completed_at) return false;
      const dueDate = new Date(t.due_date);
      const completedDate = new Date(t.completed_at);
      return (completedDate - dueDate) > 4 * 60 * 60 * 1000; // More than 4 hours late
    });
    
    const lateRatio = recentCompletions.length > 0 
      ? lateSignoffs.length / recentCompletions.length 
      : 0;

    // Check for workload imbalance
    const tasksByEmployee = {};
    pendingTasks.forEach(t => {
      if (t.assigned_to) {
        tasksByEmployee[t.assigned_to] = (tasksByEmployee[t.assigned_to] || 0) + 1;
      }
    });
    const taskCounts = Object.values(tasksByEmployee);
    const avgTasks = taskCounts.length > 0 
      ? taskCounts.reduce((a, b) => a + b, 0) / taskCounts.length 
      : 0;
    const maxTasks = Math.max(...taskCounts, 0);
    const hasImbalance = maxTasks > avgTasks * 1.5 && avgTasks > 3;

    if (lateRatio > 0.3 || hasImbalance) {
      const issues = [];
      if (lateRatio > 0.3) issues.push(`${Math.round(lateRatio * 100)}% late sign-offs`);
      if (hasImbalance) issues.push("workload imbalance detected");
      
      recommendations.push({
        id: "team-fatigue",
        priority: 72,
        urgency: lateRatio > 0.5 ? "high" : "medium",
        icon: Heart,
        iconColor: "text-rose-600",
        bgColor: "bg-rose-50 border-rose-200",
        title: "Team fatigue signals detected",
        action: issues.join(", "),
        reason: "Early intervention prevents burnout and quality issues. Review workloads and check in with team.",
        actionType: "navigate",
        link: "team-health"
      });
    }

    // 11. OPEN DOWNTIME EVENTS NEEDING CAPA
    const openDowntime = downtimeEvents.filter(e => 
      (e.status === "open" || e.status === "immediate_action_taken") && e.requires_capa && !e.capa_id
    );
    
    if (openDowntime.length > 0) {
      const criticalDowntime = openDowntime.filter(e => e.severity === "critical" || e.severity === "major");
      recommendations.push({
        id: "open-downtime",
        priority: criticalDowntime.length > 0 ? 88 : 78,
        urgency: criticalDowntime.length > 0 ? "high" : "medium",
        icon: ClockIcon,
        iconColor: "text-rose-600",
        bgColor: "bg-rose-50 border-rose-200",
        title: `${openDowntime.length} downtime event${openDowntime.length > 1 ? 's need' : ' needs'} CAPA`,
        action: criticalDowntime.length > 0 
          ? `${criticalDowntime.length} critical/major severity`
          : "Create corrective action plans",
        reason: "Unaddressed downtime events will recur. Document root cause and preventive actions.",
        actionType: "navigate",
        link: "DowntimeTracking"
      });
    }

    // 12. OVERDUE CAPAs
    const overdueCapas = capas.filter(c => {
      if (c.status === "closed" || c.status === "effective") return false;
      if (!c.target_close_date) return false;
      return new Date(c.target_close_date) < now;
    });

    if (overdueCapas.length > 0) {
      recommendations.push({
        id: "overdue-capas",
        priority: 82,
        urgency: "high",
        icon: AlertTriangle,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 border-amber-200",
        title: `${overdueCapas.length} overdue CAPA${overdueCapas.length > 1 ? 's' : ''}`,
        action: "Past target close dates - review and update",
        reason: "Overdue CAPAs indicate unresolved issues. This is a common audit finding.",
        actionType: "navigate",
        link: "DowntimeTracking"
      });
    }

    // 13. RECURRING DOWNTIME ISSUES
    const recurringDowntime = downtimeEvents.filter(e => e.is_recurring);
    if (recurringDowntime.length > 0) {
      recommendations.push({
        id: "recurring-downtime",
        priority: 85,
        urgency: "high",
        icon: TrendingDown,
        iconColor: "text-rose-600",
        bgColor: "bg-rose-50 border-rose-200",
        title: `${recurringDowntime.length} recurring downtime issue${recurringDowntime.length > 1 ? 's' : ''}`,
        action: "Same issues happening repeatedly",
        reason: "Recurring issues indicate ineffective corrective actions. Root cause needs deeper analysis.",
        actionType: "navigate",
        link: "DowntimeTracking"
      });
    }

    // 14. ENVIRONMENTAL MONITORING - PATHOGEN POSITIVES (CRITICAL)
    const recentEmpSamples = empSamples.filter(s => {
      if (!s.collection_date) return false;
      return differenceInDays(now, new Date(s.collection_date)) <= 30;
    });
    
    const pathogenPositives = recentEmpSamples.filter(s => 
      s.overall_result === "fail" && 
      s.test_results?.some(t => 
        (t.test_type === "listeria_mono" || t.test_type === "salmonella") && 
        t.result === "positive"
      )
    );
    
    if (pathogenPositives.length > 0) {
      const zone1Positives = pathogenPositives.filter(s => s.zone_classification === "zone_1");
      recommendations.push({
        id: "pathogen-positives",
        priority: zone1Positives.length > 0 ? 100 : 95,
        urgency: "critical",
        icon: Biohazard,
        iconColor: "text-rose-600",
        bgColor: "bg-rose-50 border-rose-200",
        title: `${pathogenPositives.length} pathogen positive${pathogenPositives.length > 1 ? 's' : ''} detected`,
        action: zone1Positives.length > 0 
          ? `${zone1Positives.length} in Zone 1 - immediate action required`
          : "Review corrective actions and reswab schedule",
        reason: "Pathogen positives require immediate investigation, enhanced cleaning, and follow-up testing.",
        actionType: "navigate",
        link: "EnvironmentalMonitoring"
      });
    }

    // 15. PENDING/OVERDUE RESWABS
    const pendingReswabs = recentEmpSamples.filter(s => s.requires_reswab && s.status !== "closed");
    const overdueReswabs = pendingReswabs.filter(s => 
      s.reswab_due_date && new Date(s.reswab_due_date) < now
    );
    
    if (overdueReswabs.length > 0) {
      recommendations.push({
        id: "overdue-reswabs",
        priority: 92,
        urgency: "critical",
        icon: Microscope,
        iconColor: "text-rose-600",
        bgColor: "bg-rose-50 border-rose-200",
        title: `${overdueReswabs.length} overdue reswab${overdueReswabs.length > 1 ? 's' : ''}`,
        action: "Collect reswabs immediately",
        reason: "Overdue reswabs delay verification of corrective actions and create compliance gaps.",
        actionType: "navigate",
        link: "EnvironmentalMonitoring"
      });
    } else if (pendingReswabs.length > 0) {
      recommendations.push({
        id: "pending-reswabs",
        priority: 80,
        urgency: "high",
        icon: Microscope,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 border-amber-200",
        title: `${pendingReswabs.length} reswab${pendingReswabs.length > 1 ? 's' : ''} pending`,
        action: "Schedule reswab collection",
        reason: "Timely reswabs verify that corrective actions were effective.",
        actionType: "navigate",
        link: "EnvironmentalMonitoring"
      });
    }

    // 16. PEST THRESHOLD EXCEEDANCES
    const recentPestFindings = pestFindings.filter(f => {
      if (!f.service_date) return false;
      return differenceInDays(now, new Date(f.service_date)) <= 30;
    });
    
    const pestExceedances = recentPestFindings.filter(f => f.threshold_exceeded);
    const criticalPestExceedances = pestExceedances.filter(f => f.exceedance_severity === "critical");
    
    if (criticalPestExceedances.length > 0) {
      recommendations.push({
        id: "critical-pest-exceedances",
        priority: 88,
        urgency: "high",
        icon: Bug,
        iconColor: "text-rose-600",
        bgColor: "bg-rose-50 border-rose-200",
        title: `${criticalPestExceedances.length} critical pest exceedance${criticalPestExceedances.length > 1 ? 's' : ''}`,
        action: "Review affected areas and escalate to pest vendor",
        reason: "Critical pest activity thresholds exceeded - may require immediate intervention.",
        actionType: "navigate",
        link: "PestControl"
      });
    } else if (pestExceedances.length > 0) {
      recommendations.push({
        id: "pest-exceedances",
        priority: 75,
        urgency: "medium",
        icon: Bug,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 border-amber-200",
        title: `${pestExceedances.length} pest threshold exceedance${pestExceedances.length > 1 ? 's' : ''}`,
        action: "Review pest trends and adjust controls",
        reason: "Elevated pest activity detected - review with pest control vendor.",
        actionType: "navigate",
        link: "PestControl"
      });
    }

    // 17. ACTIVE PEST ESCALATION MARKERS
    const activeEscalations = pestEscalationMarkers.filter(e => e.status === "active");
    const criticalEscalations = activeEscalations.filter(e => e.severity === "critical");
    
    if (criticalEscalations.length > 0) {
      recommendations.push({
        id: "critical-pest-escalations",
        priority: 86,
        urgency: "high",
        icon: Bug,
        iconColor: "text-rose-600",
        bgColor: "bg-rose-50 border-rose-200",
        title: `${criticalEscalations.length} critical pest escalation${criticalEscalations.length > 1 ? 's' : ''} active`,
        action: "Address escalated pest sightings",
        reason: "Critical pest sightings require immediate response and documentation.",
        actionType: "navigate",
        link: "PestControl"
      });
    } else if (activeEscalations.length > 0) {
      recommendations.push({
        id: "pest-escalations",
        priority: 70,
        urgency: "medium",
        icon: Bug,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 border-amber-200",
        title: `${activeEscalations.length} pest escalation${activeEscalations.length > 1 ? 's' : ''} open`,
        action: "Review and resolve pest markers",
        reason: "Open pest escalations need follow-up and resolution.",
        actionType: "navigate",
        link: "PestControl"
      });
    }

    // 18. PEST SERVICE REPORTS PENDING REVIEW
    const pendingPestReports = pestServiceReports.filter(r => r.review_status === "pending_review");
    if (pendingPestReports.length > 0) {
      recommendations.push({
        id: "pending-pest-reports",
        priority: 65,
        urgency: "medium",
        icon: Bug,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50 border-blue-200",
        title: `${pendingPestReports.length} pest report${pendingPestReports.length > 1 ? 's' : ''} pending review`,
        action: "Review and acknowledge service reports",
        reason: "Unreviewed pest reports may contain findings requiring action.",
        actionType: "navigate",
        link: "PestControl"
      });
    }

    // 19. EMP SITES OVERDUE FOR SAMPLING
    const activeSites = empSites.filter(s => s.status === "active");
    const overdueForSampling = activeSites.filter(site => {
      if (!site.last_sampled_date) return true;
      const daysSince = differenceInDays(now, new Date(site.last_sampled_date));
      const expectedFrequency = site.sampling_frequency === "daily" ? 1 : 
        site.sampling_frequency === "weekly" ? 7 : 
        site.sampling_frequency === "bi_weekly" ? 14 : 30;
      return daysSince > expectedFrequency * 1.5;
    });
    
    if (overdueForSampling.length > 0) {
      const zone1Overdue = overdueForSampling.filter(s => s.zone_classification === "zone_1");
      recommendations.push({
        id: "emp-sites-overdue",
        priority: zone1Overdue.length > 0 ? 78 : 68,
        urgency: zone1Overdue.length > 0 ? "high" : "medium",
        icon: Microscope,
        iconColor: zone1Overdue.length > 0 ? "text-amber-600" : "text-blue-600",
        bgColor: zone1Overdue.length > 0 ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200",
        title: `${overdueForSampling.length} EMP site${overdueForSampling.length > 1 ? 's' : ''} overdue for sampling`,
        action: zone1Overdue.length > 0 
          ? `${zone1Overdue.length} Zone 1 sites need immediate attention`
          : "Schedule sample collection",
        reason: "Consistent sampling schedule is critical for early pathogen detection.",
        actionType: "navigate",
        link: "EnvironmentalMonitoring"
      });
    }

    // Sort by priority and return top recommendations
    return recommendations.sort((a, b) => b.priority - a.priority);
  };

  const allRecommendations = generateRecommendations();

  const handleAction = (rec, e) => {
    e?.stopPropagation();
    if (rec.actionType === "navigate" && rec.link) {
      if (onNavigate) {
        onNavigate(rec.link);
      }
    } else if (rec.actionType === "assign" && onAssignTask) {
      onAssignTask(rec.actionData.task);
    }
  };

  const getUrgencyDot = (urgency) => {
    switch (urgency) {
      case "critical":
        return "bg-rose-500";
      case "high":
        return "bg-amber-500";
      case "medium":
        return "bg-blue-500";
      default:
        return "bg-slate-400";
    }
  };

  if (allRecommendations.length === 0) {
    return (
      <Card className="p-2 bg-emerald-50 border border-emerald-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-900">You're all caught up! No urgent actions needed.</span>
        </div>
      </Card>
    );
  }

  const topRec = allRecommendations[0];
  const TopIcon = topRec.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-slate-200 overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-2 md:p-3 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                <Zap className="w-3 h-3 md:w-4 md:h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs md:text-sm font-semibold text-slate-900">Do First:</span>
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", getUrgencyDot(topRec.urgency))} />
                  <span className="text-xs md:text-sm text-slate-700 truncate">{topRec.title}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{allRecommendations.length}</Badge>
              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-slate-100 divide-y divide-slate-100">
            {allRecommendations.map((rec, index) => {
              const Icon = rec.icon;
              return (
                <div
                  key={rec.id}
                  className="flex items-center gap-2 p-2 md:p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={(e) => handleAction(rec, e)}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", getUrgencyDot(rec.urgency))} />
                  <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", rec.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-slate-900 truncate">{rec.title}</p>
                    <p className="text-[10px] md:text-xs text-slate-500 truncate">{rec.reason}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <AskMeWhyButton
                      context="decision_action"
                      data={{
                        title: rec.title,
                        action: rec.action,
                        reason: rec.reason,
                        urgency: rec.urgency,
                        priority: rec.priority
                      }}
                      iconOnly
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    />
                    <CoachingActionButton
                      situationType={rec.urgency === "critical" ? "compliance" : "performance"}
                      title={rec.title}
                      details={rec.reason}
                      additionalContext={{ action: rec.action, urgency: rec.urgency }}
                      variant="ghost"
                      size="sm"
                      label=""
                      className="h-6 w-6 p-0"
                    />
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}