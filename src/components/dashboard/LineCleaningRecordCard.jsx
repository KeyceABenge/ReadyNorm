import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package2, CheckCircle2, Clock, User, Droplet } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function LineCleaningRecordCard({ signOff, line, area, asset }) {
  return (
    <Card className="p-5 bg-white border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* LEFT COLUMN - Main Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-purple-50 mt-1 shrink-0">
            <Package2 className="w-5 h-5 text-purple-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{asset?.name || "Asset"}</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium">{line?.name}</span>
                  <span className="text-slate-400">•</span>
                  <span>{area?.name}</span>
                </div>
              </div>
              <Badge className={cn(
                "shrink-0",
                signOff.status === "passed_inspection" ? "bg-emerald-600" :
                signOff.status === "failed_inspection" ? "bg-rose-600" :
                "bg-amber-500 text-white"
              )}>
                {signOff.status === "passed_inspection" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {signOff.status === "passed_inspection" ? "Passed" :
                 signOff.status === "failed_inspection" ? "Failed" :
                 "Pending Inspection"}
              </Badge>
            </div>

            {asset?.description && (
              <p className="text-sm text-slate-600 mb-3">{asset.description}</p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <User className="w-4 h-4 text-slate-400" />
                <span>Cleaned by: <span className="font-medium text-slate-900">{signOff.employee_name || signOff.employee_email}</span></span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Hours: <span className="font-medium text-slate-900">{signOff.hours_worked}h</span></span>
              </div>
              {signOff.signed_off_at && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Completed: <span className="font-medium text-slate-900">{format(parseISO(signOff.signed_off_at), "MMM d, h:mm a")}</span></span>
                </div>
              )}
              {signOff.inspected_at && (
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  <span>Inspected: <span className="font-medium text-slate-900">{format(parseISO(signOff.inspected_at), "MMM d, h:mm a")}</span></span>
                </div>
              )}
            </div>

            {signOff.notes && (
              <div className="mt-3 p-2 bg-slate-50 rounded text-xs text-slate-600">
                <span className="font-medium">Notes:</span> {signOff.notes}
              </div>
            )}

            {signOff.inspection_notes && (
              <div className={cn(
                "mt-2 p-2 rounded text-xs",
                signOff.status === "failed_inspection" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
              )}>
                <span className="font-medium">Inspector Notes:</span> {signOff.inspection_notes}
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN - ATP Results */}
        {signOff.atp_test_result && signOff.atp_test_result !== "not_required" && (
          <div className="w-44 shrink-0 flex-shrink-0">
            <div className={cn(
              "p-3 rounded border-2",
              signOff.atp_test_result === "pass" ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Droplet className="w-4 h-4" />
                <span className="font-semibold text-sm">ATP Test</span>
                <Badge className={cn(
                  "ml-auto",
                  signOff.atp_test_result === "pass" ? "bg-emerald-600" : "bg-rose-600"
                )}>
                  {signOff.atp_test_result.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                {signOff.atp_test_value && (
                  <div className="text-slate-700">
                    <span className="font-medium">RLU:</span> {signOff.atp_test_value}
                  </div>
                )}
                {signOff.atp_tested_at && (
                  <div className="text-slate-700">
                    <span className="font-medium">Tested:</span> {format(parseISO(signOff.atp_tested_at), "MMM d")}
                  </div>
                )}
                {signOff.atp_retest_count > 0 && (
                  <div className="text-amber-600 font-medium">
                    Retest #{signOff.atp_retest_count}
                  </div>
                )}
                {signOff.atp_test_comments && (
                  <div className={cn(
                    "mt-2 p-2 rounded",
                    signOff.atp_test_result === "fail" ? "bg-rose-100" : "bg-slate-100"
                  )}>
                    <span className="font-medium text-xs">Notes:</span> {signOff.atp_test_comments.substring(0, 50)}...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN - Signature */}
        {signOff.signature_data && (
          <div className="w-32 shrink-0">
            <p className="text-xs text-slate-500 mb-2">Signature:</p>
            <img 
              src={signOff.signature_data} 
              alt="Signature" 
              className="h-16 border rounded bg-white w-full object-contain"
            />
          </div>
        )}
      </div>
    </Card>
  );
}