import { useState, useEffect } from "react";
import { isAuthenticated, getCurrentUser, redirectToLogin } from "@/lib/adapters/auth";
import { OrganizationRepo, TaskRepo, EmployeeRepo, AreaSignOffRepo, EmployeeSessionRepo, SiteSettingsRepo, TrainingDocumentRepo, EmployeeTrainingRepo, DrainLocationRepo, DrainCleaningRecordRepo, RainDiverterRepo, DiverterInspectionRepo, CompetencyEvaluationRepo, PestFindingRepo, PestServiceReportRepo, PestEscalationMarkerRepo, EMPSampleRepo, EMPSiteRepo } from "@/lib/adapters/database";
import { sendEmail } from "@/lib/adapters/integrations";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, TrendingUp, Users, Droplet, Download, Mail, Loader2,
  Calendar, CheckCircle2, AlertTriangle, Clock, GraduationCap, Shield, Target, FileText
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import FailurePredictionDashboard from "@/components/prediction/FailurePredictionDashboard";
import EffectivenessTrackingEngine from "@/components/analytics/EffectivenessTrackingEngine";
import ExecutiveNarrativeEngine from "@/components/analytics/ExecutiveNarrativeEngine";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { 
  format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, subDays, subMonths, isWithinInterval, startOfDay, endOfDay 
} from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30days");
  const [emailAddress, setEmailAddress] = useState("");
  const [reportFrequency, setReportFrequency] = useState("weekly");
  const [orgId, setOrgId] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const isAuth = await isAuthenticated();
        if (!isAuth) {
          redirectToLogin();
          return;
        }
        
        const userData = await getCurrentUser();
        setUser(userData);
        
        // CRITICAL: Get organization_id ONLY from site_code in localStorage
        const storedSiteCode = localStorage.getItem('site_code');
        if (!storedSiteCode) {
          window.location.href = createPageUrl("Home");
          return;
        }
        
        const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
        if (orgs.length > 0) {
          setOrgId(orgs[0].id);
        } else {
          localStorage.removeItem('site_code');
          window.location.href = createPageUrl("Home");
        }
      } catch (e) {
        // Silently handle auth errors - don't log user out on transient errors
        console.log("Auth check error (non-fatal):", e?.message);
      }
    };
    getUser();
  }, []);

  // Stagger queries to avoid rate limiting - primary data first
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["analytics_tasks", orgId],
    queryFn: () => TaskRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000 // Cache for 1 minute
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["analytics_employees", orgId],
    queryFn: () => EmployeeRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  // Secondary data - wait for primary to complete
  const { data: areaSignOffs = [] } = useQuery({
    queryKey: ["analytics_signoffs", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 300)); // Small delay to stagger
      return AreaSignOffRepo.filter({ organization_id: orgId });
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  const { data: employeeSessions = [] } = useQuery({
    queryKey: ["analytics_sessions", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 500));
      return EmployeeSessionRepo.filter({ organization_id: orgId });
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["analytics_site_settings", orgId],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 300000 // Cache for 5 minutes - rarely changes
  });

  // Training data - load after other queries
  const { data: trainingDocuments = [] } = useQuery({
    queryKey: ["analytics_training_docs", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 700));
      return TrainingDocumentRepo.filter({ organization_id: orgId, status: "active" });
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  const { data: employeeTrainings = [] } = useQuery({
    queryKey: ["analytics_employee_trainings", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 900));
      return EmployeeTrainingRepo.filter({ organization_id: orgId });
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  // Additional data for effectiveness tracking
  const { data: drainLocations = [] } = useQuery({
    queryKey: ["analytics_drains", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 1100));
      return DrainLocationRepo.filter({ organization_id: orgId });
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  const { data: drainCleaningRecords = [] } = useQuery({
    queryKey: ["analytics_drain_records", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 1300));
      return DrainCleaningRecordRepo.filter({ organization_id: orgId }, "-cleaned_at", 200);
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  const { data: rainDiverters = [] } = useQuery({
    queryKey: ["analytics_diverters", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 1500));
      return RainDiverterRepo.filter({ organization_id: orgId });
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  const { data: diverterInspections = [] } = useQuery({
    queryKey: ["analytics_diverter_inspections", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 1700));
      return DiverterInspectionRepo.filter({ organization_id: orgId }, "-inspection_date", 200);
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  const { data: competencyEvaluations = [] } = useQuery({
    queryKey: ["analytics_competency", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 1900));
      return CompetencyEvaluationRepo.filter({ organization_id: orgId });
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  // Pest Control data
  const { data: pestFindings = [] } = useQuery({
    queryKey: ["analytics_pest_findings", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 2100));
      return PestFindingRepo.filter({ organization_id: orgId }, "-service_date", 100);
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  const { data: pestServiceReports = [] } = useQuery({
    queryKey: ["analytics_pest_reports", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 2300));
      return PestServiceReportRepo.filter({ organization_id: orgId }, "-service_date", 50);
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  const { data: pestEscalationMarkers = [] } = useQuery({
    queryKey: ["analytics_pest_escalations", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 2500));
      return PestEscalationMarkerRepo.filter({ organization_id: orgId }, "-escalation_date", 50);
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  // Environmental Monitoring data
  const { data: empSamples = [] } = useQuery({
    queryKey: ["analytics_emp_samples", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 2700));
      return EMPSampleRepo.filter({ organization_id: orgId }, "-collection_date", 100);
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  const { data: empSites = [] } = useQuery({
    queryKey: ["analytics_emp_sites", orgId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 2900));
      return EMPSiteRepo.filter({ organization_id: orgId });
    },
    enabled: !!orgId && !tasksLoading,
    staleTime: 60000
  });

  // Get date range
  const getDateRange = () => {
    const now = new Date();
    let start;
    switch (timeRange) {
      case "7days": start = subDays(now, 7); break;
      case "30days": start = subDays(now, 30); break;
      case "90days": start = subDays(now, 90); break;
      case "12months": start = subMonths(now, 12); break;
      default: start = subDays(now, 30);
    }
    return { start: startOfDay(start), end: endOfDay(now) };
  };

  const { start, end } = getDateRange();

  // Completion Trends Data
  const getCompletionTrendsData = () => {
    const intervals = timeRange === "12months" 
      ? eachMonthOfInterval({ start, end })
      : timeRange === "90days"
      ? eachWeekOfInterval({ start, end })
      : eachDayOfInterval({ start, end });

    return intervals.map(date => {
      const periodStart = timeRange === "12months" 
        ? startOfMonth(date)
        : timeRange === "90days"
        ? startOfWeek(date)
        : startOfDay(date);
      const periodEnd = timeRange === "12months"
        ? endOfMonth(date)
        : timeRange === "90days"
        ? endOfWeek(date)
        : endOfDay(date);

      const periodTasks = tasks.filter(t => {
        if (!t.completed_at) return false;
        const completedDate = parseISO(t.completed_at);
        return isWithinInterval(completedDate, { start: periodStart, end: periodEnd });
      });

      const periodSignOffs = areaSignOffs.filter(s => {
        if (!s.signed_off_at) return false;
        const signedDate = parseISO(s.signed_off_at);
        return isWithinInterval(signedDate, { start: periodStart, end: periodEnd });
      });

      return {
        date: timeRange === "12months" 
          ? format(date, "MMM yy")
          : timeRange === "90days"
          ? format(date, "MMM d")
          : format(date, "MMM d"),
        tasks: periodTasks.length,
        signOffs: periodSignOffs.length,
        total: periodTasks.length + periodSignOffs.length
      };
    });
  };

  // Employee Performance Comparison
  const getEmployeeComparisonData = () => {
    return employees.map(emp => {
      const empTasks = tasks.filter(t => {
        if (t.assigned_to !== emp.email) return false;
        if (!t.completed_at) return false;
        const completedDate = parseISO(t.completed_at);
        return isWithinInterval(completedDate, { start, end });
      });

      const empSignOffs = areaSignOffs.filter(s => {
        if (s.employee_email !== emp.email) return false;
        if (!s.signed_off_at) return false;
        const signedDate = parseISO(s.signed_off_at);
        return isWithinInterval(signedDate, { start, end });
      });

      const empSessions = employeeSessions.filter(s => {
        if (s.employee_email !== emp.email) return false;
        if (!s.session_date) return false;
        const sessionDate = parseISO(s.session_date);
        return isWithinInterval(sessionDate, { start, end });
      });

      return {
        name: emp.name?.split(' ')[0] || emp.email,
        fullName: emp.name,
        tasks: empTasks.length,
        signOffs: empSignOffs.length,
        shifts: empSessions.length,
        total: empTasks.length + empSignOffs.length
      };
    }).sort((a, b) => b.total - a.total);
  };

  // ATP Pass Rate Trends
  const getATPTrendsData = () => {
    const intervals = timeRange === "12months"
      ? eachMonthOfInterval({ start, end })
      : eachWeekOfInterval({ start, end });

    return intervals.map(date => {
      const periodStart = timeRange === "12months" ? startOfMonth(date) : startOfWeek(date);
      const periodEnd = timeRange === "12months" ? endOfMonth(date) : endOfWeek(date);

      const periodTests = areaSignOffs.filter(s => {
        if (!s.atp_test_result || s.atp_test_result === "not_required") return false;
        if (!s.atp_tested_at) return false;
        const testedDate = parseISO(s.atp_tested_at);
        return isWithinInterval(testedDate, { start: periodStart, end: periodEnd });
      });

      const passed = periodTests.filter(s => s.atp_test_result === "pass").length;
      const total = periodTests.length;
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      return {
        date: timeRange === "12months" ? format(date, "MMM yy") : format(date, "MMM d"),
        passRate,
        passed,
        failed: periodTests.filter(s => s.atp_test_result === "fail").length,
        total
      };
    });
  };

  // Helper to calculate if a task is overdue based on its frequency
  const isTaskOverdue = (task) => {
    if (task.status === "completed" || task.status === "verified") return false;
    if (!task.due_date) return false;
    
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const freq = task.frequency?.toLowerCase().trim() || '';
    
    // Calculate the deadline based on frequency
    // The due_date is typically the START of the cycle, so we need to add the frequency period
    let deadline = new Date(dueDate);
    
    if (freq === 'daily') {
      // Daily tasks: deadline is end of the day they're due
      deadline.setHours(23, 59, 59, 999);
    } else if (freq === 'weekly') {
      // Weekly tasks: deadline is 7 days after due_date
      deadline.setDate(deadline.getDate() + 7);
      deadline.setHours(23, 59, 59, 999);
    } else if (freq === 'bi-weekly' || freq === 'biweekly') {
      // Bi-weekly: 14 days
      deadline.setDate(deadline.getDate() + 14);
      deadline.setHours(23, 59, 59, 999);
    } else if (freq === 'monthly') {
      // Monthly: end of the month of due_date
      deadline = endOfMonth(dueDate);
    } else if (freq === 'bimonthly') {
      // Bimonthly: 2 months after due_date
      deadline.setMonth(deadline.getMonth() + 2);
      deadline = endOfMonth(deadline);
    } else if (freq === 'quarterly') {
      // Quarterly: 3 months after due_date
      deadline.setMonth(deadline.getMonth() + 3);
      deadline = endOfMonth(deadline);
    } else if (freq === 'annually' || freq === 'annual') {
      // Annually: 1 year after due_date
      deadline.setFullYear(deadline.getFullYear() + 1);
      deadline = endOfMonth(deadline);
    } else {
      // Default: end of due date
      deadline.setHours(23, 59, 59, 999);
    }
    
    return now > deadline;
  };

  // Task Status Distribution
  const getTaskStatusData = () => {
    const completed = tasks.filter(t => t.status === "completed" || t.status === "verified").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const pending = tasks.filter(t => t.status === "pending").length;
    const overdue = tasks.filter(t => isTaskOverdue(t)).length;

    return [
      { name: "Completed", value: completed, color: "#059669" },
      { name: "In Progress", value: inProgress, color: "#3b82f6" },
      { name: "Pending", value: pending - overdue, color: "#f59e0b" },
      { name: "Overdue", value: overdue, color: "#ef4444" }
    ].filter(d => d.value > 0);
  };

  // Get frequency stats - calculates expected vs completed per frequency
  const getFrequencyStats = () => {
    // Count unique master tasks (templates) per frequency
    const masterTasksByFrequency = {};
    const completedByFrequency = {};
    
    // Group tasks by frequency (case-insensitive)
    tasks.forEach(task => {
      const freq = task.frequency?.toLowerCase().trim() || 'other';
      
      // Count master tasks (is_recurring=true or no parent_task_id means it's a template)
      if (task.is_recurring || !task.parent_task_id) {
        if (!masterTasksByFrequency[freq]) {
          masterTasksByFrequency[freq] = new Set();
        }
        // Use title+area as unique identifier for master tasks
        masterTasksByFrequency[freq].add(`${task.title}-${task.area}`);
      }
      
      // Count completed tasks in date range
      if ((task.status === "completed" || task.status === "verified") && task.completed_at) {
        const completedDate = parseISO(task.completed_at);
        if (isWithinInterval(completedDate, { start, end })) {
          completedByFrequency[freq] = (completedByFrequency[freq] || 0) + 1;
        }
      }
    });

    // Get frequency settings for shift count
    const settings = siteSettings[0] || {};
    const frequencySettings = settings.frequency_settings || {};
    
    // Calculate expected completions based on frequency rules
    const getExpectedCompletions = (freq, masterCount) => {
      const freqSettings = frequencySettings[freq] || {};
      const resetTimes = freqSettings.reset_times || ["05:00"]; // shifts per day
      const shiftsPerDay = resetTimes.length;
      
      // Calculate work days in the selected range
      let workDays = 0;
      const intervals = eachDayOfInterval({ start, end });
      intervals.forEach(date => {
        const dayOfWeek = date.getDay();
        // Count Mon-Fri as work days (0=Sun, 6=Sat)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workDays++;
        }
      });

      const intervalType = freqSettings.interval_type || "daily";
      
      if (freq === "daily" || intervalType === "daily") {
        // Daily: master tasks × shifts per day × work days
        return masterCount * shiftsPerDay * workDays;
      } else if (intervalType === "days") {
        // Every X days
        const intervalDays = freqSettings.interval_days || 7;
        const occurrences = Math.floor((Number(end) - Number(start)) / (1000 * 60 * 60 * 24 * intervalDays)) + 1;
        return masterCount * shiftsPerDay * occurrences;
      } else if (freq === "weekly" || intervalType === "weekly") {
        // Weekly: master tasks × shifts × weeks in range
        const weeks = Math.ceil((Number(end) - Number(start)) / (1000 * 60 * 60 * 24 * 7));
        return masterCount * shiftsPerDay * weeks;
      } else if (freq === "biweekly" || intervalType === "monthly_dates") {
        // Biweekly/twice monthly
        const months = Math.ceil((Number(end) - Number(start)) / (1000 * 60 * 60 * 24 * 30));
        const datesPerMonth = freqSettings.monthly_dates?.length || 2;
        return masterCount * shiftsPerDay * months * datesPerMonth;
      } else if (freq === "monthly" || intervalType === "months") {
        // Monthly
        const months = Math.ceil((Number(end) - Number(start)) / (1000 * 60 * 60 * 24 * 30));
        return masterCount * shiftsPerDay * months;
      } else if (freq === "quarterly") {
        const quarters = Math.ceil((Number(end) - Number(start)) / (1000 * 60 * 60 * 24 * 90));
        return masterCount * shiftsPerDay * quarters;
      } else if (freq === "annually" || intervalType === "yearly") {
        const years = Math.ceil((Number(end) - Number(start)) / (1000 * 60 * 60 * 24 * 365));
        return masterCount * shiftsPerDay * Math.max(1, years);
      }
      
      // Default fallback
      return masterCount * shiftsPerDay;
    };

    // Build stats array
    const frequencies = [...new Set([...Object.keys(masterTasksByFrequency), ...Object.keys(completedByFrequency)])];
    
    return frequencies.map(freq => {
      const masterCount = masterTasksByFrequency[freq]?.size || 0;
      const completed = completedByFrequency[freq] || 0;
      const expected = getExpectedCompletions(freq, masterCount);
      const completionRate = expected > 0 ? Math.round((completed / expected) * 100) : 0;
      
      return {
        frequency: freq,
        masterTasks: masterCount,
        expected,
        completed,
        completionRate,
        gap: expected - completed
      };
    }).sort((a, b) => b.expected - a.expected);
  };

  // Export to CSV
  const exportToCSV = (dataType) => {
    let csvContent = "";
    let filename = "";

    if (dataType === "tasks") {
      csvContent = "ID,Title,Area,Frequency,Status,Assigned To,Due Date,Completed At,Priority\n";
      tasks.forEach(t => {
        csvContent += `"${t.id}","${t.title || ''}","${t.area || ''}","${t.frequency || ''}","${t.status || ''}","${t.assigned_to_name || ''}","${t.due_date || ''}","${t.completed_at || ''}","${t.priority || ''}"\n`;
      });
      filename = `tasks_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else if (dataType === "employees") {
      const empData = getEmployeeComparisonData();
      csvContent = "Name,Tasks Completed,Sign-Offs,Shifts Worked,Total\n";
      empData.forEach(e => {
        csvContent += `"${e.fullName}",${e.tasks},${e.signOffs},${e.shifts},${e.total}\n`;
      });
      filename = `employee_performance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else if (dataType === "atp") {
      csvContent = "Asset ID,Employee,Test Result,RLU Value,Tested At,Retest Count\n";
      areaSignOffs.filter(s => s.atp_test_result && s.atp_test_result !== "not_required").forEach(s => {
        csvContent += `"${s.asset_id}","${s.employee_name || ''}","${s.atp_test_result}",${s.atp_test_value || ''},"${s.atp_tested_at || ''}",${s.atp_retest_count || 0}\n`;
      });
      filename = `atp_results_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success(`${dataType} data exported successfully`);
  };

  // Send Report Email
  const sendReportMutation = useMutation({
    mutationFn: async () => {
      const empData = getEmployeeComparisonData();
      const atpData = getATPTrendsData();
      const statusData = getTaskStatusData();

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "verified").length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const atpTests = areaSignOffs.filter(s => s.atp_test_result && s.atp_test_result !== "not_required");
      const atpPassed = atpTests.filter(s => s.atp_test_result === "pass").length;
      const atpRate = atpTests.length > 0 ? Math.round((atpPassed / atpTests.length) * 100) : 0;

      const topEmployees = empData.slice(0, 5).map(e => `${e.fullName}: ${e.total} completions`).join("\n");

      const reportBody = `
Sanitation Performance Report - ${format(new Date(), 'MMMM d, yyyy')}
============================================================

OVERVIEW
--------
Total Tasks: ${totalTasks}
Completed: ${completedTasks} (${completionRate}%)
In Progress: ${tasks.filter(t => t.status === "in_progress").length}
Overdue: ${tasks.filter(t => isTaskOverdue(t)).length}

ATP TESTING
-----------
Total Tests: ${atpTests.length}
Pass Rate: ${atpRate}%
Passed: ${atpPassed}
Failed: ${atpTests.filter(s => s.atp_test_result === "fail").length}

TOP PERFORMERS
--------------
${topEmployees}

---
This is an automated report. Configure your report settings in the Analytics dashboard.
      `;

      await sendEmail({
        to: emailAddress,
        subject: `Sanitation Report - ${format(new Date(), 'MMM d, yyyy')}`,
        body: reportBody
      });
    },
    onSuccess: () => {
      toast.success("Report sent successfully!");
    },
    onError: () => {
      toast.error("Failed to send report");
    }
  });

  if (tasksLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  const completionData = getCompletionTrendsData();
  const employeeData = getEmployeeComparisonData();
  const atpData = getATPTrendsData();
  const statusData = getTaskStatusData();
  const frequencyStats = getFrequencyStats();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-6">
          <div>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 md:w-8 md:h-8" />
              Analytics & Reports
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">Track performance trends and export data</p>
          </div>
          {/* @ts-ignore - Select component properly accepts children and value props */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            {/* @ts-ignore - SelectTrigger component properly accepts children prop */}
            <SelectTrigger className="w-32 md:w-40 h-8 md:h-10 text-xs md:text-sm">
              <SelectValue />
            </SelectTrigger>
            {/* @ts-ignore - SelectContent component properly accepts children prop */}
            <SelectContent>
              {/* @ts-ignore - SelectItem component properly accepts children and value props */}
              <SelectItem value="7days">Last 7 Days</SelectItem>
              {/* @ts-ignore - SelectItem component properly accepts children and value props */}
              <SelectItem value="30days">Last 30 Days</SelectItem>
              {/* @ts-ignore - SelectItem component properly accepts children and value props */}
              <SelectItem value="90days">Last 90 Days</SelectItem>
              {/* @ts-ignore - SelectItem component properly accepts children and value props */}
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="narrative" className="space-y-3 md:space-y-6">
          <TabsList className="bg-white border shadow-sm flex-wrap h-auto p-1 gap-0.5">
            <TabsTrigger value="narrative" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5">
              <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Executive </span>Summary
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="employees" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5">
              <Users className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Employees</span><span className="sm:hidden">Team</span>
            </TabsTrigger>
            <TabsTrigger value="atp" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5">
              <Droplet className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              ATP
            </TabsTrigger>
            <TabsTrigger value="training" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5">
              <GraduationCap className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Training</span><span className="sm:hidden">Train</span>
            </TabsTrigger>
            <TabsTrigger value="prediction" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5">
              <Shield className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Risk
            </TabsTrigger>
            <TabsTrigger value="effectiveness" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5">
              <Target className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Effectiveness</span><span className="sm:hidden">Effect</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5">
              <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-3 md:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-1.5 md:gap-4">
              <Card>
                <CardContent className="p-2 md:p-4">
                  <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                    <div className="p-1.5 md:p-2 rounded-lg bg-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5 md:w-5 md:h-5 text-emerald-600" />
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-[10px] md:text-sm text-slate-500">Done</p>
                      <p className="text-lg md:text-2xl font-bold text-slate-900">
                        {tasks.filter(t => t.status === "completed" || t.status === "verified").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2 md:p-4">
                  <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                    <div className="p-1.5 md:p-2 rounded-lg bg-blue-100">
                      <Clock className="w-3.5 h-3.5 md:w-5 md:h-5 text-blue-600" />
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-[10px] md:text-sm text-slate-500">Active</p>
                      <p className="text-lg md:text-2xl font-bold text-slate-900">
                        {tasks.filter(t => t.status === "in_progress").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2 md:p-4">
                  <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                    <div className="p-1.5 md:p-2 rounded-lg bg-amber-100">
                      <Calendar className="w-3.5 h-3.5 md:w-5 md:h-5 text-amber-600" />
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-[10px] md:text-sm text-slate-500">Pending</p>
                      <p className="text-lg md:text-2xl font-bold text-slate-900">
                        {tasks.filter(t => t.status === "pending").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2 md:p-4">
                  <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                    <div className="p-1.5 md:p-2 rounded-lg bg-rose-100">
                      <AlertTriangle className="w-3.5 h-3.5 md:w-5 md:h-5 text-rose-600" />
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-[10px] md:text-sm text-slate-500">Overdue</p>
                      <p className="text-lg md:text-2xl font-bold text-slate-900">
                        {tasks.filter(t => isTaskOverdue(t)).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Completion Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={completionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="tasks" name="Tasks" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="signOffs" name="Sign-Offs" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Task Status Distribution */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Completions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={completionData.slice(-14)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Frequency Completion Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Completion by Frequency</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Expected completions based on number of tasks × shifts × scheduled days
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {frequencyStats.map(stat => (
                    <div key={stat.frequency} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900 capitalize">{stat.frequency}</span>
                          <span className="text-xs text-slate-500">({stat.masterTasks} unique tasks)</span>
                        </div>
                        <span className={`text-lg font-bold ${
                          stat.completionRate >= 90 ? 'text-emerald-600' : 
                          stat.completionRate >= 70 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {stat.completionRate}%
                        </span>
                      </div>
                      <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                            stat.completionRate >= 90 ? 'bg-emerald-500' : 
                            stat.completionRate >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, stat.completionRate)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-sm text-slate-600">
                        <span>Completed: <strong>{stat.completed}</strong></span>
                        <span>Expected: <strong>{stat.expected}</strong></span>
                        <span>Gap: <strong className={stat.gap > 0 ? 'text-rose-600' : 'text-emerald-600'}>{stat.gap > 0 ? `-${stat.gap}` : '✓'}</strong></span>
                      </div>
                    </div>
                  ))}
                  {frequencyStats.length === 0 && (
                    <p className="text-slate-500 text-center py-4">No task data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Frequency Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Expected vs Actual Completions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={frequencyStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="frequency" type="category" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="expected" name="Expected" fill="#e2e8f0" />
                      <Bar dataKey="completed" name="Completed" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={employeeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tasks" name="Tasks" fill="#3b82f6" stackId="a" />
                      <Bar dataKey="signOffs" name="Sign-Offs" fill="#8b5cf6" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <div className="grid md:grid-cols-3 gap-4">
              {employeeData.slice(0, 3).map((emp, idx) => (
                <Card key={emp.name} className={idx === 0 ? "border-2 border-amber-400" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : "bg-amber-700"
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{emp.fullName}</p>
                        <p className="text-sm text-slate-500">{emp.total} completions</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-blue-600">{emp.tasks}</p>
                        <p className="text-xs text-slate-500">Tasks</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-purple-600">{emp.signOffs}</p>
                        <p className="text-xs text-slate-500">Sign-Offs</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-600">{emp.shifts}</p>
                        <p className="text-xs text-slate-500">Shifts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ATP Tab */}
          <TabsContent value="atp" className="space-y-6">
            {/* ATP Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const atpTests = areaSignOffs.filter(s => s.atp_test_result && s.atp_test_result !== "not_required");
                const passed = atpTests.filter(s => s.atp_test_result === "pass").length;
                const failed = atpTests.filter(s => s.atp_test_result === "fail").length;
                const firstPass = atpTests.filter(s => s.atp_test_result === "pass" && s.atp_retest_count === 0).length;
                const passRate = atpTests.length > 0 ? Math.round((passed / atpTests.length) * 100) : 0;

                return (
                  <>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Total Tests</p>
                        <p className="text-2xl font-bold text-slate-900">{atpTests.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Pass Rate</p>
                        <p className="text-2xl font-bold text-emerald-600">{passRate}%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-500">First Pass</p>
                        <p className="text-2xl font-bold text-blue-600">{firstPass}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Failed</p>
                        <p className="text-2xl font-bold text-rose-600">{failed}</p>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </div>

            {/* ATP Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>ATP Pass Rate Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={atpData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="passRate" name="Pass Rate %" stroke="#059669" strokeWidth={2} dot={{ fill: "#059669" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ATP Results Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Test Results Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={atpData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="passed" name="Passed" fill="#059669" stackId="a" />
                      <Bar dataKey="failed" name="Failed" fill="#ef4444" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training" className="space-y-6">
            {/* Training Summary */}
            {(() => {
              const totalDocs = trainingDocuments.length;
              const activeEmployees = employees.filter(e => e.status === "active");
              const totalRequired = totalDocs * activeEmployees.length;
              const totalCompleted = employeeTrainings.length;
              const overallProgress = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;

              // Build employee training progress data
              const employeeProgress = activeEmployees.map(emp => {
                const completedIds = new Set(
                  employeeTrainings
                    .filter(t => t.employee_id === emp.id)
                    .map(t => t.document_id)
                );
                const completed = completedIds.size;
                const progress = totalDocs > 0 ? Math.round((completed / totalDocs) * 100) : 0;
                return {
                  id: emp.id,
                  name: emp.name,
                  email: emp.email,
                  completed,
                  total: totalDocs,
                  progress,
                  completedTrainings: employeeTrainings.filter(t => t.employee_id === emp.id)
                };
              }).sort((a, b) => b.progress - a.progress);

              return (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100">
                            <GraduationCap className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Training Materials</p>
                            <p className="text-2xl font-bold text-slate-900">{totalDocs}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Active Employees</p>
                            <p className="text-2xl font-bold text-slate-900">{activeEmployees.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Completed</p>
                            <p className="text-2xl font-bold text-slate-900">{totalCompleted} / {totalRequired}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100">
                            <TrendingUp className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Overall Progress</p>
                            <p className="text-2xl font-bold text-slate-900">{overallProgress}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Overall Progress Bar */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Organization Training Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Overall Completion</span>
                          <span className="font-medium">{totalCompleted} of {totalRequired} trainings completed</span>
                        </div>
                        {/* @ts-ignore - Progress component properly accepts value prop */}
                        <Progress value={overallProgress} className="h-4" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Employee Progress List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Employee Training Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {employeeProgress.map(emp => (
                          <div key={emp.id} className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-medium text-slate-700">
                                  {emp.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'E'}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{emp.name}</p>
                                  <p className="text-xs text-slate-500">{emp.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${
                                  emp.progress === 100 ? 'text-emerald-600' : 
                                  emp.progress >= 50 ? 'text-amber-600' : 'text-rose-600'
                                }`}>
                                  {emp.progress}%
                                </p>
                                <p className="text-xs text-slate-500">{emp.completed} / {emp.total} complete</p>
                              </div>
                            </div>
                            <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                                  emp.progress === 100 ? 'bg-emerald-500' : 
                                  emp.progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${emp.progress}%` }}
                              />
                            </div>
                            {emp.progress === 100 && (
                              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                All trainings completed!
                              </p>
                            )}
                          </div>
                        ))}
                        {employeeProgress.length === 0 && (
                          <p className="text-slate-500 text-center py-8">No employees found</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Training Document Completion Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Completion by Training Document</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {trainingDocuments.map(doc => {
                          const completions = employeeTrainings.filter(t => t.document_id === doc.id).length;
                          const docProgress = activeEmployees.length > 0 ? Math.round((completions / activeEmployees.length) * 100) : 0;
                          return (
                            <div key={doc.id} className="flex items-center gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                                <p className="text-xs text-slate-500">{completions} / {activeEmployees.length} employees</p>
                              </div>
                              <div className="w-32">
                                <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className="absolute left-0 top-0 h-full bg-blue-500 rounded-full"
                                    style={{ width: `${docProgress}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{docProgress}%</span>
                            </div>
                          );
                        })}
                        {trainingDocuments.length === 0 && (
                          <p className="text-slate-500 text-center py-8">No training documents found</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>

          {/* Risk Prediction Tab */}
          <TabsContent value="prediction">
            <FailurePredictionDashboard 
              organizationId={orgId}
              pestFindings={pestFindings}
              pestEscalationMarkers={pestEscalationMarkers}
              empSamples={empSamples}
              empSites={empSites}
            />
          </TabsContent>

          {/* Effectiveness Tracking Tab */}
          <TabsContent value="effectiveness">
            <EffectivenessTrackingEngine
              tasks={tasks}
              employees={employees}
              areaSignOffs={areaSignOffs}
              drainLocations={drainLocations}
              drainCleaningRecords={drainCleaningRecords}
              rainDiverters={rainDiverters}
              diverterInspections={diverterInspections}
              competencyEvaluations={competencyEvaluations}
              employeeTrainings={employeeTrainings}
              timeRange={timeRange}
              pestFindings={pestFindings}
              pestEscalationMarkers={pestEscalationMarkers}
              empSamples={empSamples}
              empSites={empSites}
            />
          </TabsContent>

          {/* Executive Narrative Tab */}
          <TabsContent value="narrative">
            <ExecutiveNarrativeEngine
              tasks={tasks}
              employees={employees}
              areaSignOffs={areaSignOffs}
              drainLocations={drainLocations}
              drainCleaningRecords={drainCleaningRecords}
              rainDiverters={rainDiverters}
              diverterInspections={diverterInspections}
              competencyEvaluations={competencyEvaluations}
              employeeTrainings={employeeTrainings}
              employeeSessions={employeeSessions}
              siteSettings={siteSettings[0] || {}}
              organizationId={orgId}
              pestFindings={pestFindings}
              pestServiceReports={pestServiceReports}
              pestEscalationMarkers={pestEscalationMarkers}
              empSamples={empSamples}
              empSites={empSites}
            />
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            {/* CSV Export */}
            <Card>
              <CardHeader>
                <CardTitle>Export Data to CSV</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Button onClick={() => exportToCSV("tasks")} variant="outline" className="h-24 flex-col">
                    <Download className="w-6 h-6 mb-2" />
                    <span>Export Tasks</span>
                    <span className="text-xs text-slate-500">{tasks.length} records</span>
                  </Button>
                  <Button onClick={() => exportToCSV("employees")} variant="outline" className="h-24 flex-col">
                    <Users className="w-6 h-6 mb-2" />
                    <span>Export Employee Data</span>
                    <span className="text-xs text-slate-500">{employees.length} employees</span>
                  </Button>
                  <Button onClick={() => exportToCSV("atp")} variant="outline" className="h-24 flex-col">
                    <Droplet className="w-6 h-6 mb-2" />
                    <span>Export ATP Results</span>
                    <span className="text-xs text-slate-500">{areaSignOffs.filter(s => s.atp_test_result && s.atp_test_result !== "not_required").length} tests</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Email Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Send Report via Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    {/* @ts-ignore - Label component properly accepts children and htmlFor props */}
                    <Label htmlFor="email">Email Address</Label>
                    {/* @ts-ignore - Input component properly accepts all standard HTML input props */}
                    {/* @ts-ignore */}
                    {/* @ts-ignore */}
                    <Input
                      // @ts-ignore
                      id="email"
                      type="email"
                      placeholder="manager@company.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    {/* @ts-ignore - Label component properly accepts children prop */}
                    <Label>Report Type</Label>
                    {/* @ts-ignore - Select component properly accepts children and value props */}
                    <Select value={reportFrequency} onValueChange={setReportFrequency}>
                      {/* @ts-ignore - SelectTrigger component properly accepts children prop */}
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      {/* @ts-ignore - SelectContent component properly accepts children prop */}
                      <SelectContent>
                        {/* @ts-ignore - SelectItem component properly accepts children and value props */}
                        <SelectItem value="daily">Daily Summary</SelectItem>
                        {/* @ts-ignore - SelectItem component properly accepts children and value props */}
                        <SelectItem value="weekly">Weekly Report</SelectItem>
                        {/* @ts-ignore - SelectItem component properly accepts children and value props */}
                        <SelectItem value="monthly">Monthly Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={() => sendReportMutation.mutate()}
                  disabled={!emailAddress || sendReportMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  {sendReportMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Send Report Now
                </Button>
                <p className="text-xs text-slate-500">
                  This will send a performance summary report to the specified email address.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}