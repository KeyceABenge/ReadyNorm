import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, Lightbulb, RefreshCw, AlertTriangle, TrendingUp,
  Loader2, CheckCircle2, Link2
} from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CAPARepo } from "@/lib/adapters/database";

export default function CAPAIntelligence({ capa, allCapas, onSuggestionApply }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(capa?.ai_suggestions || null);

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const result = await invokeLLM({
        prompt: `You are a food safety and quality management expert. Analyze this CAPA (Corrective and Preventive Action) and provide intelligent suggestions.

CAPA Title: ${capa.title}
Problem Description: ${capa.problem_description}
Category: ${capa.category || "Not specified"}
Area: ${capa.area_name || "Not specified"}
Severity: ${capa.severity}
Source: ${capa.source}
Containment Actions: ${capa.containment_actions || "None documented"}
Current Root Cause: ${capa.root_cause_statement || "Not yet determined"}

Historical Context - Similar CAPAs in this facility:
${allCapas
  .filter(c => c.id !== capa.id && (c.category === capa.category || c.area_name === capa.area_name))
  .slice(0, 5)
  .map(c => `- ${c.title}: ${c.root_cause_statement || "No root cause"}`)
  .join("\n") || "No similar CAPAs found"}

Provide analysis including:
1. Suggested root cause prompts (questions to investigate)
2. Potential risk factors to consider
3. Similar patterns from historical data
4. Recommended preventive measures`,
        response_json_schema: {
          type: "object",
          properties: {
            root_cause_prompts: {
              type: "array",
              items: { type: "string" },
              description: "Guiding questions to help identify root cause"
            },
            risk_factors: {
              type: "array",
              items: { type: "string" },
              description: "Risk factors to investigate"
            },
            pattern_insights: {
              type: "string",
              description: "Insights about patterns with similar CAPAs"
            },
            preventive_recommendations: {
              type: "array",
              items: { type: "string" },
              description: "Recommended preventive actions"
            },
            estimated_complexity: {
              type: "string",
              enum: ["simple", "moderate", "complex"],
              description: "Estimated complexity of resolution"
            }
          }
        }
      });

      setSuggestions(result);
      
      // Save to CAPA
      await CAPARepo.update(capa.id, {
        ai_suggestions: result
      });
      
      toast.success("AI analysis complete");
    } catch (error) {
      console.error("AI analysis error:", error);
      toast.error("Failed to analyze CAPA");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Find potential recurrences
  const potentialRecurrences = allCapas.filter(c => 
    c.id !== capa.id &&
    c.status === "closed" &&
    (
      (c.category === capa.category && c.area_name === capa.area_name) ||
      c.title?.toLowerCase().includes(capa.title?.toLowerCase().split(" ")[0]) ||
      (c.root_cause_statement && capa.problem_description?.toLowerCase().includes(
        c.root_cause_statement.toLowerCase().split(" ").slice(0, 3).join(" ")
      ))
    )
  ).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* AI Analysis Button */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              CAPA Intelligence
            </CardTitle>
            <Button 
              onClick={analyzeWithAI}
              disabled={isAnalyzing}
              variant="outline"
              size="sm"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {suggestions ? "Re-analyze" : "Analyze with AI"}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!suggestions && !isAnalyzing && (
            <p className="text-sm text-slate-500 text-center py-4">
              Click "Analyze with AI" to get intelligent suggestions for root cause investigation and preventive actions.
            </p>
          )}

          {suggestions && (
            <div className="space-y-4">
              {/* Complexity Estimate */}
              {suggestions.estimated_complexity && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Estimated Complexity:</span>
                  <Badge className={cn(
                    suggestions.estimated_complexity === "simple" ? "bg-green-100 text-green-800" :
                    suggestions.estimated_complexity === "moderate" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  )}>
                    {suggestions.estimated_complexity}
                  </Badge>
                </div>
              )}

              {/* Root Cause Prompts */}
              {suggestions.root_cause_prompts?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Investigation Questions
                  </h4>
                  <ul className="space-y-1">
                    {suggestions.root_cause_prompts.map((prompt, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        {prompt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Factors */}
              {suggestions.risk_factors?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Risk Factors to Consider
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.risk_factors.map((factor, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Pattern Insights */}
              {suggestions.pattern_insights && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Pattern Insights
                  </h4>
                  <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
                    {suggestions.pattern_insights}
                  </p>
                </div>
              )}

              {/* Preventive Recommendations */}
              {suggestions.preventive_recommendations?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Recommended Preventive Actions
                  </h4>
                  <ul className="space-y-1">
                    {suggestions.preventive_recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurrence Detection */}
      {potentialRecurrences.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-purple-500" />
              Potential Recurrences Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-purple-700 mb-3">
              This issue may be related to previously closed CAPAs:
            </p>
            <div className="space-y-2">
              {potentialRecurrences.map(related => (
                <div 
                  key={related.id}
                  className="p-2 bg-white rounded border border-purple-200 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-purple-600">{related.capa_id}</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">Closed</Badge>
                  </div>
                  <p className="font-medium text-slate-900">{related.title}</p>
                  {related.root_cause_statement && (
                    <p className="text-xs text-slate-500 mt-1">
                      Root Cause: {related.root_cause_statement.slice(0, 100)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 w-full"
              onClick={() => onSuggestionApply?.({ 
                is_recurrence: true, 
                related_capa_ids: potentialRecurrences.map(c => c.id) 
              })}
            >
              Mark as Recurrence
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}