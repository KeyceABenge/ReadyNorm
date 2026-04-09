import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";

export default function EmployeePerformanceCard({ employee, stats, onViewDetails }) {
  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  const initials = employee.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onViewDetails}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {employee.avatar_url ? (
                <img src={employee.avatar_url} alt={employee.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1">{employee.name} <EmployeeBadgeIcons employee={employee} size="xs" /> <BirthdayCakeIcon employee={employee} className="w-3.5 h-3.5" /></p>
              {employee.department && (
                <p className="text-xs text-slate-500 truncate">{employee.department}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={cn(
              "text-xl font-bold",
              completionRate >= 80 ? "text-emerald-600" : 
              completionRate >= 60 ? "text-yellow-600" : "text-rose-600"
            )}>
              {completionRate}%
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-sm font-semibold text-slate-900">{stats.total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Done</p>
            <p className="text-sm font-semibold text-emerald-600">{stats.completed}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-sm font-semibold text-slate-600">{stats.pending}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}