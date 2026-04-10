import { useState, useMemo } from "react";

import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Bug, Plus, Search, Edit, Trash2, AlertTriangle, CheckCircle2, Building2, ChevronRight, FolderOpen, Folder
} from "lucide-react";
import { subDays } from "date-fns";
import { toast } from "sonner";
import { PestDeviceRepo } from "@/lib/adapters/database";

const DEVICE_TYPES = [
  { value: "ilt", label: "Insect Light Trap (ILT)" },
  { value: "rodent_station", label: "Rodent Station" },
  { value: "fly_light", label: "Fly Light" },
  { value: "pheromone_trap", label: "Pheromone Trap" },
  { value: "glue_board", label: "Glue Board" },
  { value: "bait_station", label: "Bait Station" },
  { value: "monitor", label: "Monitor" },
  { value: "other", label: "Other" }
];

const PEST_TYPES = [
  "rodents", "flies", "stored_product_insects", "cockroaches", "ants", "birds", "other"
];

export default function PestDeviceManager({ 
  organizationId, devices, locations, areas, productionLines, findings, onRefresh 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [filterLocation, setFilterLocation] = useState("all");
  const [formData, setFormData] = useState({
    device_code: "",
    device_type: "",
    location_id: "",
    target_pests: [],
    location_description: "",
    area_id: "",
    production_line_id: "",
    threshold_count: 10,
    threshold_severity: "medium",
    install_date: "",
    notes: ""
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const location = locations?.find(l => l.id === data.location_id);
      const area = areas.find(a => a.id === data.area_id);
      const line = productionLines.find(l => l.id === data.production_line_id);
      
      const payload = {
        ...data,
        organization_id: organizationId,
        location_name: location?.name,
        area_name: area?.name,
        production_line_name: line?.name,
        status: "active"
      };

      if (editingDevice) {
        return PestDeviceRepo.update(editingDevice.id, payload);
      }
      return PestDeviceRepo.create(payload);
    },
    onSuccess: () => {
      toast.success(editingDevice ? "Device updated" : "Device added");
      setModalOpen(false);
      resetForm();
      onRefresh();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => PestDeviceRepo.delete(id),
    onSuccess: () => {
      toast.success("Device removed");
      onRefresh();
    }
  });

  const resetForm = () => {
    setEditingDevice(null);
    setFormData({
      device_code: "",
      device_type: "",
      location_id: "",
      target_pests: [],
      location_description: "",
      area_id: "",
      production_line_id: "",
      threshold_count: 10,
      threshold_severity: "medium",
      install_date: "",
      notes: ""
    });
  };

  const openEdit = (device) => {
    setEditingDevice(device);
    setFormData({
      device_code: device.device_code || "",
      device_type: device.device_type || "",
      location_id: device.location_id || "",
      target_pests: device.target_pests || [],
      location_description: device.location_description || "",
      area_id: device.area_id || "",
      production_line_id: device.production_line_id || "",
      threshold_count: device.threshold_count || 10,
      threshold_severity: device.threshold_severity || "medium",
      install_date: device.install_date || "",
      notes: device.notes || ""
    });
    setModalOpen(true);
  };

  // Get recent findings for each device
  const deviceStats = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const stats = {};
    
    devices.forEach(device => {
      const deviceFindings = findings.filter(f => 
        f.device_id === device.id && new Date(f.service_date) >= thirtyDaysAgo
      );
      stats[device.id] = {
        recentFindings: deviceFindings.length,
        totalCount: deviceFindings.reduce((sum, f) => sum + (f.count || 0), 0),
        hasExceedance: deviceFindings.some(f => f.threshold_exceeded)
      };
    });
    
    return stats;
  }, [devices, findings]);

  // Get unique device types from actual data (for filter dropdown)
  const actualDeviceTypes = useMemo(() => {
    const types = new Set(devices.map(d => d.device_type).filter(Boolean));
    return Array.from(types);
  }, [devices]);

  const [expandedGroups, setExpandedGroups] = useState({});

  const filteredDevices = devices.filter(d => {
    const matchesSearch = 
      d.device_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.location_description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || d.device_type?.toLowerCase() === filterType.toLowerCase();
    const matchesLocation = filterLocation === "all" || d.location_id === filterLocation;
    return matchesSearch && matchesType && matchesLocation;
  });

  // Helper function to extract numeric portion for sorting
  const extractNumber = (code) => {
    const match = code?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Group devices by type and sort numerically
  const groupedDevices = useMemo(() => {
    const groups = {};
    
    filteredDevices.forEach(device => {
      const type = device.device_type || "other";
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(device);
    });

    // Sort each group numerically by device code
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => {
        const numA = extractNumber(a.device_code);
        const numB = extractNumber(b.device_code);
        if (numA !== numB) return numA - numB;
        // Fallback to alphabetical if numbers are equal
        return (a.device_code || "").localeCompare(b.device_code || "");
      });
    });

    // Sort group keys alphabetically
    const sortedGroups = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [filteredDevices]);

  const toggleGroup = (type) => {
    setExpandedGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    Object.keys(groupedDevices).forEach(type => {
      allExpanded[type] = true;
    });
    setExpandedGroups(allExpanded);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search devices..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {actualDeviceTypes.map(t => {
                const predefined = DEVICE_TYPES.find(dt => dt.value === t);
                return (
                  <SelectItem key={t} value={t}>
                    {predefined?.label || t}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {locations?.length > 0 && (
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{devices.filter(d => d.status === "active").length}</p>
            <p className="text-sm text-slate-500">Active Devices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {Object.values(deviceStats).filter(s => s.hasExceedance).length}
            </p>
            <p className="text-sm text-slate-500">With Exceedances (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {devices.filter(d => d.status === "needs_replacement").length}
            </p>
            <p className="text-sm text-slate-500">Need Replacement</p>
          </CardContent>
        </Card>
      </div>

      {/* Device List - Grouped by Type */}
      <div className="space-y-3">
        {/* Expand/Collapse All */}
        {Object.keys(groupedDevices).length > 0 && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        )}

        {Object.entries(groupedDevices).map(([type, typeDevices]) => {
          const typeLabel = DEVICE_TYPES.find(t => t.value === type)?.label || type;
          const isExpanded = expandedGroups[type];
          const hasExceedance = typeDevices.some(d => deviceStats[d.id]?.hasExceedance);

          return (
            <Card key={type} className={hasExceedance ? "border-amber-200" : ""}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(type)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        {isExpanded ? (
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Folder className="w-5 h-5 text-slate-500" />
                        )}
                        <CardTitle className="text-base">{typeLabel}</CardTitle>
                        <Badge variant="outline" className="ml-2">
                          {typeDevices.length} device{typeDevices.length !== 1 ? "s" : ""}
                        </Badge>
                        {hasExceedance && (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Has Exceedances
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {typeDevices.map(device => {
                        const stats = deviceStats[device.id] || {};

                        return (
                          <div 
                            key={device.id} 
                            className={`p-3 rounded-lg border ${stats.hasExceedance ? "border-red-200 bg-red-50" : "bg-slate-50 border-slate-200"}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Bug className="w-4 h-4 text-slate-600" />
                                <span className="font-bold text-sm">{device.device_code}</span>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(device)}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-red-600"
                                  onClick={() => {
                                    if (confirm("Delete this device?")) deleteMutation.mutate(device.id);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            {device.location_name && (
                              <Badge className="bg-slate-100 text-slate-700 text-xs mb-1">
                                <Building2 className="w-3 h-3 mr-1" />
                                {device.location_name}
                              </Badge>
                            )}

                            <p className="text-xs text-slate-600 mb-2">
                              {device.location_description || device.area_name || "No location"}
                            </p>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">30d: {stats.recentFindings || 0} findings</span>
                              {stats.hasExceedance ? (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Exceedance
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                                  <CheckCircle2 className="w-3 h-3" />
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {Object.keys(groupedDevices).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bug className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No devices found</p>
            <Button className="mt-4" onClick={() => { resetForm(); setModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Device
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDevice ? "Edit Device" : "Add Device"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {locations?.length > 0 && (
              <div>
                <Label>Location / Building *</Label>
                <Select 
                  value={formData.location_id}
                  onValueChange={(v) => setFormData({...formData, location_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Device Code *</Label>
                <Input 
                  value={formData.device_code}
                  onChange={(e) => setFormData({...formData, device_code: e.target.value})}
                  placeholder="e.g., ILT-001"
                />
              </div>
              <div>
                <Label>Device Type *</Label>
                <Select 
                  value={formData.device_type}
                  onValueChange={(v) => setFormData({...formData, device_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Target Pests</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PEST_TYPES.map(pest => (
                  <Badge 
                    key={pest}
                    variant={formData.target_pests.includes(pest) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const pests = formData.target_pests.includes(pest)
                        ? formData.target_pests.filter(p => p !== pest)
                        : [...formData.target_pests, pest];
                      setFormData({...formData, target_pests: pests});
                    }}
                  >
                    {pest.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Location Description</Label>
              <Input 
                value={formData.location_description}
                onChange={(e) => setFormData({...formData, location_description: e.target.value})}
                placeholder="e.g., Near receiving dock door 3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Area</Label>
                <Select 
                  value={formData.area_id}
                  onValueChange={(v) => setFormData({...formData, area_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Production Line</Label>
                <Select 
                  value={formData.production_line_id}
                  onValueChange={(v) => setFormData({...formData, production_line_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select line" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Alert Threshold Count</Label>
                <Input 
                  type="number"
                  value={formData.threshold_count}
                  onChange={(e) => setFormData({...formData, threshold_count: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Install Date</Label>
                <Input 
                  type="date"
                  value={formData.install_date}
                  onChange={(e) => setFormData({...formData, install_date: e.target.value})}
                />
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
                disabled={!formData.device_code || !formData.device_type || saveMutation.isPending}
                onClick={() => saveMutation.mutate(formData)}
              >
                {editingDevice ? "Update" : "Add"} Device
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}