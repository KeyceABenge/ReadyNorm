import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, AlertTriangle, FlaskConical } from "lucide-react";
import { toast } from "sonner";

const TEST_TYPES = [
  { value: "listeria_spp", label: "Listeria spp." },
  { value: "listeria_mono", label: "L. monocytogenes" },
  { value: "salmonella", label: "Salmonella" },
  { value: "apc", label: "APC (Aerobic Plate Count)" },
  { value: "eb", label: "Enterobacteriaceae" },
  { value: "coliform", label: "Coliform" },
  { value: "ecoli", label: "E. coli" },
  { value: "yeast_mold", label: "Yeast & Mold" },
  { value: "staph", label: "Staph. aureus" },
  { value: "cronobacter", label: "Cronobacter" }
];

const ZONE_OPTIONS = [
  { value: "all", label: "All Zones" },
  { value: "zone_1", label: "Zone 1" },
  { value: "zone_2", label: "Zone 2" },
  { value: "zone_3", label: "Zone 3" },
  { value: "zone_4", label: "Zone 4" }
];

const SURFACE_OPTIONS = [
  { value: "all", label: "All Surfaces" },
  { value: "stainless_steel", label: "Stainless Steel" },
  { value: "plastic", label: "Plastic" },
  { value: "rubber", label: "Rubber" },
  { value: "concrete", label: "Concrete" },
  { value: "drain", label: "Drain" },
  { value: "floor", label: "Floor" },
  { value: "equipment", label: "Equipment" }
];

export default function EMPSettings({ thresholds, organizationId, onRefresh }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState(null);
  const [formData, setFormData] = useState({});

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => EMPThresholdRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp_thresholds"] });
      setModalOpen(false);
      setFormData({});
      toast.success("Threshold created");
      onRefresh?.();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => EMPThresholdRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp_thresholds"] });
      setModalOpen(false);
      setEditingThreshold(null);
      setFormData({});
      toast.success("Threshold updated");
      onRefresh?.();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => EMPThresholdRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp_thresholds"] });
      toast.success("Threshold deleted");
      onRefresh?.();
    }
  });

  const handleOpenModal = (threshold = null) => {
    if (threshold) {
      setEditingThreshold(threshold);
      setFormData(threshold);
    } else {
      setEditingThreshold(null);
      setFormData({
        organization_id: organizationId,
        threshold_type: "presence_absence",
        zone_classification: "all",
        surface_type: "all",
        trend_rule_consecutive: 2,
        trend_rule_period_days: 30,
        trend_rule_count: 3,
        auto_create_capa: true,
        auto_require_reswab: true,
        reswab_within_hours: 24,
        status: "active",
        severity_mapping: {
          zone_1_positive: "critical",
          zone_2_positive: "major",
          zone_3_positive: "moderate",
          zone_4_positive: "minor"
        }
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.test_type) {
      toast.error("Please fill in required fields");
      return;
    }

    if (editingThreshold) {
      updateMutation.mutate({ id: editingThreshold.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Group thresholds by test type
  const thresholdsByTest = TEST_TYPES.reduce((acc, test) => {
    acc[test.value] = thresholds.filter(t => t.test_type === test.value);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Threshold Settings</h2>
          <p className="text-sm text-slate-500">Configure action limits and automated responses</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Threshold
        </Button>
      </div>

      {/* Thresholds List */}
      {thresholds.length === 0 ? (
        <Card className="p-8 text-center">
          <FlaskConical className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">No thresholds configured</p>
          <Button onClick={() => handleOpenModal()}>Create First Threshold</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {TEST_TYPES.map(test => {
            const testThresholds = thresholdsByTest[test.value];
            if (testThresholds.length === 0) return null;

            return (
              <Card key={test.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FlaskConical className="w-4 h-4" />
                    {test.label}
                    <Badge variant="secondary">{testThresholds.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {testThresholds.map(threshold => (
                      <div key={threshold.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{threshold.name}</span>
                            {threshold.status === "inactive" && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-600 space-y-1">
                            <p>
                              Zone: {threshold.zone_classification === "all" ? "All" : threshold.zone_classification?.replace("_", " ").toUpperCase()} | 
                              Surface: {threshold.surface_type === "all" ? "All" : threshold.surface_type?.replace(/_/g, " ")}
                            </p>
                            {threshold.threshold_type === "numeric" ? (
                              <p>
                                Warning: {threshold.warning_limit} {threshold.unit} | 
                                Action: {threshold.action_limit} {threshold.unit}
                              </p>
                            ) : (
                              <p>Type: Presence/Absence</p>
                            )}
                            <p className="text-xs">
                              Trend Rule: {threshold.trend_rule_consecutive} consecutive OR {threshold.trend_rule_count} in {threshold.trend_rule_period_days} days
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {threshold.auto_create_capa && (
                              <Badge variant="outline" className="text-xs">Auto CAPA</Badge>
                            )}
                            {threshold.auto_require_reswab && (
                              <Badge variant="outline" className="text-xs">Auto Reswab ({threshold.reswab_within_hours}h)</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenModal(threshold)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-rose-500 hover:text-rose-600"
                            onClick={() => {
                              if (confirm("Delete this threshold?")) {
                                deleteMutation.mutate(threshold.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Severity Defaults Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Default Severity by Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center text-sm">
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <p className="font-medium text-rose-700">Zone 1</p>
              <p className="text-rose-600">Critical</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="font-medium text-orange-700">Zone 2</p>
              <p className="text-orange-600">Major</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="font-medium text-amber-700">Zone 3</p>
              <p className="text-amber-600">Moderate</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-medium text-yellow-700">Zone 4</p>
              <p className="text-yellow-600">Minor</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">
            Pathogen positives in Zone 1 automatically trigger CAPA and product hold evaluation
          </p>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingThreshold ? "Edit Threshold" : "Add Threshold Rule"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Rule Name *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Listeria Zone 1 Limit"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Test Type *</Label>
                <Select value={formData.test_type || ""} onValueChange={(v) => setFormData({ ...formData, test_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select test" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Threshold Type</Label>
                <Select value={formData.threshold_type} onValueChange={(v) => setFormData({ ...formData, threshold_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presence_absence">Presence/Absence</SelectItem>
                    <SelectItem value="numeric">Numeric Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Zone</Label>
                <Select value={formData.zone_classification} onValueChange={(v) => setFormData({ ...formData, zone_classification: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONE_OPTIONS.map(z => (
                      <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Surface Type</Label>
                <Select value={formData.surface_type} onValueChange={(v) => setFormData({ ...formData, surface_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SURFACE_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.threshold_type === "numeric" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Warning Limit</Label>
                  <Input
                    type="number"
                    value={formData.warning_limit || ""}
                    onChange={(e) => setFormData({ ...formData, warning_limit: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Action Limit</Label>
                  <Input
                    type="number"
                    value={formData.action_limit || ""}
                    onChange={(e) => setFormData({ ...formData, action_limit: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={formData.unit || ""}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="CFU/swab"
                  />
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Trend Rules</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Consecutive Positives</Label>
                  <Input
                    type="number"
                    value={formData.trend_rule_consecutive || ""}
                    onChange={(e) => setFormData({ ...formData, trend_rule_consecutive: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Count in Period</Label>
                  <Input
                    type="number"
                    value={formData.trend_rule_count || ""}
                    onChange={(e) => setFormData({ ...formData, trend_rule_count: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Period (days)</Label>
                  <Input
                    type="number"
                    value={formData.trend_rule_period_days || ""}
                    onChange={(e) => setFormData({ ...formData, trend_rule_period_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Automated Actions</p>
              <div className="flex items-center justify-between">
                <Label>Auto-create CAPA on exceedance</Label>
                <Switch
                  checked={formData.auto_create_capa}
                  onCheckedChange={(v) => setFormData({ ...formData, auto_create_capa: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Auto-require reswab</Label>
                <Switch
                  checked={formData.auto_require_reswab}
                  onCheckedChange={(v) => setFormData({ ...formData, auto_require_reswab: v })}
                />
              </div>
              {formData.auto_require_reswab && (
                <div>
                  <Label className="text-xs">Reswab within (hours)</Label>
                  <Input
                    type="number"
                    value={formData.reswab_within_hours || ""}
                    onChange={(e) => setFormData({ ...formData, reswab_within_hours: parseInt(e.target.value) })}
                    className="w-24"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingThreshold ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}