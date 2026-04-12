import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, EMPSiteRepo, EMPSampleRepo, EMPThresholdRepo, EMPRiskPredictionRepo, FacilityMapRepo, AreaRepo, ProductionLineRepo, DrainLocationRepo, CAPARepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertTriangle, MapPin, FlaskConical, TrendingUp, Settings, FileText, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import EMPDashboard from "@/components/emp/EMPDashboard.jsx";
import EMPSiteManager from "@/components/emp/EMPSiteManager.jsx";
import EMPSampleEntry from "@/components/emp/EMPSampleEntry.jsx";
import EMPMapView from "@/components/emp/EMPMapView.jsx";
import EMPRiskAnalysis from "@/components/emp/EMPRiskAnalysis.jsx";
import EMPSettings from "@/components/emp/EMPSettings.jsx";
import EMPReports from "@/components/emp/EMPReports.jsx";

export default function EnvironmentalMonitoring() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [organizationId, setOrganizationId] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (e) {}
      
      // Get org ID from site_code (the correct source of truth)
      const siteCode = localStorage.getItem("site_code");
      if (siteCode) {
        const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].id);
        }
      }
    };
    init();
  }, []);

  const { data: sites = [], isLoading: sitesLoading, refetch: refetchSites } = useQuery({
    queryKey: ["emp_sites", organizationId],
    queryFn: () => EMPSiteRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: samples = [], isLoading: samplesLoading, refetch: refetchSamples } = useQuery({
    queryKey: ["emp_samples", organizationId],
    queryFn: () => EMPSampleRepo.filter({ organization_id: organizationId }, "-collection_date"),
    enabled: !!organizationId
  });

  const { data: thresholds = [], refetch: refetchThresholds } = useQuery({
    queryKey: ["emp_thresholds", organizationId],
    queryFn: () => EMPThresholdRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: predictions = [] } = useQuery({
    queryKey: ["emp_predictions", organizationId],
    queryFn: () => EMPRiskPredictionRepo.filter({ organization_id: organizationId }, "-created_date", 10),
    enabled: !!organizationId
  });

  const { data: facilityMaps = [] } = useQuery({
    queryKey: ["facility_maps", organizationId],
    queryFn: () => FacilityMapRepo.filter({ organization_id: organizationId }),
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

  const { data: drains = [] } = useQuery({
    queryKey: ["drains", organizationId],
    queryFn: () => DrainLocationRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: capas = [] } = useQuery({
    queryKey: ["capas", organizationId],
    queryFn: () => CAPARepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const handleRefresh = () => {
    refetchSites();
    refetchSamples();
    refetchThresholds();
  };

  if (sitesLoading || samplesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // Calculate summary stats
  const pendingSamples = samples.filter(s => s.status === "in_lab" || s.status === "collected").length;
  const recentPositives = samples.filter(s => {
    const isRecent = new Date(s.collection_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return isRecent && s.overall_result === "fail";
  }).length;
  const pendingReswabs = samples.filter(s => s.requires_reswab && s.status !== "closed").length;
  const zone1Sites = sites.filter(s => s.zone_classification === "zone_1" && s.status === "active").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("FoodSafetyProgram")}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Environmental Monitoring Program</h1>
              <p className="text-sm text-slate-600 mt-1">
                Manage sampling sites, track results, and monitor environmental risks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Alert Banner */}
        {(recentPositives > 0 || pendingReswabs > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Attention Required</p>
              <p className="text-sm text-amber-700">
                {recentPositives > 0 && `${recentPositives} positive finding${recentPositives > 1 ? 's' : ''} in last 30 days. `}
                {pendingReswabs > 0 && `${pendingReswabs} pending reswab${pendingReswabs > 1 ? 's' : ''} required.`}
              </p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Active Sites</p>
            <p className="text-2xl font-bold text-slate-900">{sites.filter(s => s.status === "active").length}</p>
            <p className="text-xs text-slate-500">{zone1Sites} Zone 1</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Results</p>
            <p className="text-2xl font-bold text-blue-600">{pendingSamples}</p>
            <p className="text-xs text-slate-500">In lab / collected</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">30-Day Positives</p>
            <p className="text-2xl font-bold text-rose-600">{recentPositives}</p>
            <p className="text-xs text-slate-500">Requires attention</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Reswabs</p>
            <p className="text-2xl font-bold text-amber-600">{pendingReswabs}</p>
            <p className="text-xs text-slate-500">Follow-up needed</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="dashboard">
              <TrendingUp className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="sites">
              <MapPin className="w-4 h-4 mr-2" />
              Sites
            </TabsTrigger>
            <TabsTrigger value="samples">
              <FlaskConical className="w-4 h-4 mr-2" />
              Samples
            </TabsTrigger>
            <TabsTrigger value="map">
              <MapPin className="w-4 h-4 mr-2" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="risk">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Risk Analysis
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <EMPDashboard
              sites={sites}
              samples={samples}
              thresholds={thresholds}
              predictions={predictions}
              areas={areas}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="sites">
            <EMPSiteManager
              sites={sites}
              samples={samples}
              areas={areas}
              productionLines={productionLines}
              drains={drains}
              facilityMaps={facilityMaps}
              organizationId={organizationId}
              onRefresh={refetchSites}
            />
          </TabsContent>

          <TabsContent value="samples">
            <EMPSampleEntry
              sites={sites}
              samples={samples}
              thresholds={thresholds}
              capas={capas}
              organizationId={organizationId}
              user={user}
              onRefresh={refetchSamples}
            />
          </TabsContent>

          <TabsContent value="map">
            <EMPMapView
              sites={sites}
              samples={samples}
              facilityMaps={facilityMaps}
              areas={areas}
              drains={drains}
              organizationId={organizationId}
            />
          </TabsContent>

          <TabsContent value="risk">
            <EMPRiskAnalysis
              sites={sites}
              samples={samples}
              predictions={predictions}
              thresholds={thresholds}
              areas={areas}
              drains={drains}
              organizationId={organizationId}
            />
          </TabsContent>

          <TabsContent value="reports">
            <EMPReports
              sites={sites}
              samples={samples}
              thresholds={thresholds}
              predictions={predictions}
              organizationId={organizationId}
            />
          </TabsContent>

          <TabsContent value="settings">
            <EMPSettings
              thresholds={thresholds}
              organizationId={organizationId}
              onRefresh={refetchThresholds}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}