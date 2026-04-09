import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, XCircle, RefreshCw, Loader2,
  Database, Activity
} from "lucide-react";
import { toast } from "sonner";

const HEALTH_CHECKS = [
  {
    id: "capa_linkage",
    name: "CAPA Source Linkage",
    description: "CAPAs are linked to source records (EMP, Pest, Audit)",
    check: (data) => {
      const linkedCapas = data.capas.filter(c => c.source_record_id);
      return {
        pass: linkedCapas.length >= data.capas.length * 0.5 || data.capas.length === 0,
        detail: `${linkedCapas.length}/${data.capas.length} CAPAs linked to source`
      };
    }
  },
  {
    id: "capa_owners",
    name: "CAPA Ownership",
    description: "All open CAPAs have assigned owners",
    check: (data) => {
      const openCapas = data.capas.filter(c => c.status !== "closed");
      const withOwners = openCapas.filter(c => c.owner_email);
      return {
        pass: withOwners.length === openCapas.length,
        detail: `${withOwners.length}/${openCapas.length} open CAPAs have owners`
      };
    }
  },
  {
    id: "capa_effectiveness",
    name: "CAPA Effectiveness Tracking",
    description: "Closed CAPAs have effectiveness criteria defined",
    check: (data) => {
      const closedCapas = data.capas.filter(c => c.status === "closed");
      const withCriteria = closedCapas.filter(c => c.effectiveness_criteria);
      return {
        pass: withCriteria.length >= closedCapas.length * 0.8 || closedCapas.length === 0,
        detail: `${withCriteria.length}/${closedCapas.length} closed CAPAs have effectiveness criteria`
      };
    }
  },
  {
    id: "risk_coverage",
    name: "Risk Register Coverage",
    description: "Critical issues have corresponding risk entries",
    check: (data) => {
      const criticalCapas = data.capas.filter(c => c.severity === "critical" || c.severity === "high");
      const hasRisks = data.riskEntries.length > 0;
      return {
        pass: hasRisks || criticalCapas.length === 0,
        detail: `${data.riskEntries.length} risk entries, ${criticalCapas.length} critical/high CAPAs`
      };
    }
  },
  {
    id: "emp_response",
    name: "EMP Positive Response",
    description: "EMP positives trigger appropriate response",
    check: (data) => {
      const positives = data.empSamples.filter(s => s.overall_result === "fail");
      const withResponse = positives.filter(s => s.linked_capa_id || s.requires_reswab);
      return {
        pass: withResponse.length >= positives.length * 0.9 || positives.length === 0,
        detail: `${withResponse.length}/${positives.length} positives have response actions`
      };
    }
  },
  {
    id: "pest_exceedance_response",
    name: "Pest Exceedance Response",
    description: "Pest threshold exceedances are addressed",
    check: (data) => {
      const exceedances = data.pestFindings.filter(f => f.threshold_exceeded);
      const critical = exceedances.filter(f => f.exceedance_severity === "critical");
      return {
        pass: critical.every(f => f.linked_capa_id) || critical.length === 0,
        detail: `${critical.length} critical exceedances, checking CAPA linkage`
      };
    }
  },
  {
    id: "audit_findings_response",
    name: "Audit Finding Response",
    description: "Major/critical audit findings have CAPAs",
    check: (data) => {
      const majorFindings = data.auditFindings.filter(f => 
        f.compliance_status === "major_gap" || f.compliance_status === "critical_gap"
      );
      const withCapa = majorFindings.filter(f => f.linked_capa_id);
      return {
        pass: withCapa.length >= majorFindings.length * 0.9 || majorFindings.length === 0,
        detail: `${withCapa.length}/${majorFindings.length} major findings have CAPAs`
      };
    }
  },
  {
    id: "overdue_capas",
    name: "CAPA Timeliness",
    description: "No critical/high CAPAs overdue",
    check: (data) => {
      const overdueCapas = data.capas.filter(c => {
        if (c.status === "closed") return false;
        if (!c.created_date) return false;
        const daysOpen = Math.floor((Date.now() - new Date(c.created_date)) / (1000 * 60 * 60 * 24));
        return (c.severity === "critical" && daysOpen > 7) || (c.severity === "high" && daysOpen > 14);
      });
      return {
        pass: overdueCapas.length === 0,
        detail: `${overdueCapas.length} overdue critical/high CAPAs`
      };
    }
  }
];

export default function SystemHealthCheck({ organizationId, capas, riskEntries, empSamples, pestFindings, auditFindings }) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  const runHealthCheck = () => {
    setIsRunning(true);
    
    const data = { capas, riskEntries, empSamples, pestFindings, auditFindings };
    const checkResults = {};
    
    HEALTH_CHECKS.forEach(check => {
      checkResults[check.id] = check.check(data);
    });
    
    setResults(checkResults);
    setIsRunning(false);
    
    const passCount = Object.values(checkResults).filter(r => r.pass).length;
    if (passCount === HEALTH_CHECKS.length) {
      toast.success("All health checks passed!");
    } else {
      toast.warning(`${passCount}/${HEALTH_CHECKS.length} checks passed`);
    }
  };

  const overallScore = useMemo(() => {
    if (!results) return null;
    const passed = Object.values(results).filter(r => r.pass).length;
    return Math.round((passed / HEALTH_CHECKS.length) * 100);
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">System Integrity Score</h3>
              <p className="text-sm text-slate-400">
                Validates that quality events are properly captured, linked, and tracked
              </p>
            </div>
            <div className="flex items-center gap-4">
              {overallScore !== null && (
                <div className={`text-5xl font-bold ${
                  overallScore >= 80 ? "text-green-500" :
                  overallScore >= 60 ? "text-amber-500" :
                  "text-rose-500"
                }`}>
                  {overallScore}%
                </div>
              )}
              <Button 
                onClick={runHealthCheck}
                disabled={isRunning}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Run Check
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Check Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HEALTH_CHECKS.map(check => {
          const result = results?.[check.id];
          
          return (
            <Card 
              key={check.id}
              className={`border-2 ${
                !result ? "bg-slate-800/50 border-slate-700" :
                result.pass ? "bg-green-900/20 border-green-700" :
                "bg-rose-900/20 border-rose-700"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    !result ? "bg-slate-700" :
                    result.pass ? "bg-green-600" : "bg-rose-600"
                  }`}>
                    {!result ? (
                      <Activity className="w-5 h-5 text-slate-400" />
                    ) : result.pass ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <XCircle className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{check.name}</h4>
                    <p className="text-sm text-slate-400 mt-1">{check.description}</p>
                    {result && (
                      <p className={`text-xs mt-2 ${result.pass ? "text-green-400" : "text-rose-400"}`}>
                        {result.detail}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Data Summary */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400" />
            Current Data Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{capas.length}</div>
              <div className="text-xs text-slate-400">Total CAPAs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{riskEntries.length}</div>
              <div className="text-xs text-slate-400">Risk Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{empSamples.length}</div>
              <div className="text-xs text-slate-400">EMP Samples</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{pestFindings.length}</div>
              <div className="text-xs text-slate-400">Pest Findings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{auditFindings.length}</div>
              <div className="text-xs text-slate-400">Audit Findings</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}