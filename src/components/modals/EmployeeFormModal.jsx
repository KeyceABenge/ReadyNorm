// @ts-nocheck
import { useState, useEffect } from "react";
import { RoleConfigRepo } from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Camera, X } from "lucide-react";
import { toast } from "sonner";
import LanguageSelector from "@/components/i18n/LanguageSelector";

const EVALUATOR_ROLES = [
  { value: "none", label: "Not an Evaluator" },
  { value: "qualified_peer", label: "Qualified Peer" },
  { value: "team_leader", label: "Team Leader" },
  { value: "process_technician", label: "Process Technician" },
  { value: "supervisor", label: "Supervisor" },
  { value: "manager", label: "Manager" }
];

export default function EmployeeFormModal({ open, onOpenChange, employee, onSave, isLoading, organizationId }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    role: "cleaner",
    evaluator_role: "none",
    preferred_language: "en",
    status: "active",
    is_qa_team: false,
    avatar_url: "",
    hire_date: "",
    birthday: ""
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savedDepartments, setSavedDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState("");
  const [newRole, setNewRole] = useState("");
  const [addingDepartment, setAddingDepartment] = useState(false);
  const [addingRole, setAddingRole] = useState(false);

  // Load role configs from database
  const { data: roleConfigs = [] } = useQuery({
    queryKey: ["role_configs_for_employees", organizationId],
    queryFn: () => RoleConfigRepo.filter({ organization_id: organizationId, is_active: true }, "sort_order"),
    enabled: !!organizationId && open
  });

  // Merge roleConfigs with localStorage roles for backwards compatibility
  const savedRoles = (() => {
    const configRoles = roleConfigs.map(r => r.role_name);
    const localRoles = JSON.parse(localStorage.getItem("employeeRoles") || "[]");
    return [...new Set([...configRoles, ...localRoles])];
  })();

  // Find the matched role config for the currently selected role
  const selectedRoleConfig = roleConfigs.find(
    r => r.role_name.toLowerCase() === formData.role?.toLowerCase()
  );

  useEffect(() => {
    setSavedDepartments(JSON.parse(localStorage.getItem("employeeDepartments") || "[]"));
  }, [open]);

  const generateEmail = (name) => {
    return name.toLowerCase().replace(/\s+/g, ".") + "@company.local";
  };

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || "",
        email: employee.email || generateEmail(employee.name),
        department: employee.department || "",
        role: employee.role || "cleaner",
        evaluator_role: employee.evaluator_role || "none",
        preferred_language: employee.preferred_language || "en",
        status: employee.status || "active",
        is_qa_team: employee.is_qa_team || false,
        avatar_url: employee.avatar_url || "",
        hire_date: employee.hire_date || "",
        birthday: employee.birthday || ""
      });
    } else {
      setFormData({
        name: "",
        email: "",
        department: "",
        role: "cleaner",
        evaluator_role: "none",
        preferred_language: "en",
        status: "active",
        is_qa_team: false,
        avatar_url: "",
        hire_date: "",
        birthday: ""
      });
    }
    setNewDepartment("");
    setNewRole("");
    setAddingDepartment(false);
    setAddingRole(false);
  }, [employee, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Save department to localStorage
    if (formData.department && !savedDepartments.includes(formData.department)) {
      const updated = [...savedDepartments, formData.department];
      localStorage.setItem("employeeDepartments", JSON.stringify(updated));
    }
    // Save custom roles to localStorage (for roles not in RoleConfig)
    const isConfigRole = roleConfigs.some(r => r.role_name.toLowerCase() === formData.role?.toLowerCase());
    if (formData.role && !isConfigRole) {
      const localRoles = JSON.parse(localStorage.getItem("employeeRoles") || "[]");
      if (!localRoles.includes(formData.role)) {
        localStorage.setItem("employeeRoles", JSON.stringify([...localRoles, formData.role]));
      }
    }
    
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {employee ? "Edit Employee" : "Add New Employee"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-2xl overflow-hidden">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (formData.name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border-2 border-white flex items-center justify-center cursor-pointer transition-colors shadow-md">
                {uploadingPhoto ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      toast.error("Please select an image file");
                      return;
                    }
                    setUploadingPhoto(true);
                    const { file_url } = await uploadFile(file);
                    setFormData(prev => ({ ...prev, avatar_url: file_url }));
                    setUploadingPhoto(false);
                    toast.success("Photo uploaded");
                  }}
                />
              </label>
            </div>
            {formData.avatar_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 h-auto py-1"
                onClick={() => setFormData(prev => ({ ...prev, avatar_url: "" }))}
              >
                <X className="w-3 h-3 mr-1" />
                Remove photo
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData(prev => ({ 
                  ...prev, 
                  name: newName,
                  email: formData.email || generateEmail(newName)
                }));
              }}
              placeholder="John Smith"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john.smith@company.local"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Department</Label>
            {!addingDepartment ? (
              <Select 
                value={formData.department} 
                onValueChange={(v) => {
                  if (v === "add-new") {
                    setNewDepartment("");
                    setAddingDepartment(true);
                  } else {
                    setFormData(prev => ({ ...prev, department: v }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or add department" />
                </SelectTrigger>
                <SelectContent>
                  {savedDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                  <SelectItem value="add-new">+ Add New</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Input
                  autoFocus
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="Enter department name"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddingDepartment(false);
                      setNewDepartment("");
                      setFormData(prev => ({ ...prev, department: "" }));
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newDepartment.trim()) {
                        setFormData(prev => ({ ...prev, department: newDepartment }));
                        if (!savedDepartments.includes(newDepartment)) {
                          const updated = [...savedDepartments, newDepartment];
                          setSavedDepartments(updated);
                          localStorage.setItem("employeeDepartments", JSON.stringify(updated));
                        }
                        setAddingDepartment(false);
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              {!addingRole ? (
                <Select 
                  value={formData.role} 
                  onValueChange={(v) => {
                    if (v === "add-new") {
                      setNewRole("");
                      setAddingRole(true);
                    } else {
                      setFormData(prev => ({ ...prev, role: v }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or add role" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                    <SelectItem value="add-new">+ Add New</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Input
                    autoFocus
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="Enter role name"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddingRole(false);
                        setNewRole("");
                        setFormData(prev => ({ ...prev, role: "cleaner" }));
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newRole.trim()) {
                          setFormData(prev => ({ ...prev, role: newRole }));
                          if (!savedRoles.includes(newRole)) {
                            const localRoles = JSON.parse(localStorage.getItem("employeeRoles") || "[]");
                            const updated = [...new Set([...localRoles, newRole])];
                            localStorage.setItem("employeeRoles", JSON.stringify(updated));
                          }
                          setAddingRole(false);
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hire Date & Birthday */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
              />
            </div>
          </div>

          {/* Role Info Banner */}
          {selectedRoleConfig && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1.5">
              <div className="flex items-center gap-2">
                <div 
                  className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: selectedRoleConfig.color || "#64748b" }}
                >
                  {selectedRoleConfig.role_name?.charAt(0)}
                </div>
                <span className="text-sm font-medium text-blue-900">{selectedRoleConfig.role_name} Role Settings</span>
              </div>
              {Object.keys(selectedRoleConfig.task_quotas || {}).length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <span className="text-xs text-blue-700">Quotas:</span>
                  {Object.entries(selectedRoleConfig.task_quotas).map(([freq, q]) => (
                    <Badge key={freq} className="bg-blue-100 text-blue-700 text-xs capitalize">{freq}: {q}</Badge>
                  ))}
                </div>
              )}
              {selectedRoleConfig.required_training_ids?.length > 0 && (
                <p className="text-xs text-blue-700">{selectedRoleConfig.required_training_ids.length} required training(s)</p>
              )}
              {selectedRoleConfig.responsibilities?.length > 0 && (
                <p className="text-xs text-blue-600">{selectedRoleConfig.responsibilities.length} responsibilities defined</p>
              )}
            </div>
          )}

          {/* Evaluator Role */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Competency Evaluator Role
            </Label>
            <Select 
              value={formData.evaluator_role} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, evaluator_role: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVALUATOR_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Determines if this employee can evaluate others' competency
            </p>
          </div>

          {/* Preferred Language */}
          <LanguageSelector
            value={formData.preferred_language}
            onChange={(v) => setFormData(prev => ({ ...prev, preferred_language: v }))}
          />

          {/* QA Team Toggle */}
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <input
              type="checkbox"
              id="is_qa_team"
              checked={formData.is_qa_team}
              onChange={(e) => setFormData(prev => ({ ...prev, is_qa_team: e.target.checked }))}
              className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <Label htmlFor="is_qa_team" className="text-sm font-medium text-purple-900 cursor-pointer">
              Quality Assurance Team Member
            </Label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {employee ? "Update Employee" : "Add Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}