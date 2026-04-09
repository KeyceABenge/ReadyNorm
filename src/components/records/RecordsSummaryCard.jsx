// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RecordsSummaryCard({ 
  title, 
  expected, 
  completed, 
  completedLate, 
  missed, 
  onDrillDown,
  showDrillDown = true 
}) {
  const total = expected || (completed + (completedLate || 0) + missed);
  const onTimeRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const completionRate = total > 0 ? Math.round(((completed + (completedLate || 0)) / total) * 100) : 0;

  const getHealthColor = (rate) => {
    if (rate >= 95) return "text-emerald-600";
    if (rate >= 85) return "text-blue-600";
    if (rate >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const getHealthBg = (rate) => {
    if (rate >= 95) return "bg-emerald-50 border-emerald-200";
    if (rate >= 85) return "bg-blue-50 border-blue-200";
    if (rate >= 70) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <Card className={cn("border-2 overflow-hidden", getHealthBg(completionRate))}>
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-slate-700 truncate">{title}</CardTitle>
          <span className={cn("text-2xl font-bold shrink-0", getHealthColor(completionRate))}>
            {completionRate}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        <Progress value={completionRate} className="h-2" />
        
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="flex items-center gap-1 p-1.5 bg-white rounded-full border overflow-hidden">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="text-slate-600 truncate">On Time:</span>
            <span className="font-semibold text-emerald-700 ml-auto shrink-0">{completed}</span>
          </div>
          {completedLate > 0 && (
            <div className="flex items-center gap-1 p-1.5 bg-white rounded-full border overflow-hidden">
              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="text-slate-600 truncate">Late:</span>
              <span className="font-semibold text-amber-700 ml-auto shrink-0">{completedLate}</span>
            </div>
          )}
          <div 
            className={cn(
              "flex items-center gap-1 p-1.5 bg-white rounded-full border overflow-hidden",
              missed > 0 && showDrillDown && "cursor-pointer hover:bg-red-50 hover:border-red-200"
            )}
            onClick={() => missed > 0 && showDrillDown && onDrillDown?.("missed")}
          >
            <XCircle className="w-3 h-3 text-red-600 shrink-0" />
            <span className="text-slate-600 truncate">Missed:</span>
            <span className={cn("font-semibold ml-auto shrink-0", missed > 0 ? "text-red-700" : "text-slate-400")}>
              {missed}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1.5 bg-white rounded-full border text-xs overflow-hidden">
          <TrendingUp className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="text-slate-600">Expected:</span>
          <span className="font-semibold text-slate-700 ml-auto shrink-0">{expected || total}</span>
        </div>
      </CardContent>
    </Card>
  );
}