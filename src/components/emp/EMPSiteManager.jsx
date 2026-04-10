import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit2, Trash2, Camera, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { EMPSiteRepo } from "@/lib/adapters/database";

const ZONE_OPTIONS = [
  { value: "zone_1", label: "Zone 1 - Product Contact", color: "#ef4444" },
  { value: "zone_2", label: "Zone 2 - Near Product", color: "#f97316" },
  { value: "zone_3", label: "Zone 3 - Non-Product", color: "#eab308" },
  { value: "zone_4", label: "Zone 4 - Outside", color: "#22c55e" }
];

const SURFACE_TYPES = [
  "stainless_steel", "plastic", "rubber", "concrete", "tile", 
  "drain", "floor", "wall", "ceiling", "equipment", "conveyor", "other"
];

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

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi_weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "event_based", label: "Event-Based" }
];

export default function EMPSiteManager({ sites, samples, areas, productionLines, drains, facilityMaps, organizationId, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterZone, setFilterZone] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({});

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => EMPSiteRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp_sites"] });
      setModalOpen(false);
      setEditingSite(null);
      setFormData({});
      toast.success("Site created successfully");
      onRefresh?.();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => EMPSiteRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp_sites"] });
      setModalOpen(false);
      setEditingSite(null);
      setFormData({});
      toast.success("Site updated successfully");
      onRefresh?.();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => EMPSiteRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp_sites"] });
      toast.success("Site deleted");
      onRefresh?.();
    }
  });

  const handleOpenModal = (site = null) => {
    if (site) {
      setEditingSite(site);
      setFormData(site);
    } else {
      setEditingSite(null);
      setFormData({
        organization_id: organizationId,
        site_code: `ENV-${String(sites.length + 1).padStart(3, "0")}`,
        zone_classification: "zone_2",
        surface_type: "stainless_steel",
        sampling_frequency: "weekly",
        risk_level: "medium",
        targeted_tests: ["listeria_spp", "apc"],
        status: "active"
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.site_code) {
      toast.error("Please fill in required fields");
      return;
    }

    if (editingSite) {
      updateMutation.mutate({ id: editingSite.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { file_url } = await uploadFile({ file });
    setFormData({ ...formData, photo_url: file_url });
  };

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.site_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = filterZone === "all" || site.zone_classification === filterZone;
    const matchesStatus = filterStatus === "all" || site.status === filterStatus;
    return matchesSearch && matchesZone && matchesStatus;
  });

  // Group by zone
  const sitesByZone = ZONE_OPTIONS.reduce((acc, zone) => {
    acc[zone.value] = filteredSites.filter(s => s.zone_classification === zone.value);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterZone} onValueChange={setFilterZone}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {ZONE_OPTIONS.map(z => (
                <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Site
        </Button>
      </div>

      {/* Sites by Zone */}
      {ZONE_OPTIONS.map(zone => {
        const zoneSites = sitesByZone[zone.value];
        if (zoneSites.length === 0 && filterZone !== "all" && filterZone !== zone.value) return null;

        return (
          <Card key={zone.value}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                {zone.label}
                <Badge variant="secondary">{zoneSites.length} sites</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {zoneSites.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No sites in this zone</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {zoneSites.map(site => {
                    const siteSamples = samples.filter(s => s.site_id === site.id);
                    const recentPositive = siteSamples.find(s => s.overall_result === "fail");

                    return (
                      <div key={site.id} className="border rounded-lg p-4 hover:border-slate-300 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{site.site_code}</span>
                              {site.status === "inactive" && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600">{site.name}</p>
                          </div>
                          {site.photo_url && (
                            <img src={site.photo_url} alt="" className="w-12 h-12 rounded object-cover" />
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-slate-500 mb-3">
                          <p>Surface: {site.surface_type?.replace(/_/g, " ")}</p>
                          <p>Frequency: {site.sampling_frequency?.replace(/_/g, " ")}</p>
                          <p>Tests: {site.targeted_tests?.map(t => t.replace(/_/g, " ")).join(", ") || "None"}</p>
                          {site.last_sampled_date && (
                            <p>Last sampled: {format(parseISO(site.last_sampled_date), "MMM d, yyyy")}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {site.total_positives_ytd > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {site.total_positives_ytd} YTD
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-600 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Clean
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenModal(site)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-rose-500 hover:text-rose-600"
                              onClick={() => {
                                if (confirm("Delete this site?")) {
                                  deleteMutation.mutate(site.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSite ? "Edit Site" : "Add New Sampling Site"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Site Code *</Label>
                <Input
                  value={formData.site_code || ""}
                  onChange={(e) => setFormData({ ...formData, site_code: e.target.value })}
                  placeholder="ENV-001"
                />
              </div>
              <div>
                <Label>Zone Classification *</Label>
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
            </div>

            <div>
              <Label>Site Name *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Filler #3 - Discharge Chute"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed location description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Surface Type</Label>
                <Select value={formData.surface_type} onValueChange={(v) => setFormData({ ...formData, surface_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SURFACE_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sampling Frequency</Label>
                <Select value={formData.sampling_frequency} onValueChange={(v) => setFormData({ ...formData, sampling_frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Area</Label>
                <Select value={formData.area_id || ""} onValueChange={(v) => {
                  const area = areas.find(a => a.id === v);
                  setFormData({ ...formData, area_id: v, area_name: area?.name });
                }}>
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
                <Select value={formData.production_line_id || ""} onValueChange={(v) => {
                  const line = productionLines.find(l => l.id === v);
                  setFormData({ ...formData, production_line_id: v, production_line_name: line?.name });
                }}>
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

            <div>
              <Label>Targeted Tests</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TEST_TYPES.map(test => (
                  <Badge
                    key={test.value}
                    variant={formData.targeted_tests?.includes(test.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = formData.targeted_tests || [];
                      const updated = current.includes(test.value)
                        ? current.filter(t => t !== test.value)
                        : [...current, test.value];
                      setFormData({ ...formData, targeted_tests: updated });
                    }}
                  >
                    {test.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Risk Level</Label>
                <Select value={formData.risk_level} onValueChange={(v) => setFormData({ ...formData, risk_level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Site Photo</Label>
              <div className="flex items-center gap-4 mt-2">
                {formData.photo_url && (
                  <img src={formData.photo_url} alt="" className="w-24 h-24 rounded object-cover" />
                )}
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50">
                    <Camera className="w-4 h-4" />
                    <span className="text-sm">Upload Photo</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingSite ? "Update Site" : "Create Site"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}