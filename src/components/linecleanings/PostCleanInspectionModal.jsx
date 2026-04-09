// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, X, Camera, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

import SignatureCanvas from "react-signature-canvas";
import { useTranslation } from "@/components/i18n";

export default function PostCleanInspectionModal({ 
  open, 
  onOpenChange, 
  area, 
  assets = [],
  signOffs = [],
  onSubmit, 
  isLoading,
  employeeLanguage = "en"
}) {
  const { t } = useTranslation(employeeLanguage);
  const [inspectionResults, setInspectionResults] = useState({});
  const [failPhotos, setFailPhotos] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const sigCanvas = useRef(null);

  // Filter to only show assets that need inspection (pending or failed)
  const assetsToInspect = assets.filter(asset => {
    const signOff = signOffs.find(s => s.asset_id === asset.id);
    return signOff && (signOff.status === "pending_inspection" || signOff.status === "failed_inspection");
  });

  useEffect(() => {
    if (open) {
      if (assetsToInspect.length > 0) {
        const initial = {};
        assetsToInspect.forEach(asset => {
          initial[asset.id] = { passed: null, notes: "" };
        });
        setInspectionResults(initial);
        setFailPhotos({});
      }
    } else {
      if (sigCanvas.current) {
        sigCanvas.current.clear();
      }
      setInspectionResults({});
      setFailPhotos({});
    }
  }, [open]);

  const handleSetResult = (assetId, passed) => {
    setInspectionResults(prev => ({
      ...prev,
      [assetId]: { ...prev[assetId], passed }
    }));
    if (passed) {
      setFailPhotos(prev => { const next = { ...prev }; delete next[assetId]; return next; });
    }
  };

  const handleSetNotes = (assetId, notes) => {
    setInspectionResults(prev => ({
      ...prev,
      [assetId]: { ...prev[assetId], notes }
    }));
  };

  const handlePhotoUpload = async (assetId, file) => {
    if (!file) return;
    setUploadingPhoto(assetId);
    const { file_url } = await uploadFile({ file });
    setFailPhotos(prev => ({ ...prev, [assetId]: file_url }));
    setUploadingPhoto(null);
  };

  const handleSubmit = () => {
    const allHaveResults = assetsToInspect.every(asset => 
      inspectionResults[asset.id]?.passed !== null
    );

    if (!allHaveResults) {
      alert("Please inspect all assets");
      return;
    }

    const failedWithoutNotes = assetsToInspect.some(asset => {
      const result = inspectionResults[asset.id];
      return result?.passed === false && !result?.notes?.trim();
    });

    if (failedWithoutNotes) {
      alert("Please provide comments for all failed assets");
      return;
    }

    const signatureData = sigCanvas.current?.toDataURL() || "";
    if (!signatureData || sigCanvas.current?.isEmpty()) {
      alert("Please provide your signature");
      return;
    }

    // Merge photo URLs into results
    const resultsWithPhotos = {};
    for (const assetId in inspectionResults) {
      resultsWithPhotos[assetId] = {
        ...inspectionResults[assetId],
        photo_url: failPhotos[assetId] || null
      };
    }

    onSubmit(resultsWithPhotos, signatureData);
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const getSignOff = (assetId) => {
    return signOffs.find(s => s.asset_id === assetId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("cleaning", "postCleanInspection", "Post-Clean Inspection")} - {area?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {assetsToInspect.length === 0 ? (
            <p className="text-center py-8 text-slate-500">{t("lineCleaning", "noAssetsRequireInspection", "No assets require inspection")}</p>
          ) : (
            assetsToInspect.map(asset => {
            const signOff = getSignOff(asset.id);
            const result = inspectionResults[asset.id];
            const isReinspection = signOff?.needs_reinspection || signOff?.status === "failed_inspection";

            return (
              <div key={asset.id} className="border rounded-lg p-4">
                <div className="mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{asset.name}</h3>
                    {isReinspection && (
                      <Badge className="bg-amber-100 text-amber-800 text-xs rounded-full">
                        Needs Reinspection
                      </Badge>
                    )}
                  </div>
                  {asset.description && (
                    <p className="text-sm text-slate-600 mt-1">{asset.description}</p>
                  )}
                  {signOff && (
                    <div className="text-xs text-slate-500 mt-2">
                      {t("lineCleaning", "cleanedBy", "Cleaned by")} {signOff.employee_name} • {signOff.hours_worked}h
                      {signOff.reinspection_count > 0 && (
                        <span className="ml-2 text-amber-600">• Reinspection #{signOff.reinspection_count}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>{t("lineCleaning", "inspectionResult", "Inspection Result")}</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={result?.passed === true ? "default" : "outline"}
                        onClick={() => handleSetResult(asset.id, true)}
                        className={cn(
                          "rounded-full",
                          result?.passed === true && "bg-emerald-600 hover:bg-emerald-700"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {t("atp", "pass", "Pass")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={result?.passed === false ? "default" : "outline"}
                        onClick={() => handleSetResult(asset.id, false)}
                        className={cn(
                          "rounded-full",
                          result?.passed === false && "bg-rose-600 hover:bg-rose-700"
                        )}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {t("atp", "fail", "Fail")}
                      </Button>
                    </div>
                  </div>

                  {result?.passed === false && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-rose-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {t("lineCleaning", "commentsRequiredFailed", "Comments (Required for Failed Items)")} *
                        </Label>
                        <Textarea
                          value={result.notes || ""}
                          onChange={(e) => handleSetNotes(asset.id, e.target.value)}
                          placeholder={t("lineCleaning", "describeIssuesFound", "Describe the issues found...")}
                          rows={3}
                          className="mt-1 border-rose-200 focus:border-rose-400"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          id={`postclean-photo-${asset.id}`}
                          onChange={(e) => handlePhotoUpload(asset.id, e.target.files?.[0])}
                        />
                        <Button 
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => document.getElementById(`postclean-photo-${asset.id}`)?.click()}
                          disabled={uploadingPhoto === asset.id}
                        >
                          {uploadingPhoto === asset.id ? 
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 
                            <Camera className="w-4 h-4 mr-2" />
                          }
                          {failPhotos[asset.id] ? "Change Photo" : "Add Photo"}
                        </Button>

                        {failPhotos[asset.id] && (
                          <div className="relative">
                            <img src={failPhotos[asset.id]} alt="Fail photo" className="w-12 h-12 rounded object-cover" />
                            <button 
                              onClick={() => setFailPhotos(p => { const n = {...p}; delete n[asset.id]; return n; })}
                              className="absolute -top-1 -right-1 bg-slate-700 text-white rounded-full w-4 h-4 flex items-center justify-center"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {result?.passed === true && (
                    <div>
                      <Label>{t("lineCleaning", "commentsOptional", "Comments")} ({t("common", "optional", "Optional")})</Label>
                      <Textarea
                        value={result.notes || ""}
                        onChange={(e) => handleSetNotes(asset.id, e.target.value)}
                        placeholder={t("lineCleaning", "additionalNotesPlaceholder", "Any additional notes...")}
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
          )}

          {assetsToInspect.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <Label>{t("lineCleaning", "inspectorSignature", "Inspector Signature")} *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
                  <X className="w-4 h-4 mr-1" />
                  {t("common", "clear", "Clear")}
                </Button>
              </div>
              <div className="border-2 border-slate-300 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: "w-full h-[150px] cursor-crosshair touch-none"
                  }}
                  backgroundColor="rgb(255, 255, 255)"
                  penColor="black"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{t("lineCleaning", "inspectorMustSign", "Inspector must sign to certify inspection")}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
            {t("common", "cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || assetsToInspect.length === 0}
            className="bg-blue-600 hover:bg-blue-700 rounded-full"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("lineCleaning", "submitInspection", "Submit Inspection")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}