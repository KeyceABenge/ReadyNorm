import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getNextColorIndex } from "./auditColors";
import { AuditRequirementRepo, AuditSectionRepo, AuditStandardRepo } from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { extractDataFromFile } from "@/lib/adapters/integrations";

export default function StandardUploadModal({ open, onClose, organization, existingStandards = [], onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "other",
    version: "",
    description: ""
  });
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!formData.name) {
        setFormData(prev => ({ ...prev, name: selectedFile.name.replace(/\.(pdf|docx?)$/i, "") }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Please enter a standard name");
      return;
    }

    setIsUploading(true);
    try {
      let fileUrl = null;
      
      if (file) {
        const uploadResult = await uploadFile(file);
        fileUrl = uploadResult.file_url;
      }

      // Assign next available color
      const colorIndex = getNextColorIndex(existingStandards);

      // Create the standard
      const standard = await AuditStandardRepo.create({
        organization_id: organization.id,
        name: formData.name,
        type: formData.type,
        color_index: colorIndex,
        version: formData.version,
        description: formData.description,
        source_document_url: fileUrl,
        parsing_status: fileUrl ? "processing" : "completed",
        status: "active"
      });

      // If file uploaded, parse it with AI
      if (fileUrl) {
        setIsParsing(true);
        toast.info("Extracting sections from document — this may take a minute...");
        await parseStandardDocument(standard, fileUrl);
      }

      toast.success("Standard created successfully");
      onSuccess();
    } catch (error) {
      console.error("Error creating standard:", error);
      toast.error("Failed to create standard: " + (error.message || "Unknown error"));
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  const parseStandardDocument = async (standard, fileUrl) => {
    try {
      console.log("[parseStandard] Starting extraction for:", fileUrl);

      const response = await extractDataFromFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          description: `Extract the COMPLETE structure of this audit standard document ("${standard.name}"). This document likely has 10-25+ major sections. You MUST extract ALL sections — do NOT stop early. Prioritize COMPLETENESS over detail. Keep text fields SHORT (one sentence max). Do NOT include full paragraph text — just a brief summary of each requirement.`,
          properties: {
            sections: {
              type: "array",
              description: "Every section in the standard — extract ALL, not just the first few",
              items: {
                type: "object",
                properties: {
                  section_number: { type: "string", description: "Section number (e.g. '2.1', '11.2')" },
                  title: { type: "string", description: "Section title (brief)" },
                  description: { type: "string", description: "One-sentence scope description" },
                  requirements: {
                    type: "array",
                    description: "Requirements in this section",
                    items: {
                      type: "object",
                      properties: {
                        requirement_number: { type: "string", description: "Clause number (e.g. '2.1.1.1')" },
                        text: { type: "string", description: "One-sentence summary of the requirement (NOT full text)" },
                        is_critical: { type: "boolean", description: "True if mandatory/critical/fundamental" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      console.log("[parseStandard] extractDataFromFile response:", JSON.stringify(response).slice(0, 500));

      if (response?.status === "error") {
        throw new Error(response.details || "Extraction service returned an error");
      }

      const result = response?.output || response;

      console.log("[parseStandard] Sections found:", result?.sections?.length, "| Total requirements:", result?.sections?.reduce((sum, s) => sum + (s.requirements?.length || 0), 0));

      if (result?.sections && result.sections.length > 0) {
        let sectionOrder = 0;
        let totalReqs = 0;

        for (const section of result.sections) {
          let createdSection;
          try {
            createdSection = await AuditSectionRepo.create({
              organization_id: organization.id,
              standard_id: standard.id,
              standard_name: standard.name,
              section_number: section.section_number || `${sectionOrder + 1}`,
              title: section.title,
              description: section.description || section.title,
              sort_order: sectionOrder++,
              status: "active"
            });
          } catch (secErr) {
            console.warn(`[parseStandard] Failed to save section ${section.section_number}:`, secErr.message);
            continue; // skip to next section
          }

          if (section.requirements) {
            let reqOrder = 0;
            for (const req of section.requirements) {
              try {
                await AuditRequirementRepo.create({
                  organization_id: organization.id,
                  standard_id: standard.id,
                  section_id: createdSection.id,
                  requirement_number: req.requirement_number || `${section.section_number}.${reqOrder + 1}`,
                  description: req.text || "No description",
                  text: req.text,
                  guidance_notes: req.guidance_notes,
                  is_critical: req.is_critical || false,
                  sort_order: reqOrder++,
                  status: "active"
                });
                totalReqs++;
              } catch (reqErr) {
                console.warn(`[parseStandard] Failed to save requirement ${req.requirement_number}:`, reqErr.message);
              }
            }
          }
        }

        // Update standard with counts
        await AuditStandardRepo.update(standard.id, {
          total_sections: result.sections.length,
          total_requirements: totalReqs,
          parsing_status: "completed"
        });

        toast.success(`Extracted ${result.sections.length} sections and ${totalReqs} requirements`);
      } else {
        console.warn("AI returned no sections:", result);
        toast.warning("Document uploaded but no sections were extracted. You can add sections manually.");
        await AuditStandardRepo.update(standard.id, {
          parsing_status: "completed"
        });
      }
    } catch (error) {
      console.error("Error parsing document:", error);
      toast.error("AI parsing failed — you can add sections manually. Error: " + (error.message || "Unknown"));
      try {
        await AuditStandardRepo.update(standard.id, {
          parsing_status: "failed"
        });
      } catch (_) { /* ignore update failure */ }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Audit Standard</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Standard Name *</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., SQF Food Safety Code"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sqf">SQF</SelectItem>
                  <SelectItem value="aib">AIB</SelectItem>
                  <SelectItem value="brc">BRC</SelectItem>
                  <SelectItem value="fssc22000">FSSC 22000</SelectItem>
                  <SelectItem value="customer_policy">Customer Policy</SelectItem>
                  <SelectItem value="internal">Internal Standard</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Version</Label>
              <Input 
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g., 9.0"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this standard"
              rows={2}
            />
          </div>

          <div>
            <Label>Upload Document (Optional)</Label>
            <div className="mt-1 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                    Remove
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 mb-2">
                    Upload PDF or Word document
                  </p>
                  <Input 
                    type="file" 
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="max-w-xs mx-auto"
                  />
                </>
              )}
            </div>
            {file && (
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI will automatically extract sections and requirements
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isUploading || isParsing}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isUploading || isParsing}>
              {isUploading || isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isParsing ? "Parsing Document..." : "Uploading..."}
                </>
              ) : (
                "Create Standard"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}