import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, Calendar, CheckCircle2, Droplets,
  GraduationCap, ClipboardCheck, Target, Lock, Eye, ArrowRight
} from "lucide-react";
import { format, subDays, subMonths, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

import AuditHealthScoreSection from "./AuditHealthScoreSection";
import AuditCompletionRecords from "./AuditCompletionRecords";
import AuditTrainingSection from "./AuditTrainingSection";
import AuditAssetRecords from "./AuditAssetRecords";
import AuditVerificationSection from "./AuditVerificationSection";
import AuditEffectivenessSection from "./AuditEffectivenessSection";

export default function AuditModeView({
  tasks = [],
  employees = [],
  areaSignOffs = [],
  drainLocations = [],
  drainCleaningRecords = [],
  rainDiverters = [],
  diverterInspections = [],
  chemicalInventoryRecords = [],
  chemicalCountEntries = [],
  competencyEvaluations = [],
  employeeTrainings = [],
  trainingDocuments = [],
  areas = [],
  productionLines = [],
  assets = [],
  organizationId
}) {
  const [dateRange, setDateRange] = useState("30days");
  const [selectedArea, setSelectedArea] = useState("all");
  const [activeSection, setActiveSection] = useState("overview");
  const [guidedMode, setGuidedMode] = useState(true);

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    let start;
    switch (dateRange) {
      case "7days": start = subDays(now, 7); break;
      case "30days": start = subDays(now, 30); break;
      case "90days": start = subDays(now, 90); break;
      case "6months": start = subMonths(now, 6); break;
      case "12months": start = subMonths(now, 12); break;
      default: start = subDays(now, 30);
    }
    return { start: startOfDay(start), end: endOfDay(now) };
  };

  const { start, end } = getDateRange();

  // Filter data by date range and area
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.is_group) return false;
      if (selectedArea !== "all" && t.area !== selectedArea) return false;
      return true;
    });
  }, [tasks, selectedArea]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const workTasks = filteredTasks;
    
    const completedInRange = workTasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = parseISO(t.completed_at);
      return isWithinInterval(completedDate, { start, end });
    });

    const totalDueInRange = workTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = parseISO(t.due_date);
      return isWithinInterval(dueDate, { start, end });
    });

    const completionRate = totalDueInRange.length > 0
      ? Math.round((completedInRange.length / totalDueInRange.length) * 100)
      : 100;

    // ATP metrics
    const atpTests = areaSignOffs.filter(s => {
      if (!s.atp_tested_at || !s.atp_test_result || s.atp_test_result === "not_required") return false;
      const testedDate = parseISO(s.atp_tested_at);
      return isWithinInterval(testedDate, { start, end });
    });
    const atpPassed = atpTests.filter(s => s.atp_test_result === "pass").length;
    const atpPassRate = atpTests.length > 0 ? Math.round((atpPassed / atpTests.length) * 100) : 100;

    // Training coverage
    const activeEmployees = employees.filter(e => e.status === "active");
    const requiredTrainings = trainingDocuments.length * activeEmployees.length;
    const completedTrainings = employeeTrainings.length;
    const trainingCoverage = requiredTrainings > 0
      ? Math.round((completedTrainings / requiredTrainings) * 100)
      : 100;

    // Competency
    const competentEmployees = competencyEvaluations.filter(e => 
      e.status === "competent" || e.result === "pass"
    ).length;

    // Verification rate
    const verifiedTasks = completedInRange.filter(t => t.status === "verified").length;
    const verificationRate = completedInRange.length > 0
      ? Math.round((verifiedTasks / completedInRange.length) * 100)
      : 100;

    // Health score
    const healthScore = Math.round(
      (completionRate * 0.3) +
      (atpPassRate * 0.25) +
      (trainingCoverage * 0.2) +
      (verificationRate * 0.15) +
      ((competentEmployees / Math.max(1, activeEmployees.length)) * 100 * 0.1)
    );

    return {
      healthScore,
      completionRate,
      completedTasks: completedInRange.length,
      totalTasks: totalDueInRange.length,
      atpPassRate,
      atpTests: atpTests.length,
      trainingCoverage,
      competentEmployees,
      activeEmployees: activeEmployees.length,
      verificationRate,
      verifiedTasks
    };
  }, [filteredTasks, areaSignOffs, employees, employeeTrainings, trainingDocuments, competencyEvaluations, start, end]);

  // Guided navigation steps
  const guidedSteps = [
    { id: "overview", label: "Program Overview", icon: Shield, description: "Start with the overall health score and key metrics" },
    { id: "completion", label: "MSS Completion History", icon: ClipboardCheck, description: "Review task completion records and compliance" },
    { id: "training", label: "Training & Competency", icon: GraduationCap, description: "Verify employee qualifications and certifications" },
    { id: "assets", label: "Asset Records", icon: Droplets, description: "Inspect drain, diverter, and inventory records" },
    { id: "verification", label: "Verification Evidence", icon: CheckCircle2, description: "Review sign-offs, signatures, and ATP results" },
    { id: "effectiveness", label: "Effectiveness Summary", icon: Target, description: "Closed-loop improvements and trend analysis" }
  ];

  const currentStepIndex = guidedSteps.findIndex(s => s.id === activeSection);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Audit Mode</h1>
                <Badge variant="default" className="bg-emerald-500 text-white">Read-Only</Badge>
              </div>
              <p className="text-slate-300 mt-1">
                Secure, structured view for auditors and external reviewers
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* @ts-ignore */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="All Areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area.id} value={area.name}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <QuickStat 
            label="Health Score" 
            value={summaryMetrics.healthScore} 
            suffix="/100"
            status={summaryMetrics.healthScore >= 85 ? "good" : summaryMetrics.healthScore >= 70 ? "warning" : "alert"}
          />
          <QuickStat 
            label="Task Completion" 
            value={summaryMetrics.completionRate} 
            suffix="%"
            status={summaryMetrics.completionRate >= 90 ? "good" : "warning"}
          />
          <QuickStat 
            label="ATP Pass Rate" 
            value={summaryMetrics.atpPassRate} 
            suffix="%"
            status={summaryMetrics.atpPassRate >= 95 ? "good" : "warning"}
          />
          <QuickStat 
            label="Training Coverage" 
            value={summaryMetrics.trainingCoverage} 
            suffix="%"
            status={summaryMetrics.trainingCoverage >= 90 ? "good" : "warning"}
          />
          <QuickStat 
            label="Verification Rate" 
            value={summaryMetrics.verificationRate} 
            suffix="%"
            status={summaryMetrics.verificationRate >= 80 ? "good" : "warning"}
          />
        </div>
      </div>

      {/* Guided Navigation */}
      {guidedMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Guided Audit Review</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setGuidedMode(false)}
                className="text-blue-600"
              >
                Exit guided mode
              </Button>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {guidedSteps.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => setActiveSection(step.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all",
                    activeSection === step.id
                      ? "bg-blue-600 text-white"
                      : idx < currentStepIndex
                      ? "bg-blue-200 text-blue-800"
                      : "bg-white text-blue-700 hover:bg-blue-100"
                  )}
                >
                  <step.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{step.label}</span>
                  {idx < currentStepIndex && <CheckCircle2 className="w-4 h-4" />}
                </button>
              ))}
            </div>

            {currentStepIndex < guidedSteps.length - 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm text-blue-700">
                  {guidedSteps[currentStepIndex]?.description}
                </p>
                <Button 
                  size="sm"
                  onClick={() => setActiveSection(guidedSteps[currentStepIndex + 1].id)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next: {guidedSteps[currentStepIndex + 1]?.label}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        {!guidedMode && (
          <TabsList className="bg-white border shadow-sm flex-wrap h-auto p-1">
            <TabsTrigger value="overview">
              <Shield className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="completion">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Completion Records
            </TabsTrigger>
            <TabsTrigger value="training">
              <GraduationCap className="w-4 h-4 mr-2" />
              Training
            </TabsTrigger>
            <TabsTrigger value="assets">
              <Droplets className="w-4 h-4 mr-2" />
              Asset Records
            </TabsTrigger>
            <TabsTrigger value="verification">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Verification
            </TabsTrigger>
            <TabsTrigger value="effectiveness">
              <Target className="w-4 h-4 mr-2" />
              Effectiveness
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="overview" className="mt-6">
          <AuditHealthScoreSection 
            metrics={summaryMetrics}
            dateRange={{ start, end, label: dateRange }}
            tasks={filteredTasks}
            areaSignOffs={areaSignOffs}
          />
        </TabsContent>

        <TabsContent value="completion" className="mt-6">
          <AuditCompletionRecords
            tasks={filteredTasks}
            employees={employees}
            dateRange={{ start, end }}
            selectedArea={selectedArea}
          />
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <AuditTrainingSection
            employees={employees}
            employeeTrainings={employeeTrainings}
            trainingDocuments={trainingDocuments}
            competencyEvaluations={competencyEvaluations}
            dateRange={{ start, end }}
          />
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          <AuditAssetRecords
            drainLocations={drainLocations}
            drainCleaningRecords={drainCleaningRecords}
            rainDiverters={rainDiverters}
            diverterInspections={diverterInspections}
            chemicalInventoryRecords={chemicalInventoryRecords}
            chemicalCountEntries={chemicalCountEntries}
            dateRange={{ start, end }}
          />
        </TabsContent>

        <TabsContent value="verification" className="mt-6">
          <AuditVerificationSection
            tasks={filteredTasks}
            areaSignOffs={areaSignOffs}
            employees={employees}
            assets={assets}
            dateRange={{ start, end }}
          />
        </TabsContent>

        <TabsContent value="effectiveness" className="mt-6">
          <AuditEffectivenessSection
            tasks={filteredTasks}
            areaSignOffs={areaSignOffs}
            drainCleaningRecords={drainCleaningRecords}
            diverterInspections={diverterInspections}
            competencyEvaluations={competencyEvaluations}
            dateRange={{ start, end }}
          />
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Lock className="w-4 h-4" />
              <span>Audit Mode • Read-Only Access • All records are immutable with timestamps</span>
            </div>
            <div className="text-xs text-slate-500">
              Report generated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickStat({ label, value, suffix = "", status = "neutral" }) {
  const statusColors = {
    good: "text-emerald-400",
    warning: "text-amber-400",
    alert: "text-rose-400",
    neutral: "text-white"
  };

  return (
    <div className="bg-white/10 rounded-lg p-3">
      <p className="text-xs text-slate-300 mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", statusColors[status])}>
        {value}{suffix}
      </p>
    </div>
  );
}