import { useQuery } from "@tanstack/react-query";
import { EmployeeSessionRepo } from "@/lib/adapters/database";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Activity, ArrowRight, Lock } from "lucide-react";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";

export default function ActiveOnShiftBanner({ organizationId, activeShift, employees, onSelectEmployee }) {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: activeSessions = [] } = useQuery({
    queryKey: ["active_sessions", organizationId, today, activeShift?.id],
    queryFn: () => EmployeeSessionRepo.filter({
      organization_id: organizationId,
      session_date: today,
      shift_id: activeShift?.id,
      status: "active"
    }),
    enabled: !!organizationId && !!activeShift?.id,
    refetchInterval: 30000
  });

  if (activeSessions.length === 0) return null;

  const activeEmployeeIds = new Set(activeSessions.map(s => s.employee_id));
  const activeEmployees = employees.filter(e => activeEmployeeIds.has(e.id));

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="relative">
          <Activity className="w-4 h-4 text-emerald-600" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <span className="text-sm font-semibold text-emerald-800">
          Active on Shift — Tap to Resume
        </span>
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
          {activeEmployees.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {activeEmployees.map(emp => {
          const initials = emp.name
            ?.split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "??";

          return (
            <button
              key={emp.id}
              onClick={() => onSelectEmployee?.(emp)}
              className="w-full text-left group"
            >
              <div className="flex items-center gap-3 p-2 sm:p-3 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-colors">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white font-semibold text-sm">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt={emp.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1">
                    {emp.name}
                    <EmployeeBadgeIcons employee={emp} size="sm" />
                    <BirthdayCakeIcon employee={emp} className="w-3.5 h-3.5" />
                  </h3>
                  <p className="text-xs text-emerald-600 font-medium">
                    Shift in progress — tap to resume
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {emp.pin_code && (
                    <Lock className="w-3 h-3 text-slate-400" />
                  )}
                  <div className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-medium group-hover:bg-emerald-700 transition-colors">
                    Resume
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}