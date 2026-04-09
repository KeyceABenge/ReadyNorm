import { useState } from "react";
import { SupplierMaterialRepo } from "@/lib/adapters/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";
import { Search, Plus, Package } from "lucide-react";

const RISK_CONFIG = { low: { color: "bg-emerald-100 text-emerald-700" }, medium: { color: "bg-yellow-100 text-yellow-700" }, high: { color: "bg-orange-100 text-orange-700" }, critical: { color: "bg-rose-100 text-rose-700" } };
const STATUS_CONFIG = { pending: { color: "bg-slate-100 text-slate-700", label: "Pending" }, approved: { color: "bg-emerald-100 text-emerald-700", label: "Approved" }, conditional: { color: "bg-amber-100 text-amber-700", label: "Conditional" }, rejected: { color: "bg-rose-100 text-rose-700", label: "Rejected" }, discontinued: { color: "bg-slate-100 text-slate-600", label: "Discontinued" } };
const CATEGORIES = [{ value: "raw_ingredient", label: "Raw Ingredient" }, { value: "packaging", label: "Packaging" }, { value: "processing_aid", label: "Processing Aid" }, { value: "additive", label: "Additive" }, { value: "allergen_containing", label: "Allergen Containing" }, { value: "other", label: "Other" }];

export default function MaterialsList({ materials, suppliers, organizationId, user, onRefresh }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ supplier_id: "", material_name: "", material_code: "", category: "raw_ingredient", risk_level: "medium", description: "", is_allergen: false, allergens: [] });

  const filteredMaterials = materials.filter(m => m.material_name?.toLowerCase().includes(search.toLowerCase()) || m.material_code?.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async () => {
    if (!formData.supplier_id || !formData.material_name) { toast.error("Please fill required fields"); return; }
    setIsSubmitting(true);
    try {
      const supplier = suppliers.find(s => s.id === formData.supplier_id);
      await SupplierMaterialRepo.create({
        organization_id: organizationId, supplier_id: formData.supplier_id, supplier_name: supplier?.name,
        material_code: formData.material_code || `MAT-${Math.floor(Math.random() * 9000) + 1000}`,
        material_name: formData.material_name, category: formData.category, risk_level: formData.risk_level,
        description: formData.description, is_allergen: formData.is_allergen, status: "pending"
      });
      toast.success("Material added"); setShowForm(false);
      setFormData({ supplier_id: "", material_name: "", material_code: "", category: "raw_ingredient", risk_level: "medium", description: "", is_allergen: false, allergens: [] });
      onRefresh();
    } catch (e) { toast.error("Failed to add material"); }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/60" />
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-2" />Add Material</Button>
      </div>

      <div className="grid gap-3">
        {filteredMaterials.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="py-12 text-center">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No materials found</p>
            </CardContent>
          </Card>
        ) : (
          filteredMaterials.map(mat => (
            <Card key={mat.id} className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{mat.material_code}</span>
                      <Badge className={STATUS_CONFIG[mat.status]?.color}>{STATUS_CONFIG[mat.status]?.label}</Badge>
                      <Badge className={RISK_CONFIG[mat.risk_level]?.color}>{mat.risk_level}</Badge>
                      {mat.is_allergen && <Badge className="bg-rose-100 text-rose-700">Allergen</Badge>}
                    </div>
                    <p className="text-sm font-medium text-slate-800">{mat.material_name}</p>
                    <p className="text-xs text-slate-500">{mat.supplier_name} • {mat.category?.replace(/_/g, " ")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Supplier *</Label>
              <Select value={formData.supplier_id} onValueChange={(v) => setFormData(prev => ({ ...prev, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>{suppliers.filter(s => s.status === "approved").map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Material Name *</Label><Input value={formData.material_name} onChange={(e) => setFormData(prev => ({ ...prev, material_name: e.target.value }))} /></div>
              <div><Label>Material Code</Label><Input value={formData.material_code} onChange={(e) => setFormData(prev => ({ ...prev, material_code: e.target.value }))} placeholder="Auto-generated if blank" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Risk Level</Label>
                <Select value={formData.risk_level} onValueChange={(v) => setFormData(prev => ({ ...prev, risk_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700">{isSubmitting ? "Adding..." : "Add Material"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}