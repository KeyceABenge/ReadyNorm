import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, Plus, Edit, Trash2, Phone, Mail, Calendar
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { PestVendorRepo } from "@/lib/adapters/database";

export default function PestVendorSettings({ organizationId, vendors, onRefresh }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    contract_number: "",
    service_frequency: "monthly",
    next_service_date: "",
    services_provided: [],
    notes: ""
  });

  const PEST_SERVICES = [
    "Rodent Control", "Flying Insects", "Crawling Insects", 
    "Stored Product Insects", "Bird Control", "Wildlife Management"
  ];

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        organization_id: organizationId,
        status: "active"
      };

      if (editingVendor) {
        return PestVendorRepo.update(editingVendor.id, payload);
      }
      return PestVendorRepo.create(payload);
    },
    onSuccess: () => {
      toast.success(editingVendor ? "Vendor updated" : "Vendor added");
      setModalOpen(false);
      resetForm();
      onRefresh();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => PestVendorRepo.update(id, { status: "inactive" }),
    onSuccess: () => {
      toast.success("Vendor removed");
      onRefresh();
    }
  });

  const resetForm = () => {
    setEditingVendor(null);
    setFormData({
      name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      contract_number: "",
      service_frequency: "monthly",
      next_service_date: "",
      services_provided: [],
      notes: ""
    });
  };

  const openEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || "",
      contact_name: vendor.contact_name || "",
      contact_email: vendor.contact_email || "",
      contact_phone: vendor.contact_phone || "",
      contract_number: vendor.contract_number || "",
      service_frequency: vendor.service_frequency || "monthly",
      next_service_date: vendor.next_service_date || "",
      services_provided: vendor.services_provided || [],
      notes: vendor.notes || ""
    });
    setModalOpen(true);
  };

  const toggleService = (service) => {
    const services = formData.services_provided.includes(service)
      ? formData.services_provided.filter(s => s !== service)
      : [...formData.services_provided, service];
    setFormData({...formData, services_provided: services});
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Pest Control Vendors
        </CardTitle>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </CardHeader>
      <CardContent>
        {vendors.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No vendors configured</p>
            <p className="text-sm text-slate-400 mt-1">
              Add your pest control service provider
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vendors.map(vendor => (
              <div 
                key={vendor.id}
                className="p-4 border rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-lg">{vendor.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline">{vendor.service_frequency}</Badge>
                      {vendor.next_service_date && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Calendar className="w-3 h-3 mr-1" />
                          Next: {format(parseISO(vendor.next_service_date), "MMM d")}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-slate-600 space-y-1">
                      {vendor.contact_name && <p>Contact: {vendor.contact_name}</p>}
                      {vendor.contact_email && (
                        <p className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {vendor.contact_email}
                        </p>
                      )}
                      {vendor.contact_phone && (
                        <p className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {vendor.contact_phone}
                        </p>
                      )}
                    </div>
                    {vendor.services_provided?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {vendor.services_provided.map(service => (
                          <Badge key={service} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(vendor)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-600"
                      onClick={() => {
                        if (confirm("Remove this vendor?")) deleteMutation.mutate(vendor.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Pest control company name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input 
                  value={formData.contact_name}
                  onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Contract #</Label>
                <Input 
                  value={formData.contract_number}
                  onChange={(e) => setFormData({...formData, contract_number: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service Frequency</Label>
                <Select 
                  value={formData.service_frequency}
                  onValueChange={(v) => setFormData({...formData, service_frequency: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="as_needed">As Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Next Service Date</Label>
                <Input 
                  type="date"
                  value={formData.next_service_date}
                  onChange={(e) => setFormData({...formData, next_service_date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Services Provided</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PEST_SERVICES.map(service => (
                  <Badge 
                    key={service}
                    variant={formData.services_provided.includes(service) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleService(service)}
                  >
                    {service}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1"
                disabled={!formData.name || saveMutation.isPending}
                onClick={() => saveMutation.mutate(formData)}
              >
                {editingVendor ? "Update" : "Add"} Vendor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}