/**
 * The 6-card program status grid, driven by pre-computed metrics.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle, ShieldCheck, Microscope, Bug, MessageSquareWarning, Shield, ArrowRight, SprayCan, Droplets
} from "lucide-react";

function Row({ label, value, warn }) {
  const numVal = typeof value === 'string' ? parseFloat(value) : value;
  const isWarning = warn && numVal > 0;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={cn("font-medium", isWarning && (warn === "rose" ? "text-rose-600" : "text-amber-600"))}>
        {value}
      </span>
    </div>
  );
}

export default function ProgramStatusGrid({ metrics, showLinks = true }) {
  const m = metrics;
  if (!m) return null;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* MSS */}
      <Card className={m.mss && m.mss.rate < 70 ? "border-amber-200" : ""}>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><SprayCan className="w-4 h-4 text-blue-600" />MSS Program</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Completed" value={m.mss?.completed ?? 0} />
          <Row label="Scheduled" value={m.mss?.scheduled ?? 0} />
          <Row label="Completion Rate" value={`${m.mss?.rate ?? 0}%`} warn={m.mss?.rate < 70 ? "rose" : m.mss?.rate < 90 ? "amber" : undefined} />

          {showLinks && <Link to={createPageUrl("SanitationProgram")}><Button size="sm" variant="outline" className="w-full mt-2">View Sanitation <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>}
        </CardContent>
      </Card>

      {/* ATP */}
      <Card className={m.atp && m.atp.failRate > 10 ? "border-amber-200" : ""}>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Droplets className="w-4 h-4 text-cyan-600" />ATP Results</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Total Tests" value={m.atp?.total ?? 0} />
          <Row label="Pass" value={m.atp?.pass ?? 0} />
          <Row label="Fail" value={m.atp?.fail ?? 0} warn="rose" />
          <Row label="First Time Pass Rate" value={`${m.atp?.total > 0 ? (100 - (m.atp?.failRate ?? 0)) : 0}%`} warn={(m.atp?.total > 0 && (100 - (m.atp?.failRate ?? 0)) < 90) ? "amber" : (m.atp?.total > 0 && (100 - (m.atp?.failRate ?? 0)) < 80) ? "rose" : undefined} />
        </CardContent>
      </Card>

      {/* CAPA */}
      <Card className={m.capas.overdue > 0 || m.capas.ineffective > 0 ? "border-amber-200" : ""}>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />CAPA Program</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Open" value={m.capas.open} />
          <Row label="Overdue" value={m.capas.overdue} warn="rose" />
          <Row label="Ineffective" value={m.capas.ineffective} warn="rose" />
          <Row label="Checks Due" value={m.capas.checksDue} warn="amber" />
          {showLinks && <Link to={createPageUrl("CAPAProgram")}><Button size="sm" variant="outline" className="w-full mt-2">View Details <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>}
        </CardContent>
      </Card>

      {/* Audit */}
      <Card className={m.audit.majorGaps > 0 ? "border-amber-200" : ""}>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-700" />Audit Readiness</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Major Gaps" value={m.audit.majorGaps} warn="rose" />
          <Row label="Needs CAPA" value={m.audit.needsCapa} warn="amber" />
          <Row label="Total Findings" value={m.audit.totalFindings} />
          {showLinks && <Link to={createPageUrl("InternalAudit")}><Button size="sm" variant="outline" className="w-full mt-2">View Audits <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>}
        </CardContent>
      </Card>

      {/* EMP */}
      <Card className={m.emp.pathogenPositives > 0 ? "border-rose-200" : ""}>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Microscope className="w-4 h-4 text-emerald-600" />Environmental Monitoring</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Pathogen Positives (30d)" value={m.emp.pathogenPositives} warn="rose" />
          <Row label="Pending Reswabs" value={m.emp.pendingReswabs} warn="amber" />
          <Row label="Active Sites" value={m.emp.activeSites} />
          {showLinks && <Link to={createPageUrl("EnvironmentalMonitoring")}><Button size="sm" variant="outline" className="w-full mt-2">View EMP <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>}
        </CardContent>
      </Card>

      {/* Pest */}
      <Card className={m.pest.critical > 0 ? "border-amber-200" : ""}>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Bug className="w-4 h-4 text-purple-600" />Pest Control</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Critical Exceedances" value={m.pest.critical} warn="rose" />
          <Row label="Active Escalations" value={m.pest.escalations} warn="amber" />
          <Row label="Recent Findings (30d)" value={m.pest.recent30d} />
          {showLinks && <Link to={createPageUrl("PestControl")}><Button size="sm" variant="outline" className="w-full mt-2">View Pest <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>}
        </CardContent>
      </Card>

      {/* Complaints */}
      <Card className={m.complaints.criticalMajor > 0 ? "border-amber-200" : ""}>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><MessageSquareWarning className="w-4 h-4 text-purple-600" />Customer Complaints</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Open" value={m.complaints.open} />
          <Row label="Critical/Major" value={m.complaints.criticalMajor} warn="rose" />
          <Row label="Total (30d)" value={m.complaints.recent30d} />
          {showLinks && <Link to={createPageUrl("CustomerComplaints")}><Button size="sm" variant="outline" className="w-full mt-2">View Complaints <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>}
        </CardContent>
      </Card>

      {/* Risk */}
      <Card className={m.risks.highCritical > 0 ? "border-amber-200" : ""}>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-600" />Risk Register</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="High/Critical Risks" value={m.risks.highCritical} warn="rose" />
          <Row label="Open Risks" value={m.risks.open} />
          <Row label="Total Identified" value={m.risks.total} />
          {showLinks && <Link to={createPageUrl("RiskManagement")}><Button size="sm" variant="outline" className="w-full mt-2">View Risks <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>}
        </CardContent>
      </Card>
    </div>
  );
}