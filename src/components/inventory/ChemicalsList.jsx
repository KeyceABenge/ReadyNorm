import { useState } from "react";
import { ChemicalRepo } from "@/lib/adapters/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, FlaskConical, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function ChemicalsList({ organizationId, chemicals }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingChemical, setEditingChemical] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    unit: "gallons",
    category: "",
    supplier: "",
    sds_url: "",
    notes: ""
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => ChemicalRepo.create({ ...data, organization_id: organizationId }),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["chemicals"] });
      const previous = queryClient.getQueryData(["chemicals"]);
      queryClient.setQueryData(["chemicals"], (old = []) => [...old, { ...newData, id: `temp-${Date.now()}`, organization_id: organizationId }]);
      return { previous };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(["chemicals"], context.previous);
      toast.error("Failed to add chemical");
    },
    onSuccess: () => {
      setFormOpen(false);
      resetForm();
      toast.success("Chemical added");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["chemicals"] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ChemicalRepo.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["chemicals"] });
      const previous = queryClient.getQueryData(["chemicals"]);
      queryClient.setQueryData(["chemicals"], (old = []) => old.map(c => c.id === id ? { ...c, ...data } : c));
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["chemicals"], context.previous);
      toast.error("Failed to update chemical");
    },
    onSuccess: () => {
      setFormOpen(false);
      resetForm();
      toast.success("Chemical updated");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["chemicals"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ChemicalRepo.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["chemicals"] });
      const previous = queryClient.getQueryData(["chemicals"]);
      queryClient.setQueryData(["chemicals"], (old = []) => old.filter(c => c.id !== id));
      return { previous };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["chemicals"], context.previous);
      toast.error("Failed to delete chemical");
    },
    onSuccess: () => toast.success("Chemical deleted"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["chemicals"] })
  });

  const resetForm = () => {
    setFormData({ name: "", sku: "", unit: "gallons", category: "", supplier: "", sds_url: "", notes: "" });
    setEditingChemical(null);
  };

  const handleEdit = (chemical) => {
    setEditingChemical(chemical);
    setFormData({
      name: chemical.name || "",
      sku: chemical.sku || "",
      unit: chemical.unit || "gallons",
      category: chemical.category || "",
      supplier: chemical.supplier || "",
      sds_url: chemical.sds_url || "",
      notes: chemical.notes || ""
    });
    setFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingChemical) {
      updateMutation.mutate({ id: editingChemical.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const units = ["gallons", "liters", "oz", "lbs", "kg", "each", "case", "pail", "drum"];
  const categories = [...new Set(chemicals.map(c => c.category).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Chemical Master List</h2>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Chemical
        </Button>
      </div>

      <div className="grid gap-3">
        {chemicals.length === 0 ? (
          <Card className="p-8 text-center">
            <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No chemicals added yet</p>
          </Card>
        ) : (
          chemicals.map(chemical => (
            <Card key={chemical.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{chemical.name}</h3>
                    {chemical.status === "discontinued" && (
                      <Badge variant="outline" className="text-rose-600">Discontinued</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                    {chemical.sku && <span>SKU: {chemical.sku}</span>}
                    <span>•</span>
                    <span className="capitalize">{chemical.unit}</span>
                    {chemical.category && (
                      <>
                        <span>•</span>
                        <Badge variant="outline">{chemical.category}</Badge>
                      </>
                    )}
                    {chemical.supplier && (
                      <>
                        <span>•</span>
                        <span>{chemical.supplier}</span>
                      </>
                    )}
                  </div>
                  {chemical.sds_url && (
                    <a href={chemical.sds_url} target="_blank" rel="noopener noreferrer" 
                       className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                      <ExternalLink className="w-3 h-3" /> View SDS
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(chemical)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-rose-600" 
                          onClick={() => deleteMutation.mutate(chemical.id)}>
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
            <DialogTitle>{editingChemical ? "Edit Chemical" : "Add Chemical"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Chemical Name *</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div>
                <Label>SKU / Product Code</Label>
                <Input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
              <div>
                <Label>Unit of Measure *</Label>
                <Select value={formData.unit} onValueChange={v => setFormData({...formData, unit: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                       placeholder="e.g., Sanitizer, Degreaser" list="categories" />
                <datalist id="categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <Label>Supplier</Label>
                <Input value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Label>SDS URL</Label>
                <Input value={formData.sds_url} onChange={e => setFormData({...formData, sds_url: e.target.value})} 
                       placeholder="https://..." type="url" />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {editingChemical ? "Update" : "Add"} Chemical
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}