// @ts-nocheck
import React, { useState, useEffect } from "react";
import { OrganizationRepo, TitrationAreaRepo, TitrationRecordRepo, TitrationSettingsRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Beaker, MapPin, Settings, Trash2, Edit, FlaskConical, Calendar, 
  ClipboardList, CheckCircle2, AlertTriangle, GraduationCap, X, Loader2, Save
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import TrainingDocumentSelector from "@/components/modals/TrainingDocumentSelector";
import { createPageUrl } from "@/utils";

export default function ChemicalManagement() {
  const [organizationId, setOrganizationId] = useState(null);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadOrganization = async () => {
      // CRITICAL: Get organization_id ONLY from site_code in localStorage
      const siteCode = localStorage.getItem("site_code");
      if (!siteCode) {
        window.location.href = createPageUrl("Home");
        return;
      }
      
      try {
        const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].id);
        } else {
          localStorage.removeItem('site_code');
          window.location.href = createPageUrl("Home");
        }
      } catch (e) {
        console.error("Error fetching org by site code:", e);
      }
    };
    loadOrganization();
  }, []);

  const { data: titrationAreas = [] } = useQuery({
    queryKey: ["titration_areas", organizationId],
    queryFn: () => TitrationAreaRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: titrationRecords = [] } = useQuery({
    queryKey: ["titration_records", organizationId],
    queryFn: () => TitrationRecordRepo.filter({ organization_id: organizationId }, "-completed_at"),
    enabled: !!organizationId
  });

  const { data: titrationSettings = [] } = useQuery({
    queryKey: ["titration_settings", organizationId],
    queryFn: () => TitrationSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const createAreaMutation = useMutation({
    mutationFn: (data) => TitrationAreaRepo.create({ ...data, organization_id: organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titration_areas"] });
      toast.success("Location created");
      setAreaModalOpen(false);
      setEditingArea(null);
    }
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, data }) => TitrationAreaRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titration_areas"] });
      toast.success("Location updated");
      setAreaModalOpen(false);
      setEditingArea(null);
    }
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id) => TitrationAreaRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titration_areas"] });
      toast.success("Location deleted");
    }
  });

  const activeAreas = titrationAreas.filter(a => a.status === "active");

  const typeIcons = {
    area: MapPin,
    equipment: Settings,
    spot_check: Beaker
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical className="w-6 h-6" />
              Chemical Titration Management
            </h1>
            <p className="text-slate-500 mt-1">Manage titration areas and equipment for audits</p>
          </div>
        </div>

        <Tabs defaultValue="locations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Records
              {titrationRecords.length > 0 && (
                <Badge className="ml-1 bg-blue-600">{titrationRecords.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingArea(null); setAreaModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </div>

            {/* Locations Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {titrationAreas.map(area => {
                const Icon = typeIcons[area.type] || MapPin;
                return (
                  <Card key={area.id} className={area.status === "inactive" ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-blue-100">
                            <Icon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{area.name}</CardTitle>
                            <Badge variant="outline" className="text-xs mt-1">{area.type?.replace("_", " ")}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingArea(area); setAreaModalOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteAreaMutation.mutate(area.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Chemical:</span>
                          <span className="font-medium">{area.chemical_name || area.chemical_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Target {area.measurement_type === "oz_gal" ? "oz/gal" : "PPM"}:</span>
                          <span className="font-medium">{area.target_min ?? area.target_ppm_min} - {area.target_max ?? area.target_ppm_max}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Frequency:</span>
                          <Badge variant="secondary" className="text-xs capitalize flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {area.frequency || "daily"}
                          </Badge>
                        </div>
                        {area.description && (
                          <p className="text-slate-500 text-xs mt-2">{area.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {titrationAreas.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500">
                  No titration locations added yet. Click "Add Location" to get started.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            {titrationRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No titration records yet.</p>
                <p className="text-sm">Records will appear here when employees complete titrations.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  // Group records by week (starting Sunday)
                  const recordsByWeek = {};
                  titrationRecords.forEach(record => {
                    if (!record.completed_at) return;
                    const recordDate = parseISO(record.completed_at);
                    const weekStart = startOfWeek(recordDate, { weekStartsOn: 0 });
                    const weekKey = format(weekStart, "yyyy-MM-dd");
                    if (!recordsByWeek[weekKey]) {
                      recordsByWeek[weekKey] = {
                        start: weekStart,
                        end: endOfWeek(recordDate, { weekStartsOn: 0 }),
                        records: []
                      };
                    }
                    recordsByWeek[weekKey].records.push(record);
                  });

                  // Sort weeks descending (most recent first)
                  const sortedWeeks = Object.entries(recordsByWeek).sort((a, b) => b[0].localeCompare(a[0]));

                  return sortedWeeks.map(([weekKey, { start, end, records }]) => (
                    <div key={weekKey}>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <h3 className="font-semibold text-slate-700">
                          {format(start, "MMM d")} - {format(end, "MMM d, yyyy")}
                        </h3>
                        <Badge variant="secondary" className="ml-2">{records.length} record{records.length !== 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="space-y-3">
                        {records.map(record => (
                          <Card key={record.id} className={cn(
                            "border-l-4",
                            record.status === "pass" ? "border-l-emerald-500" : "border-l-red-500"
                          )}>
                            <CardContent className="p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className={cn(
                                    "p-2 rounded-lg",
                                    record.status === "pass" ? "bg-emerald-100" : "bg-red-100"
                                  )}>
                                    {record.status === "pass" ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    ) : (
                                      <AlertTriangle className="w-5 h-5 text-red-600" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900">{record.titration_area_name}</p>
                                    <p className="text-sm text-slate-500">
                                      {record.chemical_name} • {record.recorded_ppm} PPM
                                      <span className="text-xs ml-2">(Target: {record.target_ppm_min}-{record.target_ppm_max})</span>
                                    </p>
                                    {record.corrective_action && (
                                      <p className="text-xs text-amber-600 mt-1">
                                        Corrective Action: {record.corrective_action}
                                      </p>
                                    )}
                                    {record.notes && (
                                      <p className="text-xs text-slate-500 mt-1">{record.notes}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right text-sm">
                                  <Badge className={record.status === "pass" ? "bg-emerald-600" : "bg-red-600"}>
                                    {record.status === "pass" ? "PASS" : "FAIL"}
                                  </Badge>
                                  <p className="text-slate-500 mt-1">{record.completed_by_name || record.completed_by}</p>
                                  <p className="text-xs text-slate-400">
                                    {record.completed_at ? format(parseISO(record.completed_at), "EEE, MMM d 'at' h:mm a") : "—"}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <TitrationSettingsPanel 
              organizationId={organizationId} 
              settings={titrationSettings[0]}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["titration_settings"] })}
            />
          </TabsContent>
        </Tabs>

        {/* Area Modal */}
        <AreaFormModal
          open={areaModalOpen}
          onClose={() => { setAreaModalOpen(false); setEditingArea(null); }}
          area={editingArea}
          onSave={(data) => {
            if (editingArea) {
              updateAreaMutation.mutate({ id: editingArea.id, data });
            } else {
              createAreaMutation.mutate(data);
            }
          }}
          isLoading={createAreaMutation.isPending || updateAreaMutation.isPending}
        />
      </div>
    </div>
  );
}

function TitrationSettingsPanel({ organizationId, settings, onSaved }) {
  const [showTrainingSelector, setShowTrainingSelector] = useState(false);
  const [formData, setFormData] = useState({
    is_enabled: true,
    task_title: "Chemical Titrations",
    required_training_id: "",
    required_training_title: ""
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        is_enabled: settings.is_enabled !== false,
        task_title: settings.task_title || "Chemical Titrations",
        required_training_id: settings.required_training_id || "",
        required_training_title: settings.required_training_title || ""
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return TitrationSettingsRepo.update(settings.id, data);
      } else {
        return TitrationSettingsRepo.create({ ...data, organization_id: organizationId });
      }
    },
    onSuccess: () => {
      onSaved();
      toast.success("Settings saved");
    }
  });

  const handleTrainingSelect = (doc) => {
    if (doc) {
      setFormData(prev => ({ ...prev, required_training_id: doc.id, required_training_title: doc.title }));
    } else {
      setFormData(prev => ({ ...prev, required_training_id: "", required_training_title: "" }));
    }
  };

  return (
    <Card className="p-6 max-w-lg">
      <CardHeader className="p-0 pb-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-slate-600" />
          Titration Settings
        </CardTitle>
      </CardHeader>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <Label className="text-base">Enable Titration Task</Label>
            <p className="text-sm text-slate-500">Show titrations in employee task selection</p>
          </div>
          <Switch checked={formData.is_enabled} onCheckedChange={v => setFormData({...formData, is_enabled: v})} />
        </div>

        <div>
          <Label>Task Title</Label>
          <Input 
            value={formData.task_title} 
            onChange={e => setFormData({...formData, task_title: e.target.value})}
            placeholder="Chemical Titrations" 
          />
        </div>

        <div className="space-y-2">
          <Label>Required Training</Label>
          {formData.required_training_id ? (
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-900 flex-1">{formData.required_training_title}</span>
              <button type="button" onClick={() => handleTrainingSelect(null)} className="text-purple-400 hover:text-purple-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => setShowTrainingSelector(true)} className="w-full justify-start text-slate-600">
              <GraduationCap className="w-4 h-4 mr-2" />
              Link Required Training (Optional)
            </Button>
          )}
          <p className="text-xs text-slate-500">Employees will be prompted to complete this training before performing titrations</p>
        </div>

        <Button onClick={() => saveMutation.mutate(formData)} className="w-full bg-slate-900 hover:bg-slate-800" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <TrainingDocumentSelector
        open={showTrainingSelector}
        onOpenChange={setShowTrainingSelector}
        organizationId={organizationId}
        selectedId={formData.required_training_id}
        onSelect={handleTrainingSelect}
      />
    </Card>
  );
}

function AreaFormModal({ open, onClose, area, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "area",
    chemical_name: "",
    measurement_type: "ppm",
    target_min: "",
    target_max: "",
    frequency: "daily",
    description: "",
    status: "active"
  });

  useEffect(() => {
    if (area) {
      setFormData({
        name: area.name || "",
        type: area.type || "area",
        chemical_name: area.chemical_name || area.chemical_type || "",
        measurement_type: area.measurement_type || "ppm",
        target_min: area.target_min ?? area.target_ppm_min ?? "",
        target_max: area.target_max ?? area.target_ppm_max ?? "",
        frequency: area.frequency || "daily",
        description: area.description || "",
        status: area.status || "active"
      });
    } else {
      setFormData({
        name: "",
        type: "area",
        chemical_name: "",
        measurement_type: "ppm",
        target_min: "",
        target_max: "",
        frequency: "daily",
        description: "",
        status: "active"
      });
    }
  }, [area, open]);

  const handleSave = () => {
    if (!formData.name || !formData.chemical_name) {
      toast.error("Name and chemical name are required");
      return;
    }
    onSave({
      ...formData,
      target_min: formData.target_min ? Number(formData.target_min) : null,
      target_max: formData.target_max ? Number(formData.target_max) : null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{area ? "Edit" : "Add"} Titration Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Sanitizer Station 1" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="spot_check">Spot Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chemical Name *</Label>
            <Input value={formData.chemical_name} onChange={e => setFormData({ ...formData, chemical_name: e.target.value })} placeholder="e.g., Chlorine, Quat, Sanitizer" />
          </div>
          <div>
            <Label>Measurement Type</Label>
            <Select value={formData.measurement_type} onValueChange={v => setFormData({ ...formData, measurement_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ppm">PPM</SelectItem>
                <SelectItem value="oz_gal">oz/gal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min {formData.measurement_type === "oz_gal" ? "oz/gal" : "PPM"}</Label>
              <Input type="number" step="0.01" value={formData.target_min} onChange={e => setFormData({ ...formData, target_min: e.target.value })} />
            </div>
            <div>
              <Label>Max {formData.measurement_type === "oz_gal" ? "oz/gal" : "PPM"}</Label>
              <Input type="number" step="0.01" value={formData.target_max} onChange={e => setFormData({ ...formData, target_max: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Frequency</Label>
            <Select value={formData.frequency} onValueChange={v => setFormData({ ...formData, frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Instructions or notes..." />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}