/**
 * Cross-line worker-flow simulation — event-driven with real-time labor rebalancing.
 *
 * Core principles:
 * 1. Each line has a specific "line down" time (when it becomes available for cleaning)
 * 2. Lines are cleaned in sequence_number priority order by default (one at a time)
 *    - Lines with the SAME sequence_number run in parallel (explicit parallel override)
 * 3. Total available labor = sum of all lines' total_crew_size (shift workforce)
 * 4. When an area finishes, its workers are immediately redistributed to remaining
 *    active areas on the SAME line first, then to other lines if surplus exists
 * 5. Downstream lines shift forward/backward based on actual/predicted completion
 *    of preceding lines
 *
 * Worker flow per event:
 *   1. Redistribute freed workers to still-active areas on the same line
 *   2. Start next pending area group on the same line if ready
 *   3. If line is fully done, release ALL its workers to the pool
 *   4. Start next sequential line(s) with available pool workers
 *   5. Boost any remaining active areas with leftover workers
 */

export function computeLineTimeline(assignments, liveAssets, liveAssetGroups) {
  if (!assignments || assignments.length === 0) return { lineTimeline: [], totalHours: 0 };

  const assetMap = {};
  const groupMap = {};
  (liveAssets || []).forEach(a => { assetMap[a.id] = a; });
  (liveAssetGroups || []).forEach(g => { groupMap[g.id] = g; });

  function enrichAssets(assetsSnapshot) {
    if (!assetsSnapshot?.length) return assetsSnapshot || [];
    return assetsSnapshot.map(snap => {
      if (snap.is_locked === true || snap.is_locked === false) return snap;
      const group = groupMap[snap.id];
      if (group) return { ...snap, is_locked: group.is_locked === true };
      const asset = assetMap[snap.id];
      if (asset) return { ...snap, is_locked: asset.is_locked === true };
      return snap;
    });
  }

  // ── Build structured data per line ──
  const lines = assignments.map((a, idx) => {
    const lineSeq = a.sequence_number ?? idx;
    const enrichedAssets = enrichAssets(a.assets_snapshot);
    const areasList = (a.areas_snapshot || []).map((area, ai) => {
      const areaAssets = enrichedAssets.filter(as => as.area_id === area.id);
      const lockedHours = areaAssets.filter(as => as.is_locked).reduce((s, as) => s + (as.estimated_hours || 0), 0);
      const totalHours = areaAssets.reduce((s, as) => s + (as.estimated_hours || 0), 0);
      const divisibleHours = Math.max(0, totalHours - lockedHours);
      const isFullyLocked = divisibleHours <= 0 && lockedHours > 0;
      return {
        lineIdx: idx,
        lineSeq,
        areaId: area.id,
        areaName: area.name,
        areaSeq: area.sequence_number ?? ai,
        lockedHours,
        divisibleHours,
        isFullyLocked,
        rawHours: totalHours,
        initialWorkers: (a.employee_counts || {})[area.id] || 1,
      };
    });
    return { idx, lineSeq, assignment: a, areas: areasList, totalCrew: a.total_crew_size || 1 };
  });

  // ── Group lines by lineSeq (same seq = parallel) ──
  const lineSeqMap = {};
  lines.forEach(l => {
    if (!lineSeqMap[l.lineSeq]) lineSeqMap[l.lineSeq] = [];
    lineSeqMap[l.lineSeq].push(l);
  });
  const sortedLineSeqs = Object.keys(lineSeqMap).map(Number).sort((a, b) => a - b);

  // ── Compute total workforce ──
  // The workforce is the total crew across ALL assignments (the whole shift's sanitation team)
  const totalWorkforce = lines.reduce((s, l) => s + l.totalCrew, 0);

  // ── For each line, group areas by areaSeq (same seq = concurrent within line) ──
  const pendingAreaGroups = {};
  lines.forEach(l => {
    const areaSeqMap = {};
    l.areas.forEach(a => {
      if (!areaSeqMap[a.areaSeq]) areaSeqMap[a.areaSeq] = [];
      areaSeqMap[a.areaSeq].push(a);
    });
    const sorted = Object.keys(areaSeqMap).map(Number).sort((a, b) => a - b);
    pendingAreaGroups[l.idx] = sorted.map(seq => areaSeqMap[seq]);
  });

  // ── Compute per-line start offsets from line down times ──
  // Convert expected_line_down_time into hours offset from the earliest down time
  const downTimes = lines.map(l => {
    if (l.assignment.expected_line_down_time) {
      return new Date(l.assignment.expected_line_down_time).getTime();
    }
    return null;
  });
  const earliestDown = Math.min(...downTimes.filter(t => t !== null));
  const lineDownOffsetHours = lines.map(l => {
    const dt = l.assignment.expected_line_down_time
      ? new Date(l.assignment.expected_line_down_time).getTime()
      : earliestDown;
    return (dt - earliestDown) / (1000 * 60 * 60);
  });

  // ── Simulation state ──
  const startedLines = new Set();
  const finishedLines = new Set();
  const lineStartTimes = {};
  const lineEndTimes = {};

  let active = [];
  const finishedAreas = [];
  let currentTime = 0;

  // ── Helpers ──
  function timeToFinish(t) {
    const divTime = t.workers > 0 ? t.remainingDivisible / t.workers : Infinity;
    return Math.max(t.remainingLocked, divTime);
  }

  function closeSegment(t) {
    if (t.segments.length > 0) {
      const last = t.segments[t.segments.length - 1];
      if (last.endHour === null) last.endHour = currentTime;
    }
  }

  function openSegment(t) {
    t.segments.push({ startHour: currentTime, endHour: null, workers: t.workers });
  }

  function canBenefit(t) {
    if (t.isFullyLocked) return false;
    if (t.remainingDivisible <= 0.001) return false;
    const divTime = t.remainingDivisible / t.workers;
    return divTime > t.remainingLocked + 0.001;
  }

  function workersInUse() {
    return active.reduce((s, t) => s + t.workers, 0);
  }

  function availableWorkers() {
    return Math.max(0, totalWorkforce - workersInUse());
  }

  function isLineFullyDone(lineIdx) {
    return !active.some(t => t.lineIdx === lineIdx) && !(pendingAreaGroups[lineIdx]?.length > 0);
  }

  function lineActiveWorkerCount(lineIdx) {
    return active.filter(t => t.lineIdx === lineIdx).reduce((s, t) => s + t.workers, 0);
  }

  // ── Start a line's next area group ──
  function startAreasForLine(lineIdx, budget) {
    const groups = pendingAreaGroups[lineIdx];
    if (!groups || groups.length === 0 || budget <= 0) return 0;

    const group = groups.shift();
    if (!(lineIdx in lineStartTimes)) lineStartTimes[lineIdx] = currentTime;

    if (group.length === 1) {
      const a = group[0];
      const lockedDominates = a.isFullyLocked || (a.lockedHours > 0 && a.lockedHours >= a.divisibleHours);
      const w = lockedDominates ? Math.min(1, budget) : budget;
      if (w <= 0) return 0;
      active.push({
        ...a, startHour: currentTime, workers: w,
        remainingDivisible: a.divisibleHours, remainingLocked: a.lockedHours,
        segments: [{ startHour: currentTime, endHour: null, workers: w }],
      });
      return w;
    }

    const lockedAreas = group.filter(a => a.isFullyLocked);
    const unlockedAreas = group.filter(a => !a.isFullyLocked);
    let consumed = 0;
    let remaining = budget;

    lockedAreas.forEach(a => {
      if (remaining <= 0) return;
      active.push({
        ...a, startHour: currentTime, workers: 1,
        remainingDivisible: a.divisibleHours, remainingLocked: a.lockedHours,
        segments: [{ startHour: currentTime, endHour: null, workers: 1 }],
      });
      consumed += 1;
      remaining -= 1;
    });

    if (unlockedAreas.length > 0 && remaining > 0) {
      let pool = remaining;
      const totalReq = unlockedAreas.reduce((s, a) => s + a.initialWorkers, 0);

      unlockedAreas.forEach((a, i) => {
        if (pool <= 0) return;
        let workers;
        if (i === unlockedAreas.length - 1) {
          workers = Math.max(1, pool);
        } else {
          workers = Math.max(1, Math.round((a.initialWorkers / totalReq) * remaining));
          workers = Math.min(workers, pool - (unlockedAreas.length - 1 - i));
          workers = Math.max(1, workers);
        }
        workers = Math.min(workers, pool);
        pool -= workers;
        consumed += workers;
        active.push({
          ...a, startHour: currentTime, workers,
          remainingDivisible: a.divisibleHours, remainingLocked: a.lockedHours,
          segments: [{ startHour: currentTime, endHour: null, workers }],
        });
      });
    }

    return consumed;
  }

  // ── Redistribute workers to active areas on a specific line ──
  function boostLineAreas(lineIdx, extraWorkers) {
    if (extraWorkers <= 0) return 0;
    const eligible = active.filter(t => t.lineIdx === lineIdx && canBenefit(t));
    if (eligible.length === 0) return 0;

    const totalWork = eligible.reduce((s, t) => s + t.remainingDivisible, 0);
    let toDistribute = extraWorkers;
    let consumed = 0;

    const additions = eligible.map(t => {
      const share = totalWork > 0 ? Math.max(1, Math.round((t.remainingDivisible / totalWork) * extraWorkers)) : 1;
      const give = Math.min(share, toDistribute);
      toDistribute -= give;
      return { task: t, give };
    });

    // Give remainder to area with most remaining work
    if (toDistribute > 0) {
      const best = eligible.reduce((b, t) => t.remainingDivisible > b.remainingDivisible ? t : b, eligible[0]);
      const entry = additions.find(a => a.task === best);
      if (entry) entry.give += toDistribute;
    }

    additions.forEach(({ task, give }) => {
      if (give > 0) {
        closeSegment(task);
        task.workers += give;
        openSegment(task);
        consumed += give;
      }
    });
    return consumed;
  }

  // ── Redistribute workers to ANY active areas ──
  function boostAnyAreas(extraWorkers) {
    if (extraWorkers <= 0) return 0;
    const eligible = active.filter(canBenefit);
    if (eligible.length === 0) return 0;

    const totalWork = eligible.reduce((s, t) => s + t.remainingDivisible, 0);
    let toDistribute = extraWorkers;
    let consumed = 0;

    const additions = eligible.map(t => {
      const share = totalWork > 0 ? Math.max(1, Math.round((t.remainingDivisible / totalWork) * extraWorkers)) : 1;
      const give = Math.min(share, toDistribute);
      toDistribute -= give;
      return { task: t, give };
    });

    if (toDistribute > 0) {
      const best = eligible.reduce((b, t) => t.remainingDivisible > b.remainingDivisible ? t : b, eligible[0]);
      const entry = additions.find(a => a.task === best);
      if (entry) entry.give += toDistribute;
    }

    additions.forEach(({ task, give }) => {
      if (give > 0) {
        closeSegment(task);
        task.workers += give;
        openSegment(task);
        consumed += give;
      }
    });
    return consumed;
  }

  // ── Try to start lines that are ready (down time reached, predecessor done) ──
  function tryStartReadyLines() {
    let totalConsumed = 0;

    for (const seq of sortedLineSeqs) {
      const linesInSeq = lineSeqMap[seq];

      for (const l of linesInSeq) {
        if (startedLines.has(l.idx)) continue;
        if (finishedLines.has(l.idx)) continue;

        // Check if this line's down time has been reached
        const downOffset = lineDownOffsetHours[l.idx];
        if (currentTime < downOffset - 0.001) continue;

        // Check if all lines with LOWER sequence numbers are finished
        let predecessorsDone = true;
        for (const prevSeq of sortedLineSeqs) {
          if (prevSeq >= seq) break;
          for (const prevL of lineSeqMap[prevSeq]) {
            if (!finishedLines.has(prevL.idx)) {
              predecessorsDone = false;
              break;
            }
          }
          if (!predecessorsDone) break;
        }
        if (!predecessorsDone) continue;

        // This line is ready to start
        const avail = availableWorkers();
        if (avail <= 0) continue;

        const budget = Math.min(l.totalCrew, avail);
        const consumed = startAreasForLine(l.idx, budget);
        if (consumed > 0) {
          startedLines.add(l.idx);
          totalConsumed += consumed;
        }
      }
    }
    return totalConsumed;
  }

  // ── Start next pending area groups on lines that have no active areas left ──
  function startReadyPendingGroups() {
    let totalConsumed = 0;
    for (const lineIdx of [...startedLines]) {
      if (finishedLines.has(lineIdx)) continue;
      const hasActive = active.some(t => t.lineIdx === lineIdx);
      const hasPending = pendingAreaGroups[lineIdx]?.length > 0;
      if (!hasActive && hasPending) {
        const line = lines[lineIdx];
        const avail = availableWorkers();
        const budget = Math.min(line.totalCrew, avail);
        if (budget > 0) {
          const consumed = startAreasForLine(lineIdx, budget);
          totalConsumed += consumed;
        }
      }
    }
    return totalConsumed;
  }

  // ── Initialize: start all lines whose down time is at t=0 and have no predecessors ──
  tryStartReadyLines();

  // ── Schedule future down-time events as "wake up" times ──
  // Collect all unique future down-time offsets for the event loop
  const futureDownTimes = new Set();
  lineDownOffsetHours.forEach(offset => {
    if (offset > 0.001) futureDownTimes.add(offset);
  });

  // ── Main event loop ──
  const MAX_ITERATIONS = 2000;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    if (active.length === 0) {
      // No active work — check if there are future down-time events to jump to
      let nextWake = Infinity;
      futureDownTimes.forEach(t => {
        if (t > currentTime + 0.001) nextWake = Math.min(nextWake, t);
      });
      if (!isFinite(nextWake)) break; // nothing left

      currentTime = nextWake;
      futureDownTimes.delete(nextWake);
      const started = tryStartReadyLines();
      if (started === 0 && active.length === 0) continue;
      continue;
    }

    // Find next event: either an area finishes or a down-time is reached
    let minDt = Infinity;
    active.forEach(t => {
      const dt = timeToFinish(t);
      if (dt < minDt) minDt = dt;
    });

    // Also check future down-time events
    let nextDownTime = Infinity;
    futureDownTimes.forEach(t => {
      const dt = t - currentTime;
      if (dt > 0.001 && dt < nextDownTime) nextDownTime = dt;
    });

    // Take the earlier of the two
    const useDownTime = nextDownTime < minDt - 0.001;
    const advanceDt = useDownTime ? nextDownTime : minDt;

    if (advanceDt <= 0) {
      // Edge case: force tiny step
      currentTime += 0.001;
    } else if (!isFinite(advanceDt)) {
      break;
    } else {
      currentTime += advanceDt;
    }

    // Advance work on all active areas
    const actualDt = advanceDt > 0 ? advanceDt : 0.001;
    active.forEach(t => {
      t.remainingDivisible = Math.max(0, t.remainingDivisible - t.workers * actualDt);
      t.remainingLocked = Math.max(0, t.remainingLocked - actualDt);
    });

    // Remove reached down-time from future set
    futureDownTimes.forEach(t => {
      if (Math.abs(t - currentTime) < 0.002) futureDownTimes.delete(t);
    });

    // Separate finished from still-active
    const justFinished = [];
    const stillActive = [];
    active.forEach(t => {
      if (timeToFinish(t) < 0.001) justFinished.push(t);
      else stillActive.push(t);
    });

    justFinished.forEach(t => {
      closeSegment(t);
      finishedAreas.push({ ...t, endHour: currentTime, effectiveHours: currentTime - t.startHour });
    });

    active = stillActive;

    // Mark fully done lines
    const linesWithFinished = [...new Set(justFinished.map(t => t.lineIdx))];
    linesWithFinished.forEach(li => {
      if (isLineFullyDone(li)) {
        finishedLines.add(li);
        lineEndTimes[li] = currentTime;
      }
    });

    // ── Worker redistribution priority ──

    // Step 1: For each line that had a finished area, redistribute freed workers
    //         to remaining active areas on the SAME line first
    linesWithFinished.forEach(li => {
      if (finishedLines.has(li)) return; // line is done, workers go to pool
      const freedFromLine = justFinished.filter(t => t.lineIdx === li).reduce((s, t) => s + t.workers, 0);
      if (freedFromLine > 0) {
        // First try to start next pending group on this line
        const hasActiveTasks = active.some(t => t.lineIdx === li);
        const hasPending = pendingAreaGroups[li]?.length > 0;
        if (!hasActiveTasks && hasPending) {
          startAreasForLine(li, freedFromLine);
        } else {
          // Boost remaining active areas on this line
          boostLineAreas(li, freedFromLine);
        }
      }
    });

    // Step 2: Start any pending area groups on started lines that have no active areas
    startReadyPendingGroups();

    // Step 3: Try to start new lines whose down-time has been reached and predecessors are done
    tryStartReadyLines();

    // Step 4: Distribute any remaining idle workers to active areas anywhere
    const idle = availableWorkers();
    if (idle > 0) {
      boostAnyAreas(idle);
    }
  }

  // ── Finalize still-active tasks ──
  active.forEach(t => {
    const dt = timeToFinish(t);
    closeSegment(t);
    if (t.segments.length > 0) {
      const last = t.segments[t.segments.length - 1];
      if (last.endHour === null) last.endHour = currentTime + dt;
    }
    finishedAreas.push({
      ...t, endHour: currentTime + dt, effectiveHours: (currentTime + dt) - t.startHour,
    });
    if (!(t.lineIdx in lineEndTimes)) lineEndTimes[t.lineIdx] = currentTime + dt;
    else lineEndTimes[t.lineIdx] = Math.max(lineEndTimes[t.lineIdx], currentTime + dt);
    finishedLines.add(t.lineIdx);
  });

  // ── Build per-line timeline ──
  const lineTimeline = lines.map(l => {
    const lineAreas = finishedAreas.filter(a => a.lineIdx === l.idx);
    const startHour = lineStartTimes[l.idx] ?? lineDownOffsetHours[l.idx];
    const endHour = lineEndTimes[l.idx] ?? (lineAreas.length > 0 ? Math.max(...lineAreas.map(a => a.endHour)) : startHour);

    // Build crew-level segments from area segments
    const events = [];
    lineAreas.forEach(a => {
      (a.segments || []).forEach(seg => {
        events.push({ time: seg.startHour, delta: seg.workers });
        if (seg.endHour != null) events.push({ time: seg.endHour, delta: -seg.workers });
      });
    });
    events.sort((a, b) => a.time - b.time || b.delta - a.delta);

    const segments = [];
    let crew = 0;
    let segStart = startHour;
    events.forEach(e => {
      if (e.time > segStart + 0.001 && crew > 0) {
        segments.push({ startHour: segStart, endHour: e.time, crew });
      }
      crew = Math.max(0, crew + e.delta);
      segStart = e.time;
    });
    if (crew > 0) segments.push({ startHour: segStart, endHour: endHour, crew });

    return {
      ...l.assignment,
      _idx: l.idx,
      effectiveStartHour: startHour,
      effectiveEndHour: endHour,
      effectiveDurationMin: Math.round((endHour - startHour) * 60),
      currentCrew: l.totalCrew,
      segments,
    };
  });

  const totalHours = lineTimeline.length > 0
    ? Math.max(...lineTimeline.map(l => l.effectiveEndHour))
    : 0;

  return { lineTimeline, totalHours };
}