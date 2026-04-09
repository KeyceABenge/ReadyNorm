import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { format } from "date-fns";
import { Building2, User, Calendar, Package, Image, History, Link2, CheckCircle2, Send, AlertTriangle } from "lucide-react";

const SEVERITY_CONFIG = { critical: { color: "bg-rose-100 text-rose-700", label: "Critical" }, major: { color: "bg-amber-100 text-amber-700", label: "Major" }, moderate: { color: "bg-yellow-100 text-yellow-700", label: "Moderate" }, minor: { color: "bg-slate-100 text-slate-600", label: "Minor" } };
const STATUS_CONFIG = { received: { color: "bg-slate-100 text-slate-700", label: "Received" }, under_investigation: { color: "bg-blue-100 text-blue-700", label: "Investigating" }, root_cause_identified: { color: "bg-amber-100 text-amber-700", label: "Root Cause Found" }, corrective_action: { color: "bg-purple-100 text-purple-700", label: "Corrective Action" }, pending_response: { color: "bg-teal-100 text-teal-700", label: "Pending Response" }, responded: { color: "bg-cyan-100 text-cyan-700", label: "Responded" }, closed: { color: "bg-emerald-100 text-emerald-700", label: "Closed" }, escalated: { color: "bg-red-100 text-red-700", label: "Escalated" } };
const COMPLAINT_TYPE_LABELS = { foreign_material: "Foreign Material", quality_defect: "Quality Defect", food_safety: "Food Safety", allergen: "Allergen", labeling: "Labeling", packaging: "Packaging", taste_odor: "Taste/Odor", appearance: "Appearance", short_weight: "Short Weight", spoilage: "Spoilage", other: "Other" };
const IMPACT_CONFIG = { none: { label: "No Impact" }, inconvenience: { label: "Inconvenience" }, illness_claimed: { label: "Illness Claimed", color: "bg-amber-100 text-amber-700" }, illness_confirmed: { label: "Illness Confirmed", color: "bg-rose-100 text-rose-700" }, injury: { label: "Injury", color: "bg-red-100 text-red-700" }, hospitalization: { label: "Hospitalization", color: "bg-red-200 text-red-800" } };
const ROOT_CAUSE_CATEGORIES = [{ value: "equipment", label: "Equipment" }, { value: "personnel", label: "Personnel" }, { value: "process", label: "Process" }, { value: "material", label: "Material/Ingredient" }, { value: "environment", label: "Environment" }, { value: "supplier", label: "Supplier" }, { value: "unknown", label: "Unknown" }, { value: "not_substantiated", label: "Not Substantiated" }];

export default function ComplaintDetailModal({ open, onOpenChange, complaint, user, employees, settings, onRefresh }) {
  const [activeTab, setActiveTab] = useState("details");
  const [isUpdating, setIsUpdating] = useState(false);
  const [investigationFindings, setInvestigationFindings] = useState(complaint.investigation_findings || "");
  const [rootCause, setRootCause] = useState(complaint.root_cause || "");
  const [rootCauseCategory, setRootCauseCategory] = useState(complaint.root_cause_category || "");
  const [correctiveActions, setCorrectiveActions] = useState(complaint.corrective_actions || "");
  const [preventiveActions, setPreventiveActions] = useState(complaint.preventive_actions || "");
  const [customerResponse, setCustomerResponse] = useState(complaint.customer_response || "");
  const [executiveSummary, setExecutiveSummary] = useState(complaint.executive_summary || "");
  const [compensationType, setCompensationType] = useState(complaint.compensation_type || "none");
  const [compensationNotes, setCompensationNotes] = useState(complaint.compensation_notes || "");

  const addActivityLog = (action, details) => [...(complaint.activity_log || []), { timestamp: new Date().toISOString(), action, user_email: user?.email, user_name: user?.full_name, details }];

  const updateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      const updates = { status: newStatus, activity_log: addActivityLog("status_change", `Status changed to ${STATUS_CONFIG[newStatus].label}`) };
      if (newStatus === "under_investigation" && !complaint.investigation_started_at) updates.investigation_started_at = new Date().toISOString();
      if (newStatus === "responded") { updates.response_sent_at = new Date().toISOString(); updates.response_sent_by = user?.email; }
      if (newStatus === "closed") { updates.closed_at = new Date().toISOString(); updates.closed_by = user?.email; updates.days_to_close = Math.ceil((new Date() - new Date(complaint.created_date)) / (1000 * 60 * 60 * 24)); }
      await CustomerComplaintRepo.update(complaint.id, updates);
      toast.success("Status updated"); onRefresh(); onOpenChange(false);
    } catch (e) { toast.error("Failed to update status"); }
    setIsUpdating(false);
  };

  const saveInvestigation = async () => {
    setIsUpdating(true);
    try {
      await CustomerComplaintRepo.update(complaint.id, {
        investigation_findings: investigationFindings, root_cause: rootCause, root_cause_category: rootCauseCategory,
        corrective_actions: correctiveActions, preventive_actions: preventiveActions,
        activity_log: addActivityLog("investigation_updated", "Investigation details updated")
      });
      toast.success("Investigation saved"); onRefresh();
    } catch (e) { toast.error("Failed to save"); }
    setIsUpdating(false);
  };

  const saveResponse = async () => {
    setIsUpdating(true);
    try {
      await CustomerComplaintRepo.update(complaint.id, {
        customer_response: customerResponse, compensation_type: compensationType, compensation_notes: compensationNotes,
        executive_summary: executiveSummary,
        activity_log: addActivityLog("response_drafted", "Customer response drafted")
      });
      toast.success("Response saved"); onRefresh();
    } catch (e) { toast.error("Failed to save"); }
    setIsUpdating(false);
  };

  const escalateToCapa = async () => {
    setIsUpdating(true);
    try {
      const capaNumber = `CAPA-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
      const capa = await CAPARepo.create({
        organization_id: complaint.organization_id, capa_id: capaNumber,
        title: `[Customer Complaint ${complaint.complaint_number}] ${complaint.complaint_type} - ${complaint.customer_name}`,
        status: "open", severity: complaint.severity, source: "incident", source_record_id: complaint.id, source_record_type: "customer_complaint",
        problem_description: `Customer: ${complaint.customer_name}\nProduct: ${complaint.product_name || "N/A"}\nLot: ${complaint.lot_number || "N/A"}\n\n${complaint.complaint_description}`,
        owner_email: complaint.assigned_to_email || user?.email, owner_name: complaint.assigned_to_name || user?.full_name
      });
      await CustomerComplaintRepo.update(complaint.id, {
        status: "escalated", linked_capa_id: capa.id, linked_capa_number: capaNumber,
        activity_log: addActivityLog("escalated_to_capa", `Escalated to CAPA ${capaNumber}`)
      });
      toast.success(`Created CAPA ${capaNumber}`); onRefresh(); onOpenChange(false);
    } catch (e) { toast.error("Failed to create CAPA"); }
    setIsUpdating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 mb-1">{complaint.complaint_number}</p>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-500" />
                {complaint.customer_name}
              </DialogTitle>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className={SEVERITY_CONFIG[complaint.severity]?.color}>{SEVERITY_CONFIG[complaint.severity]?.label}</Badge>
              <Badge className={STATUS_CONFIG[complaint.status]?.color}>{STATUS_CONFIG[complaint.status]?.label}</Badge>
              {complaint.customer_impact && IMPACT_CONFIG[complaint.customer_impact]?.color && (
                <Badge className={IMPACT_CONFIG[complaint.customer_impact]?.color}>{IMPACT_CONFIG[complaint.customer_impact]?.label}</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="investigation">Investigation</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Complaint Type</p>
                <p className="text-sm font-medium">{COMPLAINT_TYPE_LABELS[complaint.complaint_type]}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Customer Impact</p>
                <p className="text-sm font-medium">{IMPACT_CONFIG[complaint.customer_impact]?.label || "None"}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{complaint.complaint_description}</p>
            </div>

            {complaint.illness_details && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                <p className="text-xs text-rose-700 mb-1 font-medium">Illness/Injury Details</p>
                <p className="text-sm text-slate-700">{complaint.illness_details}</p>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Product</p>
                <p className="text-sm font-medium">{complaint.product_name || "—"}</p>
                {complaint.product_code && <p className="text-xs text-slate-400">Code: {complaint.product_code}</p>}
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Lot Number</p>
                <p className="text-sm font-medium">{complaint.lot_number || "—"}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Production Date</p>
                <p className="text-sm font-medium">{complaint.production_date ? format(new Date(complaint.production_date), "MMM d, yyyy") : "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Contact</p>
                <p className="text-sm font-medium">{complaint.customer_contact_name || "—"}</p>
                {complaint.customer_email && <p className="text-xs text-slate-400">{complaint.customer_email}</p>}
                {complaint.customer_phone && <p className="text-xs text-slate-400">{complaint.customer_phone}</p>}
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Timeline</p>
                <p className="text-xs">Received: {complaint.received_date ? format(new Date(complaint.received_date), "MMM d, yyyy") : "—"}</p>
                <p className="text-xs">Response Due: <span className={complaint.response_due_date && new Date(complaint.response_due_date) < new Date() && !["closed", "responded"].includes(complaint.status) ? "text-orange-600 font-medium" : ""}>{complaint.response_due_date ? format(new Date(complaint.response_due_date), "MMM d, yyyy") : "—"}</span></p>
              </div>
            </div>

            {complaint.linked_capa_id && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                <p className="text-xs text-rose-700 mb-1 font-medium flex items-center gap-1"><Link2 className="w-3 h-3" /> Linked CAPA</p>
                <p className="text-sm">{complaint.linked_capa_number}</p>
              </div>
            )}

            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium text-slate-700">Actions</p>
              <div className="flex flex-wrap gap-2">
                {complaint.status === "received" && <Button size="sm" variant="outline" onClick={() => updateStatus("under_investigation")}>Start Investigation</Button>}
                {complaint.status === "under_investigation" && <Button size="sm" variant="outline" onClick={() => updateStatus("root_cause_identified")}>Root Cause Identified</Button>}
                {complaint.status === "root_cause_identified" && <Button size="sm" variant="outline" onClick={() => updateStatus("corrective_action")}>Move to Corrective Action</Button>}
                {complaint.status === "corrective_action" && <Button size="sm" variant="outline" onClick={() => updateStatus("pending_response")}>Ready for Response</Button>}
                {complaint.status === "pending_response" && <Button size="sm" variant="outline" onClick={() => updateStatus("responded")}><Send className="w-4 h-4 mr-1" />Mark Responded</Button>}
                {complaint.status === "responded" && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus("closed")}><CheckCircle2 className="w-4 h-4 mr-1" />Close Complaint</Button>}
                {!["closed", "escalated"].includes(complaint.status) && !complaint.linked_capa_id && (
                  <Button size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={escalateToCapa}><AlertTriangle className="w-4 h-4 mr-1" />Escalate to CAPA</Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="investigation" className="space-y-4 mt-4">
            <div><Label>Investigation Findings</Label><Textarea value={investigationFindings} onChange={(e) => setInvestigationFindings(e.target.value)} placeholder="Document investigation findings..." rows={4} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Root Cause Category</Label>
                <Select value={rootCauseCategory} onValueChange={setRootCauseCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{ROOT_CAUSE_CATEGORIES.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Root Cause</Label><Textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="What was the root cause?" rows={3} /></div>
            <div><Label>Corrective Actions</Label><Textarea value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} placeholder="What actions were taken to correct the issue?" rows={3} /></div>
            <div><Label>Preventive Actions</Label><Textarea value={preventiveActions} onChange={(e) => setPreventiveActions(e.target.value)} placeholder="What actions will prevent recurrence?" rows={3} /></div>
            <Button onClick={saveInvestigation} disabled={isUpdating}>Save Investigation</Button>
          </TabsContent>

          <TabsContent value="response" className="space-y-4 mt-4">
            <div><Label>Customer Response</Label><Textarea value={customerResponse} onChange={(e) => setCustomerResponse(e.target.value)} placeholder="Draft official response to customer..." rows={6} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Compensation Type</Label>
                <Select value={compensationType} onValueChange={setCompensationType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="replacement">Replacement Product</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="coupon">Coupon/Credit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Compensation Notes</Label><Input value={compensationNotes} onChange={(e) => setCompensationNotes(e.target.value)} placeholder="Details..." /></div>
            </div>
            <div><Label>Executive Summary</Label><Textarea value={executiveSummary} onChange={(e) => setExecutiveSummary(e.target.value)} placeholder="Summary for management review..." rows={3} /></div>
            <Button onClick={saveResponse} disabled={isUpdating}>Save Response</Button>
          </TabsContent>

          <TabsContent value="evidence" className="mt-4">
            {complaint.evidence_urls?.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {complaint.evidence_urls.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-full h-32 object-cover rounded-lg border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Image className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No evidence attached</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="space-y-3">
              {(complaint.activity_log || []).slice().reverse().map((log, idx) => (
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
              {(!complaint.activity_log || complaint.activity_log.length === 0) && (
                <p className="text-sm text-slate-500 text-center py-4">No activity logged</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}