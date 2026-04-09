// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  Truck, Plus, ArrowLeft, LayoutDashboard, List, Package,
  BarChart3, Settings, AlertCircle, CheckCircle2, FileWarning, Clock
} from "lucide-react";

import {
  OrganizationRepo, EmployeeRepo,
  SupplierRepo, SupplierMaterialRepo, SupplierNonconformanceRepo, SupplierSettingsRepo
} from "@/lib/adapters/database";
import { getCurrentUser } from "@/lib/adapters/auth";
import SupplierDashboard from "@/components/suppliers/SupplierDashboard.jsx";
import SupplierList from "@/components/suppliers/SupplierList.jsx";
import SupplierFormModal from "@/components/suppliers/SupplierFormModal.jsx";
import SupplierDetailModal from "@/components/suppliers/SupplierDetailModal.jsx";
import MaterialsList from "@/components/suppliers/MaterialsList.jsx";
import NonconformancesList from "@/components/suppliers/NonconformancesList.jsx";
import SupplierAnalytics from "@/components/suppliers/SupplierAnalytics.jsx";
import SupplierSettingsPanel from "@/components/suppliers/SupplierSettingsPanel.jsx";

export default function SupplierManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
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

  const { data: suppliers = [], refetch: refetchSuppliers } = useQuery({
    queryKey: ["suppliers", organizationId],
    queryFn: () => SupplierRepo.filter({ organization_id: organizationId }, "-created_date"),
    enabled: !!organizationId
  });

  const { data: materials = [], refetch: refetchMaterials } = useQuery({
    queryKey: ["supplier_materials", organizationId],
    queryFn: () => SupplierMaterialRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: nonconformances = [], refetch: refetchNCs } = useQuery({
    queryKey: ["supplier_ncs", organizationId],
    queryFn: () => SupplierNonconformanceRepo.filter({ organization_id: organizationId }, "-created_date"),
    enabled: !!organizationId
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ["supplier_settings", organizationId],
    queryFn: () => SupplierSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const supplierSettings = settings[0] || {};

  const handleRefresh = () => {
    refetchSuppliers();
    refetchMaterials();
    refetchNCs();
    refetchSettings();
  };

  const approvedSuppliers = suppliers.filter(s => s.status === "approved");
  const highRiskSuppliers = suppliers.filter(s => s.risk_rating === "high" || s.risk_rating === "critical");
  const openNCs = nonconformances.filter(nc => !["closed"].includes(nc.status));
  
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringDocs = suppliers.reduce((count, s) => {
    const expiring = (s.required_documents || []).filter(d => 
      d.expiration_date && new Date(d.expiration_date) < thirtyDaysFromNow
    ).length;
    return count + expiring;
  }, 0);

  const overdueReviews = suppliers.filter(s => 
    s.next_review_date && new Date(s.next_review_date) < now
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-teal-50">
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Supplier Management</h1>
                  <p className="text-xs text-slate-500">Manage suppliers, materials, and risks</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowFormModal(true)} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </div>
      </div>

      {(highRiskSuppliers.length > 0 || expiringDocs > 0 || overdueReviews > 0) && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              {highRiskSuppliers.length > 0 && <span className="font-medium">{highRiskSuppliers.length} high-risk supplier{highRiskSuppliers.length > 1 ? "s" : ""}. </span>}
              {expiringDocs > 0 && <span className="font-medium">{expiringDocs} document{expiringDocs > 1 ? "s" : ""} expiring soon. </span>}
              {overdueReviews > 0 && <span className="font-medium">{overdueReviews} review{overdueReviews > 1 ? "s" : ""} overdue.</span>}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-slate-500">Approved</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{approvedSuppliers.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span className="text-xs text-slate-500">High Risk</span>
              </div>
              <p className="text-2xl font-bold text-rose-600 mt-1">{highRiskSuppliers.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-slate-500">Open NCs</span>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-1">{openNCs.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-slate-500">Expiring Docs</span>
              </div>
              <p className="text-2xl font-bold text-orange-600 mt-1">{expiringDocs}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-500">Materials</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{materials.length}</p>
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
            <TabsTrigger value="suppliers" className="gap-2">
              <List className="w-4 h-4" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-2">
              <Package className="w-4 h-4" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="nonconformances" className="gap-2">
              <FileWarning className="w-4 h-4" />
              Nonconformances
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
            <SupplierDashboard suppliers={suppliers} materials={materials} nonconformances={nonconformances} onSelectSupplier={setSelectedSupplier} />
          </TabsContent>

          <TabsContent value="suppliers">
            <SupplierList suppliers={suppliers} onSelectSupplier={setSelectedSupplier} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="materials">
            <MaterialsList materials={materials} suppliers={suppliers} organizationId={organizationId} user={user} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="nonconformances">
            <NonconformancesList nonconformances={nonconformances} suppliers={suppliers} organizationId={organizationId} user={user} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="analytics">
            <SupplierAnalytics suppliers={suppliers} nonconformances={nonconformances} materials={materials} />
          </TabsContent>

          <TabsContent value="settings">
            <SupplierSettingsPanel settings={supplierSettings} organizationId={organizationId} employees={employees} onRefresh={handleRefresh} />
          </TabsContent>
        </Tabs>
      </div>

      <SupplierFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        organizationId={organizationId}
        user={user}
        settings={supplierSettings}
        onSuccess={handleRefresh}
      />

      {selectedSupplier && (
        <SupplierDetailModal
          open={!!selectedSupplier}
          onOpenChange={(open) => !open && setSelectedSupplier(null)}
          supplier={selectedSupplier}
          materials={materials.filter(m => m.supplier_id === selectedSupplier.id)}
          nonconformances={nonconformances.filter(nc => nc.supplier_id === selectedSupplier.id)}
          user={user}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}