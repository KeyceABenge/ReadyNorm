import { useState, useEffect } from "react";
import { invokeLLM } from "@/lib/adapters/integrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, Loader2, RefreshCw, CheckCircle2, 
  Shield, Beaker, ClipboardCheck, Eye, Edit3
} from "lucide-react";
import { cn } from "@/lib/utils";
import EvaluationTemplateEditor from "./EvaluationTemplateEditor";

// 7 Steps of Sanitation (adapted for wet/dry/hybrid)
const SANITATION_STEPS = {
  wet: [
    { step: 1, name: "Dry Clean / Gross Soil Removal", key: "dry_clean" },
    { step: 2, name: "Pre-Rinse", key: "pre_rinse" },
    { step: 3, name: "Soap / Detergent Application", key: "soap" },
    { step: 4, name: "Post-Rinse", key: "post_rinse" },
    { step: 5, name: "Sanitizer Application", key: "sanitize" },
    { step: 6, name: "Final Rinse (if required)", key: "final_rinse" },
    { step: 7, name: "Inspection / Verification", key: "inspection" }
  ],
  dry: [
    { step: 1, name: "Gross Debris Removal", key: "debris" },
    { step: 2, name: "Vacuum / Air Clean", key: "vacuum" },
    { step: 3, name: "Wipe Down / Dry Clean", key: "wipe" },
    { step: 4, name: "Sanitizer Application (if approved)", key: "sanitize" },
    { step: 5, name: "Inspection / Verification", key: "inspection" }
  ],
  hybrid: [
    { step: 1, name: "Dry Clean / Gross Soil Removal", key: "dry_clean" },
    { step: 2, name: "Targeted Wet Clean", key: "targeted_wet" },
    { step: 3, name: "Detergent Application", key: "soap" },
    { step: 4, name: "Rinse", key: "rinse" },
    { step: 5, name: "Dry / Air Dry", key: "dry" },
    { step: 6, name: "Sanitizer Application", key: "sanitize" },
    { step: 7, name: "Inspection / Verification", key: "inspection" }
  ]
};

export default function AIChecklistGenerator({ 
  ssop, 
  existingTemplate,
  onChecklistGenerated,
  organizationId,
  isManager = false,
  onTemplateUpdated
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedChecklist, setGeneratedChecklist] = useState([]);
  const [error, setError] = useState(null);
  const [lastSsopId, setLastSsopId] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(existingTemplate);

  // Reset checklist when SSOP changes
  useEffect(() => {
    if (ssop?.id !== lastSsopId) {
      setLastSsopId(ssop?.id);
      setGeneratedChecklist([]);
      setError(null);
      setCurrentTemplate(existingTemplate);
      
      // Load existing template if available for this SSOP
      if (existingTemplate?.checklist_items?.length > 0 && existingTemplate.ssop_id === ssop?.id) {
        setGeneratedChecklist(existingTemplate.checklist_items);
      }
    }
  }, [ssop?.id, existingTemplate, lastSsopId]);

  // Update current template when existingTemplate changes
  useEffect(() => {
    if (existingTemplate?.ssop_id === ssop?.id) {
      setCurrentTemplate(existingTemplate);
    }
  }, [existingTemplate, ssop?.id]);

  const generateChecklist = async () => {
    if (!ssop) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const cleaningMethod = ssop.cleaning_method || "wet";
      const steps = SANITATION_STEPS[cleaningMethod] || SANITATION_STEPS.wet;
      
      // Build prompt for AI
      const prompt = `You are a food safety expert creating a competency evaluation checklist for sanitation workers.

SSOP Title: ${ssop.title}
Cleaning Method: ${cleaningMethod}
Zone Type: ${ssop.zone_type || "general"}
Disassembly Level: ${ssop.disassembly_level || "partial"}

SSOP Steps:
${ssop.steps?.map((s, i) => `${i + 1}. ${s.title}: ${s.description || ""}`).join("\n") || "No specific steps provided"}

PPE Required: ${ssop.ppe_required?.join(", ") || "Standard PPE"}
Chemicals Used: ${ssop.chemicals_used?.join(", ") || "Standard chemicals"}
Tools Required: ${ssop.tools_required?.join(", ") || "Standard tools"}

The 7 Steps of Sanitation for ${cleaningMethod} cleaning are:
${steps.map(s => `${s.step}. ${s.name}`).join("\n")}

Generate a practical, observable competency checklist with 10-15 items. Each item should be:
- Specific and observable (evaluator can see if done correctly)
- Aligned to one of the sanitation steps above
- Include safety items for PPE and chemical handling
- Include post-clean inspection items

Return JSON array with objects containing:
- id: unique string
- item: the checklist item text (keep concise, max 80 chars)
- category: one of "safety", "pre_op", "procedure", "chemical", "quality", "post_clean"
- sanitation_step: which step number (1-7) this relates to
- critical: true if this is a critical food safety item`;

      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            checklist: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  item: { type: "string" },
                  category: { type: "string" },
                  sanitation_step: { type: "string" },
                  critical: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      const checklist = response.checklist || [];
      setGeneratedChecklist(checklist);
      onChecklistGenerated?.(checklist);
      
      // Create a draft template for editing
      setCurrentTemplate({
        ssop_id: ssop.id,
        ssop_version: ssop.version || 1,
        ssop_title: ssop.title,
        cleaning_method: ssop.cleaning_method || "wet",
        checklist_items: checklist,
        ai_generated: true,
        status: "draft"
      });
      
    } catch (err) {
      console.error("Failed to generate checklist:", err);
      setError("Failed to generate checklist. Using default template.");
      
      // Fallback to default checklist
      const defaultChecklist = generateDefaultChecklist(ssop);
      setGeneratedChecklist(defaultChecklist);
      onChecklistGenerated?.(defaultChecklist);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDefaultChecklist = (ssop) => {
    const cleaningMethod = ssop?.cleaning_method || "wet";
    const items = [];
    
    // Safety items
    items.push({
      id: "safety-ppe",
      item: `Proper PPE worn: ${ssop?.ppe_required?.join(", ") || "gloves, safety glasses, apron"}`,
      category: "safety",
      sanitation_step: "1",
      critical: true
    });
    
    items.push({
      id: "safety-loto",
      item: "Equipment properly locked out/tagged out before cleaning",
      category: "safety",
      sanitation_step: "1",
      critical: true
    });

    // Add steps based on cleaning method
    const steps = SANITATION_STEPS[cleaningMethod] || SANITATION_STEPS.wet;
    steps.forEach((step, idx) => {
      items.push({
        id: `step-${idx}`,
        item: `${step.name} completed correctly`,
        category: "procedure",
        sanitation_step: String(step.step),
        critical: step.key === "sanitize"
      });
    });

    // Chemical handling
    if (ssop?.chemicals_used?.length > 0) {
      items.push({
        id: "chemical-dilution",
        item: "Chemicals diluted to correct concentration",
        category: "chemical",
        sanitation_step: "3",
        critical: true
      });
    }

    // Post-clean inspection
    items.push({
      id: "post-visual",
      item: "Visual inspection shows no residue or debris",
      category: "post_clean",
      sanitation_step: "7",
      critical: true
    });
    
    items.push({
      id: "post-reassembly",
      item: "Equipment properly reassembled (if applicable)",
      category: "post_clean",
      sanitation_step: "7",
      critical: false
    });

    return items;
  };

  const categoryConfig = {
    safety: { icon: Shield, color: "bg-rose-100 text-rose-700", label: "Safety" },
    pre_op: { icon: ClipboardCheck, color: "bg-blue-100 text-blue-700", label: "Pre-Op" },
    procedure: { icon: ClipboardCheck, color: "bg-indigo-100 text-indigo-700", label: "Procedure" },
    chemical: { icon: Beaker, color: "bg-purple-100 text-purple-700", label: "Chemical" },
    quality: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700", label: "Quality" },
    post_clean: { icon: Eye, color: "bg-amber-100 text-amber-700", label: "Post-Clean" }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span className="font-medium text-slate-900">Evaluation Assist</span>
          <Badge variant="outline" className="text-xs">Beta</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {isManager && generatedChecklist.length > 0 && (
            <Button
              onClick={() => setShowEditor(true)}
              size="sm"
              variant="outline"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit & Approve
            </Button>
          )}
          <Button
            onClick={generateChecklist}
            disabled={isGenerating || !ssop}
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : generatedChecklist.length > 0 ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Checklist
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">{error}</p>
      )}

      {ssop && (
        <Card className="p-3 bg-slate-50">
          <div className="text-sm">
            <p className="font-medium text-slate-900">{ssop.title}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize">
                {ssop.cleaning_method || "wet"} clean
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {ssop.zone_type || "general"} zone
              </Badge>
              <Badge variant="outline" className="text-xs">
                v{ssop.version || 1}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {generatedChecklist.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {generatedChecklist.length} checklist items generated from SSOP
            </p>
            {currentTemplate?.status === "approved" && (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Approved
              </Badge>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {generatedChecklist.map((item, idx) => {
              const config = categoryConfig[item.category] || categoryConfig.procedure;
              return (
                <div 
                  key={item.id || idx}
                  className="flex items-center gap-2 p-2 bg-white rounded border text-sm"
                >
                  <Badge className={cn("text-xs shrink-0", config.color)}>
                    {config.label}
                  </Badge>
                  <span className="flex-1 truncate">{item.item}</span>
                  {item.critical && (
                    <Badge className="bg-rose-600 text-white text-xs">Critical</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
      <EvaluationTemplateEditor
        open={showEditor}
        onOpenChange={setShowEditor}
        template={currentTemplate}
        ssop={ssop}
        organizationId={organizationId}
        onSave={() => {
          onTemplateUpdated?.();
        }}
      />
    </div>
  );
}