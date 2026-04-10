/**
 * Event-driven worker-flow simulation for a SINGLE line's area cleaning.
 *
 * Model:
 * - A fixed crew of `totalCrew` workers is distributed across concurrent areas.
 * - `employeeCounts` gives the INITIAL distribution for areas that start together.
 * - When an area finishes, its workers are immediately freed and redistributed
 *   to still-running areas, proportionally reducing their remaining duration.
 * - Sequential areas: locked and unlocked work are done in series by the same crew.
 *   time = lockedHours + divisibleHours / workers
 *   (1 person on 3h locked + 2.5h unlocked = 5.5h; 4 people = 3h + 0.625h = 3.625h)
 * - Concurrent areas: different workers handle locked vs unlocked in parallel.
 *   time = max(lockedHours, divisibleHours / workers)
 *
 * Returns { areaTimeline, totalHours }
 *   areaTimeline: array of { id, name, seq, effectiveHours, employeeCount, startHour, endHour, segments }
 *   segments: array of { startHour, endHour, workers } — worker count changes over time
 *   totalHours: total span from 0 to the last area's end
 */
export function computeAreaTimeline(areasSnapshot, assetsSnapshot, employeeCounts, totalCrew) {
  const areas = areasSnapshot || [];
  const assets = assetsSnapshot || [];
  const empCounts = employeeCounts || {};
  const crew = totalCrew || 1;

  if (areas.length === 0) return { areaTimeline: [], totalHours: 0 };

  // Build area info
  const areaInfo = areas.map((area, idx) => {
    const areaAssets = assets.filter(a => a.area_id === area.id);
    const lockedHours = areaAssets.filter(a => a.is_locked).reduce((s, a) => s + (a.estimated_hours || 0), 0);
    const totalHours = areaAssets.reduce((s, a) => s + (a.estimated_hours || 0), 0);
    const divisibleHours = Math.max(0, totalHours - lockedHours);
    const isFullyLocked = divisibleHours <= 0 && lockedHours > 0;
    return {
      id: area.id,
      name: area.name,
      seq: area.sequence_number ?? idx,
      rawHours: totalHours,
      lockedHours,
      divisibleHours,
      isFullyLocked,
      initialWorkers: empCounts[area.id] || 1,
    };
  });

  // Group by sequence_number (same seq = concurrent)
  const seqMap = {};
  areaInfo.forEach(a => {
    if (!seqMap[a.seq]) seqMap[a.seq] = [];
    seqMap[a.seq].push(a);
  });
  const sortedSeqs = Object.keys(seqMap).map(Number).sort((a, b) => a - b);
  const pendingGroups = sortedSeqs.map(seq => seqMap[seq]);

  let active = [];
  const finished = [];
  let currentTime = 0;

  function timeToFinish(a) {
    const divTime = a.workers > 0 ? a.remainingDivisible / a.workers : Infinity;
    // Sequential: locked + divisible phases run in series → sum
    // Concurrent: different workers handle each in parallel → max
    return a.isSequential
      ? a.remainingLocked + divTime
      : Math.max(a.remainingLocked, divTime);
  }

  function closeSegment(a) {
    if (a.segments.length > 0) {
      const last = a.segments[a.segments.length - 1];
      if (last.endHour === null) last.endHour = currentTime;
    }
  }

  function openSegment(a) {
    a.segments.push({ startHour: currentTime, endHour: null, workers: a.workers });
  }

  function canBenefit(a) {
    if (a.isFullyLocked) return false;
    if (a.remainingDivisible <= 0.001) return false;
    if (a.isSequential) return true; // more workers always speeds up the divisible phase
    const divTime = a.remainingDivisible / a.workers;
    return divTime > a.remainingLocked + 0.001;
  }

  function startGroup(group, time, availableWorkers) {
    const workersToUse = availableWorkers ?? crew;

    if (group.length === 1) {
      const a = group[0];
      // Sequential area: locked and divisible work done in series by the full crew.
      // time = lockedHours + divisibleHours / workers
      active.push({
        ...a, startHour: time, workers: workersToUse,
        isSequential: true,
        remainingDivisible: a.divisibleHours,
        remainingLocked: a.lockedHours,
        segments: [{ startHour: time, endHour: null, workers: workersToUse }],
      });
      return;
    }

    const lockedAreas = group.filter(a => a.isFullyLocked);
    const unlockedAreas = group.filter(a => !a.isFullyLocked);
    let remaining = workersToUse - lockedAreas.length;

    lockedAreas.forEach(a => {
      active.push({
        ...a, startHour: time, workers: 1,
        remainingDivisible: a.divisibleHours, remainingLocked: a.lockedHours,
        segments: [{ startHour: time, endHour: null, workers: 1 }],
      });
    });

    if (unlockedAreas.length > 0) {
      remaining = Math.max(remaining, unlockedAreas.length);
      const totalRequested = unlockedAreas.reduce((s, a) => s + a.initialWorkers, 0);

      unlockedAreas.forEach((a, i) => {
        let workers;
        if (i === unlockedAreas.length - 1) {
          workers = Math.max(1, remaining);
        } else {
          workers = Math.max(1, Math.round((a.initialWorkers / totalRequested) * (workersToUse - lockedAreas.length)));
          workers = Math.min(workers, remaining - (unlockedAreas.length - 1 - i));
          workers = Math.max(1, workers);
        }
        remaining -= workers;
        active.push({
          ...a, startHour: time, workers,
          remainingDivisible: a.divisibleHours, remainingLocked: a.lockedHours,
          segments: [{ startHour: time, endHour: null, workers }],
        });
      });
    }
  }

  // Start first group
  if (pendingGroups.length > 0) {
    startGroup(pendingGroups.shift(), 0, crew);
  }

  const MAX_ITERATIONS = 500;
  let iterations = 0;

  while (active.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;

    let minDt = Infinity;
    active.forEach(a => {
      const dt = timeToFinish(a);
      if (dt < minDt) minDt = dt;
    });

    if (minDt <= 0) minDt = 0.001;
    if (!isFinite(minDt)) break;

    currentTime += minDt;
    active.forEach(a => {
      if (a.isSequential) {
        // Phase 1: crew works through divisible hours; Phase 2: locked hours run solo
        if (a.remainingDivisible > 0.001) {
          const deplete = a.workers * minDt;
          if (deplete >= a.remainingDivisible) {
            // Divisible phase completes this tick; remaining tick time goes to locked phase
            const lockedTime = (deplete - a.remainingDivisible) / a.workers;
            a.remainingDivisible = 0;
            a.remainingLocked = Math.max(0, a.remainingLocked - lockedTime);
          } else {
            a.remainingDivisible -= deplete;
          }
        } else {
          a.remainingLocked = Math.max(0, a.remainingLocked - minDt);
        }
      } else {
        a.remainingDivisible = Math.max(0, a.remainingDivisible - a.workers * minDt);
        a.remainingLocked = Math.max(0, a.remainingLocked - minDt);
      }
    });

    const justFinished = [];
    const stillActive = [];
    active.forEach(a => {
      if (timeToFinish(a) < 0.001) justFinished.push(a);
      else stillActive.push(a);
    });

    let freedWorkers = 0;
    justFinished.forEach(a => {
      freedWorkers += a.workers;
      closeSegment(a);
      finished.push({
        id: a.id, name: a.name, seq: a.seq,
        startHour: a.startHour, endHour: currentTime,
        effectiveHours: currentTime - a.startHour,
        employeeCount: a.workers,
        segments: a.segments,
      });
    });

    active = stillActive;

    // Start next pending group if available
    if (freedWorkers > 0 && pendingGroups.length > 0) {
      const nextGroup = pendingGroups.shift();
      const beforeCount = active.length;
      startGroup(nextGroup, currentTime, freedWorkers);
      // Count how many workers the new group consumed
      const newEntries = active.slice(beforeCount);
      const consumed = newEntries.reduce((s, a) => s + a.workers, 0);
      freedWorkers -= consumed;
    }

    // Redistribute remaining freed workers to still-active areas
    if (freedWorkers > 0 && active.length > 0) {
      const eligible = active.filter(canBenefit);
      if (eligible.length > 0) {
        const totalWork = eligible.reduce((s, a) => s + a.remainingDivisible, 0);
        let toDistribute = freedWorkers;

        const additions = eligible.map(a => {
          const share = totalWork > 0 ? Math.max(1, Math.round((a.remainingDivisible / totalWork) * freedWorkers)) : 1;
          const give = Math.min(share, toDistribute);
          toDistribute -= give;
          return { area: a, give };
        });

        // Give remainder to area with most remaining work
        if (toDistribute > 0) {
          const best = eligible.reduce((b, a) => a.remainingDivisible > b.remainingDivisible ? a : b, eligible[0]);
          const entry = additions.find(a => a.area === best);
          if (entry) entry.give += toDistribute;
        }

        additions.forEach(({ area, give }) => {
          if (give > 0) {
            closeSegment(area);
            area.workers += give;
            openSegment(area);
          }
        });
      }
    }
  }

  // Handle still-active areas
  active.forEach(a => {
    const dt = timeToFinish(a);
    closeSegment(a);
    if (a.segments.length > 0) {
      const last = a.segments[a.segments.length - 1];
      if (last.endHour === null) last.endHour = currentTime + dt;
    }
    finished.push({
      id: a.id, name: a.name, seq: a.seq,
      startHour: a.startHour, endHour: currentTime + dt,
      effectiveHours: (currentTime + dt) - a.startHour,
      employeeCount: a.workers,
      segments: a.segments,
    });
  });

  const totalHours = finished.length > 0 ? Math.max(...finished.map(a => a.endHour)) : 0;

  return { areaTimeline: finished, totalHours };
}