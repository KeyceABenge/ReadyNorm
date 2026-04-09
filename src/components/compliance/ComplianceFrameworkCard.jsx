import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, CheckCircle2, XCircle, AlertTriangle, 
  Calendar, ChevronRight, Plus, Edit, Building
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  compliant: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Compliant" },
  minor_nc: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "Minor NC" },
  major_nc: { color: "bg-orange-100 text-orange-700", icon: AlertTriangle, label: "Major NC" },
  critical_nc: { color: "bg-rose-100 text-rose-700", icon: XCircle, label: "Critical NC" },
  not_assessed: { color: "bg-slate-100 text-slate-700", icon: Shield, label: "Not Assessed" }
};

const FRAMEWORK_COLORS = {
  fda_117: "from-blue-500 to-blue-600",
  fsma: "from-emerald-500 to-emerald-600",
  sqf: "from-purple-500 to-purple-600",
  gfsi: "from-amber-500 to-amber-600",
  haccp: "from-red-500 to-red-600",
  usda: "from-green-500 to-green-600",
  brc: "from-indigo-500 to-indigo-600",
  ifs: "from-cyan-500 to-cyan-600",
  custom: "from-slate-500 to-slate-600"
};

export default function ComplianceFrameworkCard({ 
  framework, 
  requirements, 
  onEdit, 
  onSelect,
  onAddRequirement 
}) {
  const statusConfig = STATUS_CONFIG[framework.status] || STATUS_CONFIG.not_assessed;
  const StatusIcon = statusConfig.icon;
  const gradientColor = FRAMEWORK_COLORS[framework.code] || FRAMEWORK_COLORS.custom;

  // Calculate compliance rate
  const compliantCount = requirements.filter(r => r.status === "compliant").length;
  const totalCount = requirements.length;
  const complianceRate = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

  // Days until next audit
  const daysUntilAudit = framework.next_audit_date 
    ? differenceInDays(parseISO(framework.next_audit_date), new Date())
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header with gradient */}
      <div className={cn("bg-gradient-to-r p-4 text-white", gradientColor)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg">{framework.name}</h3>
            {framework.version && (
              <p className="text-white/80 text-sm">{framework.version}</p>
            )}
          </div>
          <Badge className={cn("bg-white/20 text-white border-0", statusConfig.color.includes("emerald") && "bg-emerald-300/30")}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Compliance Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Compliance Progress</span>
            <span className="font-semibold">{complianceRate}%</span>
          </div>
          <Progress value={complianceRate} className="h-2" />
          <p className="text-xs text-slate-400 mt-1">
            {compliantCount} of {totalCount} requirements met
          </p>
        </div>

        {/* Requirement Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-600">
              {requirements.filter(r => r.status === "compliant").length}
            </p>
            <p className="text-xs text-emerald-600">Compliant</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-600">
              {requirements.filter(r => r.status === "partial").length}
            </p>
            <p className="text-xs text-amber-600">Partial</p>
          </div>
          <div className="bg-rose-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-rose-600">
              {requirements.filter(r => r.status === "non_compliant").length}
            </p>
            <p className="text-xs text-rose-600">Gaps</p>
          </div>
        </div>

        {/* Audit Info */}
        {(framework.next_audit_date || framework.certifying_body) && (
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            {framework.next_audit_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Next Audit:</span>
                <span className={cn(
                  "font-medium",
                  daysUntilAudit !== null && daysUntilAudit < 30 ? "text-rose-600" : 
                  daysUntilAudit !== null && daysUntilAudit < 90 ? "text-amber-600" : "text-slate-900"
                )}>
                  {format(parseISO(framework.next_audit_date), "MMM d, yyyy")}
                  {daysUntilAudit !== null && daysUntilAudit >= 0 && (
                    <span className="text-slate-400 ml-1">({daysUntilAudit} days)</span>
                  )}
                </span>
              </div>
            )}
            {framework.certifying_body && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{framework.certifying_body}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onAddRequirement}>
            <Plus className="w-3 h-3 mr-1" />
            Add Req
          </Button>
          <Button size="sm" className="flex-1" onClick={onSelect}>
            View All
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}