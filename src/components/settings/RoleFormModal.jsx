import { useState, useEffect } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus, X, Loader2, GraduationCap, ClipboardList, Droplet, Droplets,
  FlaskConical, Factory, Package, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";

const CAPABILITIES = [
  { key: "can_do_line_cleaning", label: "Line Cleaning", icon: Package, color: "text-purple-600", description: "Perform line cleaning assignments" },
  { key: "can_do_titrations", label: "Chemical Titrations", icon: FlaskConical, color: "text-blue-600", description: "Perform chemical titration tests" },
  { key: "can_do_drain_cleaning", label: "Drain Cleaning", icon: Droplet, color: "text-cyan-600", description: "Clean and maintain drain locations" },
  { key: "can_do_diverter_inspection", label: "Diverter Inspection", icon: Droplets, color: "text-sky-600", description: "Inspect rain diverter buckets" },
  { key: "can_do_inventory", label: "Chemical Inventory", icon: ClipboardList, color: "text-emerald-600", description: "Perform chemical inventory counts" },
  { key: "can_do_preop_inspection", label: "Pre-Op Inspection", icon: Factory, color: "text-orange-600", description: "Perform pre-operational inspections" },
  { key: "can_do_postclean_inspection", label: "Post-Clean Inspection", icon: ClipboardList, color: "text-indigo-600", description: "Perform post-clean inspections" },
];

export default function RoleFormModal({ open, onOpenChange, role, organizationId, trainingDocs = [], allRoles = [] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    role_name: "",
    department: "",
    description: "",
    color: "#3b82f6",
    reports_to: "",
    same_level_as: "",
    task_quotas: {},
    responsibilities: [],
    required_training_ids: [],
    can_do_line_cleaning: true,
    can_do_titrations: false,
    can_do_drain_cleaning: true,
    can_do_diverter_inspection: false,
    can_do_inventory: false,
    can_do_preop_inspection: false,
    can_do_postclean_inspection: false,
    sort_order: 0
  });
  const [newResponsibility, setNewResponsibility] = useState("");
  const [newQuotaFreq, setNewQuotaFreq] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  // Derive existing departments from allRoles (filter out invalid values)
  const existingDepartments = [...new Set(allRoles.map(r => r.department).filter(d => d && d !== "_new"))].sort();

  useEffect(() => {
    if (role) {
      setForm({
        role_name: role.role_name || "",
        department: role.department || "",
        description: role.description || "",
        color: role.color || "#3b82f6",
        reports_to: role.reports_to || "",
        same_level_as: role.same_level_as || "",
        task_quotas: role.task_quotas || {},
        responsibilities: role.responsibilities || [],
        required_training_ids: role.required_training_ids || [],
        can_do_line_cleaning: role.can_do_line_cleaning ?? true,
        can_do_titrations: role.can_do_titrations ?? false,
        can_do_drain_cleaning: role.can_do_drain_cleaning ?? true,
        can_do_diverter_inspection: role.can_do_diverter_inspection ?? false,
        can_do_inventory: role.can_do_inventory ?? false,
        can_do_preop_inspection: role.can_do_preop_inspection ?? false,
        can_do_postclean_inspection: role.can_do_postclean_inspection ?? false,
        sort_order: role.sort_order || 0
      });
    } else {
      setForm({
        role_name: "",
        department: "",
        description: "",
        color: "#3b82f6",
        reports_to: "",
        same_level_as: "",
        task_quotas: {},
        responsibilities: [],
        required_training_ids: [],
        can_do_line_cleaning: true,
        can_do_titrations: false,
        can_do_drain_cleaning: true,
        can_do_diverter_inspection: false,
        can_do_inventory: false,
        can_do_preop_inspection: false,
        can_do_postclean_inspection: false,
        sort_order: 0
      });
    }
    setNewDepartment("");
    setNewResponsibility("");
    setNewQuotaFreq("");
    setNewDepartment("");
    setShowNewDeptInput(false);
  }, [role, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (role?.id) {
        return RoleConfigRepo.update(role.id, data);
      }
      return RoleConfigRepo.create({ ...data, organization_id: organizationId, is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role_configs"] });
      onOpenChange(false);
      toast.success(role ? "Role updated" : "Role created");
    }
  });

  const [showNewDeptInput, setShowNewDeptInput] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.role_name.trim()) {
      toast.error("Role name is required");
      return;
    }
    // Prevent saving "_new" as department
    const submitData = { ...form };
    if (submitData.department === "_new") {
      submitData.department = "";
    }
    saveMutation.mutate(submitData);
  };

  const toggleTraining = (docId) => {
    setForm(prev => ({
      ...prev,
      required_training_ids: prev.required_training_ids.includes(docId)
        ? prev.required_training_ids.filter(id => id !== docId)
        : [...prev.required_training_ids, docId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle>{role ? "Edit Role" : "Create New Role"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-5 pb-6">
              {/* Basic Info */}
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Role Name *</Label>
                  <Input
                    value={form.role_name}
                    onChange={(e) => setForm(prev => ({ ...prev, role_name: e.target.value }))}
                    placeholder="e.g., Cleaner, Lead, Inspector"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="relative w-10 h-10 rounded-lg border border-slate-200 overflow-hidden cursor-pointer shadow-sm">
                    <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: form.color }} />
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label>Department</Label>
                <p className="text-xs text-slate-500">Group this role under a department</p>
                {showNewDeptInput ? (
                  <div className="flex gap-2">
                    <Input
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      placeholder="e.g., Sanitation, Quality, Maintenance"
                      className="h-9 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newDepartment.trim()) {
                            setForm(prev => ({ ...prev, department: newDepartment.trim() }));
                            setNewDepartment("");
                            setShowNewDeptInput(false);
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        if (newDepartment.trim()) {
                          setForm(prev => ({ ...prev, department: newDepartment.trim() }));
                          setNewDepartment("");
                          setShowNewDeptInput(false);
                        }
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9"
                      onClick={() => { setShowNewDeptInput(false); setNewDepartment(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      value={form.department || "_none"}
                      onValueChange={(val) => {
                        if (val === "_new") {
                          setShowNewDeptInput(true);
                        } else {
                          setForm(prev => ({ ...prev, department: val === "_none" ? "" : val }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">No Department</SelectItem>
                        {existingDepartments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                        <SelectItem value="_new">+ Create New Department</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this role does..."
                  rows={2}
                />
              </div>

              {/* Reports To */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                  Reports To
                </Label>
                <p className="text-xs text-slate-500">Which role does this role report to?</p>
                <Select
                  value={form.reports_to || "_none"}
                  onValueChange={(val) => setForm(prev => ({ ...prev, reports_to: val === "_none" ? "" : val, same_level_as: val === "_none" ? prev.same_level_as : "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None (Top-level)</SelectItem>
                    {allRoles
                      .filter(r => r.role_name !== form.role_name)
                      .map(r => (
                        <SelectItem key={r.id} value={r.role_name}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color || "#64748b" }} />
                            {r.role_name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Same Level As */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center text-amber-600 font-bold text-xs">=</span>
                  Same Level As
                </Label>
                <p className="text-xs text-slate-500">Is this role a peer of another role? (same hierarchy level, same supervisor)</p>
                <Select
                  value={form.same_level_as || "_none"}
                  onValueChange={(val) => {
                    const peerRole = allRoles.find(r => r.role_name === val);
                    setForm(prev => ({
                      ...prev,
                      same_level_as: val === "_none" ? "" : val,
                      // Auto-set reports_to to match the peer's reports_to
                      reports_to: val !== "_none" && peerRole?.reports_to ? peerRole.reports_to : prev.reports_to,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a peer role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {allRoles
                      .filter(r => r.role_name !== form.role_name)
                      .map(r => (
                        <SelectItem key={r.id} value={r.role_name}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color || "#64748b" }} />
                            {r.role_name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Quotas */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  Task Quotas Per Shift
                </Label>
                <p className="text-xs text-slate-500">
                  How many tasks of each frequency must this role pick per shift? Leave blank to use site defaults.
                </p>
                {Object.entries(form.task_quotas).map(([freq, quota]) => (
                  <div key={freq} className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize min-w-[80px] justify-center">{freq}</Badge>
                    <Input
                      type="number"
                      min="0"
                      value={quota}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        task_quotas: { ...prev.task_quotas, [freq]: parseInt(e.target.value) || 0 }
                      }))}
                      className="w-20 h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500"
                      onClick={() => {
                        const newQuotas = { ...form.task_quotas };
                        delete newQuotas[freq];
                        setForm(prev => ({ ...prev, task_quotas: newQuotas }));
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newQuotaFreq}
                    onChange={(e) => setNewQuotaFreq(e.target.value)}
                    placeholder="e.g., weekly"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const freq = newQuotaFreq.toLowerCase().trim();
                        if (freq && !form.task_quotas[freq]) {
                          setForm(prev => ({ ...prev, task_quotas: { ...prev.task_quotas, [freq]: 0 } }));
                          setNewQuotaFreq("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      const freq = newQuotaFreq.toLowerCase().trim();
                      if (freq && !form.task_quotas[freq]) {
                        setForm(prev => ({ ...prev, task_quotas: { ...prev.task_quotas, [freq]: 0 } }));
                        setNewQuotaFreq("");
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Capabilities */}
              <div className="space-y-2">
                <Label>Capabilities</Label>
                <p className="text-xs text-slate-500">What tasks can this role perform?</p>
                <div className="space-y-2">
                  {CAPABILITIES.map(({ key, label, icon: Icon, color, description }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className={cn("w-4 h-4", color)} />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{label}</p>
                          <p className="text-xs text-slate-500">{description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={form[key]}
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, [key]: checked }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <Label>Responsibilities</Label>
                <div className="space-y-1.5">
                  {form.responsibilities.map((resp, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm text-slate-700 flex-1 bg-slate-50 px-3 py-1.5 rounded">{resp}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          responsibilities: prev.responsibilities.filter((_, idx) => idx !== i)
                        }))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newResponsibility}
                    onChange={(e) => setNewResponsibility(e.target.value)}
                    placeholder="Add a responsibility..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newResponsibility.trim()) {
                          setForm(prev => ({ ...prev, responsibilities: [...prev.responsibilities, newResponsibility.trim()] }));
                          setNewResponsibility("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      if (newResponsibility.trim()) {
                        setForm(prev => ({ ...prev, responsibilities: [...prev.responsibilities, newResponsibility.trim()] }));
                        setNewResponsibility("");
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Required Trainings */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                  Required Trainings
                </Label>
                <p className="text-xs text-slate-500">
                  Employees with this role must complete these trainings.
                </p>
                {trainingDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No training documents available</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {trainingDocs.map(doc => (
                      <label key={doc.id} className={cn(
                        "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors",
                        form.required_training_ids.includes(doc.id) ? "bg-amber-50" : "hover:bg-slate-50"
                      )}>
                        <Checkbox
                          checked={form.required_training_ids.includes(doc.id)}
                          onCheckedChange={() => toggleTraining(doc.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 truncate">{doc.title}</p>
                          {doc.category && (
                            <p className="text-xs text-slate-500">{doc.category}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-slate-900 hover:bg-slate-800">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {role ? "Update Role" : "Create Role"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}