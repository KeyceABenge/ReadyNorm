// @ts-nocheck
import { useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Lock, Clock, GitBranch, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { computeAreaTimeline } from "./areaTimelineCalc";

/**
 * Inline editor for crew distribution across cleaning areas.
 * 
 * New model:
 * - Manager sets a total crew size for the line
 * - Distributes workers across concurrent areas
 * - When an area finishes, its workers flow to the next sequential area
 */
export default function AreaEmployeeEditor({
  areasSnapshot,
  assetsSnapshot,
  employeeCounts,
  totalCrewSize,
  onChange,
  onTotalCrewChange,
  onAreasSnapshotChange,
}) {
  const crew = totalCrewSize || 1;

  // Auto-clamp employee counts for concurrent groups so their sum doesn't exceed crew
  const clampedEmployeeCounts = useMemo(() => {
    if (!areasSnapshot || areasSnapshot.length === 0) return employeeCounts || {};
    const counts = { ...(employeeCounts || {}) };
    
    // Group areas by sequence
    const groups = {};
    areasSnapshot.forEach((area, idx) => {
      const seq = area.sequence_number ?? idx;
      if (!groups[seq]) groups[seq] = [];
      groups[seq].push(area.id);
    });
    
    // Only clamp concurrent groups (2+ areas sharing a sequence number)
    Object.values(groups).forEach(areaIds => {
      if (areaIds.length < 2) return; // solo areas — skip, simulation handles them
      
      // Clamp individual areas to crew
      areaIds.forEach(id => {
        counts[id] = Math.min(counts[id] || 1, crew);
      });
      
      // Check group total
      let groupTotal = areaIds.reduce((s, id) => s + (counts[id] || 1), 0);
      if (groupTotal > crew) {
        const scale = crew / groupTotal;
        let remaining = crew;
        areaIds.forEach((id, i) => {
          if (i === areaIds.length - 1) {
            counts[id] = Math.max(1, remaining);
          } else {
            const scaled = Math.max(1, Math.floor((counts[id] || 1) * scale));
            counts[id] = scaled;
            remaining -= scaled;
          }
        });
      }
    });
    
    return counts;
  }, [employeeCounts, areasSnapshot, crew]);

  // Push clamped counts back to parent if they differ
  useEffect(() => {
    if (!employeeCounts) return;
    const changed = Object.keys(clampedEmployeeCounts).some(
      id => clampedEmployeeCounts[id] !== (employeeCounts[id] || 1)
    );
    if (changed) {
      onChange(clampedEmployeeCounts);
    }
  }, [clampedEmployeeCounts]);

  // Pre-compute which sequence groups are concurrent (have 2+ areas)
  const concurrentSeqs = useMemo(() => {
    if (!areasSnapshot || areasSnapshot.length === 0) return new Set();
    const seqCounts = {};
    areasSnapshot.forEach((area, idx) => {
      const seq = area.sequence_number ?? idx;
      seqCounts[seq] = (seqCounts[seq] || 0) + 1;
    });
    return new Set(Object.entries(seqCounts).filter(([, c]) => c > 1).map(([s]) => Number(s)));
  }, [areasSnapshot]);

  const areaData = useMemo(() => {
    if (!areasSnapshot || areasSnapshot.length === 0) return [];

    return areasSnapshot.map((area, idx) => {
      const areaAssets = (assetsSnapshot || []).filter(
        (a) => a.area_id === area.id
      );
      const totalHours = areaAssets.reduce(
        (sum, a) => sum + (a.estimated_hours || 0),
        0
      );
      const lockedAssets = areaAssets.filter((a) => a.is_locked);
      const lockedHours = lockedAssets.reduce(
        (sum, a) => sum + (a.estimated_hours || 0),
        0
      );
      const divisibleHours = totalHours - lockedHours;
      const count = clampedEmployeeCounts[area.id] || 1;

      const seq = area.sequence_number ?? idx;
      const isConcurrent = idx > 0 && seq === (areasSnapshot[idx - 1].sequence_number ?? (idx - 1));
      const isInConcurrentGroup = concurrentSeqs.has(seq);
      
      return {
        ...area,
        index: idx,
        assetCount: areaAssets.length,
        totalHours,
        lockedHours,
        divisibleHours,
        lockedCount: lockedAssets.length,
        employeeCount: count,
        sequenceNumber: seq,
        isConcurrent,
        isInConcurrentGroup,
      };
    });
  }, [areasSnapshot, assetsSnapshot, clampedEmployeeCounts, concurrentSeqs]);

  // Group areas by sequence for validation
  const seqGroups = useMemo(() => {
    const groups = {};
    areaData.forEach(a => {
      if (!groups[a.sequenceNumber]) groups[a.sequenceNumber] = [];
      groups[a.sequenceNumber].push(a);
    });
    return groups;
  }, [areaData]);

  // Get actual simulation results to show real worker counts and effective hours
  const simulatedInfo = useMemo(() => {
    const { areaTimeline } = computeAreaTimeline(areasSnapshot, assetsSnapshot, clampedEmployeeCounts, crew);
    const info = {};
    areaTimeline.forEach(a => {
      // Show initial workers (first segment) for the editor display
      const initialWorkers = a.segments && a.segments.length > 0 ? a.segments[0].workers : a.employeeCount;
      const segmentSummary = a.segments && a.segments.length > 1
        ? a.segments.map(s => `${s.workers}p`).join(" → ")
        : null;
      info[a.id] = { workers: initialWorkers, effectiveHours: a.effectiveHours, segmentSummary };
    });
    return info;
  }, [areasSnapshot, assetsSnapshot, clampedEmployeeCounts, crew]);


  // Calculate total duration using waterfall timeline
  const totalDurationMinutes = useMemo(() => {
    const { totalHours } = computeAreaTimeline(areasSnapshot, assetsSnapshot, employeeCounts, crew);
    return Math.ceil(totalHours * 60);
  }, [areasSnapshot, assetsSnapshot, employeeCounts, crew]);

  if (areaData.length === 0) return null;

  const handleCountChange = (areaId, value) => {
    let num = Math.max(1, parseInt(value) || 1);

    // Find the concurrent group this area belongs to
    const area = areaData.find(a => a.id === areaId);
    if (area) {
      const groupAreas = seqGroups[area.sequenceNumber] || [];
      const othersTotal = groupAreas
        .filter(a => a.id !== areaId)
        .reduce((s, a) => s + a.employeeCount, 0);
      const maxForThisArea = Math.max(1, crew - othersTotal);
      num = Math.min(num, maxForThisArea);
    }

    onChange({ ...clampedEmployeeCounts, [areaId]: num });
  };

  const handleDragEnd = (result) => {
    if (!result.destination || !onAreasSnapshotChange) return;
    const fromIdx = result.source.index;
    const toIdx = result.destination.index;
    if (fromIdx === toIdx) return;

    const reordered = Array.from(areasSnapshot);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const updated = reordered.map((a, i) => ({ ...a, sequence_number: i }));
    onAreasSnapshotChange(updated);
  };

  const toggleConcurrent = (idx) => {
    if (idx === 0 || !onAreasSnapshotChange) return;
    const updated = areasSnapshot.map((a) => ({ ...a }));
    const prevSeq = updated[idx - 1].sequence_number ?? (idx - 1);
    const currentSeq = updated[idx].sequence_number ?? idx;
    const wasConcurrent = currentSeq === prevSeq;

    if (wasConcurrent) {
      let nextSeq = prevSeq + 1;
      for (let i = idx; i < updated.length; i++) {
        if (i === idx) {
          updated[i].sequence_number = nextSeq;
        } else {
          const mySeq = areasSnapshot[i].sequence_number ?? i;
          const myPrevSeq = areasSnapshot[i - 1].sequence_number ?? (i - 1);
          const wasGrouped = mySeq === myPrevSeq;
          if (wasGrouped) {
            updated[i].sequence_number = updated[i - 1].sequence_number;
          } else {
            nextSeq = (updated[i - 1].sequence_number ?? (i - 1)) + 1;
            updated[i].sequence_number = nextSeq;
          }
        }
      }
    } else {
      updated[idx].sequence_number = prevSeq;
      for (let i = idx + 1; i < updated.length; i++) {
        const mySeq = areasSnapshot[i].sequence_number ?? i;
        const myPrevSeq = areasSnapshot[i - 1].sequence_number ?? (i - 1);
        const wasGrouped = mySeq === myPrevSeq;
        if (wasGrouped) {
          updated[i].sequence_number = updated[i - 1].sequence_number;
        } else {
          updated[i].sequence_number = (updated[i - 1].sequence_number ?? (i - 1)) + 1;
        }
      }
    }

    onAreasSnapshotChange(updated);
  };

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
      {/* Total Crew Size */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-600" />
          <h4 className="font-semibold text-sm text-violet-900">
            Crew Assignment
          </h4>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border border-violet-200 px-3 py-1.5">
          <span className="text-xs text-violet-700 font-medium whitespace-nowrap">Total Crew:</span>
          <Input
            type="number"
            min="1"
            max="50"
            value={crew}
            onChange={(e) => onTotalCrewChange?.(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 h-7 text-center text-sm font-semibold border-violet-200"
          />
          <span className="text-xs text-violet-500">people</span>
        </div>
      </div>

      <p className="text-xs text-violet-600 mb-3">
        Set ratios to split the full crew across concurrent areas. All {crew} workers are distributed proportionally. Sequential areas receive all available workers.
      </p>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="area-list">
          {(droppableProvided) => (
            <div
              className="space-y-2"
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
            >
              {areaData.map((area) => (
                <Draggable key={area.id} draggableId={area.id} index={area.index}>
                  {(draggableProvided, snapshot) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                    >
                      {/* Concurrent indicator between areas */}
                      {area.index > 0 && onAreasSnapshotChange && (
                        <div className="flex items-center gap-2 my-1 ml-4">
                          <div className={cn(
                            "flex-1 h-px",
                            area.isConcurrent ? "bg-violet-300" : "bg-slate-200"
                          )} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "text-[10px] h-5 px-2 py-0",
                              area.isConcurrent
                                ? "text-violet-700 hover:text-violet-800 bg-violet-100 hover:bg-violet-200"
                                : "text-slate-400 hover:text-slate-600"
                            )}
                            onClick={() => toggleConcurrent(area.index)}
                          >
                            {area.isConcurrent ? (
                              <>
                                <GitBranch className="w-3 h-3 mr-1" />
                                Concurrent — click to make sequential
                              </>
                            ) : (
                              "↓ Sequential — click to make concurrent"
                            )}
                          </Button>
                          <div className={cn(
                            "flex-1 h-px",
                            area.isConcurrent ? "bg-violet-300" : "bg-slate-200"
                          )} />
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex items-center gap-2 bg-white rounded-lg border px-3 py-2 transition-shadow",
                          area.isConcurrent ? "border-violet-300 ring-1 ring-violet-100" : "border-violet-100",
                          snapshot.isDragging && "shadow-lg ring-2 ring-violet-300"
                        )}
                      >
                        {/* Drag handle */}
                        {onAreasSnapshotChange && (
                          <div
                            {...draggableProvided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
                          >
                            <GripVertical className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {area.name}
                            </p>
                            {area.isConcurrent && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium flex-shrink-0">
                                Concurrent
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{area.assetCount} assets</span>
                            <span>·</span>
                            <span>{area.totalHours.toFixed(1)}h total</span>
                            {area.lockedHours > 0 && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5 text-amber-600">
                                  <Lock className="w-3 h-3" />
                                  {area.lockedHours.toFixed(1)}h locked
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {area.isInConcurrentGroup ? (
                            <>
                              <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <Input
                                  type="number"
                                  min="1"
                                  max={crew}
                                  value={area.employeeCount}
                                  onChange={(e) => handleCountChange(area.id, e.target.value)}
                                  className="w-16 h-8 text-center text-sm"
                                />
                              </div>
                              {simulatedInfo[area.id] && (
                                <div className="text-xs text-slate-500 text-right flex items-center gap-1 justify-end">
                                  <span className="text-violet-600 font-medium">→{simulatedInfo[area.id].workers}p</span>
                                  <Clock className="w-3 h-3 ml-1" />
                                  {simulatedInfo[area.id].effectiveHours?.toFixed(1)}h
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                <span className="font-medium">
                                  {simulatedInfo[area.id]?.segmentSummary 
                                    ? simulatedInfo[area.id].segmentSummary
                                    : simulatedInfo[area.id] ? `${simulatedInfo[area.id].workers}p` : "All crew"}
                                </span>
                              </div>
                              {simulatedInfo[area.id] && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {simulatedInfo[area.id].effectiveHours?.toFixed(1)}h
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="mt-3 pt-2 border-t border-violet-200 flex justify-between text-xs">
        <span className="text-violet-700 font-medium">
          Workers flow from finished areas to next in sequence
        </span>
        <span className="text-violet-900 font-semibold">
          ~{totalDurationMinutes} min
        </span>
      </div>
    </div>
  );
}