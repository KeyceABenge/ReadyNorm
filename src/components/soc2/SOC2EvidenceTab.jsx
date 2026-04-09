import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FolderOpen, Upload, FileText, Loader2, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const FOLDER_LABELS = {
  access_reviews: "Access Reviews",
  logs: "Logs",
  backups: "Backups",
  incidents: "Incidents",
  vendors: "Vendors",
  risk_assessments: "Risk Assessments",
  policies: "Policies",
  change_management: "Change Management",
  other: "Other"
};

const TYPE_LABELS = {
  screenshot: "Screenshot", export: "Export", config: "Config",
  document: "Document", log: "Log", test_result: "Test Result",
  review_record: "Review Record", other: "Other"
};

export default function SOC2EvidenceTab({ orgId, evidence, controls }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ evidence_type: "document", folder: "other" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterFolder, setFilterFolder] = useState("all");
  const queryClient = useQueryClient();

  const filtered = filterFolder === "all" ? evidence : evidence.filter(e => e.folder === filterFolder);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      setForm(f => ({ ...f, file_url }));
      toast.success("File uploaded");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      await SOC2EvidenceRepo.create({
        ...form,
        organization_id: orgId,
        collected_date: format(new Date(), "yyyy-MM-dd"),
        collected_by: "System Administrator"
      });
      queryClient.invalidateQueries({ queryKey: ["soc2_evidence"] });
      toast.success("Evidence saved");
      setModalOpen(false);
      setForm({ evidence_type: "document", folder: "other" });
    } catch (err) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const grouped = {};
  Object.keys(FOLDER_LABELS).forEach(f => { grouped[f] = []; });
  filtered.forEach(e => {
    const folder = e.folder || "other";
    if (grouped[folder]) grouped[folder].push(e);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Evidence Repository ({evidence.length})</h2>
        <Button onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Evidence
        </Button>
      </div>

      {/* Folder Filter */}
      <div className="flex flex-wrap gap-2">
        <Button variant={filterFolder === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterFolder("all")}>All</Button>
        {Object.entries(FOLDER_LABELS).map(([key, label]) => {
          const count = evidence.filter(e => (e.folder || "other") === key).length;
          if (count === 0) return null;
          return (
            <Button key={key} variant={filterFolder === key ? "default" : "outline"} size="sm" onClick={() => setFilterFolder(key)}>
              {label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Evidence List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No evidence items yet. Start collecting evidence for your controls.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-medium text-sm text-slate-900 truncate">{item.title}</h4>
                    <Badge variant="outline" className="text-xs">{TYPE_LABELS[item.evidence_type] || item.evidence_type}</Badge>
                    <Badge variant="secondary" className="text-xs">{FOLDER_LABELS[item.folder] || item.folder}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.description || "—"}</p>
                  <div className="flex gap-4 text-xs text-slate-400 mt-1">
                    {item.collected_date && <span>Collected: {format(parseISO(item.collected_date), "MMM d, yyyy")}</span>}
                    {item.control_name && <span>Control: {item.control_name}</span>}
                    {item.collected_by && <span>By: {item.collected_by}</span>}
                  </div>
                </div>
                {item.file_url && (
                  <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Evidence Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Evidence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Q1 Access Review - March 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.evidence_type} onValueChange={v => setForm(f => ({ ...f, evidence_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Folder</Label>
                <Select value={form.folder} onValueChange={v => setForm(f => ({ ...f, folder: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FOLDER_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Linked Control</Label>
              <Select value={form.control_id || ""} onValueChange={v => {
                const ctrl = controls.find(c => c.id === v);
                setForm(f => ({ ...f, control_id: v, control_name: ctrl?.control_name || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select control (optional)" /></SelectTrigger>
                <SelectContent>
                  {controls.map(c => <SelectItem key={c.id} value={c.id}>{c.control_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <textarea className="w-full border rounded-lg p-3 text-sm min-h-[60px]" value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Upload File</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {form.file_url ? (
                  <p className="text-sm text-emerald-600">File uploaded ✓</p>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <label className="cursor-pointer text-sm text-blue-600 hover:underline">
                      Choose file
                      <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                    {uploading && <Loader2 className="w-4 h-4 animate-spin mx-auto mt-2" />}
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save Evidence
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}