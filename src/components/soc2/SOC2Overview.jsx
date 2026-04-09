import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield, FileText, FolderOpen, AlertTriangle,
  Truck, CheckCircle2, Clock, AlertCircle, XCircle,
  CalendarClock, TrendingUp
} from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { getComplianceStatus } from "./soc2ComplianceEngine";

export default function SOC2Overview({ policies, controls, evidence, risks, vendors, onNavigate }) {
  const approvedPolicies = policies.filter(p => p.status === "approved").length;
  const activeVendors = vendors.filter(v => v.status === "active").length;
  const openRisks = risks.filter(r => r.status === "open").length;
  const highRisks = risks.filter(r => r.risk_level === "high" || r.risk_level === "critical").length;

  // Compute compliance stats using the engine
  const complianceStats = useMemo(() => {
    let compliant = 0, nonCompliant = 0, missingEvidence = 0;
    controls.forEach(control => {
      const controlEvidence = evidence.filter(e => e.control_id === control.id);
      const status = getComplianceStatus(control, controlEvidence);
      if (status.status === "compliant") compliant++;
      else if (status.status === "missing_evidence") missingEvidence++;
      else nonCompliant++;
    });
    const total = controls.length;
    const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;
    return { compliant, nonCompliant, missingEvidence, total, pct };
  }, [controls, evidence]);

  // Upcoming due controls (next 14 days)
  const upcomingControls = useMemo(() => {
    const today = new Date();
    return controls
      .filter(c => c.next_due_date && c.frequency !== "per_event")
      .filter(c => {
        const due = parseISO(c.next_due_date);
        const days = differenceInDays(due, today);
        return days >= 0 && days <= 14;
      })
      .sort((a, b) => parseISO(a.next_due_date) - parseISO(b.next_due_date))
      .slice(0, 5);
  }, [controls]);

  // Overdue controls
  const overdueControls = useMemo(() => {
    const today = new Date();
    return controls
      .filter(c => c.next_due_date && c.frequency !== "per_event")
      .filter(c => differenceInDays(parseISO(c.next_due_date), today) < 0)
      .sort((a, b) => parseISO(a.next_due_date) - parseISO(b.next_due_date));
  }, [controls]);

  const STAT_CARDS = [
    {
      label: "Compliance",
      value: `${complianceStats.pct}%`,
      sub: `${complianceStats.compliant}/${complianceStats.total} controls`,
      icon: TrendingUp,
      color: complianceStats.pct >= 80 ? "bg-emerald-100 text-emerald-600" : complianceStats.pct >= 50 ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600",
      tab: "audit"
    },
    {
      label: "Policies",
      value: `${approvedPolicies}/${policies.length}`,
      sub: "Approved",
      icon: FileText,
      color: "bg-blue-100 text-blue-600",
      tab: "policies"
    },
    {
      label: "Evidence Items",
      value: evidence.length,
      sub: `${complianceStats.missingEvidence} controls missing`,
      icon: FolderOpen,
      color: "bg-purple-100 text-purple-600",
      tab: "evidence"
    },
    {
      label: "Open Risks",
      value: openRisks,
      sub: `${highRisks} high/critical`,
      icon: AlertTriangle,
      color: openRisks > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600",
      tab: "risks"
    },
    {
      label: "Vendors",
      value: activeVendors,
      sub: "Active",
      icon: Truck,
      color: "bg-cyan-100 text-cyan-600",
      tab: "vendors"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Compliance Score Banner */}
      <Card className={complianceStats.pct >= 80 ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-white" : complianceStats.pct >= 50 ? "border-amber-200 bg-gradient-to-r from-amber-50 to-white" : "border-rose-200 bg-gradient-to-r from-rose-50 to-white"}>
        <CardContent className="p-5">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${complianceStats.pct >= 80 ? "bg-emerald-100" : complianceStats.pct >= 50 ? "bg-amber-100" : "bg-rose-100"}`}>
                <span className={`text-2xl font-bold ${complianceStats.pct >= 80 ? "text-emerald-700" : complianceStats.pct >= 50 ? "text-amber-700" : "text-rose-700"}`}>
                  {complianceStats.pct}%
                </span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-lg">Overall Compliance Score</h3>
              <p className="text-sm text-slate-500 mb-2">
                {complianceStats.compliant} compliant, {complianceStats.nonCompliant} non-compliant, {complianceStats.missingEvidence} missing evidence
              </p>
              <Progress value={complianceStats.pct} className="h-2" />
            </div>
            <div className="flex-shrink-0 hidden md:flex flex-col items-end gap-1">
              {complianceStats.nonCompliant > 0 && (
                <Badge className="bg-rose-100 text-rose-700">{complianceStats.nonCompliant} overdue</Badge>
              )}
              {complianceStats.missingEvidence > 0 && (
                <Badge className="bg-amber-100 text-amber-700">{complianceStats.missingEvidence} missing evidence</Badge>
              )}
              {complianceStats.pct === 100 && (
                <Badge className="bg-emerald-100 text-emerald-700">Audit Ready</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {STAT_CARDS.map(card => (
          <Card
            key={card.label}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate(card.tab)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue Controls Alert */}
      {overdueControls.length > 0 && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <p className="font-medium text-rose-900">{overdueControls.length} overdue control{overdueControls.length > 1 ? "s" : ""}</p>
              <button onClick={() => onNavigate("gaps")} className="text-sm text-rose-700 font-medium hover:underline ml-auto">
                View Gaps →
              </button>
            </div>
            <div className="space-y-1">
              {overdueControls.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center gap-2 text-sm text-rose-800">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{c.control_name}</span>
                  <span className="text-rose-500 text-xs ml-auto">Due: {format(parseISO(c.next_due_date), "MMM d")}</span>
                </div>
              ))}
              {overdueControls.length > 3 && (
                <p className="text-xs text-rose-500 mt-1">+ {overdueControls.length - 3} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Status Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Upcoming Tasks */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              Upcoming Tasks (next 14 days)
            </h3>
            {upcomingControls.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming tasks.</p>
            ) : (
              <div className="space-y-2">
                {upcomingControls.map(c => {
                  const days = differenceInDays(parseISO(c.next_due_date), new Date());
                  return (
                    <div key={c.id} className="flex items-center gap-3 text-sm">
                      <Clock className={`w-4 h-4 flex-shrink-0 ${days <= 3 ? "text-amber-500" : "text-slate-400"}`} />
                      <span className="flex-1 text-slate-700 truncate">{c.control_name}</span>
                      <span className={`text-xs ${days <= 3 ? "text-amber-600 font-medium" : "text-slate-400"}`}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Readiness Checklist */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Audit Readiness Checklist
            </h3>
            <div className="space-y-2">
              {[
                { label: "All policies approved", done: approvedPolicies === policies.length && policies.length > 0 },
                { label: "Controls operating (80%+)", done: complianceStats.pct >= 80 },
                { label: "No controls missing evidence", done: complianceStats.missingEvidence === 0 && controls.length > 0 },
                { label: "Evidence collected (50+ items)", done: evidence.length >= 50 },
                { label: "Risks assessed", done: risks.length > 0 },
                { label: "Vendors documented", done: vendors.length > 0 },
                { label: "No overdue controls", done: overdueControls.length === 0 && controls.length > 0 },
                { label: "Multi-tenant security validated", done: controls.filter(c => c.category === "multi_tenant_security").length > 0 },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-300" />
                  )}
                  <span className={`text-sm ${item.done ? "text-slate-700" : "text-slate-400"}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* High-Risk Issues */}
        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              High-Risk Issues
            </h3>
            {(() => {
              const highRiskItems = [];
              // Overdue controls
              if (overdueControls.length > 0) {
                highRiskItems.push({ text: `${overdueControls.length} control(s) are overdue`, severity: "high" });
              }
              // Missing evidence
              if (complianceStats.missingEvidence > 0) {
                highRiskItems.push({ text: `${complianceStats.missingEvidence} control(s) missing evidence`, severity: "medium" });
              }
              // No multi-tenant controls
              if (controls.filter(c => c.category === "multi_tenant_security").length === 0 && controls.length > 0) {
                highRiskItems.push({ text: "No multi-tenant security validation controls", severity: "critical" });
              }
              // Unapproved policies
              if (policies.length > 0 && approvedPolicies < policies.length) {
                highRiskItems.push({ text: `${policies.length - approvedPolicies} policies awaiting approval`, severity: "medium" });
              }
              // High/critical open risks
              if (highRisks > 0) {
                highRiskItems.push({ text: `${highRisks} high/critical open risk(s)`, severity: "high" });
              }

              if (highRiskItems.length === 0) {
                return <p className="text-sm text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> No high-risk issues detected.</p>;
              }
              return (
                <div className="space-y-2">
                  {highRiskItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.severity === "critical" ? "bg-rose-500" : item.severity === "high" ? "bg-orange-500" : "bg-amber-500"}`} />
                      <span className="text-sm text-slate-700">{item.text}</span>
                      <Badge className={item.severity === "critical" ? "bg-rose-100 text-rose-700" : item.severity === "high" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"} variant="secondary">
                        {item.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}