import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, CAPARepo, CAPAActionRepo, CAPASettingsRepo } from "@/lib/adapters/database";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, Database, Settings, BarChart3, CheckCircle2, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import CAPADashboard from "@/components/capa/CAPADashboard";
import CAPADatabase from "@/components/capa/CAPADatabase";
import CAPASettingsPanel from "@/components/capa/CAPASettingsPanel";
import CAPAWizard from "@/components/capa/CAPAWizard";
import CAPADetailModal from "@/components/capa/CAPADetailModal";
import CAPAReports from "@/components/capa/CAPAReports";
import CAPAEffectivenessTracker from "@/components/capa/CAPAEffectivenessTracker";

export default function CAPAProgram() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCapa, setSelectedCapa] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        const siteCode = localStorage.getItem("site_code");
        if (siteCode) {
          const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
          if (orgs.length > 0) setOrganization(orgs[0]);
        }
      } catch (e) {
        console.error("Init error:", e);
      }
    };
    init();
  }, []);

  const { data: capas = [], refetch: refetchCapas } = useQuery({
    queryKey: ["capas", organization?.id],
    queryFn: () => CAPARepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
  });

  const { data: actions = [], refetch: refetchActions } = useQuery({
    queryKey: ["capa_actions", organization?.id],
    queryFn: () => CAPAActionRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["capa_settings", organization?.id],
    queryFn: () => CAPASettingsRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
  });

  const capaSettings = settings[0] || null;

  const handleCapaCreated = () => {
    setShowWizard(false);
    refetchCapas();
  };

  const handleCapaUpdated = async () => {
    const result = await refetchCapas();
    refetchActions();
    
    // Update selectedCapa with fresh data
    if (selectedCapa && result.data) {
      const updatedCapa = result.data.find(c => c.id === selectedCapa.id);
      if (updatedCapa) {
        setSelectedCapa(updatedCapa);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("QualityProgram")}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">CAPA Program</h1>
              <p className="text-sm text-slate-600">Corrective and Preventive Actions</p>
            </div>
          </div>
          <Button onClick={() => setShowWizard(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            New CAPA
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2">
              <Database className="w-4 h-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="effectiveness" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Effectiveness
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <CAPADashboard 
              capas={capas} 
              actions={actions}
              user={user}
              onCapaClick={setSelectedCapa}
            />
          </TabsContent>

          <TabsContent value="database">
            <CAPADatabase 
              capas={capas}
              actions={actions}
              settings={capaSettings}
              onCapaClick={setSelectedCapa}
              onRefresh={refetchCapas}
            />
          </TabsContent>

          <TabsContent value="effectiveness">
            <CAPAEffectivenessTracker
              capas={capas}
              user={user}
              onUpdate={handleCapaUpdated}
            />
          </TabsContent>

          <TabsContent value="reports">
            <CAPAReports
              capas={capas}
              actions={actions}
            />
          </TabsContent>

          <TabsContent value="settings">
            <CAPASettingsPanel 
              organization={organization}
              settings={capaSettings}
              onUpdate={() => {}}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* CAPA Creation Wizard */}
      {showWizard && (
        <CAPAWizard
          open={showWizard}
          onClose={() => setShowWizard(false)}
          organization={organization}
          user={user}
          settings={capaSettings}
          onCreated={handleCapaCreated}
        />
      )}

      {/* CAPA Detail Modal */}
      {selectedCapa && (
        <CAPADetailModal
          open={!!selectedCapa}
          onClose={() => setSelectedCapa(null)}
          capa={selectedCapa}
          organization={organization}
          user={user}
          allCapas={capas}
          onUpdate={handleCapaUpdated}
          onDelete={() => { setSelectedCapa(null); handleCapaUpdated(); }}
        />
      )}
    </div>
  );
}