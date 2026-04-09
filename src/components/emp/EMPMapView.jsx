import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, Layers, AlertTriangle, CheckCircle2, Upload, Plus, Loader2 } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const ZONE_COLORS = {
  zone_1: "#ef4444",
  zone_2: "#f97316",
  zone_3: "#eab308",
  zone_4: "#22c55e"
};

const STATUS_COLORS = {
  clean: "#22c55e",
  warning: "#eab308",
  critical: "#ef4444"
};

export default function EMPMapView({ sites, samples, facilityMaps, areas, drains, organizationId }) {
  const [selectedMap, setSelectedMap] = useState(facilityMaps[0]?.id || null);
  const [zoom, setZoom] = useState(1);
  const [selectedSite, setSelectedSite] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showDrains, setShowDrains] = useState(true);
  const [filterZone, setFilterZone] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [showAddMapModal, setShowAddMapModal] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();
  const currentMap = facilityMaps.find(m => m.id === selectedMap);

  const createMapMutation = useMutation({
    mutationFn: (data) => FacilityMapRepo.create(data),
    onSuccess: (newMap) => {
      queryClient.invalidateQueries({ queryKey: ["facility_maps"] });
      setSelectedMap(newMap.id);
      setShowAddMapModal(false);
      setNewMapName("");
    }
  });

  const handleMapUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !newMapName.trim()) return;

    setUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      await createMapMutation.mutateAsync({
        organization_id: organizationId,
        name: newMapName.trim(),
        image_url: file_url,
        status: "active"
      });
    } catch (err) {
      console.error("Failed to upload map:", err);
    } finally {
      setUploading(false);
    }
  };
  const cutoffDate = subDays(new Date(), parseInt(dateRange));

  // Calculate site status based on recent samples
  const siteStatuses = useMemo(() => {
    const statuses = {};
    sites.forEach(site => {
      const recentSamples = samples.filter(s => 
        s.site_id === site.id && 
        new Date(s.collection_date) >= cutoffDate
      );
      
      const hasPositive = recentSamples.some(s => s.overall_result === "fail");
      const hasCritical = recentSamples.some(s => s.severity === "critical" || s.severity === "major");
      
      if (hasCritical) {
        statuses[site.id] = "critical";
      } else if (hasPositive) {
        statuses[site.id] = "warning";
      } else {
        statuses[site.id] = "clean";
      }
    });
    return statuses;
  }, [sites, samples, cutoffDate]);

  // Filter sites for display
  const displaySites = useMemo(() => {
    return sites.filter(site => {
      const matchesZone = filterZone === "all" || site.zone_classification === filterZone;
      const hasPosition = site.map_position_x != null && site.map_position_y != null;
      return matchesZone && hasPosition && site.status === "active";
    });
  }, [sites, filterZone]);

  // Get recent samples for selected site
  const selectedSiteSamples = useMemo(() => {
    if (!selectedSite) return [];
    return samples
      .filter(s => s.site_id === selectedSite.id)
      .sort((a, b) => new Date(b.collection_date) - new Date(a.collection_date))
      .slice(0, 5);
  }, [selectedSite, samples]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Select value={selectedMap || ""} onValueChange={setSelectedMap}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select map" />
            </SelectTrigger>
            <SelectContent>
              {facilityMaps.map(map => (
                <SelectItem key={map.id} value={map.id}>{map.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setShowAddMapModal(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <Select value={filterZone} onValueChange={setFilterZone}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="zone_1">Zone 1</SelectItem>
            <SelectItem value="zone_2">Zone 2</SelectItem>
            <SelectItem value="zone_3">Zone 3</SelectItem>
            <SelectItem value="zone_4">Zone 4</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch checked={showHeatmap} onCheckedChange={setShowHeatmap} id="heatmap" />
          <Label htmlFor="heatmap" className="text-sm">Status colors</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={showDrains} onCheckedChange={setShowDrains} id="drains" />
          <Label htmlFor="drains" className="text-sm">Show drains</Label>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetZoom}>
            {Math.round(zoom * 100)}%
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-slate-500">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Clean</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Warning</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span>Critical</span>
        </div>
        <span className="text-slate-300">|</span>
        {Object.entries(ZONE_COLORS).map(([zone, color]) => (
          <div key={zone} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2" style={{ borderColor: color }} />
            <span>{zone.replace("_", " ").toUpperCase()}</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              {currentMap?.image_url ? (
                <div className="relative overflow-auto border rounded-lg bg-slate-100" style={{ maxHeight: "600px" }}>
                  <div 
                    className="relative transition-transform duration-200"
                    style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                  >
                    <img 
                      src={currentMap.image_url} 
                      alt={currentMap.name}
                      className="max-w-none"
                    />
                    
                    {/* Site markers */}
                    {displaySites.map(site => {
                      const status = siteStatuses[site.id] || "clean";
                      const isSelected = selectedSite?.id === site.id;
                      
                      return (
                        <button
                          key={site.id}
                          className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${isSelected ? "scale-150 z-20" : "hover:scale-125 z-10"}`}
                          style={{
                            left: `${site.map_position_x}%`,
                            top: `${site.map_position_y}%`
                          }}
                          onClick={() => setSelectedSite(site)}
                        >
                          <div 
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shadow-lg ${isSelected ? "ring-4 ring-blue-300" : ""}`}
                            style={{
                              backgroundColor: showHeatmap ? STATUS_COLORS[status] : ZONE_COLORS[site.zone_classification],
                              borderColor: ZONE_COLORS[site.zone_classification]
                            }}
                          >
                            {site.site_code?.split("-")[1] || "•"}
                          </div>
                        </button>
                      );
                    })}

                    {/* Drain markers */}
                    {showDrains && drains.filter(d => d.map_position_x && d.map_position_y).map(drain => (
                      <div
                        key={drain.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${drain.map_position_x}%`,
                          top: `${drain.map_position_y}%`
                        }}
                      >
                        <div className="w-4 h-4 rounded bg-blue-500 opacity-50" title={drain.code} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center bg-slate-100 rounded-lg">
                  <div className="text-center text-slate-400">
                    <Layers className="w-12 h-12 mx-auto mb-2" />
                    <p>No facility map uploaded</p>
                    <Button 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => setShowAddMapModal(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Map
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Site Details */}
        <div className="space-y-4">
          {selectedSite ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{selectedSite.site_code}</span>
                    <Badge style={{ backgroundColor: ZONE_COLORS[selectedSite.zone_classification] + "20", color: ZONE_COLORS[selectedSite.zone_classification] }}>
                      {selectedSite.zone_classification?.replace("_", " ").toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-slate-900 mb-2">{selectedSite.name}</p>
                  {selectedSite.description && (
                    <p className="text-sm text-slate-600 mb-3">{selectedSite.description}</p>
                  )}
                  
                  {selectedSite.photo_url && (
                    <img src={selectedSite.photo_url} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500">Surface</p>
                      <p className="font-medium">{selectedSite.surface_type?.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Frequency</p>
                      <p className="font-medium">{selectedSite.sampling_frequency?.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">YTD Positives</p>
                      <p className="font-medium">{selectedSite.total_positives_ytd || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Consecutive Neg</p>
                      <p className="font-medium">{selectedSite.consecutive_negatives || 0}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-slate-500 text-sm mb-1">Tests</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSite.targeted_tests?.map(t => (
                        <Badge key={t} variant="outline" className="text-xs">{t.replace(/_/g, " ")}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Samples</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSiteSamples.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No samples recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSiteSamples.map(sample => (
                        <div key={sample.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{format(parseISO(sample.collection_date), "MMM d, yyyy")}</p>
                            <p className="text-xs text-slate-500">{sample.collection_method}</p>
                          </div>
                          {sample.overall_result === "fail" ? (
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                          ) : sample.overall_result === "pass" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Badge variant="secondary" className="text-xs">{sample.status}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-400">Click a site marker to view details</p>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Map Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Sites Shown</span>
                  <span className="font-medium">{displaySites.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Clean</span>
                  <span className="font-medium text-emerald-600">
                    {displaySites.filter(s => siteStatuses[s.id] === "clean").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Warning</span>
                  <span className="font-medium text-amber-600">
                    {displaySites.filter(s => siteStatuses[s.id] === "warning").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Critical</span>
                  <span className="font-medium text-rose-600">
                    {displaySites.filter(s => siteStatuses[s.id] === "critical").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Map Modal */}
      <Dialog open={showAddMapModal} onOpenChange={setShowAddMapModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Facility Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Map Name</Label>
              <Input 
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="e.g., Main Production Floor"
              />
            </div>
            <div>
              <Label>Map Image</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMapUpload}
                  disabled={!newMapName.trim() || uploading}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                />
              </div>
              {!newMapName.trim() && (
                <p className="text-xs text-slate-500 mt-1">Enter a map name first</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMapModal(false)}>
              Cancel
            </Button>
            {uploading && (
              <Button disabled>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}