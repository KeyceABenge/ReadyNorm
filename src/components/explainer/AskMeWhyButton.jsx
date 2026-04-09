// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HelpCircle, Loader2, Lightbulb, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { invokeLLM } from "@/lib/adapters/integrations";
import { cn } from "@/lib/utils";

/**
 * AskMeWhyButton - Reusable explainer for any generated insight
 * 
 * @param {string} context - Type of insight (health_score, decision_action, risk_flag, quota_adjustment, fatigue_signal, effectiveness, incident)
 * @param {object} data - Relevant data points for the explanation
 * @param {string} label - Optional button label (defaults to "Why?")
 * @param {string} variant - Button variant
 * @param {string} size - Button size
 * @param {string} className - Additional classes
 */
export default function AskMeWhyButton({
  context,
  data = {},
  label = "Why?",
  variant = "ghost",
  size = "sm",
  className,
  iconOnly = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);

  const generateExplanation = async () => {
    if (explanation) {
      setIsOpen(true);
      return;
    }

    setIsOpen(true);
    setIsLoading(true);

    const prompt = buildPrompt(context, data);

    try {
      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "One sentence plain-language summary" },
            dataConsidered: { type: "array", items: { type: "string" }, description: "What data points were looked at" },
            patternsObserved: { type: "array", items: { type: "string" }, description: "What patterns or conditions were found" },
            improvements: { type: "array", items: { type: "string" }, description: "What specific actions would improve this" },
            confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level of the assessment" }
          }
        }
      });

      setExplanation(response);
    } catch (error) {
      console.error("Explanation error:", error);
      setExplanation({
        summary: "Unable to generate explanation at this time.",
        dataConsidered: [],
        patternsObserved: [],
        improvements: [],
        confidence: "low"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={generateExplanation}
        className={cn("text-slate-500 hover:text-slate-700", className)}
      >
        <HelpCircle className="w-4 h-4" />
        {!iconOnly && <span className="ml-1">{label}</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              {getContextTitle(context)}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500">Analyzing the data...</p>
            </div>
          ) : explanation ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-800 font-medium">{explanation.summary}</p>
              </div>

              {/* What was considered */}
              {explanation.dataConsidered?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    What We Looked At
                  </h4>
                  <ul className="space-y-1">
                    {explanation.dataConsidered.map((item, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What was observed */}
              {explanation.patternsObserved?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    What We Noticed
                  </h4>
                  <ul className="space-y-1">
                    {explanation.patternsObserved.map((item, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* How to improve */}
              {explanation.improvements?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    How to Improve
                  </h4>
                  <ul className="space-y-1">
                    {explanation.improvements.map((item, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confidence indicator */}
              <div className="pt-3 border-t text-xs text-slate-400 flex items-center justify-between">
                <span>Assessment confidence: {explanation.confidence}</span>
                <span>Generated explanation</span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function getContextTitle(context) {
  const titles = {
    health_score: "Why This Health Score?",
    decision_action: "Why This Recommendation?",
    risk_flag: "Why This Risk Alert?",
    quota_adjustment: "Why This Quota Change?",
    fatigue_signal: "Why This Fatigue Alert?",
    effectiveness: "Why This Effectiveness Rating?",
    incident: "Why This Classification?",
    training_gap: "Why This Training Recommendation?",
    competency: "Why This Competency Status?",
    prediction: "Why This Prediction?",
    coaching: "Why This Coaching Suggestion?"
  };
  return titles[context] || "Why This Result?";
}

function buildPrompt(context, data) {
  const baseInstruction = `You are explaining an automatically generated insight to a non-technical user. Be clear, supportive, and constructive. Never assign blame. Focus on helping them understand and improve. Use plain language.

Context type: ${context}
Data provided: ${JSON.stringify(data, null, 2)}

Generate an explanation that:
1. Summarizes what this score/recommendation means in one sentence
2. Lists 2-4 specific data points that were considered (in plain terms)
3. Lists 2-3 patterns or conditions that influenced the result
4. Lists 2-4 specific, actionable improvements they could make

Be encouraging even when highlighting areas for improvement.`;

  const contextPrompts = {
    health_score: `${baseInstruction}

This is a Sanitation Health Score (0-100). Explain what factors contributed to this score, what's working well, and what could improve it. The score combines task completion, ATP testing, training coverage, and verification rates.`,

    decision_action: `${baseInstruction}

This is a recommended action from the Decision Intelligence system. Explain why this action was prioritized, what triggered it, and what benefit completing it will provide.`,

    risk_flag: `${baseInstruction}

This is a risk flag or alert. Explain what conditions triggered this alert, why it matters for food safety, and what steps would resolve or reduce the risk. Be reassuring while emphasizing importance.`,

    quota_adjustment: `${baseInstruction}

This is a recommended quota adjustment. Explain what workload patterns, capacity issues, or performance trends led to this suggestion, and how following it would help balance the workload.`,

    fatigue_signal: `${baseInstruction}

This is a fatigue or strain signal for an employee or team. Explain what behavioral patterns suggested potential burnout or overload, and frame recommendations as supportive adjustments rather than criticisms.`,

    effectiveness: `${baseInstruction}

This is an effectiveness rating or trend. Explain what outcomes or improvements were measured, what contributed to this rating, and how to maintain or improve effectiveness.`,

    incident: `${baseInstruction}

This is an incident or near-miss classification. Explain what factors determined the severity and category, what the incident indicates about the process, and what preventive measures would help.`,

    training_gap: `${baseInstruction}

This is a training gap identification. Explain what qualifications or certifications are missing, why they matter for this role or task, and how completing the training would help.`,

    competency: `${baseInstruction}

This is a competency evaluation result. Explain what skills or knowledge areas were assessed, what the current status means, and what steps would advance their competency.`,

    prediction: `${baseInstruction}

This is a predictive risk assessment. Explain what historical patterns and current conditions inform this prediction, what the likelihood means in practical terms, and what proactive steps could prevent the predicted issue.`,

    coaching: `${baseInstruction}

This is a coaching recommendation. Explain what performance or behavior patterns prompted this suggestion, why coaching would be beneficial, and how to approach the conversation constructively.`
  };

  return contextPrompts[context] || baseInstruction;
}