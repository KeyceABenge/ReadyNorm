import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { 
  Plus, Search, GitBranch, Clock, MoreVertical,
  CheckCircle2, XCircle, PlayCircle, Upload, FileText,
  Loader2, MessageSquare
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import ChangeRequestFormModal from "./ChangeRequestFormModal";
import { DocumentChangeRequestRepo, ControlledDocumentRepo, DocumentVersionRepo } from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { toast } from "sonner";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700" },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700" }
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-600" },
  high: { label: "High", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Urgent", color: "bg-rose-100 text-rose-600" }
};

function addLogEntry(cr, action, userName) {
  return [
    ...(cr.activity_log || []),
    { action, by: userName, at: new Date().toISOString() }
  ];
}

export default function DocumentChangeRequests({ changeRequests, documents, trainingDocuments = [], organizationId, user, settings, onRefresh }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCR, setEditingCR] = useState(null);

  // Response modal state
  const [respondingCR, setRespondingCR] = useState(null);
  const [responseAction, setResponseAction] = useState(null);
  const [responseNote, setResponseNote] = useState("");
  const [revisionFile, setRevisionFile] = useState(null);
  const [changeSummary, setChangeSummary] = useState("");
  const [newVersion, setNewVersion] = useState("");
  const [responding, setResponding] = useState(false);

  const filtered = changeRequests.filter(cr => {
    if (!search) return true;
    return cr.request_number?.toLowerCase().includes(search.toLowerCase()) ||
           cr.document_title?.toLowerCase().includes(search.toLowerCase()) ||
           cr.description?.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // ── Status transitions ──────────────────────────────────────────────

  const handleSubmitCR = async (cr) => {
    await DocumentChangeRequestRepo.update(cr.id, {
      status: "submitted",
      activity_log: addLogEntry(cr, "Submitted for review", user?.full_name)
    });
    toast.success("Change request submitted for review");
    onRefresh();
  };

  const handleStartWork = async (cr) => {
    await DocumentChangeRequestRepo.update(cr.id, {
      status: "in_progress",
      assigned_to: user?.email,
      assigned_to_name: user?.full_name,
      activity_log: addLogEntry(cr, "Started work", user?.full_name)
    });
    toast.success("Change request moved to In Progress");
    onRefresh();
  };

  const handleCancel = async (cr) => {
    await DocumentChangeRequestRepo.update(cr.id, {
      status: "cancelled",
      activity_log: addLogEntry(cr, "Cancelled", user?.full_name)
    });
    toast.success("Change request cancelled");
    onRefresh();
  };

  const openResponseModal = (cr, action) => {
    setRespondingCR(cr);
    setResponseAction(action);
    setResponseNote("");
    setRevisionFile(null);
    setChangeSummary("");
    const doc = documents.find(d => d.id === cr.document_id);
    const curVer = doc?.current_version || doc?.version || "1.0";
    const parts = curVer.split(".");
    if (action === "complete") {
      setNewVersion(`${parts[0]}.${(parseInt(parts[1] || 0) + 1)}`);
    } else {
      setNewVersion(curVer);
    }
  };

  const closeResponseModal = () => {
    setRespondingCR(null);
    setResponseAction(null);
    setResponseNote("");
    setRevisionFile(null);
    setChangeSummary("");
    setNewVersion("");
  };

  const handleResponseSubmit = async () => {
    if (!respondingCR) return;
    setResponding(true);

    try {
      if (responseAction === "approve") {
        await DocumentChangeRequestRepo.update(respondingCR.id, {
          status: "approved",
          activity_log: addLogEntry(respondingCR, `Approved${responseNote ? ": " + responseNote : ""}`, user?.full_name)
        });
        toast.success("Change request approved");

      } else if (responseAction === "reject") {
        if (!responseNote.trim()) {
          toast.error("Please provide a reason for rejection");
          setResponding(false);
          return;
        }
        await DocumentChangeRequestRepo.update(respondingCR.id, {
          status: "rejected",
          activity_log: addLogEntry(respondingCR, `Rejected: ${responseNote}`, user?.full_name)
        });
        toast.success("Change request rejected");

      } else if (responseAction === "complete") {
        let fileUrl = null;
        if (revisionFile) {
          const result = await uploadFile(revisionFile);
          fileUrl = result.file_url;
        }

        const doc = documents.find(d => d.id === respondingCR.document_id);
        if (doc) {
          const todayStr = new Date().toISOString().split("T")[0];
          const reviewMonths = doc.review_frequency_months || 12;
          const nextReview = new Date();
          nextReview.setMonth(nextReview.getMonth() + reviewMonths);

          const updateData = {
            current_version: newVersion || doc.current_version,
            version: newVersion || doc.version,
            status: "effective",
            change_summary: changeSummary || respondingCR.description,
            effective_date: todayStr,
            next_review_date: nextReview.toISOString().split("T")[0],
          };
          if (fileUrl) updateData.file_url = fileUrl;
          if (revisionFile) updateData.file_name = revisionFile.name;
          await ControlledDocumentRepo.update(doc.id, updateData);

          await DocumentVersionRepo.create({
            organization_id: organizationId,
            document_id: doc.id,
            version_number: newVersion || "1.0",
            change_summary: changeSummary || respondingCR.description,
            file_url: fileUrl || doc.file_url,
            created_by: user?.email,
            created_by_name: user?.full_name,
            status: "active",
            effective_date: new Date().toISOString().split("T")[0]
          });
        }

        await DocumentChangeRequestRepo.update(respondingCR.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          activity_log: addLogEntry(
            respondingCR,
            `Completed — new version ${newVersion}${fileUrl ? " with updated file" : ""}${changeSummary ? ": " + changeSummary : ""}`,
            user?.full_name
          )
        });
        toast.success("Change request completed — document updated");
      }

      closeResponseModal();
      onRefresh();
    } catch (err) {
      console.error("Response error:", err);
      toast.error("Failed to process: " + (err.message || "Unknown error"));
    } finally {
      setResponding(false);
    }
  };

  // ── Determine available actions for a CR ────────────────────────────
  const getActions = (cr) => {
    const actions = [];
    switch (cr.status) {
      case "draft":
        actions.push({ label: "Edit", icon: MessageSquare, action: () => { setEditingCR(cr); setShowForm(true); } });
        actions.push({ label: "Submit for Review", icon: PlayCircle, action: () => handleSubmitCR(cr) });
        actions.push({ separator: true });
        actions.push({ label: "Cancel", icon: XCircle, action: () => handleCancel(cr), destructive: true });
        break;
      case "submitted":
      case "under_review":
        actions.push({ label: "Approve", icon: CheckCircle2, action: () => openResponseModal(cr, "approve") });
        actions.push({ label: "Reject", icon: XCircle, action: () => openResponseModal(cr, "reject"), destructive: true });
        actions.push({ separator: true });
        actions.push({ label: "Start Work", icon: PlayCircle, action: () => handleStartWork(cr) });
        break;
      case "approved":
        actions.push({ label: "Start Work", icon: PlayCircle, action: () => handleStartWork(cr) });
        break;
      case "in_progress":
        actions.push({ label: "Upload Revision & Complete", icon: Upload, action: () => openResponseModal(cr, "complete") });
        actions.push({ separator: true });
        actions.push({ label: "Cancel", icon: XCircle, action: () => handleCancel(cr), destructive: true });
        break;
      case "rejected":
        actions.push({ label: "Re-open as Draft", icon: MessageSquare, action: async () => {
          await DocumentChangeRequestRepo.update(cr.id, {
            status: "draft",
            activity_log: addLogEntry(cr, "Re-opened as draft", user?.full_name)
          });
          toast.success("Change request re-opened");
          onRefresh();
        }});
        break;
      default:
        break;
    }
    return actions;
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search change requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/80"
            />
          </div>
          <Button onClick={() => { setEditingCR(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-1.5" />
            New Change Request
          </Button>
        </div>
      </div>

      {/* Change Request Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-12 text-center">
            <GitBranch className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No change requests found</p>
          </div>
        ) : (
          filtered.map(cr => {
            const statusConfig = STATUS_CONFIG[cr.status] || STATUS_CONFIG.draft;
            const priorityConfig = PRIORITY_CONFIG[cr.priority] || PRIORITY_CONFIG.medium;
            const actions = getActions(cr);
            
            return (
              <Card key={cr.id} className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <GitBranch className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-sm font-medium text-slate-700">{cr.request_number || "DCR-DRAFT"}</span>
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                        <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
                      </div>
                      <p className="text-sm text-slate-900 font-medium line-clamp-1">
                        {cr.request_type === "new_document" ? "New Document" : cr.document_title || "Document Change"}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{cr.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>By {cr.requestor_name || cr.requested_by_name || "Unknown"}</span>
                        {cr.created_date && <span>{format(new Date(cr.created_date), "MMM d, yyyy")}</span>}
                        {cr.target_effective_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Target: {format(new Date(cr.target_effective_date), "MMM d")}
                          </span>
                        )}
                        {cr.assigned_to_name && (
                          <span className="text-purple-500">Assigned: {cr.assigned_to_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick action buttons for common transitions */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {cr.status === "submitted" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-7"
                          onClick={() => openResponseModal(cr, "approve")}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-purple-600 border-purple-200 hover:bg-purple-50 text-xs h-7"
                          onClick={() => handleStartWork(cr)}
                        >
                          <PlayCircle className="w-3.5 h-3.5 mr-1" />
                          Start
                        </Button>
                      </>
                    )}
                    {cr.status === "in_progress" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7"
                        onClick={() => openResponseModal(cr, "complete")}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        Upload & Complete
                      </Button>
                    )}
                    {cr.status === "approved" && (
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-xs h-7"
                        onClick={() => handleStartWork(cr)}
                      >
                        <PlayCircle className="w-3.5 h-3.5 mr-1" />
                        Start Work
                      </Button>
                    )}
                    {cr.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs h-7"
                        onClick={() => handleSubmitCR(cr)}
                      >
                        Submit
                      </Button>
                    )}

                    {/* Overflow menu */}
                    {actions.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map((a, i) =>
                            a.separator ? (
                              <DropdownMenuSeparator key={`sep-${i}`} />
                            ) : (
                              <DropdownMenuItem
                                key={a.label}
                                onClick={a.action}
                                className={a.destructive ? "text-rose-600 focus:text-rose-600" : ""}
                              >
                                {a.icon && <a.icon className="w-4 h-4 mr-2" />}
                                {a.label}
                              </DropdownMenuItem>
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Impact Assessment Preview */}
                {cr.impact_assessment && (
                  <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
                    {cr.impact_assessment.training_impact && (
                      <Badge variant="outline" className="text-[10px]">Training Impact</Badge>
                    )}
                    {cr.impact_assessment.process_impact && (
                      <Badge variant="outline" className="text-[10px]">Process Impact</Badge>
                    )}
                    {cr.impact_assessment.regulatory_impact && (
                      <Badge variant="outline" className="text-[10px]">Regulatory Impact</Badge>
                    )}
                    {cr.impact_assessment.customer_impact && (
                      <Badge variant="outline" className="text-[10px]">Customer Impact</Badge>
                    )}
                  </div>
                )}

                {/* Activity Log Preview (last 2 entries) */}
                {cr.activity_log?.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Recent Activity</p>
                    <div className="space-y-1">
                      {cr.activity_log.slice(-2).reverse().map((entry, i) => (
                        <p key={i} className="text-xs text-slate-500">
                          <span className="font-medium text-slate-600">{entry.by || "System"}</span>
                          {" — "}{entry.action}
                          {entry.at && <span className="text-slate-400 ml-1">({format(new Date(entry.at), "MMM d, h:mm a")})</span>}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <ChangeRequestFormModal
          open={showForm}
          onOpenChange={setShowForm}
          changeRequest={editingCR}
          documents={documents}
          trainingDocuments={trainingDocuments}
          organizationId={organizationId}
          user={user}
          onSaved={() => { setShowForm(false); onRefresh(); }}
        />
      )}

      {/* Response Modal (Approve / Reject / Complete with Upload) */}
      {respondingCR && (
        <Dialog open={!!respondingCR} onOpenChange={(open) => { if (!open) closeResponseModal(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {responseAction === "approve" && "Approve Change Request"}
                {responseAction === "reject" && "Reject Change Request"}
                {responseAction === "complete" && "Complete — Upload Revised Document"}
              </DialogTitle>
              <DialogDescription>
                {respondingCR.request_number} — {respondingCR.document_title || "Document Change"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Show original description */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Requested Change</p>
                <p className="text-sm text-slate-700">{respondingCR.description}</p>
              </div>

              {/* Approve: optional note */}
              {responseAction === "approve" && (
                <div>
                  <Label>Note (optional)</Label>
                  <Textarea
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    placeholder="Any comments on the approval..."
                    rows={2}
                  />
                </div>
              )}

              {/* Reject: required reason */}
              {responseAction === "reject" && (
                <div>
                  <Label>Reason for Rejection *</Label>
                  <Textarea
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    placeholder="Explain why this change request is being rejected..."
                    rows={3}
                  />
                </div>
              )}

              {/* Complete: upload file + version + summary */}
              {responseAction === "complete" && (
                <>
                  <div>
                    <Label>Upload Revised Document</Label>
                    <div className="mt-1 border-2 border-dashed rounded-lg p-4 text-center hover:border-indigo-300 transition-colors cursor-pointer"
                      onClick={() => document.getElementById("revision-file-input")?.click()}
                    >
                      {revisionFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <span className="text-sm font-medium text-slate-700">{revisionFile.name}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setRevisionFile(null); }}
                            className="text-slate-400 hover:text-slate-600 ml-2"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                          <p className="text-sm text-slate-500">Click to upload the revised file</p>
                          <p className="text-xs text-slate-400 mt-0.5">PDF, DOC, DOCX, XLS, or any file type</p>
                        </>
                      )}
                      <input
                        id="revision-file-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>New Version</Label>
                      <Input
                        value={newVersion}
                        onChange={(e) => setNewVersion(e.target.value)}
                        placeholder="e.g. 2.0"
                      />
                    </div>
                    <div>
                      <Label>Effective Date</Label>
                      <Input
                        type="date"
                        defaultValue={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Change Summary</Label>
                    <Textarea
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      placeholder="Describe what was changed in this revision..."
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeResponseModal} disabled={responding}>
                Cancel
              </Button>
              {responseAction === "approve" && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleResponseSubmit}
                  disabled={responding}
                >
                  {responding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Approve
                </Button>
              )}
              {responseAction === "reject" && (
                <Button
                  variant="destructive"
                  onClick={handleResponseSubmit}
                  disabled={responding}
                >
                  {responding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Reject
                </Button>
              )}
              {responseAction === "complete" && (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleResponseSubmit}
                  disabled={responding}
                >
                  {responding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Complete & Update Document
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}