// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  MessageSquare, Lightbulb, Users, GraduationCap,
  ChevronDown, Search, Target, TrendingUp, CheckCircle2, FileText, Brain, Sparkles, BookOpen, HelpCircle, Shield, RefreshCw, Loader2, Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, differenceInDays, subDays } from "date-fns";

// Coaching scenarios with generated guidance
const COACHING_CATEGORIES = {
  performance: { 
    label: "Performance Issues", 
    icon: TrendingUp, 
    color: "text-blue-600", 
    bg: "bg-blue-50",
    description: "Help employees improve task completion and quality"
  },
  competency: { 
    label: "Skill Gaps", 
    icon: GraduationCap, 
    color: "text-purple-600", 
    bg: "bg-purple-50",
    description: "Address training and competency needs"
  },
  compliance: { 
    label: "Compliance & Safety", 
    icon: Shield, 
    color: "text-rose-600", 
    bg: "bg-rose-50",
    description: "Reinforce food safety and SSOP adherence"
  },
  wellbeing: { 
    label: "Wellbeing & Fatigue", 
    icon: Heart, 
    color: "text-pink-600", 
    bg: "bg-pink-50",
    description: "Support employees showing signs of burnout or overload"
  },
  team: { 
    label: "Team Dynamics", 
    icon: Users, 
    color: "text-emerald-600", 
    bg: "bg-emerald-50",
    description: "Build collaboration and accountability"
  },
  recognition: { 
    label: "Recognition & Growth", 
    icon: Sparkles, 
    color: "text-amber-600", 
    bg: "bg-amber-50",
    description: "Motivate and develop top performers"
  }
};

export default function MentorCoachingMode({
  tasks = [],
  employees = [],
  areaSignOffs = [],
  drainLocations = [],
  drainCleaningRecords = [],
  diverterInspections = [],
  competencyEvaluations = [],
  employeeTrainings = [],
  trainingDocuments = [],
  employeeSessions = [],
  siteSettings = {},
  organizationId
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedScenario, setExpandedScenario] = useState(null);
  const [aiCoachingResponse, setAiCoachingResponse] = useState({});
  const [loadingCoaching, setLoadingCoaching] = useState({});

  // Analyze data to generate coaching scenarios
  const coachingScenarios = useMemo(() => {
    const scenarios = [];
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    // 1. REPEAT TASK MISSES - Identify employees with patterns
    const employeeTaskStats = {};
    tasks.forEach(task => {
      if (!task.assigned_to) return;
      if (!employeeTaskStats[task.assigned_to]) {
        employeeTaskStats[task.assigned_to] = { 
          total: 0, completed: 0, overdue: 0, missed: 0,
          name: task.assigned_to_name || task.assigned_to
        };
      }
      employeeTaskStats[task.assigned_to].total++;
      if (task.status === "completed" || task.status === "verified") {
        employeeTaskStats[task.assigned_to].completed++;
      }
      if (task.status === "overdue" || (task.due_date && new Date(task.due_date) < now && task.status === "pending")) {
        employeeTaskStats[task.assigned_to].overdue++;
      }
    });

    Object.entries(employeeTaskStats).forEach(([email, stats]) => {
      const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      const employee = employees.find(e => e.email === email);
      
      if (completionRate < 70 && stats.total >= 5) {
        scenarios.push({
          id: `perf-${email}`,
          category: "performance",
          priority: completionRate < 50 ? "high" : "medium",
          title: `Low task completion for ${stats.name}`,
          employee: employee || { name: stats.name, email },
          summary: `${completionRate}% completion rate (${stats.completed}/${stats.total} tasks). ${stats.overdue} currently overdue.`,
          context: {
            completionRate,
            totalTasks: stats.total,
            completedTasks: stats.completed,
            overdueTasks: stats.overdue
          },
          whyItMatters: "Consistent task completion is essential for maintaining sanitation standards and audit readiness.",
          quickTip: completionRate < 50 
            ? "Start with understanding—is workload realistic? Are there obstacles? Approach with curiosity, not criticism."
            : "Small improvements compound. Recognize progress while setting clear expectations for full completion."
        });
      }

      // Recognition for top performers
      if (completionRate >= 95 && stats.total >= 10) {
        scenarios.push({
          id: `recog-${email}`,
          category: "recognition",
          priority: "low",
          title: `Recognize excellence: ${stats.name}`,
          employee: employee || { name: stats.name, email },
          summary: `${completionRate}% completion rate with ${stats.total} tasks. Consistent high performer.`,
          context: { completionRate, totalTasks: stats.total },
          whyItMatters: "Recognizing strong performers reinforces positive behaviors and motivates the team.",
          quickTip: "Public recognition during shift handoffs or team meetings amplifies the impact. Consider peer mentoring opportunities."
        });
      }
    });

    // 2. COMPETENCY GAPS - Employees needing coaching after evaluations
    const needsCoaching = competencyEvaluations.filter(e => 
      e.result === "needs_coaching" || e.status === "needs_coaching"
    );
    
    needsCoaching.forEach(eval_ => {
      const employee = employees.find(e => e.email === eval_.employee_email);
      scenarios.push({
        id: `comp-${eval_.id}`,
        category: "competency",
        priority: "high",
        title: `Coaching needed: ${eval_.employee_name || eval_.employee_email}`,
        employee: employee || { name: eval_.employee_name, email: eval_.employee_email },
        summary: `Competency evaluation for "${eval_.training_title || eval_.task_title}" resulted in needs coaching.`,
        context: {
          trainingTitle: eval_.training_title || eval_.task_title,
          evaluatedAt: eval_.evaluated_at,
          evaluatorName: eval_.evaluator_name,
          coachingNotes: eval_.coaching_notes
        },
        whyItMatters: "Addressing skill gaps early prevents repeated errors and builds employee confidence.",
        quickTip: "Focus on specific behaviors observed during evaluation. Use 'show me' demonstrations and guided practice."
      });
    });

    // 3. DRAIN CLEANING PATTERNS - Repeat issues
    const drainIssues = {};
    drainCleaningRecords.forEach(record => {
      if (record.issues_found) {
        const key = record.drain_code || record.drain_id;
        if (!drainIssues[key]) {
          drainIssues[key] = { count: 0, records: [], location: record.drain_location };
        }
        drainIssues[key].count++;
        drainIssues[key].records.push(record);
      }
    });

    Object.entries(drainIssues).forEach(([drainId, data]) => {
      if (data.count >= 2) {
        const cleaners = [...new Set(data.records.map(r => r.cleaned_by_name || r.cleaned_by))];
        scenarios.push({
          id: `drain-${drainId}`,
          category: "compliance",
          priority: data.count >= 3 ? "high" : "medium",
          title: `Repeat drain issues at ${data.location || drainId}`,
          summary: `${data.count} issues reported. Cleaners involved: ${cleaners.join(", ")}`,
          context: {
            issueCount: data.count,
            cleaners,
            records: data.records.slice(0, 3)
          },
          whyItMatters: "Repeat drain issues can indicate inadequate cleaning technique, timing problems, or equipment issues.",
          quickTip: "Observe the cleaning process directly. Is dwell time adequate? Are tools in good condition? Sometimes the root cause is upstream."
        });
      }
    });

    // 4. DIVERTER WET FINDINGS - Patterns
    const wetFindings = diverterInspections.filter(i => i.finding === "wet");
    const wetByDiverter = {};
    wetFindings.forEach(inspection => {
      const key = inspection.diverter_code || inspection.diverter_id;
      if (!wetByDiverter[key]) {
        wetByDiverter[key] = { count: 0, inspectors: [] };
      }
      wetByDiverter[key].count++;
      wetByDiverter[key].inspectors.push(inspection.inspector_name || inspection.inspector_email);
    });

    Object.entries(wetByDiverter).forEach(([diverterId, data]) => {
      if (data.count >= 3) {
        scenarios.push({
          id: `diverter-${diverterId}`,
          category: "compliance",
          priority: "medium",
          title: `Persistent wet findings at diverter ${diverterId}`,
          summary: `${data.count} wet findings. May indicate roof repair needed or inspection timing issue.`,
          context: { wetCount: data.count, uniqueInspectors: [...new Set(data.inspectors)].length },
          whyItMatters: "Wet conditions create contamination risk. Persistent issues suggest the root cause hasn't been addressed.",
          quickTip: "Review inspection timing—is it after weather events? Escalate to maintenance if WO hasn't resolved."
        });
      }
    });

    // 5. NEW EMPLOYEE ONBOARDING - Recent hires needing support
    const recentEmployees = employees.filter(e => {
      if (!e.created_date) return false;
      return differenceInDays(now, parseISO(e.created_date)) <= 30;
    });

    recentEmployees.forEach(emp => {
      const empTrainings = employeeTrainings.filter(t => t.employee_email === emp.email);
      const empTasks = tasks.filter(t => t.assigned_to === emp.email);
      const completedTasks = empTasks.filter(t => t.status === "completed" || t.status === "verified").length;
      
      scenarios.push({
        id: `onboard-${emp.id}`,
        category: "team",
        priority: empTrainings.length === 0 ? "high" : "medium",
        title: `Support new team member: ${emp.name}`,
        employee: emp,
        summary: `Started ${differenceInDays(now, parseISO(emp.created_date))} days ago. ${empTrainings.length} trainings, ${completedTasks}/${empTasks.length} tasks completed.`,
        context: {
          daysOnTeam: differenceInDays(now, parseISO(emp.created_date)),
          trainingsCompleted: empTrainings.length,
          tasksCompleted: completedTasks,
          totalTasks: empTasks.length
        },
        whyItMatters: "New employees form lasting habits in their first 30 days. Early coaching prevents bad habits.",
        quickTip: "Check in daily during the first week. Pair with an experienced team member. Celebrate small wins."
      });
    });

    // 6. TRAINING COMPLIANCE - Overdue or missing
    const employeesWithoutRecentTraining = employees.filter(emp => {
      const empTrainings = employeeTrainings.filter(t => 
        t.employee_email === emp.email && 
        t.completed_at &&
        differenceInDays(now, parseISO(t.completed_at)) <= 90
      );
      return empTrainings.length === 0;
    });

    if (employeesWithoutRecentTraining.length > 0) {
      scenarios.push({
        id: "training-gap",
        category: "competency",
        priority: employeesWithoutRecentTraining.length > 3 ? "high" : "medium",
        title: `Training gaps: ${employeesWithoutRecentTraining.length} employees`,
        summary: `${employeesWithoutRecentTraining.map(e => e.name).slice(0, 3).join(", ")}${employeesWithoutRecentTraining.length > 3 ? ` and ${employeesWithoutRecentTraining.length - 3} more` : ""} have no recent training completions.`,
        context: {
          employees: employeesWithoutRecentTraining.slice(0, 5),
          totalCount: employeesWithoutRecentTraining.length
        },
        whyItMatters: "Regular training maintains skills and demonstrates due diligence for audits.",
        quickTip: "Review training schedules. Consider group refresher sessions or micro-learning during shift meetings."
      });
    }

    // 7. FATIGUE & BURNOUT SIGNALS
    // Look for employees showing signs of overload
    employees.forEach(emp => {
      const empTasks = tasks.filter(t => t.assigned_to === emp.email && !t.is_group);
      const pendingTasks = empTasks.filter(t => t.status === "pending" || t.status === "in_progress");
      const completedTasks = empTasks.filter(t => t.status === "completed" || t.status === "verified");
      const recentCompleted = completedTasks.filter(t => 
        t.completed_at && differenceInDays(now, parseISO(t.completed_at)) <= 7
      );

      // Check for late sign-offs pattern
      const lateSignoffs = recentCompleted.filter(t => {
        if (!t.due_date || !t.completed_at) return false;
        const dueDate = new Date(t.due_date);
        const completedDate = new Date(t.completed_at);
        return (completedDate - dueDate) > 4 * 60 * 60 * 1000;
      });
      const lateRatio = recentCompleted.length > 0 ? lateSignoffs.length / recentCompleted.length : 0;

      // Check for quota pressure
      const quotaThreshold = siteSettings?.task_quotas?.daily || 8;
      const quotaPressure = pendingTasks.length / Math.max(1, quotaThreshold);

      // Check for unsigned completions (rushing)
      const unsignedRatio = recentCompleted.length > 0 
        ? recentCompleted.filter(t => !t.signature_data).length / recentCompleted.length 
        : 0;

      const signals = [];
      if (lateRatio > 0.35) signals.push(`${Math.round(lateRatio * 100)}% late sign-offs`);
      if (quotaPressure > 1.5) signals.push(`${Math.round(quotaPressure * 100)}% quota load`);
      if (unsignedRatio > 0.5) signals.push(`${Math.round(unsignedRatio * 100)}% unsigned completions`);

      if (signals.length >= 2) {
        scenarios.push({
          id: `fatigue-${emp.id}`,
          category: "wellbeing",
          priority: signals.length >= 3 || quotaPressure > 2 ? "high" : "medium",
          title: `Fatigue signals: ${emp.name}`,
          employee: emp,
          summary: `Multiple indicators: ${signals.join(", ")}`,
          context: {
            pendingTasks: pendingTasks.length,
            completedLast7Days: recentCompleted.length,
            lateSignoffRate: Math.round(lateRatio * 100),
            quotaPressure: Math.round(quotaPressure * 100),
            unsignedRate: Math.round(unsignedRatio * 100)
          },
          whyItMatters: "Burnout leads to quality issues, errors, and turnover. Early intervention protects both performance and people.",
          quickTip: "Have a supportive check-in. Ask what's challenging—don't assume. Consider temporary quota reduction or task rotation."
        });
      }
    });

    return scenarios.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [tasks, employees, areaSignOffs, drainCleaningRecords, diverterInspections, competencyEvaluations, employeeTrainings, siteSettings]);

  // Filter scenarios
  const filteredScenarios = useMemo(() => {
    return coachingScenarios.filter(scenario => {
      const matchesSearch = !searchQuery || 
        scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scenario.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scenario.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || scenario.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [coachingScenarios, searchQuery, selectedCategory]);

  // Get AI coaching guidance for a scenario
  const getAICoaching = async (scenario) => {
    const key = scenario.id;
    if (aiCoachingResponse[key]) return; // Already loaded
    
    setLoadingCoaching(prev => ({ ...prev, [key]: true }));
    
    try {
      const contextDetails = JSON.stringify(scenario.context, null, 2);
      const prompt = `You are an experienced sanitation supervisor mentor providing coaching guidance. 

SCENARIO: ${scenario.title}
DETAILS: ${scenario.summary}
CONTEXT DATA: ${contextDetails}
WHY IT MATTERS: ${scenario.whyItMatters}

Provide practical coaching guidance in this exact JSON format:
{
  "rootCauseAnalysis": "2-3 sentences explaining likely root causes based on the data patterns",
  "conversationStarter": "A specific, empathetic opening line to use with the employee",
  "keyQuestions": ["3 open-ended questions to understand the situation"],
  "coachingSteps": ["4-5 specific coaching actions in plain language"],
  "ssopAlignment": "How this connects to sanitation SOPs and food safety culture",
  "followUpPlan": "Concrete follow-up actions and timeline",
  "successIndicators": ["2-3 measurable signs that coaching worked"]
}

Keep language conversational and supportive—this is coaching, not discipline. Focus on understanding first, then improvement.`;

      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            rootCauseAnalysis: { type: "string" },
            conversationStarter: { type: "string" },
            keyQuestions: { type: "array", items: { type: "string" } },
            coachingSteps: { type: "array", items: { type: "string" } },
            ssopAlignment: { type: "string" },
            followUpPlan: { type: "string" },
            successIndicators: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiCoachingResponse(prev => ({ ...prev, [key]: response }));
    } catch (error) {
      console.error("AI coaching error:", error);
      setAiCoachingResponse(prev => ({ 
        ...prev, 
        [key]: { error: "Unable to generate coaching guidance. Please try again." }
      }));
    } finally {
      setLoadingCoaching(prev => ({ ...prev, [key]: false }));
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high": return <Badge className="bg-rose-100 text-rose-800">High Priority</Badge>;
      case "medium": return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>;
      case "low": return <Badge className="bg-slate-100 text-slate-800">Low</Badge>;
      default: return null;
    }
  };

  const categoryCounts = useMemo(() => {
    const counts = { all: coachingScenarios.length };
    Object.keys(COACHING_CATEGORIES).forEach(cat => {
      counts[cat] = coachingScenarios.filter(s => s.category === cat).length;
    });
    return counts;
  }, [coachingScenarios]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Mentor & Coaching Mode</h2>
                <p className="text-indigo-100 mt-1">
                  Real-time guidance for leads, supervisors, and managers
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{coachingScenarios.length}</p>
              <p className="text-sm text-indigo-200">Coaching opportunities</p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(COACHING_CATEGORIES).map(([key, cat]) => {
              const Icon = cat.icon;
              const count = categoryCounts[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(selectedCategory === key ? "all" : key)}
                  className={cn(
                    "p-3 rounded-lg transition-all text-left",
                    selectedCategory === key 
                      ? "bg-white text-indigo-900" 
                      : "bg-white/10 hover:bg-white/20"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn("w-4 h-4", selectedCategory === key ? cat.color : "text-current")} />
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                  <p className={cn("text-xs", selectedCategory === key ? "text-indigo-600" : "text-indigo-100")}>
                    {cat.label}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by employee name, issue, or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Coaching Scenarios */}
      {filteredScenarios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
            <p className="text-slate-500">No coaching scenarios match your current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredScenarios.map((scenario) => {
            const catConfig = COACHING_CATEGORIES[scenario.category];
            const Icon = catConfig?.icon || HelpCircle;
            const isExpanded = expandedScenario === scenario.id;
            const coaching = aiCoachingResponse[scenario.id];
            const isLoading = loadingCoaching[scenario.id];

            return (
              <Card key={scenario.id} className={cn(
                "transition-all",
                scenario.priority === "high" && "border-rose-200"
              )}>
                <Collapsible open={isExpanded} onOpenChange={() => {
                  setExpandedScenario(isExpanded ? null : scenario.id);
                  if (!isExpanded && !coaching) {
                    getAICoaching(scenario);
                  }
                }}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={cn("p-2 rounded-lg flex-shrink-0", catConfig?.bg)}>
                          <Icon className={cn("w-5 h-5", catConfig?.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-base">{scenario.title}</CardTitle>
                              <p className="text-sm text-slate-600 mt-1">{scenario.summary}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getPriorityBadge(scenario.priority)}
                              <ChevronDown className={cn(
                                "w-5 h-5 text-slate-400 transition-transform",
                                isExpanded && "rotate-180"
                              )} />
                            </div>
                          </div>
                          
                          {/* Quick tip always visible */}
                          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-amber-800">Quick Tip</p>
                                <p className="text-sm text-amber-900">{scenario.quickTip}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="border-t pt-4 space-y-4">
                        {/* Why it matters */}
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs font-medium text-slate-500 mb-1">Why This Matters</p>
                          <p className="text-sm text-slate-700">{scenario.whyItMatters}</p>
                        </div>

                        {/* AI Generated Coaching */}
                        {isLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
                            <span className="text-slate-600">Generating coaching guidance...</span>
                          </div>
                        ) : coaching?.error ? (
                          <div className="p-4 bg-rose-50 rounded-lg text-rose-700 text-sm">
                            {coaching.error}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="ml-2"
                              onClick={() => {
                                setAiCoachingResponse(prev => {
                                  const copy = { ...prev };
                                  delete copy[scenario.id];
                                  return copy;
                                });
                                getAICoaching(scenario);
                              }}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : coaching ? (
                          <div className="space-y-4">
                            {/* Root Cause Analysis */}
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain className="w-4 h-4 text-indigo-600" />
                                <p className="text-sm font-semibold text-indigo-900">Root Cause Analysis</p>
                              </div>
                              <p className="text-sm text-indigo-800">{coaching.rootCauseAnalysis}</p>
                            </div>

                            {/* Conversation Starter */}
                            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-emerald-600" />
                                <p className="text-sm font-semibold text-emerald-900">Start the Conversation</p>
                              </div>
                              <p className="text-sm text-emerald-800 italic">"{coaching.conversationStarter}"</p>
                            </div>

                            {/* Key Questions */}
                            <div>
                              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <HelpCircle className="w-4 h-4" />
                                Questions to Ask
                              </p>
                              <ul className="space-y-2">
                                {coaching.keyQuestions?.map((q, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium flex-shrink-0">
                                      {i + 1}
                                    </span>
                                    {q}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Coaching Steps */}
                            <div>
                              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Coaching Steps
                              </p>
                              <ul className="space-y-2">
                                {coaching.coachingSteps?.map((step, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-700">{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* SSOP Alignment */}
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <p className="text-xs font-semibold text-blue-800">SSOP & Food Safety Connection</p>
                              </div>
                              <p className="text-sm text-blue-700">{coaching.ssopAlignment}</p>
                            </div>

                            {/* Follow-up Plan */}
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                              <div className="flex items-center gap-2 mb-1">
                                <RefreshCw className="w-4 h-4 text-purple-600" />
                                <p className="text-xs font-semibold text-purple-800">Follow-Up Plan</p>
                              </div>
                              <p className="text-sm text-purple-700">{coaching.followUpPlan}</p>
                            </div>

                            {/* Success Indicators */}
                            <div>
                              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Signs of Success
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {coaching.successIndicators?.map((indicator, i) => (
                                  <Badge key={i} variant="outline" className="text-sm">
                                    {indicator}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Best Practices Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5" />
            Coaching Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-900 mb-2">The 4-Step Approach</p>
              <ol className="text-sm text-slate-600 space-y-1">
                <li>1. <strong>Ask</strong> – Understand their perspective first</li>
                <li>2. <strong>Listen</strong> – Let them explain fully</li>
                <li>3. <strong>Guide</strong> – Share specific observations</li>
                <li>4. <strong>Agree</strong> – Set clear next steps together</li>
              </ol>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-900 mb-2">Language Tips</p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• "Help me understand..." instead of "Why didn't you..."</li>
                <li>• "What would help?" instead of "You need to..."</li>
                <li>• "I noticed..." instead of "You always..."</li>
                <li>• "Let's figure this out" instead of "Fix this"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}