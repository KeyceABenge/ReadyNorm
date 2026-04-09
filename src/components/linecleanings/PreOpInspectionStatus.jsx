// @ts-nocheck
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertTriangle, ClipboardCheck, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function PreOpInspectionStatus({ inspection, assets = [] }) {
  if (!inspection) {
    return (
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex items-center gap-2 text-slate-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">No pre-op inspection recorded for this line</span>
        </div>
      </Card>
    );
  }

  const statusConfig = {
    in_progress: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock, label: "In Progress", cardBorder: "border-amber-300" },
    passed: { color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2, label: "Passed", cardBorder: "border-emerald-300" },
    failed: { color: "bg-rose-100 text-rose-800 border-rose-200", icon: XCircle, label: "Failed", cardBorder: "border-rose-300" },
  };

  const config = statusConfig[inspection.status] || statusConfig.in_progress;
  const StatusIcon = config.icon;

  const assetResults = inspection.asset_results || [];
  const failedAssets = assetResults.filter(r => r.status === "fail");
  const passedAssets = assetResults.filter(r => r.status === "pass");
  const pendingAssets = assetResults.filter(r => r.status === "pending");

  return (
    <Card className={cn("p-4 border-2", config.cardBorder)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Pre-Op Inspection</h3>
        </div>
        <Badge className={cn("text-xs", config.color)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      <div className="text-sm text-slate-600 space-y-1 mb-3">
        <div>Inspector: <span className="font-medium text-slate-800">{inspection.inspector_name}</span></div>
        {inspection.inspection_date && (
          <div>Date: <span className="font-medium text-slate-800">
            {format(new Date(inspection.inspection_date), "MMM d, yyyy h:mm a")}
          </span></div>
        )}
        <div className="flex gap-4 mt-1">
          <span className="text-emerald-600 font-medium">{passedAssets.length} passed</span>
          {failedAssets.length > 0 && (
            <span className="text-rose-600 font-medium">{failedAssets.length} failed</span>
          )}
          {pendingAssets.length > 0 && (
            <span className="text-amber-600 font-medium">{pendingAssets.length} pending</span>
          )}
        </div>
      </div>

      {/* Failed Assets Alert */}
      {failedAssets.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span className="text-sm font-semibold text-rose-800">
              Failed Items — Re-clean & Sign Off Required
            </span>
          </div>
          <div className="space-y-2">
            {failedAssets.map((result, idx) => (
              <div key={idx} className="text-sm border-l-2 border-rose-300 pl-3">
                <div className="font-medium text-rose-900">
                  {result.asset_name || `Asset ${idx + 1}`}
                  {result.area_name && <span className="text-rose-600 font-normal"> — {result.area_name}</span>}
                </div>
                {result.comments && (
                  <div className="text-rose-700 mt-0.5">{result.comments}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Passed Assets Notes (if any have comments) */}
      {passedAssets.filter(r => r.comments).length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-emerald-800 mb-2">Inspector Notes</div>
          <div className="space-y-1">
            {passedAssets.filter(r => r.comments).map((result, idx) => (
              <div key={idx} className="text-sm text-emerald-700 border-l-2 border-emerald-300 pl-3">
                <span className="font-medium">{result.asset_name}:</span> {result.comments}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General inspection notes */}
      {inspection.notes && (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
          <span className="font-medium">Overall Notes:</span> {inspection.notes}
        </div>
      )}
    </Card>
  );
}