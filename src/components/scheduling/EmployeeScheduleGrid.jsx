import { useState, useEffect } from "react";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, ChevronLeft, ChevronRight, Edit2, Loader2, GripVertical, Trash2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { toast } from "sonner";
import { EmployeeGroupRepo, EmployeeRepo } from "@/lib/adapters/database";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
const MONTH_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EmployeeScheduleGrid({ employees, crewSchedules, employeeShifts, onShiftSelect, selectedShift, onCellClick, organizationId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showGroupInput, setShowGroupInput] = useState(false);
  const [groups, setGroups] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [editingGroupData, setEditingGroupData] = useState(null);
  const queryClient = useQueryClient();

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }) => EmployeeRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setEditingEmployee(null);
      setEditModalOpen(false);
      toast.success("Employee updated");
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => EmployeeGroupRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_groups"] });
      setNewGroupName("");
      setShowGroupInput(false);
      toast.success("Group created");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create group");
    }
  });

  const moveEmployeeMutation = useMutation({
    mutationFn: ({ employeeId, sortOrder }) => 
      EmployeeRepo.update(employeeId, { sort_order: sortOrder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const moveGroupMutation = useMutation({
    mutationFn: ({ groupId, sortOrder }) => 
      EmployeeGroupRepo.update(groupId, { sort_order: sortOrder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_groups"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, data }) => 
      EmployeeGroupRepo.update(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_groups"] });
      toast.success("Group updated");
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId) => EmployeeGroupRepo.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_groups"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Group deleted");
    }
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    // Get organization_id from prop or first employee
    const orgId = organizationId || employees[0]?.organization_id;
    if (!orgId) {
      toast.error("Organization not found");
      return;
    }
    createGroupMutation.mutate({ name: newGroupName, organization_id: orgId });
  };

  // Load groups from query
  const { data: groupsData = [] } = useQuery({
    queryKey: ["employee_groups"],
    queryFn: () => EmployeeGroupRepo.list()
  });

  useEffect(() => {
    setGroups(groupsData);
  }, [groupsData]);

  // Flatten everything into rows - employees and groups are just rows with sort_order
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDisplayRows = () => {
    const rows = [];
    
    // Add all groups as rows
    groups.forEach(group => {
      rows.push({ type: 'crew', id: `group-${group.id}`, groupId: group.id, name: group.name, color: group.color, sort_order: group.sort_order || 0 });
    });
    
    // Add all employees as rows
    filteredEmployees.forEach(emp => {
      rows.push({ type: 'employee', id: `emp-${emp.id}`, employeeId: emp.id, ...emp });
    });
    
    // Sort everything by sort_order
    return rows.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  };

  const displayRows = getDisplayRows();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;

    const newRows = Array.from(displayRows);
    const [moved] = newRows.splice(source.index, 1);
    newRows.splice(destination.index, 0, moved);
    
    // Calculate the new sort_order for the moved item only
    // Place it between its new neighbors
    const destIndex = destination.index;
    let newSortOrder;
    
    if (destIndex === 0) {
      // Moving to first position
      const nextRow = newRows[1];
      newSortOrder = nextRow ? (nextRow.sort_order || 0) - 100 : 0;
    } else if (destIndex === newRows.length - 1) {
      // Moving to last position
      const prevRow = newRows[destIndex - 1];
      newSortOrder = (prevRow?.sort_order || 0) + 100;
    } else {
      // Moving between two items
      const prevRow = newRows[destIndex - 1];
      const nextRow = newRows[destIndex + 1];
      const prevOrder = prevRow?.sort_order || 0;
      const nextOrder = nextRow?.sort_order || prevOrder + 200;
      newSortOrder = Math.floor((prevOrder + nextOrder) / 2);
    }
    
    // Only update the moved item
    if (moved.type === 'crew') {
      moveGroupMutation.mutate({ groupId: moved.groupId, sortOrder: newSortOrder });
    } else if (moved.type === 'employee') {
      moveEmployeeMutation.mutate({ employeeId: moved.employeeId, sortOrder: newSortOrder });
    }
  };

  const handleSaveEmployee = (data) => {
    updateEmployeeMutation.mutate({ id: editingEmployee.id, data });
  };



  const getShiftForEmployeeDate = (employeeEmail, date) => {
    return employeeShifts.find(s => s.employee_email === employeeEmail && s.shift_date === date);
  };

  const getCrewColor = (crewScheduleId) => {
    const schedule = crewSchedules.find(s => s.id === crewScheduleId);
    return schedule?.crew_color || "#3b82f6";
  };

  const getCrewTimeDisplay = (crewName) => {
    if (!crewName) return "";
    const name = crewName.toLowerCase();
    if (name.includes("night")) return "5p-5a";
    if (name.includes("day")) return "5a-5p";
    return "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="w-40 text-center font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Add Group Section */}
            {showGroupInput && (
              <div className="flex gap-1 border-b">
                <div className="w-48 flex-shrink-0 p-2 bg-slate-50 flex items-center gap-2">
                  <Input
                    placeholder="Group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                  />
                </div>
                <div className="flex gap-1 flex-1 p-2">
                  <Button
                    size="sm"
                    onClick={handleCreateGroup}
                    disabled={createGroupMutation.isPending}
                    className="bg-slate-900 hover:bg-slate-800"
                  >
                    {createGroupMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowGroupInput(false); setNewGroupName(""); }}>
                    ✕
                  </Button>
                </div>
              </div>
            )}

            {/* Header with dates */}
            <div className="flex gap-1">
              <div className="w-48 flex-shrink-0 font-semibold text-slate-900 p-3 bg-slate-100 flex items-center justify-between">
                <span>Employees</span>
                {!showGroupInput && (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setShowGroupInput(true)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="flex gap-1">
                {calendarDays.map(day => (
                  <div key={format(day, "yyyy-MM-dd")} className="w-16 text-center font-semibold text-slate-600 p-2 bg-slate-50 border-b text-xs">
                    <div>{format(day, "MMM")}</div>
                    <div className="font-bold">{format(day, "d")}</div>
                    <div className="text-xs">{format(day, "EEE")}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee rows */}
            <Droppable droppableId="employees">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={snapshot.isDraggingOver ? "bg-blue-50" : ""}
                >
                  {displayRows.length === 0 ? (
                    <p className="text-slate-500 py-8 text-center">No employees found</p>
                  ) : (
                    displayRows.map((row, index) => 
                    row.type === 'crew' ? (
                      <Draggable key={row.id} draggableId={row.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef} 
                            {...provided.draggableProps} 
                            className={`flex gap-1 border-b ${snapshot.isDragging ? "opacity-80" : ""}`}
                            style={{ 
                              ...provided.draggableProps.style,
                              backgroundColor: row.color ? `${row.color}30` : '#f1f5f9'
                            }}
                          >
                            <div 
                              className="w-48 flex-shrink-0 p-2 font-semibold text-slate-700 text-sm flex items-center gap-2 group cursor-pointer"
                              style={{ backgroundColor: row.color ? `${row.color}50` : '#e2e8f0' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const input = document.createElement('input');
                                input.type = 'color';
                                input.value = row.color || '#94a3b8';
                                input.onchange = (ev) => {
                                  updateGroupMutation.mutate({ groupId: row.groupId, data: { color: ev.target.value } });
                                };
                                input.click();
                              }}
                              title="Click to change row color"
                            >
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-4 h-4 text-slate-500" />
                              </div>
                              {editingGroupId === row.groupId ? (
                                <input
                                  autoFocus
                                  type="text"
                                  value={editingGroupName}
                                  onChange={(e) => setEditingGroupName(e.target.value)}
                                  onBlur={() => {
                                    if (editingGroupName.trim()) {
                                      updateGroupMutation.mutate({ groupId: row.groupId, data: { name: editingGroupName } });
                                    }
                                    setEditingGroupId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && editingGroupName.trim()) {
                                      updateGroupMutation.mutate({ groupId: row.groupId, data: { name: editingGroupName } });
                                      setEditingGroupId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingGroupId(null);
                                    }
                                  }}
                                  className="flex-1 bg-white font-semibold text-slate-700 text-sm border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                                  placeholder="Group name"
                                />
                              ) : (
                                <span 
                                  onClick={() => {
                                    setEditingGroupId(row.groupId);
                                    setEditingGroupName(row.name);
                                  }}
                                  className="flex-1 cursor-pointer hover:underline"
                                >
                                  {row.name}
                                </span>
                              )}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingGroupData({ id: row.groupId, name: row.name, color: row.color || '#94a3b8' });
                                    setEditGroupModalOpen(true);
                                  }}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteGroupMutation.mutate(row.groupId);
                                  }}
                                  disabled={deleteGroupMutation.isPending}
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-1"></div>
                          </div>
                        )}
                      </Draggable>
                    ) : (
                        <Draggable key={row.id} draggableId={row.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex gap-1 border-b group ${snapshot.isDragging ? "opacity-80" : ""}`}
                              style={{ 
                                ...provided.draggableProps.style,
                                backgroundColor: row.color ? `${row.color}20` : 'white'
                              }}
                            >
                              <div 
                                className="w-48 flex-shrink-0 p-3 font-medium text-slate-900 text-sm flex items-center gap-2 cursor-pointer"
                                style={{ backgroundColor: row.color ? `${row.color}35` : 'white' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const input = document.createElement('input');
                                  input.type = 'color';
                                  input.value = row.color || '#e2e8f0';
                                  input.onchange = (ev) => {
                                    updateEmployeeMutation.mutate({ id: row.employeeId, data: { color: ev.target.value } });
                                  };
                                  input.click();
                                }}
                                title="Click to change row color"
                              >
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4 text-slate-400" />
                                </div>
                                <span className="flex-1">{row.name}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5"
                                    onClick={() => {
                                      setEditingEmployee(row);
                                      setEditModalOpen(true);
                                    }}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {calendarDays.map(day => {
                                  const dateStr = format(day, "yyyy-MM-dd");
                                  const shift = getShiftForEmployeeDate(row.email, dateStr);
                                  
                                  return (
                                    <div
                                      key={dateStr}
                                      className="w-16 h-16 p-1 bg-white border cursor-pointer hover:shadow-md transition-all hover:bg-slate-100 flex items-center justify-center"
                                      style={{
                                        backgroundColor: shift ? (
                                          shift.status === 'absent' ? 'white' : 
                                          shift.status === 'cancelled' ? '#fef3c7' : 
                                          getCrewColor(shift.crew_schedule_id) + "40"
                                        ) : "white",
                                        borderColor: shift ? (
                                          shift.status === 'absent' ? '#e2e8f0' :
                                          shift.status === 'cancelled' ? '#fbbf24' :
                                          getCrewColor(shift.crew_schedule_id)
                                        ) : "#e2e8f0"
                                      }}
                                      onClick={() => {
                                        onCellClick?.(row, dateStr);
                                        if (shift) {
                                          onShiftSelect?.(shift);
                                        }
                                      }}
                                    >
                                      {shift && (
                                                <>
                                                  {shift.status === 'absent' ? (
                                                    <div />
                                                  ) : shift.status === 'cancelled' ? (
                                                    <div className="text-xs font-semibold text-yellow-700 text-center">VACA</div>
                                                  ) : (
                                                    <div className="text-xs font-semibold text-center" style={{ color: getCrewColor(shift.crew_schedule_id) }}>
                                                      {getCrewTimeDisplay(shift.crew_name)}
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )
                    )
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>


      {/* Edit Employee Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <EditEmployeeForm
              employee={editingEmployee}
              groups={groups}
              onSave={handleSaveEmployee}
              isLoading={updateEmployeeMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Group Modal */}
      <Dialog open={editGroupModalOpen} onOpenChange={setEditGroupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          {editingGroupData && (
            <EditGroupForm
              group={editingGroupData}
              onSave={async (data) => {
                const orgId = organizationId || employees[0]?.organization_id;
                await EmployeeGroupRepo.update(editingGroupData.id, { ...data, organization_id: orgId });
                queryClient.invalidateQueries({ queryKey: ["employee_groups"] });
                toast.success("Group updated");
                setEditGroupModalOpen(false);
              }}
              isLoading={updateGroupMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditGroupForm({ group, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    name: group.name,
    color: group.color || "#94a3b8"
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="h-10 w-20 cursor-pointer"
          />
          <span className="text-xs text-slate-500">{formData.color}</span>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          onClick={() => onSave(formData)}
          disabled={isLoading || !formData.name.trim()}
          className="bg-slate-900 hover:bg-slate-800"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function EditEmployeeForm({ employee, groups, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    name: employee.name,
    color: employee.color || "#3b82f6",
    group: employee.group || ""
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="h-10 w-20 cursor-pointer"
          />
          <span className="text-xs text-slate-500">{formData.color}</span>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setFormData({ name: employee.name, color: employee.color || "#3b82f6", group: employee.group || "" })}>
          Cancel
        </Button>
        <Button
          onClick={() => onSave(formData)}
          disabled={isLoading || !formData.name.trim()}
          className="bg-slate-900 hover:bg-slate-800"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}