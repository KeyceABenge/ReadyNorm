import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { MapPin, User, Calendar, CheckCircle2, Image, History } from "lucide-react";

const SEVERITY_CONFIG = { critical: { color: "bg-rose-100 text-rose-700", label: "Critical" }, major: { color: "bg-amber-100 text-amber-700", label: "Major" }, moderate: { color: "bg-yellow-100 text-yellow-700", label: "Moderate" }, minor: { color: "bg-slate-100 text-slate-600", label: "Minor" } };
const STATUS_CONFIG = { open: { color: "bg-slate-100 text-slate-700", label: "Open" }, under_review: { color: "bg-blue-100 text-blue-700", label: "Under Review" }, containment: { color: "bg-amber-100 text-amber-700", label: "Containment" }, corrective_action: { color: "bg-purple-100 text-purple-700", label: "Corrective Action" }, capa_required: { color: "bg-rose-100 text-rose-700", label: "CAPA Required" }, pending_verification: { color: "bg-teal-100 text-teal-700", label: "Pending Verification" }, closed: { color: "bg-emerald-100 text-emerald-700", label: "Closed" }, escalated: { color: "bg-red-100 text-red-700", label: "Escalated" } };
const CATEGORY_LABELS = { quality: "Quality", food_safety: "Food Safety", sanitation: "Sanitation", pest: "Pest Control", environmental: "Environmental", audit: "Audit", customer: "Customer", operational: "Operational", other: "Other" };

export default function IssueDetailModal({ open, onOpenChange, issue, user, employees, settings, onRefresh }) {
  const [activeTab, setActiveTab] = useState("details");
  const [isUpdating, setIsUpdating] = useState(false);
  const [rootCause, setRootCause] = useState(issue.root_cause || "");
  const [correctiveActions, setCorrectiveActions] = useState(issue.corrective_actions || "");
  const [preventiveActions, setPreventiveActions] = useState(issue.preventive_actions || "");
  const [verificationNotes, setVerificationNotes] = useState("");

  const addActivityLog = (action, details) => [...(issue.activity_log || []), { timestamp: new Date().toISOString(), action, user_email: user?.email, user_name: user?.full_name, details }];

  const updateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      const updates = { status: newStatus, activity_log: addActivityLog("status_change", `Status changed to ${STATUS_CONFIG[newStatus].label}`) };
      if (newStatus === "closed") { updates.closed_at = new Date().toISOString(); updates.closed_by = user?.email; }
      await IssueRepo.update(issue.id, updates);
      toast.success("Status updated");
      onRefresh(); onOpenChange(false);
    } catch (e) { toast.error("Failed to update status"); }
    setIsUpdating(false);
  };

  const saveRootCauseAndActions = async () => {
    setIsUpdating(true);
    try {
      await IssueRepo.update(issue.id, { root_cause: rootCause, corrective_actions: correctiveActions, preventive_actions: preventiveActions, activity_log: addActivityLog("investigation_updated", "Root cause and actions updated") });
      toast.success("Investigation saved"); onRefresh();
    } catch (e) { toast.error("Failed to save"); }
    setIsUpdating(false);
  };

  const verifyAndClose = async () => {
    setIsUpdating(true);
    try {
      await IssueRepo.update(issue.id, { status: "closed", verified_at: new Date().toISOString(), verified_by: user?.email, verification_notes: verificationNotes, closed_at: new Date().toISOString(), closed_by: user?.email, activity_log: addActivityLog("verified_and_closed", "Issue verified and closed") });
      toast.success("Issue verified and closed"); onRefresh(); onOpenChange(false);
    } catch (e) { toast.error("Failed to close issue"); }
    setIsUpdating(false);
  };

  const escalateToCapa = async () => {
    setIsUpdating(true);
    try {
      const capaNumber = `CAPA-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
      const capa = await CAPARepo.create({
        organization_id: issue.organization_id, capa_id: capaNumber, title: `[From Issue ${issue.issue_number}] ${issue.title}`,
        status: "open", severity: issue.severity, source: issue.category === "sanitation" ? "sanitation" : issue.category === "pest" ? "pest" : issue.category === "environmental" ? "emp" : issue.category === "audit" ? "audit" : "other",
        source_record_id: issue.id, source_record_type: "issue", area_id: issue.area_id, area_name: issue.area_name,
        production_line_id: issue.production_line_id, production_line_name: issue.production_line_name,
        problem_description: issue.description, containment_actions: issue.containment_actions,
        owner_email: issue.assigned_to_email || user?.email, owner_name: issue.assigned_to_name || user?.full_name
      });
      await IssueRepo.update(issue.id, { status: "capa_required", linked_capa_id: capa.id, linked_capa_number: capaNumber, escalated_at: new Date().toISOString(), escalated_by: user?.email, activity_log: addActivityLog("escalated_to_capa", `Escalated to CAPA ${capaNumber}`) });
      toast.success(`Created CAPA ${capaNumber}`); onRefresh(); onOpenChange(false);
    } catch (e) { toast.error("Failed to create CAPA"); }
    setIsUpdating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div><p className="text-xs font-mono text-slate-400 mb-1">{issue.issue_number}</p><DialogTitle className="text-lg">{issue.title}</DialogTitle></div>
            <div className="flex gap-2"><Badge className={SEVERITY_CONFIG[issue.severity]?.color}>{SEVERITY_CONFIG[issue.severity]?.label}</Badge><Badge className={STATUS_CONFIG[issue.status]?.color}>{STATUS_CONFIG[issue.status]?.label}</Badge></div>
          </div>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList><TabsTrigger value="details">Details</TabsTrigger><TabsTrigger value="investigation">Investigation</TabsTrigger><TabsTrigger value="evidence">Evidence</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Category</p><p className="text-sm font-medium">{CATEGORY_LABELS[issue.category]}</p></div>
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Reported By</p><p className="text-sm font-medium">{issue.reported_by_name}</p><p className="text-xs text-slate-400">{issue.reported_at ? format(new Date(issue.reported_at), "MMM d, yyyy h:mm a") : "—"}</p></div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p><p className="text-sm">{[issue.area_name, issue.production_line_name, issue.specific_location].filter(Boolean).join(" • ") || "Not specified"}</p></div>
            <div><p className="text-xs text-slate-500 mb-1">Description</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{issue.description}</p></div>
            {issue.containment_actions && <div className="p-3 bg-amber-50 rounded-lg border border-amber-100"><p className="text-xs text-amber-700 mb-1 font-medium">Containment Actions</p><p className="text-sm text-slate-700">{issue.containment_actions}</p></div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Assigned To</p><p className="text-sm font-medium">{issue.assigned_to_name || "Unassigned"}</p></div>
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Due Date</p><p className={`text-sm font-medium ${issue.due_date && new Date(issue.due_date) < new Date() && issue.status !== "closed" ? "text-orange-600" : ""}`}>{issue.due_date ? format(new Date(issue.due_date), "MMM d, yyyy") : "Not set"}</p></div>
            </div>
            {issue.linked_capa_id && <div className="p-3 bg-rose-50 rounded-lg border border-rose-100"><p className="text-xs text-rose-700 mb-1 font-medium">Linked CAPA</p><p className="text-sm text-slate-700">{issue.linked_capa_number}</p></div>}
            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium text-slate-700">Actions</p>
              <div className="flex flex-wrap gap-2">
                {issue.status === "open" && <><Button size="sm" variant="outline" onClick={() => updateStatus("under_review")}>Start Review</Button><Button size="sm" variant="outline" onClick={() => updateStatus("containment")}>Move to Containment</Button></>}
                {issue.status === "under_review" && <Button size="sm" variant="outline" onClick={() => updateStatus("containment")}>Move to Containment</Button>}
                {issue.status === "containment" && <Button size="sm" variant="outline" onClick={() => updateStatus("corrective_action")}>Move to Corrective Action</Button>}
                {issue.status === "corrective_action" && <Button size="sm" variant="outline" onClick={() => updateStatus("pending_verification")}>Submit for Verification</Button>}
                {!["closed", "capa_required"].includes(issue.status) && !issue.linked_capa_id && <Button size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={escalateToCapa}>Escalate to CAPA</Button>}
              </div>
              {issue.status === "pending_verification" && <div className="space-y-2 pt-2"><Label>Verification Notes</Label><Textarea value={verificationNotes} onChange={(e) => setVerificationNotes(e.target.value)} placeholder="Document verification findings..." rows={2} /><Button onClick={verifyAndClose} disabled={isUpdating} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4 mr-2" />Verify & Close</Button></div>}
            </div>
          </TabsContent>
          <TabsContent value="investigation" className="space-y-4 mt-4">
            <div><Label>Root Cause</Label><Textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="What was the root cause of this issue?" rows={3} /></div>
            <div><Label>Corrective Actions</Label><Textarea value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} placeholder="What actions were taken to correct the issue?" rows={3} /></div>
            <div><Label>Preventive Actions</Label><Textarea value={preventiveActions} onChange={(e) => setPreventiveActions(e.target.value)} placeholder="What actions will prevent recurrence?" rows={3} /></div>
            <Button onClick={saveRootCauseAndActions} disabled={isUpdating}>Save Investigation</Button>
          </TabsContent>
          <TabsContent value="evidence" className="mt-4">
            {issue.evidence_urls?.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">{issue.evidence_urls.map((url, idx) => (<a key={idx} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" className="w-full h-32 object-cover rounded-lg border hover:opacity-80 transition-opacity" /></a>))}</div>
            ) : (<div className="text-center py-8"><Image className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No evidence attached</p></div>)}
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <div className="space-y-3">
              {(issue.activity_log || []).slice().reverse().map((log, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0"><History className="w-4 h-4 text-slate-500" /></div>
                  <div><p className="text-sm text-slate-700">{log.details}</p><p className="text-xs text-slate-400 mt-1">{log.user_name} • {format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}</p></div>
                </div>
              ))}
              {(!issue.activity_log || issue.activity_log.length === 0) && <p className="text-sm text-slate-500 text-center py-4">No activity logged</p>}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}