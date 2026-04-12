import { useState, useEffect } from "react";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import {
  OrganizationRepo, ChemicalInventorySettingsRepo, ChemicalInventoryRecordRepo,
  ChemicalRepo, ChemicalStorageLocationRepo, ChemicalLocationAssignmentRepo
} from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  FlaskConical, Package, MapPin, Settings, ClipboardList, Loader2, History, ArrowLeft
} from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ChemicalsList from "@/components/inventory/ChemicalsList";
import StorageLocationsList from "@/components/inventory/StorageLocationsList";
import LocationAssignments from "@/components/inventory/LocationAssignments";
import InventorySettings from "@/components/inventory/InventorySettings";
import InventoryRecordsDashboard from "@/components/inventory/InventoryRecordsDashboard";
import InventoryHistoryList from "@/components/inventory/InventoryHistoryList";

export default function ChemicalInventoryPage() {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isManager, setIsManager] = useState(false);

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
            // Manager check: role admin, org creator, or site_role set by Home.jsx
            const siteRole = localStorage.getItem("site_role");
            const isOrgCreator = userData?.email && userData.email === orgs[0].created_by;
            setIsManager(
              userData?.role === "admin" || isOrgCreator || siteRole === "manager"
            );
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

  const { data: chemicals = [], isLoading: chemicalsLoading } = useQuery({
    queryKey: ["chemicals", organizationId],
    queryFn: () => ChemicalRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ["chemical_locations", organizationId],
    queryFn: () => ChemicalStorageLocationRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["chemical_assignments", organizationId],
    queryFn: () => ChemicalLocationAssignmentRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: inventorySettings = [] } = useQuery({
    queryKey: ["inventory_settings", organizationId],
    queryFn: () => ChemicalInventorySettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: inventoryRecords = [] } = useQuery({
    queryKey: ["inventory_records", organizationId],
    queryFn: () => ChemicalInventoryRecordRepo.filter({ organization_id: organizationId }, "-week_start_date"),
    enabled: !!organizationId
  });

  const settings = inventorySettings[0];
  const activeChemicals = chemicals.filter(c => c.status === "active");
  const activeLocations = locations.filter(l => l.status === "active");
  const activeAssignments = assignments.filter(a => a.status === "active");

  // Get current week's record
  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd");
  const currentWeekRecord = inventoryRecords.find(r => r.week_start_date === weekStart);

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
              <FlaskConical className="w-8 h-8 text-emerald-600" />
              Chemical Inventory
            </h1>
            <p className="text-slate-500 mt-1">Manage chemical inventory and weekly counts</p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-3">
            <Card className="px-4 py-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">{activeChemicals.length} Chemicals</span>
            </Card>
            <Card className="px-4 py-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">{activeLocations.length} Locations</span>
            </Card>
            {currentWeekRecord && (
              <Badge variant="secondary" className={
                currentWeekRecord.status === "completed" ? "bg-emerald-600" :
                currentWeekRecord.status === "in_progress" ? "bg-blue-600" :
                "bg-amber-600"
              }>
                This Week: {currentWeekRecord.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border shadow-sm mb-6">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <ClipboardList className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            {isManager && (
              <>
                <TabsTrigger value="chemicals" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  <FlaskConical className="w-4 h-4 mr-2" />
                  Chemicals
                </TabsTrigger>
                <TabsTrigger value="locations" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  <MapPin className="w-4 h-4 mr-2" />
                  Locations
                </TabsTrigger>
                <TabsTrigger value="assignments" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  <Package className="w-4 h-4 mr-2" />
                  Assignments
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  <History className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="dashboard">
            <InventoryRecordsDashboard 
              organizationId={organizationId}
              isManager={isManager}
              chemicals={activeChemicals}
              locations={activeLocations}
              assignments={activeAssignments}
              settings={settings}
              currentWeekRecord={currentWeekRecord}
              user={user}
              onNavigateToSettings={() => setActiveTab("settings")}
            />
          </TabsContent>

          {isManager && (
            <>
              <TabsContent value="chemicals">
                <ChemicalsList 
                  organizationId={organizationId}
                  chemicals={chemicals}
                />
              </TabsContent>

              <TabsContent value="locations">
                <StorageLocationsList 
                  organizationId={organizationId}
                  locations={locations}
                />
              </TabsContent>

              <TabsContent value="assignments">
                <LocationAssignments 
                  organizationId={organizationId}
                  chemicals={activeChemicals}
                  locations={activeLocations}
                  assignments={assignments}
                />
              </TabsContent>

              <TabsContent value="history">
                <InventoryHistoryList 
                  organizationId={organizationId}
                  inventoryRecords={inventoryRecords}
                />
              </TabsContent>

              <TabsContent value="settings">
                <InventorySettings 
                  organizationId={organizationId}
                  settings={settings}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}