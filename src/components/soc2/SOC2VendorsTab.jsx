import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Truck, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export default function SOC2VendorsTab({ orgId, vendors }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const openModal = (vendor) => {
    if (vendor) {
      setEditing(vendor);
      setForm({ ...vendor });
    } else {
      setEditing(null);
      setForm({ data_access_level: "limited", risk_rating: "low", status: "active", has_soc2: false });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.vendor_name || !form.service_provided) { toast.error("Vendor name and service required"); return; }
    setSaving(true);
    try {
      if (editing?.id) {
        const { id, created_date, updated_date, created_by, ...data } = form;
        await SOC2VendorRepo.update(editing.id, data);
      } else {
        await SOC2VendorRepo.create({ ...form, organization_id: orgId });
      }
      queryClient.invalidateQueries({ queryKey: ["soc2_vendors"] });
      toast.success("Vendor saved");
      setModalOpen(false);
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Vendor List ({vendors.length})</h2>
        <Button onClick={() => openModal(null)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Vendor
        </Button>
      </div>

      {vendors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No vendors documented yet. Add your third-party service providers.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {vendors.map(vendor => (
            <Card key={vendor.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openModal(vendor)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-slate-900">{vendor.vendor_name}</h4>
                      {vendor.has_soc2 ? (
                        <Badge className="bg-emerald-100 text-emerald-700 gap-1"><CheckCircle2 className="w-3 h-3" /> SOC 2</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 gap-1"><XCircle className="w-3 h-3" /> No SOC 2</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{vendor.data_access_level} access</Badge>
                      <Badge className={vendor.risk_rating === "high" ? "bg-rose-100 text-rose-700" : vendor.risk_rating === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                        {vendor.risk_rating} risk
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">{vendor.service_provided}</p>
                    <div className="flex gap-4 text-xs text-slate-400 mt-1">
                      {vendor.last_review_date && <span>Last review: {format(parseISO(vendor.last_review_date), "MMM d, yyyy")}</span>}
                      {vendor.contract_expiry && <span>Contract expires: {format(parseISO(vendor.contract_expiry), "MMM d, yyyy")}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendor Name</Label>
              <Input value={form.vendor_name || ""} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
            </div>
            <div>
              <Label>Service Provided</Label>
              <Input value={form.service_provided || ""} onChange={e => setForm(f => ({ ...f, service_provided: e.target.value }))} placeholder="e.g., Cloud hosting, email, payments" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data Access Level</Label>
                <Select value={form.data_access_level || "limited"} onValueChange={v => setForm(f => ({ ...f, data_access_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="limited">Limited</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk Rating</Label>
                <Select value={form.risk_rating || "low"} onValueChange={v => setForm(f => ({ ...f, risk_rating: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.has_soc2 || false} onCheckedChange={v => setForm(f => ({ ...f, has_soc2: v }))} />
              <Label>Has SOC 2 Report</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contract Expiry</Label>
                <Input type="date" value={form.contract_expiry || ""} onChange={e => setForm(f => ({ ...f, contract_expiry: e.target.value }))} />
              </div>
              <div>
                <Label>Next Review Date</Label>
                <Input type="date" value={form.next_review_date || ""} onChange={e => setForm(f => ({ ...f, next_review_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <textarea className="w-full border rounded-lg p-3 text-sm min-h-[60px]" value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}