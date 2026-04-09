import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Download, Printer, CheckCircle2, XCircle,
  FileText, Calendar, Building, Shield,
  ChevronDown, ChevronUp
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { toast } from "sonner";

export default function AuditPrepView({ frameworks, requirements, evidence, organizationId }) {
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [checkedItems, setCheckedItems] = useState({});

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit_logs_prep", organizationId],
    queryFn: () => AuditLogRepo.filter({ organization_id: organizationId }, "-timestamp", 200),
    enabled: !!organizationId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks_audit", organizationId],
    queryFn: () => TaskRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings_audit", organizationId],
    queryFn: () => EmployeeTrainingRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const framework = selectedFramework 
    ? frameworks.find(f => f.id === selectedFramework)
    : frameworks.find(f => f.next_audit_date);

  const frameworkRequirements = useMemo(() => {
    if (!framework) return [];
    return requirements.filter(r => r.framework_id === framework.id);
  }, [framework, requirements]);

  const groupedRequirements = useMemo(() => {
    const groups = {};
    frameworkRequirements.forEach(req => {
      const section = req.section?.split(".")[0] || "Other";
      if (!groups[section]) groups[section] = [];
      groups[section].push(req);
    });
    return groups;
  }, [frameworkRequirements]);

  const stats = useMemo(() => {
    const compliant = frameworkRequirements.filter(r => r.status === "compliant").length;
    const total = frameworkRequirements.length;
    const criticalGaps = frameworkRequirements.filter(r => r.criticality === "critical" && r.status !== "compliant").length;
    const majorGaps = frameworkRequirements.filter(r => r.criticality === "major" && r.status !== "compliant").length;
    
    return {
      compliant,
      total,
      rate: total > 0 ? Math.round((compliant / total) * 100) : 0,
      criticalGaps,
      majorGaps,
      evidenceCount: evidence.filter(e => e.framework_id === framework?.id).length
    };
  }, [frameworkRequirements, evidence, framework]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleCheck = (reqId) => {
    setCheckedItems(prev => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  const exportAuditPackage = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text("Audit Preparation Package", pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Framework info
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(framework?.name || "Compliance Framework", pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Summary stats
    doc.setFontSize(10);
    doc.text(`Compliance Rate: ${stats.rate}% (${stats.compliant}/${stats.total} requirements)`, 20, yPos);
    yPos += 6;
    doc.text(`Critical Gaps: ${stats.criticalGaps}`, 20, yPos);
    yPos += 6;
    doc.text(`Major Gaps: ${stats.majorGaps}`, 20, yPos);
    yPos += 6;
    doc.text(`Evidence Records: ${stats.evidenceCount}`, 20, yPos);
    yPos += 6;
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}`, 20, yPos);
    yPos += 15;

    // Requirements by section
    Object.entries(groupedRequirements).forEach(([section, reqs]) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Section ${section}`, 20, yPos);
      yPos += 8;

      reqs.forEach(req => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const status = req.status === "compliant" ? "✓" : req.status === "non_compliant" ? "✗" : "○";
        doc.text(`${status} ${req.section}: ${req.title}`, 25, yPos);
        yPos += 5;
        
        if (req.status !== "compliant" && req.notes) {
          doc.setFontSize(8);
          doc.text(`   Gap: ${req.notes.substring(0, 80)}`, 25, yPos);
          yPos += 5;
        }
      });
      yPos += 5;
    });

    doc.save(`audit_prep_${framework?.code || 'compliance'}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Audit package exported");
  };

  if (!framework) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Framework Selected</h3>
          <p className="text-slate-500 mb-4">Select a compliance framework to prepare for audit</p>
          <Select onValueChange={setSelectedFramework}>
            <SelectTrigger className="w-64 mx-auto">
              <SelectValue placeholder="Select Framework" />
            </SelectTrigger>
            <SelectContent>
              {frameworks.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  }

  const daysUntilAudit = framework.next_audit_date 
    ? differenceInDays(parseISO(framework.next_audit_date), new Date())
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-6 h-6" />
                <h2 className="text-xl font-bold">Audit Preparation Mode</h2>
              </div>
              <h3 className="text-lg text-slate-300">{framework.name}</h3>
              {framework.certifying_body && (
                <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                  <Building className="w-3 h-3" />
                  {framework.certifying_body}
                </p>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {daysUntilAudit !== null && (
                <div className={cn(
                  "px-4 py-2 rounded-lg text-center",
                  daysUntilAudit < 14 ? "bg-rose-500/20" : 
                  daysUntilAudit < 30 ? "bg-amber-500/20" : "bg-slate-700"
                )}>
                  <p className="text-2xl font-bold">{daysUntilAudit}</p>
                  <p className="text-xs text-slate-300">days until audit</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 hover:bg-white/20">
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
                <Button size="sm" onClick={exportAuditPackage} className="bg-white text-slate-900 hover:bg-slate-100">
                  <Download className="w-4 h-4 mr-1" />
                  Export Package
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readiness Score */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="sm:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Audit Readiness</span>
              <span className={cn(
                "text-2xl font-bold",
                stats.rate >= 90 ? "text-emerald-600" :
                stats.rate >= 70 ? "text-amber-600" : "text-rose-600"
              )}>
                {stats.rate}%
              </span>
            </div>
            <Progress 
              value={stats.rate} 
              className={cn(
                "h-3",
                stats.rate < 70 && "[&>div]:bg-rose-500",
                stats.rate >= 70 && stats.rate < 90 && "[&>div]:bg-amber-500"
              )}
            />
            <p className="text-xs text-slate-400 mt-2">
              {stats.compliant} of {stats.total} requirements compliant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", stats.criticalGaps > 0 ? "bg-rose-100" : "bg-emerald-100")}>
              {stats.criticalGaps > 0 ? (
                <XCircle className="w-5 h-5 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-slate-500">Critical Gaps</p>
              <p className={cn("text-xl font-bold", stats.criticalGaps > 0 ? "text-rose-600" : "text-emerald-600")}>
                {stats.criticalGaps}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Evidence Items</p>
              <p className="text-xl font-bold text-blue-600">{stats.evidenceCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist by Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit Checklist</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {Object.entries(groupedRequirements).map(([section, reqs]) => {
            const sectionCompliant = reqs.filter(r => r.status === "compliant").length;
            const sectionTotal = reqs.length;
            const expanded = expandedSections[section] !== false;

            return (
              <div key={section} className="border-b last:border-b-0">
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900">Section {section}</span>
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      sectionCompliant === sectionTotal ? "border-emerald-300 text-emerald-700" : ""
                    )}>
                      {sectionCompliant}/{sectionTotal}
                    </Badge>
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {expanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {reqs.map(req => {
                      const isCompliant = req.status === "compliant";
                      const reqEvidence = evidence.filter(e => e.requirement_id === req.id);
                      
                      return (
                        <div 
                          key={req.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border",
                            isCompliant ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200",
                            checkedItems[req.id] && "opacity-60"
                          )}
                        >
                          <Checkbox
                            checked={checkedItems[req.id] || isCompliant}
                            onCheckedChange={() => toggleCheck(req.id)}
                            disabled={isCompliant}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-500">{req.section}</span>
                              <Badge className={cn(
                                "text-xs",
                                req.criticality === "critical" && "bg-rose-600",
                                req.criticality === "major" && "bg-amber-500"
                              )}>
                                {req.criticality}
                              </Badge>
                              {isCompliant && (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Compliant
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium text-slate-900 mt-1">{req.title}</p>
                            
                            {!isCompliant && req.notes && (
                              <p className="text-sm text-rose-600 mt-1">Gap: {req.notes}</p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {reqEvidence.length} evidence
                              </span>
                              {reqEvidence.length > 0 && (
                                <span>
                                  Latest: {format(parseISO(reqEvidence[0].evidence_date), "MMM d")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Activity for Auditor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Audit Trail Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {auditLogs.slice(0, 15).map(log => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  log.action === "complete" || log.action === "verify" ? "bg-emerald-500" :
                  log.action === "reject" ? "bg-rose-500" : "bg-slate-400"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 truncate">
                    {log.entity_title} - <span className="capitalize">{log.action.replace("_", " ")}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {log.actor_name} • {format(parseISO(log.timestamp), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}