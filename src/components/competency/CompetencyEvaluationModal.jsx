import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Loader2, CheckCircle2, XCircle, AlertTriangle, 
  ClipboardCheck, Shield, User, Calendar, Sparkles
} from "lucide-react";
import { CompetencyEvaluationRepo, EvaluationTemplateRepo } from "@/lib/adapters/database";
import { getCurrentUser } from "@/lib/adapters/auth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import AIChecklistGenerator from "./AIChecklistGenerator";
import AICoachingSuggestions from "./AICoachingSuggestions";

export default function CompetencyEvaluationModal({ 
  open, 
  onOpenChange, 
  evaluation,
  ssops = [],
  evaluator,
  onComplete,
  isManager = false
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [result, setResult] = useState(null);
  const [comments, setComments] = useState("");
  const [coachingNotes, setCoachingNotes] = useState("");
  const [useAIChecklist, setUseAIChecklist] = useState(false);
  const [templateRefreshKey, setTemplateRefreshKey] = useState(0);

  // Find linked SSOP
  const linkedSsop = ssops.find(s => 
    s.title === evaluation?.training_title || 
    s.id === evaluation?.ssop_id
  );

  // Fetch existing template for this SSOP
  const { data: existingTemplate, refetch: refetchTemplate } = useQuery({
    queryKey: ["evaluation_template", linkedSsop?.id, templateRefreshKey],
    queryFn: async () => {
      if (!linkedSsop?.id) return null;
      const templates = await EvaluationTemplateRepo.filter({
        ssop_id: linkedSsop.id,
        status: "approved"
      });
      return templates[0] || null;
    },
    enabled: !!linkedSsop?.id && open
  });

  const handleTemplateUpdated = () => {
    setTemplateRefreshKey(prev => prev + 1);
    refetchTemplate();
  };

  // Generate checklist from template, SSOP, or use default
  useEffect(() => {
    if (!open) return;
    
    // Priority 1: Use existing approved template
    if (existingTemplate?.checklist_items?.length > 0) {
      setChecklistItems(existingTemplate.checklist_items.map(item => ({
        ...item,
        passed: null,
        notes: ""
      })));
      setUseAIChecklist(true);
    }
    // Priority 2: Generate from SSOP steps
    else if (linkedSsop?.steps?.length > 0) {
      const items = linkedSsop.steps.map((step, idx) => ({
        id: `step-${idx}`,
        item: step.title || `Step ${step.step_number || idx + 1}`,
        category: "procedure",
        passed: null,
        notes: ""
      }));
      
      // Add safety checks
      if (linkedSsop.ppe_required?.length > 0) {
        items.unshift({
          id: "ppe",
          item: `PPE Requirements: ${linkedSsop.ppe_required.join(", ")}`,
          category: "safety",
          passed: null,
          notes: ""
        });
      }
      
      // Add quality checks
      items.push({
        id: "quality-final",
        item: "Final quality meets standards",
        category: "quality",
        passed: null,
        notes: ""
      });
      
      setChecklistItems(items);
    } 
    // Priority 3: Default checklist
    else {
      setChecklistItems([
        { id: "safety-ppe", item: "Proper PPE worn throughout", category: "safety", passed: null, notes: "" },
        { id: "safety-loto", item: "LOTO procedures followed (if applicable)", category: "safety", passed: null, notes: "" },
        { id: "procedure-steps", item: "All procedure steps followed correctly", category: "procedure", passed: null, notes: "" },
        { id: "procedure-sequence", item: "Correct sequence maintained", category: "procedure", passed: null, notes: "" },
        { id: "chemicals", item: "Chemicals used correctly and safely", category: "safety", passed: null, notes: "" },
        { id: "quality-clean", item: "Area/equipment properly cleaned", category: "quality", passed: null, notes: "" },
        { id: "quality-verify", item: "Post-clean verification completed", category: "quality", passed: null, notes: "" }
      ]);
    }
    
    setResult(null);
    setComments("");
    setCoachingNotes("");
    setUseAIChecklist(false);
  }, [linkedSsop, existingTemplate, open]);

  // Handle generated checklist
  const handleAIChecklistGenerated = (newChecklist) => {
    setChecklistItems(newChecklist.map(item => ({
      ...item,
      passed: null,
      notes: ""
    })));
    setUseAIChecklist(true);
  };

  const updateChecklistItem = (id, field, value) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const allItemsChecked = checklistItems.every(item => item.passed !== null);
  const failedItems = checklistItems.filter(item => item.passed === false);
  const passedItems = checklistItems.filter(item => item.passed === true);

  const handleSubmit = async () => {
    if (!result) return;
    
    setIsSubmitting(true);
    
    try {
      const user = evaluator || await getCurrentUser();
      
      const updateData = {
        status: result === "pass" ? "competent" : result === "needs_coaching" ? "needs_coaching" : "not_competent",
        result,
        evaluator_email: user.email,
        evaluator_name: user.full_name || user.name,
        evaluator_role: user.evaluator_role || (user.role === "admin" ? "manager" : "supervisor"),
        evaluated_at: new Date().toISOString(),
        checklist_items: checklistItems,
        comments,
        coaching_notes: result !== "pass" ? coachingNotes : "",
        retraining_required: result === "not_competent",
        ssop_version: linkedSsop?.version ? String(linkedSsop.version) : null,
        re_eval_allowed_after: result === "needs_coaching" 
          ? format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") // 1 week
          : result === "not_competent"
            ? format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") // 30 days
            : null
      };
      
      await CompetencyEvaluationRepo.update(evaluation.id, updateData);

      // Save template if generated and user is manager
      if (useAIChecklist && linkedSsop && (user.role === "admin" || user.evaluator_role === "manager")) {
        const existingTemplates = await EvaluationTemplateRepo.filter({
          ssop_id: linkedSsop.id
        });
        
        if (existingTemplates.length === 0) {
          await EvaluationTemplateRepo.create({
            organization_id: evaluation.organization_id,
            ssop_id: linkedSsop.id,
            ssop_version: linkedSsop.version || 1,
            ssop_title: linkedSsop.title,
            cleaning_method: linkedSsop.cleaning_method || "wet",
            checklist_items: checklistItems.map(({ passed, notes, ...rest }) => rest),
            ai_generated: true,
            last_edited_by: user.email,
            last_edited_at: new Date().toISOString(),
            status: "draft"
          });
        }
      }
      
      onComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit evaluation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!evaluation) return null;

  const categoryLabels = {
    safety: { label: "Safety", color: "bg-rose-100 text-rose-700" },
    procedure: { label: "Procedure", color: "bg-blue-100 text-blue-700" },
    quality: { label: "Quality", color: "bg-emerald-100 text-emerald-700" }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
            Competency Evaluation
          </DialogTitle>
          <DialogDescription>
            Evaluate {evaluation.employee_name}'s competency for this task
          </DialogDescription>
        </DialogHeader>

        {/* Employee & Task Info */}
        <Card className="p-4 bg-slate-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <User className="w-4 h-4" />
                Employee
              </div>
              <p className="font-medium text-slate-900">{evaluation.employee_name}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <ClipboardCheck className="w-4 h-4" />
                Task/Training
              </div>
              <p className="font-medium text-slate-900">{evaluation.task_title || evaluation.training_title}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Calendar className="w-4 h-4" />
                Training Completed
              </div>
              <p className="font-medium text-slate-900">
                {evaluation.training_completed_at 
                  ? format(new Date(evaluation.training_completed_at), "MMM d, yyyy")
                  : "N/A"}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Shield className="w-4 h-4" />
                Current Status
              </div>
              <Badge className={
                evaluation.status === "evaluation_required" ? "bg-amber-100 text-amber-800" :
                evaluation.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                "bg-slate-100 text-slate-800"
              }>
                {evaluation.status?.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </Card>

        {/* AI Checklist Generator */}
        {linkedSsop && (
          <AIChecklistGenerator
            ssop={linkedSsop}
            existingTemplate={existingTemplate}
            onChecklistGenerated={handleAIChecklistGenerated}
            organizationId={evaluation?.organization_id}
            isManager={isManager}
            onTemplateUpdated={handleTemplateUpdated}
          />
        )}

        {/* Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Evaluation Checklist</Label>
            {useAIChecklist && (
              <Badge className="bg-amber-100 text-amber-700 text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Generated
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">Mark each item as passed or failed based on your observation</p>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {checklistItems.map((item, idx) => {
              const catConfig = categoryLabels[item.category] || categoryLabels.procedure;
              return (
                <div 
                  key={item.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    item.passed === true ? "bg-emerald-50 border-emerald-200" :
                    item.passed === false ? "bg-rose-50 border-rose-200" :
                    "bg-white border-slate-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex gap-2 mt-0.5">
                      <button
                        type="button"
                        onClick={() => updateChecklistItem(item.id, "passed", true)}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                          item.passed === true 
                            ? "bg-emerald-600 text-white" 
                            : "bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600"
                        )}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateChecklistItem(item.id, "passed", false)}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                          item.passed === false 
                            ? "bg-rose-600 text-white" 
                            : "bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                        )}
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", catConfig.color)}>
                          {catConfig.label}
                        </Badge>
                        <span className="text-sm font-medium text-slate-900">{item.item}</span>
                      </div>
                      {item.passed === false && (
                        <input
                          type="text"
                          placeholder="Add notes about the issue..."
                          value={item.notes}
                          onChange={(e) => updateChecklistItem(item.id, "notes", e.target.value)}
                          className="mt-2 w-full text-sm px-2 py-1 border rounded bg-white"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        {allItemsChecked && (
          <div className={cn(
            "p-3 rounded-lg",
            failedItems.length === 0 ? "bg-emerald-50" : "bg-amber-50"
          )}>
            <p className="text-sm font-medium">
              {failedItems.length === 0 ? (
                <span className="text-emerald-700">✓ All {passedItems.length} items passed</span>
              ) : (
                <span className="text-amber-700">⚠ {failedItems.length} item(s) need attention</span>
              )}
            </p>
          </div>
        )}

        {/* Result Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Final Result</Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setResult("pass")}
              className={cn(
                "p-4 rounded-lg border-2 transition-all text-center",
                result === "pass" 
                  ? "border-emerald-600 bg-emerald-50" 
                  : "border-slate-200 hover:border-emerald-300"
              )}
            >
              <CheckCircle2 className={cn("w-8 h-8 mx-auto mb-2", result === "pass" ? "text-emerald-600" : "text-slate-400")} />
              <p className="font-semibold text-slate-900">Pass</p>
              <p className="text-xs text-slate-500">Competent</p>
            </button>
            
            <button
              type="button"
              onClick={() => setResult("needs_coaching")}
              className={cn(
                "p-4 rounded-lg border-2 transition-all text-center",
                result === "needs_coaching" 
                  ? "border-amber-600 bg-amber-50" 
                  : "border-slate-200 hover:border-amber-300"
              )}
            >
              <AlertTriangle className={cn("w-8 h-8 mx-auto mb-2", result === "needs_coaching" ? "text-amber-600" : "text-slate-400")} />
              <p className="font-semibold text-slate-900">Needs Coaching</p>
              <p className="text-xs text-slate-500">Re-eval in 1 week</p>
            </button>
            
            <button
              type="button"
              onClick={() => setResult("not_competent")}
              className={cn(
                "p-4 rounded-lg border-2 transition-all text-center",
                result === "not_competent" 
                  ? "border-rose-600 bg-rose-50" 
                  : "border-slate-200 hover:border-rose-300"
              )}
            >
              <XCircle className={cn("w-8 h-8 mx-auto mb-2", result === "not_competent" ? "text-rose-600" : "text-slate-400")} />
              <p className="font-semibold text-slate-900">Not Competent</p>
              <p className="text-xs text-slate-500">Retraining required</p>
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <Label>Comments</Label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Overall evaluation comments..."
            rows={3}
          />
        </div>

        {/* AI Coaching Suggestions (shown when needs coaching or not competent) */}
        {result && result !== "pass" && (
          <AICoachingSuggestions
            ssop={linkedSsop}
            failedItems={failedItems}
            onCoachingNotesChange={setCoachingNotes}
            currentNotes={coachingNotes}
          />
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!result || !allItemsChecked || isSubmitting || (result !== "pass" && !coachingNotes)}
            className={cn(
              result === "pass" ? "bg-emerald-600 hover:bg-emerald-700" :
              result === "needs_coaching" ? "bg-amber-600 hover:bg-amber-700" :
              result === "not_competent" ? "bg-rose-600 hover:bg-rose-700" :
              "bg-slate-900 hover:bg-slate-800"
            )}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Evaluation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}