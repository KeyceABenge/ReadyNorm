import { useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";

const STATUS_COLORS = {
  on_track: { border: "border-emerald-300", bg: "bg-emerald-50" },
  at_risk: { border: "border-amber-300", bg: "bg-amber-50" },
  delayed: { border: "border-rose-300", bg: "bg-rose-50" }
};

function EmployeeRow({ ep, onClick }) {
  const progressPct = ep.selectedCount > 0 ? (ep.completedCount / ep.selectedCount) * 100 : 0;
  const notStarted = !ep.hasSession;
  
  return (
    <div 
      className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer hover:bg-slate-50 ${
        notStarted ? "border-slate-200 bg-slate-50/50 opacity-70" : (STATUS_COLORS[ep.status]?.border || "border-slate-200")
      }`}
      onClick={() => onClick?.(ep.employee)}
    >
      <div 
        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-medium flex-shrink-0 overflow-hidden ${notStarted ? "opacity-50" : ""}`}
        style={{ backgroundColor: ep.employee?.color || "#64748b" }}
      >
        {ep.employee?.avatar_url ? (
          <img src={ep.employee.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          ep.employee?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "??"
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium truncate flex items-center gap-0.5">{ep.employee?.name?.split(" ")[0] || "?"} <EmployeeBadgeIcons employee={ep.employee} size="xs" /> <BirthdayCakeIcon employee={ep.employee} className="w-3 h-3" /></span>
          {notStarted ? (
            <span className="text-[10px] text-slate-400 flex-shrink-0 italic">not started</span>
          ) : (
            <span className="text-[10px] text-slate-500 flex-shrink-0">{ep.completedCount}/{ep.selectedCount}</span>
          )}
        </div>
        <Progress value={notStarted ? 0 : progressPct} className="h-1 mt-0.5" />
      </div>
    </div>
  );
}

function TeamGroup({ name, color, employeeData, onEmployeeClick, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalCompleted = employeeData.reduce((s, e) => s + e.completedCount, 0);
  const totalSelected = employeeData.reduce((s, e) => s + e.selectedCount, 0);
  const progressPct = totalSelected > 0 ? (totalCompleted / totalSelected) * 100 : 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-slate-700 hover:text-slate-900 py-1">
        <div className="flex items-center gap-1.5">
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color || "#94a3b8" }} />
          <span className="font-medium">{name}</span>
          <span className="text-[10px] text-slate-400">({employeeData.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium">{totalCompleted}/{totalSelected}</span>
          <span className="text-[10px] text-slate-400">{Math.round(progressPct)}%</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 pt-1 space-y-1">
        {employeeData.map(ep => (
          <EmployeeRow key={ep.id} ep={ep} onClick={onEmployeeClick} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ShiftTeamBreakdown({ employeeProgress, crews, onEmployeeClick, isLive, scheduledCrewMembers }) {
  // Show scheduled crew members, but if none matched, fall back to showing
  // employees who have active sessions (so the widget is never empty when people are working)
  const visibleProgress = useMemo(() => {
    if (!scheduledCrewMembers || scheduledCrewMembers.size === 0) {
      // Fallback: show employees who have sessions (they're clearly working this shift)
      const withSessions = employeeProgress.filter(ep => ep.hasSession);
      return withSessions.length > 0 ? withSessions : employeeProgress;
    }
    return employeeProgress.filter(ep => {
      const email = ep.employee?.email || ep.employee_email;
      return scheduledCrewMembers.has(email);
    });
  }, [employeeProgress, scheduledCrewMembers]);

  // Group employees by crew
  const grouped = useMemo(() => {
    const crewGroups = [];
    const assignedEmails = new Set();

    // Match employees to crews
    (crews || []).filter(c => c.status === "active").forEach(crew => {
      const members = (crew.members || []);
      const crewEmployees = visibleProgress.filter(ep => 
        members.includes(ep.employee?.email) || members.includes(ep.employee_email)
      );
      if (crewEmployees.length > 0) {
        crewGroups.push({ name: crew.name, color: crew.color, employees: crewEmployees });
        crewEmployees.forEach(ep => assignedEmails.add(ep.employee?.email || ep.employee_email));
      }
    });

    // Unassigned employees
    const unassigned = visibleProgress.filter(ep => 
      !assignedEmails.has(ep.employee?.email) && !assignedEmails.has(ep.employee_email)
    );
    if (unassigned.length > 0) {
      crewGroups.push({ name: "Unassigned", color: "#94a3b8", employees: unassigned });
    }

    return crewGroups;
  }, [visibleProgress, crews]);

  // If no crew groups at all, show flat list
  if (grouped.length === 0) {
    return (
      <Collapsible defaultOpen={visibleProgress.length <= 6}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-slate-600 hover:text-slate-900">
          <span className="font-medium flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            Team ({visibleProgress.length})
          </span>
          <ChevronDown className="w-3.5 h-3.5" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {visibleProgress.map(ep => (
              <EmployeeRow key={ep.id} ep={ep} onClick={onEmployeeClick} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Show grouped by crew
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
        <Users className="w-3 h-3" />
        Teams ({grouped.length})
      </div>
      <div className="space-y-0.5 max-h-56 overflow-y-auto">
        {grouped.map(group => (
          <TeamGroup
            key={group.name}
            name={group.name}
            color={group.color}
            employeeData={group.employees}
            onEmployeeClick={onEmployeeClick}
            defaultOpen={grouped.length <= 3}
          />
        ))}
      </div>
    </div>
  );
}