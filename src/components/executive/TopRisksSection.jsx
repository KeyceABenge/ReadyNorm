/**
 * Top 3 Risks section, driven by raw data arrays.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle, Microscope, ClipboardList, Bug, MessageSquareWarning,
  Target, CheckCircle2, ArrowRight
} from "lucide-react";
import { subDays } from "date-fns";

export default function TopRisksSection({ rawData, siteName }) {
  const { capas, auditFindings, empSamples, pestFindings, complaints } = rawData;
  const thirtyDaysAgo = subDays(new Date(), 30);
  const allRisks = [];

  const criticalCapas = capas.filter(c => c.status !== "closed" && (c.severity === "critical" || c.severity === "high"));
  if (criticalCapas.length > 0) allRisks.push({ type: "CAPA", title: `${criticalCapas.length} open high-severity CAPAs`, severity: "high", link: "CAPAProgram", icon: AlertTriangle });

  const pathogenPositives = empSamples.filter(s => new Date(s.collection_date) >= thirtyDaysAgo && s.overall_result === "fail" && s.test_results?.some(t => (t.test_type === "listeria_mono" || t.test_type === "salmonella") && t.result === "positive"));
  if (pathogenPositives.length > 0) allRisks.push({ type: "EMP", title: `${pathogenPositives.length} pathogen positives in last 30 days`, severity: "critical", link: "EnvironmentalMonitoring", icon: Microscope });

  const majorGaps = auditFindings.filter(f => f.compliance_status === "major_gap" || f.compliance_status === "critical_gap");
  if (majorGaps.length > 0) allRisks.push({ type: "Audit", title: `${majorGaps.length} major audit findings`, severity: "high", link: "InternalAudit", icon: ClipboardList });

  const criticalPest = pestFindings.filter(f => f.threshold_exceeded && f.exceedance_severity === "critical");
  if (criticalPest.length > 0) allRisks.push({ type: "Pest", title: `${criticalPest.length} critical pest exceedances`, severity: "high", link: "PestControl", icon: Bug });

  const criticalComplaints = complaints.filter(c => c.status !== "closed" && (c.severity === "critical" || c.severity === "major"));
  if (criticalComplaints.length > 0) allRisks.push({ type: "Complaint", title: `${criticalComplaints.length} critical customer complaints`, severity: "critical", link: "CustomerComplaints", icon: MessageSquareWarning });

  const top3 = allRisks.sort((a, b) => {
    const order = { critical: 3, high: 2, medium: 1, low: 0 };
    return (order[b.severity] || 0) - (order[a.severity] || 0);
  }).slice(0, 3);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5" />
        {siteName ? `Top Risks — ${siteName}` : "Top 3 Risks Right Now"}
      </h2>
      {top3.length === 0 ? (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
            <p className="text-emerald-800 font-medium">No critical risks detected</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {top3.map((risk, idx) => {
            const Icon = risk.icon;
            return (
              <Link key={idx} to={createPageUrl(risk.link)}>
                <Card className={cn(
                  "cursor-pointer transition-all hover:shadow-md border-2",
                  risk.severity === "critical" ? "bg-rose-50 border-rose-200" :
                  risk.severity === "high" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
                )}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        risk.severity === "critical" ? "bg-rose-100" : risk.severity === "high" ? "bg-amber-100" : "bg-blue-100"
                      )}>
                        <Icon className={cn("w-5 h-5",
                          risk.severity === "critical" ? "text-rose-600" : risk.severity === "high" ? "text-amber-600" : "text-blue-600"
                        )} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={cn(
                            risk.severity === "critical" ? "bg-rose-600" : risk.severity === "high" ? "bg-amber-600" : "bg-blue-600",
                            "text-white text-xs"
                          )}>{risk.severity}</Badge>
                          <span className="text-xs text-slate-500">{risk.type}</span>
                        </div>
                        <p className="font-medium text-slate-900 mt-1">{risk.title}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}