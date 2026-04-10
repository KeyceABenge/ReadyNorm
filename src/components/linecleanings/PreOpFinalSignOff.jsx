// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { PreOpInspectionRepo } from "@/lib/adapters/database";
import { toast } from "sonner";

export default function PreOpFinalSignOff({
  open,
  onOpenChange,
  inspectionId,
  inspector,
  passedCount,
  totalCount,
  onComplete,
}) {
  const [overallNotes, setOverallNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const sigCanvas = useRef(null);

  useEffect(() => {
    if (open) {
      setOverallNotes("");
      setSaving(false);
      setError(null);
      // Give canvas time to mount before it's usable
      setTimeout(() => sigCanvas.current?.clear(), 300);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);

    let signatureData = "";
    try {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        signatureData = sigCanvas.current.toDataURL();
      }
    } catch (e) {
      // continue without signature check below
    }

    if (!signatureData) {
      setError("Please provide your signature to complete the inspection.");
      return;
    }

    setSaving(true);
    try {
      await PreOpInspectionRepo.update(inspectionId, {
        status: "passed",
        passed_at: new Date().toISOString(),
        signature_data: signatureData,
        overall_notes: overallNotes || null,
        signed_off_by: inspector?.name || inspector?.email || "unknown",
        signed_off_at: new Date().toISOString(),
      });

      setSaving(false);
      toast.success("Pre-op inspection complete — line is cleared for production!");
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
            Final Pre-Op Inspection Sign-Off
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
              Inspector: {inspector?.name || inspector?.email}
            </p>
          </div>

          {/* Error */}
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
              className="mt-1"
            />
          </div>

          {/* Signature Pad */}
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
                  style: {
                    width: "100%",
                    height: "150px",
                    touchAction: "none",
                    cursor: "crosshair",
                  },
                }}
                backgroundColor="rgb(255, 255, 255)"
                penColor="black"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sign above to certify all assets passed pre-operational inspection and the line is cleared for production
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
            Sign Off &amp; Clear Line for Production
          </Button>
        </div>
      </div>
    </div>
  );
}
