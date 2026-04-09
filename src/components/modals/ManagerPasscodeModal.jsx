import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { isLockedOut, recordFailedAttempt, clearAttempts } from "@/components/security/LoginRateLimiter";

export default function ManagerPasscodeModal({ open, onOpenChange, onSubmit, isLoading }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [lockStatus, setLockStatus] = useState({ locked: false, remainingSeconds: 0 });

  // Check lock status on open and periodically while locked
  useEffect(() => {
    if (!open) return;
    const check = () => setLockStatus(isLockedOut());
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (lockStatus.locked) return;
    if (!passcode.trim()) {
      setError("Please enter the passcode");
      return;
    }
    onSubmit(passcode.trim());
  };

  // Called by parent when passcode is wrong
  const handleFailedAttempt = () => {
    const result = recordFailedAttempt();
    if (result.isLocked) {
      setLockStatus(isLockedOut());
      setError("Too many failed attempts. Account locked for 15 minutes.");
    } else if (result.attemptsRemaining <= 2) {
      setError(`Incorrect passcode. ${result.attemptsRemaining} attempt${result.attemptsRemaining !== 1 ? "s" : ""} remaining.`);
    }
  };

  // Expose handleFailedAttempt via a stable ref pattern
  ManagerPasscodeModal.onFailed = handleFailedAttempt;
  ManagerPasscodeModal.onSuccess = clearAttempts;

  const handleClose = () => {
    setPasscode("");
    setError("");
    onOpenChange(false);
  };

  const formatLockTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center">Manager Access</DialogTitle>
          <DialogDescription className="text-center">
            Enter the manager passcode to continue
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="passcode">Passcode</Label>
            {lockStatus.locked ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-center">
                <Lock className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-rose-800">Account temporarily locked</p>
                <p className="text-xs text-rose-600 mt-1">
                  Try again in {formatLockTime(lockStatus.remainingSeconds)}
                </p>
              </div>
            ) : (
              <>
                <Input
                  id="passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter passcode"
                  className="mt-2"
                  disabled={isLoading}
                  autoFocus
                />
                {error && <p className="text-sm text-rose-600 mt-1">{error}</p>}
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-slate-900 hover:bg-slate-800"
              disabled={isLoading || !passcode.trim() || lockStatus.locked}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}