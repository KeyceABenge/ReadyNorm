import { useState } from "react";
import { TrainingDocumentRepo, ControlledDocumentRepo } from "@/lib/adapters/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_MAP = {
  ssop: "ssop",
  sds: "other",
  one_point_lesson: "training_material",
  training_material: "training_material",
  policy: "policy",
  sop: "sop",
  work_instruction: "work_instruction",
  form: "form",
  other: "other"
};

export default function SyncTrainingDocsButton({ organizationId, onSynced }) {
  const [syncing, setSyncing] = useState(false);
  const [unlinkCount, setUnlinkCount] = useState(null);
  const [checked, setChecked] = useState(false);

  const checkUnlinked = async () => {
    const trainingDocs = await TrainingDocumentRepo.filter({ 
      organization_id: organizationId, 
      status: "active" 
    });
    const unlinked = trainingDocs.filter(td => !td.linked_controlled_document_id);
    setUnlinkCount(unlinked.length);
    setChecked(true);
    return unlinked;
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const unlinked = await checkUnlinked();
      
      if (unlinked.length === 0) {
        toast.success("All training documents are already synced");
        setSyncing(false);
        return;
      }

      let synced = 0;
      for (const td of unlinked) {
        const controlledDoc = await ControlledDocumentRepo.create({
          organization_id: organizationId,
          title: td.title,
          document_type: TYPE_MAP[td.type] || "other",
          category: td.category || undefined,
          description: td.description || undefined,
          file_url: td.file_url,
          file_name: td.file_name,
          status: "effective",
          version: "1.0",
          effective_date: td.created_date ? td.created_date.split("T")[0] : new Date().toISOString().split("T")[0],
          training_document_id: td.id,
          tags: ["from_training"]
        });

        await TrainingDocumentRepo.update(td.id, {
          linked_controlled_document_id: controlledDoc.id
        });
        synced++;
      }

      toast.success(`Synced ${synced} training document${synced !== 1 ? "s" : ""} to Document Control`);
      setUnlinkCount(0);
      onSynced?.();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync: " + (error.message || "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSync}
      disabled={syncing || (checked && unlinkCount === 0)}
      className="gap-1.5"
    >
      {syncing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : checked && unlinkCount === 0 ? (
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <RefreshCw className="w-3.5 h-3.5" />
      )}
      {syncing ? "Syncing..." : checked && unlinkCount === 0 ? "All Synced" : "Sync Training Docs"}
      {unlinkCount > 0 && (
        <Badge className="bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0 ml-1">{unlinkCount}</Badge>
      )}
    </Button>
  );
}