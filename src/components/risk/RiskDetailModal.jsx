// @ts-nocheck
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
import { TrendingUp, TrendingDown, Minus, History, Plus, CheckCircle2, AlertTriangle } from "lucide-react";

const RISK_LEVEL_CONFIG = { low: { color: "bg-emerald-100 text-emerald-700" }, medium: { color: "bg-yellow-100 text-yellow-700" }, high: { color: "bg-orange-100 text-orange-700" }, critical: { color: "bg-rose-100 text-rose-700" } };
const STATUS_CONFIG = { identified: { color: "bg-slate-100 text-slate-700", label: "Identified" }, assessing: { color: "bg-blue-100 text-blue-700", label: "Assessing" }, mitigating: { color: "bg-purple-100 text-purple-700", label: "Mitigating" }, monitoring: { color: "bg-cyan-100 text-cyan-700", label: "Monitoring" }, accepted: { color: "bg-amber-100 text-amber-700", label: "Accepted" }, closed: { color: "bg-emerald-100 text-emerald-700", label: "Closed" }, escalated: { color: "bg-rose-100 text-rose-700", label: "Escalated" } };
const TREND_ICONS = { improving: TrendingDown, stable: Minus, worsening: TrendingUp };
const TREND_COLORS = { improving: "text-emerald-500", stable: "text-slate-400", worsening: "text-rose-500" };

export default function RiskDetailModal({ open, onOpenChange, risk, user, employees, onRefresh }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);
  const [newAction, setNewAction] = useState({ action: "", owner_email: "", due_date: "" });
  const [reviewNotes, setReviewNotes] = useState("");

  const addLog = (action, details) => [...(risk.activity_log || []), { timestamp: new Date().toISOString(), action, user_email: user?.email, user_name: user?.full_name, details }];

  const updateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      const updates = { status: newStatus, activity_log: addLog("status_change", `Status changed to ${STATUS_CONFIG[newStatus].label}`) };
      if (newStatus === "closed") { updates.closed_at = new Date().toISOString(); updates.closed_by = user?.email; }
      await RiskEntryRepo.update(risk.id, updates);
      toast.success("Status updated"); onRefresh(); onOpenChange(false);
    } catch (e) { toast.error("Failed to update"); }
    setIsUpdating(false);
  };

  const updateTrend = async (newTrend) => {
    try {
      await RiskEntryRepo.update(risk.id, { trend: newTrend, activity_log: addLog("trend_update", `Trend updated to ${newTrend}`) });
      toast.success("Trend updated"); onRefresh();
    } catch (e) { toast.error("Failed to update"); }
  };

  const addMitigationAction = async () => {
    if (!newAction.action || !newAction.owner_email) { toast.error("Fill in action and owner"); return; }
    const owner = employees.find(e => e.email === newAction.owner_email);
    const actions = [...(risk.mitigation_actions || []), { action: newAction.action, owner_email: newAction.owner_email, owner_name: owner?.name, due_date: newAction.due_date, status: "pending" }];
    try {
      await RiskEntryRepo.update(risk.id, { mitigation_actions: actions, activity_log: addLog("action_added", `Mitigation action added`) });
      toast.success("Action added"); setNewAction({ action: "", owner_email: "", due_date: "" }); onRefresh();
    } catch (e) { toast.error("Failed to add"); }
  };

  const completeReview = async () => {
    const freqMonths = { weekly: 0.25, monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 }[risk.review_frequency] || 3;
    const reviewHistory = [...(risk.review_history || []), { date: new Date().toISOString(), reviewer: user?.full_name, notes: reviewNotes, risk_score_at_review: risk.risk_score }];
    try {
      await RiskEntryRepo.update(risk.id, {
        last_review_date: format(new Date(), "yyyy-MM-dd"),
        next_review_date: format(addMonths(new Date(), freqMonths), "yyyy-MM-dd"),
        review_history: reviewHistory,
        activity_log: addLog("review_completed", `Risk reviewed: ${reviewNotes || "No notes"}`)
      });
      toast.success("Review completed"); setReviewNotes(""); onRefresh();
    } catch (e) { toast.error("Failed to complete review"); }
  };

  const TrendIcon = TREND_ICONS[risk.trend] || Minus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 mb-1">{risk.risk_number}</p>
              <DialogTitle className="text-lg">{risk.title}</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Badge className={STATUS_CONFIG[risk.status]?.color}>{STATUS_CONFIG[risk.status]?.label}</Badge>
              <Badge className={RISK_LEVEL_CONFIG[risk.risk_level]?.color}>{risk.risk_level}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="controls">Controls & Actions</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500 mb-1">Risk Score</p>
                <p className="text-3xl font-bold text-slate-800">{risk.risk_score || "—"}</p>
                <p className="text-xs text-slate-500 mt-1">L:{risk.likelihood} × S:{risk.severity}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500 mb-1">Trend</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <TrendIcon className={`w-6 h-6 ${TREND_COLORS[risk.trend]}`} />
                  <span className="text-sm font-medium capitalize">{risk.trend}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500 mb-1">Category</p>
                <p className="text-sm font-medium capitalize mt-2">{risk.category?.replace(/_/g, " ")}</p>
              </div>
            </div>

            {risk.description && <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Description</p><p className="text-sm text-slate-700">{risk.description}</p></div>}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Owner</p><p className="text-sm font-medium">{risk.owner_name || "Not assigned"}</p></div>
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Source</p><p className="text-sm font-medium capitalize">{risk.source?.replace(/_/g, " ")}</p></div>
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Review Frequency</p><p className="text-sm font-medium capitalize">{risk.review_frequency?.replace(/_/g, " ")}</p></div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Next Review</p>
                <p className={`text-sm font-medium ${risk.next_review_date && new Date(risk.next_review_date) < new Date() ? "text-amber-600" : ""}`}>
                  {risk.next_review_date ? format(new Date(risk.next_review_date), "MMM d, yyyy") : "Not scheduled"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Label className="text-xs text-slate-500">Update Trend:</Label>
              {["improving", "stable", "worsening"].map(t => (
                <Button key={t} size="sm" variant={risk.trend === t ? "default" : "outline"} onClick={() => updateTrend(t)} className="capitalize">{t}</Button>
              ))}
            </div>

            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium text-slate-700">Actions</p>
              <div className="flex flex-wrap gap-2">
                {["assessing", "mitigating", "monitoring"].map(s => (
                  <Button key={s} size="sm" variant="outline" onClick={() => updateStatus(s)} disabled={risk.status === s}>{STATUS_CONFIG[s].label}</Button>
                ))}
                <Button size="sm" variant="outline" className="text-amber-600 border-amber-200" onClick={() => updateStatus("accepted")}>Accept Risk</Button>
                <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200" onClick={() => updateStatus("closed")}><CheckCircle2 className="w-4 h-4 mr-1" />Close</Button>
                <Button size="sm" variant="outline" className="text-rose-600 border-rose-200" onClick={() => updateStatus("escalated")}><AlertTriangle className="w-4 h-4 mr-1" />Escalate</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="controls" className="space-y-4 mt-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Controls in Place</p>
              {(risk.controls_in_place || []).length === 0 ? <p className="text-sm text-slate-500">No controls documented</p> : (
                <div className="space-y-2">
                  {risk.controls_in_place.map((c, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700">{c.control}</p>
                      <Badge className={c.effectiveness === "effective" ? "bg-emerald-100 text-emerald-700" : c.effectiveness === "partially_effective" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"} variant="secondary">{c.effectiveness}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Mitigation Actions</p>
              {(risk.mitigation_actions || []).length === 0 ? <p className="text-sm text-slate-500 mb-4">No actions</p> : (
                <div className="space-y-2 mb-4">
                  {risk.mitigation_actions.map((a, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-700">{a.action}</p>
                        <p className="text-xs text-slate-500">{a.owner_name} {a.due_date && `• Due: ${format(new Date(a.due_date), "MMM d")}`}</p>
                      </div>
                      <Badge className={a.status === "completed" ? "bg-emerald-100 text-emerald-700" : a.status === "overdue" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}>{a.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-3 bg-purple-50 rounded-lg space-y-3">
                <p className="text-sm font-medium text-purple-700">Add Action</p>
                <Input placeholder="Action description" value={newAction.action} onChange={(e) => setNewAction(prev => ({ ...prev, action: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newAction.owner_email} onValueChange={(v) => setNewAction(prev => ({ ...prev, owner_email: v }))}>
                    <SelectTrigger><SelectValue placeholder="Owner" /></SelectTrigger>
                    <SelectContent>{employees.map(e => (<SelectItem key={e.id} value={e.email}>{e.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <Input type="date" value={newAction.due_date} onChange={(e) => setNewAction(prev => ({ ...prev, due_date: e.target.value }))} />
                </div>
                <Button size="sm" onClick={addMitigationAction} className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-1" />Add</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-4 mt-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="text-sm font-medium text-purple-700 mb-3">Complete Risk Review</h3>
              <div className="mb-3"><Label>Review Notes</Label><Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Document review findings..." rows={3} /></div>
              <Button onClick={completeReview} className="bg-purple-600 hover:bg-purple-700">Complete Review</Button>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Review History</p>
              {(risk.review_history || []).length === 0 ? <p className="text-sm text-slate-500">No reviews completed</p> : (
                <div className="space-y-2">
                  {risk.review_history.slice().reverse().map((r, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{r.reviewer}</span>
                        <span className="text-xs text-slate-500">{format(new Date(r.date), "MMM d, yyyy")}</span>
                      </div>
                      {r.notes && <p className="text-sm text-slate-600">{r.notes}</p>}
                      <p className="text-xs text-slate-400 mt-1">Score at review: {r.risk_score_at_review}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="space-y-3">
              {(risk.activity_log || []).slice().reverse().map((log, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0"><History className="w-4 h-4 text-slate-500" /></div>
                  <div><p className="text-sm text-slate-700">{log.details}</p><p className="text-xs text-slate-400 mt-1">{log.user_name} • {format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}</p></div>
                </div>
              ))}
              {(!risk.activity_log || risk.activity_log.length === 0) && <p className="text-sm text-slate-500 text-center py-4">No activity</p>}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}