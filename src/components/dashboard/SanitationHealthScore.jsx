// @ts-nocheck
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ShieldCheck, TrendingUp, TrendingDown, Minus, ChevronRight,
  CheckCircle2, AlertTriangle, Clock, Users, GraduationCap, 
  Droplets, FileCheck,
  Bug, Microscope
} from "lucide-react";
import { cn } from "@/lib/utils";
import AskMeWhyButton from "@/components/explainer/AskMeWhyButton";
import { parseISO, isWithinInterval, startOfDay, subDays } from "date-fns";

export default function SanitationHealthScore({
  tasks = [],
  employees = [],
  areaSignOffs = [],
  drainLocations = [],
  drainCleaningRecords = [],
  rainDiverters = [],
  diverterInspections = [],
  chemicalInventoryRecords = [],
  chemicalCountEntries = [],
  employeeTrainings = [],
  trainingDocuments = [],
  competencyEvaluations = [],
  downtimeEvents = [],
  capas = [],
  siteSettings = {},
  // Pest Control data
  pestFindings = [],
  pestDevices = [],
  pestServiceReports = [],
  pestThresholds = [],
  pestEscalationMarkers = [],
  // Environmental Monitoring data
  empSamples = [],
  empSites = [],
  empThresholds = []
}) {
  const [detailOpen, setDetailOpen] = useState(false);

  // Calculate all score factors
  const calculateFactors = () => {
    const now = new Date();
    const today = startOfDay(now);
    const weekAgo = subDays(today, 7);
    const factors = [];

    // 1. MSS (Master Sanitation Schedule) Completion - Weight: 25%
    const mssScore = calculateMSSCompletion(tasks, weekAgo, now);
    factors.push({
      id: "mss",
      name: "Task Completion",
      description: "Master Sanitation Schedule completion rate",
      score: mssScore.score,
      weight: 25,
      impact: mssScore.score >= 80 ? "positive" : mssScore.score >= 60 ? "neutral" : "negative",
      details: mssScore.details,
      icon: CheckCircle2
    });

    // 2. Quota/Capacity Balance - Weight: 15%
    const capacityScore = calculateCapacityBalance(tasks, employees);
    factors.push({
      id: "capacity",
      name: "Workload Balance",
      description: "Task quota vs available employee capacity",
      score: capacityScore.score,
      weight: 15,
      impact: capacityScore.score >= 80 ? "positive" : capacityScore.score >= 60 ? "neutral" : "negative",
      details: capacityScore.details,
      icon: Users
    });

    // 3. Training & Competency Coverage - Weight: 15%
    const trainingScore = calculateTrainingCoverage(employees, employeeTrainings, trainingDocuments, competencyEvaluations);
    factors.push({
      id: "training",
      name: "Training Coverage",
      description: "Employee training and competency status",
      score: trainingScore.score,
      weight: 15,
      impact: trainingScore.score >= 80 ? "positive" : trainingScore.score >= 60 ? "neutral" : "negative",
      details: trainingScore.details,
      icon: GraduationCap
    });

    // 4. Asset Risk Status - Weight: 20%
    const assetScore = calculateAssetRiskStatus(
      drainLocations, drainCleaningRecords,
      rainDiverters, diverterInspections,
      chemicalInventoryRecords, chemicalCountEntries
    );
    factors.push({
      id: "assets",
      name: "Asset Risk Status",
      description: "Drains, diverters, and chemical inventory health",
      score: assetScore.score,
      weight: 20,
      impact: assetScore.score >= 80 ? "positive" : assetScore.score >= 60 ? "neutral" : "negative",
      details: assetScore.details,
      icon: Droplets
    });

    // 5. Verification Confidence - Weight: 15%
    const verificationScore = calculateVerificationConfidence(tasks, areaSignOffs, weekAgo, now);
    factors.push({
      id: "verification",
      name: "Verification Confidence",
      description: "Timing patterns and signature quality",
      score: verificationScore.score,
      weight: 15,
      impact: verificationScore.score >= 80 ? "positive" : verificationScore.score >= 60 ? "neutral" : "negative",
      details: verificationScore.details,
      icon: FileCheck
    });

    // 6. Overdue/High-Risk Items - Weight: 10%
    const overdueScore = calculateOverdueRisk(tasks, drainLocations, rainDiverters);
    factors.push({
      id: "overdue",
      name: "Overdue Items",
      description: "Outstanding and high-risk items",
      score: overdueScore.score,
      weight: 10,
      impact: overdueScore.score >= 80 ? "positive" : overdueScore.score >= 60 ? "neutral" : "negative",
      details: overdueScore.details,
      icon: AlertTriangle
    });

    // 7. Downtime & CAPA Status - Bonus/Penalty factor
    const downtimeScore = calculateDowntimeStatus(downtimeEvents, capas);
    if (downtimeEvents.length > 0 || capas.length > 0) {
      factors.push({
        id: "downtime",
        name: "Downtime & CAPA",
        description: "Sanitation-related downtime and corrective actions",
        score: downtimeScore.score,
        weight: 5,
        impact: downtimeScore.score >= 80 ? "positive" : downtimeScore.score >= 60 ? "neutral" : "negative",
        details: downtimeScore.details,
        icon: Clock
      });
    }

    // 8. Pest Control Status - Weight: 10%
    const pestScore = calculatePestControlStatus(pestFindings, pestDevices, pestServiceReports, pestThresholds, pestEscalationMarkers);
    factors.push({
      id: "pest",
      name: "Pest Control",
      description: "Pest findings, device coverage, and threshold exceedances",
      score: pestScore.score,
      weight: 10,
      impact: pestScore.score >= 80 ? "positive" : pestScore.score >= 60 ? "neutral" : "negative",
      details: pestScore.details,
      icon: Bug
    });

    // 9. Environmental Monitoring - Weight: 15% (high priority)
    const empScore = calculateEMPStatus(empSamples, empSites, empThresholds);
    factors.push({
      id: "emp",
      name: "Environmental Monitoring",
      description: "Pathogen testing, indicator organisms, and reswab status",
      score: empScore.score,
      weight: 15,
      impact: empScore.score >= 80 ? "positive" : empScore.score >= 60 ? "neutral" : "negative",
      details: empScore.details,
      icon: Microscope
    });

    return factors;
  };

  // Calculate Pest Control status
  const calculatePestControlStatus = (findings, devices, reports, thresholds, escalations) => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    let score = 100;
    const issues = [];

    // Recent findings with threshold exceedances
    const recentFindings = findings.filter(f => new Date(f.service_date) >= thirtyDaysAgo);
    const exceedances = recentFindings.filter(f => f.threshold_exceeded);
    
    if (exceedances.length > 0) {
      const criticalExceedances = exceedances.filter(f => f.exceedance_severity === "critical");
      score -= criticalExceedances.length * 15;
      score -= (exceedances.length - criticalExceedances.length) * 5;
      issues.push(`${exceedances.length} threshold exceedance${exceedances.length > 1 ? 's' : ''}`);
    }

    // Active escalation markers
    const activeEscalations = escalations.filter(e => e.status === "active");
    if (activeEscalations.length > 0) {
      const criticalEscalations = activeEscalations.filter(e => e.severity === "critical");
      score -= criticalEscalations.length * 10;
      score -= (activeEscalations.length - criticalEscalations.length) * 3;
      issues.push(`${activeEscalations.length} active escalation${activeEscalations.length > 1 ? 's' : ''}`);
    }

    // Reports pending review
    const pendingReports = reports.filter(r => r.review_status === "pending_review");
    if (pendingReports.length > 0) {
      score -= pendingReports.length * 2;
      issues.push(`${pendingReports.length} report${pendingReports.length > 1 ? 's' : ''} pending review`);
    }

    // Open pest CAPAs
    const pestCapas = findings.filter(f => f.linked_capa_id && f.corrective_action_required);
    if (pestCapas.length > 0) {
      issues.push(`${pestCapas.length} pest CAPA${pestCapas.length > 1 ? 's' : ''} open`);
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      details: issues.length > 0 ? issues.join(", ") : "Pest control in good standing"
    };
  };

  // Calculate Environmental Monitoring status
  const calculateEMPStatus = (samples, sites, thresholds) => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    let score = 100;
    const issues = [];

    // Recent samples
    const recentSamples = samples.filter(s => new Date(s.collection_date) >= thirtyDaysAgo);
    
    // Pathogen positives (critical - Listeria, Salmonella)
    const pathogenPositives = recentSamples.filter(s => 
      s.overall_result === "fail" && 
      s.test_results?.some(t => 
        (t.test_type === "listeria_mono" || t.test_type === "salmonella") && 
        t.result === "positive"
      )
    );
    if (pathogenPositives.length > 0) {
      score -= pathogenPositives.length * 20; // Heavy penalty for pathogens
      issues.push(`${pathogenPositives.length} pathogen positive${pathogenPositives.length > 1 ? 's' : ''}`);
    }

    // Indicator organism failures
    const indicatorFailures = recentSamples.filter(s => 
      s.overall_result === "fail" && 
      !s.test_results?.some(t => 
        (t.test_type === "listeria_mono" || t.test_type === "salmonella") && 
        t.result === "positive"
      )
    );
    if (indicatorFailures.length > 0) {
      score -= indicatorFailures.length * 5;
      issues.push(`${indicatorFailures.length} indicator failure${indicatorFailures.length > 1 ? 's' : ''}`);
    }

    // Pending reswabs
    const pendingReswabs = recentSamples.filter(s => s.requires_reswab && s.status !== "closed");
    if (pendingReswabs.length > 0) {
      score -= pendingReswabs.length * 8;
      issues.push(`${pendingReswabs.length} reswab${pendingReswabs.length > 1 ? 's' : ''} pending`);
    }

    // Overdue reswabs (critical)
    const overdueReswabs = pendingReswabs.filter(s => 
      s.reswab_due_date && new Date(s.reswab_due_date) < new Date()
    );
    if (overdueReswabs.length > 0) {
      score -= overdueReswabs.length * 12;
      issues.push(`${overdueReswabs.length} reswab${overdueReswabs.length > 1 ? 's' : ''} overdue`);
    }

    // Missed scheduled samples
    const scheduledSites = sites.filter(s => s.status === "active");
    const missedSamples = scheduledSites.filter(site => {
      if (!site.last_sampled_date) return true;
      const daysSinceLastSample = Math.floor((new Date() - new Date(site.last_sampled_date)) / (1000 * 60 * 60 * 24));
      const expectedFrequency = site.sampling_frequency === "daily" ? 1 : 
        site.sampling_frequency === "weekly" ? 7 : 
        site.sampling_frequency === "bi_weekly" ? 14 : 30;
      return daysSinceLastSample > expectedFrequency * 1.5;
    });
    if (missedSamples.length > 0) {
      score -= missedSamples.length * 3;
      issues.push(`${missedSamples.length} site${missedSamples.length > 1 ? 's' : ''} overdue for sampling`);
    }

    // Zone 1 issues are more critical
    const zone1Positives = pathogenPositives.filter(s => s.zone_classification === "zone_1");
    if (zone1Positives.length > 0) {
      score -= zone1Positives.length * 10; // Extra penalty for Zone 1
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      details: issues.length > 0 ? issues.join(", ") : "EMP program healthy"
    };
  };

  // Calculate MSS completion rate
  const calculateMSSCompletion = (tasks, startDate, endDate) => {
    const workTasks = tasks.filter(t => !t.is_group);
    
    // Tasks due in the period
    const tasksDueInPeriod = workTasks.filter(t => {
      if (!t.due_date) return false;
      try {
        const dueDate = parseISO(t.due_date);
        return isWithinInterval(dueDate, { start: startDate, end: endDate });
      } catch {
        return false;
      }
    });

    const completedTasks = tasksDueInPeriod.filter(t => 
      t.status === "completed" || t.status === "verified"
    );

    const total = tasksDueInPeriod.length;
    const completed = completedTasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return {
      score: rate,
      details: `${completed}/${total} tasks completed this week`
    };
  };

  // Calculate capacity balance
  const calculateCapacityBalance = (tasks, employees) => {
    const activeEmployees = employees.filter(e => e.status === "active");
    const pendingTasks = tasks.filter(t => 
      !t.is_group && (t.status === "pending" || t.status === "in_progress")
    );

    if (activeEmployees.length === 0) {
      return { score: 0, details: "No active employees" };
    }

    const tasksPerEmployee = pendingTasks.length / activeEmployees.length;
    
    // Optimal range: 3-8 tasks per employee
    let score = 100;
    if (tasksPerEmployee > 15) score = 30;
    else if (tasksPerEmployee > 12) score = 50;
    else if (tasksPerEmployee > 10) score = 70;
    else if (tasksPerEmployee > 8) score = 85;
    else if (tasksPerEmployee < 1) score = 70; // Too few tasks might indicate incomplete setup

    return {
      score,
      details: `${pendingTasks.length} pending tasks across ${activeEmployees.length} employees (${tasksPerEmployee.toFixed(1)}/person)`
    };
  };

  // Calculate training coverage
  const calculateTrainingCoverage = (employees, trainings, documents, evaluations) => {
    const activeEmployees = employees.filter(e => e.status === "active");
    if (activeEmployees.length === 0) {
      return { score: 100, details: "No employees to train" };
    }

    // Count employees with at least one completed training
    const trainedEmployees = new Set(
      trainings.filter(t => t.status === "completed").map(t => t.employee_id)
    );

    // Count competent employees
    const competentEmployees = new Set(
      evaluations.filter(e => e.status === "competent").map(e => e.employee_id)
    );

    const trainingRate = (trainedEmployees.size / activeEmployees.length) * 100;
    const competencyRate = evaluations.length > 0 
      ? (competentEmployees.size / activeEmployees.length) * 100 
      : trainingRate;

    const avgScore = Math.round((trainingRate + competencyRate) / 2);

    return {
      score: avgScore,
      details: `${trainedEmployees.size}/${activeEmployees.length} trained, ${competentEmployees.size} competent`
    };
  };

  // Calculate asset risk status
  const calculateAssetRiskStatus = (
    drains, drainRecords,
    diverters, diverterInspections,
    invRecords, countEntries
  ) => {
    let totalAssets = 0;
    let healthyAssets = 0;
    const issues = [];

    // Drains - check if cleaned within frequency
    const activeDrains = drains.filter(d => d.status === "active" && !d.is_sealed);
    totalAssets += activeDrains.length;
    
    const overdueDrains = activeDrains.filter(d => {
      if (!d.next_due_date) return false;
      return new Date(d.next_due_date) < new Date();
    });
    healthyAssets += activeDrains.length - overdueDrains.length;
    if (overdueDrains.length > 0) {
      issues.push(`${overdueDrains.length} drains overdue`);
    }

    // Diverters - check for wet findings or missing inspections
    const activeDiverters = diverters.filter(d => d.status === "active");
    totalAssets += activeDiverters.length;
    
    const wetDiverters = activeDiverters.filter(d => d.last_finding === "wet");
    const uninspectedDiverters = activeDiverters.filter(d => !d.last_inspection_date);
    healthyAssets += activeDiverters.length - wetDiverters.length - uninspectedDiverters.length;
    if (wetDiverters.length > 0) {
      issues.push(`${wetDiverters.length} wet diverters`);
    }

    // Chemical inventory - check for low stock
    const lowStockCount = countEntries.filter(e => 
      e.on_hand_quantity !== undefined && 
      e.par_level && 
      e.on_hand_quantity < e.par_level
    ).length;
    
    if (lowStockCount > 0) {
      issues.push(`${lowStockCount} chemicals below par`);
    }

    const score = totalAssets > 0 ? Math.round((healthyAssets / totalAssets) * 100) : 100;

    return {
      score: Math.max(0, score - (issues.length * 5)), // Penalty for each issue type
      details: issues.length > 0 ? issues.join(", ") : "All assets healthy"
    };
  };

  // Calculate verification confidence (anti-pencil-whip)
  const calculateVerificationConfidence = (tasks, signOffs, startDate, endDate) => {
    const completedTasks = tasks.filter(t => {
      if (t.status !== "completed" && t.status !== "verified") return false;
      if (!t.completed_at) return false;
      try {
        const completedDate = parseISO(t.completed_at);
        return isWithinInterval(completedDate, { start: startDate, end: endDate });
      } catch {
        return false;
      }
    });

    const completedSignOffs = signOffs.filter(s => {
      if (!s.signed_off_at) return false;
      try {
        const signOffDate = parseISO(s.signed_off_at);
        return isWithinInterval(signOffDate, { start: startDate, end: endDate });
      } catch {
        return false;
      }
    });

    let flags = 0;
    let totalChecks = 0;

    // Check for batch completions (multiple tasks completed within 1 minute)
    const completionTimes = completedTasks
      .filter(t => t.completed_at)
      .map(t => ({ time: new Date(t.completed_at).getTime(), by: t.assigned_to }));
    
    // Group by employee and check for suspiciously fast completions
    const byEmployee = {};
    completionTimes.forEach(ct => {
      if (!byEmployee[ct.by]) byEmployee[ct.by] = [];
      byEmployee[ct.by].push(ct.time);
    });

    Object.values(byEmployee).forEach(times => {
      times.sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) {
        totalChecks++;
        if (times[i] - times[i-1] < 60000) { // Less than 1 minute apart
          flags++;
        }
      }
    });

    // Check for signatures present
    const tasksWithSignatures = completedTasks.filter(t => t.signature_data);
    const signatureRate = completedTasks.length > 0 
      ? (tasksWithSignatures.length / completedTasks.length) * 100 
      : 100;

    // Combine checks
    const batchPenalty = totalChecks > 0 ? (flags / totalChecks) * 30 : 0;
    const signaturePenalty = (100 - signatureRate) * 0.3;

    const score = Math.max(0, Math.round(100 - batchPenalty - signaturePenalty));

    return {
      score,
      details: `${tasksWithSignatures.length}/${completedTasks.length} signed, ${flags} rapid completions flagged`
    };
  };

  // Helper to check if a task is truly overdue based on frequency cycle
  const isTaskOverdue = (task) => {
    if (!task.assigned_to) return false;
    if (task.status === "completed" || task.status === "verified") return false;
    
    const now = new Date();
    const freq = task.frequency?.toLowerCase() || "";
    
    // For daily/weekly tasks, use due_date
    if (freq.includes("daily") || (freq.includes("week") && !freq.includes("bi") && !freq.includes("2"))) {
      if (task.due_date) {
        try {
          const dueDate = parseISO(task.due_date);
          return dueDate < startOfDay(now);
        } catch {
          return false;
        }
      }
      return false;
    }
    
    // For longer frequencies, use cycle_start_date
    if (task.cycle_start_date) {
      try {
        const cycleStart = parseISO(task.cycle_start_date);
        let cycleEnd;
        
        if (freq.includes("bi-week") || freq.includes("biweek") || freq.includes("2 week")) {
          cycleEnd = new Date(cycleStart);
          cycleEnd.setDate(cycleEnd.getDate() + 14);
        } else if (freq.includes("month") && !freq.includes("bi")) {
          cycleEnd = new Date(cycleStart);
          cycleEnd.setMonth(cycleEnd.getMonth() + 1);
        } else if (freq.includes("bimonth") || freq.includes("bi-month") || freq.includes("2 month")) {
          cycleEnd = new Date(cycleStart);
          cycleEnd.setMonth(cycleEnd.getMonth() + 2);
        } else if (freq.includes("quarter")) {
          cycleEnd = new Date(cycleStart);
          cycleEnd.setMonth(cycleEnd.getMonth() + 3);
        } else if (freq.includes("annual") || freq.includes("year")) {
          cycleEnd = new Date(cycleStart);
          cycleEnd.setFullYear(cycleEnd.getFullYear() + 1);
        } else if (task.due_date) {
          cycleEnd = parseISO(task.due_date);
        } else {
          return false;
        }
        
        return now > cycleEnd;
      } catch {
        return false;
      }
    }
    
    // Fallback to due_date
    if (task.due_date) {
      try {
        const dueDate = parseISO(task.due_date);
        return dueDate < startOfDay(now);
      } catch {
        return false;
      }
    }
    
    return false;
  };

  // Calculate overdue risk
  const calculateOverdueRisk = (tasks, drains, diverters) => {
    const workTasks = tasks.filter(t => !t.is_group);
    const overdueTasks = workTasks.filter(isTaskOverdue);

    const highPriorityOverdue = overdueTasks.filter(t => 
      t.priority === "high" || t.priority === "critical"
    );

    // Drains overdue
    const overdueDrains = drains.filter(d => 
      d.status === "active" && !d.is_sealed && d.next_due_date && new Date(d.next_due_date) < new Date()
    );

    // Diverters needing attention
    const wetDiverters = diverters.filter(d => d.status === "active" && d.last_finding === "wet");

    const totalOverdue = overdueTasks.length + overdueDrains.length + wetDiverters.length;
    const criticalOverdue = highPriorityOverdue.length + wetDiverters.length;

    // Score calculation: start at 100, deduct for each overdue item
    let score = 100;
    score -= overdueTasks.length * 3;
    score -= highPriorityOverdue.length * 5; // Extra penalty for high priority
    score -= overdueDrains.length * 4;
    score -= wetDiverters.length * 5;

    return {
      score: Math.max(0, score),
      details: totalOverdue === 0 
        ? "No overdue items" 
        : `${overdueTasks.length} tasks, ${overdueDrains.length} drains, ${wetDiverters.length} wet diverters`
    };
  };

  // Calculate downtime and CAPA status
  const calculateDowntimeStatus = (downtimeEvents, capas) => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const recentEvents = downtimeEvents.filter(e => new Date(e.event_date) >= thirtyDaysAgo);
    const openEvents = downtimeEvents.filter(e => e.status === "open" || e.status === "immediate_action_taken");
    const recurringEvents = recentEvents.filter(e => e.is_recurring);
    
    const openCapas = capas.filter(c => !["closed", "effective"].includes(c.status));
    const overdueCapas = capas.filter(c => {
      if (c.status === "closed" || c.status === "effective") return false;
      if (!c.target_close_date) return false;
      return new Date(c.target_close_date) < new Date();
    });
    
    let score = 100;
    // Penalties
    score -= recentEvents.length * 3; // Each recent event
    score -= openEvents.length * 5; // Open events need attention
    score -= recurringEvents.length * 10; // Recurring issues are serious
    score -= overdueCapas.length * 8; // Overdue CAPAs
    
    // Bonuses for resolved issues
    const effectiveCapas = capas.filter(c => c.verification_result === "effective");
    score += effectiveCapas.length * 2;
    
    const issues = [];
    if (openEvents.length > 0) issues.push(`${openEvents.length} open events`);
    if (overdueCapas.length > 0) issues.push(`${overdueCapas.length} overdue CAPAs`);
    if (recurringEvents.length > 0) issues.push(`${recurringEvents.length} recurring`);
    
    return {
      score: Math.max(0, Math.min(100, score)),
      details: issues.length > 0 ? issues.join(", ") : "No active downtime issues"
    };
  };

  const factors = calculateFactors();
  
  // Calculate weighted total score
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + (f.score * f.weight / 100), 0)
  );

  // Determine score color and status
  const getScoreColor = (score) => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-amber-600";
    return "text-rose-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 85) return "bg-emerald-50 border-emerald-200";
    if (score >= 70) return "bg-blue-50 border-blue-200";
    if (score >= 50) return "bg-amber-50 border-amber-200";
    return "bg-rose-50 border-rose-200";
  };

  const getScoreStatus = (score) => {
    if (score >= 85) return { label: "Excellent", icon: ShieldCheck };
    if (score >= 70) return { label: "Good", icon: TrendingUp };
    if (score >= 50) return { label: "Needs Attention", icon: Minus };
    return { label: "At Risk", icon: TrendingDown };
  };

  const status = getScoreStatus(totalScore);
  const StatusIcon = status.icon;

  // Get top helpers and hurters
  const sortedFactors = [...factors].sort((a, b) => 
    (b.score * b.weight) - (a.score * a.weight)
  );
  
  const topHelpers = sortedFactors.filter(f => f.score >= 70).slice(0, 2);
  const topHurters = sortedFactors.filter(f => f.score < 70).sort((a, b) => a.score - b.score).slice(0, 2);

  return (
    <>
      <Card 
        className={cn(
          "p-3 md:p-4 border-2 cursor-pointer transition-all hover:shadow-lg overflow-hidden",
          getScoreBgColor(totalScore)
        )}
        onClick={() => setDetailOpen(true)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-3 flex-shrink-0",
              totalScore >= 85 ? "border-emerald-400 bg-emerald-100" :
              totalScore >= 70 ? "border-blue-400 bg-blue-100" :
              totalScore >= 50 ? "border-amber-400 bg-amber-100" :
              "border-rose-400 bg-rose-100"
            )}>
              <span className={cn("text-xl md:text-2xl font-bold", getScoreColor(totalScore))}>
                {totalScore}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <StatusIcon className={cn("w-4 h-4 flex-shrink-0", getScoreColor(totalScore))} />
                <h2 className="text-sm md:text-base font-bold text-slate-900 truncate">Sanitation Health Score</h2>
              </div>
              <Badge className={cn(
                "text-xs",
                totalScore >= 85 ? "bg-emerald-600" :
                totalScore >= 70 ? "bg-blue-600" :
                totalScore >= 50 ? "bg-amber-600" :
                "bg-rose-600",
                "text-white"
              )}>
                {status.label}
              </Badge>
              <p className="text-xs text-slate-600 mt-1 hidden sm:block line-clamp-1">
                Click to see what's helping and hurting your score
              </p>
            </div>
          </div>

          <div className="hidden md:flex flex-col gap-1 text-right flex-shrink-0 max-w-[180px]">
            {topHelpers.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                <TrendingUp className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{topHelpers[0].name}: {topHelpers[0].score}%</span>
              </div>
            )}
            {topHurters.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-700">
                <TrendingDown className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{topHurters[0].name}: {topHurters[0].score}%</span>
              </div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 md:hidden" />
        </div>
      </Card>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center border-2",
                totalScore >= 85 ? "border-emerald-400 bg-emerald-100" :
                totalScore >= 70 ? "border-blue-400 bg-blue-100" :
                totalScore >= 50 ? "border-amber-400 bg-amber-100" :
                "border-rose-400 bg-rose-100"
              )}>
                <span className={cn("text-xl font-bold", getScoreColor(totalScore))}>
                  {totalScore}
                </span>
              </div>
              <div>
                <span>Sanitation Health Score Breakdown</span>
                <Badge className={cn(
                  "ml-2",
                  totalScore >= 85 ? "bg-emerald-600" :
                  totalScore >= 70 ? "bg-blue-600" :
                  totalScore >= 50 ? "bg-amber-600" :
                  "bg-rose-600",
                  "text-white"
                )}>
                  {status.label}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Helping Section */}
            {topHelpers.length > 0 && (
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
                <h3 className="font-semibold text-emerald-800 flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5" />
                  What's Helping Your Score
                </h3>
                <div className="space-y-2">
                  {topHelpers.map(factor => {
                    const Icon = factor.icon;
                    return (
                      <div key={factor.id} className="flex items-start gap-3 bg-white rounded-2xl p-3">
                        <Icon className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">{factor.name}</span>
                            <Badge className="bg-emerald-600 text-white">{factor.score}%</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{factor.details}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hurting Section */}
            {topHurters.length > 0 && (
              <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200">
                <h3 className="font-semibold text-rose-800 flex items-center gap-2 mb-3">
                  <TrendingDown className="w-5 h-5" />
                  What Needs Attention
                </h3>
                <div className="space-y-2">
                  {topHurters.map(factor => {
                    const Icon = factor.icon;
                    return (
                      <div key={factor.id} className="flex items-start gap-3 bg-white rounded-2xl p-3">
                        <Icon className="w-5 h-5 text-rose-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">{factor.name}</span>
                            <Badge className="bg-rose-600 text-white">{factor.score}%</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{factor.details}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Factors */}
            <div className="border rounded-2xl p-4">
              <h3 className="font-semibold text-slate-900 mb-3">All Score Factors</h3>
              <div className="space-y-3">
                {factors.map(factor => {
                  const Icon = factor.icon;
                  return (
                    <div key={factor.id} className="flex items-center gap-3">
                      <Icon className={cn(
                        "w-5 h-5",
                        factor.score >= 70 ? "text-emerald-600" :
                        factor.score >= 50 ? "text-amber-600" :
                        "text-rose-600"
                      )} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900">{factor.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">{factor.weight}% weight</span>
                            <span className={cn(
                              "text-sm font-semibold",
                              factor.score >= 70 ? "text-emerald-600" :
                              factor.score >= 50 ? "text-amber-600" :
                              "text-rose-600"
                            )}>
                              {factor.score}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full transition-all",
                              factor.score >= 70 ? "bg-emerald-500" :
                              factor.score >= 50 ? "bg-amber-500" :
                              "bg-rose-500"
                            )}
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{factor.details}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Score Interpretation */}
            <div className="bg-slate-50 rounded-2xl p-4 border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-900">How This Score is Calculated</h3>
                <AskMeWhyButton
                  context="health_score"
                  data={{
                    totalScore,
                    factors: factors.map(f => ({ name: f.name, score: f.score, weight: f.weight, details: f.details })),
                    status: status.label,
                    topHelpers: topHelpers.map(f => f.name),
                    topHurters: topHurters.map(f => f.name)
                  }}
                  label="Explain This Score"
                  variant="outline"
                  size="sm"
                />
              </div>
              <p className="text-sm text-slate-600">
                The Sanitation Health Score combines 6 weighted factors to give you a real-time 
                indicator of your sanitation program's control status. A score of 85+ indicates 
                excellent control, 70-84 is good with minor improvements needed, 50-69 requires 
                attention, and below 50 indicates significant risk requiring immediate action.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}