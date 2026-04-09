import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-slate-100 text-slate-800" },
  { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Critical", color: "bg-rose-100 text-rose-800" }
];

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "investigation", label: "Investigation" },
  { value: "corrective_action", label: "Corrective Action" },
  { value: "preventive_action", label: "Preventive Action" },
  { value: "verification", label: "Verification" },
  { value: "effective", label: "Effective" },
  { value: "closed", label: "Closed" }
];

const SOURCE_TYPES = [
  { value: "downtime_event", label: "Downtime Event" },
  { value: "audit_finding", label: "Audit Finding" },
  { value: "customer_complaint", label: "Customer Complaint" },
  { value: "internal_observation", label: "Internal Observation" },
  { value: "regulatory", label: "Regulatory" },
  { value: "near_miss", label: "Near Miss" },
  { value: "trend_analysis", label: "Trend Analysis" }
];

const ROOT_CAUSE_METHODS = [
  { value: "5_why", label: "5 Why Analysis" },
  { value: "fishbone", label: "Fishbone Diagram" },
  { value: "fault_tree", label: "Fault Tree Analysis" },
  { value: "pareto", label: "Pareto Analysis" },
  { value: "other", label: "Other" }
];

export default function CAPAModal({
  open,
  onOpenChange,
  capa,
  organizationId,
  user,
  employees = [],
  tasks = [],
  ssops = [],
  trainingDocs = [],
  downtimeEvents = []
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    source_type: "internal_observation",
    source_id: "",
    source_reference: "",
    category: "sanitation",
    priority: "medium",
    status: "draft",
    root_cause_analysis: "",
    root_cause_method: "",
    root_cause_category: "",
    corrective_actions: [],
    preventive_actions: [],
    verification_method: "",
    verification_criteria: "",
    verification_due_date: "",
    assigned_to: "",
    target_close_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    linked_task_ids: [],
    linked_ssop_ids: [],
    linked_training_ids: []
  });

  useEffect(() => {
    if (capa) {
      setFormData({
        title: capa.title || "",
        description: capa.description || "",
        source_type: capa.source_type || "internal_observation",
        source_id: capa.source_id || "",
        source_reference: capa.source_reference || "",
        category: capa.category || "sanitation",
        priority: capa.priority || "medium",
        status: capa.status || "draft",
        root_cause_analysis: capa.root_cause_analysis || "",
        root_cause_method: capa.root_cause_method || "",
        root_cause_category: capa.root_cause_category || "",
        corrective_actions: capa.corrective_actions || [],
        preventive_actions: capa.preventive_actions || [],
        verification_method: capa.verification_method || "",
        verification_criteria: capa.verification_criteria || "",
        verification_due_date: capa.verification_due_date || "",
        assigned_to: capa.assigned_to || "",
        target_close_date: capa.target_close_date || format(addDays(new Date(), 30), "yyyy-MM-dd"),
        linked_task_ids: capa.linked_task_ids || [],
        linked_ssop_ids: capa.linked_ssop_ids || [],
        linked_training_ids: capa.linked_training_ids || []
      });
    } else {
      setFormData({
        title: "",
        description: "",
        source_type: "internal_observation",
        source_id: "",
        source_reference: "",
        category: "sanitation",
        priority: "medium",
        status: "draft",
        root_cause_analysis: "",
        root_cause_method: "",
        root_cause_category: "",
        corrective_actions: [],
        preventive_actions: [],
        verification_method: "",
        verification_criteria: "",
        verification_due_date: "",
        assigned_to: "",
        target_close_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        linked_task_ids: [],
        linked_ssop_ids: [],
        linked_training_ids: []
      });
    }
    setActiveTab("details");
  }, [capa, open]);

  const generateCapaNumber = async () => {
    const year = new Date().getFullYear();
    const existing = await CAPARepo.filter({ organization_id: organizationId });
    const count = existing.filter(c => c.capa_number?.startsWith(`CAPA-${year}`)).length + 1;
    return `CAPA-${year}-${String(count).padStart(3, '0')}`;
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const assignee = employees.find(e => e.email === data.assigned_to);
      
      const payload = {
        ...data,
        organization_id: organizationId,
        capa_number: capa?.capa_number || await generateCapaNumber(),
        assigned_to_name: assignee?.name || "",
        initiated_by: capa?.initiated_by || user?.email,
        initiated_by_name: capa?.initiated_by_name || user?.full_name,
        initiated_date: capa?.initiated_date || format(new Date(), "yyyy-MM-dd"),
        audit_trail: [
          ...(capa?.audit_trail || []),
          {
            action: capa ? "updated" : "created",
            by: user?.email,
            at: new Date().toISOString(),
            notes: `Status: ${data.status}`
          }
        ]
      };

      // Update linked downtime event if exists
      if (data.source_type === "downtime_event" && data.source_id) {
        await SanitationDowntimeRepo.update(data.source_id, {
          capa_id: capa?.id || "pending",
          status: "capa_in_progress"
        });
      }

      if (capa?.id) {
        return CAPARepo.update(capa.id, payload);
      }
      return CAPARepo.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capas"] });
      queryClient.invalidateQueries({ queryKey: ["downtime_events"] });
      onOpenChange(false);
      toast.success(capa ? "CAPA updated" : "CAPA created");
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    }
  });

  const addAction = (type) => {
    const newAction = {
      id: Date.now().toString(),
      description: "",
      owner_email: "",
      owner_name: "",
      due_date: format(addDays(new Date(), 14), "yyyy-MM-dd"),
      completed_date: "",
      status: "pending",
      evidence_url: "",
      notes: ""
    };
    
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], newAction]
    }));
  };

  const updateAction = (type, id, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map(action => {
        if (action.id === id) {
          const updated = { ...action, [field]: value };
          if (field === "owner_email") {
            const emp = employees.find(e => e.email === value);
            updated.owner_name = emp?.name || "";
          }
          return updated;
        }
        return action;
      })
    }));
  };

  const removeAction = (type, id) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(action => action.id !== id)
    }));
  };

  const handleSubmit = () => {
    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }
    mutation.mutate(formData);
  };

  const ActionEditor = ({ type, actions }) => (
    <div className="space-y-3">
      {actions.map((action, index) => (
        <Card key={action.id} className="p-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                <Select
                  value={action.status}
                  onValueChange={(v) => updateAction(type, action.id, "status", v)}
                >
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={action.description}
                onChange={(e) => updateAction(type, action.id, "description", e.target.value)}
                placeholder="Describe the action..."
                rows={2}
                className="text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={action.owner_email}
                  onValueChange={(v) => updateAction(type, action.id, "owner_email", v)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Assign owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status === "active").map(emp => (
                      <SelectItem key={emp.id} value={emp.email}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={action.due_date}
                  onChange={(e) => updateAction(type, action.id, "due_date", e.target.value)}
                  className="text-sm"
                />
              </div>
              {action.status === "completed" && (
                <Input
                  type="date"
                  value={action.completed_date}
                  onChange={(e) => updateAction(type, action.id, "completed_date", e.target.value)}
                  placeholder="Completion date"
                  className="text-sm"
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeAction(type, action.id)}
              className="text-slate-400 hover:text-rose-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={() => addAction(type)}>
        <Plus className="w-4 h-4 mr-2" />
        Add {type === "corrective_actions" ? "Corrective" : "Preventive"} Action
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {capa ? "Edit CAPA" : "Create CAPA"}
            {capa?.capa_number && (
              <Badge variant="outline" className="font-mono">{capa.capa_number}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="root_cause">Root Cause</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief title describing the issue"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the issue..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Source Type</Label>
                <Select value={formData.source_type} onValueChange={(v) => setFormData(prev => ({ ...prev, source_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source Reference</Label>
                <Input
                  value={formData.source_reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_reference: e.target.value }))}
                  placeholder="e.g., SDT-2026-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <Badge className={p.color}>{p.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Owner</Label>
                <Select value={formData.assigned_to} onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status === "active").map(emp => (
                      <SelectItem key={emp.id} value={emp.email}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Target Close Date</Label>
              <Input
                type="date"
                value={formData.target_close_date}
                onChange={(e) => setFormData(prev => ({ ...prev, target_close_date: e.target.value }))}
              />
            </div>
          </TabsContent>

          {/* Root Cause Tab */}
          <TabsContent value="root_cause" className="space-y-4 mt-4">
            <div>
              <Label>Root Cause Analysis Method</Label>
              <Select value={formData.root_cause_method} onValueChange={(v) => setFormData(prev => ({ ...prev, root_cause_method: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {ROOT_CAUSE_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Root Cause Category (5M+E)</Label>
              <Select value={formData.root_cause_category} onValueChange={(v) => setFormData(prev => ({ ...prev, root_cause_category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="method">Method</SelectItem>
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="manpower">Manpower</SelectItem>
                  <SelectItem value="measurement">Measurement</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Root Cause Analysis</Label>
              <Textarea
                value={formData.root_cause_analysis}
                onChange={(e) => setFormData(prev => ({ ...prev, root_cause_analysis: e.target.value }))}
                placeholder="Document your root cause analysis findings..."
                rows={6}
              />
            </div>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-6 mt-4">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                Corrective Actions
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Actions to fix the immediate problem
              </p>
              <ActionEditor type="corrective_actions" actions={formData.corrective_actions} />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Preventive Actions
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Actions to prevent recurrence
              </p>
              <ActionEditor type="preventive_actions" actions={formData.preventive_actions} />
            </div>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="space-y-4 mt-4">
            <div>
              <Label>Verification Method</Label>
              <Textarea
                value={formData.verification_method}
                onChange={(e) => setFormData(prev => ({ ...prev, verification_method: e.target.value }))}
                placeholder="How will you verify the CAPA was effective?"
                rows={2}
              />
            </div>

            <div>
              <Label>Success Criteria</Label>
              <Textarea
                value={formData.verification_criteria}
                onChange={(e) => setFormData(prev => ({ ...prev, verification_criteria: e.target.value }))}
                placeholder="What criteria must be met to consider the CAPA effective?"
                rows={2}
              />
            </div>

            <div>
              <Label>Verification Due Date</Label>
              <Input
                type="date"
                value={formData.verification_due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, verification_due_date: e.target.value }))}
              />
              <p className="text-xs text-slate-500 mt-1">
                Typically 30-90 days after actions complete to verify no recurrence
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {capa ? "Update CAPA" : "Create CAPA"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}