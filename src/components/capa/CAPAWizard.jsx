import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, ChevronRight, Check, Plus, Trash2,
  FileText, Users, Search, Target, CheckCircle2, Loader2
} from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateUniqueCapaId } from "./capaUtils";
import {
  CAPAActionRepo,
  CAPACommentRepo,
  CAPARepo
} from "@/lib/adapters/database";
import { sendEmail } from "@/lib/adapters/integrations";

const STEPS = [
  { id: 1, title: "Basics", icon: FileText },
  { id: 2, title: "Problem Details", icon: Search },
  { id: 3, title: "Root Cause", icon: Target },
  { id: 4, title: "Actions", icon: Users },
  { id: 5, title: "Effectiveness", icon: CheckCircle2 },
  { id: 6, title: "Review", icon: Check },
];

const DEFAULT_CATEGORIES = [
  "Sanitation", "Equipment", "Process", "Training", "Documentation", 
  "Safety", "Quality", "Pest Control", "Environmental", "Other"
];

const DEFAULT_DEPARTMENTS = [
  "Sanitation", "Quality Assurance", "Maintenance", "Production", 
  "Warehouse", "R&D", "Management"
];

export default function CAPAWizard({ open, onClose, organization, user, settings, onCreated }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Basics
    title: "",
    category: "",
    severity: "medium",
    source: "other",
    department: "",
    area_name: "",
    zone: "",
    problem_description: "",
    containment_actions: "",
    
    // Step 2: Problem Details
    when_observed: "",
    where_observed: "",
    frequency: "one_time",
    is_recurrence: false,
    related_assets: [],
    
    // Step 3: Root Cause
    five_whys: [
      { why_number: 1, question: "Why did this happen?", answer: "" },
      { why_number: 2, question: "Why?", answer: "" },
      { why_number: 3, question: "Why?", answer: "" },
      { why_number: 4, question: "Why?", answer: "" },
      { why_number: 5, question: "Why?", answer: "" },
    ],
    fishbone_analysis: {
      man: "", method: "", material: "", machine: "", environment: "", measurement: ""
    },
    root_cause_statement: "",
    contributing_factors: "",
    
    // Step 4: Actions
    actions: [],
    
    // Step 5: Effectiveness
    verification_method: "",
    effectiveness_criteria: "",
    effectiveness_check_days: [30],
    effectiveness_metrics: [],
    closeout_approver_email: "",
    closeout_approver_name: "",
  });

  const [newAction, setNewAction] = useState({
    action_type: "corrective",
    title: "",
    description: "",
    owner_email: "",
    owner_name: "",
    due_date: "",
    priority: "medium",
    evidence_required: false,
  });

  const categories = settings?.categories || DEFAULT_CATEGORIES;
  const departments = settings?.departments || DEFAULT_DEPARTMENTS;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAction = () => {
    if (!newAction.title || !newAction.owner_email || !newAction.due_date) {
      toast.error("Please fill in action title, owner email, and due date");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { ...newAction, id: Date.now() }]
    }));
    
    setNewAction({
      action_type: "corrective",
      title: "",
      description: "",
      owner_email: "",
      owner_name: "",
      due_date: "",
      priority: "medium",
      evidence_required: false,
    });
  };

  const removeAction = (id) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter(a => a.id !== id)
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.title || !formData.problem_description) {
          toast.error("Please fill in title and problem description");
          return false;
        }
        if ((formData.severity === "high" || formData.severity === "critical") && !formData.containment_actions) {
          toast.error("Containment actions are required for high/critical severity");
          return false;
        }
        return true;
      case 3:
        if (!formData.root_cause_statement) {
          toast.error("Root cause statement is required");
          return false;
        }
        return true;
      case 4:
        if (formData.actions.length === 0) {
          toast.error("At least one action is required");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const capaId = await generateUniqueCapaId(organization.id);
      
      // Create CAPA
      const capa = await CAPARepo.create({
        organization_id: organization.id,
        capa_id: capaId,
        title: formData.title,
        status: "open",
        category: formData.category,
        severity: formData.severity,
        source: formData.source,
        department: formData.department,
        area_name: formData.area_name,
        zone: formData.zone,
        problem_description: formData.problem_description,
        containment_actions: formData.containment_actions,
        when_observed: formData.when_observed,
        where_observed: formData.where_observed,
        frequency: formData.frequency,
        is_recurrence: formData.is_recurrence,
        related_assets: formData.related_assets,
        five_whys: formData.five_whys,
        fishbone_analysis: formData.fishbone_analysis,
        root_cause_statement: formData.root_cause_statement,
        contributing_factors: formData.contributing_factors,
        verification_method: formData.verification_method,
        effectiveness_criteria: formData.effectiveness_criteria,
        effectiveness_check_days: formData.effectiveness_check_days,
        effectiveness_metrics: formData.effectiveness_metrics,
        closeout_approver_email: formData.closeout_approver_email,
        closeout_approver_name: formData.closeout_approver_name,
        owner_email: user?.email,
        owner_name: user?.full_name,
      });

      // Create Actions
      for (const action of formData.actions) {
        await CAPAActionRepo.create({
          organization_id: organization.id,
          capa_id: capa.id,
          capa_number: capaId,
          action_type: action.action_type,
          title: action.title,
          description: action.description,
          owner_email: action.owner_email,
          owner_name: action.owner_name,
          due_date: action.due_date,
          priority: action.priority,
          evidence_required: action.evidence_required,
          status: "pending",
        });

        // Send email notification to action owner
        try {
          await sendEmail({
            to: action.owner_email,
            subject: `[CAPA] New Action Assigned: ${action.title}`,
            body: `
You have been assigned a new CAPA action.

CAPA: ${capaId} - ${formData.title}
Action: ${action.title}
Due Date: ${action.due_date}
Priority: ${action.priority}

Please log in to view details and complete this action.
            `.trim()
          });
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      }

      // Create initial comment
      await CAPACommentRepo.create({
        organization_id: organization.id,
        capa_id: capa.id,
        author_email: user?.email,
        author_name: user?.full_name,
        content: "CAPA created and opened",
        comment: "CAPA created and opened",
        comment_type: "system",
      });

      toast.success("CAPA created successfully");
      onCreated();
    } catch (error) {
      console.error("Error creating CAPA:", error);
      toast.error("Failed to create CAPA");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New CAPA</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 px-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  currentStep >= step.id 
                    ? "bg-amber-600 border-amber-600 text-white" 
                    : "border-slate-300 text-slate-400"
                )}
              >
                <step.icon className="w-5 h-5" />
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 md:w-16 h-0.5 mx-1",
                  currentStep > step.id ? "bg-amber-600" : "bg-slate-200"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mb-6">
          <h3 className="font-semibold text-lg">{STEPS[currentStep - 1].title}</h3>
        </div>

        {/* Step Content */}
        <div className="space-y-4 min-h-[400px]">
          {/* Step 1: Basics */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label>CAPA Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => updateFormData("title", e.target.value)}
                  placeholder="Brief descriptive title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => updateFormData("category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Severity *</Label>
                  <Select value={formData.severity} onValueChange={(v) => updateFormData("severity", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Source</Label>
                  <Select value={formData.source} onValueChange={(v) => updateFormData("source", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sanitation">Sanitation</SelectItem>
                      <SelectItem value="pest">Pest Control</SelectItem>
                      <SelectItem value="emp">EMP</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                      <SelectItem value="downtime">Downtime</SelectItem>
                      <SelectItem value="incident">Incident</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Department</Label>
                  <Select value={formData.department} onValueChange={(v) => updateFormData("department", v)}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Area/Line</Label>
                  <Input
                    value={formData.area_name}
                    onChange={(e) => updateFormData("area_name", e.target.value)}
                    placeholder="e.g., Production Line 1"
                  />
                </div>
                <div>
                  <Label>Zone</Label>
                  <Input
                    value={formData.zone}
                    onChange={(e) => updateFormData("zone", e.target.value)}
                    placeholder="e.g., Zone 1"
                  />
                </div>
              </div>

              <div>
                <Label>Problem Description *</Label>
                <Textarea
                  value={formData.problem_description}
                  onChange={(e) => updateFormData("problem_description", e.target.value)}
                  placeholder="Describe the problem in detail..."
                  rows={4}
                />
              </div>

              <div>
                <Label>
                  Immediate Containment Actions 
                  {(formData.severity === "high" || formData.severity === "critical") && " *"}
                </Label>
                <Textarea
                  value={formData.containment_actions}
                  onChange={(e) => updateFormData("containment_actions", e.target.value)}
                  placeholder="What immediate actions were taken to contain the problem?"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Problem Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>When Observed</Label>
                  <Input
                    type="datetime-local"
                    value={formData.when_observed}
                    onChange={(e) => updateFormData("when_observed", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Where Observed</Label>
                  <Input
                    value={formData.where_observed}
                    onChange={(e) => updateFormData("where_observed", e.target.value)}
                    placeholder="Specific location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(v) => updateFormData("frequency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time occurrence</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                      <SelectItem value="intermittent">Intermittent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_recurrence"
                    checked={formData.is_recurrence}
                    onChange={(e) => updateFormData("is_recurrence", e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="is_recurrence" className="cursor-pointer">
                    This is a repeat of a previous issue
                  </Label>
                </div>
              </div>

              <Card className="p-4 bg-slate-50">
                <h4 className="font-medium mb-2">Related Assets</h4>
                <p className="text-sm text-slate-500">
                  Link related equipment, drains, pest devices, or EMP sites (optional)
                </p>
              </Card>
            </div>
          )}

          {/* Step 3: Root Cause Analysis */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">5 Whys Analysis</h4>
                <div className="space-y-3">
                  {formData.five_whys.map((why, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-amber-700">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 mb-1">{why.question}</p>
                        <Input
                          value={why.answer}
                          onChange={(e) => {
                            const updated = [...formData.five_whys];
                            updated[index].answer = e.target.value;
                            updateFormData("five_whys", updated);
                          }}
                          placeholder="Enter your answer..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Fishbone Categories (Optional)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.keys(formData.fishbone_analysis).map(key => (
                    <div key={key}>
                      <Label className="capitalize">{key}</Label>
                      <Input
                        value={formData.fishbone_analysis[key]}
                        onChange={(e) => updateFormData("fishbone_analysis", {
                          ...formData.fishbone_analysis,
                          [key]: e.target.value
                        })}
                        placeholder={`${key} factors...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Root Cause Statement *</Label>
                <Textarea
                  value={formData.root_cause_statement}
                  onChange={(e) => updateFormData("root_cause_statement", e.target.value)}
                  placeholder="Based on your analysis, what is the root cause?"
                  rows={3}
                />
              </div>

              <div>
                <Label>Contributing Factors</Label>
                <Textarea
                  value={formData.contributing_factors}
                  onChange={(e) => updateFormData("contributing_factors", e.target.value)}
                  placeholder="What other factors contributed to this issue?"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 4: Actions */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <Card className="p-4 border-dashed">
                <h4 className="font-medium mb-3">Add Action Item</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Action Type *</Label>
                      <Select value={newAction.action_type} onValueChange={(v) => setNewAction({...newAction, action_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corrective">Corrective (fix current problem)</SelectItem>
                          <SelectItem value="preventive">Preventive (prevent recurrence)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={newAction.priority} onValueChange={(v) => setNewAction({...newAction, priority: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Action Title *</Label>
                    <Input
                      value={newAction.title}
                      onChange={(e) => setNewAction({...newAction, title: e.target.value})}
                      placeholder="What needs to be done?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Owner Name *</Label>
                      <Input
                        value={newAction.owner_name}
                        onChange={(e) => setNewAction({...newAction, owner_name: e.target.value})}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <Label>Owner Email *</Label>
                      <Input
                        type="email"
                        value={newAction.owner_email}
                        onChange={(e) => setNewAction({...newAction, owner_email: e.target.value})}
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Due Date *</Label>
                      <Input
                        type="date"
                        value={newAction.due_date}
                        onChange={(e) => setNewAction({...newAction, due_date: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="evidence_required"
                        checked={newAction.evidence_required}
                        onChange={(e) => setNewAction({...newAction, evidence_required: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="evidence_required" className="cursor-pointer">
                        Evidence required
                      </Label>
                    </div>
                  </div>

                  <Button onClick={addAction} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Action
                  </Button>
                </div>
              </Card>

              {/* Action List */}
              <div>
                <h4 className="font-medium mb-2">Actions ({formData.actions.length})</h4>
                {formData.actions.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No actions added yet</p>
                ) : (
                  <div className="space-y-2">
                    {formData.actions.map(action => (
                      <Card key={action.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{action.action_type}</Badge>
                              <span className="font-medium text-sm">{action.title}</span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {action.owner_name} ({action.owner_email}) • Due: {action.due_date}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeAction(action.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Effectiveness */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <Label>Verification Method</Label>
                <Textarea
                  value={formData.verification_method}
                  onChange={(e) => updateFormData("verification_method", e.target.value)}
                  placeholder="How will you verify that actions were completed correctly?"
                  rows={3}
                />
              </div>

              <div>
                <Label>Effectiveness Criteria</Label>
                <Textarea
                  value={formData.effectiveness_criteria}
                  onChange={(e) => updateFormData("effectiveness_criteria", e.target.value)}
                  placeholder="How will you measure if the CAPA was effective?"
                  rows={3}
                />
              </div>

              <div>
                <Label>Effectiveness Check (days after closure)</Label>
                <Select 
                  value={formData.effectiveness_check_days[0]?.toString()} 
                  onValueChange={(v) => updateFormData("effectiveness_check_days", [parseInt(v)])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Closeout Approver Name</Label>
                  <Input
                    value={formData.closeout_approver_name}
                    onChange={(e) => updateFormData("closeout_approver_name", e.target.value)}
                    placeholder="QA Manager name"
                  />
                </div>
                <div>
                  <Label>Closeout Approver Email</Label>
                  <Input
                    type="email"
                    value={formData.closeout_approver_email}
                    onChange={(e) => updateFormData("closeout_approver_email", e.target.value)}
                    placeholder="approver@example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3">CAPA Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Title:</span>
                    <span className="font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Severity:</span>
                    <Badge className={cn(
                      formData.severity === "critical" ? "bg-red-100 text-red-800" :
                      formData.severity === "high" ? "bg-orange-100 text-orange-800" :
                      formData.severity === "medium" ? "bg-yellow-100 text-yellow-800" :
                      "bg-blue-100 text-blue-800"
                    )}>
                      {formData.severity}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span>{formData.category || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source:</span>
                    <span className="capitalize">{formData.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Actions:</span>
                    <span>{formData.actions.length} action items</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Ready to submit?</strong> Once submitted, this CAPA will be opened and 
                  action owners will be notified via email.
                </p>
              </Card>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : prevStep}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          {currentStep < 6 ? (
            <Button onClick={nextStep} className="bg-amber-600 hover:bg-amber-700">
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create CAPA
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}