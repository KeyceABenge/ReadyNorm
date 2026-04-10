import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { ChemicalStorageLocationRepo } from "@/lib/adapters/database";

export default function StorageLocationsList({ organizationId, locations }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sort_order: 0
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => ChemicalStorageLocationRepo.create({ ...data, organization_id: organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chemical_locations"] });
      setFormOpen(false);
      resetForm();
      toast.success("Location added");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ChemicalStorageLocationRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chemical_locations"] });
      setFormOpen(false);
      resetForm();
      toast.success("Location updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ChemicalStorageLocationRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chemical_locations"] });
      toast.success("Location deleted");
    }
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", sort_order: 0 });
    setEditingLocation(null);
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || "",
      description: location.description || "",
      sort_order: location.sort_order || 0
    });
    setFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const sortedLocations = [...locations].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Storage Locations</h2>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="grid gap-3">
        {locations.length === 0 ? (
          <Card className="p-8 text-center">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No storage locations added yet</p>
          </Card>
        ) : (
          sortedLocations.map(location => (
            <Card key={location.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <h3 className="font-semibold text-slate-900">{location.name}</h3>
                    {location.status === "inactive" && (
                      <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                    )}
                  </div>
                  {location.description && (
                    <p className="text-sm text-slate-500 ml-6">{location.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-rose-600" 
                          onClick={() => deleteMutation.mutate(location.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location" : "Add Storage Location"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Location Name *</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                     placeholder="e.g., Main Chemical Room, Line 1 Cabinet" required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Notes about this location..." />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={formData.sort_order} 
                     onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                {editingLocation ? "Update" : "Add"} Location
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}