// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronDown, ChevronUp, Package2, Calendar
} from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import LineCleaningAssignmentRecordCard from "@/components/dashboard/LineCleaningAssignmentRecordCard";
import RecordsExpectedActualBanner from "./RecordsExpectedActualBanner";

export default function LineInspectionGroupView({ 
  assignments = [],
  signOffs = [],
  inspections = [],
  preOpInspections = [],
  productionLines = [],
  areas = [],
  assets = [],
  onViewAssignment
}) {
  const [expandedLines, setExpandedLines] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");

  // Calculate overall expected vs actual for banner
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === "completed").length;
  const passedInspections = signOffs.filter(s => s.status === "passed_inspection").length;
  const failedInspections = signOffs.filter(s => s.status === "failed_inspection").length;
  const missedAssignments = assignments.filter(a => {
    if (a.status === "completed") return false;
    const scheduledDate = a.scheduled_date ? parseISO(a.scheduled_date) : null;
    return scheduledDate && scheduledDate < new Date();
  }).length;

  // Build a lookup from assignment ID -> production line ID using ALL assignments
  // (inspections/signOffs reference assignments that may be outside the date-filtered set)
  const assignmentToLineMap = {};
  assignments.forEach(a => { assignmentToLineMap[a.id] = a.production_line_id; });

  // Also index sign-offs and inspections by their assignment's line
  // For sign-offs/inspections whose assignment isn't in the current filtered set,
  // try to find the line from the inspection's own area_id -> area -> production_line_id
  const getLineIdForRecord = (record) => {
    if (assignmentToLineMap[record.line_cleaning_assignment_id]) {
      return assignmentToLineMap[record.line_cleaning_assignment_id];
    }
    // Fallback: look up area to find line
    if (record.area_id) {
      const area = areas.find(a => a.id === record.area_id);
      if (area?.production_line_id) return area.production_line_id;
    }
    return null;
  };

  // Group by production line, then by week
  const groupedByLine = productionLines.reduce((acc, line) => {
    const lineAssignments = assignments.filter(a => a.production_line_id === line.id);
    const lineSignOffs = signOffs.filter(s => getLineIdForRecord(s) === line.id);
    const lineInspections = inspections.filter(i => getLineIdForRecord(i) === line.id);
    const linePreOps = preOpInspections.filter(p => p.production_line_id === line.id);

    if (lineAssignments.length > 0 || linePreOps.length > 0 || lineInspections.length > 0 || lineSignOffs.length > 0) {
      acc[line.id] = {
        line,
        assignments: lineAssignments,
        signOffs: lineSignOffs,
        inspections: lineInspections,
        preOpInspections: linePreOps
      };
    }
    return acc;
  }, {});

  const toggleLine = (lineId) => {
    setExpandedLines(prev => ({ ...prev, [lineId]: !prev[lineId] }));
  };

  if (Object.keys(groupedByLine).length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No line inspection records found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Expected vs Actual Banner */}
      <RecordsExpectedActualBanner
        expected={totalAssignments}
        completedOnTime={passedInspections}
        completedLate={failedInspections}
        missed={missedAssignments}
        reopened={0}
        onFilterChange={setActiveFilter}
        activeFilter={activeFilter}
      />

      {Object.entries(groupedByLine).map(([lineId, data]) => {
        const isExpanded = expandedLines[lineId] !== false;
        const { line, assignments: lineAssignments, signOffs: lineSignOffs, inspections: lineInspections, preOpInspections: linePreOps } = data;

        // Calculate line stats
        const totalSignOffs = lineSignOffs.length;
        const passedSignOffs = lineSignOffs.filter(s => s.status === "passed_inspection").length;
        const totalPreOps = linePreOps.length;
        const passedPreOps = linePreOps.filter(p => p.status === "passed").length;
        
        // Pass rate: use sign-offs if available, otherwise fall back to pre-ops
        const passRate = totalSignOffs > 0 
          ? Math.round((passedSignOffs / totalSignOffs) * 100) 
          : totalPreOps > 0 
            ? Math.round((passedPreOps / totalPreOps) * 100) 
            : 0;

        // Group assignments by week
        const assignmentsByWeek = lineAssignments.reduce((acc, assignment) => {
          const date = parseISO(assignment.scheduled_date || assignment.created_date);
          const weekStart = startOfWeek(date, { weekStartsOn: 0 });
          const weekKey = format(weekStart, "yyyy-MM-dd");
          if (!acc[weekKey]) {
            acc[weekKey] = {
              weekStart,
              weekEnd: endOfWeek(weekStart, { weekStartsOn: 0 }),
              assignments: []
            };
          }
          acc[weekKey].assignments.push(assignment);
          return acc;
        }, {});

        // Also create week groups for pre-op inspections and post-clean inspections
        // that fall in weeks with NO assignments (so they still appear)
        [...linePreOps, ...lineInspections].forEach(record => {
          const dateStr = record.inspection_date || record.created_date;
          if (!dateStr) return;
          const date = parseISO(dateStr);
          if (isNaN(date.getTime())) return;
          const ws = startOfWeek(date, { weekStartsOn: 0 });
          const weekKey = format(ws, "yyyy-MM-dd");
          if (!assignmentsByWeek[weekKey]) {
            assignmentsByWeek[weekKey] = {
              weekStart: ws,
              weekEnd: endOfWeek(ws, { weekStartsOn: 0 }),
              assignments: []
            };
          }
        });

        return (
          <Card key={lineId} className={cn(
            "transition-all",
            passRate >= 90 ? "border-emerald-200" : 
            passRate >= 70 ? "border-amber-200" : 
            "border-red-200"
          )}>
            <CardHeader 
              className="cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleLine(lineId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    passRate >= 90 ? "bg-emerald-100" :
                    passRate >= 70 ? "bg-amber-100" :
                    "bg-red-100"
                  )}>
                    <Package2 className={cn(
                      "w-5 h-5",
                      passRate >= 90 ? "text-emerald-600" :
                      passRate >= 70 ? "text-amber-600" :
                      "text-red-600"
                    )} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{line.name}</CardTitle>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>{lineAssignments.length} cleanings</span>
                      <span>•</span>
                      <span>{linePreOps.length} pre-ops</span>
                      <span>•</span>
                      <span>{lineInspections.length} post-cleans</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={cn(
                      "text-lg font-bold",
                      passRate >= 90 ? "text-emerald-600" :
                      passRate >= 70 ? "text-amber-600" :
                      "text-red-600"
                    )}>
                      {passRate}%
                    </div>
                    <div className="text-xs text-slate-500">pass rate</div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
              <Progress value={passRate} className="mt-3 h-1.5" />
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900">{lineAssignments.filter(a => a.status === "completed").length}</div>
                    <div className="text-xs text-slate-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600">{passedSignOffs}</div>
                    <div className="text-xs text-slate-500">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{totalSignOffs - passedSignOffs}</div>
                    <div className="text-xs text-slate-500">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{passedPreOps}/{totalPreOps}</div>
                    <div className="text-xs text-slate-500">Pre-Ops</div>
                  </div>
                </div>

                {/* Weekly Breakdown */}
                {Object.entries(assignmentsByWeek)
                  .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                  .map(([weekKey, weekData]) => (
                    <WeekGroup 
                      key={weekKey}
                      weekData={weekData}
                      signOffs={lineSignOffs}
                      inspections={lineInspections}
                      preOpInspections={linePreOps}
                      areas={areas}
                      assets={assets}
                      onViewAssignment={onViewAssignment}
                    />
                  ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function WeekGroup({ weekData, signOffs, inspections, preOpInspections, areas, assets, onViewAssignment }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const { weekStart, weekEnd, assignments } = weekData;

  const assignmentIds = new Set(assignments.map(a => a.id));
  const weekSignOffs = signOffs.filter(s => assignmentIds.has(s.line_cleaning_assignment_id));
  
  // For weeks with assignments, match inspections by assignment ID
  // For weeks without assignments, match inspections by date falling in the week
  const weekInspections = assignments.length > 0 
    ? inspections.filter(i => assignmentIds.has(i.line_cleaning_assignment_id))
    : inspections.filter(i => {
        const dateStr = i.inspection_date || i.created_date;
        if (!dateStr) return false;
        const iDate = parseISO(dateStr);
        return iDate >= weekStart && iDate <= weekEnd;
      });
  
  const weekPreOps = preOpInspections.filter(p => {
    if (!p.inspection_date) return false;
    const pDate = parseISO(p.inspection_date);
    return pDate >= weekStart && pDate <= weekEnd;
  });

  const completed = assignments.filter(a => a.status === "completed").length;
  const passed = weekSignOffs.filter(s => s.status === "passed_inspection").length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-900">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </span>
          {assignments.length > 0 && (
            <Badge variant="secondary" className="text-xs rounded-full">
              {assignments.length} cleaning{assignments.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {weekPreOps.length > 0 && (
            <Badge className="text-xs rounded-full bg-blue-100 text-blue-700">
              {weekPreOps.length} pre-op{weekPreOps.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {assignments.length > 0 ? (
            <>
              <span className="text-sm text-slate-600">{completed}/{assignments.length} completed</span>
              <Badge className={cn("rounded-full", passed === weekSignOffs.length && weekSignOffs.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                {passed}/{weekSignOffs.length} passed
              </Badge>
            </>
          ) : (
            <span className="text-sm text-slate-600">
              {weekPreOps.length > 0 ? `${weekPreOps.filter(p => p.status === "passed").length}/${weekPreOps.length} pre-ops passed` : ""}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t p-3 space-y-3">
          {assignments.length > 0 ? assignments.map(assignment => {
            const assignmentSignOffs = weekSignOffs.filter(s => s.line_cleaning_assignment_id === assignment.id);
            const assignmentInspections = weekInspections.filter(i => i.line_cleaning_assignment_id === assignment.id);
            const assignmentPreOps = weekPreOps.filter(p => p.production_line_id === assignment.production_line_id);
            
            return (
              <LineCleaningAssignmentRecordCard 
                key={assignment.id}
                assignment={assignment}
                line={null}
                signOffs={assignmentSignOffs}
                inspections={assignmentInspections}
                preOpInspections={assignmentPreOps}
                areas={areas}
                assets={assets}
              />
            );
          }) : (
            /* Week has no assignments but has standalone inspections — render as synthetic assignment cards per line */
            (() => {
              // Group standalone records by production line
              const lineGroups = {};
              weekPreOps.forEach(p => {
                const lid = p.production_line_id;
                if (!lineGroups[lid]) lineGroups[lid] = { preOps: [], inspections: [], signOffs: [], lineName: p.production_line_name || "Production Line" };
                lineGroups[lid].preOps.push(p);
              });
              weekInspections.forEach(i => {
                // Try to determine line from area
                const area = areas.find(a => a.id === i.area_id);
                const lid = area?.production_line_id || "unknown";
                if (!lineGroups[lid]) lineGroups[lid] = { preOps: [], inspections: [], signOffs: [], lineName: "Production Line" };
                lineGroups[lid].inspections.push(i);
              });

              return Object.entries(lineGroups).map(([lid, group]) => {
                // Build a synthetic assignment so the card renders with full formatting
                const syntheticAssignment = {
                  id: `synthetic-${lid}-${format(weekStart, "yyyy-MM-dd")}`,
                  production_line_id: lid,
                  production_line_name: group.lineName,
                  scheduled_date: format(weekStart, "yyyy-MM-dd"),
                  status: "scheduled",
                  areas_snapshot: [],
                  assets_snapshot: [],
                  duration_minutes: 0
                };
                return (
                  <LineCleaningAssignmentRecordCard
                    key={syntheticAssignment.id}
                    assignment={syntheticAssignment}
                    line={null}
                    signOffs={group.signOffs}
                    inspections={group.inspections}
                    preOpInspections={group.preOps}
                    areas={areas}
                    assets={assets}
                  />
                );
              });
            })()
          )}
        </div>
      )}
    </div>
  );
}