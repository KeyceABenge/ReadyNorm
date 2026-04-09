import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function MissedExceptionsToggle({ showExceptions, onToggle, exceptionCount }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-white/60 backdrop-blur-xl rounded-full border border-white/80 mb-4">
      <div className="flex items-center gap-2">
        {showExceptions ? (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        )}
        <Label htmlFor="exceptions-toggle" className="text-sm font-medium cursor-pointer">
          {showExceptions ? "Showing Missed/Exceptions" : "Showing Completed"}
        </Label>
      </div>
      <Switch
        id="exceptions-toggle"
        checked={showExceptions}
        onCheckedChange={onToggle}
      />
      {exceptionCount > 0 && (
        <Badge className="bg-amber-100 text-amber-700 rounded-full">
          {exceptionCount} exception{exceptionCount !== 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
}