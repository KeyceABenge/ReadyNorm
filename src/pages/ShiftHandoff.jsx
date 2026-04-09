import { useState, useEffect } from "react";
import { OrganizationRepo, ShiftHandoffRepo, SiteSettingsRepo as HandoffSettingsRepo } from "@/lib/adapters/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Settings, History, Loader2, ArrowLeft, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import HandoffGenerator from "@/components/handoff/HandoffGenerator";
import HandoffViewer from "@/components/handoff/HandoffViewer";
import HandoffHistory from "@/components/handoff/HandoffHistory";
import HandoffSettingsPanel from "@/components/handoff/HandoffSettingsPanel";

export default function ShiftHandoffPage() {
  const [organizationId, setOrganizationId] = useState(null);
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedHandoff, setSelectedHandoff] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadOrg = async () => {
      // CRITICAL: Get organization_id ONLY from site_code in localStorage
      const siteCode = localStorage.getItem("site_code");
      if (!siteCode) {
        window.location.href = createPageUrl("Home");
        return;
      }
      
      const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
      if (orgs.length > 0) {
        setOrganizationId(orgs[0].id);
      } else {
        localStorage.removeItem('site_code');
        window.location.href = createPageUrl("Home");
      }
    };
    loadOrg();
  }, []);

  const { data: handoffs = [], isLoading: handoffsLoading } = useQuery({
    queryKey: ["shift_handoffs", organizationId],
    queryFn: () => ShiftHandoffRepo.filter({ organization_id: organizationId }, "-generated_at", 50),
    enabled: !!organizationId
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["handoff_settings", organizationId],
    queryFn: () => HandoffSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const currentSettings = settings[0] || { default_hours: 12, email_recipients: [] };

  const handleViewHandoff = (handoff) => {
    setSelectedHandoff(handoff);
    setActiveTab("view");
  };

  const handleNewHandoff = () => {
    setSelectedHandoff(null);
    setActiveTab("generate");
  };

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("ManagerDashboard")}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Shift Handoff</h1>
                  <p className="text-sm text-slate-500">Shift transition summaries</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:flex">
                <Sparkles className="w-3 h-3 mr-1 text-indigo-500" />
                Agent
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate
            </TabsTrigger>
            {selectedHandoff && (
              <TabsTrigger value="view" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                View
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
              {handoffs.length > 0 && (
                <Badge variant="secondary" className="ml-1">{handoffs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <HandoffGenerator 
              organizationId={organizationId}
              settings={currentSettings}
              onGenerated={(handoff) => {
                setSelectedHandoff(handoff);
                setActiveTab("view");
                queryClient.invalidateQueries({ queryKey: ["shift_handoffs"] });
              }}
            />
          </TabsContent>

          <TabsContent value="view">
            {selectedHandoff && (
              <HandoffViewer 
                handoff={selectedHandoff}
                organizationId={organizationId}
                settings={currentSettings}
                onUpdate={(updated) => {
                  setSelectedHandoff(updated);
                  queryClient.invalidateQueries({ queryKey: ["shift_handoffs"] });
                }}
                onNewHandoff={handleNewHandoff}
              />
            )}
          </TabsContent>

          <TabsContent value="history">
            <HandoffHistory 
              handoffs={handoffs}
              isLoading={handoffsLoading}
              onView={handleViewHandoff}
            />
          </TabsContent>

          <TabsContent value="settings">
            <HandoffSettingsPanel 
              organizationId={organizationId}
              settings={currentSettings}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["handoff_settings"] })}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}