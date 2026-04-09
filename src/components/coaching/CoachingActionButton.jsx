import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Brain, Loader2, MessageSquare, Target, HelpCircle, CheckCircle2, FileText, RefreshCw, TrendingUp, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { invokeLLM } from "@/lib/adapters/integrations";
import { cn } from "@/lib/utils";

/**
 * Contextual "How to coach this" button that can be placed anywhere in the app
 * to get coaching guidance for a specific situation.
 */
export default function CoachingActionButton({
  // Context about the situation
  situationType, // "performance" | "competency" | "compliance" | "behavior" | "recognition"
  title,
  details,
  employeeName,
  employeeEmail,
  additionalContext = {},
  
  // Styling
  variant = "outline",
  size = "sm",
  className,
  label = "How to coach this"
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coaching, setCoaching] = useState(null);
  const [error, setError] = useState(null);

  const getCoachingGuidance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const contextStr = JSON.stringify({
        ...additionalContext,
        employeeName,
        employeeEmail
      }, null, 2);

      const prompt = `You are an experienced sanitation supervisor mentor. A lead/supervisor needs coaching guidance for this situation:

SITUATION TYPE: ${situationType}
ISSUE: ${title}
DETAILS: ${details}
${employeeName ? `EMPLOYEE: ${employeeName}` : ''}
ADDITIONAL CONTEXT: ${contextStr}

Provide practical, empathetic coaching guidance in this JSON format:
{
  "quickAssessment": "1-2 sentences on what's likely happening and why",
  "conversationStarter": "A specific, empathetic opening line to use",
  "keyQuestions": ["3 open-ended questions to understand the situation"],
  "coachingApproach": ["4-5 specific coaching actions in plain language"],
  "whatToAvoid": "Common mistakes to avoid in this situation",
  "ssopConnection": "How to tie this back to SOPs and food safety culture",
  "followUp": "Recommended follow-up within specific timeframe",
  "successLooksLike": "What improvement should look like"
}

Keep tone supportive and constructive. This is coaching for improvement, not discipline.`;

      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            quickAssessment: { type: "string" },
            conversationStarter: { type: "string" },
            keyQuestions: { type: "array", items: { type: "string" } },
            coachingApproach: { type: "array", items: { type: "string" } },
            whatToAvoid: { type: "string" },
            ssopConnection: { type: "string" },
            followUp: { type: "string" },
            successLooksLike: { type: "string" }
          }
        }
      });

      setCoaching(response);
    } catch (err) {
      console.error("Coaching guidance error:", err);
      setError("Unable to generate coaching guidance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!coaching) {
      getCoachingGuidance();
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={cn("gap-1.5", className)}
      >
        <Brain className="w-3.5 h-3.5" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              Coaching Guidance
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Situation Summary */}
            <div className="p-3 bg-slate-50 rounded-lg border">
              <p className="text-sm font-medium text-slate-900">{title}</p>
              <p className="text-sm text-slate-600 mt-1">{details}</p>
              {employeeName && (
                <Badge variant="outline" className="mt-2">{employeeName}</Badge>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
                <span className="text-slate-600">Generating coaching guidance...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 rounded-lg text-rose-700 text-sm">
                {error}
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="ml-2"
                  onClick={getCoachingGuidance}
                >
                  Retry
                </Button>
              </div>
            ) : coaching ? (
              <div className="space-y-4">
                {/* Quick Assessment */}
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    <p className="text-sm font-semibold text-indigo-900">Quick Assessment</p>
                  </div>
                  <p className="text-sm text-indigo-800">{coaching.quickAssessment}</p>
                </div>

                {/* Conversation Starter */}
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-900">Start the Conversation</p>
                  </div>
                  <p className="text-sm text-emerald-800 italic">"{coaching.conversationStarter}"</p>
                </div>

                {/* Key Questions */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Questions to Ask
                  </p>
                  <ul className="space-y-2">
                    {coaching.keyQuestions?.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {i + 1}
                        </span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Coaching Approach */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Coaching Approach
                  </p>
                  <ul className="space-y-2">
                    {coaching.coachingApproach?.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What to Avoid */}
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <p className="text-xs font-semibold text-rose-800 mb-1">⚠️ Avoid</p>
                  <p className="text-sm text-rose-700">{coaching.whatToAvoid}</p>
                </div>

                {/* SSOP Connection */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-semibold text-blue-800">Connect to SOPs & Food Safety</p>
                  </div>
                  <p className="text-sm text-blue-700">{coaching.ssopConnection}</p>
                </div>

                {/* Follow-up */}
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="w-4 h-4 text-purple-600" />
                    <p className="text-xs font-semibold text-purple-800">Follow-Up</p>
                  </div>
                  <p className="text-sm text-purple-700">{coaching.followUp}</p>
                </div>

                {/* Success */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <p className="text-xs font-semibold text-amber-800">Success Looks Like</p>
                  </div>
                  <p className="text-sm text-amber-700">{coaching.successLooksLike}</p>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}