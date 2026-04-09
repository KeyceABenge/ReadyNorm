// @ts-nocheck
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, FileWarning,
  ClipboardCheck, RefreshCw
} from "lucide-react";
import { runInternalAudit, formatCategory } from "./soc2ComplianceEngine";
import { format } from "date-fns";
import { toast } from "sonner";

const SEVERITY_CONFIG = {
  critical: { bg: "bg-rose-100 text-rose-700", icon: XCircle, color: "text-rose-600" },
  high: { bg: "bg-orange-100 text-orange-700", icon: AlertTriangle, color: "text-orange-600" },
  medium: { bg: "bg-amber-100 text-amber-700", icon: FileWarning, color: "text-amber-600" },
  low: { bg: "bg-blue-100 text-blue-700", icon: Shield, color: "text-blue-600" },
};

const TYPE_LABELS = {
  overdue: "Overdue Control",
  missing_evidence: "Missing Evidence",
  gap: "Coverage Gap",
};

export default function SOC2AuditTab({ controls, evidence, policies, risks, vendors }) {
  const [auditResult, setAuditResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAudit = useCallback(() => {
    setIsRunning(true);
    // Brief delay so user sees the loading state
    setTimeout(() => {
      const result = runInternalAudit(controls, evidence, policies);
      setAuditResult({ ...result, _runId: Date.now() });
      setIsRunning(false);
      const findingCount = result.findings.length;
      if (findingCount === 0) {
        toast.success("Audit complete — no findings!");
      } else {
        toast.info(`Audit complete — ${findingCount} finding${findingCount !== 1 ? "s" : ""} detected.`);
      }
    }, 600);
  }, [controls, evidence, policies]);

  // Auto-compute summary stats for the pre-audit view
  const summary = useMemo(() => {
    return runInternalAudit(controls, evidence, policies);
  }, [controls, evidence, policies]);

  const activeResult = auditResult || summary;
  const hasFindings = activeResult.findings.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Internal Audit Mode</h2>
          <p className="text-sm text-slate-500">Simulated internal audit — reviews all controls, evidence, and policies for compliance gaps.</p>
        </div>
        <Button onClick={handleRunAudit} disabled={isRunning} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Running..." : auditResult ? "Re-Run Audit" : "Run Audit"}
        </Button>
      </div>

      {/* Audit Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={activeResult.compliancePercentage >= 80 ? "border-emerald-200 bg-emerald-50" : activeResult.compliancePercentage >= 50 ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"}>
          <CardContent className="p-5 text-center">
            <p className="text-4xl font-bold">{activeResult.compliancePercentage}%</p>
            <p className="text-sm font-medium mt-1">Overall Compliance</p>
            <Progress
              value={activeResult.compliancePercentage}
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">{activeResult.compliantCount}</p>
            <p className="text-sm text-slate-500">Compliant Controls</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-700">{activeResult.nonCompliantCount}</p>
            <p className="text-sm text-slate-500">Non-Compliant</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FileWarning className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700">{activeResult.missingEvidenceCount}</p>
            <p className="text-sm text-slate-500">Missing Evidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Policies</p>
            <p className="text-lg font-bold mt-1">{policies.filter(p => p.status === "approved").length}/{policies.length} approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Evidence Items</p>
            <p className="text-lg font-bold mt-1">{evidence.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Open Risks</p>
            <p className="text-lg font-bold mt-1">{risks.filter(r => r.status === "open").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Vendors Documented</p>
            <p className="text-lg font-bold mt-1">{vendors.filter(v => v.status === "active").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Findings List */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-blue-600" />
          Audit Findings ({activeResult.findings.length})
        </h3>

        {!hasFindings ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-medium text-emerald-800">No findings — all controls are compliant!</p>
              <p className="text-sm text-emerald-600 mt-1">Your system is audit-ready.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeResult.findings.map((finding, idx) => {
              const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.medium;
              const Icon = sev.icon;
              return (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${sev.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={sev.bg}>{finding.severity}</Badge>
                          <Badge variant="outline" className="text-xs">{TYPE_LABELS[finding.type] || finding.type}</Badge>
                          {finding.category && (
                            <Badge variant="outline" className="text-xs">{formatCategory(finding.category)}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900">{finding.description}</p>
                        <div className="mt-2 bg-slate-50 rounded-lg p-3 border">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Corrective Action</p>
                          <p className="text-sm text-slate-700">{finding.corrective_action}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Timestamp */}
      {auditResult && (
        <p className="text-xs text-slate-400 text-center">
          Audit completed: {format(new Date(auditResult.auditDate), "MMMM d, yyyy 'at' h:mm a")}
        </p>
      )}
    </div>
  );
}