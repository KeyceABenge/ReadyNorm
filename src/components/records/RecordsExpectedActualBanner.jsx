import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, RotateCcw, Eye } from "lucide-react";

export default function RecordsExpectedActualBanner({ 
  expected, 
  completedOnTime, 
  completedLate, 
  missed, 
  reopened,
  lowConfidence,
  onFilterChange,
  activeFilter 
}) {
  const stats = [
    { key: "all", label: "Expected", value: expected, icon: Eye, color: "text-slate-600", bg: "bg-slate-100" },
    { key: "on_time", label: "On Time", value: completedOnTime, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
    { key: "late", label: "Late", value: completedLate, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
    { key: "missed", label: "Missed", value: missed, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-100" },
    { key: "reopened", label: "Reopened", value: reopened, icon: RotateCcw, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  if (lowConfidence !== undefined && lowConfidence > 0) {
    stats.push({ key: "low_confidence", label: "Low Confidence", value: lowConfidence, icon: Eye, color: "text-orange-600", bg: "bg-orange-100" });
  }

  return (
    <Card className="bg-white/80 backdrop-blur-xl border-white/80 mb-4">
      <CardContent className="py-3">
        <div className="flex flex-wrap gap-2 md:gap-4">
          {stats.map(stat => {
            const Icon = stat.icon;
            const isActive = activeFilter === stat.key;
            return (
              <button
                key={stat.key}
                onClick={() => onFilterChange(stat.key === activeFilter ? "all" : stat.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                  isActive 
                    ? `${stat.bg} ring-2 ring-offset-1 ring-${stat.color.replace('text-', '')}` 
                    : "hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <div className="text-left">
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}