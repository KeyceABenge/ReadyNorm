import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, User, Calendar, AlertTriangle,
  MessageSquare, Paperclip, Activity, Send, Check, RotateCcw, Loader2, Brain, Plus, Sparkles, Lightbulb, Pencil, Users, Trash2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CAPAIntelligence from "./CAPAIntelligence";
import CAPAEvidenceUploader from "./CAPAEvidenceUploader";
import CAPAActionEditModal from "./CAPAActionEditModal";
import { toast } from "sonner";
import { format, differenceInDays, isBefore, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CAPAActionRepo,
  CAPACommentRepo,
  CAPARepo
} from "@/lib/adapters/database";

const severityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800"
};

const statusColors = {
  draft: "bg-slate-100 text-slate-800",
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  pending_verification: "bg-purple-100 text-purple-800",
  closed: "bg-green-100 text-green-800",
  reopened: "bg-red-100 text-red-800"
};

const actionStatusColors = {
  pending: "bg-slate-100 text-slate-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  verified: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800"
};

function CAPAActionForm({ capa, organization, user, onAdd }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionData, setActionData] = useState({
    action_type: "corrective",
    title: "",
    owner_email: user?.email || "",
    owner_name: user?.full_name || "",
    due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    priority: "medium",
  });

  const handleSubmit = async () => {
    if (!actionData.title.trim()) {
      toast.error("Please enter an action title");
      return;
    }
    if (!actionData.owner_email.trim()) {
      toast.error("Please enter an owner email");
      return;
    }

    setIsSubmitting(true);
    try {
      await CAPAActionRepo.create({
        organization_id: organization.id,
        capa_id: capa.id,
        capa_number: capa.capa_id,
        ...actionData,
        status: "pending",
      });
      
      await CAPACommentRepo.create({
        organization_id: organization.id,
        capa_id: capa.id,
        author_email: user?.email,
        author_name: user?.full_name,
        content: `Added ${actionData.action_type} action: ${actionData.title}`,
        comment: `Added ${actionData.action_type} action: ${actionData.title}`,
        comment_type: "action_update",
      });

      setActionData({
        action_type: "corrective",
        title: "",
        owner_email: user?.email || "",
        owner_name: user?.full_name || "",
        due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        priority: "medium",
      });
      setIsExpanded(false);
      onAdd();
      toast.success("Action added");
    } catch (error) {
      toast.error("Failed to add action");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button 
        variant="outline" 
        onClick={() => setIsExpanded(true)}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Action Item
      </Button>
    );
  }

  return (
    <Card className="p-4 border-amber-200 bg-amber-50">
      <h4 className="font-medium mb-3">Add New Action</h4>
      <div className="space-y-3">
        <div className="flex gap-3">
          <Select
            value={actionData.action_type}
            onValueChange={(val) => setActionData({ ...actionData, action_type: val })}
          >
            <SelectTrigger className="w-40 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corrective">Corrective</SelectItem>
              <SelectItem value="preventive">Preventive</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="flex-1 bg-white"
            placeholder="Action description..."
            value={actionData.title}
            onChange={(e) => setActionData({ ...actionData, title: e.target.value })}
          />
        </div>
        <div className="flex gap-3">
          <Input
            className="flex-1 bg-white"
            placeholder="Owner email"
            value={actionData.owner_email}
            onChange={(e) => setActionData({ ...actionData, owner_email: e.target.value })}
          />
          <Input
            className="flex-1 bg-white"
            placeholder="Owner name"
            value={actionData.owner_name}
            onChange={(e) => setActionData({ ...actionData, owner_name: e.target.value })}
          />
        </div>
        <div className="flex gap-3">
          <Input
            type="date"
            className="w-40 bg-white"
            value={actionData.due_date}
            onChange={(e) => setActionData({ ...actionData, due_date: e.target.value })}
          />
          <Select
            value={actionData.priority}
            onValueChange={(val) => setActionData({ ...actionData, priority: val })}
          >
            <SelectTrigger className="w-32 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => setIsExpanded(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Action"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function CAPADetailModal({ open, onClose, capa, organization, user, onUpdate, onDelete, allCapas = [] }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isGeneratingContainment, setIsGeneratingContainment] = useState(false);
  const [generatingWhyIndex, setGeneratingWhyIndex] = useState(null);
  const [isGeneratingRootCause, setIsGeneratingRootCause] = useState(false);
  const [isGeneratingActions, setIsGeneratingActions] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [editingAction, setEditingAction] = useState(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeData, setCloseData] = useState({ verification_method: "", effectiveness_criteria: "" });
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

  // Auto-generate root cause when all 5 whys are answered
  useEffect(() => {
    if (isEditing && editData.five_whys) {
      const allAnswered = editData.five_whys.every(w => w.answer && w.answer.trim());
      const noRootCause = !editData.root_cause_statement || editData.root_cause_statement.trim() === "";
      
      if (allAnswered && noRootCause && !isGeneratingRootCause) {
        generateRootCauseFromWhys();
      }
    }
  }, [editData.five_whys]);

  const generateRootCauseFromWhys = async () => {
    if (!editData.five_whys || isGeneratingRootCause) return;
    
    setIsGeneratingRootCause(true);
    try {
      const whysContext = editData.five_whys
        .filter(w => w.answer)
        .map(w => `Why ${w.why_number}: ${w.answer}`)
        .join("\n");

      const result = await invokeLLM({
        prompt: `Based on the following 5 Whys root cause analysis for a food safety/sanitation issue, generate:
1. A clear, concise root cause statement (1-2 sentences)
2. Contributing factors that may have played a role (2-3 bullet points)

Problem: ${editData.problem_description}

5 Whys Analysis:
${whysContext}

${capa?.category ? `Category: ${capa.category}` : ""}
${capa?.area_name ? `Area: ${capa.area_name}` : ""}

Focus on systemic issues, not individual blame. Be specific and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            root_cause_statement: { type: "string" },
            contributing_factors: { type: "string" }
          }
        }
      });
      
      setEditData(prev => ({
        ...prev,
        root_cause_statement: result.root_cause_statement,
        contributing_factors: result.contributing_factors
      }));
      toast.success("Root cause analysis generated from 5 Whys");
    } catch (error) {
      console.error("Failed to generate root cause:", error);
    } finally {
      setIsGeneratingRootCause(false);
    }
  };

  // Initialize edit data from capa - only reset when not editing
  useEffect(() => {
    if (capa && !isEditing) {
      setEditData({
        problem_description: capa.problem_description || "",
        containment_actions: capa.containment_actions || "",
        root_cause_statement: capa.root_cause_statement || "",
        contributing_factors: capa.contributing_factors || "",
        five_whys: capa.five_whys?.length > 0 ? capa.five_whys : [
          { why_number: 1, question: "Why did this happen?", answer: "" },
          { why_number: 2, question: "Why?", answer: "" },
          { why_number: 3, question: "Why?", answer: "" },
          { why_number: 4, question: "Why?", answer: "" },
          { why_number: 5, question: "Why?", answer: "" }
        ],
        effectiveness_criteria: capa.effectiveness_criteria || "",
        owner_email: capa.owner_email || "",
        owner_name: capa.owner_name || "",
        verification_method: capa.verification_method || "",
        category: capa.category || "",
        source: capa.source || "other",
        area_name: capa.area_name || "",
        department: capa.department || "",
      });
    }
  }, [capa]);

  const { data: actions = [], refetch: refetchActions } = useQuery({
    queryKey: ["capa_actions", capa?.id],
    queryFn: () => CAPAActionRepo.filter({ capa_id: capa.id }),
    enabled: !!capa?.id,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["capa_comments", capa?.id],
    queryFn: () => CAPACommentRepo.filter({ capa_id: capa.id }),
    enabled: !!capa?.id,
  });

  const daysOpen = capa ? differenceInDays(new Date(), new Date(capa.created_date)) : 0;
  
  const nextDueAction = actions
    .filter(a => a.status !== "completed" && a.status !== "verified")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

  const completedActions = actions.filter(a => a.status === "completed" || a.status === "verified");
  const pendingActions = actions.filter(a => a.status !== "completed" && a.status !== "verified");

  const addComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await CAPACommentRepo.create({
        organization_id: organization.id,
        capa_id: capa.id,
        author_email: user?.email,
        author_name: user?.full_name,
        content: newComment,
        comment: newComment,
        comment_type: "comment",
      });
      setNewComment("");
      refetchComments();
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateActionStatus = async (action, newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user?.email;
      }
      
      await CAPAActionRepo.update(action.id, updateData);
      
      await CAPACommentRepo.create({
        organization_id: organization.id,
        capa_id: capa.id,
        author_email: user?.email,
        author_name: user?.full_name,
        content: `Action "${action.title}" marked as ${newStatus}`,
        comment: `Action "${action.title}" marked as ${newStatus}`,
        comment_type: "action_update",
      });
      
      refetchActions();
      refetchComments();
      onUpdate();
      toast.success("Action updated");
    } catch (error) {
      toast.error("Failed to update action");
    }
  };

  const updateCapaStatus = async (newStatus) => {
    try {
      const updateData = { status: newStatus };
      
      if (newStatus === "closed") {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = user?.email;
        
        // Set effectiveness check date
        const checkDays = capa.effectiveness_check_days?.[0] || 30;
        updateData.next_effectiveness_check = format(addDays(new Date(), checkDays), "yyyy-MM-dd");
      }
      
      if (newStatus === "reopened") {
        updateData.reopened_at = new Date().toISOString();
        updateData.reopened_by = user?.email;
      }
      
      await CAPARepo.update(capa.id, updateData);
      
      await CAPACommentRepo.create({
        organization_id: organization.id,
        capa_id: capa.id,
        author_email: user?.email,
        author_name: user?.full_name,
        content: `CAPA status changed to ${newStatus}`,
        comment: `CAPA status changed to ${newStatus}`,
        comment_type: "status_change",
      });
      
      onUpdate();
      toast.success("CAPA updated");
    } catch (error) {
      toast.error("Failed to update CAPA");
    }
  };

  const deleteCapa = async () => {
    setIsDeleting(true);
    try {
      // Delete related comments and actions first
      const commentsToDelete = comments || [];
      for (const c of commentsToDelete) {
        try { await CAPACommentRepo.delete(c.id); } catch (_) {}
      }
      const actionsToDelete = actions || [];
      for (const a of actionsToDelete) {
        try { await CAPAActionRepo.delete(a.id); } catch (_) {}
      }
      await CAPARepo.delete(capa.id);
      toast.success("CAPA deleted");
      onClose();
      if (onDelete) onDelete();
      else onUpdate();
    } catch (error) {
      console.error("Failed to delete CAPA:", error);
      toast.error("Failed to delete CAPA");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const sendReminder = async (action) => {
    try {
      await sendEmail({
        to: action.owner_email,
        subject: `[Reminder] CAPA Action Due: ${action.title}`,
        body: `
This is a reminder that you have a CAPA action item due.

CAPA: ${capa.capa_id} - ${capa.title}
Action: ${action.title}
Due Date: ${action.due_date}
Status: ${action.status}

Please log in to complete this action.
        `.trim()
      });
      
      await CAPAActionRepo.update(action.id, {
        reminder_sent_at: new Date().toISOString(),
        reminders_sent: (action.reminders_sent || 0) + 1
      });
      
      toast.success("Reminder sent");
      refetchActions();
    } catch (error) {
      toast.error("Failed to send reminder");
    }
  };

  if (!capa) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-slate-500">{capa.capa_id}</span>
                <Badge className={statusColors[capa.status]}>
                  {capa.status.replace("_", " ")}
                </Badge>
                <Badge className={severityColors[capa.severity]}>
                  {capa.severity}
                </Badge>
              </div>
              <DialogTitle className="text-xl">{capa.title}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {!confirmDelete ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    onClick={deleteCapa}
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span>{capa.owner_name || "Unassigned"}</span>
              {isEditing && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => {}}>
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{daysOpen} days open</span>
            </div>
            {nextDueAction && (
              <div className={cn(
                "flex items-center gap-2",
                isBefore(new Date(nextDueAction.due_date), new Date()) ? "text-red-600" : ""
              )}>
                <Calendar className="w-4 h-4" />
                <span>Next due: {format(new Date(nextDueAction.due_date), "MMM d")}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span>{completedActions.length}/{actions.length} actions complete</span>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="root_cause">Root Cause</TabsTrigger>
            <TabsTrigger value="actions">Actions ({actions.length})</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="intelligence">
              <Brain className="w-4 h-4 mr-1" />
              AI
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Problem Description</CardTitle>
                {!isEditing && capa.status !== "closed" && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editData.problem_description}
                    onChange={(e) => setEditData({ ...editData, problem_description: e.target.value })}
                    rows={4}
                    placeholder="Describe the problem in detail..."
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{capa.problem_description || <span className="text-slate-400 italic">No description provided</span>}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Containment Actions (Immediate)</CardTitle>
                {isEditing && editData.problem_description && !editData.containment_actions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsGeneratingContainment(true);
                      try {
                        const result = await invokeLLM({
                          prompt: `Based on the following food safety/sanitation problem, suggest 2-4 immediate containment actions that should be taken to prevent further issues. Be specific and actionable.

Problem Description:
${editData.problem_description}

${capa.category ? `Category: ${capa.category}` : ""}
${capa.area_name ? `Area: ${capa.area_name}` : ""}

Provide only the containment actions as a bulleted list, no introduction or explanation. Focus on immediate actions to contain/isolate the issue.`,
                          response_json_schema: {
                            type: "object",
                            properties: {
                              containment_actions: {
                                type: "string",
                                description: "Bulleted list of containment actions"
                              }
                            }
                          }
                        });
                        setEditData({ ...editData, containment_actions: result.containment_actions });
                      } catch (error) {
                        toast.error("Failed to generate suggestions");
                      } finally {
                        setIsGeneratingContainment(false);
                      }
                    }}
                    disabled={isGeneratingContainment}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    {isGeneratingContainment ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    Suggest Actions
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editData.containment_actions}
                      onChange={(e) => setEditData({ ...editData, containment_actions: e.target.value })}
                      rows={3}
                      placeholder="What immediate actions were taken to contain the issue?"
                    />
                    {!editData.containment_actions && editData.problem_description && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Click "Suggest Actions" to get AI-powered containment recommendations
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{capa.containment_actions || <span className="text-slate-400 italic">No containment actions documented</span>}</p>
                )}
              </CardContent>
            </Card>

            {/* CAPA Owner */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">CAPA Owner</CardTitle>
                {!isEditing && capa.status !== "closed" && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="flex gap-3">
                    <Input
                      placeholder="Owner email"
                      value={editData.owner_email || ""}
                      onChange={(e) => setEditData({ ...editData, owner_email: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Owner name"
                      value={editData.owner_name || ""}
                      onChange={(e) => setEditData({ ...editData, owner_name: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{capa.owner_name || "Unassigned"}</span>
                    {capa.owner_email && <span className="text-slate-500 text-sm">({capa.owner_email})</span>}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">Category</div>
                {isEditing ? (
                  <Input
                    value={editData.category || ""}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    placeholder="Category"
                    className="h-8 text-sm"
                  />
                ) : (
                  <div className="font-medium">{capa.category || "—"}</div>
                )}
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">Source</div>
                {isEditing ? (
                  <Select
                    value={editData.source || "other"}
                    onValueChange={(val) => setEditData({ ...editData, source: val })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sanitation">Sanitation</SelectItem>
                      <SelectItem value="pest">Pest</SelectItem>
                      <SelectItem value="emp">EMP</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                      <SelectItem value="downtime">Downtime</SelectItem>
                      <SelectItem value="incident">Incident</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="font-medium capitalize">{capa.source?.replace("_", " ") || "—"}</div>
                )}
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">Area/Line</div>
                {isEditing ? (
                  <Input
                    value={editData.area_name || ""}
                    onChange={(e) => setEditData({ ...editData, area_name: e.target.value })}
                    placeholder="Area/Line"
                    className="h-8 text-sm"
                  />
                ) : (
                  <div className="font-medium">{capa.area_name || "—"}</div>
                )}
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">Department</div>
                {isEditing ? (
                  <Input
                    value={editData.department || ""}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                    placeholder="Department"
                    className="h-8 text-sm"
                  />
                ) : (
                  <div className="font-medium">{capa.department || "—"}</div>
                )}
              </div>
            </div>

            {/* Verification Method */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Verification Method</CardTitle>
                <div className="flex items-center gap-2">
                  {isEditing && !editData.verification_method && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsSubmitting(true);
                        try {
                          const result = await invokeLLM({
                            prompt: `Based on the following CAPA (Corrective and Preventive Action), suggest a verification method - how we will verify that the corrective actions were completed correctly and are working.

Problem: ${editData.problem_description || capa.problem_description}
Root Cause: ${editData.root_cause_statement || capa.root_cause_statement || "Not yet defined"}
${capa.category ? `Category: ${capa.category}` : ""}
${capa.area_name ? `Area: ${capa.area_name}` : ""}

Provide a concise verification method (2-3 sentences) that is specific and actionable. Focus on audits, inspections, monitoring, or documentation reviews.`,
                            response_json_schema: {
                              type: "object",
                              properties: {
                                verification_method: { type: "string" }
                              }
                            }
                          });
                          setEditData({ ...editData, verification_method: result.verification_method });
                        } catch (error) {
                          toast.error("Failed to generate suggestion");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                      className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                      Suggest
                    </Button>
                  )}
                  {!isEditing && capa.status !== "closed" && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editData.verification_method || ""}
                    onChange={(e) => setEditData({ ...editData, verification_method: e.target.value })}
                    rows={2}
                    placeholder="How will you verify that the corrective actions were effective? (e.g., follow-up audits, monitoring data, etc.)"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{capa.verification_method || <span className="text-slate-400 italic">Not defined - click Edit to add</span>}</p>
                )}
              </CardContent>
            </Card>

            {/* Effectiveness Criteria */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Effectiveness Criteria</CardTitle>
                <div className="flex items-center gap-2">
                  {isEditing && !editData.effectiveness_criteria && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsSubmitting(true);
                        try {
                          const result = await invokeLLM({
                            prompt: `Based on the following CAPA (Corrective and Preventive Action), suggest effectiveness criteria - measurable criteria that will determine if the CAPA was successful in preventing recurrence.

Problem: ${editData.problem_description || capa.problem_description}
Root Cause: ${editData.root_cause_statement || capa.root_cause_statement || "Not yet defined"}
${capa.category ? `Category: ${capa.category}` : ""}
${capa.area_name ? `Area: ${capa.area_name}` : ""}

Provide concise, measurable effectiveness criteria (2-3 bullet points) that are specific and time-bound. Examples: zero recurrence for 30 days, compliance rate > 95%, etc.`,
                            response_json_schema: {
                              type: "object",
                              properties: {
                                effectiveness_criteria: { type: "string" }
                              }
                            }
                          });
                          setEditData({ ...editData, effectiveness_criteria: result.effectiveness_criteria });
                        } catch (error) {
                          toast.error("Failed to generate suggestion");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                      className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                      Suggest
                    </Button>
                  )}
                  {!isEditing && capa.status !== "closed" && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editData.effectiveness_criteria || ""}
                    onChange={(e) => setEditData({ ...editData, effectiveness_criteria: e.target.value })}
                    rows={2}
                    placeholder="What measurable criteria will determine if the CAPA was effective? (e.g., zero recurrence for 30 days, compliance rate > 95%)"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{capa.effectiveness_criteria || <span className="text-slate-400 italic">Not defined - click Edit to add</span>}</p>
                )}
              </CardContent>
            </Card>

            {/* Effectiveness */}
            {capa.status === "closed" && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Effectiveness Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {capa.effectiveness_status === "pending" ? (
                    <div>
                      <p className="text-sm text-slate-600 mb-2">
                        Effectiveness check due: {capa.next_effectiveness_check ? format(new Date(capa.next_effectiveness_check), "MMM d, yyyy") : "Not set"}
                      </p>
                      <p className="text-sm text-slate-500">
                        Criteria: {capa.effectiveness_criteria || "Not defined"}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Badge className={
                        capa.effectiveness_status === "effective" ? "bg-green-100 text-green-800" :
                        capa.effectiveness_status === "partial" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {capa.effectiveness_status}
                      </Badge>
                      {capa.effectiveness_notes && (
                        <p className="text-sm mt-2">{capa.effectiveness_notes}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Root Cause Tab */}
          <TabsContent value="root_cause" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">5 Whys Analysis</CardTitle>
                {!isEditing && capa.status !== "closed" && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(isEditing ? editData.five_whys : capa.five_whys || []).map((why, index) => {
                    const previousAnswers = isEditing 
                      ? editData.five_whys.slice(0, index).filter(w => w.answer).map(w => w.answer)
                      : [];
                    const canSuggest = isEditing && (index === 0 ? editData.problem_description : previousAnswers.length === index);
                    
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-medium text-amber-700">{why.why_number}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">{why.question}</p>
                          {isEditing ? (
                            <div className="flex gap-2 items-start">
                              <Textarea
                                value={why.answer || ""}
                                onChange={(e) => {
                                  const newWhys = [...editData.five_whys];
                                  newWhys[index] = { ...newWhys[index], answer: e.target.value };
                                  setEditData({ ...editData, five_whys: newWhys });
                                  // Auto-resize after state update
                                  setTimeout(() => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.max(60, e.target.scrollHeight) + 'px';
                                  }, 0);
                                }}
                                placeholder="Enter your answer..."
                                className="flex-1 min-h-[60px] resize-y"
                                rows={2}
                                ref={(el) => {
                                  if (el && why.answer) {
                                    el.style.height = 'auto';
                                    el.style.height = Math.max(60, el.scrollHeight) + 'px';
                                  }
                                }}
                              />
                              {canSuggest && !why.answer && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    setGeneratingWhyIndex(index);
                                    try {
                                      const context = index === 0 
                                        ? `Problem: ${editData.problem_description}`
                                        : `Problem: ${editData.problem_description}\n\nPrevious answers:\n${previousAnswers.map((a, i) => `Why ${i + 1}: ${a}`).join("\n")}`;
                                      
                                      const result = await invokeLLM({
                                        prompt: `You are helping with a 5 Whys root cause analysis for a food safety/sanitation issue.

${context}

${capa.category ? `Category: ${capa.category}` : ""}
${capa.area_name ? `Area: ${capa.area_name}` : ""}

For "Why ${index + 1}", suggest the most likely answer that digs deeper into the root cause. Be specific, concise (1-2 sentences max), and focus on systemic issues rather than blaming individuals.`,
                                        response_json_schema: {
                                          type: "object",
                                          properties: {
                                            answer: { type: "string" }
                                          }
                                        }
                                      });
                                      const newWhys = [...editData.five_whys];
                                      newWhys[index] = { ...newWhys[index], answer: result.answer };
                                      setEditData({ ...editData, five_whys: newWhys });
                                    } catch (error) {
                                      toast.error("Failed to generate suggestion");
                                    } finally {
                                      setGeneratingWhyIndex(null);
                                    }
                                  }}
                                  disabled={generatingWhyIndex !== null}
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2"
                                >
                                  {generatingWhyIndex === index ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm">{why.answer || <span className="text-slate-400 italic">Not answered</span>}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Root Cause Statement</CardTitle>
                {isGeneratingRootCause && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editData.root_cause_statement}
                    onChange={(e) => setEditData({ ...editData, root_cause_statement: e.target.value })}
                    rows={3}
                    placeholder="Summarize the root cause based on the 5 Whys analysis..."
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {capa.root_cause_statement || <span className="text-slate-400 italic">Not yet defined</span>}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contributing Factors</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editData.contributing_factors}
                    onChange={(e) => setEditData({ ...editData, contributing_factors: e.target.value })}
                    rows={2}
                    placeholder="What other factors contributed to this issue?"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{capa.contributing_factors || <span className="text-slate-400 italic">None documented</span>}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            {/* AI Suggested Actions */}
            {capa.status !== "closed" && capa.root_cause_statement && capa.contributing_factors && actions.length === 0 && suggestedActions.length === 0 && !isGeneratingActions && (
              <Card className="p-4 border-amber-200 bg-amber-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Generate Action Suggestions
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Based on your root cause analysis, AI can suggest corrective and preventive actions.
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      setIsGeneratingActions(true);
                      try {
                        const result = await invokeLLM({
                          prompt: `Based on the following root cause analysis for a food safety/sanitation issue, suggest 3-5 specific corrective and preventive actions.

Problem: ${capa.problem_description}

Root Cause: ${capa.root_cause_statement}

Contributing Factors: ${capa.contributing_factors}

${capa.category ? `Category: ${capa.category}` : ""}
${capa.area_name ? `Area: ${capa.area_name}` : ""}

For each action, specify:
- Whether it's corrective (fixes the immediate issue) or preventive (prevents recurrence)
- A clear, actionable title
- Priority (low, medium, high, critical)

Focus on systemic improvements, training, process changes, and verification measures.`,
                          response_json_schema: {
                            type: "object",
                            properties: {
                              actions: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    action_type: { type: "string", enum: ["corrective", "preventive"] },
                                    title: { type: "string" },
                                    priority: { type: "string", enum: ["low", "medium", "high", "critical"] }
                                  }
                                }
                              }
                            }
                          }
                        });
                        setSuggestedActions(result.actions || []);
                      } catch (error) {
                        toast.error("Failed to generate suggestions");
                      } finally {
                        setIsGeneratingActions(false);
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Suggest Actions
                  </Button>
                </div>
              </Card>
            )}

            {isGeneratingActions && (
              <Card className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                <p className="text-slate-500">Generating action suggestions...</p>
              </Card>
            )}

            {/* Display Suggested Actions */}
            {suggestedActions.length > 0 && (
              <Card className="p-4 border-amber-200 bg-amber-50">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Suggested Actions
                </h4>
                <div className="space-y-2">
                  {suggestedActions.map((action, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{action.action_type}</Badge>
                          <Badge className={
                            action.priority === "critical" ? "bg-red-100 text-red-800" :
                            action.priority === "high" ? "bg-orange-100 text-orange-800" :
                            action.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                            "bg-blue-100 text-blue-800"
                          }>{action.priority}</Badge>
                        </div>
                        <p className="text-sm">{action.title}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await CAPAActionRepo.create({
                              organization_id: organization.id,
                              capa_id: capa.id,
                              capa_number: capa.capa_id,
                              action_type: action.action_type,
                              title: action.title,
                              priority: action.priority,
                              owner_email: user?.email || "",
                              owner_name: user?.full_name || "",
                              due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
                              status: "pending",
                            });
                            setSuggestedActions(prev => prev.filter((_, i) => i !== idx));
                            refetchActions();
                            onUpdate();
                            toast.success("Action added");
                          } catch (error) {
                            toast.error("Failed to add action");
                          }
                        }}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSuggestedActions([])}
                  className="mt-2 text-slate-500"
                >
                  Dismiss suggestions
                </Button>
              </Card>
            )}

            {capa.status !== "closed" && (
              <CAPAActionForm 
                capa={capa}
                organization={organization}
                user={user}
                onAdd={() => {
                  refetchActions();
                  onUpdate();
                }}
              />
            )}
            
            {actions.length === 0 && suggestedActions.length === 0 && !isGeneratingActions && (
              <Card className="p-8 text-center">
                <p className="text-slate-500">No actions defined yet. {capa.root_cause_statement ? "Add corrective or preventive actions above." : "Complete root cause analysis first to get AI suggestions."}</p>
              </Card>
            )}
            
            {actions.length > 0 && (
              <div className="space-y-3">
                {actions.map(action => {
                  const targetDate = action.target_date || action.due_date;
                  const isOverdue = action.status !== "completed" && action.status !== "verified" &&
                    targetDate && isBefore(new Date(targetDate), new Date());
                  const owners = action.owners?.length > 0 ? action.owners : 
                    (action.owner_email ? [{ email: action.owner_email, name: action.owner_name }] : []);
                  
                  return (
                    <Card key={action.id} className={cn(
                      "p-4",
                      isOverdue ? "border-red-200 bg-red-50" : ""
                    )}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {action.action_type}
                            </Badge>
                            <Badge className={isOverdue ? "bg-red-100 text-red-800" : actionStatusColors[action.status]}>
                              {isOverdue ? "overdue" : action.status}
                            </Badge>
                            {action.evidence_required && (
                              <Badge variant="outline" className="text-xs">
                                <Paperclip className="w-3 h-3 mr-1" />
                                Evidence required
                              </Badge>
                            )}
                            {action.edit_history?.length > 0 && (
                              <Badge variant="outline" className="text-xs text-slate-500">
                                {action.edit_history.length} edit{action.edit_history.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{action.title}</h4>
                          {action.description && (
                            <p className="text-sm text-slate-600 mt-1">{action.description}</p>
                          )}
                          
                          {/* Owners */}
                          <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
                            <Users className="w-3 h-3" />
                            <span>
                              {owners.length > 0 
                                ? owners.map(o => o.name || o.email).join(", ")
                                : "No owner assigned"}
                            </span>
                          </div>
                          
                          {/* Dates */}
                          <div className="flex items-center gap-4 mt-1 text-sm">
                            <div className="text-slate-500">
                              <span className="font-medium">Target:</span>{" "}
                              {targetDate ? format(new Date(targetDate), "MMM d, yyyy") : "—"}
                            </div>
                            {action.actual_completion_date && (
                              <div className="text-green-600">
                                <span className="font-medium">Completed:</span>{" "}
                                {format(new Date(action.actual_completion_date), "MMM d, yyyy")}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {capa.status !== "closed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingAction(action)}
                              className="text-slate-500 hover:text-slate-700"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          )}
                          {action.status !== "completed" && action.status !== "verified" && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => sendReminder(action)}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Remind
                              </Button>
                              <Button 
                                size="sm"
                                onClick={async () => {
                                  await CAPAActionRepo.update(action.id, {
                                    status: "completed",
                                    completed_at: new Date().toISOString(),
                                    completed_by: user?.email,
                                    actual_completion_date: format(new Date(), "yyyy-MM-dd")
                                  });
                                  await CAPACommentRepo.create({
                                    organization_id: organization.id,
                                    capa_id: capa.id,
                                    author_email: user?.email,
                                    author_name: user?.full_name,
                                    content: `Action "${action.title}" marked as completed`,
                                    comment: `Action "${action.title}" marked as completed`,
                                    comment_type: "action_update",
                                  });
                                  refetchActions();
                                  refetchComments();
                                  onUpdate();
                                  toast.success("Action completed");
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Complete
                              </Button>
                            </>
                          )}
                          {action.status === "completed" && user?.role === "admin" && (
                            <Button 
                              size="sm"
                              onClick={() => updateActionStatus(action, "verified")}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Edit Action Modal */}
            {editingAction && (
              <CAPAActionEditModal
                open={!!editingAction}
                onClose={() => setEditingAction(null)}
                action={editingAction}
                organization={organization}
                user={user}
                onUpdate={() => {
                  refetchActions();
                  refetchComments();
                  onUpdate();
                  setEditingAction(null);
                }}
              />
            )}
          </TabsContent>

          {/* Evidence Tab */}
          <TabsContent value="evidence">
            <CAPAEvidenceUploader 
              capa={capa}
              organization={organization}
              user={user}
              onUpdate={onUpdate}
            />
          </TabsContent>

          {/* AI Intelligence Tab */}
          <TabsContent value="intelligence">
            <CAPAIntelligence 
              capa={capa}
              allCapas={allCapas}
              onSuggestionApply={async (data) => {
                await CAPARepo.update(capa.id, data);
                onUpdate();
                toast.success("CAPA updated");
              }}
            />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            {/* Add Comment */}
            <Card className="p-4">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button 
                  onClick={addComment}
                  disabled={isSubmitting || !newComment.trim()}
                  className="self-end"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </Card>

            {/* Activity Timeline */}
            <div className="space-y-3">
              {comments.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(comment => (
                <Card key={comment.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      comment.comment_type === "system" ? "bg-slate-100" :
                      comment.comment_type === "status_change" ? "bg-blue-100" :
                      comment.comment_type === "action_update" ? "bg-green-100" :
                      "bg-amber-100"
                    )}>
                      {comment.comment_type === "system" ? <Activity className="w-4 h-4 text-slate-500" /> :
                       comment.comment_type === "status_change" ? <AlertTriangle className="w-4 h-4 text-blue-500" /> :
                       comment.comment_type === "action_update" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                       <MessageSquare className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.author_name || "System"}</span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(comment.created_date), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{comment.comment}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Close CAPA Modal */}
        {showCloseModal && (
          <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Close CAPA</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Verification Method *</label>
                  <Textarea
                    value={closeData.verification_method}
                    onChange={(e) => setCloseData({ ...closeData, verification_method: e.target.value })}
                    rows={3}
                    placeholder="How did you verify that the corrective actions were completed and effective?"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Effectiveness Criteria *</label>
                  <Textarea
                    value={closeData.effectiveness_criteria}
                    onChange={(e) => setCloseData({ ...closeData, effectiveness_criteria: e.target.value })}
                    rows={3}
                    placeholder="What criteria will be used to evaluate long-term effectiveness? (e.g., no recurrence for 30 days)"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!closeData.verification_method.trim()) {
                      toast.error("Please enter a verification method");
                      return;
                    }
                    if (!closeData.effectiveness_criteria.trim()) {
                      toast.error("Please enter effectiveness criteria");
                      return;
                    }
                    
                    setIsSubmitting(true);
                    try {
                      const checkDays = capa.effectiveness_check_days?.[0] || 30;
                      await CAPARepo.update(capa.id, {
                        status: "closed",
                        closed_at: new Date().toISOString(),
                        closed_by: user?.email,
                        verification_method: closeData.verification_method,
                        effectiveness_criteria: closeData.effectiveness_criteria,
                        next_effectiveness_check: format(addDays(new Date(), checkDays), "yyyy-MM-dd")
                      });
                      
                      await CAPACommentRepo.create({
                        organization_id: organization.id,
                        capa_id: capa.id,
                        author_email: user?.email,
                        author_name: user?.full_name,
                        content: `CAPA closed. Verification method: ${closeData.verification_method}`,
                        comment: `CAPA closed. Verification method: ${closeData.verification_method}`,
                        comment_type: "status_change",
                      });
                      
                      setShowCloseModal(false);
                      onUpdate();
                      toast.success("CAPA closed successfully");
                    } catch (error) {
                      toast.error("Failed to close CAPA");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Close CAPA
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      problem_description: capa.problem_description || "",
                      containment_actions: capa.containment_actions || "",
                      root_cause_statement: capa.root_cause_statement || "",
                      contributing_factors: capa.contributing_factors || "",
                      five_whys: capa.five_whys?.length > 0 ? capa.five_whys : [
                        { why_number: 1, question: "Why did this happen?", answer: "" },
                        { why_number: 2, question: "Why?", answer: "" },
                        { why_number: 3, question: "Why?", answer: "" },
                        { why_number: 4, question: "Why?", answer: "" },
                        { why_number: 5, question: "Why?", answer: "" }
                      ],
                      effectiveness_criteria: capa.effectiveness_criteria || "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      // Build update data including all editable fields
                      const updatePayload = {
                        problem_description: editData.problem_description,
                        containment_actions: editData.containment_actions,
                        root_cause_statement: editData.root_cause_statement,
                        contributing_factors: editData.contributing_factors,
                        five_whys: editData.five_whys,
                        effectiveness_criteria: editData.effectiveness_criteria,
                        owner_email: editData.owner_email,
                        owner_name: editData.owner_name,
                        verification_method: editData.verification_method,
                        category: editData.category,
                        source: editData.source,
                        area_name: editData.area_name,
                        department: editData.department,
                      };
                      await CAPARepo.update(capa.id, updatePayload);
                      await CAPACommentRepo.create({
                        organization_id: organization.id,
                        capa_id: capa.id,
                        author_email: user?.email,
                        author_name: user?.full_name,
                        content: "Updated CAPA details",
                        comment: "Updated CAPA details",
                        comment_type: "system",
                      });
                      setIsEditing(false);
                      onUpdate();
                      toast.success("CAPA updated");
                    } catch (error) {
                      toast.error("Failed to save changes");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                {capa.status !== "closed" && (
                  <>
                    {capa.status === "open" && (
                      <Button 
                        variant="outline"
                        onClick={() => updateCapaStatus("in_progress")}
                      >
                        Start Working
                      </Button>
                    )}
                    {capa.status === "in_progress" && pendingActions.length === 0 && actions.length > 0 && (
                      <Button 
                        onClick={() => updateCapaStatus("pending_verification")}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Submit for Verification
                      </Button>
                    )}
                    {capa.status === "pending_verification" && user?.role === "admin" && (
                      user?.email === capa.owner_email ? (
                        <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          CAPA must be verified by someone other than the owner
                        </div>
                      ) : !capa.root_cause_statement ? (
                        <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Cannot close - root cause analysis required
                        </div>
                      ) : completedActions.length === 0 ? (
                        <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Cannot close - at least one completed action required
                        </div>
                      ) : (
                        <Button 
                          onClick={() => {
                            setCloseData({
                              verification_method: capa.verification_method || "",
                              effectiveness_criteria: capa.effectiveness_criteria || ""
                            });
                            setShowCloseModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Close CAPA
                        </Button>
                      )
                    )}
                  </>
                )}
                {capa.status === "closed" && user?.role === "admin" && (
                  <Button 
                    variant="outline"
                    onClick={() => updateCapaStatus("reopened")}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reopen CAPA
                  </Button>
                )}
              </>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}