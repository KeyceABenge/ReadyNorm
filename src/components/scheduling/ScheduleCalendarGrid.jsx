/**
 * Calendar grid that shows crew-grouped employees with their computed schedule.
 * Supports: auto-computed work days, vacation display, plant closures.
 */
import { format, isToday, isWeekend } from "date-fns";
import { ChevronLeft, ChevronRight, Palmtree, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ScheduleCalendarGrid({
  days,
  scheduleMap,
  closedDates,
  crews,
  crewSchedules,
  employees,
  roleConfigs = [],
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onCellClick,
  hiddenCrews = new Set(),
  hiddenEmployees = new Set(),
  hideUnassigned = false,
  onHideCrew,
  onHideEmployee,
  onHideUnassigned,
  onShowAll,
  crewOrder = [],
  onReorderCrews,
}) {
  // Build role lookup: role_name -> { sort_order, color }
  const roleMap = {};
  roleConfigs.forEach(r => {
    roleMap[r.role_name?.toLowerCase()] = { sort_order: r.sort_order ?? 999, color: r.color || "#64748b", name: r.role_name };
  });

  // Group employees by crew, filtering out hidden, then apply custom order
  const allCrewGroups = buildCrewGroups(crews, crewSchedules, employees, roleMap);
  const filteredGroups = allCrewGroups
    .filter(g => !hiddenCrews.has(g.id))
    .map(g => ({
      ...g,
      members: g.members.filter(m => !hiddenEmployees.has(m.id)),
    }))
    .filter(g => g.members.length > 0);

  // Apply custom crew order if provided
  const crewGroups = crewOrder.length > 0
    ? [...filteredGroups].sort((a, b) => {
        const ai = crewOrder.indexOf(a.id);
        const bi = crewOrder.indexOf(b.id);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
    : filteredGroups;

  const handleDragEnd = (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const reordered = Array.from(crewGroups);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onReorderCrews?.(reordered.map(g => g.id));
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Month navigation header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <Button variant="ghost" size="icon" onClick={onPrevMonth} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-bold text-slate-900">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <Button variant="ghost" size="icon" onClick={onNextMonth} className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Day headers */}
          <div className="flex sticky top-0 z-10 bg-white border-b">
            <div className="w-44 min-w-[176px] flex-shrink-0 p-2 bg-slate-100 font-semibold text-sm text-slate-700 border-r sticky left-0 z-20">
              Employee
            </div>
            {days.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              const today = isToday(day);
              const weekend = isWeekend(day);
              const closed = closedDates.has(dateStr);
              return (
                <div
                  key={dateStr}
                  className={cn(
                    "w-14 min-w-[56px] text-center text-xs p-1.5 border-r flex-shrink-0",
                    today && "bg-blue-50 font-bold",
                    weekend && !today && "bg-slate-50",
                    closed && "bg-red-50"
                  )}
                >
                  <div className={cn("font-semibold", today ? "text-blue-600" : "text-slate-500")}>
                    {format(day, "EEE")}
                  </div>
                  <div className={cn(
                    "font-bold mt-0.5",
                    today ? "text-[11px] bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto leading-none" : "text-sm text-slate-800"
                  )}>
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Crew-grouped rows */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="crew-groups">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {crewGroups.map((group, groupIndex) => (
                    <Draggable key={group.id} draggableId={group.id} index={groupIndex}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={cn(dragSnapshot.isDragging && "shadow-lg rounded-lg overflow-hidden ring-2 ring-blue-300")}
                        >
              {/* Crew header row */}
              <div className="flex border-b" style={{ backgroundColor: (group.color || "#64748b") + "18" }}>
                <div
                  className="w-44 min-w-[176px] flex-shrink-0 px-2 py-1 font-semibold text-xs border-r sticky left-0 z-10 flex items-center gap-1.5"
                  style={{ backgroundColor: (group.color || "#64748b") + "30" }}
                >
                  <div
                    {...dragProvided.dragHandleProps}
                    className="cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 rounded hover:bg-black/10 flex-shrink-0"
                    style={{ minHeight: "auto", minWidth: "auto" }}
                    title="Drag to reorder crew"
                  >
                    <GripVertical className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color || "#64748b" }} />
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="truncate font-semibold">{group.name}</span>
                    {group.timeLabel && (
                      <span className="text-[10px] text-slate-500 truncate">{group.timeLabel}</span>
                    )}
                  </div>
                  {onHideCrew && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHideCrew(group.id); }}
                      className="ml-1 p-1 rounded hover:bg-black/10 text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors"
                      style={{ minHeight: "auto", minWidth: "auto" }}
                      title="Hide crew from schedule"
                      data-pdf-hide
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex flex-1">
                  {days.map(day => (
                    <div key={format(day, "yyyy-MM-dd")} className="w-14 min-w-[56px] border-r flex-shrink-0" />
                  ))}
                </div>
              </div>

              {/* Employee rows under this crew */}
              {group.members.map(emp => {
                const empRole = roleMap[emp.role?.toLowerCase()];
                return (
                <div key={emp.id} className="flex border-b hover:bg-slate-50/50 transition-colors group/row">
                  <div className="w-44 min-w-[176px] flex-shrink-0 px-2 py-0.5 text-xs border-r sticky left-0 z-10 bg-white flex items-center">
                    {empRole && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 ml-3 mr-1"
                        style={{ backgroundColor: empRole.color }}
                        title={empRole.name}
                      />
                    )}
                    <span className={cn("whitespace-nowrap text-slate-700 font-medium flex-1", !empRole && "pl-3")}>{emp.name}</span>
                    {onHideEmployee && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHideEmployee(emp.id); }}
                        className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 flex-shrink-0"
                        style={{ minHeight: "auto", minWidth: "auto" }}
                        title="Hide from schedule"
                        data-pdf-hide
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {days.map(day => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const dayEntries = scheduleMap[dateStr] || [];
                    const entry = dayEntries.find(e => e.employee.id === emp.id);
                    const today = isToday(day);
                    const weekend = isWeekend(day);
                    const closed = closedDates.has(dateStr);

                    return (
                      <div
                        key={dateStr}
                        className={cn(
                          "w-14 min-w-[56px] h-7 border-r flex-shrink-0 flex items-center justify-center cursor-pointer transition-all hover:ring-1 hover:ring-inset hover:ring-slate-300",
                          today && "bg-blue-50/30",
                          weekend && !today && !entry && "bg-slate-50/50",
                          closed && !entry && "bg-red-50/50"
                        )}
                        onClick={() => onCellClick?.(emp, dateStr, entry)}
                      >
                        <CellContent entry={entry} crewColor={group.color} closed={closed} />
                      </div>
                    );
                  })}
                </div>
              );
              })}
            </div>
          )}
        </Draggable>
      ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Unassigned employees (not in any crew) */}
          {!hideUnassigned && (() => {
            const assignedEmails = new Set();
            crews.forEach(c => (c.members || []).forEach(e => assignedEmails.add(e)));
            const unassigned = employees
              .filter(e => e.status === "active" && !assignedEmails.has(e.email))
              .filter(e => !hiddenEmployees.has(e.id))
              .sort((a, b) => {
                const roleA = roleMap[a.role?.toLowerCase()]?.sort_order ?? 999;
                const roleB = roleMap[b.role?.toLowerCase()]?.sort_order ?? 999;
                if (roleA !== roleB) return roleA - roleB;
                return (a.sort_order || 0) - (b.sort_order || 0);
              });
            if (unassigned.length === 0) return null;

            return (
              <div>
                <div className="flex border-b bg-slate-100/50">
                  <div className="w-44 min-w-[176px] flex-shrink-0 px-2 py-1 font-semibold text-xs text-slate-500 border-r sticky left-0 z-10 bg-slate-100/80 flex items-center">
                    <span className="flex-1">Unassigned</span>
                    {onHideUnassigned && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHideUnassigned(); }}
                        className="p-1 rounded hover:bg-black/10 text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors"
                        style={{ minHeight: "auto", minWidth: "auto" }}
                        title="Hide unassigned group"
                        data-pdf-hide
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-1">
                    {days.map(day => (
                      <div key={format(day, "yyyy-MM-dd")} className="w-14 min-w-[56px] border-r flex-shrink-0" />
                    ))}
                  </div>
                </div>
                {unassigned.map(emp => {
                  const empRole = roleMap[emp.role?.toLowerCase()];
                  return (
                  <div key={emp.id} className="flex border-b hover:bg-slate-50/50 group/row">
                    <div className="w-44 min-w-[176px] flex-shrink-0 px-2 py-0.5 text-xs border-r sticky left-0 z-10 bg-white flex items-center">
                      {empRole && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 ml-3 mr-1"
                          style={{ backgroundColor: empRole.color }}
                          title={empRole.name}
                        />
                      )}
                      <span className={cn("whitespace-nowrap text-slate-500 flex-1", !empRole && "pl-3")}>{emp.name}</span>
                      {onHideEmployee && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHideEmployee(emp.id); }}
                          className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 flex-shrink-0"
                          style={{ minHeight: "auto", minWidth: "auto" }}
                          title="Hide from schedule"
                          data-pdf-hide
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {days.map(day => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const today = isToday(day);
                      return (
                        <div
                          key={dateStr}
                          className={cn(
                            "w-14 min-w-[56px] h-7 border-r flex-shrink-0",
                            today && "bg-blue-50/30"
                          )}
                          onClick={() => onCellClick?.(emp, dateStr, null)}
                        />
                      );
                    })}
                  </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function CellContent({ entry, crewColor, closed }) {
  if (!entry) {
    if (closed) return <div className="w-3 h-0.5 bg-red-300 rounded" />;
    return null;
  }

  const color = crewColor || "#3b82f6";

  if (entry.status === "cancelled") {
    // Vacation
    return (
      <div className="w-9 h-5 rounded bg-amber-100 border border-amber-300 flex items-center justify-center" title="Vacation">
        <Palmtree className="w-3 h-3 text-amber-600" />
      </div>
    );
  }

  if (entry.status === "absent") {
    return (
      <div className="w-9 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center" title="Absent">
        <span className="text-[10px] text-slate-400 font-medium">OFF</span>
      </div>
    );
  }

  if (entry.status === "closed") {
    return (
      <div className="w-9 h-5 rounded bg-red-50 border border-red-200 flex items-center justify-center" title="Plant Closed">
        <span className="text-[10px] text-red-400 font-medium">CLO</span>
      </div>
    );
  }

  // Scheduled / working
  return (
    <div
    className="w-9 h-5 rounded flex items-center justify-center"
      style={{ backgroundColor: color + "25", border: `1px solid ${color}60` }}
      title={entry.crewSchedule ? `${entry.crewSchedule.shift_start_time} - ${entry.crewSchedule.shift_end_time}` : "Scheduled"}
    >
      {entry.crewSchedule ? (
        <span className="text-[9px] font-bold" style={{ color }}>
          {formatShiftTime(entry.crewSchedule.shift_start_time)}
        </span>
      ) : (
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      )}
    </div>
  );
}

function formatShiftTime(time) {
  if (!time) return "";
  const [h] = time.split(":");
  const hour = parseInt(h);
  if (hour === 0) return "12a";
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return "12p";
  return `${hour - 12}p`;
}

function buildCrewGroups(crews, crewSchedules, employees, roleMap = {}) {
  const groups = [];
  const activeCrews = crews.filter(c => c.status === "active");

  activeCrews.forEach(crew => {
    const schedule = crewSchedules.find(cs => cs.crew_id === crew.id || cs.crew_name === crew.name);
    const memberEmails = new Set(crew.members || []);
    const members = employees
      .filter(e => e.status === "active" && memberEmails.has(e.email))
      .sort((a, b) => {
        const roleA = roleMap[a.role?.toLowerCase()]?.sort_order ?? 999;
        const roleB = roleMap[b.role?.toLowerCase()]?.sort_order ?? 999;
        if (roleA !== roleB) return roleA - roleB;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });

    if (members.length === 0) return;

    let timeLabel = "";
    if (schedule) {
      timeLabel = `${schedule.shift_start_time || ""} - ${schedule.shift_end_time || ""}`;
    } else if (crew.shift_start_time) {
      timeLabel = `${crew.shift_start_time} - ${crew.shift_end_time || ""}`;
    }

    groups.push({
      id: crew.id,
      name: crew.name,
      color: crew.color || schedule?.crew_color || "#64748b",
      timeLabel,
      members,
    });
  });

  return groups;
}