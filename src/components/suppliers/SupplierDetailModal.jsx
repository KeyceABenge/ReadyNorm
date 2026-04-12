import { useState } from "react";
import { SupplierRepo } from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";
import { format } from "date-fns";
import { MapPin, Mail, Phone, FileText, History, CheckCircle2, AlertTriangle, Upload, Loader2 } from "lucide-react";

const RISK_CONFIG = { low: { color: "bg-emerald-100 text-emerald-700", label: "Low" }, medium: { color: "bg-yellow-100 text-yellow-700", label: "Medium" }, high: { color: "bg-orange-100 text-orange-700", label: "High" }, critical: { color: "bg-rose-100 text-rose-700", label: "Critical" } };
const STATUS_CONFIG = { pending_approval: { color: "bg-slate-100 text-slate-700", label: "Pending Approval" }, approved: { color: "bg-emerald-100 text-emerald-700", label: "Approved" }, conditional: { color: "bg-amber-100 text-amber-700", label: "Conditional" }, suspended: { color: "bg-rose-100 text-rose-700", label: "Suspended" }, disqualified: { color: "bg-red-100 text-red-700", label: "Disqualified" }, inactive: { color: "bg-slate-100 text-slate-600", label: "Inactive" } };

export default function SupplierDetailModal({ open, onOpenChange, supplier, materials, nonconformances, user, onRefresh }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const addActivityLog = (action, details) => [...(supplier.activity_log || []), { timestamp: new Date().toISOString(), action, user_email: user?.email, user_name: user?.full_name, details }];

  const updateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      const updates = { status: newStatus, activity_log: addActivityLog("status_change", `Status changed to ${STATUS_CONFIG[newStatus].label}`) };
      if (newStatus === "approved" && !supplier.approval_date) {
        updates.approval_date = format(new Date(), "yyyy-MM-dd");
        updates.approved_by = user?.email;
      }
      await SupplierRepo.update(supplier.id, updates);
      toast.success("Status updated"); onRefresh(); onOpenChange(false);
    } catch (e) { toast.error("Failed to update"); }
    setIsUpdating(false);
  };

  const handleDocumentUpload = async (docType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      const docs = [...(supplier.required_documents || [])];
      const idx = docs.findIndex(d => d.document_type === docType);
      if (idx >= 0) {
        docs[idx] = { ...docs[idx], on_file: true, document_url: file_url, uploaded_at: new Date().toISOString() };
      }
      await SupplierRepo.update(supplier.id, {
        required_documents: docs,
        activity_log: addActivityLog("document_uploaded", `Uploaded ${docType}`)
      });
      toast.success("Document uploaded"); onRefresh();
    } catch (e) { toast.error("Upload failed"); }
    setIsUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 mb-1">{supplier.supplier_code}</p>
              <DialogTitle className="text-lg">{supplier.name}</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Badge className={STATUS_CONFIG[supplier.status]?.color}>{STATUS_CONFIG[supplier.status]?.label}</Badge>
              <Badge className={RISK_CONFIG[supplier.risk_rating]?.color}>{RISK_CONFIG[supplier.risk_rating]?.label} Risk</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="materials">Materials ({materials.length})</TabsTrigger>
            <TabsTrigger value="nonconformances">NCs ({nonconformances.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Type</p>
                <p className="text-sm font-medium capitalize">{supplier.supplier_type}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Category</p>
                <p className="text-sm font-medium">{supplier.category || "—"}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Contact Information</p>
              <div className="space-y-1">
                {supplier.contact_name && <p className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{supplier.contact_name}</p>}
                {supplier.contact_email && <p className="text-sm text-slate-600">{supplier.contact_email}</p>}
                {supplier.contact_phone && <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{supplier.contact_phone}</p>}
              </div>
            </div>

            {(supplier.city || supplier.country) && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                <p className="text-sm">{[supplier.address, supplier.city, supplier.state, supplier.country].filter(Boolean).join(", ")}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-xs text-blue-600 mb-1">Performance</p>
                <p className="text-2xl font-bold text-blue-700">{supplier.performance_score || "—"}%</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-center">
                <p className="text-xs text-amber-600 mb-1">Total NCs</p>
                <p className="text-2xl font-bold text-amber-700">{supplier.total_nonconformances || 0}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-xs text-purple-600 mb-1">Materials</p>
                <p className="text-2xl font-bold text-purple-700">{materials.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Next Review</p>
                <p className={`text-sm font-medium ${supplier.next_review_date && new Date(supplier.next_review_date) < new Date() ? "text-orange-600" : ""}`}>
                  {supplier.next_review_date ? format(new Date(supplier.next_review_date), "MMM d, yyyy") : "Not scheduled"}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Approved Date</p>
                <p className="text-sm font-medium">{supplier.approval_date ? format(new Date(supplier.approval_date), "MMM d, yyyy") : "Not approved"}</p>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium text-slate-700">Actions</p>
              <div className="flex flex-wrap gap-2">
                {supplier.status === "pending_approval" && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus("approved")}><CheckCircle2 className="w-4 h-4 mr-1" />Approve</Button>}
                {supplier.status === "approved" && <Button size="sm" variant="outline" onClick={() => updateStatus("conditional")}>Mark Conditional</Button>}
                {["approved", "conditional"].includes(supplier.status) && <Button size="sm" variant="outline" className="text-rose-600 border-rose-200" onClick={() => updateStatus("suspended")}><AlertTriangle className="w-4 h-4 mr-1" />Suspend</Button>}
                {supplier.status === "suspended" && <Button size="sm" variant="outline" onClick={() => updateStatus("approved")}>Reinstate</Button>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <div className="space-y-3">
              {(supplier.required_documents || []).map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium capitalize">{doc.document_type.replace(/_/g, " ")}</p>
                    {doc.on_file ? (
                      <p className="text-xs text-emerald-600">On file {doc.expiration_date && `• Expires: ${format(new Date(doc.expiration_date), "MMM d, yyyy")}`}</p>
                    ) : (
                      <p className="text-xs text-amber-600">Missing</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.document_url && <a href={doc.document_url} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline"><FileText className="w-4 h-4 mr-1" />View</Button></a>}
                    <label>
                      <Button size="sm" variant="outline" disabled={isUploading} asChild>
                        <span>{isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-1" />Upload</>}</span>
                      </Button>
                      <input type="file" className="hidden" onChange={(e) => handleDocumentUpload(doc.document_type, e)} />
                    </label>
                  </div>
                </div>
              ))}
              {(!supplier.required_documents || supplier.required_documents.length === 0) && (
                <p className="text-sm text-slate-500 text-center py-4">No documents configured</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="materials" className="mt-4">
            {materials.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No materials from this supplier</p>
            ) : (
              <div className="space-y-2">
                {materials.map(mat => (
                  <div key={mat.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{mat.material_name}</p>
                        <p className="text-xs text-slate-500">{mat.material_code} • {mat.category}</p>
                      </div>
                      <Badge className={mat.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{mat.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="nonconformances" className="mt-4">
            {nonconformances.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No nonconformances recorded</p>
            ) : (
              <div className="space-y-2">
                {nonconformances.map(nc => (
                  <div key={nc.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-slate-400">{nc.nc_number}</p>
                        <p className="text-sm font-medium">{nc.nc_type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-slate-500">{nc.material_name || "—"} • {format(new Date(nc.created_date), "MMM d, yyyy")}</p>
                      </div>
                      <Badge className={nc.severity === "critical" ? "bg-rose-100 text-rose-700" : nc.severity === "major" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>{nc.severity}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="space-y-3">
              {(supplier.activity_log || []).slice().reverse().map((log, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <History className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">{log.details}</p>
                    <p className="text-xs text-slate-400 mt-1">{log.user_name} • {format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}</p>
                  </div>
                </div>
              ))}
              {(!supplier.activity_log || supplier.activity_log.length === 0) && (
                <p className="text-sm text-slate-500 text-center py-4">No activity logged</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}