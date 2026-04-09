import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";

export default function PinEntryModal({ open, onClose, employee, onSuccess, onSkip }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const pinLength = employee?.pin_code?.length || 4;

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
    }
  }, [open]);

  const handleNumberClick = (num) => {
    if (pin.length < pinLength) {
      const newPin = pin + num;
      setPin(newPin);
      setError("");
      
      // Auto-submit when PIN is complete
      if (newPin.length === pinLength) {
        setTimeout(() => validatePin(newPin), 150);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const validatePin = (enteredPin) => {
    if (enteredPin === employee?.pin_code) {
      onSuccess();
    } else {
      setError("Incorrect PIN");
      setPin("");
    }
  };

  const initials = employee?.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Enter PIN</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {/* Employee Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-xl mb-2">
            {employee?.avatar_url ? (
              <img 
                src={employee.avatar_url} 
                alt={employee.name} 
                className="w-full h-full rounded-full object-cover" 
              />
            ) : (
              initials
            )}
          </div>
          <p className="font-medium text-slate-900 flex items-center justify-center gap-1">{employee?.name} <BirthdayCakeIcon employee={employee} className="w-4 h-4" /></p>

          {/* PIN Dots */}
          <div className="flex gap-3 my-6">
            {Array.from({ length: pinLength }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all",
                  i < pin.length 
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

          {/* Skip option if no PIN is set */}
          {!employee?.pin_code && onSkip && (
            <Button
              variant="ghost"
              className="mt-4 text-slate-500"
              onClick={onSkip}
            >
              Continue without PIN
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}