// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, XCircle, AlertTriangle, MinusCircle, 
  Camera, Loader2, Save, Send, FileText
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { generateUniqueCapaId } from "@/components/capa/capaUtils";
import { AuditFindingRepo, AuditResultRepo, CAPARepo, ScheduledAuditRepo } from "@/lib/adapters/database";

const complianceOptions = [
  { value: "compliant", label: "Compliant", icon: CheckCircle2, color: "text-green-600 bg-green-100" },
  { value: "minor_gap", label: "Minor Gap", icon: AlertTriangle, color: "text-yellow-600 bg-yellow-100" },
  { value: "major_gap", label: "Major Gap", icon: AlertTriangle, color: "text-orange-600 bg-orange-100" },
  { value: "critical_gap", label: "Critical Gap", icon: XCircle, color: "text-red-600 bg-red-100" },
  { value: "not_applicable", label: "N/A", icon: MinusCircle, color: "text-slate-600 bg-slate-100" }
];

export default function AuditExecutionModal({ 
  open, onClose, audit, organization, user, section, requirements, 
  existingResult, existingFindings, onSuccess 
}) {
  const [activeTab, setActiveTab] = useState("audit");
  const [findingsData, setFindingsData] = useState({});
  const [summaryData, setSummaryData] = useState({
    summary_notes: "",
    strengths: "",
    areas_for_improvement: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Initialize findings from existing or create new
    const initialFindings = {};
    requirements.forEach(req => {
      const existing = existingFindings?.find(f => f.requirement_id === req.id);
      initialFindings[req.id] = {
        compliance_status: existing?.compliance_status || "not_assessed",
        finding_notes: existing?.finding_notes || "",
        evidence_notes: existing?.evidence_notes || "",
        evidence_urls: existing?.evidence_urls || [],
        corrective_action_notes: existing?.corrective_action_notes || "",
        corrective_action_due_date: existing?.corrective_action_due_date || ""
      };
    });
    setFindingsData(initialFindings);

    if (existingResult) {
      setSummaryData({
        summary_notes: existingResult.summary_notes || "",
        strengths: existingResult.strengths || "",
        areas_for_improvement: existingResult.areas_for_improvement || ""
      });
    }
  }, [requirements, existingFindings, existingResult]);

  const stats = useMemo(() => {
    const values = Object.values(findingsData);
    return {
      total: requirements.length,
      assessed: values.filter(f => f.compliance_status !== "not_assessed").length,
      compliant: values.filter(f => f.compliance_status === "compliant").length,
      minor: values.filter(f => f.compliance_status === "minor_gap").length,
      major: values.filter(f => f.compliance_status === "major_gap").length,
      critical: values.filter(f => f.compliance_status === "critical_gap").length,
      na: values.filter(f => f.compliance_status === "not_applicable").length
    };
  }, [findingsData, requirements]);

  const handleFindingChange = (reqId, field, value) => {
    setFindingsData(prev => ({
      ...prev,
      [reqId]: { ...prev[reqId], [field]: value }
    }));
  };

  const handlePhotoUpload = async (reqId, file) => {
    try {
      const result = await uploadFile({ file });
      setFindingsData(prev => ({
        ...prev,
        [reqId]: {
          ...prev[reqId],
          evidence_urls: [...(prev[reqId].evidence_urls || []), result.file_url]
        }
      }));
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error("Failed to upload photo");
    }
  };

  const handleSave = async (submitFinal = false) => {
    setIsSaving(true);
    try {
      // Create or update result
      let resultId = existingResult?.id;
      
      const scorePercentage = stats.assessed > 0 
        ? Math.round((stats.compliant / (stats.assessed - stats.na)) * 100) || 0
        : 0;

      const resultData = {
        organization_id: organization.id,
        scheduled_audit_id: audit.id,
        plan_id: audit.plan_id,
        standard_id: audit.standard_id,
        standard_name: audit.standard_name,
        section_id: audit.section_id,
        section_number: audit.section_number,
        section_title: audit.section_title,
        auditor_email: user?.email,
        auditor_name: user?.full_name,
        audit_date: format(new Date(), "yyyy-MM-dd"),
        total_requirements: stats.total,
        compliant_count: stats.compliant,
        minor_gaps: stats.minor,
        major_gaps: stats.major,
        critical_gaps: stats.critical,
        not_applicable_count: stats.na,
        score_percentage: scorePercentage,
        overall_status: stats.critical > 0 ? "fail" : stats.major > 0 ? "conditional_pass" : "pass",
        ...summaryData,
        status: submitFinal ? "completed" : "in_progress"
      };

      if (resultId) {
        await AuditResultRepo.update(resultId, resultData);
      } else {
        const created = await AuditResultRepo.create(resultData);
        resultId = created.id;
      }

      // Save findings and collect their IDs
      const savedFindings = [];
      for (const req of requirements) {
        const finding = findingsData[req.id];
        const existingFinding = existingFindings?.find(f => f.requirement_id === req.id);

        const findingData = {
          organization_id: organization.id,
          audit_result_id: resultId,
          scheduled_audit_id: audit.id,
          standard_id: audit.standard_id,
          section_id: audit.section_id,
          requirement_id: req.id,
          requirement_number: req.requirement_number,
          requirement_text: req.text,
          compliance_status: finding.compliance_status,
          finding_notes: finding.finding_notes,
          evidence_notes: finding.evidence_notes,
          evidence_urls: finding.evidence_urls,
          corrective_action_required: ["minor_gap", "major_gap", "critical_gap"].includes(finding.compliance_status),
          corrective_action_notes: finding.corrective_action_notes,
          corrective_action_due_date: finding.corrective_action_due_date,
          auditor_email: user?.email,
          auditor_name: user?.full_name,
          audit_date: format(new Date(), "yyyy-MM-dd")
        };

        let savedFinding;
        if (existingFinding) {
          await AuditFindingRepo.update(existingFinding.id, findingData);
          savedFinding = { id: existingFinding.id, ...findingData };
        } else {
          savedFinding = await AuditFindingRepo.create(findingData);
        }
        savedFindings.push({ ...savedFinding, requirement_id: req.id });
      }

      // Update scheduled audit status
      await ScheduledAuditRepo.update(audit.id, {
        status: submitFinal ? "completed" : "in_progress",
        audit_result_id: resultId,
        ...(submitFinal ? { completed_at: new Date().toISOString() } : { started_at: new Date().toISOString() })
      });

      // If submitting final, create CAPAs for ALL gaps (minor, major, critical)
      if (submitFinal) {
        const gapRequirements = requirements.filter(req => 
          ["minor_gap", "major_gap", "critical_gap"].includes(findingsData[req.id].compliance_status)
        );

        for (const req of gapRequirements) {
          const finding = findingsData[req.id];
          const savedFinding = savedFindings.find(f => f.requirement_id === req.id);
          
          const severityMap = {
            critical_gap: { label: "CRITICAL", severity: "critical" },
            major_gap: { label: "MAJOR", severity: "high" },
            minor_gap: { label: "MINOR", severity: "medium" }
          };
          const { label, severity } = severityMap[finding.compliance_status];
          
          try {
            const capaId = await generateUniqueCapaId(organization.id);
            const newCapa = await CAPARepo.create({
              organization_id: organization.id,
              capa_id: capaId,
              title: `Audit Finding: ${req.requirement_number} - ${audit.section_title}`,
              problem_description: `${label} gap identified during internal audit.\n\nStandard: ${audit.standard_name}\nSection: ${audit.section_number} - ${audit.section_title}\n\nRequirement: ${req.text}\n\nFinding: ${finding.finding_notes || "No notes provided"}`,
              source: "audit",
              source_record_id: resultId,
              source_record_type: "AuditResult",
              category: "Quality",
              severity: severity,
              status: "open",
              owner_email: user?.email,
              owner_name: user?.full_name
            });

            // Update the finding with the linked CAPA ID using the saved finding's ID
            if (savedFinding?.id) {
              await AuditFindingRepo.update(savedFinding.id, {
                linked_capa_id: newCapa.id
              });
            }
          } catch (e) {
            console.error("Failed to create CAPA:", e);
          }
        }
      }

      // Invalidate queries to update UI immediately
      queryClient.invalidateQueries({ queryKey: ["scheduled_audits"] });
      queryClient.invalidateQueries({ queryKey: ["audit_results"] });
      queryClient.invalidateQueries({ queryKey: ["audit_findings"] });
      queryClient.invalidateQueries({ queryKey: ["capas"] });

      if (submitFinal) {
        const gapCount = requirements.filter(req => 
          ["minor_gap", "major_gap", "critical_gap"].includes(findingsData[req.id].compliance_status)
        ).length;
        if (gapCount > 0) {
          toast.success(`Audit submitted. ${gapCount} CAPA${gapCount !== 1 ? 's' : ''} automatically created for findings.`);
        } else {
          toast.success("Audit submitted successfully");
        }
        onSuccess();
      } else {
        toast.success("Progress saved");
      }
    } catch (error) {
      console.error("Error saving audit:", error);
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            {audit.section_title}
          </DialogTitle>
          <p className="text-sm text-slate-600">{audit.standard_name} • Section {audit.section_number}</p>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex-shrink-0 bg-slate-50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>{stats.assessed} of {stats.total} assessed</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">{stats.compliant} ✓</Badge>
              <Badge className="bg-yellow-100 text-yellow-800">{stats.minor} minor</Badge>
              <Badge className="bg-orange-100 text-orange-800">{stats.major} major</Badge>
              <Badge className="bg-red-100 text-red-800">{stats.critical} critical</Badge>
            </div>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(stats.assessed / stats.total) * 100}%` }}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="audit">Audit Checklist</TabsTrigger>
            <TabsTrigger value="summary">Summary & Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="flex-1 overflow-y-auto mt-0 p-1">
            <div className="space-y-4">
              {requirements.map((req, idx) => {
                const finding = findingsData[req.id] || {};
                const selectedOption = complianceOptions.find(o => o.value === finding.compliance_status);

                return (
                  <div key={req.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs text-slate-500 mt-1 min-w-[60px]">
                        {req.requirement_number}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm">{req.text}</p>
                        {req.is_critical && (
                          <Badge variant="destructive" className="mt-1 text-xs">Critical Requirement</Badge>
                        )}

                        {/* Compliance Status */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {complianceOptions.map(option => (
                            <button
                              key={option.value}
                              onClick={() => handleFindingChange(req.id, "compliance_status", option.value)}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                finding.compliance_status === option.value
                                  ? option.color
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              )}
                            >
                              <option.icon className="w-4 h-4" />
                              {option.label}
                            </button>
                          ))}
                        </div>

                        {/* Notes & Evidence (show if not compliant or N/A) */}
                        {finding.compliance_status && 
                         finding.compliance_status !== "compliant" && 
                         finding.compliance_status !== "not_applicable" &&
                         finding.compliance_status !== "not_assessed" && (
                          <div className="mt-3 space-y-3 p-3 bg-slate-50 rounded-lg">
                            <div>
                              <Label className="text-xs">Finding Notes *</Label>
                              <Textarea 
                                value={finding.finding_notes}
                                onChange={(e) => handleFindingChange(req.id, "finding_notes", e.target.value)}
                                placeholder="Describe the gap..."
                                rows={2}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Evidence</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input 
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => e.target.files[0] && handlePhotoUpload(req.id, e.target.files[0])}
                                  className="text-xs"
                                />
                                <Camera className="w-4 h-4 text-slate-400" />
                              </div>
                              {finding.evidence_urls?.length > 0 && (
                                <div className="flex gap-2 mt-2">
                                  {finding.evidence_urls.map((url, i) => (
                                    <img key={i} src={url} className="w-16 h-16 object-cover rounded" />
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs">Corrective Action Notes</Label>
                              <Textarea 
                                value={finding.corrective_action_notes}
                                onChange={(e) => handleFindingChange(req.id, "corrective_action_notes", e.target.value)}
                                placeholder="Required corrective action..."
                                rows={2}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}

                        {/* Evidence for compliant items */}
                        {finding.compliance_status === "compliant" && (
                          <div className="mt-3">
                            <Input 
                              placeholder="Evidence notes (optional)"
                              value={finding.evidence_notes}
                              onChange={(e) => handleFindingChange(req.id, "evidence_notes", e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="flex-1 overflow-y-auto mt-0 p-1">
            <div className="space-y-4">
              <div>
                <Label>Summary Notes</Label>
                <Textarea 
                  value={summaryData.summary_notes}
                  onChange={(e) => setSummaryData({ ...summaryData, summary_notes: e.target.value })}
                  placeholder="Overall audit summary..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Strengths Observed</Label>
                <Textarea 
                  value={summaryData.strengths}
                  onChange={(e) => setSummaryData({ ...summaryData, strengths: e.target.value })}
                  placeholder="What's working well..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Areas for Improvement</Label>
                <Textarea 
                  value={summaryData.areas_for_improvement}
                  onChange={(e) => setSummaryData({ ...summaryData, areas_for_improvement: e.target.value })}
                  placeholder="Recommendations..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex-shrink-0 flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Progress
            </Button>
            <Button 
              onClick={() => handleSave(true)} 
              disabled={isSaving || stats.assessed < stats.total}
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Audit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}