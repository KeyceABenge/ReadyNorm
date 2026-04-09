import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, FlaskConical, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CompleteTitrationModal({ open, onOpenChange, titrationArea, onComplete, isLoading }) {
  const [recordedValue, setRecordedValue] = useState("");
  const [notes, setNotes] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [retestValue, setRetestValue] = useState("");
  const [failedAttempts, setFailedAttempts] = useState([]);
  const [showRetest, setShowRetest] = useState(false);

  if (!titrationArea) return null;

  const numValue = parseFloat(recordedValue);
  const isValidNumber = !isNaN(numValue) && recordedValue.trim() !== "";
  const isInRange = isValidNumber && numValue >= titrationArea.target_min && numValue <= titrationArea.target_max;
  const isOutOfRange = isValidNumber && !isInRange;

  const retestNumValue = parseFloat(retestValue);
  const isRetestValid = !isNaN(retestNumValue) && retestValue.trim() !== "";
  const isRetestInRange = isRetestValid && retestNumValue >= titrationArea.target_min && retestNumValue <= titrationArea.target_max;

  const handleRecordFailure = () => {
    if (!isValidNumber || !correctiveAction.trim()) return;
    
    // Add this failed attempt to history
    setFailedAttempts(prev => [...prev, {
      value: numValue,
      corrective_action: correctiveAction
    }]);
    
    // Show retest input
    setShowRetest(true);
    setRecordedValue("");
    setCorrectiveAction("");
  };

  const handleSubmit = () => {
    // If we have failed attempts, use the retest value as final
    const finalValue = failedAttempts.length > 0 ? retestNumValue : numValue;
    if (isNaN(finalValue)) return;
    
    onComplete({
      titration_area_id: titrationArea.id,
      titration_area_name: titrationArea.name,
      chemical_name: titrationArea.chemical_name,
      target_ppm_min: titrationArea.target_min,
      target_ppm_max: titrationArea.target_max,
      recorded_ppm: finalValue,
      status: "pass",
      notes: notes + (failedAttempts.length > 0 ? `\n\nCorrective History:\n${failedAttempts.map((a, i) => `Attempt ${i+1}: ${a.value} - Action: ${a.corrective_action}`).join('\n')}` : ''),
      corrective_action: failedAttempts.length > 0 ? failedAttempts.map(a => a.corrective_action).join('; ') : null
    });

    // Reset form
    setRecordedValue("");
    setNotes("");
    setCorrectiveAction("");
    setRetestValue("");
    setFailedAttempts([]);
    setShowRetest(false);
  };

  const handleClose = (open) => {
    if (!open) {
      // Reset all state when closing
      setRecordedValue("");
      setNotes("");
      setCorrectiveAction("");
      setRetestValue("");
      setFailedAttempts([]);
      setShowRetest(false);
    }
    onOpenChange(open);
  };

  const measurementUnit = titrationArea.measurement_type === "oz_gal" ? "oz/gal" : "PPM";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            Record Titration
          </DialogTitle>
          <DialogDescription>
            Enter the test result for this chemical titration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Area Info */}
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="font-semibold text-slate-900">{titrationArea.name}</p>
            <p className="text-sm text-slate-600 mt-1">
              {titrationArea.chemical_name} • Target: {titrationArea.target_min}-{titrationArea.target_max} {measurementUnit}
            </p>
            <Badge variant="outline" className="mt-2 text-xs capitalize">
              {titrationArea.type?.replace("_", " ")}
            </Badge>
          </div>

          {/* Failed Attempts History */}
          {failedAttempts.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <p className="font-medium text-amber-800 text-sm">Previous Attempts:</p>
              {failedAttempts.map((attempt, i) => (
                <div key={i} className="text-xs text-amber-700 pl-2 border-l-2 border-amber-300">
                  <span className="font-semibold">Attempt {i + 1}:</span> {attempt.value} {measurementUnit} (Out of range)
                  <br />
                  <span className="text-amber-600">Action: {attempt.corrective_action}</span>
                </div>
              ))}
            </div>
          )}

          {/* Show retest input if we have failed attempts */}
          {showRetest ? (
            <>
              {/* Retest Reading Input */}
              <div className="space-y-2">
                <Label htmlFor="retest" className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Retest Reading ({measurementUnit}) *
                </Label>
                <Input
                  id="retest"
                  type="number"
                  step="0.1"
                  placeholder={`Enter new ${measurementUnit} value after correction`}
                  value={retestValue}
                  onChange={(e) => setRetestValue(e.target.value)}
                  className={cn(
                    "text-lg font-semibold",
                    isRetestInRange && "border-emerald-500 focus:ring-emerald-500",
                    isRetestValid && !isRetestInRange && "border-red-500 focus:ring-red-500"
                  )}
                />
                {isRetestValid && (
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-sm",
                    isRetestInRange ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  )}>
                    {isRetestInRange ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Within acceptable range - PASS</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span>Still out of range - needs another correction</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* If retest is also out of range, require another corrective action */}
              {isRetestValid && !isRetestInRange && (
                <div className="space-y-2">
                  <Label htmlFor="corrective2">Corrective Action Taken *</Label>
                  <Textarea
                    id="corrective2"
                    placeholder="Describe what additional action was taken..."
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                    className="border-red-300"
                  />
                  <Button
                    onClick={() => {
                      if (correctiveAction.trim()) {
                        setFailedAttempts(prev => [...prev, {
                          value: retestNumValue,
                          corrective_action: correctiveAction
                        }]);
                        setRetestValue("");
                        setCorrectiveAction("");
                      }
                    }}
                    disabled={!correctiveAction.trim()}
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Record Correction & Retest Again
                  </Button>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Submit Button - only enabled when retest is in range */}
              <Button
                onClick={handleSubmit}
                disabled={!isRetestInRange || isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {isLoading ? "Recording..." : "Complete Titration"}
              </Button>
            </>
          ) : (
            <>
              {/* Initial Reading Input */}
              <div className="space-y-2">
                <Label htmlFor="reading">Reading ({measurementUnit}) *</Label>
                <Input
                  id="reading"
                  type="number"
                  step="0.1"
                  placeholder={`Enter ${measurementUnit} value`}
                  value={recordedValue}
                  onChange={(e) => setRecordedValue(e.target.value)}
                  className={cn(
                    "text-lg font-semibold",
                    isInRange && "border-emerald-500 focus:ring-emerald-500",
                    isOutOfRange && "border-red-500 focus:ring-red-500"
                  )}
                />
                {isValidNumber && (
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-sm",
                    isInRange ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  )}>
                    {isInRange ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Within acceptable range - PASS</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span>Out of range - requires corrective action & retest</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Corrective Action (required if out of range) */}
              {isOutOfRange && (
                <div className="space-y-2">
                  <Label htmlFor="corrective">Corrective Action Taken *</Label>
                  <Textarea
                    id="corrective"
                    placeholder="Describe what action was taken to correct the issue..."
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                    className="border-red-300"
                  />
                </div>
              )}

              {/* Notes (only show if in range) */}
              {isInRange && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}

              {/* Buttons */}
              {isOutOfRange ? (
                <Button
                  onClick={handleRecordFailure}
                  disabled={!correctiveAction.trim()}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Record Correction & Retest
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!isInRange || isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? "Recording..." : "Record Result"}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}