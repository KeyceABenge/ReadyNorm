// @ts-nocheck
import { useState, useEffect } from "react";
import { OrganizationRepo, SSOPRepo, AssetRepo } from "@/lib/adapters/database";
import { getCurrentUser } from "@/lib/adapters/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Search, Brain, CheckCircle2, Clock, Archive, Eye, Pencil, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import SSOPGeneratorModal from "@/components/ssop/SSOPGeneratorModal";
import SSOPEditorModal from "@/components/ssop/SSOPEditorModal";
import SSOPViewerModal from "@/components/ssop/SSOPViewerModal";

const STATUS_CONFIG = {
  draft: { color: "bg-slate-100 text-slate-700", label: "Draft", icon: Pencil },
  pending_review: { color: "bg-amber-100 text-amber-700", label: "Pending Review", icon: Clock },
  approved: { color: "bg-emerald-100 text-emerald-700", label: "Approved", icon: CheckCircle2 },
  archived: { color: "bg-rose-100 text-rose-700", label: "Archived", icon: Archive }
};

export default function SSOPManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showGenerator, setShowGenerator] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedSsop, setSelectedSsop] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        const storedSiteCode = localStorage.getItem('site_code');
        if (!storedSiteCode) {
          window.location.href = createPageUrl("Home");
          return;
        }
        
        const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
        if (orgs.length > 0) {
          setOrgId(orgs[0].id);
        } else {
          localStorage.removeItem('site_code');
          window.location.href = createPageUrl("Home");
        }
      } catch (e) {
        window.location.href = createPageUrl("Home");
      }
    };
    init();
  }, []);

  const { data: ssops = [], isLoading } = useQuery({
    queryKey: ["ssops", orgId],
    queryFn: () => SSOPRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["ssop_assets", orgId],
    queryFn: () => AssetRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const filteredSsops = ssops.filter(ssop => {
    const matchesSearch = !searchQuery || 
      ssop.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ssop.asset_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ssop.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupedSsops = {
    draft: filteredSsops.filter(s => s.status === "draft"),
    pending_review: filteredSsops.filter(s => s.status === "pending_review"),
    approved: filteredSsops.filter(s => s.status === "approved"),
    archived: filteredSsops.filter(s => s.status === "archived")
  };

  const handleView = (ssop) => {
    setSelectedSsop(ssop);
    setShowViewer(true);
  };

  const handleEdit = (ssop) => {
    setSelectedSsop(ssop);
    setShowEditor(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-8 h-8" />
              SSOP Management
            </h1>
            <p className="text-slate-500 mt-1">Create, review, and manage sanitation procedures</p>
          </div>
          <Button onClick={() => setShowGenerator(true)} className="bg-purple-600 hover:bg-purple-700">
            <Brain className="w-4 h-4 mr-2" />
            Generate SSOP with AI
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const Icon = config.icon;
            const count = groupedSsops[status]?.length || 0;
            return (
              <Card key={status} className={statusFilter === status ? "ring-2 ring-slate-900" : ""}>
                <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter(status === statusFilter ? "all" : status)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{config.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search SSOPs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {statusFilter !== "all" && (
            <Button variant="outline" onClick={() => setStatusFilter("all")}>
              Clear Filter
            </Button>
          )}
        </div>

        {/* SSOP List */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({filteredSsops.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending Review ({groupedSsops.pending_review.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({groupedSsops.approved.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredSsops.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No SSOPs Found</h3>
                  <p className="text-slate-500 mb-4">Generate your first SSOP using AI</p>
                  <Button onClick={() => setShowGenerator(true)} className="bg-purple-600 hover:bg-purple-700">
                    <Brain className="w-4 h-4 mr-2" />
                    Generate SSOP
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredSsops.map(ssop => {
                  const statusConfig = STATUS_CONFIG[ssop.status];
                  const Icon = statusConfig.icon;
                  return (
                    <Card key={ssop.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900">{ssop.title}</h3>
                              <Badge className={statusConfig.color}>
                                <Icon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              {ssop.ai_generated && (
                                <Badge variant="outline" className="text-purple-600 border-purple-200">
                                  <Brain className="w-3 h-3 mr-1" />
                                  AI Generated
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">
                              {ssop.asset_name && `Asset: ${ssop.asset_name}`}
                              {ssop.area_name && ` • Area: ${ssop.area_name}`}
                              {ssop.cleaning_method && ` • Method: ${ssop.cleaning_method}`}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                              <span>Version {ssop.version || 1}</span>
                              {ssop.approved_at && <span>Approved: {format(new Date(ssop.approved_at), "MMM d, yyyy")}</span>}
                              {ssop.updated_date && <span>Updated: {format(new Date(ssop.updated_date), "MMM d, yyyy")}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleView(ssop)}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(ssop)}>
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {groupedSsops.pending_review.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-500">No SSOPs pending review</CardContent></Card>
            ) : (
              groupedSsops.pending_review.map(ssop => (
                <Card key={ssop.id} className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{ssop.title}</h3>
                        <p className="text-sm text-slate-500">Submitted by {ssop.submitted_by} on {ssop.submitted_at && format(new Date(ssop.submitted_at), "MMM d, yyyy")}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(ssop)}>Review</Button>
                        <Button size="sm" onClick={() => handleEdit(ssop)} className="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {groupedSsops.approved.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-500">No approved SSOPs yet</CardContent></Card>
            ) : (
              groupedSsops.approved.map(ssop => (
                <Card key={ssop.id} className="border-emerald-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{ssop.title}</h3>
                        <p className="text-sm text-slate-500">Approved by {ssop.approved_by} • Version {ssop.version}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(ssop)}>View</Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(ssop)}>New Revision</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showGenerator && (
        <SSOPGeneratorModal
          organizationId={orgId}
          assets={assets}
          onClose={() => setShowGenerator(false)}
          onGenerated={() => {
            queryClient.invalidateQueries({ queryKey: ["ssops"] });
            setShowGenerator(false);
          }}
        />
      )}

      {showEditor && selectedSsop && (
        <SSOPEditorModal
          ssop={selectedSsop}
          user={user}
          onClose={() => { setShowEditor(false); setSelectedSsop(null); }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["ssops"] });
            setShowEditor(false);
            setSelectedSsop(null);
          }}
        />
      )}

      {showViewer && selectedSsop && (
        <SSOPViewerModal
          ssop={selectedSsop}
          onClose={() => { setShowViewer(false); setSelectedSsop(null); }}
          onEdit={() => { setShowViewer(false); setShowEditor(true); }}
        />
      )}
    </div>
  );
}