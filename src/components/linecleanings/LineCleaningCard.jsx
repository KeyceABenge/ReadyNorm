import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, PlayCircle, ClipboardCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ProductionLineRepo } from "@/lib/adapters/database";
import { useState, useEffect } from "react";

export default function LineCleaningCard({ assignment, line, areas, assets, assetGroups, areaSignOffs, onStart, onViewDetails, preOpInspection }) {
  const [lineData, setLineData] = useState(line);

  const { data: fetchedLine } = useQuery({
    queryKey: ["production_line", assignment?.production_line_id],
    queryFn: () => ProductionLineRepo.list().then(lines => lines.find(l => l.id === assignment.production_line_id)),
    enabled: !!assignment?.production_line_id && !line?.name
  });

  useEffect(() => {
    if (fetchedLine) {
      setLineData(fetchedLine);
    }
  }, [fetchedLine]);
  const statusConfig = {
    scheduled: { class: "bg-blue-100 text-blue-800", label: "Scheduled" },
    in_progress: { class: "bg-amber-100 text-amber-800", label: "In Progress" },
    completed: { class: "bg-emerald-100 text-emerald-800", label: "Completed" }
  };

  const status = statusConfig[assignment.status] || statusConfig.scheduled;
  
  // Calculate progress
  const lineAreas = areas || [];
  const completedAreas = (areaSignOffs || []).filter(s => s.line_cleaning_assignment_id === assignment.id).length;
  const progress = lineAreas.length > 0 ? Math.round((completedAreas / lineAreas.length) * 100) : 0;

  // Get actual completion time
  const areaSignOffsForAssignment = (areaSignOffs || []).filter(s => s.line_cleaning_assignment_id === assignment.id);
  const actualCompletion = areaSignOffsForAssignment.length > 0
    ? areaSignOffsForAssignment.reduce((latest, current) => {
        const latestDate = new Date(latest.signed_off_at || 0);
        const currentDate = new Date(current.signed_off_at || 0);
        return currentDate > latestDate ? current : latest;
      }).signed_off_at
    : null;

  return (
    <Card className="p-6 bg-white border shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
            1
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">{lineData?.name || "Loading..."}</h3>
              <Badge className={cn("text-xs font-medium", status.class)}>
                {status.label}
              </Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">{assignment.assigned_employees || 1} employee{(assignment.assigned_employees || 1) !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  {assignment.estimated_start_time ? format(new Date(assignment.estimated_start_time), "h:mm a") : "Not set"} - {assignment.estimated_end_time ? format(new Date(assignment.estimated_end_time), "h:mm a") : "Not set"} ({(assignment.estimated_total_hours || 0).toFixed(1)}h)
                </span>
              </div>
              {actualCompletion && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <Calendar className="w-4 h-4" />
                  <span>Finished: {format(new Date(actualCompletion), "MMM d, h:mm a")}</span>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 space-y-1 border-t border-slate-200 pt-3">
              {lineAreas.map(area => {
                const areaAssets = (assets || []).filter(a => a.area_id === area.id);
                const areaGroups = (assetGroups || []).filter(g => g.area_id === area.id);
                const groupedAssetIds = areaGroups.flatMap(g => g.asset_ids || []);
                const ungroupedAssets = areaAssets.filter(a => !groupedAssetIds.includes(a.id));

                let lockedHours = 0;
                let unlockedHours = 0;

                areaGroups.forEach(g => {
                  if (g.is_locked) lockedHours += g.estimated_hours || 0;
                  else unlockedHours += g.estimated_hours || 0;
                });
                ungroupedAssets.forEach(a => {
                  if (a.is_locked) lockedHours += a.estimated_hours || 0;
                  else unlockedHours += a.estimated_hours || 0;
                });

                const numEmployees = assignment.assigned_employees || 1;
                const adjustedHours = lockedHours + (unlockedHours / numEmployees);

                return (
                  <div key={area.id} className="flex justify-between">
                    <span>{area.name}:</span>
                    <span className="font-medium">{adjustedHours.toFixed(1)}h</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Progress</span>
                <span className="text-sm font-medium text-slate-600">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Pre-Op Inspection Status */}
            {preOpInspection && (
              <div className={cn(
                "mt-3 p-3 rounded-lg border text-sm",
                preOpInspection.status === "passed" ? "bg-emerald-50 border-emerald-200" :
                preOpInspection.status === "failed" ? "bg-rose-50 border-rose-200" :
                "bg-amber-50 border-amber-200"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardCheck className="w-4 h-4" />
                  <span className="font-semibold">Pre-Op Inspection</span>
                  <Badge className={cn("text-xs ml-auto",
                    preOpInspection.status === "passed" ? "bg-emerald-100 text-emerald-800" :
                    preOpInspection.status === "failed" ? "bg-rose-100 text-rose-800" :
                    "bg-amber-100 text-amber-800"
                  )}>
                    {preOpInspection.status === "passed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {preOpInspection.status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
                    {preOpInspection.status === "passed" ? "Passed" :
                     preOpInspection.status === "failed" ? "Failed" : "In Progress"}
                  </Badge>
                </div>
                <div className="text-xs text-slate-600">
                  Inspector: {preOpInspection.inspector_name}
                  {preOpInspection.inspection_date && ` • ${format(new Date(preOpInspection.inspection_date), "MMM d, h:mm a")}`}
                </div>
                {preOpInspection.status === "failed" && (
                  <div className="mt-2 flex items-center gap-1.5 text-rose-700 font-medium text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {(preOpInspection.asset_results || []).filter(r => r.status === "fail").length} failed item(s) — re-clean required
                  </div>
                )}
                {preOpInspection.notes && (
                  <div className="mt-1 text-xs text-slate-600">Notes: {preOpInspection.notes}</div>
                )}
              </div>
            )}

            <div className="text-xs text-slate-500 mt-3">
              <span className="font-medium">Open for all employees to work on</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        {assignment.status === "scheduled" && onStart && (
          <Button 
            size="sm" 
            onClick={() => onStart(assignment)}
            className="bg-slate-900 hover:bg-slate-800"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Cleaning
          </Button>
        )}
        {assignment.status === "in_progress" && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onViewDetails(assignment)}
          >
            Continue Cleaning
          </Button>
        )}
        {assignment.status === "completed" && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onViewDetails(assignment)}
          >
            View Details
          </Button>
        )}
      </div>
    </Card>
  );
}