import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AreaRepo,
  CAPARepo,
  DrainCleaningRecordRepo,
  FacilityMapRepo,
  PestDeviceRepo,
  PestFindingRepo,
  PestLocationRepo,
  PestRiskPredictionRepo,
  PestServiceReportRepo,
  PestThresholdRepo,
  PestVendorRepo,
  ProductionLineRepo,
  TaskRepo
} from "@/lib/adapters/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bug, Upload, Map, Settings, TrendingUp, AlertTriangle, 
  FileText, Loader2, ArrowLeft, Brain
} from "lucide-react";
import { subDays } from "date-fns";

import PestDashboardOverview from "@/components/pest/PestDashboardOverview";
import PestDeviceManager from "@/components/pest/PestDeviceManager";
import PestReportUploader from "@/components/pest/PestReportUploader";
import PestFindingsView from "@/components/pest/PestFindingsView";
import PestThresholdSettings from "@/components/pest/PestThresholdSettings";
import PestVendorSettings from "@/components/pest/PestVendorSettings";
import PestLocationSettings from "@/components/pest/PestLocationSettings";
import PestRiskAnalysis from "@/components/pest/PestRiskAnalysis.jsx";
import PestMapsTab from "@/components/pest/PestMapsTab.jsx";
import useOrganization from "@/components/auth/useOrganization";
import { createPageUrl } from "@/utils";

export default function PestControlPage() {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Use centralized organization hook - SINGLE SOURCE OF TRUTH
  const { organizationId, organization, user, isLoading: orgLoading } = useOrganization();

  const queryClient = useQueryClient();

  // Fetch all pest data
  const { data: locations = [] } = useQuery({
    queryKey: ["pest_locations", organizationId],
    queryFn: () => PestLocationRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ["pest_vendors", organizationId],
    queryFn: () => PestVendorRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: devices = [], isLoading: loadingDevices } = useQuery({
    queryKey: ["pest_devices", organizationId],
    queryFn: () => PestDeviceRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: thresholds = [] } = useQuery({
    queryKey: ["pest_thresholds", organizationId],
    queryFn: () => PestThresholdRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: serviceReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["pest_service_reports", organizationId],
    queryFn: () => PestServiceReportRepo.filter({ organization_id: organizationId }, "-service_date", 100),
    enabled: !!organizationId
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["pest_findings", organizationId],
    queryFn: () => PestFindingRepo.filter({ organization_id: organizationId }, "-service_date", 500),
    enabled: !!organizationId
  });

  const { data: riskPredictions = [] } = useQuery({
    queryKey: ["pest_risk_predictions", organizationId],
    queryFn: () => PestRiskPredictionRepo.filter({ organization_id: organizationId }, "-created_date", 50),
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

  const { data: capas = [] } = useQuery({
    queryKey: ["capas_pest", organizationId],
    queryFn: () => CAPARepo.filter({ organization_id: organizationId, source: "pest" }),
    enabled: !!organizationId
  });

  // Sanitation data for correlation
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks_pest", organizationId],
    queryFn: () => TaskRepo.filter({ organization_id: organizationId }, "-created_date", 200),
    enabled: !!organizationId
  });

  const { data: drainRecords = [] } = useQuery({
    queryKey: ["drain_records_pest", organizationId],
    queryFn: () => DrainCleaningRecordRepo.filter({ organization_id: organizationId }, "-cleaned_at", 100),
    enabled: !!organizationId
  });

  const defaultMap = facilityMaps.find(m => m.is_default) || facilityMaps[0];

  // Calculate summary stats
  const stats = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentFindings = findings.filter(f => new Date(f.service_date) >= thirtyDaysAgo);
    const exceedances = recentFindings.filter(f => f.threshold_exceeded);
    const pendingReviews = serviceReports.filter(r => r.review_status === "pending_review");
    const latestRisk = riskPredictions[0];

    return {
      totalDevices: devices.filter(d => d.status === "active").length,
      recentFindings: recentFindings.length,
      exceedances: exceedances.length,
      criticalExceedances: exceedances.filter(e => e.exceedance_severity === "critical").length,
      pendingReviews: pendingReviews.length,
      overallRiskScore: latestRisk?.risk_score || 0,
      riskLevel: latestRisk?.risk_level || "low"
    };
  }, [devices, findings, serviceReports, riskPredictions]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pest_locations"] });
    queryClient.invalidateQueries({ queryKey: ["pest_vendors"] });
    queryClient.invalidateQueries({ queryKey: ["pest_devices"] });
    queryClient.invalidateQueries({ queryKey: ["pest_thresholds"] });
    queryClient.invalidateQueries({ queryKey: ["pest_service_reports"] });
    queryClient.invalidateQueries({ queryKey: ["pest_findings"] });
    queryClient.invalidateQueries({ queryKey: ["pest_risk_predictions"] });
  };

  if (orgLoading || !organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-orange-50">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-xl border-b border-white/80">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("FoodSafetyProgram")}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Bug className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Pest Control Intelligence</h1>
                  <p className="text-sm text-slate-500">Pest management & risk prediction</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {stats.criticalExceedances > 0 && (
                <Badge className="bg-red-100 text-red-800" variant="default">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {stats.criticalExceedances} Critical
                </Badge>
              )}
              {stats.pendingReviews > 0 && (
                <Badge className="bg-amber-100 text-amber-800" variant="default">
                  {stats.pendingReviews} Pending Review
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Reports
              {stats.pendingReviews > 0 && (
                <Badge className="ml-1 bg-amber-500 text-white text-xs" variant="default">{stats.pendingReviews}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="findings" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Findings
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Maps
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Risk Analysis
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <PestDashboardOverview
              stats={stats}
              devices={devices}
              findings={findings}
              serviceReports={serviceReports}
              riskPredictions={riskPredictions}
              thresholds={thresholds}
              locations={locations}
              onNavigate={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="reports">
            <PestReportUploader
              organizationId={organizationId}
              vendors={vendors}
              devices={devices}
              thresholds={thresholds}
              serviceReports={serviceReports}
              locations={locations}
              onRefresh={handleRefresh}
              user={user}
            />
          </TabsContent>

          <TabsContent value="findings">
            <PestFindingsView
              findings={findings}
              devices={devices}
              serviceReports={serviceReports}
              thresholds={thresholds}
              areas={areas}
              productionLines={productionLines}
              capas={capas}
              organizationId={organizationId}
              user={user}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="devices">
            <PestDeviceManager
              organizationId={organizationId}
              devices={devices}
              locations={locations}
              areas={areas}
              productionLines={productionLines}
              findings={findings}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="map">
            <PestMapsTab
              organizationId={organizationId}
              mapImageUrl={defaultMap?.image_url}
              onRefresh={handleRefresh}
              organizationName={organization?.site_name || organization?.name}
            />
          </TabsContent>

          <TabsContent value="risk">
            <PestRiskAnalysis
              organizationId={organizationId}
              riskPredictions={riskPredictions}
              findings={findings}
              devices={devices}
              tasks={tasks}
              drainRecords={drainRecords}
              areas={areas}
              productionLines={productionLines}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <PestLocationSettings
                organizationId={organizationId}
                locations={locations}
                vendors={vendors}
                devices={devices}
                onRefresh={handleRefresh}
              />
              <PestVendorSettings
                organizationId={organizationId}
                vendors={vendors}
                onRefresh={handleRefresh}
              />
              <PestThresholdSettings
                organizationId={organizationId}
                thresholds={thresholds}
                areas={areas}
                productionLines={productionLines}
                devices={devices}
                onRefresh={handleRefresh}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}