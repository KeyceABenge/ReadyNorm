import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Edit2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmployeeGroupRepo, EmployeeRepo } from "@/lib/adapters/database";

export default function EmployeeListManager({ employees, groups = [], onGroupSelect }) {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showGroupInput, setShowGroupInput] = useState(false);
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
    }
  });

  const moveEmployeeMutation = useMutation({
    mutationFn: ({ employeeId, sortOrder }) => 
      EmployeeRepo.update(employeeId, { sort_order: sortOrder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const sortedEmployees = [...employees].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleMoveUp = (employee, index) => {
    if (index === 0) return;
    const prevEmployee = sortedEmployees[index - 1];
    const temp = employee.sort_order || 0;
    moveEmployeeMutation.mutate({ employeeId: employee.id, sortOrder: prevEmployee.sort_order || 0 });
    moveEmployeeMutation.mutate({ employeeId: prevEmployee.id, sortOrder: temp });
  };

  const handleMoveDown = (employee, index) => {
    if (index === sortedEmployees.length - 1) return;
    const nextEmployee = sortedEmployees[index + 1];
    const temp = employee.sort_order || 0;
    moveEmployeeMutation.mutate({ employeeId: employee.id, sortOrder: nextEmployee.sort_order || 0 });
    moveEmployeeMutation.mutate({ employeeId: nextEmployee.id, sortOrder: temp });
  };

  const handleSaveEmployee = (data) => {
    updateEmployeeMutation.mutate({ id: editingEmployee.id, data });
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroupMutation.mutate({ name: newGroupName });
  };

  return (
    <div className="space-y-4">
      {/* Groups Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-900">Groups</h3>
          <Button size="sm" variant="ghost" onClick={() => setShowGroupInput(true)}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {showGroupInput && (
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Group name..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={handleCreateGroup}
              disabled={createGroupMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {createGroupMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowGroupInput(false)}>
              ✕
            </Button>
          </div>
        )}

        {groups.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => onGroupSelect?.(group.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded" style={{ backgroundColor: group.color }} />
                {group.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No groups yet</p>
        )}
      </div>

      {/* Employees Section */}
      <div className="border-t pt-4 space-y-2">
        <h3 className="font-semibold text-sm text-slate-900">Employees</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedEmployees.map((emp, index) => (
            <div
              key={emp.id}
              className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: emp.color || "#3b82f6" }} />
                <span className="text-sm text-slate-900 truncate">{emp.name}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => handleMoveUp(emp, index)}
                  disabled={index === 0}
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => handleMoveDown(emp, index)}
                  disabled={index === sortedEmployees.length - 1}
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    setEditingEmployee(emp);
                    setEditModalOpen(true);
                  }}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

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

      <div className="space-y-2">
        <label className="text-sm font-medium">Group</label>
        <select
          value={formData.group}
          onChange={(e) => setFormData({ ...formData, group: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">No group</option>
          {groups.map(group => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
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