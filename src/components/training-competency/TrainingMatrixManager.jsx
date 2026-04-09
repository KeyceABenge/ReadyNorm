import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { toast } from "sonner";
import { Plus, Search, Grid3X3, FileText, Users, Pencil, Trash2, CheckCircle2 } from "lucide-react";

export default function TrainingMatrixManager({ matrices, trainingDocs, employees, areas, tasks, organizationId, settings, onRefresh }) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    roles: [],
    departments: [],
    areas: [],
    shifts: [],
    required_trainings: [],
    status: "active"
  });
  const [selectedDoc, setSelectedDoc] = useState(null);

  const jobRoles = settings?.job_roles || ["Sanitation Technician", "Lead Sanitation", "Sanitation Supervisor", "Quality Technician"];
  const departments = settings?.departments || ["Sanitation", "Quality", "Production", "Maintenance"];
  const shifts = ["Day Shift", "Night Shift", "Swing Shift"];

  const filteredMatrices = matrices.filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingMatrix(null);
    setFormData({
      name: "",
      description: "",
      roles: [],
      departments: [],
      areas: [],
      shifts: [],
      required_trainings: [],
      status: "active"
    });
    setShowModal(true);
  };

  const openEditModal = (matrix) => {
    setEditingMatrix(matrix);
    setFormData({
      name: matrix.name || "",
      description: matrix.description || "",
      roles: matrix.roles || [],
      departments: matrix.departments || [],
      areas: matrix.areas || [],
      shifts: matrix.shifts || [],
      required_trainings: matrix.required_trainings || [],
      status: matrix.status || "active"
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Matrix name is required");
      return;
    }

    try {
      if (editingMatrix) {
        await TrainingMatrixRepo.update(editingMatrix.id, {
          ...formData,
          organization_id: organizationId
        });
        toast.success("Matrix updated");
      } else {
        await TrainingMatrixRepo.create({
          ...formData,
          organization_id: organizationId
        });
        toast.success("Matrix created");
      }
      setShowModal(false);
      onRefresh();
    } catch (e) {
      toast.error("Failed to save matrix");
    }
  };

  const handleDelete = async (matrix) => {
    if (!confirm("Delete this training matrix?")) return;
    try {
      await TrainingMatrixRepo.delete(matrix.id);
      toast.success("Matrix deleted");
      onRefresh();
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const toggleRole = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role) 
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const toggleDepartment = (dept) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept]
    }));
  };

  const toggleShift = (shift) => {
    setFormData(prev => ({
      ...prev,
      shifts: prev.shifts.includes(shift)
        ? prev.shifts.filter(s => s !== shift)
        : [...prev.shifts, shift]
    }));
  };

  const addTrainingRequirement = () => {
    if (!selectedDoc) return;
    const doc = trainingDocs.find(d => d.id === selectedDoc);
    if (!doc) return;
    
    const exists = formData.required_trainings.some(t => t.training_document_id === selectedDoc);
    if (exists) {
      toast.error("Document already added");
      return;
    }

    setFormData(prev => ({
      ...prev,
      required_trainings: [...prev.required_trainings, {
        training_document_id: selectedDoc,
        document_title: doc.title,
        is_mandatory: true,
        days_to_complete: 30,
        recertification_months: 12,
        requires_quiz: true,
        requires_practical: false,
        passing_score: 80
      }]
    }));
    setSelectedDoc(null);
  };

  const removeTrainingRequirement = (docId) => {
    setFormData(prev => ({
      ...prev,
      required_trainings: prev.required_trainings.filter(t => t.training_document_id !== docId)
    }));
  };

  const updateTrainingRequirement = (docId, field, value) => {
    setFormData(prev => ({
      ...prev,
      required_trainings: prev.required_trainings.map(t => 
        t.training_document_id === docId ? { ...t, [field]: value } : t
      )
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search matrices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/60"
          />
        </div>
        <Button onClick={openCreateModal} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Matrix
        </Button>
      </div>

      {/* Matrices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMatrices.map(matrix => (
          <Card key={matrix.id} className="bg-white/60 backdrop-blur-xl border-white/80 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Grid3X3 className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{matrix.name}</CardTitle>
                    <Badge variant={matrix.status === "active" ? "default" : "secondary"} className="mt-1 text-[10px]">
                      {matrix.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(matrix)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDelete(matrix)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {matrix.description && (
                <p className="text-sm text-slate-600 mb-3">{matrix.description}</p>
              )}
              
              <div className="space-y-2">
                {matrix.roles?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-600">{matrix.roles.join(", ")}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600">
                    {matrix.required_trainings?.length || 0} required trainings
                  </span>
                </div>
              </div>

              {matrix.required_trainings?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">Required Documents:</p>
                  <div className="flex flex-wrap gap-1">
                    {matrix.required_trainings.slice(0, 3).map((t, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px]">
                        {t.document_title?.substring(0, 15)}...
                      </Badge>
                    ))}
                    {matrix.required_trainings.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{matrix.required_trainings.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredMatrices.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No training matrices found</p>
            <Button variant="link" onClick={openCreateModal} className="mt-2">
              Create your first matrix
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMatrix ? "Edit Training Matrix" : "Create Training Matrix"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Matrix Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sanitation Team Training Matrix"
                />
              </div>
              
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this matrix covers..."
                  rows={2}
                />
              </div>
            </div>

            {/* Roles */}
            <div>
              <Label>Applicable Roles</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {jobRoles.map(role => (
                  <Badge
                    key={role}
                    variant={formData.roles.includes(role) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleRole(role)}
                  >
                    {formData.roles.includes(role) && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {role}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Departments */}
            <div>
              <Label>Applicable Departments</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {departments.map(dept => (
                  <Badge
                    key={dept}
                    variant={formData.departments.includes(dept) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDepartment(dept)}
                  >
                    {formData.departments.includes(dept) && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {dept}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Shifts */}
            <div>
              <Label>Applicable Shifts</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {shifts.map(shift => (
                  <Badge
                    key={shift}
                    variant={formData.shifts.includes(shift) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleShift(shift)}
                  >
                    {formData.shifts.includes(shift) && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {shift}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Required Trainings */}
            <div>
              <Label>Required Training Documents</Label>
              <div className="flex gap-2 mt-2">
                <Select value={selectedDoc || ""} onValueChange={setSelectedDoc}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select training document" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainingDocs.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addTrainingRequirement} disabled={!selectedDoc}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.required_trainings.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.required_trainings.map((training, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{training.document_title}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-rose-500"
                          onClick={() => removeTrainingRequirement(training.training_document_id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <Label className="text-[10px]">Days to Complete</Label>
                          <Input
                            type="number"
                            value={training.days_to_complete}
                            onChange={(e) => updateTrainingRequirement(training.training_document_id, "days_to_complete", parseInt(e.target.value))}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Recert (months)</Label>
                          <Input
                            type="number"
                            value={training.recertification_months}
                            onChange={(e) => updateTrainingRequirement(training.training_document_id, "recertification_months", parseInt(e.target.value))}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Passing Score</Label>
                          <Input
                            type="number"
                            value={training.passing_score}
                            onChange={(e) => updateTrainingRequirement(training.training_document_id, "passing_score", parseInt(e.target.value))}
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-1.5 text-xs">
                          <Switch
                            checked={training.requires_quiz}
                            onCheckedChange={(v) => updateTrainingRequirement(training.training_document_id, "requires_quiz", v)}
                          />
                          Quiz Required
                        </label>
                        <label className="flex items-center gap-1.5 text-xs">
                          <Switch
                            checked={training.requires_practical}
                            onCheckedChange={(v) => updateTrainingRequirement(training.training_document_id, "requires_practical", v)}
                          />
                          Practical Required
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
              {editingMatrix ? "Update Matrix" : "Create Matrix"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}