import { motion } from "framer-motion";
import { Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";
import ProxiedImage from "@/components/ui/ProxiedImage";

// Clean card palette - matches modern dashboard design
const CREW_PALETTES = [
  { bg: "bg-white", border: "border-slate-200", header: "bg-slate-900", badge: "bg-slate-100 text-slate-600" },
  { bg: "bg-white", border: "border-slate-200", header: "bg-slate-800", badge: "bg-slate-100 text-slate-600" },
  { bg: "bg-white", border: "border-slate-200", header: "bg-slate-700", badge: "bg-slate-100 text-slate-600" },
  { bg: "bg-white", border: "border-slate-200", header: "bg-slate-900", badge: "bg-slate-100 text-slate-600" },
  { bg: "bg-white", border: "border-slate-200", header: "bg-slate-800", badge: "bg-slate-100 text-slate-600" },
  { bg: "bg-white", border: "border-slate-200", header: "bg-slate-700", badge: "bg-slate-100 text-slate-600" },
];

const ROLE_COLORS = {
  "sanitation": { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-500" },
  "lead": { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  "supervisor": { bg: "bg-purple-50", text: "text-purple-900", dot: "bg-purple-700" },
  "inspector": { bg: "bg-emerald-50", text: "text-emerald-900", dot: "bg-emerald-700" },
  "qa": { bg: "bg-teal-50", text: "text-teal-900", dot: "bg-teal-700" },
  "manager": { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  "cleaner": { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  "technician": { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  "default": { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

function getRoleStyle(role, roleColorMap) {
  if (!role) return ROLE_COLORS.default;
  // Check if we have a configured color from RoleConfig
  if (roleColorMap && roleColorMap[role]) {
    const hex = roleColorMap[role];
    return { bg: "", text: "", dot: "", hex };
  }
  const key = role.toLowerCase();
  for (const [k, v] of Object.entries(ROLE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return ROLE_COLORS.default;
}

function EmployeeChip({ employee, onSelect, disabled, roleColorMap }) {
  const initials = employee.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const roleStyle = getRoleStyle(employee.role || employee.department, roleColorMap);
  const displayRole = employee.role || employee.department || "Employee";

  return (
    <button
      onClick={() => onSelect(employee)}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all text-left",
        "hover:bg-white hover:shadow-sm active:scale-[0.98] border border-transparent hover:border-slate-200",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0 overflow-hidden bg-slate-700"
      >
        {employee.avatar_url ? (
          <ProxiedImage src={employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : initials}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-slate-800 truncate block leading-tight flex items-center gap-1">
          {employee.name}
          <EmployeeBadgeIcons employee={employee} size="xs" />
          <BirthdayCakeIcon employee={employee} className="w-3.5 h-3.5 inline-block" />
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span 
            className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded", !roleStyle.hex && roleStyle.bg, !roleStyle.hex && roleStyle.text)}
            style={roleStyle.hex ? { backgroundColor: roleStyle.hex + "20", color: roleStyle.hex } : undefined}
          >
            <span 
              className={cn("w-1.5 h-1.5 rounded-full", !roleStyle.hex && roleStyle.dot)} 
              style={roleStyle.hex ? { backgroundColor: roleStyle.hex } : undefined}
            />
            {displayRole}
          </span>
        </div>
      </div>
      {employee.pin_code && <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />}
    </button>
  );
}

// Build a rank map from roleConfigs: top-level roles (no reports_to) get rank 0,
// their direct reports get rank 1, etc.
function buildRoleRankMap(roleConfigs) {
  const rankMap = {};
  if (!roleConfigs || roleConfigs.length === 0) return rankMap;

  // Build adjacency: parent -> children
  const children = {};
  const allNames = new Set();
  roleConfigs.forEach(rc => {
    const name = rc.role_name;
    allNames.add(name);
    if (!children[name]) children[name] = [];
  });
  roleConfigs.forEach(rc => {
    if (rc.reports_to && allNames.has(rc.reports_to)) {
      if (!children[rc.reports_to]) children[rc.reports_to] = [];
      children[rc.reports_to].push(rc.role_name);
    }
  });

  // Find roots (roles that don't report to anyone or report to a non-existent role)
  const roots = roleConfigs.filter(rc => !rc.reports_to || !allNames.has(rc.reports_to)).map(rc => rc.role_name);

  // BFS to assign ranks
  const queue = roots.map(r => ({ name: r, rank: 0 }));
  while (queue.length > 0) {
    const { name, rank } = queue.shift();
    if (rankMap[name] !== undefined) continue;
    rankMap[name] = rank;
    (children[name] || []).forEach(child => {
      if (rankMap[child] === undefined) {
        queue.push({ name: child, rank: rank + 1 });
      }
    });
  }

  // Any roles not reached get a high rank
  allNames.forEach(name => {
    if (rankMap[name] === undefined) rankMap[name] = 999;
  });

  return rankMap;
}

export default function CrewOrgChart({ crews, employees, roleConfigs = [], searchQuery, selectedEmployee, onSelectEmployee }) {
  const query = searchQuery.toLowerCase();
  const roleRankMap = buildRoleRankMap(roleConfigs);

  // Build color lookup from roleConfigs
  const roleColorMap = {};
  roleConfigs.forEach(rc => {
    if (rc.color && rc.color !== "#64748b") {
      roleColorMap[rc.role_name] = rc.color;
    }
  });

  // Build a sort_order lookup from roleConfigs for tiebreaking within same hierarchy level
  const roleSortOrderMap = {};
  roleConfigs.forEach(rc => {
    roleSortOrderMap[rc.role_name] = rc.sort_order ?? 999;
  });

  const sortByRoleHierarchy = (members) => {
    return [...members].sort((a, b) => {
      const rankA = roleRankMap[a.role] ?? 999;
      const rankB = roleRankMap[b.role] ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      const sortA = roleSortOrderMap[a.role] ?? 999;
      const sortB = roleSortOrderMap[b.role] ?? 999;
      if (sortA !== sortB) return sortA - sortB;
      return (a.name || "").localeCompare(b.name || "");
    });
  };

  const crewGroups = crews.map((crew, i) => {
    const members = sortByRoleHierarchy(
      employees.filter(
        e => crew.members?.includes(e.email) && e.name.toLowerCase().includes(query)
      )
    );
    return { crew, members, palette: CREW_PALETTES[i % CREW_PALETTES.length] };
  }).filter(g => g.members.length > 0);

  const unassigned = sortByRoleHierarchy(
    employees.filter(
      e => !crews.some(c => c.members?.includes(e.email)) && e.name.toLowerCase().includes(query)
    )
  );

  const allEmpty = crewGroups.length === 0 && unassigned.length === 0;

  if (allEmpty) {
    return (
      <div className="text-center py-16">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">
          {searchQuery ? "No employees match your search" : "No active employees found"}
        </p>
      </div>
    );
  }

  const allColumns = [
    ...crewGroups,
    ...(unassigned.length > 0 ? [{
      crew: { id: "__unassigned", name: "Unassigned", color: null },
      members: unassigned,
      palette: CREW_PALETTES[crewGroups.length % CREW_PALETTES.length]
    }] : [])
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {allColumns.map((group, gi) => {
        const { crew, members, palette } = group;
        const headerColor = crew.color && crew.color !== "#3b82f6" ? crew.color : null;

        return (
          <motion.div
            key={crew.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05 }}
            className={cn(
              "rounded-2xl border overflow-hidden shadow-sm",
              palette.bg, palette.border
            )}
          >
            {/* Crew header */}
            <div
              className={cn("px-4 py-2.5 flex items-center justify-between", !headerColor && palette.header)}
              style={headerColor ? { backgroundColor: headerColor } : undefined}
            >
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-white tracking-wide truncate block">{crew.name}</span>
                {(crew.shift_start_time || crew.shift_hours) && (
                  <span className="text-[10px] text-white/70 block mt-0.5">
                    {crew.shift_start_time && crew.shift_end_time ? `${crew.shift_start_time}–${crew.shift_end_time}` : ""}
                    {crew.shift_hours ? ` · ${crew.shift_hours}h` : ""}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium bg-white/20 px-2 py-0.5 rounded-full text-white flex-shrink-0">{members.length}</span>
            </div>

            {/* Members */}
            <div className="p-2 divide-y divide-slate-100/80">
              {members.map((emp) => (
                <EmployeeChip
                  key={emp.id}
                  employee={emp}
                  onSelect={onSelectEmployee}
                  disabled={selectedEmployee?.id === emp.id}
                  roleColorMap={roleColorMap}
                />
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}