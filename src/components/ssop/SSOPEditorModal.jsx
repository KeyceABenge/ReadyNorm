// @ts-nocheck
import { useState } from "react";
import { SSOPRepo } from "@/lib/adapters/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, Send, CheckCircle2, History, Loader2, XCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function SSOPEditorModal({ ssop, user, onClose, onSaved }) {
  const [title, setTitle] = useState(ssop.title || "");
  const [content, setContent] = useState(ssop.content || "");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await SSOPRepo.update(ssop.id, {
        title,
        content,
        status: "draft"
      });
      toast.success("Draft saved");
      onSaved();
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    setIsSubmitting(true);
    try {
      await SSOPRepo.update(ssop.id, {
        title,
        content,
        status: "pending_review",
        submitted_by: user?.email,
        submitted_at: new Date().toISOString()
      });
      toast.success("Submitted for review");
      onSaved();
    } catch (error) {
      toast.error("Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const newVersion = (ssop.version || 1) + (ssop.status === "approved" ? 1 : 0);
      const revisionHistory = [...(ssop.revision_history || [])];
      
      if (ssop.status === "approved") {
        revisionHistory.push({
          version: ssop.version,
          changed_by: user?.email,
          changed_at: new Date().toISOString(),
          change_notes: approvalNotes || "New revision approved",
          content_snapshot: ssop.content
        });
      }

      await SSOPRepo.update(ssop.id, {
        title,
        content,
        status: "approved",
        version: newVersion,
        approved_by: user?.email,
        approved_at: new Date().toISOString(),
        approval_notes: approvalNotes,
        revision_history: revisionHistory
      });
      toast.success("SSOP approved!");
      onSaved();
    } catch (error) {
      toast.error("Failed to approve");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      await SSOPRepo.update(ssop.id, {
        status: "draft",
        approval_notes: approvalNotes || "Returned for revision"
      });
      toast.success("Returned for revision");
      onSaved();
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit SSOP
            <Badge variant="outline" className="ml-2">Version {ssop.version || 1}</Badge>
            {ssop.ai_generated && <Badge className="bg-purple-100 text-purple-700">AI Generated</Badge>}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="history">History ({ssop.revision_history?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500">Method:</span> <span className="font-medium capitalize">{ssop.cleaning_method}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500">Zone:</span> <span className="font-medium uppercase">{ssop.zone_type}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500">Disassembly:</span> <span className="font-medium capitalize">{ssop.disassembly_level}</span>
              </div>
            </div>

            <div>
              <Label>Content (Markdown)</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-1 font-mono text-sm"
                rows={20}
              />
            </div>

            {ssop.status === "pending_review" && (
              <div>
                <Label>Approval/Rejection Notes</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add notes for approval or rejection..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-y-auto pr-2">
            <div className="prose prose-sm max-w-none p-4 bg-white rounded-lg border">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto pr-2">
            {ssop.revision_history?.length > 0 ? (
              <div className="space-y-3">
                {ssop.revision_history.map((rev, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">Version {rev.version}</Badge>
                      <span className="text-xs text-slate-500">
                        {rev.changed_at && format(new Date(rev.changed_at), "MMM d, yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{rev.change_notes}</p>
                    <p className="text-xs text-slate-400 mt-1">By: {rev.changed_by}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No revision history yet
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          
          <div className="flex gap-2">
            {ssop.status === "draft" && (
              <>
                <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Draft
                </Button>
                <Button onClick={handleSubmitForReview} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit for Review
                </Button>
              </>
            )}

            {ssop.status === "pending_review" && (
              <>
                <Button variant="outline" onClick={handleReject} className="text-rose-600 hover:text-rose-700">
                  <XCircle className="w-4 h-4 mr-2" />
                  Return for Revision
                </Button>
                <Button onClick={handleApprove} disabled={isApproving} className="bg-emerald-600 hover:bg-emerald-700">
                  {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Approve SSOP
                </Button>
              </>
            )}

            {ssop.status === "approved" && (
              <>
                <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save as New Draft
                </Button>
                <Button onClick={handleApprove} disabled={isApproving}>
                  {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Publish New Version
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}