// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  FlaskConical, Users, AlertTriangle, TrendingUp, TrendingDown,
  Shield, Target, Clock, CheckCircle2,
  Loader2, RefreshCw, Play, BarChart3, Minus, Plus, FileWarning, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaSignOffRepo, CompetencyEvaluationRepo, DrainLocationRepo, EmployeeRepo, RainDiverterRepo, TaskRepo } from "@/lib/adapters/database";

const SCENARIO_TYPES = {
  staffing: { label: "Staffing Changes", icon: Users, color: "blue" },
  quota: { label: "Quota Adjustments", icon: Target, color: "purple" },
  deferral: { label: "Task Deferral", icon: Clock, color: "amber" },
  frequency: { label: "Frequency Changes", icon: RefreshCw, color: "emerald" },
  workorder: { label: "Work Order Delays", icon: FileWarning, color: "rose" }
};

export default function ScenarioSimulator({ organizationId, initialScenario = null, onClose }) {
  const [activeScenario, setActiveScenario] = useState(initialScenario?.type || "staffing");
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState(null);
  
  // Scenario parameters
  const [staffingChange, setStaffingChange] = useState(0);
  const [quotaChange, setQuotaChange] = useState({ daily: 0, weekly: 0, monthly: 0 });
  const [deferredTasks, setDeferredTasks] = useState([]);
  const [deferralDays, setDeferralDays] = useState(7);
  const [frequencyChanges, setFrequencyChanges] = useState({});
  const [workOrderDelay, setWorkOrderDelay] = useState(0);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Load data
  const { data: tasks = [] } = useQuery({
    queryKey: ["sim_tasks", organizationId],
    queryFn: () => TaskRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["sim_employees", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: drainLocations = [] } = useQuery({
    queryKey: ["sim_drains", organizationId],
    queryFn: () => DrainLocationRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: rainDiverters = [] } = useQuery({
    queryKey: ["sim_diverters", organizationId],
    queryFn: () => RainDiverterRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: areaSignOffs = [] } = useQuery({
    queryKey: ["sim_signoffs", organizationId],
    queryFn: () => AreaSignOffRepo.filter({ organization_id: organizationId }, "-signed_off_at", 200),
    enabled: !!organizationId
  });

  const { data: competencyEvaluations = [] } = useQuery({
    queryKey: ["sim_competency", organizationId],
    queryFn: () => CompetencyEvaluationRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Calculate current baseline metrics
  const calculateBaseline = () => {
    const now = new Date();
    const workTasks = tasks.filter(t => !t.is_group);
    
    // MSS Completion
    const completedTasks = workTasks.filter(t => t.status === "completed" || t.status === "verified").length;
    const mssCompletion = workTasks.length > 0 ? (completedTasks / workTasks.length) * 100 : 100;
    
    // Overdue tasks
    const overdueTasks = workTasks.filter(t => {
      if (t.status === "completed" || t.status === "verified") return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < now;
    }).length;
    
    // ATP pass rate
    const atpTests = areaSignOffs.filter(s => s.atp_test_result && s.atp_test_result !== "not_required");
    const atpPassed = atpTests.filter(s => s.atp_test_result === "pass").length;
    const atpPassRate = atpTests.length > 0 ? (atpPassed / atpTests.length) * 100 : 100;
    
    // Drain compliance
    const activeDrains = drainLocations.filter(d => d.status === "active" && !d.is_sealed);
    const overdueDrains = activeDrains.filter(d => {
      if (!d.next_due_date) return false;
      return new Date(d.next_due_date) < now;
    }).length;
    const drainCompliance = activeDrains.length > 0 ? ((activeDrains.length - overdueDrains) / activeDrains.length) * 100 : 100;
    
    // Diverter compliance
    const activeDiverters = rainDiverters.filter(d => d.status === "active");
    const wetDiverters = activeDiverters.filter(d => d.last_finding === "wet").length;
    const diverterCompliance = activeDiverters.length > 0 ? ((activeDiverters.length - wetDiverters) / activeDiverters.length) * 100 : 100;
    
    // Competency coverage
    const competentEvals = competencyEvaluations.filter(e => e.status === "competent").length;
    const competencyRate = competencyEvaluations.length > 0 ? (competentEvals / competencyEvaluations.length) * 100 : 100;
    
    // Workload per employee
    const avgWorkload = employees.length > 0 
      ? workTasks.filter(t => t.assigned_to).length / employees.length 
      : 0;
    
    // Calculate health score (weighted average)
    const healthScore = Math.round(
      (mssCompletion * 0.3) +
      (atpPassRate * 0.2) +
      (drainCompliance * 0.15) +
      (diverterCompliance * 0.15) +
      (competencyRate * 0.1) +
      (Math.max(0, 100 - overdueTasks * 5) * 0.1)
    );
    
    return {
      mssCompletion: Math.round(mssCompletion),
      healthScore,
      overdueTasks,
      atpPassRate: Math.round(atpPassRate),
      drainCompliance: Math.round(drainCompliance),
      diverterCompliance: Math.round(diverterCompliance),
      competencyRate: Math.round(competencyRate),
      avgWorkload: Math.round(avgWorkload * 10) / 10,
      totalTasks: workTasks.length,
      activeEmployees: employees.length,
      auditRisk: overdueTasks > 5 ? "high" : overdueTasks > 2 ? "medium" : "low"
    };
  };

  // Simulate scenario impact
  const runSimulation = async () => {
    setIsSimulating(true);
    
    const baseline = calculateBaseline();
    let simulated = { ...baseline };
    let impacts = [];
    let risks = [];
    let recommendations = [];
    
    // Staffing change simulation
    if (activeScenario === "staffing" && staffingChange !== 0) {
      const newEmployeeCount = Math.max(1, baseline.activeEmployees + staffingChange);
      const workloadMultiplier = baseline.activeEmployees / newEmployeeCount;
      
      simulated.activeEmployees = newEmployeeCount;
      simulated.avgWorkload = Math.round(baseline.avgWorkload * workloadMultiplier * 10) / 10;
      
      if (staffingChange < 0) {
        // Reduced staff
        const capacityReduction = Math.abs(staffingChange) / baseline.activeEmployees;
        simulated.mssCompletion = Math.max(0, Math.round(baseline.mssCompletion * (1 - capacityReduction * 0.5)));
        simulated.overdueTasks = Math.round(baseline.overdueTasks * (1 + capacityReduction));
        simulated.healthScore = Math.max(0, Math.round(baseline.healthScore - capacityReduction * 20));
        
        impacts.push({
          type: "negative",
          metric: "Workload",
          change: `+${Math.round((workloadMultiplier - 1) * 100)}%`,
          description: `Average workload increases to ${simulated.avgWorkload} tasks per employee`
        });
        
        if (simulated.avgWorkload > 10) {
          risks.push({
            severity: "high",
            title: "Burnout Risk",
            description: "Workload exceeds sustainable levels, increasing error probability"
          });
        }
        
        recommendations.push("Consider cross-training remaining staff for coverage");
        recommendations.push("Prioritize critical tasks and defer non-essential work");
      } else {
        // Additional staff
        simulated.mssCompletion = Math.min(100, Math.round(baseline.mssCompletion + staffingChange * 3));
        simulated.overdueTasks = Math.max(0, Math.round(baseline.overdueTasks * 0.8));
        simulated.healthScore = Math.min(100, Math.round(baseline.healthScore + staffingChange * 2));
        
        impacts.push({
          type: "positive",
          metric: "Capacity",
          change: `+${staffingChange} employees`,
          description: "Additional capacity allows faster task completion"
        });
        
        recommendations.push("Assign new staff to areas with highest backlog");
        recommendations.push("Ensure training completion before independent work");
      }
    }
    
    // Quota change simulation
    if (activeScenario === "quota") {
      const totalQuotaChange = quotaChange.daily + quotaChange.weekly + quotaChange.monthly;
      
      if (totalQuotaChange > 0) {
        const workloadIncrease = totalQuotaChange * 0.1;
        simulated.avgWorkload = Math.round((baseline.avgWorkload + workloadIncrease) * 10) / 10;
        simulated.mssCompletion = Math.min(100, Math.round(baseline.mssCompletion + totalQuotaChange * 2));
        simulated.healthScore = Math.min(100, Math.round(baseline.healthScore + totalQuotaChange));
        
        impacts.push({
          type: "positive",
          metric: "MSS Coverage",
          change: `+${totalQuotaChange * 2}%`,
          description: "Higher quotas increase completion probability"
        });
        
        if (simulated.avgWorkload > 12) {
          risks.push({
            severity: "medium",
            title: "Capacity Strain",
            description: "Quota increase may exceed available capacity"
          });
        }
      } else if (totalQuotaChange < 0) {
        simulated.mssCompletion = Math.max(0, Math.round(baseline.mssCompletion + totalQuotaChange * 3));
        simulated.overdueTasks = Math.round(baseline.overdueTasks * (1 - totalQuotaChange * 0.1));
        simulated.healthScore = Math.max(0, Math.round(baseline.healthScore + totalQuotaChange * 2));
        
        impacts.push({
          type: "negative",
          metric: "MSS Coverage",
          change: `${totalQuotaChange * 3}%`,
          description: "Lower quotas reduce task completion probability"
        });
        
        risks.push({
          severity: "medium",
          title: "Audit Exposure",
          description: "Reduced quotas may leave gaps in sanitation schedule"
        });
      }
    }
    
    // Task deferral simulation
    if (activeScenario === "deferral" && deferredTasks.length > 0) {
      const deferralImpact = deferredTasks.length * 2;
      const criticalDeferred = deferredTasks.filter(id => {
        const task = tasks.find(t => t.id === id);
        return task?.priority === "critical" || task?.priority === "high";
      }).length;
      
      simulated.mssCompletion = Math.max(0, Math.round(baseline.mssCompletion - deferralImpact));
      simulated.overdueTasks = baseline.overdueTasks + deferredTasks.length;
      simulated.healthScore = Math.max(0, Math.round(baseline.healthScore - deferralImpact - criticalDeferred * 3));
      
      if (criticalDeferred > 0) {
        simulated.auditRisk = "high";
        risks.push({
          severity: "high",
          title: "Critical Task Deferral",
          description: `${criticalDeferred} high-priority tasks being deferred increases food safety risk`
        });
      }
      
      impacts.push({
        type: "negative",
        metric: "Backlog",
        change: `+${deferredTasks.length} tasks`,
        description: `${deferredTasks.length} tasks deferred by ${deferralDays} days`
      });
      
      recommendations.push(`Ensure deferred tasks are completed within ${deferralDays} days`);
      recommendations.push("Document deferral reason for audit trail");
    }
    
    // Frequency change simulation
    if (activeScenario === "frequency" && Object.keys(frequencyChanges).length > 0) {
      let complianceImpact = 0;
      
      Object.entries(frequencyChanges).forEach(([assetType, change]) => {
        if (change === "reduced") {
          complianceImpact -= 5;
          risks.push({
            severity: "medium",
            title: `Reduced ${assetType} Frequency`,
            description: `Less frequent ${assetType} maintenance may increase contamination risk`
          });
        } else if (change === "increased") {
          complianceImpact += 3;
        }
      });
      
      simulated.healthScore = Math.max(0, Math.min(100, baseline.healthScore + complianceImpact));
      
      if (frequencyChanges.drains === "reduced") {
        simulated.drainCompliance = Math.max(0, baseline.drainCompliance - 15);
      }
      if (frequencyChanges.diverters === "reduced") {
        simulated.diverterCompliance = Math.max(0, baseline.diverterCompliance - 10);
      }
      
      impacts.push({
        type: complianceImpact >= 0 ? "positive" : "negative",
        metric: "Compliance",
        change: `${complianceImpact >= 0 ? "+" : ""}${complianceImpact}%`,
        description: "Frequency changes affect maintenance compliance"
      });
    }
    
    // Work order delay simulation
    if (activeScenario === "workorder" && workOrderDelay > 0) {
      const delayImpact = Math.min(20, workOrderDelay * 2);
      
      simulated.healthScore = Math.max(0, baseline.healthScore - delayImpact);
      simulated.diverterCompliance = Math.max(0, baseline.diverterCompliance - workOrderDelay * 3);
      
      if (workOrderDelay > 7) {
        simulated.auditRisk = "high";
        risks.push({
          severity: "high",
          title: "Extended Work Order Delay",
          description: `${workOrderDelay}-day delay exceeds recommended response time`
        });
      }
      
      impacts.push({
        type: "negative",
        metric: "Diverter Compliance",
        change: `-${workOrderDelay * 3}%`,
        description: `Work order delays affect leak containment effectiveness`
      });
      
      recommendations.push("Escalate work order to maintenance supervisor");
      recommendations.push("Implement temporary containment measures");
    }
    
    // Calculate audit risk
    if (simulated.overdueTasks > 5 || simulated.healthScore < 70) {
      simulated.auditRisk = "high";
    } else if (simulated.overdueTasks > 2 || simulated.healthScore < 85) {
      simulated.auditRisk = "medium";
    } else {
      simulated.auditRisk = "low";
    }
    
    // Add delay for realism
    await new Promise(r => setTimeout(r, 1000));
    
    setResults({
      baseline,
      simulated,
      impacts,
      risks,
      recommendations,
      scenarioType: activeScenario,
      timestamp: new Date().toISOString()
    });
    
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setResults(null);
    setStaffingChange(0);
    setQuotaChange({ daily: 0, weekly: 0, monthly: 0 });
    setDeferredTasks([]);
    setDeferralDays(7);
    setFrequencyChanges({});
    setWorkOrderDelay(0);
  };

  const baseline = calculateBaseline();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100">
            <FlaskConical className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Scenario Simulation</h2>
            <p className="text-sm text-slate-500">Test operational decisions before implementing them</p>
          </div>
        </div>
        {results && (
          <Button variant="outline" onClick={resetSimulation}>
            <RefreshCw className="w-4 h-4 mr-2" />
            New Simulation
          </Button>
        )}
      </div>

      {/* Current Baseline */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Current State Baseline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{baseline.healthScore}</p>
              <p className="text-xs text-slate-500">Health Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{baseline.mssCompletion}%</p>
              <p className="text-xs text-slate-500">MSS Completion</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-rose-600">{baseline.overdueTasks}</p>
              <p className="text-xs text-slate-500">Overdue Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{baseline.activeEmployees}</p>
              <p className="text-xs text-slate-500">Active Staff</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{baseline.avgWorkload}</p>
              <p className="text-xs text-slate-500">Avg Workload</p>
            </div>
            <div className="text-center">
              <Badge className={cn(
                baseline.auditRisk === "high" ? "bg-rose-100 text-rose-700" :
                baseline.auditRisk === "medium" ? "bg-amber-100 text-amber-700" :
                "bg-emerald-100 text-emerald-700"
              )}>
                {baseline.auditRisk} risk
              </Badge>
              <p className="text-xs text-slate-500 mt-1">Audit Risk</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!results ? (
        <>
          {/* Scenario Selection */}
          <Tabs value={activeScenario} onValueChange={setActiveScenario}>
            <TabsList className="grid grid-cols-5 w-full">
              {Object.entries(SCENARIO_TYPES).map(([key, config]) => (
                <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                  <config.icon className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Staffing Changes */}
            <TabsContent value="staffing" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Simulate Staffing Changes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Change in Active Employees</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setStaffingChange(Math.max(-baseline.activeEmployees + 1, staffingChange - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <div className="flex-1 text-center">
                        <span className={cn(
                          "text-3xl font-bold",
                          staffingChange > 0 ? "text-emerald-600" : staffingChange < 0 ? "text-rose-600" : "text-slate-900"
                        )}>
                          {staffingChange > 0 ? "+" : ""}{staffingChange}
                        </span>
                        <p className="text-sm text-slate-500 mt-1">
                          {baseline.activeEmployees + staffingChange} total employees
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setStaffingChange(staffingChange + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">
                      {staffingChange === 0 
                        ? "Adjust the slider to simulate adding or removing employees from the active roster."
                        : staffingChange > 0
                        ? `Simulating ${staffingChange} additional employee(s) joining the team.`
                        : `Simulating ${Math.abs(staffingChange)} employee(s) being unavailable (vacation, sick, terminated).`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quota Adjustments */}
            <TabsContent value="quota" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Simulate Quota Changes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {["daily", "weekly", "monthly"].map(freq => (
                    <div key={freq} className="flex items-center gap-4">
                      <Label className="w-24 capitalize">{freq}</Label>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setQuotaChange(prev => ({ ...prev, [freq]: prev[freq] - 1 }))}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className={cn(
                        "w-12 text-center font-bold",
                        quotaChange[freq] > 0 ? "text-emerald-600" : quotaChange[freq] < 0 ? "text-rose-600" : ""
                      )}>
                        {quotaChange[freq] > 0 ? "+" : ""}{quotaChange[freq]}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setQuotaChange(prev => ({ ...prev, [freq]: prev[freq] + 1 }))}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm text-slate-500">tasks per employee</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Task Deferral */}
            <TabsContent value="deferral" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Simulate Task Deferral
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Number of Tasks to Defer</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[deferredTasks.length]}
                        onValueChange={([val]) => {
                          const pendingTasks = tasks.filter(t => t.status === "pending" && !t.is_group);
                          setDeferredTasks(pendingTasks.slice(0, val).map(t => t.id));
                        }}
                        max={Math.min(20, tasks.filter(t => t.status === "pending" && !t.is_group).length)}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-bold">{deferredTasks.length}</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Deferral Period (days)</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[deferralDays]}
                        onValueChange={([val]) => setDeferralDays(val)}
                        min={1}
                        max={30}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-bold">{deferralDays}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Frequency Changes */}
            <TabsContent value="frequency" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Simulate Frequency Changes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: "drains", label: "Drain Cleaning", count: drainLocations.length },
                    { key: "diverters", label: "Diverter Inspections", count: rainDiverters.length },
                    { key: "chemicals", label: "Chemical Inventory", count: 1 }
                  ].map(asset => (
                    <div key={asset.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{asset.label}</p>
                        <p className="text-xs text-slate-500">{asset.count} assets</p>
                      </div>
                      <Select
                        value={frequencyChanges[asset.key] || "unchanged"}
                        onValueChange={(val) => setFrequencyChanges(prev => ({ ...prev, [asset.key]: val }))}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unchanged">No Change</SelectItem>
                          <SelectItem value="increased">Increase Frequency</SelectItem>
                          <SelectItem value="reduced">Reduce Frequency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Work Order Delays */}
            <TabsContent value="workorder" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileWarning className="w-5 h-5" />
                    Simulate Work Order Delays
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Work Order Delay (days)</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[workOrderDelay]}
                        onValueChange={([val]) => setWorkOrderDelay(val)}
                        min={0}
                        max={30}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-bold">{workOrderDelay}</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800">
                      This simulates what happens when maintenance work orders (e.g., roof leak repairs, equipment fixes) 
                      are delayed by {workOrderDelay} days.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Run Simulation Button */}
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={runSimulation}
              disabled={isSimulating}
              className="bg-indigo-600 hover:bg-indigo-700 px-8"
            >
              {isSimulating ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              Run Simulation
            </Button>
          </div>
        </>
      ) : (
        /* Results Display */
        <SimulationResults results={results} />
      )}
    </div>
  );
}

function SimulationResults({ results }) {
  const { baseline, simulated, impacts, risks, recommendations } = results;
  
  const getChangeIndicator = (current, previous) => {
    const diff = current - previous;
    if (diff > 0) return { icon: TrendingUp, color: "text-emerald-600", sign: "+" };
    if (diff < 0) return { icon: TrendingDown, color: "text-rose-600", sign: "" };
    return { icon: Minus, color: "text-slate-400", sign: "" };
  };

  return (
    <div className="space-y-6">
      {/* Comparison Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current State */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2 bg-slate-50">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Current State
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <MetricRow label="Health Score" value={baseline.healthScore} max={100} />
              <MetricRow label="MSS Completion" value={baseline.mssCompletion} max={100} suffix="%" />
              <MetricRow label="Overdue Tasks" value={baseline.overdueTasks} max={20} inverted />
              <MetricRow label="Avg Workload" value={baseline.avgWorkload} max={15} />
            </div>
          </CardContent>
        </Card>

        {/* Simulated State */}
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader className="pb-2 bg-indigo-100/50">
            <CardTitle className="text-sm font-medium text-indigo-700 flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Simulated State
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <MetricRow 
                label="Health Score" 
                value={simulated.healthScore} 
                max={100} 
                comparison={baseline.healthScore}
              />
              <MetricRow 
                label="MSS Completion" 
                value={simulated.mssCompletion} 
                max={100} 
                suffix="%" 
                comparison={baseline.mssCompletion}
              />
              <MetricRow 
                label="Overdue Tasks" 
                value={simulated.overdueTasks} 
                max={20} 
                inverted 
                comparison={baseline.overdueTasks}
              />
              <MetricRow 
                label="Avg Workload" 
                value={simulated.avgWorkload} 
                max={15} 
                comparison={baseline.avgWorkload}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Summary */}
      {impacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Impact Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {impacts.map((impact, idx) => (
                <div key={idx} className={cn(
                  "flex items-center gap-4 p-3 rounded-lg",
                  impact.type === "positive" ? "bg-emerald-50" : "bg-rose-50"
                )}>
                  {impact.type === "positive" ? (
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-rose-600" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{impact.metric}</span>
                      <Badge className={impact.type === "positive" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                        {impact.change}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{impact.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <Card className="border-rose-200">
          <CardHeader className="bg-rose-50">
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
              Identified Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {risks.map((risk, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-rose-50 rounded-lg">
                  <Badge className={cn(
                    risk.severity === "high" ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-700"
                  )}>
                    {risk.severity}
                  </Badge>
                  <div>
                    <p className="font-medium text-slate-900">{risk.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{risk.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-emerald-200">
          <CardHeader className="bg-emerald-50">
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <Shield className="w-5 h-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Plain Language Summary */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-indigo-100">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Summary</h3>
              <p className="text-slate-700">
                {simulated.healthScore >= baseline.healthScore ? (
                  <>
                    This scenario would <strong className="text-emerald-600">improve</strong> your 
                    Sanitation Health Score from {baseline.healthScore} to {simulated.healthScore}.
                  </>
                ) : (
                  <>
                    This scenario would <strong className="text-rose-600">reduce</strong> your 
                    Sanitation Health Score from {baseline.healthScore} to {simulated.healthScore}.
                  </>
                )}
                {" "}MSS completion probability would be {simulated.mssCompletion}%
                {simulated.mssCompletion !== baseline.mssCompletion && (
                  <> ({simulated.mssCompletion > baseline.mssCompletion ? "up" : "down"} from {baseline.mssCompletion}%)</>
                )}.
                {risks.length > 0 && (
                  <> <strong className="text-rose-600">{risks.length} risk(s)</strong> have been identified that require attention.</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({ label, value, max, suffix = "", inverted = false, comparison }) {
  const percentage = Math.min(100, (value / max) * 100);
  const diff = comparison !== undefined ? value - comparison : 0;
  
  const getColor = () => {
    if (inverted) {
      if (percentage > 50) return "bg-rose-500";
      if (percentage > 25) return "bg-amber-500";
      return "bg-emerald-500";
    }
    if (percentage >= 80) return "bg-emerald-500";
    if (percentage >= 60) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-slate-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold">{value}{suffix}</span>
          {diff !== 0 && (
            <span className={cn(
              "text-xs font-medium",
              (inverted ? diff < 0 : diff > 0) ? "text-emerald-600" : "text-rose-600"
            )}>
              ({diff > 0 ? "+" : ""}{diff})
            </span>
          )}
        </div>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}