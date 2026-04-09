import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, CustomerComplaintRepo, ComplaintSettingsRepo, EmployeeRepo, CAPARepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  MessageSquareWarning, Plus, ArrowLeft, LayoutDashboard, List,
  BarChart3, Settings, Clock, CheckCircle2, AlertCircle, FileText
} from "lucide-react";

import ComplaintDashboard from "@/components/complaints/ComplaintDashboard.jsx";
import ComplaintsList from "@/components/complaints/ComplaintsList.jsx";
import ComplaintFormModal from "@/components/complaints/ComplaintFormModal.jsx";
import ComplaintDetailModal from "@/components/complaints/ComplaintDetailModal.jsx";
import ComplaintAnalytics from "@/components/complaints/ComplaintAnalytics.jsx";
import ComplaintSettingsPanel from "@/components/complaints/ComplaintSettingsPanel.jsx";

export default function CustomerComplaints() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
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

  const { data: complaints = [], refetch: refetchComplaints } = useQuery({
    queryKey: ["complaints", organizationId],
    queryFn: () => CustomerComplaintRepo.filter({ organization_id: organizationId }, "-created_date"),
    enabled: !!organizationId
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ["complaint_settings", organizationId],
    queryFn: () => ComplaintSettingsRepo.filter({ organization_id: organizationId }),
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

  const complaintSettings = settings[0] || {};

  const handleRefresh = () => {
    refetchComplaints();
    refetchSettings();
  };

  const openComplaints = complaints.filter(c => !["closed", "responded"].includes(c.status));
  const criticalOpen = openComplaints.filter(c => c.severity === "critical" || c.customer_impact === "illness_confirmed" || c.customer_impact === "hospitalization").length;
  const illnessComplaints = openComplaints.filter(c => ["illness_claimed", "illness_confirmed", "injury", "hospitalization"].includes(c.customer_impact)).length;
  const overdueComplaints = openComplaints.filter(c => c.response_due_date && new Date(c.response_due_date) < new Date()).length;
  const pendingResponse = complaints.filter(c => c.status === "pending_response").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50 to-pink-50">
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <MessageSquareWarning className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Customer Complaints</h1>
                  <p className="text-xs text-slate-500">Track, investigate, and resolve customer issues</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowFormModal(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Log Complaint
            </Button>
          </div>
        </div>
      </div>

      {(criticalOpen > 0 || illnessComplaints > 0 || overdueComplaints > 0) && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="text-sm text-rose-800">
              {criticalOpen > 0 && <span className="font-medium">{criticalOpen} critical complaint{criticalOpen > 1 ? "s" : ""} require attention. </span>}
              {illnessComplaints > 0 && <span className="font-medium">{illnessComplaints} illness-related complaint{illnessComplaints > 1 ? "s" : ""} open. </span>}
              {overdueComplaints > 0 && <span className="font-medium">{overdueComplaints} response{overdueComplaints > 1 ? "s" : ""} overdue.</span>}
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
                <span className="text-xs text-slate-500">Open</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-1">{openComplaints.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span className="text-xs text-slate-500">Critical/Illness</span>
              </div>
              <p className="text-2xl font-bold text-rose-600 mt-1">{criticalOpen + illnessComplaints}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-slate-500">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-orange-600 mt-1">{overdueComplaints}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-500">Pending Response</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{pendingResponse}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-slate-500">Closed (30d)</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {complaints.filter(c => c.status === "closed" && c.closed_at && new Date(c.closed_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
              </p>
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
            <TabsTrigger value="complaints" className="gap-2">
              <List className="w-4 h-4" />
              All Complaints
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
            <ComplaintDashboard complaints={complaints} onSelectComplaint={setSelectedComplaint} onNewComplaint={() => setShowFormModal(true)} />
          </TabsContent>

          <TabsContent value="complaints">
            <ComplaintsList complaints={complaints} onSelectComplaint={setSelectedComplaint} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="analytics">
            <ComplaintAnalytics complaints={complaints} capas={capas} />
          </TabsContent>

          <TabsContent value="settings">
            <ComplaintSettingsPanel settings={complaintSettings} organizationId={organizationId} employees={employees} onRefresh={handleRefresh} />
          </TabsContent>
        </Tabs>
      </div>

      <ComplaintFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        organizationId={organizationId}
        user={user}
        employees={employees}
        settings={complaintSettings}
        onSuccess={handleRefresh}
      />

      {selectedComplaint && (
        <ComplaintDetailModal
          open={!!selectedComplaint}
          onOpenChange={(open) => !open && setSelectedComplaint(null)}
          complaint={selectedComplaint}
          user={user}
          employees={employees}
          settings={complaintSettings}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}