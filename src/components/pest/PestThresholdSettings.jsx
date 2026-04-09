import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  AlertTriangle, Plus, Edit, Trash2, Mail
} from "lucide-react";
import { toast } from "sonner";

const PEST_TYPES = [
  { value: "rodents", label: "Rodents" },
  { value: "flies", label: "Flies" },
  { value: "stored_product_insects", label: "Stored Product Insects" },
  { value: "cockroaches", label: "Cockroaches" },
  { value: "ants", label: "Ants" },
  { value: "birds", label: "Birds" },
  { value: "other", label: "Other" }
];

const DEVICE_TYPES = [
  { value: "all", label: "All Devices" },
  { value: "ilt", label: "Insect Light Trap" },
  { value: "rodent_station", label: "Rodent Station" },
  { value: "fly_light", label: "Fly Light" },
  { value: "pheromone_trap", label: "Pheromone Trap" },
  { value: "glue_board", label: "Glue Board" },
  { value: "bait_station", label: "Bait Station" }
];

export default function PestThresholdSettings({ 
  organizationId, thresholds, areas, productionLines, devices, onRefresh 
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    pest_type: "",
    pest_aliases: [],
    device_type: "all",
    scope_type: "facility",
    scope_id: "",
    warning_threshold: "",
    critical_threshold: "",
    time_period: "per_service",
    auto_create_capa: true,
    notification_emails: []
  });
  const [emailInput, setEmailInput] = useState("");
  const [aliasInput, setAliasInput] = useState("");

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let scopeName = "";
      if (data.scope_type === "area") {
        scopeName = areas.find(a => a.id === data.scope_id)?.name;
      } else if (data.scope_type === "production_line") {
        scopeName = productionLines.find(l => l.id === data.scope_id)?.name;
      } else if (data.scope_type === "device") {
        scopeName = devices.find(d => d.id === data.scope_id)?.device_code;
      }

      const payload = {
        ...data,
        organization_id: organizationId,
        scope_name: scopeName,
        warning_threshold: data.warning_threshold ? parseInt(data.warning_threshold) : null,
        critical_threshold: parseInt(data.critical_threshold),
        status: "active"
      };

      if (editingThreshold) {
        return PestThresholdRepo.update(editingThreshold.id, payload);
      }
      return PestThresholdRepo.create(payload);
    },
    onSuccess: () => {
      toast.success(editingThreshold ? "Threshold updated" : "Threshold created");
      setModalOpen(false);
      resetForm();
      onRefresh();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => PestThresholdRepo.delete(id),
    onSuccess: () => {
      toast.success("Threshold deleted");
      onRefresh();
    }
  });

  const resetForm = () => {
    setEditingThreshold(null);
    setFormData({
      name: "",
      pest_type: "",
      pest_aliases: [],
      device_type: "all",
      scope_type: "facility",
      scope_id: "",
      warning_threshold: "",
      critical_threshold: "",
      time_period: "per_service",
      auto_create_capa: true,
      notification_emails: []
    });
    setEmailInput("");
    setAliasInput("");
  };

  const openEdit = (threshold) => {
    setEditingThreshold(threshold);
    setFormData({
      name: threshold.name || "",
      pest_type: threshold.pest_type || "",
      pest_aliases: threshold.pest_aliases || [],
      device_type: threshold.device_type || "all",
      scope_type: threshold.scope_type || "facility",
      scope_id: threshold.scope_id || "",
      warning_threshold: threshold.warning_threshold?.toString() || "",
      critical_threshold: threshold.critical_threshold?.toString() || "",
      time_period: threshold.time_period || "per_service",
      auto_create_capa: threshold.auto_create_capa !== false,
      notification_emails: threshold.notification_emails || []
    });
    setAliasInput("");
    setModalOpen(true);
  };

  const addEmail = () => {
    if (emailInput && !formData.notification_emails.includes(emailInput)) {
      setFormData({
        ...formData,
        notification_emails: [...formData.notification_emails, emailInput]
      });
      setEmailInput("");
    }
  };

  const removeEmail = (email) => {
    setFormData({
      ...formData,
      notification_emails: formData.notification_emails.filter(e => e !== email)
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Pest Thresholds
        </CardTitle>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Threshold
        </Button>
      </CardHeader>
      <CardContent>
        {thresholds.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No thresholds configured</p>
            <p className="text-sm text-slate-400 mt-1">
              Set up thresholds to automatically flag pest activity exceedances
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {thresholds.map(threshold => (
              <div 
                key={threshold.id}
                className="p-4 border rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{threshold.name}</span>
                    <Badge variant="outline">
                      {PEST_TYPES.find(p => p.value === threshold.pest_type)?.label}
                    </Badge>
                    {threshold.scope_type !== "facility" && (
                      <Badge className="bg-blue-100 text-blue-800">
                        {threshold.scope_type}: {threshold.scope_name}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-slate-600">
                    Warning: {threshold.warning_threshold || "—"} • 
                    Critical: <span className="text-red-600 font-medium">{threshold.critical_threshold}</span> •
                    {threshold.auto_create_capa && " Auto-CAPA •"}
                    {threshold.notification_emails?.length > 0 && (
                      <span className="ml-1">
                        <Mail className="w-3 h-3 inline" /> {threshold.notification_emails.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(threshold)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-600"
                    onClick={() => {
                      if (confirm("Delete this threshold?")) deleteMutation.mutate(threshold.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
            <DialogTitle>{editingThreshold ? "Edit Threshold" : "Add Threshold"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Threshold Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Rodent Critical - Warehouse"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pest Type *</Label>
                <Select 
                  value={formData.pest_type}
                  onValueChange={(v) => setFormData({...formData, pest_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pest" />
                  </SelectTrigger>
                  <SelectContent>
                    {PEST_TYPES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Device Type</Label>
                <Select 
                  value={formData.device_type}
                  onValueChange={(v) => setFormData({...formData, device_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Pest Aliases (names from vendor reports)</Label>
              <p className="text-xs text-slate-500 mb-2">
                Add variations your pest company uses (e.g., "small fly", "fruit fly", "phorid fly" for Flies)
              </p>
              <div className="flex gap-2">
                <Input 
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="e.g., small fly"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (aliasInput.trim() && !formData.pest_aliases.includes(aliasInput.trim().toLowerCase())) {
                        setFormData({
                          ...formData,
                          pest_aliases: [...formData.pest_aliases, aliasInput.trim().toLowerCase()]
                        });
                        setAliasInput("");
                      }
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    if (aliasInput.trim() && !formData.pest_aliases.includes(aliasInput.trim().toLowerCase())) {
                      setFormData({
                        ...formData,
                        pest_aliases: [...formData.pest_aliases, aliasInput.trim().toLowerCase()]
                      });
                      setAliasInput("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {formData.pest_aliases.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.pest_aliases.map(alias => (
                    <Badge 
                      key={alias} 
                      variant="secondary" 
                      className="cursor-pointer" 
                      onClick={() => setFormData({
                        ...formData,
                        pest_aliases: formData.pest_aliases.filter(a => a !== alias)
                      })}
                    >
                      {alias} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scope</Label>
                <Select 
                  value={formData.scope_type}
                  onValueChange={(v) => setFormData({...formData, scope_type: v, scope_id: ""})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facility">Entire Facility</SelectItem>
                    <SelectItem value="area">Specific Area</SelectItem>
                    <SelectItem value="production_line">Production Line</SelectItem>
                    <SelectItem value="device">Single Device</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.scope_type !== "facility" && (
                <div>
                  <Label>Select {formData.scope_type}</Label>
                  <Select 
                    value={formData.scope_id}
                    onValueChange={(v) => setFormData({...formData, scope_id: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.scope_type === "area" && areas.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                      {formData.scope_type === "production_line" && productionLines.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                      {formData.scope_type === "device" && devices.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.device_code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warning Threshold</Label>
                <Input 
                  type="number"
                  value={formData.warning_threshold}
                  onChange={(e) => setFormData({...formData, warning_threshold: e.target.value})}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Critical Threshold *</Label>
                <Input 
                  type="number"
                  value={formData.critical_threshold}
                  onChange={(e) => setFormData({...formData, critical_threshold: e.target.value})}
                  placeholder="Required"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto-create CAPA on critical exceedance</Label>
              <Switch 
                checked={formData.auto_create_capa}
                onCheckedChange={(v) => setFormData({...formData, auto_create_capa: v})}
              />
            </div>

            <div>
              <Label>Notification Emails</Label>
              <div className="flex gap-2 mt-2">
                <Input 
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="email@example.com"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                />
                <Button type="button" variant="outline" onClick={addEmail}>Add</Button>
              </div>
              {formData.notification_emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.notification_emails.map(email => (
                    <Badge key={email} variant="secondary" className="cursor-pointer" onClick={() => removeEmail(email)}>
                      {email} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1"
                disabled={!formData.name || !formData.pest_type || !formData.critical_threshold || saveMutation.isPending}
                onClick={() => saveMutation.mutate(formData)}
              >
                {editingThreshold ? "Update" : "Create"} Threshold
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}