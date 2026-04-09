import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, TrendingUp
} from "lucide-react";
import { format } from "date-fns";

export default function ValidationResults({ 
  results, capas, riskEntries, empSamples, pestFindings, auditFindings, downtimes 
}) {
  // Filter simulation records
  const simCapas = capas.filter(c => c.title?.includes("[SIM]"));
  const simRisks = riskEntries.filter(r => r.title?.includes("[SIM]"));
  const simEmp = empSamples.filter(s => s.notes?.includes("[SIMULATION]"));
  const simPest = pestFindings.filter(f => f.finding_notes?.includes("[SIMULATION]"));
  const simAudit = auditFindings.filter(f => f.finding_notes?.includes("[SIMULATION]"));
  const simDowntime = downtimes.filter(d => d.description?.includes("[SIMULATION]"));

  const totalSimRecords = simCapas.length + simRisks.length + simEmp.length + simPest.length + simAudit.length + simDowntime.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-white">{results.length}</div>
            <div className="text-sm text-slate-400">Simulation Runs</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-amber-500">{simCapas.length}</div>
            <div className="text-sm text-slate-400">CAPAs Created</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-rose-500">{simRisks.length}</div>
            <div className="text-sm text-slate-400">Risks Flagged</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-500">{totalSimRecords}</div>
            <div className="text-sm text-slate-400">Total Records</div>
          </CardContent>
        </Card>
      </div>

      {/* Simulation Run History */}
      {results.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Simulation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.slice().reverse().map((run, idx) => (
                <div key={idx} className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">
                      {format(new Date(run.timestamp), "MMM d, yyyy h:mm a")}
                    </span>
                    <Badge variant="outline" className="text-slate-300 border-slate-600">
                      {run.scenarios.length} scenarios
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(run.results).map(([scenarioId, result]) => (
                      <Badge 
                        key={scenarioId}
                        className={result.success ? "bg-green-600" : "bg-red-600"}
                      >
                        {result.success ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {scenarioId}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Created Records Detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CAPAs */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Simulation CAPAs ({simCapas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {simCapas.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No simulation CAPAs yet</p>
            ) : (
              <div className="space-y-2">
                {simCapas.map(capa => (
                  <div key={capa.id} className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-amber-500">{capa.capa_id}</span>
                      <Badge className={
                        capa.severity === "critical" ? "bg-rose-500" : "bg-orange-500"
                      }>
                        {capa.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-300 mt-1">{capa.title}</p>
                    <p className="text-xs text-slate-500 mt-1">Source: {capa.source}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Entries */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-500" />
              Simulation Risks ({simRisks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {simRisks.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No simulation risks yet</p>
            ) : (
              <div className="space-y-2">
                {simRisks.map(risk => (
                  <div key={risk.id} className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-400">{risk.risk_number}</span>
                      <Badge className={
                        risk.risk_level === "critical" ? "bg-rose-500" :
                        risk.risk_level === "high" ? "bg-orange-500" :
                        "bg-amber-500"
                      }>
                        Score: {risk.risk_score}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-300 mt-1">{risk.title}</p>
                    <p className="text-xs text-slate-500 mt-1">Category: {risk.category}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification Checklist */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">Post-Simulation Verification Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "CAPAs created for critical events", check: simCapas.length > 0 },
              { label: "Risk entries logged", check: simRisks.length > 0 },
              { label: "Records linked to source", check: simCapas.some(c => c.source_record_id) },
              { label: "Owners assigned", check: simCapas.some(c => c.owner_email) },
              { label: "Health score reflects changes", check: true, manual: true },
              { label: "Executive narrative updated", check: true, manual: true },
              { label: "Shift handoff shows issues", check: true, manual: true },
              { label: "Do First priorities adjusted", check: true, manual: true }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
                {item.manual ? (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-500" />
                ) : item.check ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-500" />
                )}
                <span className={`text-sm ${item.check || item.manual ? "text-slate-300" : "text-slate-500"}`}>
                  {item.label}
                  {item.manual && <span className="text-xs text-slate-500 ml-2">(verify manually)</span>}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}