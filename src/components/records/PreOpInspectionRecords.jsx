import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, ChevronRight, CheckCircle2, XCircle, 
  Factory, Clock, User, Calendar, RotateCcw
} from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";

export default function PreOpInspectionRecords({ inspections, productionLines }) {
  const [expandedLines, setExpandedLines] = useState({});
  const [expandedCycles, setExpandedCycles] = useState({});

  // Group inspections by production line, then by pre-op cycle
  // A "cycle" is a series of inspections for the same line until it passes
  // Inspections within ~4 hours of each other (or until a "passed" status) belong to the same cycle
  const groupedByLine = {};
  
  inspections.forEach(inspection => {
    const lineId = inspection.production_line_id;
    const lineName = inspection.production_line_name || 
      productionLines.find(l => l.id === lineId)?.name || 
      "Unknown Line";
    
    if (!groupedByLine[lineId]) {
      groupedByLine[lineId] = {
        lineName,
        lineId,
        inspections: []
      };
    }
    
    groupedByLine[lineId].inspections.push(inspection);
  });

  // Now group inspections into cycles within each line
  // A cycle ends when an inspection passes, or if there's a gap of more than 8 hours
  Object.values(groupedByLine).forEach(lineGroup => {
    // Sort by date ascending to process in order
    lineGroup.inspections.sort((a, b) => 
      new Date(a.inspection_date || a.created_date) - new Date(b.inspection_date || b.created_date)
    );
    
    const cycles = [];
    let currentCycle = null;
    
    lineGroup.inspections.forEach(inspection => {
      const inspDate = new Date(inspection.inspection_date || inspection.created_date);
      
      // Start a new cycle if:
      // 1. No current cycle exists
      // 2. Previous cycle ended with a "passed" status
      // 3. Gap of more than 8 hours from last inspection in cycle
      const shouldStartNewCycle = !currentCycle || 
        currentCycle.finalStatus === "passed" ||
        (currentCycle.lastDate && differenceInHours(inspDate, currentCycle.lastDate) > 8);
      
      if (shouldStartNewCycle) {
        currentCycle = {
          id: inspection.id, // Use first inspection's ID as cycle ID
          inspections: [],
          startDate: inspDate,
          lastDate: inspDate,
          finalStatus: inspection.status
        };
        cycles.push(currentCycle);
      }
      
      currentCycle.inspections.push(inspection);
      currentCycle.lastDate = inspDate;
      currentCycle.finalStatus = inspection.status;
      
      // If this inspection passed, it ends the cycle
      if (inspection.status === "passed") {
        currentCycle.passedAt = inspection.passed_at;
      }
    });
    
    // Reverse to show most recent cycles first
    lineGroup.cycles = cycles.reverse();
  });

  const toggleLine = (lineId) => {
    setExpandedLines(prev => ({ ...prev, [lineId]: !prev[lineId] }));
  };

  const toggleCycle = (cycleId) => {
    setExpandedCycles(prev => ({ ...prev, [cycleId]: !prev[cycleId] }));
  };

  if (Object.keys(groupedByLine).length === 0) {
    return (
      <p className="text-slate-500 text-sm py-8 text-center">
        No pre-operational inspection records found
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {Object.values(groupedByLine).map(lineGroup => {
        const isLineExpanded = expandedLines[lineGroup.lineId] !== false; // Default expanded
        const totalCycles = lineGroup.cycles?.length || 0;
        const passedCycles = lineGroup.cycles?.filter(c => c.finalStatus === "passed").length || 0;
        
        return (
          <Card key={lineGroup.lineId} className="overflow-hidden border-0 shadow-sm">
            {/* Line Header */}
            <button
              onClick={() => toggleLine(lineGroup.lineId)}
              className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Factory className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900">{lineGroup.lineName}</h3>
                  <p className="text-sm text-slate-500">
                    {totalCycles} cycle{totalCycles !== 1 ? 's' : ''} • {passedCycles} passed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  passedCycles === totalCycles && totalCycles > 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                )}>
                  {Math.round((passedCycles / totalCycles) * 100) || 0}% pass rate
                </Badge>
                {isLineExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Cycles within this line */}
            {isLineExpanded && (
              <div className="divide-y divide-slate-100">
                {lineGroup.cycles?.map((cycle, cycleIndex) => {
                  const isCycleExpanded = expandedCycles[cycle.id];
                  const inspectionCount = cycle.inspections.length;
                  const hasRetries = inspectionCount > 1;
                  
                  // Get all unique assets across all inspections in this cycle
                  const allAssetResults = {};
                  cycle.inspections.forEach((insp, inspIdx) => {
                    insp.asset_results?.forEach(asset => {
                      const key = asset.asset_id;
                      if (!allAssetResults[key]) {
                        allAssetResults[key] = {
                          asset_name: asset.asset_name,
                          area_name: asset.area_name,
                          attempts: []
                        };
                      }
                      allAssetResults[key].attempts.push({
                        ...asset,
                        inspectionIndex: inspIdx + 1,
                        inspectionDate: insp.inspection_date
                      });
                    });
                  });
                  
                  // Calculate final status of each asset (last attempt)
                  const assetsFinal = Object.values(allAssetResults).map(a => ({
                    ...a,
                    finalStatus: a.attempts[a.attempts.length - 1]?.status
                  }));
                  
                  const passedAssets = assetsFinal.filter(a => a.finalStatus === "pass").length;
                  const failedAssets = assetsFinal.filter(a => a.finalStatus === "fail").length;
                  const pendingAssets = assetsFinal.filter(a => a.finalStatus === "pending").length;
                  const totalAssets = assetsFinal.length;

                  // Group assets by area
                  const assetsByArea = {};
                  assetsFinal.forEach(asset => {
                    const areaName = asset.area_name || "Unknown Area";
                    if (!assetsByArea[areaName]) {
                      assetsByArea[areaName] = [];
                    }
                    assetsByArea[areaName].push(asset);
                  });

                  // Get inspector info from the last inspection
                  const lastInspection = cycle.inspections[cycle.inspections.length - 1];

                  return (
                    <div key={cycle.id} className="bg-white">
                      {/* Cycle Header */}
                      <button
                        onClick={() => toggleCycle(cycle.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center text-center min-w-[60px]">
                            <span className="text-xs text-slate-400 uppercase">Cycle</span>
                            <span className="text-lg font-bold text-slate-700">#{totalCycles - cycleIndex}</span>
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={cn(
                                cycle.finalStatus === "passed" ? "bg-emerald-100 text-emerald-700" :
                                cycle.finalStatus === "failed" ? "bg-rose-100 text-rose-700" :
                                "bg-amber-100 text-amber-700"
                              )}>
                                {cycle.finalStatus === "passed" ? "Passed" : 
                                 cycle.finalStatus === "failed" ? "Failed" : "In Progress"}
                              </Badge>
                              <span className="text-sm text-slate-500">
                                {passedAssets}/{totalAssets} assets passed
                              </span>
                              {hasRetries && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <RotateCcw className="w-3 h-3" />
                                  {inspectionCount} inspections
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {lastInspection?.inspector_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {cycle.startDate 
                                  ? format(cycle.startDate, "MMM d, yyyy h:mm a")
                                  : "N/A"}
                              </span>
                            </div>
                            {cycle.passedAt && (
                              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Cleared: {format(parseISO(cycle.passedAt), "MMM d, h:mm a")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Quick stats */}
                          <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                              {passedAssets} ✓
                            </span>
                            {failedAssets > 0 && (
                              <span className="px-2 py-1 rounded bg-rose-50 text-rose-700">
                                {failedAssets} ✗
                              </span>
                            )}
                            {pendingAssets > 0 && (
                              <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">
                                {pendingAssets} pending
                              </span>
                            )}
                          </div>
                          {isCycleExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Asset Details */}
                      {isCycleExpanded && (
                        <div className="px-4 pb-4 pt-0">
                          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                            {Object.entries(assetsByArea).map(([areaName, areaAssets]) => (
                              <div key={areaName}>
                                <h4 className="text-sm font-medium text-slate-700 mb-2">{areaName}</h4>
                                <div className="grid gap-2">
                                  {areaAssets.map((asset, idx) => (
                                    <div 
                                      key={idx}
                                      className={cn(
                                        "p-3 rounded-lg border",
                                        asset.finalStatus === "pass" 
                                          ? "bg-emerald-50 border-emerald-200" 
                                          : asset.finalStatus === "fail"
                                          ? "bg-rose-50 border-rose-200"
                                          : "bg-white border-slate-200"
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {asset.finalStatus === "pass" ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                          ) : asset.finalStatus === "fail" ? (
                                            <XCircle className="w-4 h-4 text-rose-600" />
                                          ) : (
                                            <Clock className="w-4 h-4 text-slate-400" />
                                          )}
                                          <span className="font-medium text-slate-900">
                                            {asset.asset_name}
                                          </span>
                                          {asset.attempts.length > 1 && (
                                            <span className="text-xs text-slate-400">
                                              ({asset.attempts.length} attempts)
                                            </span>
                                          )}
                                        </div>
                                        <Badge className={cn(
                                          "text-xs",
                                          asset.finalStatus === "pass" 
                                            ? "bg-emerald-100 text-emerald-700" 
                                            : asset.finalStatus === "fail"
                                            ? "bg-rose-100 text-rose-700"
                                            : "bg-slate-100 text-slate-600"
                                        )}>
                                          {asset.finalStatus === "pass" ? "Pass" : 
                                           asset.finalStatus === "fail" ? "Fail" : "Pending"}
                                        </Badge>
                                      </div>
                                      
                                      {/* Show attempt history if multiple */}
                                      {asset.attempts.length > 1 && (
                                        <div className="mt-2 pl-6 space-y-1 border-l-2 border-slate-200 ml-2">
                                          {asset.attempts.map((attempt, aIdx) => (
                                            <div key={aIdx} className="text-xs flex items-center gap-2">
                                              <span className={cn(
                                                "w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px]",
                                                attempt.status === "pass" ? "bg-emerald-500" :
                                                attempt.status === "fail" ? "bg-rose-500" : "bg-slate-400"
                                              )}>
                                                {aIdx + 1}
                                              </span>
                                              <span className={cn(
                                                attempt.status === "pass" ? "text-emerald-600" :
                                                attempt.status === "fail" ? "text-rose-600" : "text-slate-500"
                                              )}>
                                                {attempt.status === "pass" ? "Passed" : 
                                                 attempt.status === "fail" ? "Failed" : "Pending"}
                                              </span>
                                              {attempt.inspected_at && (
                                                <span className="text-slate-400">
                                                  {format(parseISO(attempt.inspected_at), "h:mm a")}
                                                </span>
                                              )}
                                              {attempt.comments && (
                                                <span className="text-slate-500 italic">- {attempt.comments}</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Single attempt - show comments/time */}
                                      {asset.attempts.length === 1 && (
                                        <>
                                          {asset.attempts[0].comments && (
                                            <p className="text-sm text-rose-600 mt-2 pl-6">
                                              {asset.attempts[0].comments}
                                            </p>
                                          )}
                                          {asset.attempts[0].inspected_at && (
                                            <p className="text-xs text-slate-400 mt-1 pl-6">
                                              Inspected: {format(parseISO(asset.attempts[0].inspected_at), "h:mm a")}
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {/* Inspector Signature */}
                            {lastInspection?.signature_data && (
                              <div className="mt-4 pt-3 border-t border-slate-200">
                                <p className="text-xs text-slate-500 mb-2 font-medium">Inspector Signature</p>
                                <div className="flex items-center gap-4">
                                  <img 
                                    src={lastInspection.signature_data} 
                                    alt="Inspector Signature" 
                                    className="h-12 bg-white border rounded object-contain max-w-[150px]"
                                  />
                                  <div className="text-xs text-slate-500">
                                    <p>Signed by: {lastInspection.inspector_name}</p>
                                    {lastInspection.passed_at && (
                                      <p>Date: {format(parseISO(lastInspection.passed_at), "MMM d, yyyy h:mm a")}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}