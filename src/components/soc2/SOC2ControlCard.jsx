import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Clock, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, Calendar, User
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

const trustCategoryColors = {
  security: "bg-blue-100 text-blue-800",
  availability: "bg-green-100 text-green-800",
  processing_integrity: "bg-purple-100 text-purple-800",
  confidentiality: "bg-amber-100 text-amber-800",
  privacy: "bg-rose-100 text-rose-800"
};

const statusConfig = {
  fully_implemented: { icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50", label: "Implemented" },
  partially_implemented: { icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50", label: "Partial" },
  not_implemented: { icon: ShieldX, color: "text-red-600", bg: "bg-red-50", label: "Not Implemented" },
  not_applicable: { icon: Shield, color: "text-slate-400", bg: "bg-slate-50", label: "N/A" }
};

const testResultConfig = {
  passed: { icon: CheckCircle2, color: "text-green-600", label: "Passed" },
  failed: { icon: XCircle, color: "text-red-600", label: "Failed" },
  exception: { icon: AlertTriangle, color: "text-amber-600", label: "Exception" },
  not_tested: { icon: Clock, color: "text-slate-400", label: "Not Tested" }
};

export default function SOC2ControlCard({ control, onTest, onViewDetails }) {
  const status = statusConfig[control.implementation_status] || statusConfig.not_implemented;
  const testResult = testResultConfig[control.test_result] || testResultConfig.not_tested;
  const StatusIcon = status.icon;
  const TestIcon = testResult.icon;

  const daysSinceTest = control.last_tested_at 
    ? differenceInDays(new Date(), new Date(control.last_tested_at))
    : null;

  const needsTesting = !control.last_tested_at || 
    (control.testing_frequency === "daily" && daysSinceTest >= 1) ||
    (control.testing_frequency === "weekly" && daysSinceTest >= 7) ||
    (control.testing_frequency === "monthly" && daysSinceTest >= 30) ||
    (control.testing_frequency === "quarterly" && daysSinceTest >= 90);

  return (
    <Card className={`${status.bg} border-l-4 ${control.implementation_status === 'fully_implemented' ? 'border-l-green-500' : control.implementation_status === 'partially_implemented' ? 'border-l-amber-500' : 'border-l-red-500'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-xs">
                {control.control_id}
              </Badge>
              <Badge className={trustCategoryColors[control.trust_service_category]}>
                {control.trust_service_category?.replace("_", " ")}
              </Badge>
              {control.gaps_identified?.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {control.gaps_identified.length} Gap{control.gaps_identified.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-slate-900 mb-1">{control.control_name}</h3>
            <p className="text-sm text-slate-600 line-clamp-2">{control.control_description}</p>

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <StatusIcon className={`w-4 h-4 ${status.color}`} />
                <span>{status.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <TestIcon className={`w-4 h-4 ${testResult.color}`} />
                <span>{testResult.label}</span>
              </div>
              {control.last_tested_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Tested {format(new Date(control.last_tested_at), "MMM d")}</span>
                </div>
              )}
              {control.owner_name && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{control.owner_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {needsTesting && control.implementation_status !== 'not_applicable' && (
              <Button size="sm" variant="outline" onClick={() => onTest?.(control)} className="text-xs">
                Test Now
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onViewDetails?.(control)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}