import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

import { toast } from "sonner";
import { generateUniqueCapaId } from "./capaUtils";
import { cn } from "@/lib/utils";
import {
  CAPACommentRepo,
  CAPARepo
} from "@/lib/adapters/database";

/**
 * Auto-CAPA Trigger Component
 * Forces CAPA creation for critical/high severity events
 * Used by: EMP positives, Pest exceedances, Audit major findings, etc.
 */
export default function AutoCAPATrigger({ 
  open, 
  onClose, 
  sourceType, 
  sourceRecord, 
  organizationId, 
  user,
  severity = "high",
  autoTitle,
  autoDescription,
  onCAPACreated 
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");

  const handleCreateCAPA = async () => {
    setIsCreating(true);
    try {
      const capaId = await generateUniqueCapaId(organizationId);
      
      // Create CAPA with pre-filled info
      const capa = await CAPARepo.create({
        organization_id: organizationId,
        capa_id: capaId,
        title: autoTitle,
        status: "open",
        severity: severity,
        source: sourceType,
        source_record_id: sourceRecord?.id,
        source_record_type: sourceRecord?.__typename || sourceType,
        problem_description: `${autoDescription}\n\n${additionalContext}`.trim(),
        owner_email: user?.email,
        owner_name: user?.full_name,
        area_name: sourceRecord?.area_name || sourceRecord?.production_line_name || "",
        zone: sourceRecord?.zone_classification || sourceRecord?.zone || "",
        when_observed: new Date().toISOString(),
        containment_actions: "", // User must fill
        effectiveness_criteria: "", // User must define before closure
      });

      // Create initial comment
      await CAPACommentRepo.create({
        organization_id: organizationId,
        capa_id: capa.id,
        author_email: user?.email,
        author_name: user?.full_name,
        content: `CAPA auto-created from ${sourceType}: ${sourceRecord?.id || 'N/A'}`,
        comment: `CAPA auto-created from ${sourceType}: ${sourceRecord?.id || 'N/A'}`,
        comment_type: "system",
      });

      toast.success(`CAPA ${capaId} created - complete root cause and actions`);
      
      if (onCAPACreated) onCAPACreated(capa);
      onClose();
    } catch (error) {
      console.error("Failed to create CAPA:", error);
      toast.error("Failed to create CAPA");
    } finally {
      setIsCreating(false);
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case "critical": return "bg-rose-100 text-rose-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-amber-100 text-amber-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            CAPA Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className={cn("p-4 rounded-lg border", 
            severity === "critical" || severity === "high" 
              ? "bg-rose-50 border-rose-200" 
              : "bg-amber-50 border-amber-200"
          )}>
            <Badge className={getSeverityColor(severity)} >{severity.toUpperCase()}</Badge>
            <p className="text-sm font-medium mt-2">{autoTitle}</p>
            <p className="text-sm text-slate-600 mt-1">{autoDescription}</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Additional Context (optional)
            </label>
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Add any additional details about this issue..."
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>What happens next:</strong> A CAPA will be created and assigned to you. 
              You'll need to complete root cause analysis, define corrective actions, and set effectiveness criteria.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateCAPA}
            disabled={isCreating}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating CAPA...
              </>
            ) : (
              <>
                Create CAPA
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}