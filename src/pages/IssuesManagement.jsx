import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, IssueRepo, IssueSettingsRepo, AreaRepo, ProductionLineRepo, EmployeeRepo, CAPARepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Plus, ArrowLeft, LayoutDashboard, List, 
  BarChart3, Settings, Clock, CheckCircle2, AlertCircle, XCircle
} from "lucide-react";

import IssueDashboard from "@/components/issues/IssueDashboard.jsx";
import IssuesList from "@/components/issues/IssuesList.jsx";
import IssueFormModal from "@/components/issues/IssueFormModal.jsx";
import IssueDetailModal from "@/components/issues/IssueDetailModal.jsx";
import IssueAnalytics from "@/components/issues/IssueAnalytics.jsx";
import IssueSettingsPanel from "@/components/issues/IssueSettingsPanel.jsx";

export default function IssuesManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initializeOrg = async () => {
      // Get org ID from site_code (the correct source of truth)
      const siteCode = localStorage.getItem("site_code");
      if (siteCode) {
        const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].id);
        }
      }
      getCurrentUser().then(setUser).catch(() => {});
    };
    initializeOrg();
  }, []);

  const { data: issues = [], refetch: refetchIssues } = useQuery({
    queryKey: ["issues", organizationId],
    queryFn: () => IssueRepo.filter({ organization_id: organizationId }, "-created_date"),
    enabled: !!organizationId
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ["issue_settings", organizationId],
    queryFn: () => IssueSettingsRepo.filter({ organization_id: organizationId }),
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

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: capas = [] } = useQuery({
    queryKey: ["capas", organizationId],
    queryFn: () => CAPARepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const issueSettings = settings[0] || {};

  const handleRefresh = () => {
    refetchIssues();
    refetchSettings();
  };

  const openIssues = issues.filter(i => !["closed", "pending_verification"].includes(i.status));
  const criticalOpen = openIssues.filter(i => i.severity === "critical").length;
  const majorOpen = openIssues.filter(i => i.severity === "major").length;
  const overdueIssues = openIssues.filter(i => i.due_date && new Date(i.due_date) < new Date()).length;
  const pendingVerification = issues.filter(i => i.status === "pending_verification").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-rose-50 to-amber-50">
      <div className="bg-white/60 backdrop-blur-xl border-b border-white/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("QualityProgram")}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Issues & Nonconformance</h1>
                  <p className="text-xs text-slate-500">Report, track, and resolve quality issues</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowFormModal(true)} className="bg-rose-600 hover:bg-rose-700">
              <Plus className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
          </div>
        </div>
      </div>

      {(criticalOpen > 0 || overdueIssues > 0) && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="text-sm text-rose-800">
              {criticalOpen > 0 && <span className="font-medium">{criticalOpen} critical issue{criticalOpen > 1 ? "s" : ""} open. </span>}
              {overdueIssues > 0 && <span className="font-medium">{overdueIssues} issue{overdueIssues > 1 ? "s" : ""} overdue.</span>}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">Open Issues</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-1">{openIssues.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" />
                <span className="text-xs text-slate-500">Critical</span>
              </div>
              <p className="text-2xl font-bold text-rose-600 mt-1">{criticalOpen}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-slate-500">Major</span>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-1">{majorOpen}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-slate-500">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-orange-600 mt-1">{overdueIssues}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-500">Pending Verify</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{pendingVerification}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/60 backdrop-blur-xl border border-white/80 mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="issues" className="gap-2">
              <List className="w-4 h-4" />
              All Issues
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <IssueDashboard issues={issues} onSelectIssue={setSelectedIssue} onNewIssue={() => setShowFormModal(true)} />
          </TabsContent>

          <TabsContent value="issues">
            <IssuesList issues={issues} onSelectIssue={setSelectedIssue} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="analytics">
            <IssueAnalytics issues={issues} capas={capas} />
          </TabsContent>

          <TabsContent value="settings">
            <IssueSettingsPanel settings={issueSettings} organizationId={organizationId} employees={employees} onRefresh={handleRefresh} />
          </TabsContent>
        </Tabs>
      </div>

      <IssueFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        organizationId={organizationId}
        user={user}
        areas={areas}
        productionLines={productionLines}
        employees={employees}
        settings={issueSettings}
        onSuccess={handleRefresh}
      />

      {selectedIssue && (
        <IssueDetailModal
          open={!!selectedIssue}
          onOpenChange={(open) => !open && setSelectedIssue(null)}
          issue={selectedIssue}
          user={user}
          employees={employees}
          settings={issueSettings}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}