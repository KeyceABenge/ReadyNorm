// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AreaSignOffRepo } from "@/lib/adapters/database";

import { CheckCircle2, XCircle, AlertTriangle, Camera, Loader2, X as XIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { uploadFile } from "@/lib/adapters/storage";

export default function InlinePostCleanInspection({ signOff, inspector, onInspected, t }) {
  const [result, setResult] = useState(null); // "pass" | "fail" | null
  const [failComment, setFailComment] = useState("");
  const [failPhoto, setFailPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!signOff || signOff.status !== "pending_inspection") return null;

  const handleResult = async (status) => {
    if (status === "pass") {
      // Save immediately
      setSaving(true);
      await AreaSignOffRepo.update(signOff.id, {
        status: "passed_inspection",
        inspected_by: inspector.name || inspector.email,
        inspected_at: new Date().toISOString(),
        needs_reinspection: false
      });
      setSaving(false);
      toast.success("Asset passed inspection");
      onInspected?.();
    } else {
      // Show fail form
      setResult("fail");
    }
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await uploadFile({ file });
    setFailPhoto(file_url);
    setUploadingPhoto(false);
  };

  const handleSubmitFail = async () => {
    if (!failComment.trim()) {
      toast.error("Please describe what needs to be corrected");
      return;
    }
    setSaving(true);
    await AreaSignOffRepo.update(signOff.id, {
      status: "failed_inspection",
      inspection_notes: failComment,
      inspection_photo_url: failPhoto,
      inspected_by: inspector.name || inspector.email,
      inspected_at: new Date().toISOString(),
      needs_reinspection: true,
      reinspection_count: (signOff.reinspection_count || 0) + 1
    });
    setSaving(false);
    toast.success("Asset failed — sent back for re-cleaning");
    setResult(null);
    setFailComment("");
    setFailPhoto(null);
    onInspected?.();
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      {!result && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">
            {t?.("cleaning", "inspect", "Inspect")}:
          </span>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={() => handleResult("pass")}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
            {t?.("atp", "pass", "Pass")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-rose-300 text-rose-700 hover:bg-rose-50"
            onClick={() => setResult("fail")}
            disabled={saving}
          >
            <XCircle className="w-3 h-3 mr-1" />
            {t?.("atp", "fail", "Fail")}
          </Button>
        </div>
      )}

      <AnimatePresence>
        {result === "fail" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 mt-3"
          >
            <label className="text-sm font-medium text-rose-700 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {t?.("lineCleaning", "whatNeedsCorrected", "What needs to be corrected? (Required)")}
            </label>
            <Textarea
              value={failComment}
              onChange={(e) => setFailComment(e.target.value)}
              placeholder="Describe the issue..."
              className="border-rose-200 focus:border-rose-400"
              rows={2}
            />
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                id={`inline-inspect-photo-${signOff.id}`}
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`inline-inspect-photo-${signOff.id}`)?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ?
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
                  <Camera className="w-4 h-4 mr-2" />
                }
                {failPhoto ? "Change Photo" : "Add Photo"}
              </Button>
              {failPhoto && (
                <div className="relative">
                  <img src={failPhoto} alt="Fail" className="w-12 h-12 rounded object-cover" />
                  <button
                    onClick={() => setFailPhoto(null)}
                    className="absolute -top-1 -right-1 bg-slate-700 text-white rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <XIcon className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setResult(null); setFailComment(""); setFailPhoto(null); }}
              >
                {t?.("common", "cancel", "Cancel")}
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700"
                onClick={handleSubmitFail}
                disabled={saving || !failComment.trim()}
              >
                {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Submit Fail
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}