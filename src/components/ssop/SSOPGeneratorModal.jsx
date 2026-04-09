// @ts-nocheck
import { useState } from "react";
import { SiteSettingsRepo, AreaRepo, ProductionLineRepo, SSOPRepo } from "@/lib/adapters/database";
import { invokeLLM } from "@/lib/adapters/integrations";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Loader2, Sparkles, Plus, X, Droplets, Wind } from "lucide-react";
import { toast } from "sonner";

export default function SSOPGeneratorModal({ organizationId, assets, onClose, onGenerated }) {
  const [ssopTitle, setSsopTitle] = useState("");
  const [equipmentList, setEquipmentList] = useState([
    { name: "", description: "", cleaningMethod: "wet" }
  ]);
  const [zoneType, setZoneType] = useState("general");
  const [disassemblyLevel, setDisassemblyLevel] = useState("partial");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["ssop_settings"],
    queryFn: () => SiteSettingsRepo.list()
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["ssop_areas", organizationId],
    queryFn: () => AreaRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: productionLines = [] } = useQuery({
    queryKey: ["ssop_lines", organizationId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const settings = siteSettings[0] || {};
  const facilityColors = settings.facility_colors || [];

  const addEquipment = () => {
    setEquipmentList([...equipmentList, { name: "", description: "", cleaningMethod: "wet" }]);
  };

  const removeEquipment = (index) => {
    if (equipmentList.length > 1) {
      setEquipmentList(equipmentList.filter((_, i) => i !== index));
    }
  };

  const updateEquipment = (index, field, value) => {
    const updated = [...equipmentList];
    updated[index][field] = value;
    setEquipmentList(updated);
  };

  const wetEquipment = equipmentList.filter(e => e.cleaningMethod === "wet" && e.name.trim());
  const dryEquipment = equipmentList.filter(e => e.cleaningMethod === "dry" && e.name.trim());
  const hybridEquipment = equipmentList.filter(e => e.cleaningMethod === "hybrid" && e.name.trim());

  const handleGenerate = async () => {
    const validEquipment = equipmentList.filter(e => e.name.trim());
    if (validEquipment.length === 0) {
      toast.error("Please add at least one piece of equipment");
      return;
    }
    if (!ssopTitle.trim()) {
      toast.error("Please enter an SSOP title");
      return;
    }

    setIsGenerating(true);

    try {
      console.log("Starting SSOP generation...");
      const colorCodeInfo = facilityColors.length > 0 
        ? `Facility Color Coding Standards:\n${facilityColors.map(c => `- ${c.category}: ${c.color}`).join('\n')}`
        : "No specific color coding defined.";

      const formatEquipmentList = (list, method) => {
        if (list.length === 0) return "None";
        return list.map(e => `- ${e.name}${e.description ? `: ${e.description}` : ''}`).join('\n');
      };

      const prompt = `Generate a comprehensive SSOP (Sanitation Standard Operating Procedure) for the following:

SSOP TITLE: ${ssopTitle}

EQUIPMENT/ASSETS INCLUDED:

WET CLEAN EQUIPMENT:
${formatEquipmentList(wetEquipment, "wet")}

DRY CLEAN EQUIPMENT:
${formatEquipmentList(dryEquipment, "dry")}

HYBRID CLEAN EQUIPMENT:
${formatEquipmentList(hybridEquipment, "hybrid")}

ZONE TYPE: ${zoneType.toUpperCase()}
DISASSEMBLY LEVEL: ${disassemblyLevel.toUpperCase()}

FACILITY STANDARDS:
${colorCodeInfo}

ADDITIONAL NOTES:
${additionalNotes || 'None provided'}

Generate a complete SSOP that covers ALL listed equipment. For each cleaning method type (wet, dry, hybrid), apply the appropriate 7 Steps of Sanitation:

WET CLEANING 7 STEPS:
1. Dry Cleanup - Remove gross debris
2. Pre-Rinse - Warm water rinse (100-120°F)
3. Soap/Detergent Application - Scrub all surfaces
4. Post-Rinse - Thorough clean water rinse
5. Sanitizer Application - Proper concentration
6. Final Rinse (if required)
7. Inspection - Verify cleanliness

DRY CLEANING 7 STEPS:
1. Dry Debris Removal - Vacuum/brush/scrape
2. Dry Scrubbing - Approved dry cleaning tools
3. Compressed Air (if approved)
4. Vacuum Again - Remove loosened debris
5. Sanitizer Wipe/Spray - Food-safe sanitizer sparingly
6. Dry Wipe - Remove excess moisture immediately
7. Inspection - Verify cleanliness

Include:
1. Clear sections for each cleaning method type used
2. Required PPE (personal protective equipment)
3. Required chemicals with concentrations
4. Required tools (reference color coding if applicable)
5. Step-by-step instructions with time estimates for each equipment piece
6. Safety warnings and critical control points
7. Verification/inspection criteria
8. Special considerations for ${zoneType} zones

Format the response as a detailed, professional SSOP document that covers all equipment listed.`;

      console.log("Calling LLM...");
      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            scope: { type: "string" },
            ppe_required: { type: "array", items: { type: "string" } },
            chemicals_used: { type: "array", items: { type: "string" } },
            tools_required: { type: "array", items: { type: "string" } },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step_number: { type: "number" },
                  title: { type: "string" },
                  description: { type: "string" },
                  time_estimate: { type: "string" },
                  safety_notes: { type: "string" }
                }
              }
            },
            verification_criteria: { type: "array", items: { type: "string" } },
            safety_warnings: { type: "array", items: { type: "string" } }
          }
        }
      });
      console.log("LLM Response:", response);

      // Determine primary cleaning method
      const primaryMethod = wetEquipment.length >= dryEquipment.length && wetEquipment.length >= hybridEquipment.length 
        ? "wet" 
        : dryEquipment.length >= hybridEquipment.length ? "dry" : "hybrid";

      // Create the SSOP draft
      console.log("Creating SSOP record...");
      const createdSsop = await SSOPRepo.create({
        organization_id: organizationId,
        title: response.title || ssopTitle,
        asset_name: equipmentList.filter(e => e.name.trim()).map(e => e.name).join(", "),
        cleaning_method: primaryMethod,
        zone_type: zoneType,
        disassembly_level: disassemblyLevel,
        content: generateMarkdownContent(response),
        steps: response.steps || [],
        chemicals_used: response.chemicals_used || [],
        tools_required: response.tools_required || [],
        ppe_required: response.ppe_required || [],
        status: "draft",
        version: 1,
        ai_generated: true,
        revision_history: []
      });
      console.log("SSOP created:", createdSsop);

      toast.success("SSOP draft generated successfully!");
      onGenerated();
    } catch (error) {
      console.error("SSOP generation error:", error);
      toast.error("Failed to generate SSOP: " + (error.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMarkdownContent = (data) => {
    let content = `# ${data.title || 'SSOP'}\n\n`;
    content += `## Scope\n${data.scope || ''}\n\n`;
    
    if (data.ppe_required?.length) {
      content += `## Required PPE\n${data.ppe_required.map(p => `- ${p}`).join('\n')}\n\n`;
    }
    
    if (data.chemicals_used?.length) {
      content += `## Chemicals Required\n${data.chemicals_used.map(c => `- ${c}`).join('\n')}\n\n`;
    }
    
    if (data.tools_required?.length) {
      content += `## Tools Required\n${data.tools_required.map(t => `- ${t}`).join('\n')}\n\n`;
    }
    
    if (data.steps?.length) {
      content += `## Procedure\n`;
      data.steps.forEach(step => {
        content += `### Step ${step.step_number}: ${step.title}\n`;
        content += `${step.description}\n`;
        if (step.time_estimate) content += `*Time: ${step.time_estimate}*\n`;
        if (step.safety_notes) content += `⚠️ ${step.safety_notes}\n`;
        content += '\n';
      });
    }
    
    if (data.verification_criteria?.length) {
      content += `## Verification Criteria\n${data.verification_criteria.map(v => `- ${v}`).join('\n')}\n\n`;
    }
    
    if (data.safety_warnings?.length) {
      content += `## Safety Warnings\n${data.safety_warnings.map(w => `⚠️ ${w}`).join('\n')}\n`;
    }
    
    return content;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Generate SSOP
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>SSOP Title *</Label>
            <Input
              value={ssopTitle}
              onChange={(e) => setSsopTitle(e.target.value)}
              placeholder="e.g., Line 1 Mixer and Conveyor Sanitation"
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Equipment / Assets</Label>
              <Button type="button" variant="outline" size="sm" onClick={addEquipment}>
                <Plus className="w-3 h-3 mr-1" />
                Add Equipment
              </Button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {equipmentList.map((equipment, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={equipment.name}
                      onChange={(e) => updateEquipment(idx, "name", e.target.value)}
                      placeholder="Equipment name"
                      className="flex-1"
                    />
                    <Select 
                      value={equipment.cleaningMethod} 
                      onValueChange={(v) => updateEquipment(idx, "cleaningMethod", v)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wet">
                          <span className="flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-blue-500" />
                            Wet
                          </span>
                        </SelectItem>
                        <SelectItem value="dry">
                          <span className="flex items-center gap-1">
                            <Wind className="w-3 h-3 text-amber-500" />
                            Dry
                          </span>
                        </SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    {equipmentList.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeEquipment(idx)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Input
                    value={equipment.description}
                    onChange={(e) => updateEquipment(idx, "description", e.target.value)}
                    placeholder="Description (optional) - e.g., stainless steel bowl, 50 gallon capacity"
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
            
            {/* Summary */}
            {equipmentList.some(e => e.name.trim()) && (
              <div className="flex gap-4 mt-3 text-xs">
                {wetEquipment.length > 0 && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Droplets className="w-3 h-3" />
                    {wetEquipment.length} wet clean
                  </span>
                )}
                {dryEquipment.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Wind className="w-3 h-3" />
                    {dryEquipment.length} dry clean
                  </span>
                )}
                {hybridEquipment.length > 0 && (
                  <span className="text-purple-600">
                    {hybridEquipment.length} hybrid
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Zone Type</Label>
              <Select value={zoneType} onValueChange={setZoneType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="raw">Raw</SelectItem>
                  <SelectItem value="rte">RTE (Ready-to-Eat)</SelectItem>
                  <SelectItem value="allergen">Allergen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Disassembly Level</Label>
              <Select value={disassemblyLevel} onValueChange={setDisassemblyLevel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {facilityColors.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <Label className="text-sm text-slate-600">Facility Color Codes</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {facilityColors.map((fc, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-white rounded border">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: fc.color }} />
                    <span className="text-sm">{fc.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Additional Notes (optional)</Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any specific requirements, chemical preferences, special instructions..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !ssopTitle.trim() || !equipmentList.some(e => e.name.trim())}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate SSOP Draft
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}