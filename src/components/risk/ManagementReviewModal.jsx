// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle2, Users } from "lucide-react";

const REVIEW_TYPES = ["monthly", "quarterly", "semi_annual", "annual", "special"];
const STATUS_CONFIG = { draft: "Draft", scheduled: "Scheduled", in_progress: "In Progress", pending_approval: "Pending Approval", completed: "Completed" };

export default function ManagementReviewModal({ open, onOpenChange, review, risks, organizationId, user, settings, employees, onSuccess }) {
  const isNew = !review;
  const [activeTab, setActiveTab] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "", review_type: "quarterly", scheduled_date: "", facilitator_email: "",
    attendees: [], agenda_items: [], executive_summary: "", key_findings: [], decisions: [], action_items: [], improvement_opportunities: []
  });
  const [newAttendee, setNewAttendee] = useState("");
  const [newFinding, setNewFinding] = useState("");
  const [newOpportunity, setNewOpportunity] = useState("");
  const [newDecision, setNewDecision] = useState({ decision: "", rationale: "" });
  const [newAction, setNewAction] = useState({ action: "", owner_email: "", due_date: "", priority: "medium" });

  useEffect(() => {
    if (review) {
      setFormData({
        title: review.title || "", review_type: review.review_type || "quarterly",
        scheduled_date: review.scheduled_date || "", facilitator_email: review.facilitator_email || "",
        attendees: review.attendees || [], agenda_items: review.agenda_items || settings?.standard_agenda_items || [],
        executive_summary: review.executive_summary || "", key_findings: review.key_findings || [],
        decisions: review.decisions || [], action_items: review.action_items || [], improvement_opportunities: review.improvement_opportunities || []
      });
    } else {
      setFormData(prev => ({ ...prev, agenda_items: settings?.standard_agenda_items || [] }));
    }
  }, [review, settings]);

  const activeRisks = risks.filter(r => !["closed", "accepted"].includes(r.status));
  const criticalRisks = activeRisks.filter(r => r.risk_level === "critical" || r.risk_level === "high");

  const handleSave = async (status = "draft") => {
    if (!formData.title) { toast.error("Enter a title"); return; }
    setIsSubmitting(true);
    try {
      const facilitator = employees.find(e => e.email === formData.facilitator_email);
      const data = {
        organization_id: organizationId,
        review_number: review?.review_number || `MR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
        title: formData.title, review_type: formData.review_type, status,
        scheduled_date: formData.scheduled_date, facilitator_email: formData.facilitator_email, facilitator_name: facilitator?.name,
        attendees: formData.attendees, agenda_items: formData.agenda_items,
        executive_summary: formData.executive_summary, key_findings: formData.key_findings,
        decisions: formData.decisions, action_items: formData.action_items, improvement_opportunities: formData.improvement_opportunities,
        risk_review: criticalRisks.map(r => ({ risk_id: r.id, risk_title: r.title, current_score: r.risk_score }))
      };
      if (status === "completed") { data.completed_at = new Date().toISOString(); data.completed_by = user?.email; data.actual_date = format(new Date(), "yyyy-MM-dd"); }
      
      if (review) await ManagementReviewRepo.update(review.id, data);
      else await ManagementReviewRepo.create(data);
      
      toast.success(status === "completed" ? "Review completed" : "Review saved");
      onOpenChange(false); onSuccess();
    } catch (e) { toast.error("Failed to save"); }
    setIsSubmitting(false);
  };

  const addAttendee = () => {
    if (!newAttendee) return;
    const emp = employees.find(e => e.email === newAttendee);
    if (emp && !formData.attendees.some(a => a.email === newAttendee)) {
      setFormData(prev => ({ ...prev, attendees: [...prev.attendees, { email: emp.email, name: emp.name, attended: false }] }));
    }
    setNewAttendee("");
  };

  const addFinding = () => { if (newFinding) { setFormData(prev => ({ ...prev, key_findings: [...prev.key_findings, newFinding] })); setNewFinding(""); } };
  const addOpportunity = () => { if (newOpportunity) { setFormData(prev => ({ ...prev, improvement_opportunities: [...prev.improvement_opportunities, newOpportunity] })); setNewOpportunity(""); } };
  
  const addDecision = () => {
    if (newDecision.decision) {
      setFormData(prev => ({ ...prev, decisions: [...prev.decisions, { ...newDecision, made_by: user?.full_name, timestamp: new Date().toISOString() }] }));
      setNewDecision({ decision: "", rationale: "" });
    }
  };

  const addAction = () => {
    if (!newAction.action || !newAction.owner_email) return;
    const owner = employees.find(e => e.email === newAction.owner_email);
    setFormData(prev => ({ ...prev, action_items: [...prev.action_items, { ...newAction, owner_name: owner?.name, status: "pending" }] }));
    setNewAction({ action: "", owner_email: "", due_date: "", priority: "medium" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "New Management Review" : review.title}</DialogTitle>
          {!isNew && <Badge className="w-fit">{STATUS_CONFIG[review.status]}</Badge>}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="risks">Risk Review</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Q1 2026 Management Review" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Type</Label>
                <Select value={formData.review_type} onValueChange={(v) => setFormData(prev => ({ ...prev, review_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REVIEW_TYPES.map(t => (<SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Scheduled Date</Label><Input type="date" value={formData.scheduled_date} onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))} /></div>
              <div><Label>Facilitator</Label>
                <Select value={formData.facilitator_email} onValueChange={(v) => setFormData(prev => ({ ...prev, facilitator_email: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{employees.map(e => (<SelectItem key={e.id} value={e.email}>{e.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2"><Users className="w-4 h-4" />Attendees</Label>
              <div className="flex gap-2 mt-2">
                <Select value={newAttendee} onValueChange={setNewAttendee}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Add attendee" /></SelectTrigger>
                  <SelectContent>{employees.filter(e => !formData.attendees.some(a => a.email === e.email)).map(e => (<SelectItem key={e.id} value={e.email}>{e.name}</SelectItem>))}</SelectContent>
                </Select>
                <Button onClick={addAttendee}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.attendees.map((a, idx) => (
                  <Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">{a.name}<button onClick={() => setFormData(prev => ({ ...prev, attendees: prev.attendees.filter((_, i) => i !== idx) }))}><Trash2 className="w-3 h-3 text-rose-500" /></button></Badge>
                ))}
              </div>
            </div>
            <div><Label>Executive Summary</Label><Textarea value={formData.executive_summary} onChange={(e) => setFormData(prev => ({ ...prev, executive_summary: e.target.value }))} placeholder="High-level summary..." rows={4} /></div>
          </TabsContent>

          <TabsContent value="agenda" className="space-y-4 mt-4">
            <p className="text-sm text-slate-500">Standard agenda items for the review meeting.</p>
            <div className="space-y-2">
              {formData.agenda_items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.duration_minutes} min • {item.category}</p>
                  </div>
                  <Badge variant="outline">{item.status || "pending"}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="risks" className="space-y-4 mt-4">
            <p className="text-sm text-slate-500">High and critical risks requiring management attention ({criticalRisks.length} total)</p>
            <div className="space-y-2">
              {criticalRisks.map(risk => (
                <div key={risk.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{risk.title}</span>
                    <Badge className={risk.risk_level === "critical" ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"}>{risk.risk_level}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">Score: {risk.risk_score} • {risk.category?.replace(/_/g, " ")}</p>
                </div>
              ))}
              {criticalRisks.length === 0 && <p className="text-sm text-emerald-600 text-center py-4">No high/critical risks</p>}
            </div>
          </TabsContent>

          <TabsContent value="findings" className="space-y-4 mt-4">
            <div>
              <Label>Key Findings</Label>
              <div className="flex gap-2 mt-2"><Input value={newFinding} onChange={(e) => setNewFinding(e.target.value)} placeholder="Add finding..." onKeyDown={(e) => e.key === "Enter" && addFinding()} /><Button onClick={addFinding}><Plus className="w-4 h-4" /></Button></div>
              <div className="space-y-2 mt-2">{formData.key_findings.map((f, idx) => (<div key={idx} className="p-2 bg-slate-50 rounded flex items-center justify-between"><span className="text-sm">{f}</span><button onClick={() => setFormData(prev => ({ ...prev, key_findings: prev.key_findings.filter((_, i) => i !== idx) }))}><Trash2 className="w-4 h-4 text-rose-500" /></button></div>))}</div>
            </div>
            <div>
              <Label>Improvement Opportunities</Label>
              <div className="flex gap-2 mt-2"><Input value={newOpportunity} onChange={(e) => setNewOpportunity(e.target.value)} placeholder="Add opportunity..." onKeyDown={(e) => e.key === "Enter" && addOpportunity()} /><Button onClick={addOpportunity}><Plus className="w-4 h-4" /></Button></div>
              <div className="space-y-2 mt-2">{formData.improvement_opportunities.map((o, idx) => (<div key={idx} className="p-2 bg-emerald-50 rounded flex items-center justify-between"><span className="text-sm">{o}</span><button onClick={() => setFormData(prev => ({ ...prev, improvement_opportunities: prev.improvement_opportunities.filter((_, i) => i !== idx) }))}><Trash2 className="w-4 h-4 text-rose-500" /></button></div>))}</div>
            </div>
            <div>
              <Label>Decisions Made</Label>
              <div className="flex gap-2 mt-2">
                <Input value={newDecision.decision} onChange={(e) => setNewDecision(prev => ({ ...prev, decision: e.target.value }))} placeholder="Decision..." className="flex-1" />
                <Input value={newDecision.rationale} onChange={(e) => setNewDecision(prev => ({ ...prev, rationale: e.target.value }))} placeholder="Rationale" className="flex-1" />
                <Button onClick={addDecision}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-2 mt-2">{formData.decisions.map((d, idx) => (<div key={idx} className="p-2 bg-purple-50 rounded"><p className="text-sm font-medium">{d.decision}</p>{d.rationale && <p className="text-xs text-slate-500">{d.rationale}</p>}</div>))}</div>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4 mt-4">
            <div className="p-3 bg-purple-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-purple-700">Add Action Item</p>
              <Input placeholder="Action description" value={newAction.action} onChange={(e) => setNewAction(prev => ({ ...prev, action: e.target.value }))} />
              <div className="grid grid-cols-3 gap-3">
                <Select value={newAction.owner_email} onValueChange={(v) => setNewAction(prev => ({ ...prev, owner_email: v }))}>
                  <SelectTrigger><SelectValue placeholder="Owner" /></SelectTrigger>
                  <SelectContent>{employees.map(e => (<SelectItem key={e.id} value={e.email}>{e.name}</SelectItem>))}</SelectContent>
                </Select>
                <Input type="date" value={newAction.due_date} onChange={(e) => setNewAction(prev => ({ ...prev, due_date: e.target.value }))} />
                <Select value={newAction.priority} onValueChange={(v) => setNewAction(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={addAction}><Plus className="w-4 h-4 mr-1" />Add Action</Button>
            </div>
            <div className="space-y-2">
              {formData.action_items.map((a, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{a.action}</p>
                    <p className="text-xs text-slate-500">{a.owner_name} {a.due_date && `• Due: ${format(new Date(a.due_date), "MMM d")}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={a.priority === "high" ? "bg-rose-100 text-rose-700" : a.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>{a.priority}</Badge>
                    <button onClick={() => setFormData(prev => ({ ...prev, action_items: prev.action_items.filter((_, i) => i !== idx) }))}><Trash2 className="w-4 h-4 text-rose-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={isSubmitting}>Save Draft</Button>
          <Button variant="outline" onClick={() => handleSave("scheduled")} disabled={isSubmitting}>Schedule</Button>
          <Button onClick={() => handleSave("completed")} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
            <CheckCircle2 className="w-4 h-4 mr-1" />Complete Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}