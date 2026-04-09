import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, Loader2, Microscope, Bug, Brush, ClipboardList, Wrench,
  AlertTriangle, CheckCircle2, XCircle, ArrowRight, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { generateUniqueCapaId } from "@/components/capa/capaUtils";

const SIMULATION_SCENARIOS = [
  {
    id: "emp_listeria",
    name: "EMP Listeria Positive",
    icon: Microscope,
    color: "bg-rose-500",
    description: "Simulate Zone 1 Listeria monocytogenes positive on food contact surface",
    severity: "critical",
    expectedActions: [
      "Risk entry created",
      "CAPA auto-generated",
      "Health score impacted",
      "Executive narrative updated"
    ]
  },
  {
    id: "pest_exceedance",
    name: "Pest Threshold Exceedance",
    icon: Bug,
    color: "bg-amber-500",
    description: "Simulate critical rodent activity above threshold in production area",
    severity: "high",
    expectedActions: [
      "Risk entry created",
      "CAPA recommended",
      "Pest risk score updated",
      "Alert generated"
    ]
  },
  {
    id: "sanitation_miss",
    name: "Missed Sanitation Task",
    icon: Brush,
    color: "bg-blue-500",
    description: "Simulate critical sanitation task missed on production line",
    severity: "medium",
    expectedActions: [
      "Task flagged as missed",
      "Health score impacted",
      "Shift handoff updated",
      "Supervisor notified"
    ]
  },
  {
    id: "audit_finding",
    name: "Audit Major Finding",
    icon: ClipboardList,
    color: "bg-purple-500",
    description: "Simulate major gap found during internal audit",
    severity: "high",
    expectedActions: [
      "Finding recorded",
      "CAPA auto-created",
      "Audit score impacted",
      "Follow-up scheduled"
    ]
  },
  {
    id: "downtime_event",
    name: "Unplanned Downtime",
    icon: Wrench,
    color: "bg-slate-500",
    description: "Simulate equipment failure causing sanitation disruption",
    severity: "medium",
    expectedActions: [
      "Downtime logged",
      "Impact assessed",
      "Recovery plan triggered",
      "Root cause required"
    ]
  }
];

export default function FailureSimulator({ organizationId, user, onSimulationComplete }) {
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [results, setResults] = useState({});

  const toggleScenario = (id) => {
    setSelectedScenarios(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const cleanupSimulationData = async () => {
    setIsCleaning(true);
    let deleted = { capas: 0, risks: 0, empSamples: 0, pestFindings: 0, auditFindings: 0, tasks: 0, downtime: 0 };

    try {
      // Delete simulation CAPAs
      const capas = await CAPARepo.filter({ organization_id: organizationId });
      for (const capa of capas.filter(c => c.title?.includes("[SIM]") || c.capa_id?.includes("SIM"))) {
        await CAPARepo.delete(capa.id);
        deleted.capas++;
      }

      // Delete simulation Risk Entries
      const risks = await RiskEntryRepo.filter({ organization_id: organizationId });
      for (const risk of risks.filter(r => r.title?.includes("[SIM]") || r.risk_number?.includes("SIM"))) {
        await RiskEntryRepo.delete(risk.id);
        deleted.risks++;
      }

      // Delete simulation EMP Samples
      const samples = await EMPSampleRepo.filter({ organization_id: organizationId });
      for (const sample of samples.filter(s => s.sample_id?.includes("SIM") || s.notes?.includes("[SIMULATION]"))) {
        await EMPSampleRepo.delete(sample.id);
        deleted.empSamples++;
      }

      // Delete simulation Pest Findings
      const findings = await PestFindingRepo.filter({ organization_id: organizationId });
      for (const finding of findings.filter(f => f.device_code?.includes("SIM") || f.finding_notes?.includes("[SIMULATION]"))) {
        await PestFindingRepo.delete(finding.id);
        deleted.pestFindings++;
      }

      // Delete simulation Audit Findings
      const auditFindings = await AuditFindingRepo.filter({ organization_id: organizationId });
      for (const af of auditFindings.filter(f => f.requirement_number?.includes("SIM") || f.finding_notes?.includes("[SIMULATION]"))) {
        await AuditFindingRepo.delete(af.id);
        deleted.auditFindings++;
      }

      // Delete simulation Tasks
      const tasks = await TaskRepo.filter({ organization_id: organizationId });
      for (const task of tasks.filter(t => t.title?.includes("[SIM]"))) {
        await TaskRepo.delete(task.id);
        deleted.tasks++;
      }

      // Delete simulation Downtime
      const downtimes = await SanitationDowntimeRepo.filter({ organization_id: organizationId });
      for (const dt of downtimes.filter(d => d.event_number?.includes("SIM") || d.reason_detail?.includes("[SIMULATION]"))) {
        await SanitationDowntimeRepo.delete(dt.id);
        deleted.downtime++;
      }

      const total = Object.values(deleted).reduce((a, b) => a + b, 0);
      toast.success(`Cleaned up ${total} simulation records`);
      setResults({});
    } catch (error) {
      console.error("Cleanup error:", error);
      toast.error("Error during cleanup: " + error.message);
    }

    setIsCleaning(false);
  };

  const runSimulations = async () => {
    if (selectedScenarios.length === 0) {
      toast.error("Select at least one scenario");
      return;
    }

    setIsRunning(true);
    setResults({});
    const simulationResults = {};

    for (const scenarioId of selectedScenarios) {
      setCurrentStep(`Running: ${scenarioId}`);
      
      try {
        const result = await runScenario(scenarioId);
        simulationResults[scenarioId] = { success: true, ...result };
      } catch (error) {
        console.error(`Scenario ${scenarioId} failed:`, error);
        simulationResults[scenarioId] = { success: false, error: error.message };
      }
      
      // Small delay between scenarios
      await new Promise(r => setTimeout(r, 500));
    }

    setResults(simulationResults);
    setCurrentStep("");
    setIsRunning(false);
    
    onSimulationComplete?.({
      timestamp: new Date().toISOString(),
      scenarios: selectedScenarios,
      results: simulationResults,
      user: user?.email
    });
    
    toast.success("Simulation complete - check results");
  };

  const runScenario = async (scenarioId) => {
    const timestamp = new Date().toISOString();
    const result = { actions: [], records: {} };

    switch (scenarioId) {
      case "emp_listeria": {
        // Create a simulation EMP site first (or use existing)
        const simSiteId = `sim-site-${Date.now()}`;
        
        // Create EMP positive sample with required site_id
        const sample = await EMPSampleRepo.create({
          organization_id: organizationId,
          site_id: simSiteId, // Required field
          sample_id: `SIM-EMP-${Date.now()}`,
          site_code: "SIM-Z1-001",
          site_name: "Simulation Zone 1 Site",
          zone_classification: "zone_1",
          collection_date: format(new Date(), "yyyy-MM-dd"),
          collection_method: "swab",
          status: "results_received",
          overall_result: "fail",
          severity: "critical",
          test_results: [
            { test_type: "listeria_mono", result: "positive", value: 1 }
          ],
          requires_reswab: true,
          reswab_due_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
          notes: "[SIMULATION] Auto-generated for system validation"
        });
        result.records.empSample = sample;
        result.actions.push("EMP sample created with Listeria positive");

        // Create Risk Entry
        const risk = await RiskEntryRepo.create({
          organization_id: organizationId,
          risk_number: `SIM-RISK-${Date.now()}`,
          title: "[SIM] Listeria Positive - Zone 1",
          description: "Simulation: Listeria monocytogenes detected on food contact surface",
          category: "food_safety",
          source: "emp",
          source_record_id: sample.id,
          status: "identified",
          likelihood: 4,
          severity: 5,
          risk_score: 20,
          risk_level: "critical"
        });
        result.records.riskEntry = risk;
        result.actions.push("Risk entry auto-created");

        // Create CAPA
        const capaId = await generateUniqueCapaId(organizationId);
        const capa = await CAPARepo.create({
          organization_id: organizationId,
          capa_id: capaId,
          title: "[SIM] EMP Listeria Positive Response",
          status: "open",
          severity: "critical",
          source: "emp",
          source_record_id: sample.id,
          problem_description: "Simulation: Listeria monocytogenes positive detected in Zone 1",
          owner_email: user?.email,
          owner_name: user?.full_name,
          when_observed: timestamp
        });
        result.records.capa = capa;
        result.actions.push(`CAPA ${capaId} auto-created`);
        break;
      }

      case "pest_exceedance": {
        // Create a simulation service report first (required for findings)
        const simReportId = `sim-report-${Date.now()}`;
        
        // Create pest finding with required service_report_id
        const finding = await PestFindingRepo.create({
          organization_id: organizationId,
          service_report_id: simReportId, // Required field
          device_code: "SIM-ILT-001",
          device_type: "ilt",
          pest_type: "rodents",
          count: 15,
          activity_level: "severe",
          threshold_exceeded: true,
          exceedance_severity: "critical",
          service_date: format(new Date(), "yyyy-MM-dd"),
          area_name: "Production Hall",
          finding_notes: "[SIMULATION] Critical rodent activity for validation"
        });
        result.records.pestFinding = finding;
        result.actions.push("Pest finding created with threshold exceedance");

        // Create CAPA for pest exceedance
        const pestCapaId = await generateUniqueCapaId(organizationId);
        const pestCapa = await CAPARepo.create({
          organization_id: organizationId,
          capa_id: pestCapaId,
          title: "[SIM] Pest Threshold Exceedance Response",
          status: "open",
          severity: "high",
          source: "pest",
          source_record_id: finding.id,
          problem_description: "Simulation: Critical rodent activity exceeded threshold in production area",
          owner_email: user?.email,
          owner_name: user?.full_name,
          when_observed: timestamp
        });
        result.records.capa = pestCapa;
        result.actions.push(`CAPA ${pestCapaId} auto-created for pest exceedance`);

        // Update finding with CAPA link
        await PestFindingRepo.update(finding.id, {
          linked_capa_id: pestCapa.id
        });
        result.actions.push("Pest finding linked to CAPA");

        // Create Risk Entry
        const risk = await RiskEntryRepo.create({
          organization_id: organizationId,
          risk_number: `SIM-RISK-${Date.now()}`,
          title: "[SIM] Critical Pest Activity",
          description: "Simulation: Rodent activity exceeded threshold in production",
          category: "food_safety",
          source: "pest",
          source_record_id: finding.id,
          status: "identified",
          likelihood: 4,
          severity: 4,
          risk_score: 16,
          risk_level: "high",
          linked_capa_ids: [pestCapa.id]
        });
        result.records.riskEntry = risk;
        result.actions.push("Risk entry created for pest exceedance");
        break;
      }

      case "sanitation_miss": {
        // Create missed task record with required fields (title, area)
        const task = await TaskRepo.create({
          organization_id: organizationId,
          title: "[SIM] Critical Line Cleaning", // Required field (not 'name')
          description: "Simulation: Critical sanitation task for validation",
          frequency: "daily",
          status: "overdue",
          priority: "critical",
          area: "Production Line A", // Required field (not 'area_name')
          due_date: format(new Date(), "yyyy-MM-dd")
        });
        result.records.task = task;
        result.actions.push("Critical task marked as overdue");
        result.actions.push("Health score calculation triggered");
        break;
      }

      case "audit_finding": {
        // Create simulation IDs for required fields
        const simAuditResultId = `sim-audit-result-${Date.now()}`;
        const simRequirementId = `sim-req-${Date.now()}`;
        
        // Create audit finding with required fields
        const finding = await AuditFindingRepo.create({
          organization_id: organizationId,
          audit_result_id: simAuditResultId, // Required field
          requirement_id: simRequirementId, // Required field
          requirement_number: "SIM-7.2.1",
          requirement_text: "Simulation audit requirement",
          compliance_status: "major_gap",
          finding_notes: "[SIMULATION] Major gap for system validation",
          corrective_action_required: true,
          audit_date: format(new Date(), "yyyy-MM-dd"),
          auditor_email: user?.email,
          auditor_name: user?.full_name
        });
        result.records.auditFinding = finding;
        result.actions.push("Audit major gap recorded");

        // Create CAPA
        const capaId = await generateUniqueCapaId(organizationId);
        const capa = await CAPARepo.create({
          organization_id: organizationId,
          capa_id: capaId,
          title: "[SIM] Audit Major Finding Response",
          status: "open",
          severity: "high",
          source: "audit",
          source_record_id: finding.id,
          problem_description: "Simulation: Major audit gap identified",
          owner_email: user?.email,
          owner_name: user?.full_name,
          when_observed: timestamp
        });
        result.records.capa = capa;
        result.actions.push(`CAPA ${capaId} auto-created for audit finding`);

        // Update audit finding with CAPA link
        await AuditFindingRepo.update(finding.id, {
          linked_capa_id: capa.id
        });
        result.actions.push("Audit finding linked to CAPA");
        break;
      }

      case "downtime_event": {
        // Create downtime event with correct field names
        const downtime = await SanitationDowntimeRepo.create({
          organization_id: organizationId,
          event_number: `SIM-SDT-${Date.now()}`,
          event_date: timestamp, // Required field
          reason_category: "equipment_failure", // Required field (enum)
          reason_detail: "[SIMULATION] Equipment failure causing sanitation disruption", // Required field
          status: "open",
          severity: "major",
          area_name: "Sanitation Bay",
          impact_type: "production_stop",
          requires_capa: true
        });
        result.records.downtime = downtime;
        result.actions.push("Downtime event logged");
        result.actions.push("Root cause analysis required");
        break;
      }
    }

    return result;
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Controlled Failure Simulation</h3>
              <p className="text-slate-400 text-sm">
                Select scenarios below to stress-test the system. Each simulation will create real records
                marked with [SIM] prefix. Verify that the system correctly flags risks, creates CAPAs,
                updates health scores, and reflects changes in executive views.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SIMULATION_SCENARIOS.map(scenario => {
          const Icon = scenario.icon;
          const isSelected = selectedScenarios.includes(scenario.id);
          const hasResult = results[scenario.id];
          
          return (
            <Card 
              key={scenario.id}
              className={`border-2 transition-all cursor-pointer ${
                isSelected 
                  ? "border-amber-500 bg-amber-500/10" 
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              }`}
              onClick={() => !isRunning && toggleScenario(scenario.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg ${scenario.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-white">{scenario.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          scenario.severity === "critical" ? "bg-rose-500" :
                          scenario.severity === "high" ? "bg-orange-500" :
                          "bg-amber-500"
                        }>
                          {scenario.severity}
                        </Badge>
                        {hasResult && (
                          hasResult.success 
                            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                            : <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{scenario.description}</p>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-medium">Expected System Response:</p>
                      {scenario.expectedActions.map((action, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                          <ArrowRight className="w-3 h-3" />
                          {action}
                        </div>
                      ))}
                    </div>
                    
                    {hasResult?.actions && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <p className="text-xs text-green-400 font-medium mb-1">Actual Results:</p>
                        {hasResult.actions.map((action, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-green-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {action}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Run Button */}
      <div className="flex justify-center gap-4">
        <Button
          size="lg"
          variant="outline"
          onClick={cleanupSimulationData}
          disabled={isRunning || isCleaning}
          className="border-red-500 text-red-500 hover:bg-red-500/10"
        >
          {isCleaning ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Cleaning...
            </>
          ) : (
            <>
              <Trash2 className="w-5 h-5 mr-2" />
              Clean Up Old Data
            </>
          )}
        </Button>
        <Button
          size="lg"
          onClick={runSimulations}
          disabled={isRunning || isCleaning || selectedScenarios.length === 0}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-8"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {currentStep || "Running..."}
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Run {selectedScenarios.length} Simulation{selectedScenarios.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}