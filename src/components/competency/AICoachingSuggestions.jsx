import { useState } from "react";
import { invokeLLM } from "@/lib/adapters/integrations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, Loader2, Lightbulb, Edit3, CheckCircle2,
  AlertTriangle, BookOpen
} from "lucide-react";

export default function AICoachingSuggestions({ 
  ssop,
  failedItems = [],
  onCoachingNotesChange,
  currentNotes = ""
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(currentNotes);

  const generateCoachingSuggestions = async () => {
    if (failedItems.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      const prompt = `You are a food safety trainer providing coaching guidance for a sanitation employee who needs improvement.

SSOP: ${ssop?.title || "Sanitation procedure"}
Cleaning Method: ${ssop?.cleaning_method || "wet"}

The employee failed the following checklist items during their competency evaluation:
${failedItems.map((item, i) => `${i + 1}. ${item.item}${item.notes ? ` - Evaluator note: "${item.notes}"` : ""}`).join("\n")}

SSOP Content for reference:
${ssop?.content?.substring(0, 1500) || ssop?.steps?.map(s => `${s.title}: ${s.description}`).join("\n") || "No detailed SSOP content available"}

Generate practical coaching notes that:
1. Are specific to the failed items
2. Reference the SSOP steps they should review
3. Provide actionable improvement steps
4. Are encouraging but direct
5. Include a recommended timeline for re-evaluation

Keep the total response under 300 words. Format as clear bullet points or numbered steps.`;

      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            coaching_notes: {
              type: "string",
              description: "The coaching notes text"
            },
            focus_areas: {
              type: "array",
              items: { type: "string" },
              description: "Key areas to focus on"
            },
            recommended_actions: {
              type: "array",
              items: { type: "string" },
              description: "Specific actions to take"
            },
            re_eval_timeline: {
              type: "string",
              description: "Recommended timeline for re-evaluation"
            }
          }
        }
      });

      setSuggestions(response);
      
      // Build formatted coaching notes
      const formattedNotes = buildFormattedNotes(response);
      setEditedNotes(formattedNotes);
      onCoachingNotesChange?.(formattedNotes);
      
    } catch (err) {
      console.error("Failed to generate coaching suggestions:", err);
      // Provide fallback suggestions
      const fallback = generateFallbackSuggestions(failedItems);
      setSuggestions(fallback);
      setEditedNotes(fallback.coaching_notes);
      onCoachingNotesChange?.(fallback.coaching_notes);
    } finally {
      setIsGenerating(false);
    }
  };

  const buildFormattedNotes = (response) => {
    let notes = "";
    
    if (response.focus_areas?.length > 0) {
      notes += "Focus Areas:\n";
      response.focus_areas.forEach(area => {
        notes += `• ${area}\n`;
      });
      notes += "\n";
    }
    
    if (response.recommended_actions?.length > 0) {
      notes += "Recommended Actions:\n";
      response.recommended_actions.forEach((action, i) => {
        notes += `${i + 1}. ${action}\n`;
      });
      notes += "\n";
    }
    
    if (response.re_eval_timeline) {
      notes += `Re-evaluation: ${response.re_eval_timeline}`;
    }
    
    return notes || response.coaching_notes || "";
  };

  const generateFallbackSuggestions = (failedItems) => {
    const focusAreas = failedItems.map(item => item.item);
    
    return {
      coaching_notes: `The employee needs additional coaching on ${failedItems.length} area(s). Please review the SSOP with them and have them practice the specific steps before re-evaluation.`,
      focus_areas: focusAreas.slice(0, 3),
      recommended_actions: [
        "Review the relevant SSOP sections together",
        "Demonstrate the correct procedure step-by-step",
        "Have the employee practice under supervision",
        "Schedule a follow-up evaluation in 1 week"
      ],
      re_eval_timeline: "1 week"
    };
  };

  const handleNotesChange = (value) => {
    setEditedNotes(value);
    onCoachingNotesChange?.(value);
  };

  if (failedItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <span className="font-medium text-slate-900">Coaching Assist</span>
          <Badge variant="outline" className="text-xs bg-amber-50">Suggestions</Badge>
        </div>
        
        {!suggestions && (
          <Button
            onClick={generateCoachingSuggestions}
            disabled={isGenerating}
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Suggestions
              </>
            )}
          </Button>
        )}
      </div>

      {/* Failed Items Summary */}
      <Card className="p-3 bg-rose-50 border-rose-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-rose-800">
              {failedItems.length} item{failedItems.length > 1 ? "s" : ""} need attention
            </p>
            <ul className="mt-1 text-xs text-rose-700 space-y-0.5">
              {failedItems.slice(0, 3).map((item, idx) => (
                <li key={idx}>• {item.item}</li>
              ))}
              {failedItems.length > 3 && (
                <li>• +{failedItems.length - 3} more</li>
              )}
            </ul>
          </div>
        </div>
      </Card>

      {/* AI Suggestions */}
      {suggestions && (
        <div className="space-y-3">
          {/* Focus Areas */}
          {suggestions.focus_areas?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Focus Areas</p>
              <div className="flex flex-wrap gap-1">
                {suggestions.focus_areas.map((area, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-amber-50">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {suggestions.recommended_actions?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Recommended Actions</p>
              <div className="space-y-1">
                {suggestions.recommended_actions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {suggestions.re_eval_timeline && (
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span className="text-slate-600">
                Suggested re-evaluation: <strong>{suggestions.re_eval_timeline}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Editable Coaching Notes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-amber-700">
            Coaching Notes {!suggestions && "(Suggestions available)"}
          </label>
          <Badge variant="outline" className="text-xs">
            <Edit3 className="w-3 h-3 mr-1" />
            Editable
          </Badge>
        </div>
        
        <Textarea
          value={editedNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder={suggestions 
            ? "Edit the generated coaching notes above, or write your own..."
            : "Click 'Generate Suggestions' for assistance, or write your own coaching notes..."}
          rows={5}
          className="border-amber-200 focus:border-amber-400"
        />
        
        <p className="text-xs text-slate-500">
          ✏️ These suggestions are editable. Review and modify before submitting.
        </p>
      </div>
    </div>
  );
}