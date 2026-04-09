import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Delete, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SetPinModal({ open, onClose, onSave, currentPin }) {
  const [step, setStep] = useState("choose"); // "choose", "enter", "confirm"
  const [pinLength, setPinLength] = useState(4);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStep("choose");
      setPin("");
      setConfirmPin("");
      setError("");
      setPinLength(4);
    }
  }, [open]);

  const handleNumberClick = (num) => {
    if (step === "enter" && pin.length < pinLength) {
      const newPin = pin + num;
      setPin(newPin);
      setError("");
      if (newPin.length === pinLength) {
        setTimeout(() => {
          setStep("confirm");
        }, 150);
      }
    } else if (step === "confirm" && confirmPin.length < pinLength) {
      const newConfirm = confirmPin + num;
      setConfirmPin(newConfirm);
      setError("");
      if (newConfirm.length === pinLength) {
        setTimeout(() => {
          if (newConfirm === pin) {
            onSave(pin);
            toast.success("PIN set successfully");
            onClose();
          } else {
            setError("PINs don't match. Try again.");
            setConfirmPin("");
          }
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    if (step === "enter") {
      setPin(pin.slice(0, -1));
    } else if (step === "confirm") {
      setConfirmPin(confirmPin.slice(0, -1));
    }
    setError("");
  };

  const handleClear = () => {
    if (step === "enter") {
      setPin("");
    } else if (step === "confirm") {
      setConfirmPin("");
    }
    setError("");
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep("enter");
      setConfirmPin("");
      setPin("");
      setError("");
    } else if (step === "enter") {
      setStep("choose");
      setPin("");
      setError("");
    }
  };

  const handleRemovePin = () => {
    onSave(null);
    toast.success("PIN removed");
    onClose();
  };

  const currentPinDisplay = step === "enter" ? pin : confirmPin;
  const currentLength = currentPinDisplay.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Lock className="w-5 h-5" />
            {step === "choose" ? "Set Your PIN" : step === "enter" ? "Enter New PIN" : "Confirm PIN"}
          </DialogTitle>
          {step === "choose" && (
            <DialogDescription className="text-center">
              Choose a PIN length to secure your account
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {step === "choose" ? (
            <div className="space-y-3 w-full">
              <Button
                variant="outline"
                className="w-full h-16 text-lg justify-between px-6"
                onClick={() => { setPinLength(4); setStep("enter"); }}
              >
                <span>4-Digit PIN</span>
                <span className="text-slate-400">• • • •</span>
              </Button>
              <Button
                variant="outline"
                className="w-full h-16 text-lg justify-between px-6"
                onClick={() => { setPinLength(6); setStep("enter"); }}
              >
                <span>6-Digit PIN</span>
                <span className="text-slate-400">• • • • • •</span>
              </Button>
              
              {currentPin && (
                <Button
                  variant="ghost"
                  className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 mt-4"
                  onClick={handleRemovePin}
                >
                  Remove Current PIN
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* PIN Dots */}
              <div className="flex gap-3 my-6">
                {Array.from({ length: pinLength }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all",
                      i < currentLength 
                        ? "bg-slate-900 border-slate-900" 
                        : "bg-white border-slate-300"
                    )}
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-red-500 text-sm mb-4">{error}</p>
              )}

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <Button
                    key={num}
                    variant="outline"
                    className="h-14 text-xl font-semibold"
                    onClick={() => handleNumberClick(String(num))}
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className="h-14"
                  onClick={handleClear}
                >
                  <X className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  className="h-14 text-xl font-semibold"
                  onClick={() => handleNumberClick("0")}
                >
                  0
                </Button>
                <Button
                  variant="outline"
                  className="h-14"
                  onClick={handleDelete}
                >
                  <Delete className="w-5 h-5" />
                </Button>
              </div>

              <Button
                variant="ghost"
                className="mt-4 text-slate-500"
                onClick={handleBack}
              >
                Back
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}