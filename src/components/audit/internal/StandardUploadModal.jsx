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
        const uploadResult = await uploadFile({ file });
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
        await parseStandardDocument(standard, fileUrl);
      }

      toast.success("Standard created successfully");
      onSuccess();
    } catch (error) {
      console.error("Error creating standard:", error);
      toast.error("Failed to create standard");
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  const parseStandardDocument = async (standard, fileUrl) => {
    try {
      const result = await invokeLLM({
        prompt: `Analyze this audit standard document and extract its structure.
        
Extract all sections and their requirements. For each section, identify:
1. Section number/code (e.g., "2.1", "3.2.1")
2. Section title
3. Individual requirements within that section

For each requirement, identify:
1. Requirement number/code
2. Full requirement text
3. Whether it's a critical/mandatory requirement

Standard Name: ${standard.name}
Standard Type: ${standard.type}

Be thorough and extract ALL sections and requirements from the document.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_number: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  requirements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        requirement_number: { type: "string" },
                        text: { type: "string" },
                        is_critical: { type: "boolean" },
                        guidance_notes: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (result?.sections) {
        let sectionOrder = 0;
        let totalReqs = 0;

        for (const section of result.sections) {
          const createdSection = await AuditSectionRepo.create({
            organization_id: organization.id,
            standard_id: standard.id,
            standard_name: standard.name,
            section_number: section.section_number || `${sectionOrder + 1}`,
            title: section.title,
            description: section.description,
            sort_order: sectionOrder++,
            status: "active"
          });

          if (section.requirements) {
            let reqOrder = 0;
            for (const req of section.requirements) {
              await AuditRequirementRepo.create({
                organization_id: organization.id,
                standard_id: standard.id,
                section_id: createdSection.id,
                section_number: section.section_number,
                requirement_number: req.requirement_number || `${section.section_number}.${reqOrder + 1}`,
                text: req.text,
                guidance_notes: req.guidance_notes,
                is_critical: req.is_critical || false,
                sort_order: reqOrder++,
                status: "active"
              });
              totalReqs++;
            }
          }
        }

        // Update standard with counts
        await AuditStandardRepo.update(standard.id, {
          total_sections: result.sections.length,
          total_requirements: totalReqs,
          parsing_status: "completed"
        });
      }
    } catch (error) {
      console.error("Error parsing document:", error);
      await AuditStandardRepo.update(standard.id, {
        parsing_status: "failed"
      });
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