// @ts-nocheck
import { useState, useEffect } from "react";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import { uploadFile } from "@/lib/adapters/storage";
import {
  OrganizationRepo, DrainLocationRepo, DrainFacilityMapRepo,
  DrainCleaningRecordRepo, AreaRepo, DrainCleaningSettingsRepo
} from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Droplet, MapPin, Plus, Loader2, Settings, History, Upload,
  Trash2, Edit, CheckCircle2, AlertTriangle, ArrowLeft, Image,
  ZoomIn, ZoomOut, Maximize2, Lock, GraduationCap, X
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format, parseISO, addDays, addWeeks, addMonths, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TrainingDocumentSelector from "@/components/modals/TrainingDocumentSelector";
import DrainIssuesPanel from "@/components/drains/DrainIssuesPanel";

export default function DrainManagementPage() {
  const [user, setUser] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [activeTab, setActiveTab] = useState("map");
  const [drainFormOpen, setDrainFormOpen] = useState(false);
  const [editingDrain, setEditingDrain] = useState(null);
  const [placingMarker, setPlacingMarker] = useState(false);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await isAuthenticated();
        if (isAuth) {
          const userData = await getCurrentUser();
          setUser(userData);
          
          // CRITICAL: Get organization_id ONLY from site_code in localStorage
          const storedSiteCode = localStorage.getItem('site_code');
          if (!storedSiteCode) {
            window.location.href = createPageUrl("Home");
            return;
          }
          
          const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
          if (orgs.length > 0) {
            setOrganizationId(orgs[0].id);
          } else {
            localStorage.removeItem('site_code');
            window.location.href = createPageUrl("Home");
          }
        }
      } catch (e) {
        console.error("Auth error:", e);
      }
    };
    loadUser();
  }, []);

  const { data: drains = [], isLoading: drainsLoading } = useQuery({
    queryKey: ["drain_locations", organizationId],
    queryFn: () => DrainLocationRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: facilityMaps = [] } = useQuery({
    queryKey: ["drain_facility_maps", organizationId],
    queryFn: () => DrainFacilityMapRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: cleaningRecords = [] } = useQuery({
    queryKey: ["drain_cleaning_records", organizationId],
    queryFn: () => DrainCleaningRecordRepo.filter({ organization_id: organizationId }, "-cleaned_at", 100),
    enabled: !!organizationId
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas", organizationId],
    queryFn: () => AreaRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: drainCleaningSettings = [] } = useQuery({
    queryKey: ["drain_cleaning_settings", organizationId],
    queryFn: () => DrainCleaningSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const defaultMap = facilityMaps.find(m => m.is_default) || facilityMaps[0];
  const currentSettings = drainCleaningSettings[0];
  const activeDrains = drains.filter(d => d.status === "active");

  const createDrainMutation = useMutation({
    mutationFn: (data) => DrainLocationRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drain_locations"] });
      setDrainFormOpen(false);
      setEditingDrain(null);
      setMarkerPosition(null);
      toast.success("Drain added successfully");
    }
  });

  const updateDrainMutation = useMutation({
    mutationFn: ({ id, data }) => DrainLocationRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drain_locations"] });
      setDrainFormOpen(false);
      setEditingDrain(null);
      toast.success("Drain updated successfully");
    }
  });

  const deleteDrainMutation = useMutation({
    mutationFn: (id) => DrainLocationRepo.update(id, { status: "inactive" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drain_locations"] });
      toast.success("Drain deactivated");
    }
  });

  const handleMapClick = (e) => {
    if (isDragging) return;
    if (!placingMarker) return;
    
    const mapContainer = e.currentTarget.querySelector('img');
    if (!mapContainer) return;
    
    const rect = mapContainer.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarkerPosition({ x, y });
    setPlacingMarker(false);
    setDrainFormOpen(true);
  };

  const handleMapMouseDown = (e) => {
    if (mapZoom <= 1 || placingMarker) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - mapPosition.x, y: e.clientY - mapPosition.y });
  };

  const handleMapMouseMove = (e) => {
    if (!isDragging) return;
    setMapPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMapMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setMapPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleResetZoom = () => {
    setMapZoom(1);
    setMapPosition({ x: 0, y: 0 });
  };

  const handleUploadMap = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingMap(true);
    try {
      const { file_url } = await uploadFile(file);
      await DrainFacilityMapRepo.create({
        organization_id: organizationId,
        name: file.name,
        image_url: file_url,
        is_default: facilityMaps.length === 0
      });
      queryClient.invalidateQueries({ queryKey: ["drain_facility_maps"] });
      toast.success("Map uploaded successfully");
    } catch (err) {
      toast.error("Failed to upload map");
    }
    setUploadingMap(false);
  };

  const handleSaveDrain = (formData) => {
    // Check for duplicate drain_id (excluding current drain if editing)
    const duplicateDrain = drains.find(d => 
      d.drain_id?.toLowerCase() === formData.drain_id?.toLowerCase() && 
      d.id !== editingDrain?.id &&
      d.status === "active"
    );
    
    if (duplicateDrain) {
      toast.error(`A drain with ID "${formData.drain_id}" already exists`);
      return;
    }

    const nextDue = calculateNextDueDate(formData.cleaning_frequency);
    const data = {
      ...formData,
      organization_id: organizationId,
      next_due_date: format(nextDue, "yyyy-MM-dd"),
      marker_x: markerPosition?.x || editingDrain?.marker_x,
      marker_y: markerPosition?.y || editingDrain?.marker_y
    };

    if (editingDrain) {
      updateDrainMutation.mutate({ id: editingDrain.id, data });
    } else {
      createDrainMutation.mutate(data);
    }
  };

  const calculateNextDueDate = (frequency) => {
    const now = new Date();
    switch (frequency) {
      case "daily": return addDays(now, 1);
      case "weekly": return addWeeks(now, 1);
      case "bi-weekly": return addWeeks(now, 2);
      case "monthly": return addMonths(now, 1);
      default: return addWeeks(now, 1);
    }
  };

  const getDrainStatus = (drain) => {
    if (drain.is_sealed) return "sealed";
    if (!drain.next_due_date) return "pending";
    const dueDate = parseISO(drain.next_due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return "overdue";
    if (isToday(dueDate)) return "due-today";
    return "upcoming";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-4 md:px-6 max-w-7xl mx-auto py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <Link to={createPageUrl("ManagerDashboard")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Droplet className="w-8 h-8 text-blue-600" />
              Drain Management
            </h1>
            <p className="text-slate-500 mt-1">Configure drain locations and cleaning schedules</p>
          </div>
          
          <div className="flex gap-3">
            <Card className="px-4 py-2 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">{activeDrains.length} Active Drains</span>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border shadow-sm mb-6">
            <TabsTrigger value="map" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <MapPin className="w-4 h-4 mr-2" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Droplet className="w-4 h-4 mr-2" />
              Drain List
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <History className="w-4 h-4 mr-2" />
              Cleaning History
            </TabsTrigger>
            <TabsTrigger value="issues" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white relative">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Issues
              {cleaningRecords.filter(r => r.issues_found && (!r.issue_status || r.issue_status === "open" || r.issue_status === "in_progress")).length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cleaningRecords.filter(r => r.issues_found && (!r.issue_status || r.issue_status === "open" || r.issue_status === "in_progress")).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map">
            <Card className="p-6">
              {!defaultMap ? (
                <div className="text-center py-12">
                  <Image className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Facility Map</h3>
                  <p className="text-slate-500 mb-4">Upload a facility map to place drain markers</p>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUploadMap} 
                      className="hidden" 
                      id="upload-map-input"
                    />
                    <Button 
                      disabled={uploadingMap} 
                      onClick={() => document.getElementById('upload-map-input').click()}
                    >
                      {uploadingMap ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Upload Map
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-900">Facility Map</h3>
                    <div className="flex gap-2">
                      <div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleUploadMap} 
                          className="hidden" 
                          id="replace-map-input"
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={uploadingMap}
                          onClick={() => document.getElementById('replace-map-input').click()}
                        >
                          {uploadingMap ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                          Replace Map
                        </Button>
                      </div>
                      <Button 
                        onClick={() => setPlacingMarker(true)} 
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Drain
                      </Button>
                    </div>
                  </div>

                  {placingMarker && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                      <p className="text-blue-800 text-sm">Click on the map to place the drain marker</p>
                      <Button variant="ghost" size="sm" onClick={() => setPlacingMarker(false)}>Cancel</Button>
                    </div>
                  )}

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-2 mb-3">
                    <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={mapZoom <= 1}>
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-600 min-w-[60px] text-center">{Math.round(mapZoom * 100)}%</span>
                    <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={mapZoom >= 4}>
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    {mapZoom > 1 && (
                      <Button variant="outline" size="sm" onClick={handleResetZoom}>
                        <Maximize2 className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                    )}
                    {mapZoom > 1 && (
                      <span className="text-xs text-slate-500 ml-2">Drag to pan</span>
                    )}
                  </div>

                  <div 
                    className={`relative border rounded-lg overflow-hidden ${placingMarker ? 'cursor-crosshair' : mapZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                    onClick={handleMapClick}
                    onMouseDown={handleMapMouseDown}
                    onMouseMove={handleMapMouseMove}
                    onMouseUp={handleMapMouseUp}
                    onMouseLeave={handleMapMouseUp}
                  >
                    <div
                      style={{
                        transform: `scale(${mapZoom}) translate(${mapPosition.x / mapZoom}px, ${mapPosition.y / mapZoom}px)`,
                        transformOrigin: 'top left',
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                      }}
                    >
                    <img 
                      src={defaultMap.image_url} 
                      alt="Facility Map" 
                      className="w-full h-auto select-none"
                      draggable={false}
                    />
                    {activeDrains.map(drain => {
                      if (drain.marker_x == null || drain.marker_y == null) return null;
                      const status = getDrainStatus(drain);
                      return (
                        <div
                          key={drain.id}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                          style={{ left: `${drain.marker_x}%`, top: `${drain.marker_y}%` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDrain(drain);
                            setDrainFormOpen(true);
                          }}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border border-white ${
                            status === "sealed" ? "bg-slate-500" :
                            status === "overdue" ? "bg-red-500" :
                            status === "due-today" ? "bg-amber-500" :
                            "bg-blue-500"
                          }`}>
                            {status === "sealed" ? <Lock className="w-2 h-2" /> : <Droplet className="w-2 h-2" />}
                          </div>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {drain.drain_id}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>

                  <div className="flex gap-4 mt-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500" />
                      <span className="text-slate-600">Upcoming</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-amber-500" />
                      <span className="text-slate-600">Due Today</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500" />
                      <span className="text-slate-600">Overdue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-slate-500" />
                      <span className="text-slate-600">Sealed</span>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-900">All Drains</h3>
                <Button onClick={() => { setEditingDrain(null); setMarkerPosition(null); setDrainFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Drain
                </Button>
              </div>

              {drainsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                </div>
              ) : activeDrains.length === 0 ? (
                <div className="text-center py-8">
                  <Droplet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No drains configured yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDrains.map(drain => {
                    const status = getDrainStatus(drain);
                    return (
                      <Card key={drain.id} className="p-4 border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                              status === "sealed" ? "bg-slate-500" :
                              status === "overdue" ? "bg-red-500" :
                              status === "due-today" ? "bg-amber-500" :
                              "bg-blue-500"
                            }`}>
                              {status === "sealed" ? <Lock className="w-5 h-5" /> : <Droplet className="w-5 h-5" />}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900">{drain.drain_id}</h4>
                              <p className="text-sm text-slate-500">{drain.location_description}</p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {drain.is_sealed ? (
                                  <Badge className="bg-slate-100 text-slate-800">Sealed</Badge>
                                ) : (
                                  <>
                                    <Badge variant="outline" className="text-xs capitalize">{drain.cleaning_frequency}</Badge>
                                    {drain.next_due_date && (
                                      <Badge className={
                                        status === "overdue" ? "bg-red-100 text-red-800" :
                                        status === "due-today" ? "bg-amber-100 text-amber-800" :
                                        "bg-blue-100 text-blue-800"
                                      }>
                                        Due: {format(parseISO(drain.next_due_date), "MMM d")}
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingDrain(drain); setDrainFormOpen(true); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => deleteDrainMutation.mutate(drain.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Cleaning History</h3>
              {cleaningRecords.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No cleaning records yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cleaningRecords.map(record => (
                    <Card key={record.id} className="p-4 border">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <h4 className="font-semibold text-slate-900">{record.drain_code}</h4>
                          </div>
                          <p className="text-sm text-slate-500">{record.drain_location}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Cleaned by {record.cleaned_by_name} on {format(parseISO(record.cleaned_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        {record.issues_found && (
                          <Badge className="bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Issues Found
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="issues">
            <DrainIssuesPanel cleaningRecords={cleaningRecords} user={user} />
          </TabsContent>

          <TabsContent value="settings">
            <DrainCleaningSettingsPanel 
              organizationId={organizationId} 
              settings={currentSettings}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["drain_cleaning_settings"] })}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Drain Form Modal */}
      <DrainFormModal
        open={drainFormOpen}
        onClose={() => { setDrainFormOpen(false); setEditingDrain(null); setMarkerPosition(null); }}
        drain={editingDrain}
        areas={areas}
        onSave={handleSaveDrain}
        isLoading={createDrainMutation.isPending || updateDrainMutation.isPending}
      />
    </div>
  );
}

function DrainCleaningSettingsPanel({ organizationId, settings, onSaved }) {
  const [showTrainingSelector, setShowTrainingSelector] = useState(false);
  const [formData, setFormData] = useState({
    is_enabled: true,
    task_title: "Drain Cleaning",
    required_training_id: "",
    required_training_title: ""
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        is_enabled: settings.is_enabled !== false,
        task_title: settings.task_title || "Drain Cleaning",
        required_training_id: settings.required_training_id || "",
        required_training_title: settings.required_training_title || ""
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return DrainCleaningSettingsRepo.update(settings.id, data);
      } else {
        return DrainCleaningSettingsRepo.create({ ...data, organization_id: organizationId });
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
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-slate-600" />
        <h2 className="text-lg font-semibold text-slate-900">Drain Cleaning Settings</h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <Label className="text-base">Enable Drain Cleaning Task</Label>
            <p className="text-sm text-slate-500">Show drain cleaning in employee task selection</p>
          </div>
          <Switch checked={formData.is_enabled} onCheckedChange={v => setFormData({...formData, is_enabled: v})} />
        </div>

        <div>
          <Label>Task Title</Label>
          <Input 
            value={formData.task_title} 
            onChange={e => setFormData({...formData, task_title: e.target.value})}
            placeholder="Drain Cleaning" 
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
          <p className="text-xs text-slate-500">Employees will be prompted to complete this training before cleaning drains</p>
        </div>

        <Button onClick={() => saveMutation.mutate(formData)} className="w-full bg-slate-900 hover:bg-slate-800" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
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

function DrainFormModal({ open, onClose, drain, areas, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    drain_id: "",
    location_description: "",
    area_id: "",
    area_name: "",
    cleaning_frequency: "weekly",
    is_sealed: false,
    sealed_notes: "",
    notes: ""
  });

  useEffect(() => {
    if (drain) {
      setFormData({
        drain_id: drain.drain_id || "",
        location_description: drain.location_description || "",
        area_id: drain.area_id || "",
        area_name: drain.area_name || "",
        cleaning_frequency: drain.cleaning_frequency || "weekly",
        is_sealed: drain.is_sealed || false,
        sealed_notes: drain.sealed_notes || "",
        notes: drain.notes || ""
      });
    } else {
      setFormData({
        drain_id: "",
        location_description: "",
        area_id: "",
        area_name: "",
        cleaning_frequency: "weekly",
        is_sealed: false,
        sealed_notes: "",
        notes: ""
      });
    }
  }, [drain, open]);

  const handleAreaChange = (areaId) => {
    const area = areas.find(a => a.id === areaId);
    setFormData(prev => ({
      ...prev,
      area_id: areaId,
      area_name: area?.name || ""
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{drain ? "Edit Drain" : "Add New Drain"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Drain ID *</Label>
            <Input
              value={formData.drain_id}
              onChange={(e) => setFormData(prev => ({ ...prev, drain_id: e.target.value }))}
              placeholder="e.g., D-001"
              required
            />
          </div>
          <div>
            <Label>Location Description *</Label>
            <Textarea
              value={formData.location_description}
              onChange={(e) => setFormData(prev => ({ ...prev, location_description: e.target.value }))}
              placeholder="Describe where this drain is located"
              required
            />
          </div>
          <div>
            <Label>Area (Optional)</Label>
            <Select value={formData.area_id || "__none__"} onValueChange={(v) => handleAreaChange(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No area</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cleaning Frequency</Label>
            <Select 
              value={formData.cleaning_frequency} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, cleaning_frequency: v }))}
              disabled={formData.is_sealed}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <div>
                <Label className="text-sm font-medium">Sealed & Uncleanable</Label>
                <p className="text-xs text-slate-500">Mark this drain as sealed</p>
              </div>
            </div>
            <Switch
              checked={formData.is_sealed}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                is_sealed: checked,
                sealed_date: checked ? format(new Date(), "yyyy-MM-dd") : null
              }))}
            />
          </div>
          {formData.is_sealed && (
            <div>
              <Label>Sealed Notes</Label>
              <Textarea
                value={formData.sealed_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, sealed_notes: e.target.value }))}
                placeholder="Why is this drain sealed?"
              />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {drain ? "Update" : "Add"} Drain
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}