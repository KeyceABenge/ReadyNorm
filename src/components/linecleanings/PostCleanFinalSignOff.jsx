// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { PostCleanInspectionRepo, LineCleaningAssignmentRepo } from "@/lib/adapters/database";
import { toast } from "sonner";

export default function PostCleanFinalSignOff({
  open,
  onOpenChange,
  assignmentId,
  assignment,
  inspector,
  areas,
  allAssets,
  areaSignOffs,
  onComplete,
  t
}) {
  const [overallNotes, setOverallNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const sigCanvas = useRef(null);
  const [sigReady, setSigReady] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setOverallNotes("");
      setSaving(false);
      setError(null);
      setSigReady(false);
      // Give canvas time to mount
      setTimeout(() => setSigReady(true), 300);
    }
  }, [open]);

  if (!open) return null;

  // Count unique assets that have passed - use latest sign-off per asset
  const latestSignOffPerAsset = {};
  areaSignOffs.forEach(s => {
    const existing = latestSignOffPerAsset[s.asset_id];
    if (!existing || new Date(s.created_date || 0) > new Date(existing.created_date || 0)) {
      latestSignOffPerAsset[s.asset_id] = s;
    }
  });
  const latestValues = Object.values(latestSignOffPerAsset);
  const passedCount = latestValues.filter(s => s.status === "passed_inspection").length;
  const totalCount = allAssets.length;
  const allPassed = passedCount === totalCount && totalCount > 0;

  const handleSubmit = async () => {
    setError(null);

    // Signature validation
    let signatureData = "";
    try {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        signatureData = sigCanvas.current.toDataURL();
      }
    } catch (e) {
      // If canvas fails, continue without signature
    }

    if (!signatureData) {
      setError("Please provide your signature to complete the inspection.");
      return;
    }

    if (!allPassed) {
      setError(`All assets must pass inspection (${passedCount}/${totalCount} passed).`);
      return;
    }

    // ATP results are tracked per-asset during individual sign-offs
    // Final sign-off only requires all assets to have passed inspection

    setSaving(true);

    try {
      // Create one PostCleanInspection record per area
      const promises = [];
      for (const area of areas) {
        const areaSignOffItems = latestValues.filter(s => s.area_id === area.id);
        if (areaSignOffItems.length === 0) continue;

        const results = {};
        areaSignOffItems.forEach(s => {
          results[s.asset_id] = {
            passed: s.status === "passed_inspection",
            notes: s.inspection_notes || ""
          };
        });

        promises.push(
          PostCleanInspectionRepo.create({
            organization_id: inspector.organization_id,
            line_cleaning_assignment_id: assignmentId,
            area_id: area.id,
            inspector_email: inspector.email || inspector.name || "unknown",
            inspector_name: inspector.name || inspector.email || "unknown",
            inspection_date: new Date().toISOString(),
            results,
            passed_assets: areaSignOffItems.filter(s => s.status === "passed_inspection").length,
            failed_assets: 0,
            total_assets: areaSignOffItems.length,
            signature_data: signatureData,
            overall_notes: overallNotes
          })
        );
      }

      await Promise.all(promises);

      // Mark assignment as completed
      await LineCleaningAssignmentRepo.update(assignmentId, {
        status: "completed",
        actual_end_time: new Date().toISOString()
      });

      setSaving(false);
      toast.success("Post-clean inspection complete — line cleaning finished!");
      onComplete?.();
    } catch (err) {
      setSaving(false);
      const msg = err?.response?.data?.detail || err?.message || "Unknown error";
      setError("Failed to save: " + msg);
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={() => !saving && onOpenChange(false)}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        style={{ zIndex: 100000 }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Final Post-Clean Inspection Sign-Off
          </h2>
          <button 
            type="button"
            onClick={() => !saving && onOpenChange(false)}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Summary */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm font-medium text-emerald-800">
              All {passedCount}/{totalCount} assets passed inspection. Ready for final sign-off.
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              Inspected by: {inspector?.name || inspector?.email}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Overall Notes */}
          <div>
            <Label>Overall Notes (optional)</Label>
            <Textarea
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              placeholder="Any overall notes about this inspection..."
              rows={3}
            />
          </div>

          {/* Signature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Inspector Signature *</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => sigCanvas.current?.clear()}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
            <div 
              className="border-2 border-slate-300 rounded-lg bg-white overflow-hidden"
              style={{ width: "100%", height: 150 }}
            >
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  width: 460,
                  height: 150,
                  style: { width: "100%", height: "150px", touchAction: "none", cursor: "crosshair" }
                }}
                backgroundColor="rgb(255, 255, 255)"
                penColor="black"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sign above to confirm all assets passed post-clean inspection
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Complete Inspection & Finish
          </Button>
        </div>
      </div>
    </div>
  );
}