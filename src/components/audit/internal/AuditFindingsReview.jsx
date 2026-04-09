// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, AlertTriangle, XCircle, CheckCircle2, 
  ExternalLink, Calendar, User, FileText, ChevronDown, ChevronRight,
  Download, Plus
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AutoCAPATrigger from "@/components/capa/AutoCAPATrigger";

const severityConfig = {
  minor_gap: { label: "Minor", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle },
  major_gap: { label: "Major", color: "bg-orange-100 text-orange-800 border-orange-200", icon: AlertTriangle },
  critical_gap: { label: "Critical", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  verified: { label: "Verified", color: "bg-purple-100 text-purple-700" },
};

export default function AuditFindingsReview({ 
  findings = [], 
  standards = [], 
  sections = [], 
  results = [],
  capas = [],
  organizationId,
  user,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [standardFilter, setStandardFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedFindings, setExpandedFindings] = useState({});
  const [showCAPATrigger, setShowCAPATrigger] = useState(false);
  const [selectedFindingForCAPA, setSelectedFindingForCAPA] = useState(null);
  const [creatingCAPAFor, setCreatingCAPAFor] = useState(null);

  // Get only gap findings
  const gapFindings = useMemo(() => {
    return findings.filter(f => 
      ["minor_gap", "major_gap", "critical_gap"].includes(f.compliance_status)
    );
  }, [findings]);

  // Get available sections for selected standard
  const availableSections = useMemo(() => {
    if (standardFilter === "all") return sections;
    return sections.filter(s => s.standard_id === standardFilter);
  }, [sections, standardFilter]);

  // Filter findings
  const filteredFindings = useMemo(() => {
    return gapFindings.filter(finding => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          finding.requirement_text?.toLowerCase().includes(query) ||
          finding.finding_notes?.toLowerCase().includes(query) ||
          finding.requirement_number?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Standard filter
      if (standardFilter !== "all" && finding.standard_id !== standardFilter) return false;

      // Section filter
      if (sectionFilter !== "all" && finding.section_id !== sectionFilter) return false;

      // Severity filter
      if (severityFilter !== "all" && finding.compliance_status !== severityFilter) return false;

      // Status filter
      if (statusFilter !== "all" && finding.corrective_action_status !== statusFilter) return false;

      return true;
    });
  }, [gapFindings, searchQuery, standardFilter, sectionFilter, severityFilter, statusFilter]);

  // Group findings by standard and section
  const groupedFindings = useMemo(() => {
    const grouped = {};
    
    filteredFindings.forEach(finding => {
      const standardKey = finding.standard_id || "unknown";
      const sectionKey = finding.section_id || "unknown";
      
      if (!grouped[standardKey]) {
        const standard = standards.find(s => s.id === standardKey);
        grouped[standardKey] = {
          standardName: standard?.name || finding.standard_name || "Unknown Standard",
          sections: {}
        };
      }
      
      if (!grouped[standardKey].sections[sectionKey]) {
        const section = sections.find(s => s.id === sectionKey);
        grouped[standardKey].sections[sectionKey] = {
          sectionNumber: section?.section_number || "",
          sectionTitle: section?.title || finding.section_title || "Unknown Section",
          findings: []
        };
      }
      
      grouped[standardKey].sections[sectionKey].findings.push(finding);
    });
    
    return grouped;
  }, [filteredFindings, standards, sections]);

  // Statistics
  const stats = useMemo(() => ({
    total: filteredFindings.length,
    critical: filteredFindings.filter(f => f.compliance_status === "critical_gap").length,
    major: filteredFindings.filter(f => f.compliance_status === "major_gap").length,
    minor: filteredFindings.filter(f => f.compliance_status === "minor_gap").length,
    withCapa: filteredFindings.filter(f => f.linked_capa_id).length,
    pending: filteredFindings.filter(f => f.corrective_action_status === "pending").length,
  }), [filteredFindings]);

  const toggleFinding = (id) => {
    setExpandedFindings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateCAPA = (finding) => {
    const standard = standards.find(s => s.id === finding.standard_id);
    setSelectedFindingForCAPA({
      ...finding,
      standardName: standard?.name || finding.standard_name
    });
    setShowCAPATrigger(true);
  };

  const handleCAPACreated = async (capa) => {
    // Link the CAPA to the finding
    try {
      await AuditFindingRepo.update(selectedFindingForCAPA.id, {
        linked_capa_id: capa.id,
        corrective_action_required: true
      });
      toast.success("CAPA linked to audit finding");
      onRefresh?.();
    } catch (error) {
      console.error("Failed to link CAPA to finding:", error);
    }
    setShowCAPATrigger(false);
    setSelectedFindingForCAPA(null);
  };

  const exportFindings = () => {
    const data = filteredFindings.map(f => ({
      standard: standards.find(s => s.id === f.standard_id)?.name || f.standard_name,
      section: f.section_number,
      requirement: f.requirement_number,
      requirement_text: f.requirement_text,
      severity: f.compliance_status,
      finding_notes: f.finding_notes,
      corrective_action: f.corrective_action_notes,
      status: f.corrective_action_status,
      auditor: f.auditor_name,
      audit_date: f.audit_date,
      capa_linked: f.linked_capa_id ? "Yes" : "No"
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-findings-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-slate-500">Total Gaps</p>
        </Card>
        <Card className="p-3 border-red-200 bg-red-50">
          <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
          <p className="text-xs text-red-600">Critical</p>
        </Card>
        <Card className="p-3 border-orange-200 bg-orange-50">
          <p className="text-2xl font-bold text-orange-700">{stats.major}</p>
          <p className="text-xs text-orange-600">Major</p>
        </Card>
        <Card className="p-3 border-yellow-200 bg-yellow-50">
          <p className="text-2xl font-bold text-yellow-700">{stats.minor}</p>
          <p className="text-xs text-yellow-600">Minor</p>
        </Card>
        <Card className="p-3 border-blue-200 bg-blue-50">
          <p className="text-2xl font-bold text-blue-700">{stats.withCapa}</p>
          <p className="text-xs text-blue-600">With CAPA</p>
        </Card>
        <Card className="p-3 border-slate-200">
          <p className="text-2xl font-bold text-slate-700">{stats.pending}</p>
          <p className="text-xs text-slate-500">Pending Action</p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search findings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={standardFilter} onValueChange={(v) => { setStandardFilter(v); setSectionFilter("all"); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Standards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Standards</SelectItem>
                {standards.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {availableSections.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.section_number} - {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical_gap">Critical</SelectItem>
                <SelectItem value="major_gap">Major</SelectItem>
                <SelectItem value="minor_gap">Minor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportFindings}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Findings by Standard/Section */}
      {Object.keys(groupedFindings).length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Gaps Found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {gapFindings.length === 0 
              ? "No audit gaps have been recorded yet." 
              : "No findings match your current filters."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedFindings).map(([standardId, standardData]) => (
            <Card key={standardId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {standardData.standardName}
                  <Badge variant="outline" className="ml-2">
                    {Object.values(standardData.sections).reduce((sum, s) => sum + s.findings.length, 0)} gaps
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(standardData.sections).map(([sectionId, sectionData]) => (
                  <div key={sectionId} className="border rounded-lg">
                    <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
                      <div>
                        <span className="font-medium">
                          {sectionData.sectionNumber && `${sectionData.sectionNumber} - `}
                          {sectionData.sectionTitle}
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {sectionData.findings.length} finding{sectionData.findings.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="divide-y">
                      {sectionData.findings.map(finding => {
                        const severity = severityConfig[finding.compliance_status];
                        const status = statusConfig[finding.corrective_action_status] || statusConfig.pending;
                        const isExpanded = expandedFindings[finding.id];
                        const linkedCapa = capas.find(c => c.id === finding.linked_capa_id);

                        return (
                          <div key={finding.id} className="p-4">
                            <div 
                              className="flex items-start gap-3 cursor-pointer"
                              onClick={() => toggleFinding(finding.id)}
                            >
                              <button className="mt-1 text-slate-400">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-sm text-slate-600">
                                    {finding.requirement_number}
                                  </span>
                                  <Badge className={cn("text-xs", severity.color)}>
                                    <severity.icon className="w-3 h-3 mr-1" />
                                    {severity.label}
                                  </Badge>
                                  <Badge className={cn("text-xs", status.color)}>
                                    {status.label}
                                  </Badge>
                                  {linkedCapa && (
                                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                                      CAPA: {linkedCapa.capa_id}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm mt-1 text-slate-700 line-clamp-2">
                                  {finding.requirement_text}
                                </p>
                              </div>

                              <div className="text-right text-xs text-slate-500 flex-shrink-0">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {finding.audit_date ? format(new Date(finding.audit_date), "MMM d, yyyy") : "N/A"}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  <User className="w-3 h-3" />
                                  {finding.auditor_name || "Unknown"}
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-4 ml-7 space-y-3 p-3 bg-slate-50 rounded-lg">
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase">Finding Notes</p>
                                  <p className="text-sm mt-1">{finding.finding_notes || "No notes provided"}</p>
                                </div>
                                
                                {finding.evidence_urls?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase">Evidence</p>
                                    <div className="flex gap-2 mt-1">
                                      {finding.evidence_urls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                          <img src={url} className="w-16 h-16 object-cover rounded border" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {finding.corrective_action_notes && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase">Corrective Action</p>
                                    <p className="text-sm mt-1">{finding.corrective_action_notes}</p>
                                  </div>
                                )}

                                {linkedCapa ? (
                                  <div className="pt-2 border-t">
                                    <Link 
                                      to={createPageUrl("CAPAProgram") + `?capa=${linkedCapa.id}`}
                                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      View CAPA: {linkedCapa.capa_id} - {linkedCapa.title}
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  </div>
                                ) : (finding.compliance_status === "major_gap" || finding.compliance_status === "critical_gap") && (
                                  <div className="pt-2 border-t">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCreateCAPA(finding);
                                      }}
                                      className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Create CAPA
                                    </Button>
                                    <span className="text-xs text-rose-600 ml-2">
                                      CAPA required for {severity.label.toLowerCase()} findings
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Auto CAPA Trigger Modal */}
      {showCAPATrigger && selectedFindingForCAPA && (
        <AutoCAPATrigger
          open={showCAPATrigger}
          onClose={() => {
            setShowCAPATrigger(false);
            setSelectedFindingForCAPA(null);
          }}
          sourceType="audit"
          sourceRecord={selectedFindingForCAPA}
          organizationId={organizationId}
          user={user}
          severity={selectedFindingForCAPA.compliance_status === "critical_gap" ? "critical" : "high"}
          autoTitle={`Audit Finding: ${selectedFindingForCAPA.requirement_number} - ${severityConfig[selectedFindingForCAPA.compliance_status]?.label} Gap`}
          autoDescription={`${selectedFindingForCAPA.standardName}\n\nRequirement: ${selectedFindingForCAPA.requirement_text}\n\nFinding: ${selectedFindingForCAPA.finding_notes || 'No notes'}`}
          onCAPACreated={handleCAPACreated}
        />
      )}
    </div>
  );
}