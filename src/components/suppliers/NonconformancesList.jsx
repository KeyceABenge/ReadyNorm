import { useState } from "react";
import { SupplierRepo, SupplierNonconformanceRepo } from "@/lib/adapters/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Plus, FileWarning } from "lucide-react";

const SEVERITY_CONFIG = { minor: { color: "bg-slate-100 text-slate-600" }, moderate: { color: "bg-yellow-100 text-yellow-700" }, major: { color: "bg-amber-100 text-amber-700" }, critical: { color: "bg-rose-100 text-rose-700" } };
const STATUS_CONFIG = { open: { color: "bg-slate-100 text-slate-700", label: "Open" }, investigating: { color: "bg-blue-100 text-blue-700", label: "Investigating" }, pending_supplier: { color: "bg-amber-100 text-amber-700", label: "Pending Supplier" }, corrective_action: { color: "bg-purple-100 text-purple-700", label: "Corrective Action" }, closed: { color: "bg-emerald-100 text-emerald-700", label: "Closed" }, escalated: { color: "bg-rose-100 text-rose-700", label: "Escalated" } };
const NC_TYPES = [{ value: "quality_defect", label: "Quality Defect" }, { value: "spec_deviation", label: "Spec Deviation" }, { value: "foreign_material", label: "Foreign Material" }, { value: "documentation", label: "Documentation Issue" }, { value: "delivery", label: "Delivery Issue" }, { value: "packaging", label: "Packaging Issue" }, { value: "allergen", label: "Allergen Issue" }, { value: "contamination", label: "Contamination" }, { value: "other", label: "Other" }];

export default function NonconformancesList({ nonconformances, suppliers, organizationId, user, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ supplier_id: "", nc_type: "quality_defect", severity: "moderate", lot_number: "", description: "" });

  const filtered = nonconformances.filter(nc => {
    const matchSearch = nc.supplier_name?.toLowerCase().includes(search.toLowerCase()) || nc.nc_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || nc.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSubmit = async () => {
    if (!formData.supplier_id || !formData.description) { toast.error("Please fill required fields"); return; }
    setIsSubmitting(true);
    try {
      const supplier = suppliers.find(s => s.id === formData.supplier_id);
      await SupplierNonconformanceRepo.create({
        organization_id: organizationId, nc_number: `SNC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
        supplier_id: formData.supplier_id, supplier_name: supplier?.name, nc_type: formData.nc_type,
        severity: formData.severity, lot_number: formData.lot_number, description: formData.description,
        status: "open", reported_by_email: user?.email, reported_by_name: user?.full_name,
        activity_log: [{ timestamp: new Date().toISOString(), action: "created", user_email: user?.email, user_name: user?.full_name, details: "NC reported" }]
      });
      // Update supplier NC count
      await SupplierRepo.update(formData.supplier_id, { total_nonconformances: (supplier?.total_nonconformances || 0) + 1 });
      toast.success("Nonconformance reported"); setShowForm(false);
      setFormData({ supplier_id: "", nc_type: "quality_defect", severity: "moderate", lot_number: "", description: "" });
      onRefresh();
    } catch (e) { toast.error("Failed to report NC"); }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search NCs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/60" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-white/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowForm(true)} className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-2" />Report NC</Button>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="py-12 text-center">
              <FileWarning className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No nonconformances found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(nc => (
            <Card key={nc.id} className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{nc.nc_number}</span>
                      <Badge className={STATUS_CONFIG[nc.status]?.color}>{STATUS_CONFIG[nc.status]?.label}</Badge>
                      <Badge className={SEVERITY_CONFIG[nc.severity]?.color}>{nc.severity}</Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{nc.supplier_name}</p>
                    <p className="text-xs text-slate-500">{nc.nc_type.replace(/_/g, " ")} {nc.lot_number && `• Lot: ${nc.lot_number}`}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{nc.description}</p>
                  </div>
                  <span className="text-xs text-slate-400">{format(new Date(nc.created_date), "MMM d, yyyy")}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Report Supplier Nonconformance</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Supplier *</Label>
              <Select value={formData.supplier_id} onValueChange={(v) => setFormData(prev => ({ ...prev, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>{suppliers.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>NC Type</Label>
                <Select value={formData.nc_type} onValueChange={(v) => setFormData(prev => ({ ...prev, nc_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NC_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Severity</Label>
                <Select value={formData.severity} onValueChange={(v) => setFormData(prev => ({ ...prev, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="minor">Minor</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="major">Major</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Lot Number</Label><Input value={formData.lot_number} onChange={(e) => setFormData(prev => ({ ...prev, lot_number: e.target.value }))} placeholder="Lot/batch number" /></div>
            <div><Label>Description *</Label><Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe the nonconformance..." rows={3} /></div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700">{isSubmitting ? "Reporting..." : "Report NC"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}