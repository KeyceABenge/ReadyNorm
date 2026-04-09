import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, CheckCircle2, XCircle, User, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function InspectionRecordCard({ inspection, line, area }) {
  return (
    <Card className="p-4 md:p-5 bg-white border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* Main Info Section */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-blue-50 mt-1 shrink-0">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Header with title and badges */}
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 mb-1 text-sm md:text-base">Post-Clean Inspection</h3>
                <div className="flex flex-wrap items-center gap-1 md:gap-2 text-xs md:text-sm text-slate-600">
                  <span className="font-medium">{line?.name}</span>
                  <span className="text-slate-400">•</span>
                  <span>{area?.name}</span>
                </div>
              </div>
              
              {/* Badges - inline on mobile */}
              <div className="flex flex-wrap gap-1 md:hidden">
                {inspection.passed_assets > 0 && (
                  <Badge className="bg-emerald-600 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {inspection.passed_assets} Passed
                  </Badge>
                )}
                {inspection.failed_assets > 0 && (
                  <Badge className="bg-rose-600 text-xs">
                    <XCircle className="w-3 h-3 mr-1" />
                    {inspection.failed_assets} Failed
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm mb-3">
              <div className="flex items-center gap-2 text-slate-600">
                <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 shrink-0" />
                <span className="truncate">Inspector: <span className="font-medium text-slate-900">{inspection.inspector_name || inspection.inspector_email}</span></span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 shrink-0" />
                <span>Date: <span className="font-medium text-slate-900">{format(parseISO(inspection.inspection_date), "MMM d, h:mm a")}</span></span>
              </div>
            </div>

            {inspection.results && Object.keys(inspection.results).length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium text-slate-700 mb-2">Asset Results:</p>
                <div className="space-y-1">
                  {Object.entries(inspection.results).map(([assetId, result]) => (
                    <div key={assetId} className={cn(
                      "text-xs p-2 rounded",
                      result.passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    )}>
                      {result.passed ? "✓ Passed" : "✗ Failed"}
                      {result.notes && ` - ${result.notes}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop badges column */}
        <div className="hidden md:block w-auto shrink-0">
          <div className="space-y-2">
            {inspection.passed_assets > 0 && (
              <Badge className="bg-emerald-600 w-full justify-center">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {inspection.passed_assets} Passed
              </Badge>
            )}
            {inspection.failed_assets > 0 && (
              <Badge className="bg-rose-600 w-full justify-center">
                <XCircle className="w-3 h-3 mr-1" />
                {inspection.failed_assets} Failed
              </Badge>
            )}
          </div>
        </div>

        {/* Signature - full width on mobile, column on desktop */}
        {inspection.signature_data && (
          <div className="w-full md:w-28 shrink-0 pt-3 md:pt-0 border-t md:border-t-0">
            <p className="text-xs text-slate-500 mb-2">Signature:</p>
            <img 
              src={inspection.signature_data} 
              alt="Inspector Signature" 
              className="h-12 md:h-16 border rounded bg-white w-full md:w-28 object-contain"
            />
          </div>
        )}
      </div>
    </Card>
  );
}