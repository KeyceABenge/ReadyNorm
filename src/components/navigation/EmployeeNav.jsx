/**
 * Employee Navigation
 * Simple nav bar for employees - no manager actions
 */

import OfflineStatusIndicator from "@/components/offline/OfflineStatusIndicator";

export default function EmployeeNav({ employee }) {
  const initials = employee?.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <div className="flex items-center gap-2">
      <OfflineStatusIndicator showDetails={true} />
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-medium text-xs">
          {employee?.avatar_url ? (
            <img src={employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <span className="hidden sm:inline font-medium">{employee?.name}</span>
      </div>
    </div>
  );
}