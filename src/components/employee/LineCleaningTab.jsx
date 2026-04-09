import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package2, AlertTriangle, ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

export default function LineCleaningTab({ assignments, isLoading, t, preOpInspections = [] }) {
  if (isLoading) {
    return <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto" /></div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <Package2 className="w-8 sm:w-12 h-8 sm:h-12 text-slate-400 mx-auto mb-2 sm:mb-4" />
        <p className="text-slate-600 font-medium text-sm sm:text-base">{t("dashboard", "noLineCleanings", "No line cleanings scheduled today")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment, index) => (
        <Card key={assignment.id} className="p-4 sm:p-6 bg-white border-2">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold text-sm sm:text-base flex-shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2 truncate">{assignment.production_line_name}</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm mb-3">
                <div><span className="text-slate-500">Start:</span><div className="font-medium text-slate-900">{assignment.expected_line_down_time ? format(parseISO(assignment.expected_line_down_time), "h:mm a") : "—"}</div></div>
                <div><span className="text-slate-500">End:</span><div className="font-medium text-slate-900">{assignment.estimated_end_time ? format(parseISO(assignment.estimated_end_time), "h:mm a") : "—"}</div></div>
                <div><span className="text-slate-500">Duration:</span><div className="font-medium text-slate-900">{assignment.duration_minutes} min</div></div>
                <div><span className="text-slate-500">Status:</span><div className={cn("font-medium capitalize inline-block px-2 py-0.5 rounded text-xs", assignment.status === "scheduled" && "bg-blue-100 text-blue-700", assignment.status === "in_progress" && "bg-yellow-100 text-yellow-700", assignment.status === "completed" && "bg-emerald-100 text-emerald-700")}>{assignment.status}</div></div>
              </div>
              {assignment.notes && (
                <div className="p-2 sm:p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs sm:text-sm text-purple-900 mb-3">
                  <span className="font-medium">Notes:</span> {assignment.notes}
                </div>
              )}
              {/* Pre-Op Inspection Status */}
              {(() => {
                const preOp = preOpInspections
                  .filter(p => p.production_line_id === assignment.production_line_id)
                  .sort((a, b) => new Date(b.inspection_date || b.created_date) - new Date(a.inspection_date || a.created_date))[0];
                if (!preOp) return null;
                const failedItems = (preOp.asset_results || []).filter(r => r.status === "fail");
                return (
                  <div className={cn(
                    "p-2 sm:p-3 rounded-lg border text-xs sm:text-sm mb-3",
                    preOp.status === "passed" ? "bg-emerald-50 border-emerald-200" :
                    preOp.status === "failed" ? "bg-rose-50 border-rose-200" :
                    "bg-amber-50 border-amber-200"
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardCheck className="w-4 h-4 flex-shrink-0" />
                      <span className="font-semibold">Pre-Op Inspection</span>
                      <Badge className={cn("text-[10px] ml-auto",
                        preOp.status === "passed" ? "bg-emerald-100 text-emerald-800" :
                        preOp.status === "failed" ? "bg-rose-100 text-rose-800" :
                        "bg-amber-100 text-amber-800"
                      )}>
                        {preOp.status === "passed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {preOp.status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
                        {preOp.status === "passed" ? "Passed" : preOp.status === "failed" ? "Failed" : "In Progress"}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Inspector: {preOp.inspector_name}
                    </div>
                    {failedItems.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center gap-1 text-rose-700 font-medium text-[11px]">
                          <AlertTriangle className="w-3 h-3" />
                          {failedItems.length} failed — re-clean & sign off required
                        </div>
                        {failedItems.map((item, i) => (
                          <div key={i} className="text-[11px] text-rose-600 pl-4">
                            • {item.asset_name}{item.comments ? `: ${item.comments}` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                    {preOp.notes && (
                      <div className="text-[11px] text-slate-600 mt-1">Notes: {preOp.notes}</div>
                    )}
                  </div>
                );
              })()}
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="bg-slate-100 px-2 py-1 rounded">{(assignment.areas_snapshot || []).length} areas</span>
                <span className="bg-slate-100 px-2 py-1 rounded">{(assignment.assets_snapshot || []).length} assets</span>
                {assignment.shift_name && <span className="bg-slate-100 px-2 py-1 rounded">{assignment.shift_name} Shift</span>}
              </div>
              {(assignment.status === "in_progress" || assignment.status === "scheduled") && (
                <Link to={createPageUrl("LineCleaningDetail") + `?id=${assignment.id}`}>
                  <Button className="mt-3 w-full bg-purple-600 hover:bg-purple-700" size="sm">
                    {assignment.status === "in_progress" ? "Continue Cleaning & Sign Off" : "Start Cleaning"}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}