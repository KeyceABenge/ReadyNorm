import { useState, useRef, useMemo } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Upload, ZoomIn, ZoomOut, RotateCcw, Bug, AlertTriangle, 
  Plus, Loader2, Calendar, Filter, X, MapPin
} from "lucide-react";
import { format, parseISO, isWithinInterval, subDays } from "date-fns";
import PestMapExportButton from "./PestMapExportButton";
import { toast } from "sonner";

const PEST_CATEGORIES = [
  { id: "flies", label: "Flies / ILTs", icon: "🪰", color: "blue" },
  { id: "rodents", label: "Rodents", icon: "🐀", color: "amber" },
  { id: "cockroaches", label: "Cockroaches", icon: "🪳", color: "orange" },
  { id: "stored_product_insects", label: "Stored Product Insects", icon: "🐛", color: "purple" },
  { id: "ants", label: "Ants", icon: "🐜", color: "red" },
  { id: "birds", label: "Birds", icon: "🐦", color: "sky" },
  { id: "other", label: "Other", icon: "🔍", color: "slate" }
];

const SEVERITY_COLORS = {
  warning: "bg-amber-500",
  critical: "bg-red-500"
};

export default function PestMapsTab({ organizationId, mapImageUrl, onRefresh, organizationName }) {
  const [activeCategory, setActiveCategory] = useState("flies");
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [addingMarker, setAddingMarker] = useState(false);
  const [pendingPosition, setPendingPosition] = useState(null);
  const [markerModalOpen, setMarkerModalOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [quickFilter, setQuickFilter] = useState("30");
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const [newMarker, setNewMarker] = useState({
    device_code: "",
    device_type: "",
    pest_species: "",
    count: 0,
    severity: "warning",
    escalation_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    // Cockroach-specific fields
    area_description: "",
    reported_by: "",
    was_cleaned: false,
    was_sanitized: false,
    was_alive: true
  });

  // Fetch escalation markers
  const { data: markers = [] } = useQuery({
    queryKey: ["pest_escalation_markers", organizationId],
    queryFn: () => PestEscalationMarkerRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Filter markers by category and date
  const filteredMarkers = useMemo(() => {
    let filtered = markers.filter(m => m.pest_category === activeCategory);
    
    // Apply date filter
    if (quickFilter && quickFilter !== "all") {
      const days = parseInt(quickFilter);
      const startDate = subDays(new Date(), days);
      filtered = filtered.filter(m => {
        const markerDate = parseISO(m.escalation_date);
        return markerDate >= startDate;
      });
    } else if (dateFilter.start && dateFilter.end) {
      filtered = filtered.filter(m => {
        const markerDate = parseISO(m.escalation_date);
        return isWithinInterval(markerDate, {
          start: parseISO(dateFilter.start),
          end: parseISO(dateFilter.end)
        });
      });
    }
    
    return filtered;
  }, [markers, activeCategory, dateFilter, quickFilter]);

  const handleUploadMap = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      
      await FacilityMapRepo.create({
        organization_id: organizationId,
        name: "Pest Control Facility Map",
        image_url: file_url,
        is_default: true,
        status: "active"
      });

      toast.success("Map uploaded successfully");
      onRefresh();
    } catch (error) {
      toast.error("Failed to upload map");
    }
    setUploading(false);
  };

  const handleMapClick = (e) => {
    if (!addingMarker || !imageRef.current) return;

    const imgRect = imageRef.current.getBoundingClientRect();
    // Calculate position relative to image, accounting for scale
    const x = ((e.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - imgRect.top) / imgRect.height) * 100;

    // Ensure coordinates are within bounds
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    console.log("Marker position:", { x, y });
    setPendingPosition({ x, y });
    setMarkerModalOpen(true);
  };

  const createMarkerMutation = useMutation({
    mutationFn: async (data) => {
      // For cockroaches and rodents, severity is always critical
      const severity = (activeCategory === "cockroaches" || activeCategory === "rodents") 
        ? "critical" 
        : data.severity;
      
      await PestEscalationMarkerRepo.create({
        organization_id: organizationId,
        pest_category: activeCategory,
        map_position_x: pendingPosition.x,
        map_position_y: pendingPosition.y,
        ...data,
        severity
      });
    },
    onSuccess: () => {
      toast.success("Escalation marker added");
      setMarkerModalOpen(false);
      setAddingMarker(false);
      setPendingPosition(null);
      setNewMarker({
        device_code: "",
        device_type: "",
        pest_species: "",
        count: 0,
        severity: "warning",
        escalation_date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
        area_description: "",
        reported_by: "",
        was_cleaned: false,
        was_sanitized: false,
        was_alive: true
      });
      queryClient.invalidateQueries(["pest_escalation_markers"]);
    },
    onError: () => toast.error("Failed to add marker")
  });

  const deleteMarkerMutation = useMutation({
    mutationFn: async (markerId) => {
      await PestEscalationMarkerRepo.delete(markerId);
    },
    onSuccess: () => {
      toast.success("Marker removed");
      setSelectedMarker(null);
      queryClient.invalidateQueries(["pest_escalation_markers"]);
    }
  });

  const handleMouseDown = (e) => {
    if (addingMarker) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);
  const resetView = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const activeCategoryInfo = PEST_CATEGORIES.find(c => c.id === activeCategory);

  if (!mapImageUrl) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bug className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Facility Map</h3>
          <p className="text-slate-500 mb-4">Upload a facility map to track escalation locations</p>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*"
            onChange={handleUploadMap}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Upload Map</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pest Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          {PEST_CATEGORIES.map(cat => (
            <TabsTrigger 
              key={cat.id} 
              value={cat.id}
              className="flex items-center gap-1.5 data-[state=active]:bg-white"
            >
              <span>{cat.icon}</span>
              <span className="hidden sm:inline">{cat.label}</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {markers.filter(m => m.pest_category === cat.id).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(s + 0.2, 3))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetView}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          <Select value={quickFilter} onValueChange={(v) => { setQuickFilter(v); setDateFilter({ start: "", end: "" }); }}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-slate-400">or</span>
          <Input
            type="date"
            value={dateFilter.start}
            onChange={(e) => { setDateFilter(d => ({ ...d, start: e.target.value })); setQuickFilter(""); }}
            className="w-36 h-8"
          />
          <span className="text-slate-400">to</span>
          <Input
            type="date"
            value={dateFilter.end}
            onChange={(e) => { setDateFilter(d => ({ ...d, end: e.target.value })); setQuickFilter(""); }}
            className="w-36 h-8"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            variant={addingMarker ? "default" : "outline"} 
            size="sm"
            onClick={() => setAddingMarker(!addingMarker)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {addingMarker ? "Click Map to Add" : "Add Escalation"}
          </Button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*"
            onChange={handleUploadMap}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                <Upload className="w-4 h-4 mr-1" />
                Replace Map
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Replace Facility Map?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Replacing the map may cause existing escalation markers to appear in incorrect positions if the new map has a different layout or dimensions. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace Map
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <PestMapExportButton
            mapImageUrl={mapImageUrl}
            markers={filteredMarkers}
            activeCategory={activeCategory}
            organizationName={organizationName}
            dateRangeLabel={
              quickFilter && quickFilter !== "all" 
                ? `Last ${quickFilter} days` 
                : dateFilter.start && dateFilter.end 
                  ? `${dateFilter.start} to ${dateFilter.end}` 
                  : "All time"
            }
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">{activeCategoryInfo?.icon}</span>
          <span className="font-medium">{activeCategoryInfo?.label} Escalations</span>
        </div>
        {activeCategory !== "cockroaches" && activeCategory !== "rodents" && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span>Critical</span>
            </div>
          </>
        )}
        <Badge variant="outline">{filteredMarkers.length} escalation(s) shown</Badge>
      </div>

      {/* Map Container */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={containerRef}
            className="relative overflow-hidden bg-slate-100 h-[500px]"
            style={{ cursor: addingMarker ? "crosshair" : isDragging ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleMapClick}
          >
            <div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: "0 0",
                transition: isDragging ? "none" : "transform 0.1s"
              }}
              className="relative inline-block"
            >
              <img 
                ref={imageRef}
                src={mapImageUrl} 
                alt="Facility Map" 
                className="block"
                draggable={false}
              />

              {/* Escalation Markers - positioned absolutely over image */}
              {filteredMarkers.map(marker => (
                <div
                  key={marker.id}
                  className={`absolute cursor-pointer transition-transform hover:scale-110 ${
                    selectedMarker?.id === marker.id ? "z-20" : "z-10"
                  }`}
                  style={{
                    left: `${marker.map_position_x}%`,
                    top: `${marker.map_position_y}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMarker(selectedMarker?.id === marker.id ? null : marker);
                  }}
                >
                  <div className={`w-4 h-4 rounded-full ${SEVERITY_COLORS[marker.severity]} flex items-center justify-center text-white shadow-lg border border-white`}>
                    <MapPin className="w-2 h-2" />
                  </div>

                  {/* Info Popup */}
                  {selectedMarker?.id === marker.id && (
                    <div 
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 bg-white rounded-md shadow-lg border p-2 z-30 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs">{marker.device_code || "Escalation"}</span>
                        <Badge className={`text-[10px] px-1 py-0 ${marker.severity === "critical" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                          {marker.severity}
                        </Badge>
                      </div>
                      <div className="space-y-0.5 text-[10px] text-slate-600">
                        <p><Calendar className="w-2.5 h-2.5 inline mr-0.5" />{format(parseISO(marker.escalation_date), "MMM d, yyyy")}</p>
                        {marker.area_description && <p className="truncate"><strong>Area:</strong> {marker.area_description}</p>}
                        {marker.reported_by && <p><strong>By:</strong> {marker.reported_by}</p>}
                        {marker.pest_species && <p><strong>Species:</strong> {marker.pest_species}</p>}
                        {marker.count > 0 && <p><strong>Count:</strong> {marker.count}</p>}
                        {marker.was_alive !== undefined && <p><strong>Status:</strong> {marker.was_alive ? "Alive" : "Dead"}</p>}
                        {(marker.was_cleaned || marker.was_sanitized) && (
                          <div className="flex gap-1">
                            {marker.was_cleaned && <Badge variant="outline" className="text-[9px] px-1 py-0">Cleaned</Badge>}
                            {marker.was_sanitized && <Badge variant="outline" className="text-[9px] px-1 py-0">Sanitized</Badge>}
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full mt-1.5 h-6 text-[10px]"
                        onClick={() => deleteMarkerMutation.mutate(marker.id)}
                      >
                        <X className="w-2.5 h-2.5 mr-0.5" /> Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className={`grid gap-4 ${activeCategory === "cockroaches" || activeCategory === "rodents" ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{filteredMarkers.length}</p>
            <p className="text-sm text-slate-500">Total Escalations</p>
          </CardContent>
        </Card>
        {activeCategory !== "cockroaches" && activeCategory !== "rodents" && (
          <>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {filteredMarkers.filter(m => m.severity === "warning").length}
                </p>
                <p className="text-sm text-slate-500">Warnings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {filteredMarkers.filter(m => m.severity === "critical").length}
                </p>
                <p className="text-sm text-slate-500">Critical</p>
              </CardContent>
            </Card>
          </>
        )}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-600">
              {markers.filter(m => m.pest_category === activeCategory).length}
            </p>
            <p className="text-sm text-slate-500">All Time ({activeCategoryInfo?.label})</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Marker Modal */}
      <Dialog open={markerModalOpen} onOpenChange={(open) => { 
        setMarkerModalOpen(open); 
        if (!open) { setAddingMarker(false); setPendingPosition(null); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{activeCategoryInfo?.icon}</span>
              Add {activeCategoryInfo?.label} Escalation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Cockroach-specific fields */}
            {activeCategory === "cockroaches" ? (
              <>
                <div>
                  <Label>Area Description *</Label>
                  <Input
                    value={newMarker.area_description}
                    onChange={(e) => setNewMarker(m => ({ ...m, area_description: e.target.value }))}
                    placeholder="e.g., Near drain by Line 3, under equipment"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Reported By *</Label>
                    <Input
                      value={newMarker.reported_by}
                      onChange={(e) => setNewMarker(m => ({ ...m, reported_by: e.target.value }))}
                      placeholder="Employee name"
                    />
                  </div>
                  <div>
                    <Label>Count</Label>
                    <Input
                      type="number"
                      value={newMarker.count}
                      onChange={(e) => setNewMarker(m => ({ ...m, count: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Escalation Date *</Label>
                    <Input
                      type="date"
                      value={newMarker.escalation_date}
                      onChange={(e) => setNewMarker(m => ({ ...m, escalation_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <div className="h-9 px-3 py-2 border rounded-md bg-slate-50 text-sm text-slate-700 flex items-center">
                      <Badge className="bg-red-100 text-red-800">Critical</Badge>
                      <span className="ml-2 text-xs text-slate-500">(always critical)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Condition</Label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="alive_status"
                        checked={newMarker.was_alive === true}
                        onChange={() => setNewMarker(m => ({ ...m, was_alive: true }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Alive</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="alive_status"
                        checked={newMarker.was_alive === false}
                        onChange={() => setNewMarker(m => ({ ...m, was_alive: false }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Dead</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMarker.was_cleaned}
                      onChange={(e) => setNewMarker(m => ({ ...m, was_cleaned: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm">Area was cleaned</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMarker.was_sanitized}
                      onChange={(e) => setNewMarker(m => ({ ...m, was_sanitized: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm">Area was sanitized</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Device Code (optional)</Label>
                    <Input
                      value={newMarker.device_code}
                      onChange={(e) => setNewMarker(m => ({ ...m, device_code: e.target.value }))}
                      placeholder="If found near a device"
                    />
                  </div>
                  <div>
                    <Label>Pest Species</Label>
                    <Input
                      value={newMarker.pest_species}
                      onChange={(e) => setNewMarker(m => ({ ...m, pest_species: e.target.value }))}
                      placeholder="e.g., German Cockroach"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Device Code</Label>
                    <Input
                      value={newMarker.device_code}
                      onChange={(e) => setNewMarker(m => ({ ...m, device_code: e.target.value }))}
                      placeholder="e.g., ILT-5"
                    />
                  </div>
                  <div>
                    <Label>Device Type</Label>
                    <Input
                      value={newMarker.device_type}
                      onChange={(e) => setNewMarker(m => ({ ...m, device_type: e.target.value }))}
                      placeholder="e.g., Insect Light Trap"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Escalation Date *</Label>
                    <Input
                      type="date"
                      value={newMarker.escalation_date}
                      onChange={(e) => setNewMarker(m => ({ ...m, escalation_date: e.target.value }))}
                    />
                  </div>
                  {(activeCategory === "cockroaches" || activeCategory === "rodents") ? (
                    <div>
                      <Label>Severity</Label>
                      <div className="h-9 px-3 py-2 border rounded-md bg-slate-50 text-sm text-slate-700 flex items-center">
                        <Badge className="bg-red-100 text-red-800">Critical</Badge>
                        <span className="ml-2 text-xs text-slate-500">(always critical)</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label>Severity *</Label>
                      <Select 
                        value={newMarker.severity} 
                        onValueChange={(v) => setNewMarker(m => ({ ...m, severity: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Pest Species</Label>
                    <Input
                      value={newMarker.pest_species}
                      onChange={(e) => setNewMarker(m => ({ ...m, pest_species: e.target.value }))}
                      placeholder="e.g., Small Fly"
                    />
                  </div>
                  <div>
                    <Label>Count</Label>
                    <Input
                      type="number"
                      value={newMarker.count}
                      onChange={(e) => setNewMarker(m => ({ ...m, count: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newMarker.notes}
                onChange={(e) => setNewMarker(m => ({ ...m, notes: e.target.value }))}
                placeholder="Additional details about this escalation..."
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => createMarkerMutation.mutate(newMarker)}
              disabled={!newMarker.escalation_date || (activeCategory === "cockroaches" && (!newMarker.area_description || !newMarker.reported_by)) || createMarkerMutation.isPending}
            >
              {createMarkerMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Add Escalation Marker</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}