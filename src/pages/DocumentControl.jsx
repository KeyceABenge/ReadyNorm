import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getCurrentUser } from "@/lib/adapters/auth";
import {
  CAPARepo,
  ControlledDocumentRepo,
  DocumentAcknowledgmentRepo,
  DocumentChangeRequestRepo,
  DocumentControlSettingsRepo,
  DocumentVersionRepo,
  EmployeeRepo,
  OrganizationRepo,
  SiteSettingsRepo,
  TrainingRecordRepo
} from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, GitBranch, ClipboardCheck, Settings, FolderOpen, AlertTriangle, ArrowLeft, GraduationCap } from "lucide-react";
import DocumentLibrary from "@/components/document-control/DocumentLibrary";
import DocumentChangeRequests from "@/components/document-control/DocumentChangeRequests";
import DocumentReviewQueue from "@/components/document-control/DocumentReviewQueue";
import DocumentReports from "@/components/document-control/DocumentReports";
import DocumentControlSettingsPanel from "@/components/document-control/DocumentControlSettingsPanel";
import SyncTrainingDocsButton from "@/components/document-control/SyncTrainingDocsButton";

export default function DocumentControl() {
  const [activeTab, setActiveTab] = useState("library");
  const [organizationId, setOrganizationId] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const siteCode = localStorage.getItem("site_code");
      if (siteCode) {
        const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
        if (orgs.length > 0) setOrganizationId(orgs[0].id);
      }
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (e) {}
    };
    init();
  }, []);

  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ["controlled_documents", organizationId],
    queryFn: () => ControlledDocumentRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: versions = [], refetch: refetchVersions } = useQuery({
    queryKey: ["document_versions", organizationId],
    queryFn: () => DocumentVersionRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: changeRequests = [], refetch: refetchCRs } = useQuery({
    queryKey: ["change_requests", organizationId],
    queryFn: () => DocumentChangeRequestRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: acknowledgments = [], refetch: refetchAcks } = useQuery({
    queryKey: ["doc_acknowledgments", organizationId],
    queryFn: () => DocumentAcknowledgmentRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ["doc_control_settings", organizationId],
    queryFn: () => DocumentControlSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_doc", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const refetchAll = () => {
    refetchDocs();
    refetchVersions();
    refetchCRs();
    refetchAcks();
    refetchSettings();
  };

  if (docsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // Calculate stats
  const effectiveDocs = documents.filter(d => d.status === "effective").length;
  const pendingReview = documents.filter(d => d.status === "pending_review" || d.status === "pending_approval").length;
  const overdueReviews = documents.filter(d => d.next_review_date && new Date(d.next_review_date) < new Date()).length;
  const openCRs = changeRequests.filter(cr => !["completed", "cancelled", "rejected"].includes(cr.status)).length;
  const trainingLinkedDocs = documents.filter(d => d.training_document_id).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-orange-50">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link to={createPageUrl("QualityProgram")}>
              <Button variant="ghost" size="icon" className="mr-1">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="p-2.5 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-lg">
              <FolderOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Document Control</h1>
              <p className="text-sm text-slate-600">Manage policies, SOPs, and controlled documents</p>
            </div>
          </div>
          {organizationId && (
            <div className="mt-3 ml-14">
              <SyncTrainingDocsButton organizationId={organizationId} onSynced={refetchAll} />
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">Effective Documents</p>
            <p className="text-2xl font-bold text-emerald-600">{effectiveDocs}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">Pending Review</p>
            <p className="text-2xl font-bold text-amber-600">{pendingReview}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">Overdue Reviews</p>
            <p className="text-2xl font-bold text-rose-600">{overdueReviews}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">Open Change Requests</p>
            <p className="text-2xl font-bold text-blue-600">{openCRs}</p>
          </div>
        </div>

        {/* Training Docs Info */}
        {trainingLinkedDocs > 0 && (
          <div className="mb-6 bg-violet-50/80 backdrop-blur-sm border border-violet-200 rounded-2xl p-4 flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-violet-600" />
            <p className="text-sm text-violet-800">
              <span className="font-semibold">{trainingLinkedDocs} document{trainingLinkedDocs !== 1 ? "s" : ""}</span> synced from Training Documents (Sanitation)
            </p>
          </div>
        )}

        {/* Overdue Alert */}
        {overdueReviews > 0 && (
          <div className="mb-6 bg-rose-50/80 backdrop-blur-sm border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <p className="text-sm text-rose-800">
              <span className="font-semibold">{overdueReviews} document(s)</span> are overdue for review
            </p>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/60 backdrop-blur-xl border border-white/80 p-1 rounded-xl mb-6">
            <TabsTrigger value="library" className="data-[state=active]:bg-white rounded-lg">
              <FileText className="w-4 h-4 mr-1.5" />
              Library
            </TabsTrigger>
            <TabsTrigger value="changes" className="data-[state=active]:bg-white rounded-lg">
              <GitBranch className="w-4 h-4 mr-1.5" />
              Change Requests
              {openCRs > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">{openCRs}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="review" className="data-[state=active]:bg-white rounded-lg">
              <ClipboardCheck className="w-4 h-4 mr-1.5" />
              Review Queue
              {pendingReview > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full">{pendingReview}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white rounded-lg">
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white rounded-lg">
              <Settings className="w-4 h-4 mr-1.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <DocumentLibrary
              documents={documents}
              versions={versions}
              organizationId={organizationId}
              user={user}
              settings={settings[0]}
              onRefresh={refetchAll}
            />
          </TabsContent>

          <TabsContent value="changes">
            <DocumentChangeRequests
              changeRequests={changeRequests}
              documents={documents}
              organizationId={organizationId}
              user={user}
              settings={settings[0]}
              onRefresh={refetchAll}
            />
          </TabsContent>

          <TabsContent value="review">
            <DocumentReviewQueue
              documents={documents}
              versions={versions}
              changeRequests={changeRequests}
              organizationId={organizationId}
              user={user}
              onRefresh={refetchAll}
            />
          </TabsContent>

          <TabsContent value="reports">
            <DocumentReports
              documents={documents}
              versions={versions}
              changeRequests={changeRequests}
              acknowledgments={acknowledgments}
              employees={employees}
            />
          </TabsContent>

          <TabsContent value="settings">
            <DocumentControlSettingsPanel
              settings={settings[0]}
              organizationId={organizationId}
              employees={employees}
              onRefresh={refetchSettings}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}