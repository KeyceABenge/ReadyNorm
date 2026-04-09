// @ts-nocheck
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, CheckCircle2, XCircle, FileWarning,
  ArrowRight
} from "lucide-react";
import { getComplianceStatus, formatCategory } from "./soc2ComplianceEngine";

const STATUS_CONFIG = {
  compliant: { icon: CheckCircle2, bg: "bg-emerald-100 text-emerald-700", color: "text-emerald-600" },
  non_compliant: { icon: XCircle, bg: "bg-rose-100 text-rose-700", color: "text-rose-600" },
  missing_evidence: { icon: FileWarning, bg: "bg-amber-100 text-amber-700", color: "text-amber-600" },
};

export default function SOC2GapsTab({ controls, evidence, policies, onNavigate }) {
  const [filter, setFilter] = useState("all"); // all, issues, compliant

  const controlStatuses = useMemo(() => {
    return controls.map(control => {
      const controlEvidence = evidence.filter(e => e.control_id === control.id);
      const compliance = getComplianceStatus(control, controlEvidence);
      return { ...control, compliance, evidenceCount: controlEvidence.length };
    });
  }, [controls, evidence]);

  const issues = controlStatuses.filter(c => c.compliance.status !== "compliant");
  const compliant = controlStatuses.filter(c => c.compliance.status === "compliant");

  // Policy-control alignment check
  const policyGaps = useMemo(() => {
    const gaps = [];
    const unapproved = policies.filter(p => p.status !== "approved");
    if (unapproved.length > 0) {
      gaps.push({
        type: "policy",
        description: `${unapproved.length} polic${unapproved.length === 1 ? "y" : "ies"} not yet approved`,
        action: "Review and approve in the Policies tab",
        severity: "medium",
        items: unapproved.map(p => p.policy_name),
      });
    }

    // Check for categories without controls
    const expectedCats = ["access_control", "change_management", "logging_monitoring", "backups", "incident_response", "risk_management", "vendor_management", "multi_tenant_security"];
    const coveredCats = new Set(controls.map(c => c.category));
    const missingCats = expectedCats.filter(c => !coveredCats.has(c));
    if (missingCats.length > 0) {
      gaps.push({
        type: "coverage",
        description: `${missingCats.length} control categor${missingCats.length === 1 ? "y" : "ies"} have no controls defined`,
        action: "Add controls for: " + missingCats.map(formatCategory).join(", "),
        severity: "high",
        items: missingCats.map(formatCategory),
      });
    }

    // Controls without evidence descriptions
    const noEvidenceDesc = controls.filter(c => !c.evidence_description && c.frequency !== "per_event");
    if (noEvidenceDesc.length > 0) {
      gaps.push({
        type: "evidence_definition",
        description: `${noEvidenceDesc.length} control(s) have no required evidence defined`,
        action: "Edit controls to specify what evidence is required",
        severity: "medium",
        items: noEvidenceDesc.map(c => c.control_name),
      });
    }

    return gaps;
  }, [controls, policies]);

  const filtered = filter === "issues" ? issues : filter === "compliant" ? compliant : controlStatuses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gap Detection & Remediation</h2>
          <p className="text-sm text-slate-500">Identifies compliance gaps, missing evidence, and policy alignment issues.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("compliant")}>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-700">{compliant.length}</p>
            <p className="text-xs text-slate-500">Compliant</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("issues")}>
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 text-rose-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-rose-700">{issues.length}</p>
            <p className="text-xs text-slate-500">Issues Found</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("all")}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700">{policyGaps.length}</p>
            <p className="text-xs text-slate-500">Policy/Coverage Gaps</p>
          </CardContent>
        </Card>
      </div>

      {/* Policy & Coverage Gaps */}
      {policyGaps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Policy & Coverage Gaps</h3>
          <div className="space-y-2">
            {policyGaps.map((gap, idx) => (
              <Card key={idx} className="border-l-4 border-l-amber-400">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={gap.severity === "high" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}>
                          {gap.severity}
                        </Badge>
                        <span className="text-sm font-medium text-slate-900">{gap.description}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowRight className="w-3 h-3 text-blue-600" />
                        <span className="text-sm text-blue-700">{gap.action}</span>
                      </div>
                      {gap.items.length <= 5 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {gap.items.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Control-Level Status */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Control Status ({filtered.length})
          </h3>
          <div className="flex gap-1">
            {["all", "issues", "compliant"].map(f => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="text-xs capitalize"
              >
                {f === "all" ? "All" : f === "issues" ? `Issues (${issues.length})` : `OK (${compliant.length})`}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map(control => {
            const cfg = STATUS_CONFIG[control.compliance.status] || STATUS_CONFIG.non_compliant;
            const Icon = cfg.icon;
            return (
              <Card key={control.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h4 className="text-sm font-medium text-slate-900">{control.control_name}</h4>
                        <Badge className={cfg.bg}>{control.compliance.label}</Badge>
                        <Badge variant="outline" className="text-xs">{control.evidenceCount} evidence</Badge>
                      </div>
                      <p className="text-xs text-slate-500">{control.compliance.reason}</p>
                      {control.compliance.status !== "compliant" && (
                        <div className="mt-2 bg-blue-50 rounded-lg p-2 border border-blue-100">
                          <p className="text-xs text-blue-700">
                            <span className="font-medium">Fix: </span>
                            {control.compliance.status === "missing_evidence"
                              ? `Upload evidence for this control: ${control.evidence_description || "required documentation"}`
                              : control.compliance.status === "non_compliant" && control.compliance.reason.includes("overdue")
                                ? `Execute this control and upload evidence. Overdue since ${control.next_due_date || "unknown"}.`
                                : `Set a start date and complete the first execution of this control.`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-slate-400">
                  {filter === "issues" ? "No issues found — all controls are compliant!" : "No controls match this filter."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}