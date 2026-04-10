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
  Building2, Plus, Edit, Trash2, MapPin, Bug
} from "lucide-react";
import { toast } from "sonner";
import { PestLocationRepo } from "@/lib/adapters/database";

export default function PestLocationSettings({ organizationId, locations, vendors, devices, onRefresh }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    description: "",
    default_vendor_id: ""
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const vendor = vendors.find(v => v.id === data.default_vendor_id);
      
      const payload = {
        ...data,
        organization_id: organizationId,
        default_vendor_name: vendor?.name,
        status: "active"
      };

      if (editingLocation) {
        return PestLocationRepo.update(editingLocation.id, payload);
      }
      return PestLocationRepo.create(payload);
    },
    onSuccess: () => {
      toast.success(editingLocation ? "Location updated" : "Location added");
      setModalOpen(false);
      resetForm();
      onRefresh();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => PestLocationRepo.update(id, { status: "inactive" }),
    onSuccess: () => {
      toast.success("Location removed");
      onRefresh();
    }
  });

  const resetForm = () => {
    setEditingLocation(null);
    setFormData({
      name: "",
      code: "",
      address: "",
      description: "",
      default_vendor_id: ""
    });
  };

  const openEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || "",
      code: location.code || "",
      address: location.address || "",
      description: location.description || "",
      default_vendor_id: location.default_vendor_id || ""
    });
    setModalOpen(true);
  };

  // Get device count per location
  const getDeviceCount = (locationId) => {
    return devices.filter(d => d.location_id === locationId).length;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Locations / Buildings
        </CardTitle>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No locations configured</p>
            <p className="text-sm text-slate-400 mt-1">
              Add your buildings/facilities to organize pest devices and reports
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {locations.map(location => (
              <div 
                key={location.id}
                className="p-4 border rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-5 h-5 text-slate-600" />
                      <h3 className="font-medium">{location.name}</h3>
                      {location.code && (
                        <Badge variant="outline">{location.code}</Badge>
                      )}
                    </div>
                    {location.address && (
                      <p className="text-sm text-slate-500 flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" />
                        {location.address}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <Badge className="bg-blue-100 text-blue-800">
                        <Bug className="w-3 h-3 mr-1" />
                        {getDeviceCount(location.id)} devices
                      </Badge>
                      {location.default_vendor_name && (
                        <span className="text-slate-500">
                          Vendor: {location.default_vendor_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(location)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-600"
                      onClick={() => {
                        if (confirm("Remove this location?")) deleteMutation.mutate(location.id);
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
            <DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location Name *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Main Plant"
                />
              </div>
              <div>
                <Label>Code</Label>
                <Input 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="e.g., MP"
                />
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Input 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Physical address"
              />
            </div>

            <div>
              <Label>Default Vendor</Label>
              <Select 
                value={formData.default_vendor_id}
                onValueChange={(v) => setFormData({...formData, default_vendor_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                {editingLocation ? "Update" : "Add"} Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}