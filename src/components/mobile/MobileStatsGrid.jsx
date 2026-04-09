/**
 * Mobile Stats Grid
 * Compact stats display optimized for mobile screens
 */

import { Card } from "@/components/ui/card";
import { 
  CheckCircle2, Clock, AlertTriangle, ClipboardList, 
  TrendingUp, Users, Package2
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  total: ClipboardList,
  completed: CheckCircle2,
  in_progress: Clock,
  pending: Clock,
  overdue: AlertTriangle,
  employees: Users,
  lines: Package2,
  trend: TrendingUp
};

const colorMap = {
  total: "bg-slate-100 text-slate-600",
  completed: "bg-emerald-100 text-emerald-600",
  in_progress: "bg-blue-100 text-blue-600",
  pending: "bg-amber-100 text-amber-600",
  overdue: "bg-rose-100 text-rose-600",
  employees: "bg-purple-100 text-purple-600",
  lines: "bg-indigo-100 text-indigo-600",
  trend: "bg-cyan-100 text-cyan-600"
};

export default function MobileStatsGrid({ stats }) {
  const items = [
    { key: "completed", label: "Done", value: stats.completed },
    { key: "in_progress", label: "In Progress", value: stats.in_progress },
    { key: "pending", label: "Pending", value: stats.pending },
    { key: "overdue", label: "Overdue", value: stats.overdue },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => {
        const Icon = iconMap[item.key];
        const colorClass = colorMap[item.key];
        
        return (
          <Card key={item.key} className="p-3 text-center">
            <div className={cn(
              "w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-1",
              colorClass
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-slate-900">{item.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{item.label}</p>
          </Card>
        );
      })}
    </div>
  );
}