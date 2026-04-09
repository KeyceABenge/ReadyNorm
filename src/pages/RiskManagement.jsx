// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, RiskEntryRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  Shield, Plus, ArrowLeft, LayoutDashboard, List, ClipboardList,
  BarChart3, Settings, AlertTriangle, TrendingUp, Calendar
} from "lucide-react";

import RiskDashboard from "@/components/risk/RiskDashboard.jsx";
import RiskRegister from "@/components/risk/RiskRegister.jsx";
import RiskFormModal from "@/components/risk/RiskFormModal.jsx";
import RiskDetailModal from "@/components/risk/RiskDetailModal.jsx";
import ManagementReviewList from "@/components/risk/ManagementReviewList.jsx";
import ManagementReviewModal from "@/components/risk/ManagementReviewModal.jsx";
import RiskAnalytics from "@/components/risk/RiskAnalytics.jsx";
import RiskSettingsPanel from "@/components/risk/RiskSettingsPanel.jsx";

export default function RiskManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initializeOrg = async () => {
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

  const { data: risks = [], refetch: refetchRisks } = useQuery({
    queryKey: ["risks", organizationId],
    queryFn: () => RiskEntryRepo.filter({ organization_id: organizationId }, "-created_date"),
    enabled: !!organizationId
  });

  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["management_reviews", organizationId],
    queryFn: () => ManagementReviewRepo.filter({ organization_id: organizationId }, "-scheduled_date"),
    enabled: !!organizationId
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ["risk_settings", organizationId],
    queryFn: () => RiskSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const riskSettings = settings[0] || {};

  const handleRefresh = () => {
    refetchRisks();
    refetchReviews();
    refetchSettings();
  };

  const activeRisks = risks.filter(r => !["closed", "accepted"].includes(r.status));
  const criticalRisks = activeRisks.filter(r => r.risk_level === "critical");
  const highRisks = activeRisks.filter(r => r.risk_level === "high");
  const overdueReviews = activeRisks.filter(r => r.next_review_date && new Date(r.next_review_date) < new Date());
  const pendingReviews = reviews.filter(r => ["draft", "scheduled", "in_progress"].includes(r.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50 to-indigo-50">
      <div className="bg-white/60 backdrop-blur-xl border-b border-white/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("QualityProgram")}>
                <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Risk & Management Review</h1>
                  <p className="text-xs text-slate-500">Risk register and leadership oversight</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowReviewModal(true)} variant="outline">
                <Calendar className="w-4 h-4 mr-2" />New Review
              </Button>
              <Button onClick={() => setShowRiskForm(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />Add Risk
              </Button>
            </div>
          </div>
        </div>
      </div>

      {(criticalRisks.length > 0 || overdueReviews.length > 0) && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="text-sm text-rose-800">
              {criticalRisks.length > 0 && <span className="font-medium">{criticalRisks.length} critical risk{criticalRisks.length > 1 ? "s" : ""} require attention. </span>}
              {overdueReviews.length > 0 && <span className="font-medium">{overdueReviews.length} risk{overdueReviews.length > 1 ? "s" : ""} overdue for review.</span>}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2"><List className="w-4 h-4 text-purple-500" /><span className="text-xs text-slate-500">Active Risks</span></div>
              <p className="text-2xl font-bold text-purple-600 mt-1">{activeRisks.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /><span className="text-xs text-slate-500">Critical</span></div>
              <p className="text-2xl font-bold text-rose-600 mt-1">{criticalRisks.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /><span className="text-xs text-slate-500">High</span></div>
              <p className="text-2xl font-bold text-orange-600 mt-1">{highRisks.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-500" /><span className="text-xs text-slate-500">Overdue Reviews</span></div>
              <p className="text-2xl font-bold text-amber-600 mt-1">{overdueReviews.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-blue-500" /><span className="text-xs text-slate-500">Pending Reviews</span></div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{pendingReviews.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/60 backdrop-blur-xl border border-white/80 mb-6">
            <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="w-4 h-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="register" className="gap-2"><List className="w-4 h-4" />Risk Register</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2"><ClipboardList className="w-4 h-4" />Management Reviews</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <RiskDashboard risks={risks} reviews={reviews} onSelectRisk={setSelectedRisk} onSelectReview={(r) => { setSelectedReview(r); setShowReviewModal(true); }} />
          </TabsContent>
          <TabsContent value="register">
            <RiskRegister risks={risks} onSelectRisk={setSelectedRisk} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="reviews">
            <ManagementReviewList reviews={reviews} onSelectReview={(r) => { setSelectedReview(r); setShowReviewModal(true); }} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="analytics">
            <RiskAnalytics risks={risks} reviews={reviews} />
          </TabsContent>
          <TabsContent value="settings">
            <RiskSettingsPanel settings={riskSettings} organizationId={organizationId} employees={employees} onRefresh={handleRefresh} />
          </TabsContent>
        </Tabs>
      </div>

      <RiskFormModal open={showRiskForm} onOpenChange={setShowRiskForm} organizationId={organizationId} user={user} settings={riskSettings} employees={employees} onSuccess={handleRefresh} />
      
      {selectedRisk && (
        <RiskDetailModal open={!!selectedRisk} onOpenChange={(open) => !open && setSelectedRisk(null)} risk={selectedRisk} user={user} employees={employees} onRefresh={handleRefresh} />
      )}

      <ManagementReviewModal open={showReviewModal} onOpenChange={(open) => { setShowReviewModal(open); if (!open) setSelectedReview(null); }} review={selectedReview} risks={risks} organizationId={organizationId} user={user} settings={riskSettings} employees={employees} onSuccess={handleRefresh} />
    </div>
  );
}