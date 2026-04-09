import { useState, useEffect, useMemo } from "react";
import { uploadFile } from "@/lib/adapters/storage";
import {
  DiverterInspectionRepo, RainDiverterRepo, AreaRepo,
  ProductionLineRepo, DiverterTaskSettingsRepo, FacilityMapRepo
} from "@/lib/adapters/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Droplets, Map, List, ArrowLeft, Settings, CheckCircle2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

import DiverterDashboard from "@/components/raindiverter/DiverterDashboard";
import FacilityMapView from "@/components/raindiverter/FacilityMapView";
import DiverterFormModal from "@/components/raindiverter/DiverterFormModal";
import DiverterDetailModal from "@/components/raindiverter/DiverterDetailModal";
import InspectionFormModal from "@/components/raindiverter/InspectionFormModal";
import RemoveDiverterModal from "@/components/raindiverter/RemoveDiverterModal";
import DiverterTaskSettingsPanel from "@/components/raindiverter/DiverterTaskSettingsPanel";

export default function RainDivertersPage() {
  const [user, setUser] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [activeTab, setActiveTab] = useState("list");
  
  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  
  const [selectedDiverter, setSelectedDiverter] = useState(null);
  const [newMarkerPosition, setNewMarkerPosition] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      // This is the Employee Rain Diverters page - only for employees
      const storedEmployee = localStorage.getItem("selectedEmployee");
      if (storedEmployee) {
        const emp = JSON.parse(storedEmployee);
        setUser({ ...emp, role: "employee" });
        setOrganizationId(emp.organization_id);
      } else {
        // No employee - redirect to employee login
        window.location.href = createPageUrl("EmployeeLogin");
      }
    };
    init();
  }, []);

  // Employees have full access to rain diverter features (add, edit, inspect, remove)
  const isManager = true;
  // Employees cannot upload maps
  const canUploadMap = false;

  // Fetch data
  const { data: diverters = [], isLoading: loadingDiverters } = useQuery({
    queryKey: ["rain_diverters", organizationId],
    queryFn: () => RainDiverterRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ["diverter_inspections", organizationId],
    queryFn: () => DiverterInspectionRepo.filter({ organization_id: organizationId }, "-inspection_date", 500),
    enabled: !!organizationId
  });

  const { data: facilityMaps = [] } = useQuery({
    queryKey: ["facility_maps", organizationId],
    queryFn: () => FacilityMapRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas", organizationId],
    queryFn: () => AreaRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: productionLines = [] } = useQuery({
    queryKey: ["production_lines", organizationId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: diverterSettings = [] } = useQuery({
    queryKey: ["diverter_task_settings", organizationId],
    queryFn: () => DiverterTaskSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const defaultMap = facilityMaps.find(m => m.is_default) || facilityMaps[0];

  // Check if the diverter task is completed today
  const taskCompletedToday = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return inspections.some(i => i.inspection_date && i.inspection_date.startsWith(today));
  }, [inspections]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["rain_diverters"] });
    queryClient.invalidateQueries({ queryKey: ["diverter_inspections"] });
    // Also refresh employee dashboard queries so completion status updates
    queryClient.invalidateQueries({ queryKey: ["recent_diverter_inspections"] });
  };

  const handleUploadMap = async (file) => {
    try {
      const { file_url } = await uploadFile(file);
      
      // Mark existing maps as not default
      for (const map of facilityMaps) {
        if (map.is_default) {
          await FacilityMapRepo.update(map.id, { is_default: false });
        }
      }

      // Create new map
      await FacilityMapRepo.create({
        organization_id: organizationId,
        name: "Facility Map",
        image_url: file_url,
        is_default: true
      });

      queryClient.invalidateQueries({ queryKey: ["facility_maps"] });
    } catch (err) {
      console.error("Failed to upload map:", err);
    }
  };

  const handleAddMarker = (position) => {
    setNewMarkerPosition(position);
    setSelectedDiverter(null);
    setShowFormModal(true);
  };

  const handleSelectDiverter = (diverter) => {
    setSelectedDiverter(diverter);
    setShowDetailModal(true);
  };

  const handleEditDiverter = () => {
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleInspectDiverter = () => {
    setShowDetailModal(false);
    setShowInspectionModal(true);
  };

  const handleRemoveDiverter = () => {
    setShowDetailModal(false);
    setShowRemoveModal(true);
  };

  const handleMarkWOComplete = () => {
    setShowDetailModal(false);
    handleRefresh();
  };

  if (!organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Rain Leak Diverters</h1>
                <p className="text-sm text-slate-500">Track and inspect rain tarps</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Completed Banner */}
      {taskCompletedToday && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <Card className="bg-emerald-100 border-emerald-300">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-900">Rain Diverter Task Completed</p>
                  <p className="text-sm text-emerald-700">You've completed your diverter inspection for today.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Map View
            </TabsTrigger>
            {canUploadMap && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="list">
            {loadingDiverters ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <DiverterDashboard
                diverters={diverters}
                inspections={inspections}
                isManager={isManager}
                frequency={diverterSettings[0]?.frequency || "weekly"}
                onAddNew={() => {
                  setSelectedDiverter(null);
                  setNewMarkerPosition(null);
                  setShowFormModal(true);
                }}
                onViewMap={() => setActiveTab("map")}
                onSelectDiverter={handleSelectDiverter}
              />
            )}
          </TabsContent>

          <TabsContent value="map">
            <FacilityMapView
              mapImageUrl={defaultMap?.image_url}
              diverters={diverters}
              isManager={isManager}
              canUploadMap={canUploadMap}
              onMarkerClick={handleSelectDiverter}
              onAddMarker={handleAddMarker}
              onUploadMap={handleUploadMap}
            />
          </TabsContent>

          {canUploadMap && (
            <TabsContent value="settings">
              <div className="max-w-lg">
                <DiverterTaskSettingsPanel organizationId={organizationId} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Modals */}
      <DiverterFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        diverter={selectedDiverter}
        areas={areas}
        productionLines={productionLines}
        organizationId={organizationId}
        markerPosition={newMarkerPosition}
        onSave={handleRefresh}
      />

      <DiverterDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        diverter={selectedDiverter}
        inspections={inspections}
        isManager={isManager}
        onEdit={handleEditDiverter}
        onInspect={handleInspectDiverter}
        onRemove={handleRemoveDiverter}
        onMarkWOComplete={handleMarkWOComplete}
        onRefresh={handleRefresh}
      />

      <InspectionFormModal
        open={showInspectionModal}
        onOpenChange={setShowInspectionModal}
        diverter={selectedDiverter}
        inspector={user}
        organizationId={organizationId}
        onComplete={handleRefresh}
      />

      <RemoveDiverterModal
        open={showRemoveModal}
        onOpenChange={setShowRemoveModal}
        diverter={selectedDiverter}
        organizationId={organizationId}
        onComplete={handleRefresh}
      />
    </div>
  );
}