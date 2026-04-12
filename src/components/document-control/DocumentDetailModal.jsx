import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Download, Users, Clock, 
  CheckCircle2, AlertTriangle, Calendar, Building2, Tag
} from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  pending_review: { label: "Pending Review", color: "bg-amber-100 text-amber-700" },
  pending_approval: { label: "Pending Approval", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  effective: { label: "Effective", color: "bg-emerald-100 text-emerald-700" },
  superseded: { label: "Superseded", color: "bg-orange-100 text-orange-700" },
  obsolete: { label: "Obsolete", color: "bg-rose-100 text-rose-700" }
};

export default function DocumentDetailModal({ open, onOpenChange, document, versions, initialTab, onRefresh }) {
  const [activeTab, setActiveTab] = useState(initialTab || "details");

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, document]);
  
  if (!document) return null;

  const statusConfig = STATUS_CONFIG[document.status] || STATUS_CONFIG.draft;
  const isOverdue = document.next_review_date && new Date(document.next_review_date) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-slate-100 rounded-xl">
                <FileText className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-mono text-slate-500">{document.document_number}</p>
                <DialogTitle className="text-lg">{document.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                  <Badge variant="outline">v{document.current_version}</Badge>
                </div>
              </div>
            </div>
            {document.file_url && (
              <Button variant="outline" size="sm" onClick={() => window.open(document.file_url, "_blank")}>
                <Download className="w-4 h-4 mr-1.5" />
                Download
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            {/* Description */}
            {document.description && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-700">{document.description}</p>
              </div>
            )}

            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Department:</span>
                  <span className="font-medium">{document.department || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Category:</span>
                  <span className="font-medium">{document.category || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Author:</span>
                  <span className="font-medium">{document.author_name || "-"}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Effective:</span>
                  <span className="font-medium">
                    {document.effective_date ? format(new Date(document.effective_date), "MMM d, yyyy") : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Next Review:</span>
                  <span className={`font-medium ${isOverdue ? "text-rose-600" : ""}`}>
                    {isOverdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                    {document.next_review_date ? format(new Date(document.next_review_date), "MMM d, yyyy") : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Review Frequency:</span>
                  <span className="font-medium">{document.review_frequency_months || 12} months</span>
                </div>
              </div>
            </div>

            {/* Regulatory References */}
            {document.regulatory_references?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Regulatory References</p>
                <div className="flex flex-wrap gap-2">
                  {document.regulatory_references.map((ref, i) => (
                    <Badge key={i} variant="outline">{ref}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {document.keywords?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {document.keywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Change Summary */}
            {document.change_summary && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-1">Latest Changes (v{document.current_version})</p>
                <p className="text-sm text-blue-700">{document.change_summary}</p>
                {document.change_rationale && (
                  <p className="text-sm text-blue-600 mt-2">
                    <span className="font-medium">Rationale:</span> {document.change_rationale}
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="space-y-3">
              {versions.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No version history available</p>
              ) : (
                versions.sort((a, b) => (b.version_number || b.version || "").localeCompare(a.version_number || a.version || "")).map(ver => (
                  <div key={ver.id} className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{ver.version_number || ver.version}</Badge>
                        <Badge className={STATUS_CONFIG[ver.status]?.color || "bg-slate-100"}>
                          {STATUS_CONFIG[ver.status]?.label || ver.status}
                        </Badge>
                      </div>
                      {ver.effective_date && (
                        <span className="text-xs text-slate-500">
                          Effective: {format(new Date(ver.effective_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    {ver.change_summary && (
                      <p className="text-sm text-slate-700 mt-2">{ver.change_summary}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      By {ver.created_by_name || ver.author_name || "Unknown"} • {ver.created_date ? format(new Date(ver.created_date), "MMM d, yyyy h:mm a") : "-"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="links" className="mt-4">
            <div className="space-y-4">
              {document.linked_tasks?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Linked Tasks ({document.linked_tasks.length})</p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-600">{document.linked_tasks.length} task(s) linked</p>
                  </div>
                </div>
              )}
              {document.linked_audit_standards?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Audit Standards ({document.linked_audit_standards.length})</p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-600">{document.linked_audit_standards.length} standard(s) linked</p>
                  </div>
                </div>
              )}
              {document.linked_capa_ids?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Related CAPAs ({document.linked_capa_ids.length})</p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-600">{document.linked_capa_ids.length} CAPA(s) linked</p>
                  </div>
                </div>
              )}
              {!document.linked_tasks?.length && !document.linked_audit_standards?.length && !document.linked_capa_ids?.length && (
                <p className="text-center py-8 text-slate-500">No links configured</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="training" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-4">
                {document.requires_training ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-sm">Training Required</p>
                      <p className="text-xs text-slate-500">Users must acknowledge reading this document</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-sm">No Training Required</p>
                      <p className="text-xs text-slate-500">This document does not require acknowledgment</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}