import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function ReadyNormLoader({ variant = "fullscreen", className }) {
  useEffect(() => {
    const el = document.getElementById("pre-react-loader");
    if (el) el.remove();
  }, []);

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50",
        className,
      )}
    >
      <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
    </div>
  );
}