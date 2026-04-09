import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Loader2, CheckCircle2, Clock, AlertCircle, AlertTriangle, Upload, FileWarning } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import SOC2ControlModal from "./SOC2ControlModal";
import { CONTROL_TEMPLATES } from "./soc2ControlTemplates";
import { getComplianceStatus, getNextDueDate } from "./soc2ComplianceEngine";

const CATEGORY_LABELS = {
  access_control: "Access Control",
  change_management: "Change Management",
  logging_monitoring: "Logging & Monitoring",
  backups: "Backups",
  incident_response: "Incident Response",
  risk_management: "Risk Management",
  vendor_management: "Vendor Management",
  multi_tenant_security: "Multi-Tenant Security"
};

const STATUS_CONFIG = {
  on_track: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100 text-emerald-700" },
  due_soon: { icon: Clock, color: "text-amber-600", bg: "bg-amber-100 text-amber-700" },
  overdue: { icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-100 text-rose-700" },
  not_started: { icon: Clock, color: "text-slate-400", bg: "bg-slate-100 text-slate-600" }
};

const COMPLIANCE_CONFIG = {
  compliant: { icon: CheckCircle2, bg: "bg-emerald-100 text-emerald-700" },
  missing_evidence: { icon: FileWarning, bg: "bg-amber-100 text-amber-700" },
  non_compliant: { icon: AlertCircle, bg: "bg-rose-100 text-rose-700" },
};

export default function SOC2ControlsTab({ orgId, controls, evidence }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completingControl, setCompletingControl] = useState(null);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState("document");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [completing, setCompleting] = useState(false);
  const queryClient = useQueryClient();

  const handleSeedControls = async () => {
    setSeeding(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const controlsToCreate = CONTROL_TEMPLATES.map(t => ({
      organization_id: orgId,
      control_name: t.name,
      category: t.category,
      description: t.description,
      frequency: t.frequency,
      responsible_role: t.responsible,
      evidence_description: t.evidence,
      status: "not_started",
      next_due_date: today
    }));
    await SOC2ControlRepo.bulkCreate(controlsToCreate);
    queryClient.invalidateQueries({ queryKey: ["soc2_controls"] });
    toast.success(`${controlsToCreate.length} controls created`);
    setSeeding(false);
  };

  const openCompleteModal = (control) => {
    setCompletingControl(control);
    setEvidenceFile(null);
    setEvidenceTitle(`${control.control_name} — ${format(new Date(), "MMM yyyy")}`);
    setEvidenceType("document");
    setEvidenceNotes("");
    setCompleteModalOpen(true);
  };

  const handleComplete = async () => {
    if (!evidenceFile && !evidenceNotes) {
      toast.error("Evidence is required to mark a control as complete. Upload a file or provide detailed notes.");
      return;
    }
    setCompleting(true);

    let fileUrl = null;
    if (evidenceFile) {
      const { file_url } = await uploadFile({ file: evidenceFile });
      fileUrl = file_url;
    }

    // Create evidence record
    const folderMap = {
      access_control: "access_reviews",
      logging_monitoring: "logs",
      backups: "backups",
      incident_response: "incidents",
      vendor_management: "vendors",
      risk_management: "risk_assessments",
      change_management: "change_management",
    };

    await SOC2EvidenceRepo.create({
      organization_id: orgId,
      control_id: completingControl.id,
      control_name: completingControl.control_name,
      title: evidenceTitle,
      evidence_type: evidenceType,
      file_url: fileUrl || "",
      collected_date: format(new Date(), "yyyy-MM-dd"),
      folder: folderMap[completingControl.category] || "other",
      notes: evidenceNotes,
      description: `Evidence for ${completingControl.control_name} collected on ${format(new Date(), "MMM d, yyyy")}`,
    });

    // Update control: mark as performed, compute next due
    const today = format(new Date(), "yyyy-MM-dd");
    const nextDue = getNextDueDate(new Date(), completingControl.frequency);

    await SOC2ControlRepo.update(completingControl.id, {
      last_performed_date: today,
      next_due_date: nextDue || completingControl.next_due_date,
      status: "on_track"
    });

    queryClient.invalidateQueries({ queryKey: ["soc2_controls"] });
    queryClient.invalidateQueries({ queryKey: ["soc2_evidence"] });
    toast.success("Control completed with evidence");
    setCompleteModalOpen(false);
    setCompleting(false);
  };

  // Group controls by category
  const grouped = {};
  Object.keys(CATEGORY_LABELS).forEach(cat => { grouped[cat] = []; });
  controls.forEach(c => {
    if (grouped[c.category]) grouped[c.category].push(c);
  });

  // Compute compliance per control
  const controlCompliance = useMemo(() => {
    const map = {};
    controls.forEach(c => {
      const cEvidence = evidence.filter(e => e.control_id === c.id);
      map[c.id] = getComplianceStatus(c, cEvidence);
    });
    return map;
  }, [controls, evidence]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Controls ({controls.length})</h2>
        <div className="flex gap-2">
          {controls.length === 0 && (
            <Button variant="outline" onClick={handleSeedControls} disabled={seeding} className="gap-1.5">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate All Controls
            </Button>
          )}
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Control
          </Button>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, catControls]) => {
        if (catControls.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="space-y-2 mb-6">
              {catControls.map(control => {
                const cfg = STATUS_CONFIG[control.status] || STATUS_CONFIG.not_started;
                const Icon = cfg.icon;
                const evidenceCount = evidence.filter(e => e.control_id === control.id).length;
                const compliance = controlCompliance[control.id];
                const compCfg = compliance ? COMPLIANCE_CONFIG[compliance.status] : null;

                return (
                  <Card key={control.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium text-slate-900 text-sm truncate">{control.control_name}</h4>
                            {compCfg && (
                              <Badge className={compCfg.bg}>{compliance.label}</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{control.frequency}</Badge>
                            <Badge variant="outline" className="text-xs">{evidenceCount} evidence</Badge>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">{control.description}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                            <span>Owner: {control.responsible_role || "—"}</span>
                            {control.last_performed_date && (
                              <span>Last: {format(parseISO(control.last_performed_date), "MMM d, yyyy")}</span>
                            )}
                            {control.next_due_date && (
                              <span>Next: {format(parseISO(control.next_due_date), "MMM d, yyyy")}</span>
                            )}
                          </div>
                          {compliance && compliance.status !== "compliant" && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {compliance.reason}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditing(control); setModalOpen(true); }}
                            className="text-xs"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCompleteModal(control)}
                            className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                          >
                            <Upload className="w-3 h-3" />
                            Complete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Control Edit Modal */}
      <SOC2ControlModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        control={editing}
        orgId={orgId}
      />

      {/* Complete with Evidence Modal */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Control with Evidence</DialogTitle>
          </DialogHeader>
          {completingControl && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 border">
                <p className="font-medium text-sm text-slate-900">{completingControl.control_name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Required evidence: {completingControl.evidence_description || "Upload documentation proving this control was executed."}
                </p>
              </div>

              <div>
                <Label>Evidence Title</Label>
                <Input
                  value={evidenceTitle}
                  onChange={e => setEvidenceTitle(e.target.value)}
                />
              </div>

              <div>
                <Label>Evidence Type</Label>
                <Select value={evidenceType} onValueChange={setEvidenceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screenshot">Screenshot</SelectItem>
                    <SelectItem value="export">Export/Report</SelectItem>
                    <SelectItem value="config">Configuration</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="log">Log File</SelectItem>
                    <SelectItem value="test_result">Test Result</SelectItem>
                    <SelectItem value="review_record">Review Record</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Upload Evidence File</Label>
                <Input
                  type="file"
                  onChange={e => setEvidenceFile(e.target.files[0])}
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">Screenshots, PDFs, exports, or any supporting document.</p>
              </div>

              <div>
                <Label>Notes (required if no file uploaded)</Label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm min-h-[60px]"
                  value={evidenceNotes}
                  onChange={e => setEvidenceNotes(e.target.value)}
                  placeholder="Describe what was done and what evidence was collected..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCompleteModalOpen(false)}>Cancel</Button>
                <Button onClick={handleComplete} disabled={completing} className="gap-1.5">
                  {completing && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CheckCircle2 className="w-4 h-4" />
                  Complete & Save Evidence
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}