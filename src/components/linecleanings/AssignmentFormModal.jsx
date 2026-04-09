import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, X, GripVertical, Clock } from "lucide-react";
import { format } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";

export default function AssignmentFormModal({ 
  open, 
  onOpenChange, 
  productionLines,
  areas,
  assets,
  assetGroups,
  onSubmit, 
  isLoading,
  existingAssignments = []
}) {
  const [selectedLines, setSelectedLines] = useState([]);
  const [lineDownTime, setLineDownTime] = useState("");
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [employeeCount, setEmployeeCount] = useState({});
  // Per-line expected down time overrides (keyed by lineId)
  const [lineDownTimeOverrides, setLineDownTimeOverrides] = useState({});

  // Reset form when modal is closed
  useEffect(() => {
    if (!open) {
      setSelectedLines([]);
      setLineDownTime("");
      setAddLineOpen(false);
      setLineDownTimeOverrides({});
    }
  }, [open]);

  // Calculate hours for a line (with breakdown of locked vs unlocked)
  const calculateLineHours = (lineId, numEmployees = 1) => {
    const lineAreas = areas.filter(a => a.production_line_id === lineId);
    let lockedHours = 0;
    let unlockedHours = 0;

    lineAreas.forEach(area => {
      const areaAssets = assets.filter(a => a.area_id === area.id);
      const areaGroups = assetGroups?.filter(g => g.area_id === area.id) || [];
      const groupedAssetIds = areaGroups.flatMap(g => g.asset_ids || []);
      const ungroupedAssets = areaAssets.filter(a => !groupedAssetIds.includes(a.id));

      areaGroups.forEach(group => {
        if (group.is_locked) {
          lockedHours += group.estimated_hours || 0;
        } else {
          unlockedHours += group.estimated_hours || 0;
        }
      });
      
      ungroupedAssets.forEach(asset => {
        if (asset.is_locked) {
          lockedHours += asset.estimated_hours || 0;
        } else {
          unlockedHours += asset.estimated_hours || 0;
        }
      });
    });

    const adjustedUnlockedHours = unlockedHours / numEmployees;
    return lockedHours + adjustedUnlockedHours;
  };

  // Parse datetime-local string as local time (not UTC)
  const parseLocalDateTime = (dateTimeString) => {
    if (!dateTimeString) return null;
    const [date, time] = dateTimeString.split('T');
    const [year, month, day] = date.split('-');
    const [hours, minutes] = time.split(':');
    return new Date(year, month - 1, day, hours, minutes, 0);
  };

  // Calculate start times based on line down time and selected lines
  // Each line can have its own "expected line down time" override
  const calculateStartTimes = () => {
    if (!lineDownTime || selectedLines.length === 0) return [];

    let cascadeStartTime = parseLocalDateTime(lineDownTime);
    const times = [];

    selectedLines.forEach((lineId, idx) => {
      const numEmployees = employeeCount[lineId] || 1;
      const hours = calculateLineHours(lineId, numEmployees);

      // Use per-line override if set, otherwise cascade from previous line's end
      const overrideTime = lineDownTimeOverrides[lineId];
      let startTime;
      if (overrideTime) {
        startTime = parseLocalDateTime(overrideTime);
      } else {
        startTime = new Date(cascadeStartTime);
      }

      const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

      times.push({
        lineId,
        hours,
        startTime,
        endTime,
        numEmployees,
        hasOverride: !!overrideTime
      });

      // Next cascading start = end of this line (regardless of whether this line was overridden)
      cascadeStartTime = endTime;
    });

    return times;
  };

  const scheduleTimes = calculateStartTimes();

  const handleAddLine = (lineId) => {
    if (!selectedLines.includes(lineId)) {
      setSelectedLines([...selectedLines, lineId]);
      setAddLineOpen(false);
    }
  };

  const handleRemoveLine = (lineId) => {
    setSelectedLines(selectedLines.filter(id => id !== lineId));
  };

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;

    const items = Array.from(selectedLines);
    const [reorderedItem] = items.splice(source.index, 1);
    items.splice(destination.index, 0, reorderedItem);
    setSelectedLines(items);
  };

  const availableLines = productionLines.filter(l => !selectedLines.includes(l.id));

  const handleSubmit = () => {
    if (selectedLines.length === 0 || !lineDownTime) return;

    const times = calculateStartTimes();

    // Format as ISO string but preserve the local time values
    const formatLocalAsISO = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
    };

    // Create assignment for each line
    selectedLines.forEach((lineId, idx) => {
      const lineSchedule = times[idx];

      onSubmit({
        production_line_id: lineId,
        estimated_start_time: formatLocalAsISO(lineSchedule.startTime),
        estimated_end_time: formatLocalAsISO(lineSchedule.endTime),
        estimated_total_hours: lineSchedule.hours,
        assigned_employees: lineSchedule.numEmployees
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Line Cleaning</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="lineDownTime">Default Line Down Time</Label>
            <Input
              id="lineDownTime"
              type="datetime-local"
              value={lineDownTime}
              onChange={(e) => setLineDownTime(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">First line starts at this time. Subsequent lines cascade unless you set a custom down time per line below.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Lines to Clean (in order)</Label>
              {availableLines.length > 0 && (
                <Select onValueChange={(value) => handleAddLine(value)}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue placeholder="+ Add Line" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLines.map(line => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedLines.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Select lines to clean</p>
            ) : null}
            
            {selectedLines.length > 0 && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="lines">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {selectedLines.map((lineId, idx) => {
                        const line = productionLines.find(l => l.id === lineId);
                        const schedule = scheduleTimes[idx];
                        return (
                          <Draggable key={lineId} draggableId={lineId} index={idx}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`bg-slate-50 p-3 rounded border border-slate-200 space-y-2 transition-all ${snapshot.isDragging ? 'shadow-lg opacity-50' : ''}`}
                              >
                                <div className="flex items-center gap-2">
                                  <div {...provided.dragHandleProps} className="text-slate-400 hover:text-slate-600 cursor-grab">
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm text-slate-900">{idx + 1}. {line?.name}</div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveLine(lineId)}
                                    className="text-slate-400 hover:text-rose-600 flex-shrink-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <div 
                                  className="flex items-center gap-3 px-6"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onTouchStart={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  <label className="text-xs text-slate-600 whitespace-nowrap">Employees:</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={employeeCount[lineId] || 1}
                                    onChange={(e) => setEmployeeCount({ ...employeeCount, [lineId]: parseInt(e.target.value) || 1 })}
                                    className="w-14 h-8 text-sm"
                                  />
                                </div>
                                {/* Per-line down time override */}
                                <div 
                                  className="flex items-center gap-2 px-6"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onTouchStart={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  <label className="text-xs text-slate-600 whitespace-nowrap">Line down at:</label>
                                  <Input
                                    type="datetime-local"
                                    value={lineDownTimeOverrides[lineId] || ""}
                                    onChange={(e) => setLineDownTimeOverrides(prev => {
                                      const updated = { ...prev };
                                      if (e.target.value) {
                                        updated[lineId] = e.target.value;
                                      } else {
                                        delete updated[lineId];
                                      }
                                      return updated;
                                    })}
                                    className="flex-1 h-8 text-xs min-w-0"
                                  />
                                  {lineDownTimeOverrides[lineId] && (
                                    <button
                                      onClick={() => setLineDownTimeOverrides(prev => {
                                        const updated = { ...prev };
                                        delete updated[lineId];
                                        return updated;
                                      })}
                                      className="text-slate-400 hover:text-slate-600"
                                      title="Reset to cascading time"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                {schedule && (
                                  <div className={cn("text-xs px-6", schedule.hasOverride ? "text-blue-600 font-medium" : "text-slate-600")}>
                                    {schedule.hasOverride && <span className="text-[10px] text-blue-500 mr-1">CUSTOM</span>}
                                    {format(schedule.startTime, "h:mm a")} - {format(schedule.endTime, "h:mm a")} ({schedule.hours.toFixed(1)}h)
                                  </div>
                                )}
                                <div className="text-xs text-slate-500 px-6 space-y-1 border-t border-slate-200 pt-2 mt-2">
                                  {areas.filter(a => a.production_line_id === lineId).map(area => {
                                    const areaAssets = assets.filter(a => a.area_id === area.id);
                                    const areaGroups = assetGroups?.filter(g => g.area_id === area.id) || [];
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
                                    
                                    const numEmployees = employeeCount[lineId] || 1;
                                    const adjustedHours = lockedHours + (unlockedHours / numEmployees);
                                    
                                    return (
                                      <div key={area.id} className="flex justify-between">
                                        <span>{area.name}:</span>
                                        <span className="font-medium">{adjustedHours.toFixed(1)}h</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || selectedLines.length === 0 || !lineDownTime}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Schedule Cleanings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}