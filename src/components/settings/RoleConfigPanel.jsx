import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Loader2, GripVertical,
  Users, ClipboardList, ClipboardCheck, GraduationCap, Droplets, FlaskConical, Factory, Droplet, Package, Building2
} from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import RoleFormModal from "./RoleFormModal";

function buildRoleRankMap(roles) {
  if (!roles || roles.length === 0) return {};
  const allNames = new Set(roles.map(r => r.role_name));
  const children = {};
  allNames.forEach(n => { children[n] = []; });
  roles.forEach(r => {
    if (r.reports_to && allNames.has(r.reports_to)) {
      children[r.reports_to].push(r.role_name);
    }
  });
  const roots = roles.filter(r => !r.reports_to || !allNames.has(r.reports_to)).map(r => r.role_name);
  const rankMap = {};
  const queue = roots.map(name => ({ name, rank: 0 }));
  while (queue.length > 0) {
    const { name, rank } = queue.shift();
    if (rankMap[name] !== undefined) continue;
    rankMap[name] = rank;
    (children[name] || []).forEach(child => {
      if (rankMap[child] === undefined) queue.push({ name: child, rank: rank + 1 });
    });
  }
  allNames.forEach(n => { if (rankMap[n] === undefined) rankMap[n] = 999; });
  return rankMap;
}

export default function RoleConfigPanel({ organizationId }) {
  const [editingRole, setEditingRole] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["role_configs", organizationId],
    queryFn: () => RoleConfigRepo.filter({ organization_id: organizationId }, "sort_order"),
    enabled: !!organizationId
  });

  const { data: trainingDocs = [] } = useQuery({
    queryKey: ["training_documents_for_roles", organizationId],
    queryFn: () => TrainingDocumentRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_for_roles", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => RoleConfigRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role_configs"] });
      toast.success("Role deleted");
    }
  });

  const [localOrderIds, setLocalOrderIds] = useState(null);

  // Check if any roles have explicit sort_order set (not default 0)
  const hasExplicitSortOrder = roles.some(r => r.sort_order != null && r.sort_order !== 0) || 
    (roles.length > 0 && new Set(roles.map(r => r.sort_order)).size > 1);

  const sortedRoles = (() => {
    if (localOrderIds) {
      const roleMap = {};
      roles.forEach(r => { roleMap[r.id] = r; });
      const ordered = localOrderIds.map(id => roleMap[id]).filter(Boolean);
      roles.forEach(r => { if (!localOrderIds.includes(r.id)) ordered.push(r); });
      return ordered;
    }
    // If user has reordered before (explicit sort_order values), use sort_order only
    if (hasExplicitSortOrder) {
      return [...roles].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    }
    // Default: hierarchy-based sort for first-time display
    const rankMap = buildRoleRankMap(roles);
    return [...roles].sort((a, b) => {
      const rankDiff = (rankMap[a.role_name] ?? 999) - (rankMap[b.role_name] ?? 999);
      if (rankDiff !== 0) return rankDiff;
      return (a.sort_order ?? 999) - (b.sort_order ?? 999);
    });
  })();

  // Group roles by department
  const departments = (() => {
    const deptMap = {};
    sortedRoles.forEach(role => {
      const dept = role.department || "Uncategorized";
      if (!deptMap[dept]) deptMap[dept] = [];
      deptMap[dept].push(role);
    });
    // Sort: named departments first alphabetically, Uncategorized last
    const keys = Object.keys(deptMap).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
    return keys.map(k => ({ name: k, roles: deptMap[k] }));
  })();

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    
    // Only handle reorder within same department droppable
    if (source.droppableId !== destination.droppableId) return;
    if (source.index === destination.index) return;

    const deptName = source.droppableId;
    const dept = departments.find(d => d.name === deptName);
    if (!dept) return;

    const deptRoles = Array.from(dept.roles);
    const [moved] = deptRoles.splice(source.index, 1);
    deptRoles.splice(destination.index, 0, moved);

    // Rebuild full order: replace this department's roles in the global order
    const newOrder = [];
    departments.forEach(d => {
      if (d.name === deptName) {
        newOrder.push(...deptRoles);
      } else {
        newOrder.push(...d.roles);
      }
    });

    setLocalOrderIds(newOrder.map(r => r.id));

    const updates = newOrder.map((role, idx) => 
      RoleConfigRepo.update(role.id, { sort_order: idx })
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ["role_configs"] });
    toast.success("Role order updated");
  };

  const getEmployeeCount = (roleName) => {
    return employees.filter(e => e.role?.toLowerCase() === roleName.toLowerCase()).length;
  };

  const CAPABILITY_ICONS = {
    can_do_line_cleaning: { icon: Package, label: "Line Cleaning", color: "text-purple-600" },
    can_do_titrations: { icon: FlaskConical, label: "Titrations", color: "text-blue-600" },
    can_do_drain_cleaning: { icon: Droplet, label: "Drain Cleaning", color: "text-cyan-600" },
    can_do_diverter_inspection: { icon: Droplets, label: "Diverter Inspection", color: "text-sky-600" },
    can_do_inventory: { icon: ClipboardList, label: "Inventory", color: "text-emerald-600" },
    can_do_preop_inspection: { icon: Factory, label: "Pre-Op Inspection", color: "text-orange-600" },
    can_do_postclean_inspection: { icon: ClipboardCheck, label: "Post-Clean Inspection", color: "text-indigo-600" }
  };

  if (isLoading || !organizationId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Employee Roles
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Define roles with specific quotas, responsibilities, and training requirements. 
                Employees assigned to a role will inherit its settings.
              </CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={() => { setEditingRole(null); setModalOpen(true); }}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">No roles configured yet</p>
              <p className="text-slate-400 text-xs mt-1 mb-4">Create roles to define quotas, responsibilities, and training for each position</p>
              <Button size="sm" onClick={() => { setEditingRole(null); setModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />
                Create First Role
              </Button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-6">
                {departments.map((dept) => (
                  <div key={dept.name}>
                    {/* Department header - only show if there are named departments */}
                    {(departments.length > 1 || dept.name !== "Uncategorized") && (
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-700">{dept.name}</h3>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {dept.roles.length} role{dept.roles.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}
                    <Droppable droppableId={dept.name}>
                      {(provided) => (
                        <div className="space-y-3" ref={provided.innerRef} {...provided.droppableProps}>
                          {dept.roles.map((role, index) => (
                            <Draggable key={role.id} draggableId={role.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(snapshot.isDragging && "opacity-90")}
                                >
                                  <Card className={cn("border transition-shadow", snapshot.isDragging ? "shadow-lg ring-2 ring-blue-200" : "hover:shadow-sm")}>
                                    <div className="p-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                          <div
                                            {...provided.dragHandleProps}
                                            className="flex items-center justify-center w-6 pt-2 flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                                          >
                                            <GripVertical className="w-4 h-4" />
                                          </div>
                                          <div 
                                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                                            style={{ backgroundColor: role.color || "#64748b" }}
                                          >
                                            {role.role_name?.charAt(0)?.toUpperCase()}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <h4 className="font-semibold text-slate-900">{role.role_name}</h4>
                                              <Badge variant="outline" className="text-xs">
                                                {getEmployeeCount(role.role_name)} employee{getEmployeeCount(role.role_name) !== 1 ? 's' : ''}
                                              </Badge>
                                            </div>
                                            {role.description && (
                                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{role.description}</p>
                                            )}
                                            {Object.keys(role.task_quotas || {}).length > 0 && (
                                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                                {Object.entries(role.task_quotas).map(([freq, quota]) => (
                                                  <Badge key={freq} className="bg-blue-50 text-blue-700 text-xs">
                                                    {freq}: {quota}
                                                  </Badge>
                                                ))}
                                              </div>
                                            )}
                                            <div className="flex gap-2 mt-2 flex-wrap">
                                              {Object.entries(CAPABILITY_ICONS).map(([key, { icon: Icon, label, color }]) => (
                                                role[key] && (
                                                  <div key={key} className="flex items-center gap-1" title={label}>
                                                    <Icon className={cn("w-3.5 h-3.5", color)} />
                                                    <span className="text-xs text-slate-500">{label}</span>
                                                  </div>
                                                )
                                              ))}
                                            </div>
                                            {role.reports_to && (
                                              <div className="flex items-center gap-1 mt-2">
                                                <span className="text-xs text-indigo-600 font-medium">
                                                  Reports to: {role.reports_to}
                                                </span>
                                              </div>
                                            )}
                                            {role.same_level_as && (
                                              <div className="flex items-center gap-1 mt-1">
                                                <span className="text-xs text-amber-600 font-medium">
                                                  ↔ Same level as: {role.same_level_as}
                                                </span>
                                              </div>
                                            )}
                                            {role.required_training_ids?.length > 0 && (
                                              <div className="flex items-center gap-1 mt-2">
                                                <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                                                <span className="text-xs text-amber-700">
                                                  {role.required_training_ids.length} required training{role.required_training_ids.length !== 1 ? 's' : ''}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => { setEditingRole(role); setModalOpen(true); }}
                                          >
                                            Edit
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="h-8 w-8 text-rose-500 hover:text-rose-700"
                                            onClick={() => {
                                              if (confirm(`Delete role "${role.role_name}"? Employees with this role will keep it but won't have role-based settings.`)) {
                                                deleteMutation.mutate(role.id);
                                              }
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      <RoleFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        role={editingRole}
        organizationId={organizationId}
        trainingDocs={trainingDocs}
        allRoles={roles}
      />
    </div>
  );
}