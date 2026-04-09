import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package, MapPin, FlaskConical } from "lucide-react";
import { toast } from "sonner";

export default function LocationAssignments({ organizationId, chemicals, locations, assignments }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    chemical_id: "",
    location_id: "",
    par_level: 0,
    reorder_to_level: 0
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => {
      const chemical = chemicals.find(c => c.id === data.chemical_id);
      const location = locations.find(l => l.id === data.location_id);
      return ChemicalLocationAssignmentRepo.create({
        ...data,
        organization_id: organizationId,
        chemical_name: chemical?.name,
        location_name: location?.name,
        unit: chemical?.unit
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chemical_assignments"] });
      setFormOpen(false);
      resetForm();
      toast.success("Assignment added");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const chemical = chemicals.find(c => c.id === data.chemical_id);
      const location = locations.find(l => l.id === data.location_id);
      return ChemicalLocationAssignmentRepo.update(id, {
        ...data,
        chemical_name: chemical?.name,
        location_name: location?.name,
        unit: chemical?.unit
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chemical_assignments"] });
      setFormOpen(false);
      resetForm();
      toast.success("Assignment updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ChemicalLocationAssignmentRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chemical_assignments"] });
      toast.success("Assignment deleted");
    }
  });

  const resetForm = () => {
    setFormData({ chemical_id: "", location_id: "", par_level: 0, reorder_to_level: 0 });
    setEditingAssignment(null);
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      chemical_id: assignment.chemical_id || "",
      location_id: assignment.location_id || "",
      par_level: assignment.par_level || 0,
      reorder_to_level: assignment.reorder_to_level || 0
    });
    setFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAssignment) {
      updateMutation.mutate({ id: editingAssignment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Group assignments by location
  const assignmentsByLocation = {};
  locations.forEach(loc => {
    assignmentsByLocation[loc.id] = assignments.filter(a => a.location_id === loc.id && a.status === "active");
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Chemical Assignments</h2>
          <p className="text-sm text-slate-500">Assign chemicals to storage locations with par levels</p>
        </div>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      {locations.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Add storage locations first</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {locations.filter(l => l.status === "active").map(location => (
            <Card key={location.id} className="p-4">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-slate-900">{location.name}</h3>
                <Badge variant="outline">{assignmentsByLocation[location.id]?.length || 0} chemicals</Badge>
              </div>
              
              {assignmentsByLocation[location.id]?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No chemicals assigned to this location</p>
              ) : (
                <div className="space-y-2">
                  {assignmentsByLocation[location.id]?.map(assignment => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FlaskConical className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="font-medium text-slate-900">{assignment.chemical_name}</p>
                          <p className="text-xs text-slate-500">
                            Par: {assignment.par_level} {assignment.unit} • 
                            Reorder to: {assignment.reorder_to_level || assignment.par_level} {assignment.unit}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(assignment)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-rose-600"
                                onClick={() => deleteMutation.mutate(assignment.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAssignment ? "Edit Assignment" : "Add Chemical to Location"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Chemical *</Label>
              <Select value={formData.chemical_id} onValueChange={v => setFormData({...formData, chemical_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select chemical..." /></SelectTrigger>
                <SelectContent>
                  {chemicals.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Storage Location *</Label>
              <Select value={formData.location_id} onValueChange={v => setFormData({...formData, location_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Par Level (Minimum)</Label>
                <Input type="number" min="0" step="0.5" value={formData.par_level}
                       onChange={e => setFormData({...formData, par_level: parseFloat(e.target.value) || 0})} />
                <p className="text-xs text-slate-500 mt-1">Minimum quantity to keep on hand</p>
              </div>
              <div>
                <Label>Reorder-To Level</Label>
                <Input type="number" min="0" step="0.5" value={formData.reorder_to_level}
                       onChange={e => setFormData({...formData, reorder_to_level: parseFloat(e.target.value) || 0})} />
                <p className="text-xs text-slate-500 mt-1">Target quantity after reorder</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingAssignment ? "Update" : "Add"} Assignment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}