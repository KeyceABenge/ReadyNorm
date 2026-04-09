import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle, CheckCircle2, ArrowRight, Shield, Brain,
  Loader2, RefreshCw
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const WORKFLOW_STEPS = [
  { id: "open", label: "Reported", icon: AlertTriangle },
  { id: "containment", label: "Containment", icon: Shield },
  { id: "correction", label: "Correction", icon: RefreshCw },
  { id: "corrective_action", label: "Corrective Action", icon: ArrowRight },
  { id: "verification", label: "Verification", icon: CheckCircle2 },
  { id: "closed", label: "Closed", icon: CheckCircle2 }
];

const STEP_ORDER = ["open", "containment", "correction", "corrective_action", "verification", "closed"];

export default function IncidentDetailModal({
  incident,
  employees,
  tasks,
  ssops,
  trainingDocuments,
  competencyEvaluations,
  onUpdate,
  onClose,
  currentUser
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [rootCause, setRootCause] = useState(incident.root_cause || "");

  const currentStepIndex = STEP_ORDER.indexOf(incident.status);
  const progress = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

  const advanceWorkflow = async () => {
    if (incident.status === "closed") return;
    
    const nextStep = STEP_ORDER[currentStepIndex + 1];
    if (!nextStep) return;

    setIsUpdating(true);
    try {
      const updateData = {
        status: nextStep,
        [`${incident.status}_completed_at`]: new Date().toISOString(),
        [`${incident.status}_completed_by`]: currentUser?.email
      };

      // Add notes to appropriate field
      if (actionNotes) {
        if (incident.status === "containment") updateData.containment_actions = actionNotes;
        else if (incident.status === "correction") updateData.correction_actions = actionNotes;
        else if (incident.status === "corrective_action") updateData.corrective_actions = actionNotes;
        else if (incident.status === "verification") updateData.verification_notes = actionNotes;
      }

      if (rootCause && incident.status === "correction") {
        updateData.root_cause = rootCause;
      }

      if (nextStep === "closed") {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = currentUser?.email;
      }

      await onUpdate(incident.id, updateData);
      setActionNotes("");
      toast.success(`Incident moved to ${nextStep.replace("_", " ")}`);
    } catch (error) {
      toast.error("Failed to update incident");
    } finally {
      setIsUpdating(false);
    }
  };

  const generateRecommendations = async () => {
    setIsGeneratingRecommendations(true);
    try {
      const prompt = `Analyze this sanitation incident and provide recommendations:

INCIDENT DETAILS:
- Title: ${incident.title}
- Category: ${incident.category}
- Severity: ${incident.severity}
- Description: ${incident.description}
- Location: ${incident.area_name || incident.location || "Not specified"}

Provide a JSON response with:
{
  "containmentActions": ["array of immediate containment steps"],
  "rootCausePossibilities": ["array of likely root causes"],
  "correctiveActions": ["array of corrective actions to prevent recurrence"],
  "recommendedTraining": ["array of training topics if applicable"],
  "coachingRecommendation": "brief coaching recommendation if employee-related"
}`;

      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            containmentActions: { type: "array", items: { type: "string" } },
            rootCausePossibilities: { type: "array", items: { type: "string" } },
            correctiveActions: { type: "array", items: { type: "string" } },
            recommendedTraining: { type: "array", items: { type: "string" } },
            coachingRecommendation: { type: "string" }
          }
        }
      });

      const recommendations = [
        ...response.containmentActions.map(a => ({ type: "containment", description: a })),
        ...response.correctiveActions.map(a => ({ type: "corrective", description: a })),
        ...response.recommendedTraining.map(t => ({ type: "training", description: t }))
      ];

      if (response.coachingRecommendation) {
        recommendations.push({ type: "coaching", description: response.coachingRecommendation });
      }

      await onUpdate(incident.id, { recommended_actions: recommendations });
      toast.success("Recommendations generated");
    } catch (error) {
      toast.error("Failed to generate recommendations");
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const getStepPrompt = () => {
    switch (incident.status) {
      case "open":
        return "Describe immediate containment actions taken...";
      case "containment":
        return "What corrections were made to fix the immediate issue?";
      case "correction":
        return "What corrective actions will prevent recurrence?";
      case "corrective_action":
        return "Verify that corrective actions are effective...";
      default:
        return "";
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {incident.incident_number || `INC-${incident.id?.slice(-6)}`}
            </Badge>
            <Badge className={cn(
              incident.severity === "critical" ? "bg-rose-100 text-rose-700" :
              incident.severity === "high" ? "bg-orange-100 text-orange-700" :
              incident.severity === "medium" ? "bg-amber-100 text-amber-700" :
              "bg-slate-100 text-slate-700"
            )}>
              {incident.severity}
            </Badge>
            {incident.type === "near_miss" && (
              <Badge className="bg-blue-100 text-blue-700">Near Miss</Badge>
            )}
          </div>
          <DialogTitle className="text-xl">{incident.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Workflow Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Response Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-2 mb-4" />
              <div className="flex justify-between">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const StepIcon = step.icon;
                  const isComplete = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isComplete ? "bg-emerald-500 text-white" :
                        isCurrent ? "bg-blue-500 text-white" :
                        "bg-slate-200 text-slate-500"
                      )}>
                        <StepIcon className="w-4 h-4" />
                      </div>
                      <span className={cn(
                        "text-xs mt-1",
                        isCurrent ? "font-semibold text-blue-600" : "text-slate-500"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Description</h4>
            <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{incident.description}</p>
          </div>

          {/* Photos */}
          {incident.photo_urls?.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Photos</h4>
              <div className="flex gap-2 flex-wrap">
                {incident.photo_urls.map((url, idx) => (
                  <img key={idx} src={url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          <Card className="border-indigo-200 bg-indigo-50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  AI Recommendations
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={generateRecommendations}
                  disabled={isGeneratingRecommendations}
                >
                  {isGeneratingRecommendations ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {incident.recommended_actions?.length > 0 ? (
                <div className="space-y-2">
                  {incident.recommended_actions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {action.type}
                      </Badge>
                      <span className="text-slate-700">{action.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-indigo-700">
                  Click "Generate" to get recommendations for this incident.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Action Input */}
          {incident.status !== "closed" && (
            <div className="space-y-3">
              {incident.status === "correction" && (
                <div>
                  <Label>Root Cause</Label>
                  <Textarea
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="Identify the root cause..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              )}
              
              <div>
                <Label>
                  {incident.status === "open" ? "Containment Actions" :
                   incident.status === "containment" ? "Correction Actions" :
                   incident.status === "correction" ? "Corrective Actions" :
                   incident.status === "corrective_action" ? "Verification Notes" :
                   "Notes"}
                </Label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={getStepPrompt()}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={advanceWorkflow}
                disabled={isUpdating}
                className="w-full"
              >
                {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Complete {incident.status.replace("_", " ")} & Advance
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Completed Actions Summary */}
          {(incident.containment_actions || incident.correction_actions || incident.corrective_actions) && (
            <div className="space-y-3">
              <h4 className="font-medium text-slate-900">Actions Taken</h4>
              {incident.containment_actions && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-1">Containment</p>
                  <p className="text-sm text-slate-700">{incident.containment_actions}</p>
                </div>
              )}
              {incident.correction_actions && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-1">Correction</p>
                  <p className="text-sm text-slate-700">{incident.correction_actions}</p>
                </div>
              )}
              {incident.corrective_actions && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-1">Corrective Action</p>
                  <p className="text-sm text-slate-700">{incident.corrective_actions}</p>
                </div>
              )}
              {incident.root_cause && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-medium text-amber-700 mb-1">Root Cause</p>
                  <p className="text-sm text-amber-900">{incident.root_cause}</p>
                </div>
              )}
            </div>
          )}

          {/* Meta Info */}
          <div className="text-xs text-slate-500 pt-4 border-t">
            <p>Reported by {incident.reported_by_name} on {incident.created_date && format(parseISO(incident.created_date), "MMM d, yyyy 'at' h:mm a")}</p>
            {incident.closed_at && (
              <p className="text-emerald-600">Closed on {format(parseISO(incident.closed_at), "MMM d, yyyy 'at' h:mm a")}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}