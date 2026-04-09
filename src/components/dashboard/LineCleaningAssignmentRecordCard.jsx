// @ts-nocheck
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package2, CheckCircle2, Clock, User, Calendar, AlertTriangle, Droplet, ClipboardCheck, PenTool, ChevronDown, ChevronUp, Factory } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LineCleaningAssignmentRecordCard({ 
  assignment, 
  line, 
  signOffs = [], 
  inspections = [],
  preOpInspections = [],
  areas = [], 
  assets = [] 
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedAssetFilter, setSelectedAssetFilter] = useState(null); // { id, name }
  // Calculate stats
  const totalAssets = assignment.assets_snapshot?.length || 0;
  const completedSignOffs = signOffs.filter(s => s.status === "passed_inspection").length;
  const failedSignOffs = signOffs.filter(s => s.status === "failed_inspection").length;
  const pendingSignOffs = signOffs.filter(s => s.status === "pending_inspection").length;
  
  // ATP stats
  const atpRequired = signOffs.filter(s => s.atp_test_result && s.atp_test_result !== "not_required");
  const atpPassed = atpRequired.filter(s => s.atp_test_result === "pass").length;
  const atpFailed = atpRequired.filter(s => s.atp_test_result === "fail").length;

  // Calculate total hours
  const totalHours = signOffs.reduce((sum, s) => sum + (s.hours_worked || 0), 0);

  // Get unique employees
  const uniqueEmployees = [...new Set(signOffs.map(s => s.employee_name || s.employee_email))];

  const statusConfig = {
    scheduled: { color: "bg-blue-100 text-blue-700", label: "Scheduled" },
    in_progress: { color: "bg-amber-100 text-amber-700", label: "In Progress" },
    completed: { color: "bg-emerald-100 text-emerald-700", label: "Completed" },
    cancelled: { color: "bg-slate-100 text-slate-700", label: "Cancelled" }
  };

  const status = statusConfig[assignment.status] || statusConfig.scheduled;

  return (
    <Card className="p-5 bg-white border shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-50 mt-1">
            <Package2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">
              {assignment.production_line_name || line?.name || "Production Line"}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mt-1">
              {assignment.scheduled_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseISO(assignment.scheduled_date), "MMM d, yyyy")}
                </span>
              )}
              {assignment.shift_name && (
                <>
                  <span className="text-slate-400">•</span>
                  <span>{assignment.shift_name} Shift</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Badge className={cn("shrink-0", status.color)}>
          {assignment.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
          {status.label}
        </Badge>
      </div>

      {/* Time Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
        <div>
          <p className="text-xs text-slate-500">Expected Start</p>
          <p className="font-medium text-slate-900 text-sm">
            {assignment.expected_line_down_time 
              ? format(parseISO(assignment.expected_line_down_time), "h:mm a")
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Expected End</p>
          <p className="font-medium text-slate-900 text-sm">
            {assignment.estimated_end_time 
              ? format(parseISO(assignment.estimated_end_time), "h:mm a")
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Actual Start</p>
          <p className="font-medium text-slate-900 text-sm">
            {assignment.actual_start_time 
              ? format(parseISO(assignment.actual_start_time), "h:mm a")
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Actual End</p>
          <p className="font-medium text-slate-900 text-sm">
            {assignment.actual_end_time 
              ? format(parseISO(assignment.actual_end_time), "h:mm a")
              : "—"}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Passed</span>
          </div>
          <p className="text-xl font-bold text-emerald-700">{completedSignOffs}</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Pending</span>
          </div>
          <p className="text-xl font-bold text-amber-700">{pendingSignOffs}</p>
        </div>
        <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span className="text-xs font-medium text-rose-700">Failed</span>
          </div>
          <p className="text-xl font-bold text-rose-700">{failedSignOffs}</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Total Hours</span>
          </div>
          <p className="text-xl font-bold text-blue-700">{totalHours.toFixed(1)}h</p>
        </div>
      </div>

      {/* ATP Summary */}
      {atpRequired.length > 0 && (
        <div className="mb-4 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="w-4 h-4 text-cyan-600" />
            <span className="font-medium text-cyan-800 text-sm">ATP Testing Summary</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-700">
              <span className="font-bold">{atpPassed}</span> Passed
            </span>
            <span className="text-rose-700">
              <span className="font-bold">{atpFailed}</span> Failed
            </span>
            <span className="text-slate-600">
              <span className="font-bold">{atpRequired.length}</span> Total Tests
            </span>
          </div>
        </div>
      )}

      {/* Employees */}
      {uniqueEmployees.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            Employees ({uniqueEmployees.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {uniqueEmployees.map((emp, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {emp}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Areas & Assets Summary */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 mb-2">Areas & Assets</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {(assignment.areas_snapshot || []).length} Areas
          </Badge>
          <Badge variant="outline" className="text-xs">
            {totalAssets} Assets
          </Badge>
          <Badge variant="outline" className="text-xs">
            {assignment.duration_minutes || 0} min duration
          </Badge>
        </div>
      </div>

      {/* Notes */}
      {assignment.notes && (
        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 mb-4">
          <span className="font-medium">Notes:</span> {assignment.notes}
        </div>
      )}

      {/* Expand/Collapse Button */}
      <Button 
        variant="outline" 
        className="w-full mb-4"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>
            <ChevronUp className="w-4 h-4 mr-2" />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-2" />
            Show All Sign-Offs, Inspections & Signatures ({signOffs.length} sign-offs, {inspections.length} post-clean, {preOpInspections.length} pre-op)
          </>
        )}
      </Button>

      {/* Expanded Details - 3 Column Layout */}
      {expanded && (
        <div className="border-t pt-4">
          {/* Asset Filter Banner */}
          {selectedAssetFilter && (
            <div className="mb-3 p-2 bg-purple-100 border border-purple-300 rounded-lg flex items-center justify-between">
              <span className="text-sm text-purple-800">
                Filtering by asset: <strong>{selectedAssetFilter.name}</strong>
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedAssetFilter(null)}
                className="h-6 px-2 text-purple-700 hover:text-purple-900 hover:bg-purple-200"
              >
                Clear Filter
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* LEFT: Cleaning Sign-Offs */}
            <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-200">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                <PenTool className="w-4 h-4 text-purple-600" />
                Cleaning Sign-Offs ({signOffs.length})
              </h4>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {signOffs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No sign-offs recorded</p>
                ) : signOffs.map((signOff, idx) => {
                  const area = areas.find(a => a.id === signOff.area_id);
                  const asset = assets.find(a => a.id === signOff.asset_id);
                  const isSelected = selectedAssetFilter?.id === signOff.asset_id;
                  
                  return (
                    <div 
                      key={signOff.id || idx} 
                      className={cn(
                        "p-2 bg-white rounded-lg border text-xs cursor-pointer transition-all hover:shadow-md",
                        isSelected ? "border-purple-500 ring-2 ring-purple-300" : "border-slate-200 hover:border-purple-300"
                      )}
                      onClick={() => setSelectedAssetFilter(
                        isSelected ? null : { id: signOff.asset_id, name: asset?.name || "Asset" }
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="font-medium text-slate-900">{asset?.name || "Asset"}</p>
                          <p className="text-slate-500">{area?.name || "Area"}</p>
                        </div>
                        <Badge className={cn(
                          "text-[10px] px-1.5",
                          signOff.status === "passed_inspection" ? "bg-emerald-600" :
                          signOff.status === "failed_inspection" ? "bg-rose-600" :
                          "bg-amber-500"
                        )}>
                          {signOff.status === "passed_inspection" ? "Pass" :
                           signOff.status === "failed_inspection" ? "Fail" : "Pending"}
                        </Badge>
                      </div>
                      <div className="text-slate-600 space-y-0.5">
                        <div><span className="text-slate-400">By:</span> {signOff.employee_name || signOff.employee_email}</div>
                        {signOff.signed_off_at && (
                          <div><span className="text-slate-400">At:</span> {format(parseISO(signOff.signed_off_at), "MMM d, h:mm a")}</div>
                        )}
                        {signOff.hours_worked > 0 && (
                          <div><span className="text-slate-400">Hours:</span> {signOff.hours_worked}h</div>
                        )}
                      </div>
                      {signOff.notes && (
                        <p className="mt-1 text-slate-600 bg-slate-50 p-1.5 rounded text-[10px]">
                          {signOff.notes}
                        </p>
                      )}
                      {/* ATP */}
                      {signOff.atp_test_result && signOff.atp_test_result !== "not_required" && (
                        <div className={cn(
                          "mt-2 p-1.5 rounded text-[10px]",
                          signOff.atp_test_result === "pass" ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"
                        )}>
                          <div className="flex items-center gap-1">
                            <Droplet className="w-3 h-3" />
                            <span className="font-medium">ATP: {signOff.atp_test_result.toUpperCase()}</span>
                            {signOff.atp_test_value && <span>({signOff.atp_test_value} RLU)</span>}
                          </div>
                        </div>
                      )}
                      {/* Signature */}
                      {signOff.signature_data && (
                        <div className="mt-2 pt-1.5 border-t">
                          <p className="text-[10px] text-slate-400 mb-1">Signature</p>
                          <img 
                            src={signOff.signature_data} 
                            alt="Signature" 
                            className="h-8 bg-white border rounded object-contain"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MIDDLE: Post-Clean Inspections */}
            <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-200">
              {(() => {
                // Filter inspections based on selected asset
                const filteredInspections = selectedAssetFilter 
                  ? inspections.filter(inspection => {
                      if (!inspection.results) return false;
                      const results = typeof inspection.results === 'string' ? JSON.parse(inspection.results) : inspection.results;
                      return Object.keys(results).includes(selectedAssetFilter.id);
                    })
                  : inspections;

                return (
                  <>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                      <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                      Post-Clean Inspections ({filteredInspections.length})
                      {selectedAssetFilter && inspections.length !== filteredInspections.length && (
                        <span className="text-[10px] text-indigo-500 font-normal">
                          (filtered from {inspections.length})
                        </span>
                      )}
                    </h4>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {filteredInspections.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">
                          {selectedAssetFilter ? `No inspections for ${selectedAssetFilter.name}` : "No post-clean inspections recorded"}
                        </p>
                      ) : filteredInspections.map((inspection, idx) => {
                        const area = areas.find(a => a.id === inspection.area_id);
                        const results = inspection.results 
                          ? (typeof inspection.results === 'string' ? JSON.parse(inspection.results) : inspection.results)
                          : {};
                        
                        // If filtered, only show the selected asset's result
                        const displayResults = selectedAssetFilter 
                          ? { [selectedAssetFilter.id]: results[selectedAssetFilter.id] }
                          : results;

                        return (
                          <div key={inspection.id || idx} className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <p className="font-medium text-slate-900">{area?.name || "Area"}</p>
                                <p className="text-slate-500">
                                  {inspection.inspector_name || inspection.inspector_email}
                                </p>
                              </div>
                              <Badge className={cn(
                                "text-[10px] px-1.5",
                                inspection.passed_assets === inspection.total_assets 
                                  ? "bg-emerald-600" 
                                  : "bg-amber-500"
                              )}>
                                {inspection.passed_assets || 0}/{inspection.total_assets || 0}
                              </Badge>
                            </div>
                            {inspection.inspection_date && (
                              <p className="text-slate-500 text-[10px]">
                                {format(parseISO(inspection.inspection_date), "MMM d, yyyy h:mm a")}
                              </p>
                            )}
                            
                            {/* Inspection Results */}
                            {Object.keys(displayResults).length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {Object.entries(displayResults).map(([assetId, result]) => {
                                  if (!result) return null;
                                  const asset = assets.find(a => a.id === assetId);
                                  const isHighlighted = selectedAssetFilter?.id === assetId;
                                  return (
                                    <div key={assetId} className={cn(
                                      "flex items-center gap-1 text-[10px]",
                                      isHighlighted && "bg-purple-100 p-1 rounded font-medium"
                                    )}>
                                      <span className={result.passed ? "text-emerald-600" : "text-rose-600"}>
                                        {result.passed ? "✓" : "✗"}
                                      </span>
                                      <span>{asset?.name || assetId}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {inspection.overall_notes && (
                              <p className="mt-1.5 text-slate-600 bg-slate-50 p-1.5 rounded text-[10px]">
                                {inspection.overall_notes}
                              </p>
                            )}

                            {/* Inspection Signature */}
                            {inspection.signature_data && (
                              <div className="mt-2 pt-1.5 border-t">
                                <p className="text-[10px] text-slate-400 mb-1">Inspector Signature</p>
                                <img 
                                  src={inspection.signature_data} 
                                  alt="Inspector Signature" 
                                  className="h-8 bg-white border rounded object-contain"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* RIGHT: Pre-Op Inspections */}
            <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-200">
              {(() => {
                // Filter pre-ops based on selected asset
                const filteredPreOps = selectedAssetFilter 
                  ? preOpInspections.filter(preOp => {
                      if (!preOp.asset_results) return false;
                      return preOp.asset_results.some(r => r.asset_id === selectedAssetFilter.id);
                    })
                  : preOpInspections;

                return (
                  <>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                      <Factory className="w-4 h-4 text-amber-600" />
                      Pre-Op Inspections ({filteredPreOps.length})
                      {selectedAssetFilter && preOpInspections.length !== filteredPreOps.length && (
                        <span className="text-[10px] text-amber-600 font-normal">
                          (filtered from {preOpInspections.length})
                        </span>
                      )}
                    </h4>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {filteredPreOps.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">
                          {selectedAssetFilter ? `No pre-ops for ${selectedAssetFilter.name}` : "No pre-op inspections recorded"}
                        </p>
                      ) : filteredPreOps.map((preOp, idx) => {
                        // If filtered, only show the selected asset's result
                        const displayAssetResults = selectedAssetFilter && preOp.asset_results
                          ? preOp.asset_results.filter(r => r.asset_id === selectedAssetFilter.id)
                          : preOp.asset_results;

                        return (
                          <div key={preOp.id || idx} className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <p className="font-medium text-slate-900">
                                  {preOp.production_line_name || "Line"}
                                </p>
                                <p className="text-slate-500">{preOp.inspector_name}</p>
                              </div>
                              <Badge className={cn(
                                "text-[10px] px-1.5",
                                preOp.status === "passed" ? "bg-emerald-600" :
                                preOp.status === "failed" ? "bg-rose-600" :
                                "bg-amber-500"
                              )}>
                                {preOp.status === "passed" ? "Passed" :
                                 preOp.status === "failed" ? "Failed" : "Pending"}
                              </Badge>
                            </div>
                            {preOp.inspection_date && (
                              <p className="text-slate-500 text-[10px]">
                                {format(parseISO(preOp.inspection_date), "MMM d, yyyy h:mm a")}
                              </p>
                            )}

                            {/* Asset Results */}
                            {displayAssetResults && displayAssetResults.length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {(selectedAssetFilter ? displayAssetResults : displayAssetResults.slice(0, 5)).map((result, rIdx) => {
                                  const isHighlighted = selectedAssetFilter?.id === result.asset_id;
                                  return (
                                    <div key={rIdx} className={cn(
                                      "flex items-center gap-1 text-[10px]",
                                      isHighlighted && "bg-purple-100 p-1 rounded font-medium"
                                    )}>
                                      <span className={result.status === "pass" ? "text-emerald-600" : "text-rose-600"}>
                                        {result.status === "pass" ? "✓" : "✗"}
                                      </span>
                                      <span>{result.asset_name}</span>
                                    </div>
                                  );
                                })}
                                {!selectedAssetFilter && preOp.asset_results && preOp.asset_results.length > 5 && (
                                  <p className="text-[10px] text-slate-400">+{preOp.asset_results.length - 5} more</p>
                                )}
                              </div>
                            )}

                            {preOp.notes && (
                              <p className="mt-1.5 text-slate-600 bg-slate-50 p-1.5 rounded text-[10px]">
                                {preOp.notes}
                              </p>
                            )}

                            {/* Pre-Op Signature */}
                            {preOp.signature_data && (
                              <div className="mt-2 pt-1.5 border-t">
                                <p className="text-[10px] text-slate-400 mb-1">Inspector Signature</p>
                                <img 
                                  src={preOp.signature_data} 
                                  alt="Inspector Signature" 
                                  className="h-8 bg-white border rounded object-contain"
                                />
                              </div>
                            )}

                            {preOp.passed_at && (
                              <p className="mt-1 text-[10px] text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Cleared: {format(parseISO(preOp.passed_at), "h:mm a")}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Created By */}
      {assignment.created_by_manager_name && (
        <div className="mt-3 text-xs text-slate-500">
          Created by {assignment.created_by_manager_name}
        </div>
      )}
    </Card>
  );
}