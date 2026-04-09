/**
 * Immediate Actions Required card, driven by metrics.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle, Clock, ClipboardList, Microscope, CheckCircle2, ArrowRight, Activity
} from "lucide-react";

function ActionRow({ icon: Icon, text, link, color = "rose" }) {
  const bg = color === "rose" ? "bg-rose-50 border-rose-200 hover:bg-rose-100" : "bg-amber-50 border-amber-200 hover:bg-amber-100";
  const iconColor = color === "rose" ? "text-rose-600" : "text-amber-600";
  const arrowColor = color === "rose" ? "text-rose-400" : "text-amber-400";

  return (
    <Link to={createPageUrl(link)}>
      <div className={`flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer ${bg}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-medium">{text}</span>
        </div>
        <ArrowRight className={`w-4 h-4 ${arrowColor}`} />
      </div>
    </Link>
  );
}

export default function ActionsRequired({ metrics, showLinks = true, siteName }) {
  const a = metrics?.actions;
  if (!a) return null;

  const hasActions = a.overdueCapas > 0 || a.ineffectiveCapas > 0 || a.effectivenessChecksDue > 0 || a.gapsNeedingCAPAs > 0 || a.pathogenPositives > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          {siteName ? `Actions — ${siteName}` : "Immediate Actions Required"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {a.overdueCapas > 0 && <ActionRow icon={AlertTriangle} text={`Complete ${a.overdueCapas} overdue CAPA${a.overdueCapas > 1 ? 's' : ''}`} link="CAPAProgram" />}
        {a.ineffectiveCapas > 0 && <ActionRow icon={AlertTriangle} text={`Address ${a.ineffectiveCapas} ineffective CAPA${a.ineffectiveCapas > 1 ? 's' : ''}`} link="CAPAProgram" />}
        {a.effectivenessChecksDue > 0 && <ActionRow icon={Clock} text={`Verify effectiveness for ${a.effectivenessChecksDue} CAPA${a.effectivenessChecksDue > 1 ? 's' : ''}`} link="CAPAProgram" color="amber" />}
        {a.gapsNeedingCAPAs > 0 && <ActionRow icon={ClipboardList} text={`${a.gapsNeedingCAPAs} audit finding${a.gapsNeedingCAPAs > 1 ? 's need' : ' needs'} CAPA`} link="InternalAudit" color="amber" />}
        {a.pathogenPositives > 0 && <ActionRow icon={Microscope} text={`Investigate ${a.pathogenPositives} pathogen positive${a.pathogenPositives > 1 ? 's' : ''}`} link="EnvironmentalMonitoring" />}
        {!hasActions && (
          <div className="text-center py-6 text-slate-500">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm">No immediate actions required</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}