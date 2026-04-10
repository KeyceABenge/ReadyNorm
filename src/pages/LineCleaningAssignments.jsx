// @ts-nocheck
import { useState, useEffect } from "react";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import {
  AreaRepo,
  AssetGroupRepo,
  AssetRepo,
  LineCleaningAssignmentRepo,
  OrganizationRepo,
  ProductionLineRepo
} from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical, Calendar, Clock, Loader2, AlertCircle, Save, Users, GitBranch, ChevronDown } from "lucide-react";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";
import { cn } from "@/lib/utils";
import { format, addMinutes, parseISO, differenceInMinutes, parse } from "date-fns";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { createPageUrl } from "@/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LineCleaningGantt from "@/components/linecleanings/LineCleaningGantt";
import AreaEmployeeEditor from "@/components/linecleanings/AreaEmployeeEditor";
import SchedulePDFExportButton from "@/components/linecleanings/SchedulePDFExport";
import { computeAreaTimeline } from "@/components/linecleanings/areaTimelineCalc";
import { computeLineTimeline } from "@/components/linecleanings/lineTimelineCalc";

export default function LineCleaningAssignments() {
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedShift, setSelectedShift] = useState("Day");
  const [assignments, setAssignments] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const isAuth = await isAuthenticated();
        if (!isAuth) { window.location.href = "/ManagerLogin"; return; }
        const userData = await getCurrentUser();
        setUser(userData);
        const storedSiteCode = localStorage.getItem('site_code');
        if (!storedSiteCode) { window.location.href = createPageUrl("Home"); return; }
        const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
        if (orgs.length > 0) { setOrgId(orgs[0].id); }
        else { localStorage.removeItem('site_code'); window.location.href = createPageUrl("Home"); }
      } catch (e) { window.location.href = "/ManagerLogin"; }
    };
    getUser();
  }, []);

  // Fetch production lines, areas, and assets
  const { data: productionLines = [] } = useQuery({
    queryKey: ["production_lines", orgId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas", orgId],
    queryFn: () => AreaRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", orgId],
    queryFn: () => AssetRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: assetGroups = [] } = useQuery({
    queryKey: ["asset_groups", orgId],
    queryFn: () => AssetGroupRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  // Fetch existing assignments for selected date/shift
  const { data: existingAssignments = [], refetch } = useQuery({
    queryKey: ["line_cleaning_assignments", orgId, selectedDate, selectedShift],
    queryFn: async () => {
      const all = await LineCleaningAssignmentRepo.filter({ 
        organization_id: orgId,
        scheduled_date: selectedDate,
        shift_name: selectedShift
      });
      return all.sort((a, b) => a.sequence_number - b.sequence_number);
    },
    enabled: !!orgId && !!selectedDate && !!selectedShift
  });

  // Initialize assignments from existing data
  useEffect(() => {
    if (existingAssignments.length > 0) {
      setAssignments(existingAssignments);
      setEditMode(false);
    }
  }, [existingAssignments]);

  const saveMutation = useMutation({
    mutationFn: async (assignmentsToSave) => {
      setSaveMessage("Saving your schedule...");
      setSaveDialogOpen(true);

      try {
        // Delete all existing assignments for this date/shift
        if (existingAssignments.length > 0) {
          setSaveMessage(`Removing ${existingAssignments.length} existing assignment(s)...`);
          const deletePromises = existingAssignments.map(a => 
            LineCleaningAssignmentRepo.delete(a.id)
          );
          await Promise.all(deletePromises);
        }

        // Create new assignments — concurrent lines share the same sequence_number
        setSaveMessage(`Creating ${assignmentsToSave.length} new assignment(s)...`);
        let currentSeq = 1;
        const createPromises = assignmentsToSave.map((assignment, index) => {
          if (index > 0 && !assignment.concurrent) {
            currentSeq++;
          }
          const cleanData = {
            production_line_id: assignment.production_line_id,
            production_line_name: assignment.production_line_name,
            line_down_time: buildLineDownISO(assignment.line_down_time, assignment.line_down_date) || assignment.expected_line_down_time || null,
            expected_line_down_time: assignment.expected_line_down_time || null,
            estimated_end_time: assignment.estimated_end_time,
            duration_minutes: assignment.duration_minutes,
            areas_snapshot: assignment.areas_snapshot,
            assets_snapshot: assignment.assets_snapshot,
            employee_counts: assignment.employee_counts || {},
            total_crew_size: assignment.total_crew_size || 1,
            notes: assignment.notes || "",
            status: "scheduled",
            sequence_number: currentSeq,
            organization_id: orgId,
            scheduled_date: selectedDate,
            shift_name: selectedShift,
            created_by_manager_id: user?.id,
            created_by_manager_name: user?.full_name
          };
          return LineCleaningAssignmentRepo.create(cleanData);
        });
        
        const results = await Promise.all(createPromises);
        
        setSaveMessage(`✓ Successfully saved ${results.length} assignment(s)!`);
        setTimeout(() => {
          setSaveDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ["line_cleaning_assignments"] });
          toast.success("Schedule saved successfully!");
          setEditMode(false);
          refetch();
        }, 2000);
      } catch (error) {
        setSaveMessage(`✗ Error: ${error?.message || "Failed to save assignments"}`);
        setTimeout(() => {
          setSaveDialogOpen(false);
          toast.error(error?.message || "Failed to save assignments");
        }, 2000);
        throw error;
      }
    },
    onError: (error) => {
      console.error("Save failed:", error);
    }
  });

  const handleAddLine = (concurrent = false) => {
    setAssignments([...assignments, {
      production_line_id: "",
      production_line_name: "",
      line_down_date: selectedDate, // date portion of the line-down time
      line_down_time: "", // when this specific line goes down (user input)
      expected_line_down_time: "", // effective start (calculated: max of down time vs previous end)
      duration_minutes: 60,
      estimated_end_time: "",
      areas_snapshot: [],
      assets_snapshot: [],
      notes: "",
      status: "scheduled",
      concurrent: !!concurrent,
    }]);
  };

  const handleRemoveLine = (index) => {
    const updatedAssignments = assignments.filter((_, i) => i !== index);
    
    // If the removed item was the one that a concurrent item pointed to,
    // the next item may need its concurrent flag cleared if it's now first
    if (updatedAssignments.length > 0 && index === 0 && updatedAssignments[0]?.concurrent) {
      updatedAssignments[0].concurrent = false;
    }
    
    // Recalculate all times
    if (index < updatedAssignments.length) {
      recalculateSubsequentTimes(updatedAssignments, Math.max(0, index - 1));
    }
    
    setAssignments(updatedAssignments);
  };

  const handleLineChange = (index, lineId) => {
    const line = productionLines.find(l => l.id === lineId);
    if (!line) return;

    const lineAreas = areas.filter(a => a.production_line_id === lineId);
    const areasSnap = lineAreas.map((a, idx) => ({
      id: a.id,
      name: a.name,
      description: a.description || "",
      sequence_number: idx
    }));
    const assetsSnap = buildAssetsSnapshot(lineId);

    // Default crew = 1; manager sets actual crew size via the editor.
    // Each area gets 1 as its initial ratio (only matters for concurrent areas).
    const empCounts = {};
    lineAreas.forEach(a => { empCounts[a.id] = 1; });
    const defaultCrew = 1;

    const durationMinutes = calcDurationFromEmployees(assetsSnap, areasSnap, empCounts, defaultCrew);

    const updatedAssignments = [...assignments];
    updatedAssignments[index] = {
      ...updatedAssignments[index],
      production_line_id: lineId,
      production_line_name: line.name,
      areas_snapshot: areasSnap,
      assets_snapshot: assetsSnap,
      employee_counts: empCounts,
      total_crew_size: defaultCrew,
      duration_minutes: durationMinutes
    };

    // Recalculate all start/end times from this index onward
    recalculateSubsequentTimes(updatedAssignments, 0);

    setAssignments(updatedAssignments);
  };

  // Calculate duration using waterfall timeline: concurrent areas start together,
  // next sequential area starts when the EARLIEST concurrent area finishes.
  const calcDurationFromEmployees = (assetsSnapshot, areasSnapshot, employeeCounts, totalCrew) => {
    if (!areasSnapshot || areasSnapshot.length === 0 || !assetsSnapshot || assetsSnapshot.length === 0) {
      return Math.ceil(assetsSnapshot?.reduce((s, a) => s + (a.estimated_hours || 0), 0) * 60) || 60;
    }

    const { totalHours } = computeAreaTimeline(areasSnapshot, assetsSnapshot, employeeCounts, totalCrew);
    return Math.ceil(totalHours * 60) || 60;
  };

  // Convert an "HH:mm" time string + the currently selected date into an ISO timestamp.
  // Used because line_down_time is stored as a simple time string to avoid datetime-local
  // browser inconsistencies; all internal calculations still use ISO.
  const buildLineDownISO = (timeStr, dateStr) => {
    const d = dateStr || selectedDate;
    if (!timeStr || !d) return "";
    try {
      const dt = new Date(`${d}T${timeStr}`);
      return isNaN(dt.getTime()) ? "" : dt.toISOString();
    } catch { return ""; }
  };

  const recalculateSubsequentTimes = (assignmentsList, fromIndex) => {
    const cascadeStartTimes = (list, from) => {
      for (let i = Math.max(from, 0); i < list.length; i++) {
        const lineDown = list[i].line_down_time;   // "HH:mm" or ""
        const lineDownISO = buildLineDownISO(lineDown, list[i].line_down_date);

        if (i === 0) {
          list[i].expected_line_down_time = lineDownISO;
        } else if (list[i].concurrent) {
          list[i].expected_line_down_time = list[i - 1].expected_line_down_time;
        } else {
          // Sequential: start at the later of (own line-down time) or (previous group's end)
          let maxPrevEnd = list[i - 1].estimated_end_time || "";
          let j = i - 1;
          while (j > 0 && list[j].concurrent) {
            const prevEnd = list[j - 1].estimated_end_time || "";
            if (prevEnd && prevEnd > maxPrevEnd) maxPrevEnd = prevEnd;
            j--;
          }

          if (lineDownISO && maxPrevEnd) {
            // ISO strings are lexicographically comparable for same-day times
            list[i].expected_line_down_time = lineDownISO > maxPrevEnd ? lineDownISO : maxPrevEnd;
          } else if (maxPrevEnd) {
            list[i].expected_line_down_time = maxPrevEnd;
          } else if (lineDownISO) {
            list[i].expected_line_down_time = lineDownISO;
          } else {
            list[i].expected_line_down_time = "";
          }
        }

        if (list[i].expected_line_down_time && list[i].duration_minutes) {
          const startTime = parseISO(list[i].expected_line_down_time);
          list[i].estimated_end_time = addMinutes(startTime, list[i].duration_minutes).toISOString();
        }
      }
    };

    // Pass 1: cascade start times based on current durations
    cascadeStartTimes(assignmentsList, fromIndex);

    // Pass 2: run cross-line simulation to get effective durations with worker flow
    const validAssignments = assignmentsList.filter(a => a.production_line_id && a.expected_line_down_time);
    if (validAssignments.length > 1) {
      let currentSeq = 0;
      const simAssignments = validAssignments.map((a, idx) => {
        if (idx > 0 && !a.concurrent) currentSeq++;
        return { ...a, sequence_number: currentSeq };
      });

      const { lineTimeline } = computeLineTimeline(simAssignments, assets, assetGroups);

      if (lineTimeline.length > 0) {
        lineTimeline.forEach(lt => {
          const realIdx = assignmentsList.indexOf(validAssignments[lt._idx]);
          if (realIdx >= 0 && lt.effectiveDurationMin > 0) {
            assignmentsList[realIdx].duration_minutes = lt.effectiveDurationMin;
            if (assignmentsList[realIdx].expected_line_down_time) {
              const start = parseISO(assignmentsList[realIdx].expected_line_down_time);
              assignmentsList[realIdx].estimated_end_time = addMinutes(start, lt.effectiveDurationMin).toISOString();
            }
          }
        });
      }
    }

    // Pass 3: re-cascade start times with updated durations from simulation
    cascadeStartTimes(assignmentsList, fromIndex);
  };

  const handleLineDownTimeChange = (index, time) => {
    const updatedAssignments = [...assignments];
    updatedAssignments[index].line_down_time = time;
    recalculateSubsequentTimes(updatedAssignments, 0);
    setAssignments(updatedAssignments);
  };

  const handleLineDownDateChange = (index, date) => {
    const updatedAssignments = [...assignments];
    updatedAssignments[index].line_down_date = date;
    recalculateSubsequentTimes(updatedAssignments, 0);
    setAssignments(updatedAssignments);
  };

  const handleAreasSnapshotChange = (index, newAreasSnapshot) => {
    const updatedAssignments = [...assignments];
    updatedAssignments[index].areas_snapshot = newAreasSnapshot;

    const newDuration = calcDurationFromEmployees(
      updatedAssignments[index].assets_snapshot,
      newAreasSnapshot,
      updatedAssignments[index].employee_counts || {},
      updatedAssignments[index].total_crew_size || 1
    );
    updatedAssignments[index].duration_minutes = newDuration;

    recalculateSubsequentTimes(updatedAssignments, 0);
    setAssignments(updatedAssignments);
  };

  const handleTotalCrewChange = (index, newCrew) => {
    const updatedAssignments = [...assignments];
    updatedAssignments[index].total_crew_size = newCrew;

    const newDuration = calcDurationFromEmployees(
      updatedAssignments[index].assets_snapshot,
      updatedAssignments[index].areas_snapshot,
      updatedAssignments[index].employee_counts || {},
      newCrew
    );
    updatedAssignments[index].duration_minutes = newDuration;

    recalculateSubsequentTimes(updatedAssignments, 0);
    setAssignments(updatedAssignments);
  };

  const handleEmployeeCountsChange = (index, newCounts) => {
    const updatedAssignments = [...assignments];
    updatedAssignments[index].employee_counts = newCounts;

    const newDuration = calcDurationFromEmployees(
      updatedAssignments[index].assets_snapshot,
      updatedAssignments[index].areas_snapshot,
      newCounts,
      updatedAssignments[index].total_crew_size || 1
    );
    updatedAssignments[index].duration_minutes = newDuration;

    recalculateSubsequentTimes(updatedAssignments, 0);
    setAssignments(updatedAssignments);
  };

  const handleDurationChange = (index, duration) => {
    const updatedAssignments = [...assignments];
    updatedAssignments[index].duration_minutes = parseInt(duration) || 0;

    recalculateSubsequentTimes(updatedAssignments, 0);
    setAssignments(updatedAssignments);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(assignments);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    // Recalculate all times after reordering (respecting concurrent flags)
    recalculateSubsequentTimes(items, 0);

    setAssignments(items);
  };

  const handleSave = () => {
    const updated = [...assignments];
    // Final recalculate to make sure everything is consistent
    recalculateSubsequentTimes(updated, 0);
    setAssignments(updated);
    
    console.log("Save clicked. Assignments:", updated);
    
    // Validation
    const errors = [];
    updated.forEach((assignment, index) => {
      if (!assignment.production_line_id) {
        errors.push(`Assignment ${index + 1}: Production line is required`);
      }
      // First non-concurrent assignment must have a line down time
      if (index === 0 && !assignment.line_down_time) {
        errors.push(`Assignment ${index + 1}: Line down time is required for the first line`);
      }
      if (!assignment.duration_minutes || assignment.duration_minutes <= 0) {
        errors.push(`Assignment ${index + 1}: Duration must be greater than 0`);
      }
    });

    if (errors.length > 0) {
      console.error("Validation errors:", errors);
      toast.error(errors.join("\n"));
      return;
    }

    // Check for duplicates
    const lineIds = assignments.map(a => a.production_line_id);
    const duplicates = lineIds.filter((id, index) => lineIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.error("Duplicate lines detected");
      toast.error("Duplicate production lines detected. Each line can only be scheduled once per date/shift.");
      return;
    }

    console.log("Validation passed. Calling saveMutation...");
    saveMutation.mutate(updated);
  };

  // Build a fresh assets snapshot for a given production line using current Asset + AssetGroup data
  const buildAssetsSnapshot = (lineId) => {
    const lineAssets = assets.filter(a => a.production_line_id === lineId);
    const lineGroups = assetGroups.filter(g => g.production_line_id === lineId);

    const groupedAssetIds = new Set();
    const snap = [];

    for (const group of lineGroups) {
      if (group.asset_ids?.length > 0) {
        group.asset_ids.forEach(id => groupedAssetIds.add(id));
        snap.push({
          id: group.id,
          name: group.name,
          area_id: group.area_id,
          description: `Group: ${group.asset_ids.length} assets`,
          estimated_hours: group.estimated_hours || 0,
          is_locked: group.is_locked !== false,
          is_group: true,
          asset_ids: group.asset_ids
        });
      }
    }

    for (const a of lineAssets) {
      if (!groupedAssetIds.has(a.id)) {
        snap.push({
          id: a.id,
          name: a.name,
          area_id: a.area_id,
          description: a.description || "",
          estimated_hours: a.estimated_hours || 0,
          is_locked: a.is_locked || false
        });
      }
    }

    return snap;
  };

  const handleStartEdit = () => {
    if (existingAssignments.length > 0) {
      // Rebuild snapshots from live data so is_locked + groups are accurate
      const refreshed = existingAssignments.map((a, idx) => {
        const lineAreas = areas.filter(ar => ar.production_line_id === a.production_line_id);
        // Preserve existing area sequence_numbers from saved snapshot, fall back to index
        const existingAreaSeqs = {};
        (a.areas_snapshot || []).forEach(ea => { if (ea.sequence_number != null) existingAreaSeqs[ea.id] = ea.sequence_number; });
        const areasSnap = lineAreas.map((ar, idx) => ({
          id: ar.id,
          name: ar.name,
          description: ar.description || "",
          sequence_number: existingAreaSeqs[ar.id] ?? idx
        }));
        const assetsSnap = buildAssetsSnapshot(a.production_line_id);

        // Preserve existing employee_counts; fill in defaults for any new areas
        const empCounts = { ...(a.employee_counts || {}) };
        lineAreas.forEach(ar => { if (!empCounts[ar.id]) empCounts[ar.id] = 1; });

        const crewSize = a.total_crew_size || Object.values(empCounts).reduce((s, c) => s + c, 0) || 1;
        const durationMinutes = calcDurationFromEmployees(assetsSnap, areasSnap, empCounts, crewSize);

        // Recalculate end time
        let estimatedEndTime = a.estimated_end_time;
        if (a.expected_line_down_time) {
          estimatedEndTime = addMinutes(parseISO(a.expected_line_down_time), durationMinutes).toISOString();
        }

        // Infer concurrent flag: same sequence_number as previous = concurrent
        const isConcurrent = idx > 0 && a.sequence_number === existingAssignments[idx - 1].sequence_number;

        return {
          ...a,
          areas_snapshot: areasSnap,
          assets_snapshot: assetsSnap,
          employee_counts: empCounts,
          total_crew_size: crewSize,
          duration_minutes: durationMinutes,
          estimated_end_time: estimatedEndTime,
          concurrent: isConcurrent,
          // Convert saved line_down_time (may be ISO from old records or "HH:mm" from new) to "HH:mm"
          line_down_time: (() => {
            const t = a.line_down_time || a.expected_line_down_time;
            if (!t) return "";
            if (t.includes('T')) return format(parseISO(t), "HH:mm");  // ISO → HH:mm
            return t;  // already HH:mm
          })(),
          line_down_date: (() => {
            const t = a.line_down_time || a.expected_line_down_time;
            if (t && t.includes('T')) return format(parseISO(t), "yyyy-MM-dd");
            return a.line_down_date || selectedDate;
          })(),
        };
      });

      // Recalculate chain of start/end times (respecting concurrent flags)
      recalculateSubsequentTimes(refreshed, 0);

      setAssignments(refreshed);
    }
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setAssignments([...existingAssignments]);
    setEditMode(false);
  };

  if (!orgId) {
    return <ReadyNormLoader variant="inline" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Line Cleaning Schedule</h2>
        <p className="text-slate-500 mt-1">Schedule production line cleanings for employees</p>
      </div>

      {/* Date and Shift Selector */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Scheduled Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="mt-1 w-full flex items-center justify-between gap-2 h-10 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-800">
                      {selectedDate ? format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'EEEE, MMM d, yyyy') : 'Pick a date'}
                    </span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate ? parse(selectedDate, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(d) => d && setSelectedDate(format(d, 'yyyy-MM-dd'))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Shift</Label>
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Day">Day Shift</SelectItem>
                <SelectItem value="Night">Night Shift</SelectItem>
                <SelectItem value="Morning">Morning Shift</SelectItem>
                <SelectItem value="Evening">Evening Shift</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Edit Controls */}
      {!editMode && existingAssignments.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600">
            {existingAssignments.length} assignment{existingAssignments.length !== 1 ? 's' : ''} scheduled
          </p>
          <div className="flex items-center gap-2">
            <SchedulePDFExportButton
              assignments={existingAssignments}
              selectedDate={selectedDate}
              selectedShift={selectedShift}
            />
            <Button onClick={handleStartEdit}>
              Edit Schedule
            </Button>
          </div>
        </div>
      )}

      {!editMode && existingAssignments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-200">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No assignments scheduled</h3>
          <p className="text-slate-500 mb-4">Create a new schedule for this date and shift</p>
          <Button onClick={handleStartEdit}>
            <Plus className="w-4 h-4 mr-2" />
            Create Schedule
          </Button>
        </div>
      )}

      {/* Assignment List (Edit Mode) */}
      {editMode && (
        <>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="assignments">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {assignments.map((assignment, index) => (
                    <Draggable key={index} draggableId={`assignment-${index}`} index={index}>
                      {(provided) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="p-6"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              {...provided.dragHandleProps}
                              className="mt-8 cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-5 h-5 text-slate-400" />
                            </div>

                            <div className="flex-1 space-y-4">
                              {/* Sequence Number + Concurrent indicator */}
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-8 h-8 rounded-full text-white flex items-center justify-center font-semibold text-sm",
                                  assignment.concurrent ? "bg-violet-600" : "bg-slate-900"
                                )}>
                                  {index + 1}
                                </div>
                                <span className="text-sm text-slate-500">
                                  {assignment.concurrent ? "Concurrent with previous" : "Cleaning Order"}
                                </span>
                                {index > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                      "text-xs h-7 px-2",
                                      assignment.concurrent ? "text-violet-700 hover:text-violet-800" : "text-slate-500 hover:text-slate-700"
                                    )}
                                    onClick={() => {
                                      const updated = [...assignments];
                                      updated[index].concurrent = !updated[index].concurrent;
                                      recalculateSubsequentTimes(updated, 0);
                                      setAssignments(updated);
                                    }}
                                  >
                                    {assignment.concurrent ? "⇄ Make Sequential" : "⇉ Make Concurrent"}
                                  </Button>
                                )}
                              </div>

                              {/* Production Line */}
                              <div>
                                <Label>Production Line *</Label>
                                <Select
                                  value={assignment.production_line_id}
                                  onValueChange={(value) => handleLineChange(index, value)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select a production line..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {productionLines.map(line => (
                                      <SelectItem key={line.id} value={line.id}>
                                        {line.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Timing Timeline */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {/* 1. Line Goes Down */}
                                <div className="col-span-2 sm:col-span-1 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-400" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Line Goes Down</span>
                                  </div>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="w-full flex items-center justify-between gap-1.5 h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                        <span className="font-medium">
                                          {assignment.line_down_date || selectedDate
                                            ? format(parse(assignment.line_down_date || selectedDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')
                                            : 'Pick date'}
                                        </span>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <CalendarPicker
                                        mode="single"
                                        selected={parse(assignment.line_down_date || selectedDate, 'yyyy-MM-dd', new Date())}
                                        onSelect={(d) => d && handleLineDownDateChange(index, format(d, 'yyyy-MM-dd'))}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <input
                                    type="time"
                                    value={assignment.line_down_time || ""}
                                    onChange={(e) => handleLineDownTimeChange(index, e.target.value || "")}
                                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                  />
                                </div>

                                {/* 2. Cleaning Starts */}
                                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Starts</span>
                                  </div>
                                  <p className="text-xl font-bold text-emerald-700 leading-tight">
                                    {assignment.expected_line_down_time
                                      ? format(parseISO(assignment.expected_line_down_time), "h:mm a")
                                      : <span className="text-slate-300 text-sm font-normal">—</span>}
                                  </p>
                                  {assignment.expected_line_down_time && assignment.line_down_time && (() => {
                                    const ldISO = buildLineDownISO(assignment.line_down_time, assignment.line_down_date);
                                    return ldISO && assignment.expected_line_down_time > ldISO;
                                  })() && (
                                    <p className="text-[11px] text-amber-500 font-medium">
                                      ⏳ {(() => {
                                        const ldISO = buildLineDownISO(assignment.line_down_time, assignment.line_down_date);
                                        const diff = differenceInMinutes(parseISO(assignment.expected_line_down_time), parseISO(ldISO));
                                        return `${diff}m idle`;
                                      })()} waiting
                                    </p>
                                  )}
                                </div>

                                {/* 3. Duration */}
                                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      value={assignment.duration_minutes}
                                      onChange={(e) => handleDurationChange(index, e.target.value)}
                                      className="w-20 h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                      min="1"
                                    />
                                    <span className="text-xs text-slate-400 font-medium">min</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">auto-calculated</p>
                                </div>

                                {/* 4. Cleaning Ends */}
                                <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Ends</span>
                                  </div>
                                  <p className="text-xl font-bold text-blue-700 leading-tight">
                                    {assignment.estimated_end_time
                                      ? format(parseISO(assignment.estimated_end_time), "h:mm a")
                                      : <span className="text-slate-300 text-sm font-normal">—</span>}
                                  </p>
                                  {assignment.estimated_end_time && (() => {
                                    const endDate = format(parseISO(assignment.estimated_end_time), "yyyy-MM-dd");
                                    const startDate = assignment.line_down_date || selectedDate;
                                    return endDate !== startDate ? (
                                      <p className="text-[11px] text-blue-400 font-medium">
                                        +1 day · {format(parseISO(assignment.estimated_end_time), "MMM d")}
                                      </p>
                                    ) : null;
                                  })()}
                                </div>
                              </div>

                              {/* Areas and Assets Info */}
                              {assignment.production_line_id && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <h4 className="font-semibold text-sm text-blue-900 mb-2">
                                    Cleaning Scope
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-blue-700 font-medium">Areas:</span> {assignment.areas_snapshot.length}
                                    </div>
                                    <div>
                                      <span className="text-blue-700 font-medium">Tasks:</span> {assignment.assets_snapshot.length}
                                      {assignment.assets_snapshot.some(a => a.is_group) && (
                                        <span className="text-blue-500 ml-1">
                                          ({assignment.assets_snapshot.filter(a => a.is_group).length} groups)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {assignment.areas_snapshot.length > 0 && (
                                    <div className="mt-2 text-xs text-blue-700">
                                      {assignment.areas_snapshot.map(a => a.name).join(", ")}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Employee Counts Per Area */}
                              {assignment.production_line_id && assignment.areas_snapshot.length > 0 && (
                                <AreaEmployeeEditor
                                  areasSnapshot={assignment.areas_snapshot}
                                  assetsSnapshot={assignment.assets_snapshot}
                                  employeeCounts={assignment.employee_counts || {}}
                                  totalCrewSize={assignment.total_crew_size || 1}
                                  onChange={(newCounts) => handleEmployeeCountsChange(index, newCounts)}
                                  onTotalCrewChange={(newCrew) => handleTotalCrewChange(index, newCrew)}
                                  onAreasSnapshotChange={(newAreas) => handleAreasSnapshotChange(index, newAreas)}
                                />
                              )}

                              {/* Notes */}
                              <div>
                                <Label>Notes (Optional)</Label>
                                <Textarea
                                  value={assignment.notes || ""}
                                  onChange={(e) => {
                                    const updated = [...assignments];
                                    updated[index].notes = e.target.value;
                                    setAssignments(updated);
                                  }}
                                  className="mt-1"
                                  rows={2}
                                  placeholder="Add any special instructions..."
                                />
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveLine(index)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Add Line Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleAddLine(false)}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Next Line
            </Button>
            {assignments.length > 0 && (
              <Button
                variant="outline"
                onClick={() => handleAddLine(true)}
                className="flex-1 border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                <GitBranch className="w-4 h-4 mr-2" />
                Add Concurrent Line
              </Button>
            )}
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || assignments.length === 0}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Schedule
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Gantt Chart (Read-Only) */}
      {!editMode && existingAssignments.length > 0 && (
        <LineCleaningGantt assignments={existingAssignments} liveAssets={assets} liveAssetGroups={assetGroups} selectedDate={selectedDate} selectedShift={selectedShift} />
      )}

      {/* Display Mode (Read-Only) */}
      {!editMode && existingAssignments.length > 0 && (
        <div className="space-y-4">
          {existingAssignments.map((assignment, index) => {
           const isConcurrent = index > 0 && assignment.sequence_number === existingAssignments[index - 1].sequence_number;
           return (
           <Card key={assignment.id} className={cn("p-6", isConcurrent && "border-l-4 border-l-violet-400")}>
             <div className="flex items-start gap-4">
               <div className={cn(
                 "w-8 h-8 rounded-full text-white flex items-center justify-center font-semibold text-sm flex-shrink-0",
                 isConcurrent ? "bg-violet-600" : "bg-slate-900"
               )}>
                 {assignment.sequence_number || index + 1}
               </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {assignment.production_line_name}
                    </h3>
                    {isConcurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                        Concurrent
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Line Down:</span>
                      <div className="font-medium text-slate-900">
                        {assignment.line_down_time
                          ? (assignment.line_down_time.includes('T')
                            ? format(parseISO(assignment.line_down_time), "h:mm a")
                            : format(new Date(`${assignment.line_down_date || selectedDate}T${assignment.line_down_time}`), "h:mm a"))
                          : (assignment.expected_line_down_time
                            ? format(parseISO(assignment.expected_line_down_time), "h:mm a")
                            : "—")}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Cleaning Starts:</span>
                      <div className="font-medium text-slate-900">
                        {format(parseISO(assignment.expected_line_down_time), "h:mm a")}
                      </div>
                      {assignment.line_down_time && assignment.expected_line_down_time && (() => {
                        const ldISO = assignment.line_down_time.includes('T')
                          ? assignment.line_down_time
                          : new Date(`${selectedDate}T${assignment.line_down_time}`).toISOString();
                        return assignment.expected_line_down_time > ldISO;
                      })() && (
                        <span className="text-[10px] text-amber-600">Waiting for prev line</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500">End:</span>
                      <div className="font-medium text-slate-900">
                        {format(parseISO(assignment.estimated_end_time), "h:mm a")}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Duration:</span>
                      <div className="font-medium text-slate-900">
                        {assignment.duration_minutes} min
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span>
                      <div className="font-medium text-slate-900 capitalize">
                        {assignment.status}
                      </div>
                    </div>
                  </div>
                  {assignment.notes && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                      <span className="font-medium">Notes:</span> {assignment.notes}
                    </div>
                  )}
                  <div className="mt-3 flex gap-4 text-xs text-slate-500">
                    <span>{assignment.areas_snapshot.length} areas</span>
                    <span>•</span>
                    <span>{assignment.assets_snapshot.length} assets</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs border border-violet-200 font-medium">
                      <Users className="w-3 h-3" />
                      Crew: {assignment.total_crew_size || '—'}
                    </span>
                    {assignment.employee_counts && assignment.areas_snapshot.map(area => {
                      const count = assignment.employee_counts[area.id];
                      if (!count) return null;
                      return (
                        <span key={area.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full text-xs border border-slate-200">
                          {area.name}: {count}p
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          );
          })}
        </div>
      )}

      {/* Save Progress Dialog */}
      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saving Schedule</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-6">
            <div className="flex items-center gap-3 mb-4">
              {saveMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
              ) : saveMessage.startsWith("✓") ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm">✓</div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-sm">✗</div>
              )}
              <span className="text-sm font-medium text-slate-900">{saveMessage}</span>
            </div>
          </div>
          {!saveMutation.isPending && (
            <AlertDialogAction onClick={() => setSaveDialogOpen(false)}>
              {saveMessage.startsWith("✓") ? "Done" : "Close"}
            </AlertDialogAction>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}