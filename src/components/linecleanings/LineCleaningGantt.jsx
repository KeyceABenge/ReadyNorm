// @ts-nocheck
import { useMemo, useState, useEffect } from "react";
import { parseISO, format, differenceInMinutes, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportSchedulePDF } from "./SchedulePDFExport";
import { computeAreaTimeline } from "./areaTimelineCalc";
import { computeLineTimeline } from "./lineTimelineCalc";


const STATUS_COLORS = {
  scheduled: "bg-blue-500",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-400",
};

const STATUS_BG = {
  scheduled: "bg-blue-50 border-blue-200",
  in_progress: "bg-amber-50 border-amber-200",
  completed: "bg-emerald-50 border-emerald-200",
  cancelled: "bg-slate-50 border-slate-200",
};

const AREA_COLORS = [
  { bg: "bg-sky-100 border-sky-300", text: "text-sky-800" },
  { bg: "bg-violet-100 border-violet-300", text: "text-violet-800" },
  { bg: "bg-amber-100 border-amber-300", text: "text-amber-800" },
  { bg: "bg-emerald-100 border-emerald-300", text: "text-emerald-800" },
  { bg: "bg-rose-100 border-rose-300", text: "text-rose-800" },
  { bg: "bg-indigo-100 border-indigo-300", text: "text-indigo-800" },
  { bg: "bg-teal-100 border-teal-300", text: "text-teal-800" },
  { bg: "bg-orange-100 border-orange-300", text: "text-orange-800" },
];

function enrichAssetsSnapshot(assetsSnapshot, liveAssets, liveAssetGroups) {
  if (!assetsSnapshot || assetsSnapshot.length === 0) return assetsSnapshot;
  if (!liveAssets?.length && !liveAssetGroups?.length) return assetsSnapshot;
  const assetMap = {};
  const groupMap = {};
  (liveAssets || []).forEach(a => { assetMap[a.id] = a; });
  (liveAssetGroups || []).forEach(g => { groupMap[g.id] = g; });
  return assetsSnapshot.map(snap => {
    if (snap.is_locked === true || snap.is_locked === false) return snap;
    const group = groupMap[snap.id];
    if (group) return { ...snap, is_locked: group.is_locked === true };
    const asset = assetMap[snap.id];
    if (asset) return { ...snap, is_locked: asset.is_locked === true };
    return snap;
  });
}

function computeAreaBlocks(assignment, liveAssets, liveAssetGroups) {
  const enrichedAssets = enrichAssetsSnapshot(assignment.assets_snapshot, liveAssets, liveAssetGroups);
  const { areaTimeline, totalHours } = computeAreaTimeline(
    assignment.areas_snapshot, enrichedAssets, assignment.employee_counts, assignment.total_crew_size
  );
  if (totalHours <= 0 || areaTimeline.length === 0) return { blocks: [], maxStack: 1 };
  const sorted = [...areaTimeline].sort((a, b) => a.startHour !== b.startHour ? a.startHour - b.startHour : b.endHour - a.endHour);
  const rows = [];
  const rowAssignment = {};
  sorted.forEach(area => {
    let placed = false;
    for (let r = 0; r < rows.length; r++) {
      if (area.startHour >= rows[r] - 0.001) { rows[r] = area.endHour; rowAssignment[area.id] = r; placed = true; break; }
    }
    if (!placed) { rowAssignment[area.id] = rows.length; rows.push(area.endHour); }
  });
  const maxStack = rows.length;
  const blocks = areaTimeline.map(a => ({
    ...a,
    offsetPct: (a.startHour / totalHours) * 100,
    widthPct: (a.effectiveHours / totalHours) * 100,
    stackIndex: rowAssignment[a.id],
    stackSize: maxStack,
    isConcurrent: maxStack > 1,
  }));
  return { blocks, maxStack };
}

/**
 * Unified LineCleaningGantt — used on both the schedule page and the overview dashboard.
 * Groups multiple assignments for the same production line into a single row.
 */
export default function LineCleaningGantt({
  assignments,
  liveAssets,
  liveAssetGroups,
  signOffs,
  employees = [],
  live = false,
  title,
  headerRight,
  selectedDate,
  selectedShift,
  orgName,
}) {
  const [tick, setTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => { setTick(t => t + 1); setLastUpdated(new Date()); }, 30000);
    return () => clearInterval(interval);
  }, [live]);

  const [liveAssignments, setLiveAssignments] = useState(null);
  const [liveSignOffs, setLiveSignOffs] = useState(null);
  useEffect(() => { setLiveAssignments(assignments); }, [assignments]);
  useEffect(() => { setLiveSignOffs(signOffs); }, [signOffs]);
  useEffect(() => {
    if (!live) return;
    const unsub1 = LineCleaningAssignmentRepo.subscribe((event) => {
      setLastUpdated(new Date());
      setLiveAssignments(prev => {
        if (!prev) return prev;
        if (event.type === "create") return [...prev, event.data];
        if (event.type === "update") return prev.map(a => a.id === event.id ? event.data : a);
        if (event.type === "delete") return prev.filter(a => a.id !== event.id);
        return prev;
      });
    });
    const unsub2 = AreaSignOffRepo.subscribe((event) => {
      setLastUpdated(new Date());
      setLiveSignOffs(prev => {
        if (!prev) return prev;
        if (event.type === "create") return [...prev, event.data];
        if (event.type === "update") return prev.map(s => s.id === event.id ? event.data : s);
        if (event.type === "delete") return prev.filter(s => s.id !== event.id);
        return prev;
      });
    });
    return () => { unsub1(); unsub2(); };
  }, [live]);

  const effectiveAssignments = (live ? liveAssignments : null) || assignments || [];
  const effectiveSignOffs = (live ? liveSignOffs : null) || signOffs || [];
  const now = new Date();
  const hasLiveData = live && effectiveAssignments.some(a => a.status === "in_progress");

  const { timeSlots, totalMinutes, rows } = useMemo(() => {
    const valid = effectiveAssignments.filter(a => a.expected_line_down_time && a.status !== "cancelled");
    if (valid.length === 0) return { timeSlots: [], totalMinutes: 0, rows: [] };

    const { lineTimeline } = computeLineTimeline(valid, liveAssets, liveAssetGroups);
    const simByIdx = {};
    lineTimeline.forEach(lt => { simByIdx[lt._idx] = lt; });

    // Find the earliest expected_line_down_time to use as anchor for simulation offsets
    const earliestDownTime = valid.reduce((earliest, a) => {
      const t = parseISO(a.expected_line_down_time);
      return !earliest || t < earliest ? t : earliest;
    }, null);

    const signOffsByAssignment = {};
    effectiveSignOffs.forEach(so => {
      if (!so.line_cleaning_assignment_id) return;
      if (!signOffsByAssignment[so.line_cleaning_assignment_id]) signOffsByAssignment[so.line_cleaning_assignment_id] = [];
      signOffsByAssignment[so.line_cleaning_assignment_id].push(so);
    });

    const sorted = [...valid].sort((a, b) => {
      const seqDiff = (a.sequence_number || 0) - (b.sequence_number || 0);
      if (seqDiff !== 0) return seqDiff;
      return (a.production_line_name || "").localeCompare(b.production_line_name || "");
    });

    // --- Prediction pass (for live mode) ---
    const predictedEnds = {};
    if (live) {
      sorted.forEach(a => {
        const aSignOffs = signOffsByAssignment[a.id] || [];
        const totalAssets = a.assets_snapshot?.length || 0;
        const completedAssets = aSignOffs.length;
        const plannedCount = a.employee_counts ? Object.values(a.employee_counts).reduce((s, c) => s + (Number(c) || 0), 0) : 0;
        const totalEstHours = (a.assets_snapshot || []).reduce((s, asset) => s + (asset.estimated_hours || 0), 0);
        if (a.status === "in_progress" && totalAssets > 0) {
          const actualStart = a.actual_start_time ? parseISO(a.actual_start_time) : null;
          if (actualStart && completedAssets > 0 && completedAssets < totalAssets) {
            const elapsed = differenceInMinutes(now, actualStart);
            if (elapsed > 0) { predictedEnds[a.id] = addMinutes(now, (totalAssets - completedAssets) / (completedAssets / elapsed)); return; }
          }
        }
        if (a.status === "scheduled" && totalEstHours > 0 && plannedCount > 0) {
          predictedEnds[a.id] = addMinutes(parseISO(a.expected_line_down_time), (totalEstHours / plannedCount) * 60);
        }
      });
    }

    // --- Chained start adjustment (for live mode) ---
    const effectiveStarts = {};
    if (live) {
      const seqGroups = {};
      sorted.forEach(a => { const seq = a.sequence_number || 0; if (!seqGroups[seq]) seqGroups[seq] = []; seqGroups[seq].push(a); });
      const seqKeys = Object.keys(seqGroups).map(Number).sort((a, b) => a - b);
      for (let si = 0; si < seqKeys.length; si++) {
        const group = seqGroups[seqKeys[si]];
        if (si === 0) { group.forEach(a => { effectiveStarts[a.id] = parseISO(a.expected_line_down_time); }); continue; }
        const prevGroup = seqGroups[seqKeys[si - 1]];
        let maxPrevEnd = null;
        prevGroup.forEach(prev => {
          if (!prev.expected_line_down_time) return;
          const prevOrigStart = parseISO(prev.expected_line_down_time);
          const prevOrigEnd = prev.estimated_end_time ? parseISO(prev.estimated_end_time) : addMinutes(prevOrigStart, prev.duration_minutes || 60);
          const prevEffStart = effectiveStarts[prev.id];
          let prevEnd = prev.status === "completed" ? (prev.actual_end_time ? parseISO(prev.actual_end_time) : prevOrigEnd) : (predictedEnds[prev.id] || prevOrigEnd);
          if (prevEffStart && prevEffStart > prevOrigStart && prevEnd) { prevEnd = addMinutes(prevEnd, differenceInMinutes(prevEffStart, prevOrigStart)); }
          if (!maxPrevEnd || prevEnd > maxPrevEnd) maxPrevEnd = prevEnd;
        });
        group.forEach(a => {
          const origStart = parseISO(a.expected_line_down_time);
          if (a.status === "in_progress" || a.status === "completed") { effectiveStarts[a.id] = origStart; }
          else if (maxPrevEnd && maxPrevEnd > origStart) {
            effectiveStarts[a.id] = maxPrevEnd;
            if (predictedEnds[a.id]) { predictedEnds[a.id] = addMinutes(predictedEnds[a.id], differenceInMinutes(maxPrevEnd, origStart)); }
          } else { effectiveStarts[a.id] = origStart; }
        });
      }
    }

    // --- Build bar data per assignment ---
    let earliest = null;
    let latest = null;

    const barData = sorted.map((a, idx) => {
      const origStart = parseISO(a.expected_line_down_time);
      const sim = simByIdx[valid.indexOf(a)] || simByIdx[idx];
      let start, end, durationMin;

      if (live && (a.status === "in_progress" || a.status === "completed")) {
        // Live mode for active/completed lines: use actual times
        start = a.actual_start_time ? parseISO(a.actual_start_time) : origStart;
        if (a.status === "completed" && a.actual_end_time) {
          end = parseISO(a.actual_end_time);
        } else if (sim && sim.effectiveDurationMin > 0) {
          end = addMinutes(start, sim.effectiveDurationMin);
        } else {
          end = a.estimated_end_time ? parseISO(a.estimated_end_time) : addMinutes(start, a.duration_minutes || 60);
        }
        durationMin = differenceInMinutes(end, start);
      } else if (live && effectiveStarts[a.id]) {
        // Live mode for scheduled lines: use chained start adjustments
        start = effectiveStarts[a.id];
        if (sim && sim.effectiveDurationMin > 0) {
          durationMin = sim.effectiveDurationMin;
          end = addMinutes(start, durationMin);
        } else {
          end = a.estimated_end_time ? parseISO(a.estimated_end_time) : addMinutes(origStart, a.duration_minutes || 60);
          if (effectiveStarts[a.id] > origStart) {
            end = addMinutes(end, differenceInMinutes(effectiveStarts[a.id], origStart));
          }
          durationMin = differenceInMinutes(end, start);
        }
      } else if (sim && sim.effectiveDurationMin > 0 && earliestDownTime) {
        // Non-live: use simulation offsets — chains lines sequentially
        start = addMinutes(earliestDownTime, sim.effectiveStartHour * 60);
        durationMin = sim.effectiveDurationMin;
        end = addMinutes(start, durationMin);
      } else {
        start = origStart;
        end = a.estimated_end_time ? parseISO(a.estimated_end_time) : addMinutes(start, a.duration_minutes || 60);
        durationMin = differenceInMinutes(end, start);
      }

      if (!earliest || start < earliest) earliest = start;
      if (!latest || end > latest) latest = end;

      const { blocks: areaBlocks, maxStack: maxConcurrentStack } = computeAreaBlocks(a, liveAssets, liveAssetGroups);

      const aSignOffs = signOffsByAssignment[a.id] || [];
      const totalAssets = a.assets_snapshot?.length || 0;
      const completedAssets = aSignOffs.length;

      let prediction = null;
      if (live) {
        const plannedCount = a.total_crew_size || (a.employee_counts ? Object.values(a.employee_counts).reduce((s, c) => s + (Number(c) || 0), 0) : 0);
        const totalEstHours = (a.assets_snapshot || []).reduce((s, asset) => s + (asset.estimated_hours || 0), 0);
        if (a.status === "in_progress" && totalAssets > 0) {
          const actualStart = a.actual_start_time ? parseISO(a.actual_start_time) : (aSignOffs.length > 0 ? parseISO([...aSignOffs].sort((x, y) => new Date(x.signed_off_at) - new Date(y.signed_off_at))[0].signed_off_at) : null);
          if (actualStart && completedAssets > 0 && completedAssets < totalAssets) {
            const elapsed = differenceInMinutes(now, actualStart);
            if (elapsed > 0) {
              const rate = completedAssets / elapsed;
              const predictedEnd = addMinutes(now, (totalAssets - completedAssets) / rate);
              prediction = { predictedEnd, isLate: predictedEnd > end, completedAssets, totalAssets, type: "pace" };
              if (predictedEnd > latest) latest = predictedEnd;
            }
          }
        }
        if (!prediction && a.status === "scheduled" && totalEstHours > 0 && plannedCount > 0) {
          const estMin = (totalEstHours / plannedCount) * 60;
          const predictedEnd = addMinutes(start, estMin);
          prediction = { predictedEnd, isLate: predictedEnd > end, completedAssets: 0, totalAssets, type: "estimate" };
          if (predictedEnd > latest) latest = predictedEnd;
        }
      }

      const workerEmails = new Set();
      aSignOffs.forEach(so => { if (so.employee_email) workerEmails.add(so.employee_email); });
      const workers = Array.from(workerEmails).map(email => {
        const emp = employees.find(e => e.email === email);
        return emp || { name: email.split("@")[0], email, color: "#64748b" };
      });

      // Compute downtime: gap between line_down_time and effective cleaning start
      let downtimeStart = null;
      let downtimeEnd = null;
      if (a.line_down_time && a.expected_line_down_time && a.line_down_time !== a.expected_line_down_time) {
        const ldTime = parseISO(a.line_down_time);
        const effStart = start; // effective cleaning start
        if (effStart > ldTime) {
          downtimeStart = ldTime;
          downtimeEnd = effStart;
          if (!earliest || ldTime < earliest) earliest = ldTime;
        }
      }

      return {
        assignmentId: a.id,
        lineId: a.production_line_id,
        lineName: a.production_line_name || "Unknown Line",
        status: a.status || "scheduled",
        start, end, durationMin,
        areasCount: a.areas_snapshot?.length || 0,
        assetsCount: totalAssets,
        completedAssets,
        areaBlocks, maxConcurrentStack,
        lineSegments: sim?.segments || null,
        prediction, workers,
        wasChained: start > origStart,
        plannedEmployeeCount: a.total_crew_size || (a.employee_counts ? Object.values(a.employee_counts).reduce((s, c) => s + (Number(c) || 0), 0) : 0),
        downtimeStart,
        downtimeEnd,
        lineDownTime: a.line_down_time ? parseISO(a.line_down_time) : null,
      };
    });

    if (!earliest || !latest) return { timeSlots: [], totalMinutes: 0, rows: [] };

    const roundedStart = new Date(earliest);
    roundedStart.setMinutes(roundedStart.getMinutes() < 30 ? 0 : 30, 0, 0);
    const roundedEnd = new Date(latest);
    if (roundedEnd.getMinutes() > 30) { roundedEnd.setHours(roundedEnd.getHours() + 1, 0, 0, 0); }
    else if (roundedEnd.getMinutes() > 0) { roundedEnd.setMinutes(30, 0, 0); }

    const total = differenceInMinutes(roundedEnd, roundedStart);
    if (total <= 0) return { timeSlots: [], totalMinutes: 0, rows: [] };
    const slots = [];
    const cursor = new Date(roundedStart);
    while (cursor < roundedEnd) { slots.push(new Date(cursor)); cursor.setMinutes(cursor.getMinutes() + 30); }

    // --- Group bars by production_line_id into rows ---
    const lineOrder = [];
    const lineGroupMap = {};
    barData.forEach(bar => {
      if (!lineGroupMap[bar.lineId]) {
        lineGroupMap[bar.lineId] = { lineId: bar.lineId, lineName: bar.lineName, bars: [] };
        lineOrder.push(bar.lineId);
      }
      lineGroupMap[bar.lineId].bars.push(bar);
    });

    const finalRows = lineOrder.map(lineId => {
      const group = lineGroupMap[lineId];
      const bars = group.bars.map(bar => {
        const offsetMin = differenceInMinutes(bar.start, roundedStart);
        const predData = bar.prediction ? (() => {
          const predEnd = bar.prediction.predictedEnd;
          const predOffMin = differenceInMinutes(bar.start, roundedStart);
          const predDurMin = differenceInMinutes(predEnd, bar.start);
          return {
            ...bar.prediction,
            offsetPct: (predOffMin / total) * 100,
            widthPct: (predDurMin / total) * 100,
            predictedEndLabel: format(predEnd, "h:mm a"),
          };
        })() : null;
        // Compute downtime bar position
        let downtimeBar = null;
        if (bar.downtimeStart && bar.downtimeEnd) {
          const dtOffMin = differenceInMinutes(bar.downtimeStart, roundedStart);
          const dtDurMin = differenceInMinutes(bar.downtimeEnd, bar.downtimeStart);
          downtimeBar = {
            offsetPct: (dtOffMin / total) * 100,
            widthPct: (dtDurMin / total) * 100,
            label: `Idle: ${dtDurMin}m`,
            startLabel: format(bar.downtimeStart, "h:mm a"),
            endLabel: format(bar.downtimeEnd, "h:mm a"),
          };
        }

        // Line down time marker position (even if no idle gap, show when line went down)
        let lineDownMarkerPct = null;
        if (bar.lineDownTime) {
          const ldOffMin = differenceInMinutes(bar.lineDownTime, roundedStart);
          lineDownMarkerPct = (ldOffMin / total) * 100;
        }

        return {
          ...bar,
          startLabel: format(bar.start, "h:mm a"),
          endLabel: format(bar.end, "h:mm a"),
          lineDownLabel: bar.lineDownTime ? format(bar.lineDownTime, "h:mm a") : null,
          offsetPct: (offsetMin / total) * 100,
          widthPct: (bar.durationMin / total) * 100,
          prediction: predData,
          downtimeBar,
          lineDownMarkerPct,
        };
      });

      // Aggregate info for the label column
      const totalAssetsAll = bars.reduce((s, b) => s + b.assetsCount, 0);
      const completedAll = bars.reduce((s, b) => s + b.completedAssets, 0);
      const allWorkers = [];
      const seenEmails = new Set();
      bars.forEach(b => b.workers.forEach(w => { if (!seenEmails.has(w.email)) { seenEmails.add(w.email); allWorkers.push(w); } }));
      const plannedTotal = bars.reduce((s, b) => s + b.plannedEmployeeCount, 0);
      // Determine "worst" status for the row
      const statusPriority = { in_progress: 0, scheduled: 1, completed: 2, cancelled: 3 };
      const worstStatus = bars.reduce((best, b) => (statusPriority[b.status] ?? 9) < (statusPriority[best] ?? 9) ? b.status : best, bars[0].status);

      return {
        lineId,
        lineName: group.lineName,
        bars,
        totalAssetsAll,
        completedAll,
        allWorkers,
        plannedTotal,
        worstStatus,
      };
    });

    return { timeSlots: slots, totalMinutes: total, rows: finalRows };
  }, [effectiveAssignments, effectiveSignOffs, liveAssets, liveAssetGroups, employees, live, tick]);

  if (rows.length === 0) return null;

  const PX_PER_SLOT = 100;
  const timelineWidth = timeSlots.length * PX_PER_SLOT;
  const hasPredictions = rows.some(r => r.bars.some(b => b.prediction));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          {title || "Schedule Timeline"}
          {live && (
            <span className="flex items-center gap-1 ml-1">
              <span className={cn("w-1.5 h-1.5 rounded-full", hasLiveData ? "bg-emerald-500 animate-pulse" : "bg-emerald-400")} />
              <span className="text-[9px] font-medium text-emerald-600 uppercase tracking-wider">Live</span>
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {live && (
            <span className="text-[10px] text-slate-400">
              Updated {format(lastUpdated, "h:mm:ss a")}
            </span>
          )}
          {!live && effectiveAssignments.length > 0 && selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1 text-slate-500 hover:text-slate-700"
              onClick={() => exportSchedulePDF({
                assignments: effectiveAssignments,
                selectedDate,
                selectedShift: selectedShift || "Day",
                orgName,
              })}
            >
              <FileDown className="w-3 h-3" />
              PDF
            </Button>
          )}
          {headerRight}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: timelineWidth + 140 }}>
          {/* Time axis */}
          <div className="flex border-b border-slate-200 sticky top-0 bg-white z-10">
            <div className="w-[140px] flex-shrink-0 px-3 py-1.5 text-[11px] font-semibold text-slate-500 border-r border-slate-200 bg-slate-50">
              Line
            </div>
            <div className="flex-1 flex" style={{ width: timelineWidth }}>
              {timeSlots.map((slot, i) => (
                <div key={i} className="text-[10px] text-slate-400 font-medium border-r border-slate-100 px-1 py-1 text-center flex-shrink-0" style={{ width: PX_PER_SLOT }}>
                  {format(slot, "h:mm a")}
                </div>
              ))}
            </div>
          </div>

          {/* Rows — one per production line */}
          {rows.map((row) => {
            // Calculate row height based on number of bars
            const barCount = row.bars.length;
            const BAR_H = 52; // px per bar
            const GAP = 4;
            const PAD = 6;
            const rowHeight = barCount * BAR_H + (barCount - 1) * GAP + PAD * 2;

            return (
              <div key={row.lineId} className="flex border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                {/* Label */}
                <div className="w-[140px] flex-shrink-0 px-3 py-2 border-r border-slate-200 bg-slate-50/50 flex flex-col justify-center min-h-0">
                  <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{row.lineName}</p>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    {live
                      ? `${row.completedAll}/${row.totalAssetsAll} assets`
                      : `${row.bars.length} clean${row.bars.length > 1 ? "s" : ""}`
                    }
                  </p>
                  {live && row.allWorkers.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {row.allWorkers.slice(0, 5).map((w, i) => (
                        <div key={i} className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-bold" style={{ backgroundColor: w.color || "#64748b" }} title={w.name}>
                          {w.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      ))}
                      {row.allWorkers.length > 5 && (
                        <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[7px] font-bold">+{row.allWorkers.length - 5}</div>
                      )}
                    </div>
                  )}
                  {live && row.allWorkers.length === 0 && row.plannedTotal > 0 && (
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{row.plannedTotal} planned</p>
                  )}
                </div>

                {/* Bars area */}
                <div className="flex-1 relative" style={{ width: timelineWidth, height: rowHeight }}>
                  {/* Grid */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {timeSlots.map((_, i) => (
                      <div key={i} className="border-r border-slate-100 flex-shrink-0" style={{ width: PX_PER_SLOT, height: "100%" }} />
                    ))}
                  </div>

                  {/* Each assignment bar */}
                  {row.bars.map((bar, barIdx) => {
                    const hasAreaBlocks = bar.areaBlocks.length > 0;
                    const barTop = PAD + barIdx * (BAR_H + GAP);

                    return (
                      <div key={bar.assignmentId}>
                        {/* Line down time marker — small marker showing when line went down */}
                        {bar.lineDownMarkerPct != null && !bar.downtimeBar && (
                          <div
                            className="absolute flex flex-col items-center"
                            style={{
                              left: `${bar.lineDownMarkerPct}%`,
                              top: barTop - 2,
                              transform: "translateX(-50%)",
                            }}
                            title={`Line down: ${bar.lineDownLabel}`}
                          >
                            <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-orange-500" />
                          </div>
                        )}

                        {/* Downtime / idle bar — shows when line is down but waiting for cleaning to start */}
                        {bar.downtimeBar && (
                          <div
                            className="absolute rounded border border-orange-300 bg-orange-100/70 flex items-center overflow-hidden"
                            style={{
                              left: `${bar.downtimeBar.offsetPct}%`,
                              width: `${Math.max(bar.downtimeBar.widthPct, 1)}%`,
                              top: barTop,
                              height: BAR_H,
                            }}
                            title={`Line down idle: ${bar.downtimeBar.startLabel} – ${bar.downtimeBar.endLabel}`}
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-400" />
                            <div className="ml-1.5 min-w-0 overflow-hidden">
                              <p className="text-[8px] font-medium text-orange-700 truncate">{bar.downtimeBar.label}</p>
                            </div>
                            {/* Diagonal stripes pattern */}
                            <div className="absolute inset-0 opacity-10" style={{
                              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, #f97316 3px, #f97316 4px)",
                            }} />
                          </div>
                        )}

                        {/* Main bar */}
                        <div
                          className={cn(
                            "absolute rounded border cursor-default transition-shadow hover:shadow-md overflow-hidden",
                            STATUS_BG[bar.status] || STATUS_BG.scheduled
                          )}
                          style={{
                            left: `${bar.offsetPct}%`,
                            width: `${Math.max(bar.widthPct, 1.5)}%`,
                            top: barTop,
                            height: BAR_H,
                          }}
                          title={`${bar.lineName}: ${bar.startLabel} – ${bar.endLabel} (${bar.durationMin}m)`}
                        >
                          {/* Status stripe */}
                          <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", STATUS_COLORS[bar.status] || STATUS_COLORS.scheduled)} />

                          {/* Area sub-blocks */}
                          {hasAreaBlocks ? (
                            <div className="absolute inset-y-0 left-1 right-0">
                              {bar.areaBlocks.map((block, bi) => {
                                const color = AREA_COLORS[bi % AREA_COLORS.length];
                                const pad = 2;
                                const gap = 1;
                                const topCalc = block.isConcurrent
                                  ? `calc(${pad}px + ${block.stackIndex} * ((100% - ${pad * 2}px) / ${block.stackSize}))`
                                  : `${pad}px`;
                                const heightCalc = block.isConcurrent
                                  ? `calc((100% - ${pad * 2}px) / ${block.stackSize} - ${gap}px)`
                                  : `calc(100% - ${pad * 2}px)`;
                                const segments = block.segments || [];
                                const blockDuration = block.endHour - block.startHour;

                                return (
                                  <div key={block.id} className={cn("absolute border rounded-sm overflow-hidden", color.bg)} style={{ left: `${block.offsetPct}%`, width: `${Math.max(block.widthPct, 1)}%`, top: topCalc, height: heightCalc }} title={`${block.name}: ${Math.round(block.effectiveHours * 60)}m`}>
                                    <div className="relative w-full h-full flex">
                                      {segments.length > 1 ? segments.map((seg, si) => {
                                        const segDuration = (seg.endHour || block.endHour) - seg.startHour;
                                        const segWidthPct = blockDuration > 0 ? (segDuration / blockDuration) * 100 : 100;
                                        const isFirst = si === 0;
                                        return (
                                          <div key={si} className={cn("flex items-center overflow-hidden flex-shrink-0", !isFirst && "border-l border-dashed border-white/50")} style={{ width: `${segWidthPct}%` }}>
                                            <div className="min-w-0 overflow-hidden leading-none px-0.5">
                                              {isFirst && <p className={cn("text-[9px] font-semibold truncate", color.text)}>{block.name}</p>}
                                              <p className={cn("text-[8px] truncate", color.text)}>{seg.workers}p</p>
                                            </div>
                                          </div>
                                        );
                                      }) : (
                                        <div className="flex items-center px-1.5 min-w-0 overflow-hidden">
                                          <div className="min-w-0 overflow-hidden leading-none">
                                            <p className={cn("text-[10px] font-semibold truncate", color.text)}>{block.name}</p>
                                            <p className={cn("text-[8px] truncate opacity-70", color.text)}>{Math.round(block.effectiveHours * 60)}m · Assign {block.employeeCount} people</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="ml-1.5 flex items-center h-full min-w-0 overflow-hidden">
                              <p className="text-[9px] font-medium text-slate-700 truncate">
                                {bar.startLabel} – {bar.endLabel}
                                <span className="text-slate-400 ml-1">{bar.durationMin}m</span>
                                {bar.wasChained && <span className="text-amber-600 ml-0.5" title="Adjusted">⏩</span>}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Prediction indicator — thin line below bar */}
                        {bar.prediction && (
                          <div
                            className={cn(
                              "absolute h-[3px] rounded-full",
                              bar.prediction.isLate ? "bg-rose-400" : "bg-emerald-400"
                            )}
                            style={{
                              left: `${bar.prediction.offsetPct}%`,
                              width: `${Math.max(bar.prediction.widthPct, 2)}%`,
                              top: barTop + BAR_H,
                            }}
                            title={`${bar.prediction.type === "estimate" ? "Est." : "Predicted"}: ${bar.prediction.predictedEndLabel}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend — compact */}
      <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 flex gap-3 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn("w-2 h-2 rounded-full", color)} />
            <span className="text-[10px] text-slate-500 capitalize">{status.replace("_", " ")}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-orange-200 border border-orange-400" />
          <span className="text-[10px] text-slate-500">Idle (line down, waiting)</span>
        </div>
        {hasPredictions && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-slate-500">On time</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-[10px] text-slate-500">Late</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}