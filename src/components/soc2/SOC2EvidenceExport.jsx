import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileText, Loader2, CheckCircle2, Package, Brain
} from "lucide-react";
import { format, subDays } from "date-fns";

const TRUST_CATEGORIES = [
  { id: "security", label: "Security", description: "Protection against unauthorized access" },
  { id: "availability", label: "Availability", description: "System availability for operation" },
  { id: "processing_integrity", label: "Processing Integrity", description: "Complete, valid, accurate processing" },
  { id: "confidentiality", label: "Confidentiality", description: "Protection of confidential information" },
  { id: "privacy", label: "Privacy", description: "Personal information handling" }
];

export default function SOC2EvidenceExport({ 
  controls, 
  accessReviews, 
  auditLogs, 
  organizationId,
  onPackageCreated 
}) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [packageName, setPackageName] = useState(`SOC 2 Evidence - ${format(new Date(), "MMMM yyyy")}`);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 365), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedCategories, setSelectedCategories] = useState(["security"]);
  const [includeAIExplanations, setIncludeAIExplanations] = useState(true);
  const [generatedSummary, setGeneratedSummary] = useState("");

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const generateEvidencePackage = async () => {
    setLoading(true);
    setGenerating(true);

    try {
      // Filter controls by selected categories
      const relevantControls = controls.filter(c => 
        selectedCategories.includes(c.trust_service_category)
      );

      // Gather evidence items
      const evidenceItems = [];

      // Add audit log evidence
      const auditLogCount = auditLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= new Date(startDate) && logDate <= new Date(endDate);
      }).length;

      evidenceItems.push({
        id: `audit-logs-${Date.now()}`,
        control_id: "CC6.1",
        evidence_type: "audit_trail",
        description: "Immutable audit logs of all user actions and system changes",
        source_entity: "AuditLog",
        record_count: auditLogCount,
        date_range: `${format(new Date(startDate), "MMM d, yyyy")} - ${format(new Date(endDate), "MMM d, yyyy")}`
      });

      // Add access review evidence
      const completedReviews = accessReviews.filter(r => r.status === 'completed');
      if (completedReviews.length > 0) {
        evidenceItems.push({
          id: `access-reviews-${Date.now()}`,
          control_id: "CC6.2",
          evidence_type: "access_review",
          description: "Periodic user access reviews with attestation",
          source_entity: "SOC2AccessReview",
          record_count: completedReviews.length,
          date_range: `${format(new Date(startDate), "MMM d, yyyy")} - ${format(new Date(endDate), "MMM d, yyyy")}`
        });
      }

      // Add control testing evidence
      const testedControls = relevantControls.filter(c => c.last_tested_at);
      evidenceItems.push({
        id: `control-tests-${Date.now()}`,
        control_id: "CC4.1",
        evidence_type: "control_testing",
        description: "Evidence of control testing and validation",
        source_entity: "SOC2Control",
        record_count: testedControls.length,
        date_range: `${format(new Date(startDate), "MMM d, yyyy")} - ${format(new Date(endDate), "MMM d, yyyy")}`
      });

      // Identify gaps
      const gaps = relevantControls.flatMap(c => 
        (c.gaps_identified || [])
          .filter(g => g.remediation_status !== 'resolved')
          .map(g => ({
            control_id: c.control_id,
            gap_description: g.description,
            compensating_control: g.compensating_control || "Under remediation",
            remediation_plan: g.remediation_plan || "See CAPA"
          }))
      );

      // Generate AI summary if requested
      let executiveSummary = "";
      if (includeAIExplanations) {
        const summaryResult = await invokeLLM({
          prompt: `Generate a concise executive summary for a SOC 2 Type II audit evidence package.

Period: ${format(new Date(startDate), "MMMM d, yyyy")} to ${format(new Date(endDate), "MMMM d, yyyy")}
Trust Service Categories: ${selectedCategories.join(", ")}
Total Controls: ${relevantControls.length}
Controls Tested: ${testedControls.length}
Controls Passed: ${relevantControls.filter(c => c.test_result === 'passed').length}
Open Gaps: ${gaps.length}
Access Reviews Completed: ${completedReviews.length}
Audit Log Records: ${auditLogCount}

Write a professional 2-3 paragraph executive summary suitable for external auditors. Focus on:
1. Overall control environment health
2. Key evidence demonstrating control effectiveness
3. Any gaps and remediation status (if applicable)

Be factual and audit-appropriate.`,
          response_json_schema: {
            type: "object",
            properties: {
              summary: { type: "string" }
            }
          }
        });
        executiveSummary = summaryResult.summary;
        setGeneratedSummary(executiveSummary);
      }

      // Create the evidence package
      const packageData = {
        organization_id: organizationId,
        package_name: packageName,
        audit_period_start: startDate,
        audit_period_end: endDate,
        trust_service_categories: selectedCategories,
        status: "ready_for_review",
        prepared_at: new Date().toISOString(),
        controls_included: relevantControls.map(c => c.control_id),
        evidence_items: evidenceItems,
        executive_summary: executiveSummary,
        gaps_and_exceptions: gaps
      };

      const created = await SOC2EvidencePackageRepo.create(packageData);
      onPackageCreated?.(created);

    } catch (error) {
      console.error("Error generating evidence package:", error);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Generate Evidence Package
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Package Name</Label>
          <Input 
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="SOC 2 Evidence Package"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Audit Period Start</Label>
            <Input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Audit Period End</Label>
            <Input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Trust Service Categories</Label>
          <div className="space-y-2">
            {TRUST_CATEGORIES.map(category => (
              <div 
                key={category.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer"
                onClick={() => toggleCategory(category.id)}
              >
                <Checkbox 
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => toggleCategory(category.id)}
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{category.label}</div>
                  <div className="text-xs text-slate-500">{category.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3 p-3 rounded-lg border">
          <Checkbox 
            checked={includeAIExplanations}
            onCheckedChange={setIncludeAIExplanations}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-sm">Include AI-Generated Explanations</span>
            </div>
            <div className="text-xs text-slate-500">
              Generate executive summary and evidence explanations for auditors
            </div>
          </div>
        </div>

        {generatedSummary && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="font-medium text-sm">Generated Executive Summary</span>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{generatedSummary}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={generateEvidencePackage}
            disabled={loading || selectedCategories.length === 0}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {generating ? "Generating..." : "Creating Package..."}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Evidence Package
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}