import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, ChevronRight, TrendingUp, 
  AlertCircle, Sparkles, Trophy, Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const getPerformanceLabel = (rate, rank, totalEmployees) => {
  const isTopPerformer = rank <= 2;
  const isBottomPerformer = rank > totalEmployees - 3;
  
  if (rate >= 95 && isTopPerformer) {
    return { label: "All Star!", color: "text-amber-600", bg: "bg-amber-50", icon: Trophy };
  }
  if (rate >= 85 && isTopPerformer) {
    return { label: "Shooting Star!", color: "text-purple-600", bg: "bg-purple-50", icon: Sparkles };
  }
  if (rate >= 80) {
    return { label: "Strong", color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp };
  }
  if (rate >= 60) {
    return { label: "On Track", color: "text-blue-600", bg: "bg-blue-50", icon: null };
  }
  if (rate < 50 && isBottomPerformer) {
    return { label: "Needs Support", color: "text-rose-600", bg: "bg-rose-50", icon: Heart };
  }
  if (rate < 60) {
    return { label: "Attention", color: "text-amber-600", bg: "bg-amber-50", icon: AlertCircle };
  }
  return null;
};

function CompactEmployeeRow({ employee, stats, rank, totalEmployees, onViewDetails }) {
  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  const initials = employee.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const perfLabel = getPerformanceLabel(completionRate, rank, totalEmployees);
  const PerfIcon = perfLabel?.icon;

  return (
    <div 
      className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
      onClick={() => onViewDetails?.(employee)}
    >
      <span className="text-[10px] font-medium text-slate-400 w-4">{rank}</span>
      <div 
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
        style={{ backgroundColor: employee.color || '#1e293b', color: 'white' }}
      >
        {employee.avatar_url ? (
          <img src={employee.avatar_url} alt={employee.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-900 truncate flex items-center gap-1">{employee.name} <EmployeeBadgeIcons employee={employee} size="xs" /> <BirthdayCakeIcon employee={employee} className="w-3 h-3" /></p>
      </div>
      {perfLabel && (
        <Badge className={cn("text-[9px] px-1.5 py-0 h-4", perfLabel.bg, perfLabel.color)}>
          {PerfIcon && <PerfIcon className="w-2.5 h-2.5 mr-0.5" />}
          {perfLabel.label}
        </Badge>
      )}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={cn(
          "text-sm font-bold w-10 text-right",
          completionRate >= 80 ? "text-emerald-600" : 
          completionRate >= 60 ? "text-amber-600" : "text-rose-600"
        )}>
          {completionRate}%
        </span>
        <span className="text-[10px] text-slate-400">{stats.completed}/{stats.total}</span>
      </div>
      <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
    </div>
  );
}

export default function CompactEmployeePerformanceSection({ 
  employees = [], 
  getPerformanceStats,
  onViewDetails,
  timeRangeLabel = "This Week"
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate stats and sort employees
  const employeesWithStats = employees
    .filter(e => e.status === "active")
    .map(employee => ({
      employee,
      stats: getPerformanceStats(employee.email)
    }))
    .sort((a, b) => {
      const aRate = a.stats.total > 0 ? (a.stats.completed / a.stats.total) * 100 : 0;
      const bRate = b.stats.total > 0 ? (b.stats.completed / b.stats.total) * 100 : 0;
      return bRate - aRate;
    });

  const totalEmployees = employeesWithStats.length;
  
  // Get top 5 and bottom 5 (avoiding overlap)
  const topPerformers = employeesWithStats.slice(0, 5);
  const bottomPerformers = totalEmployees > 5 
    ? employeesWithStats.slice(-5).reverse() 
    : [];
  
  // Middle performers (everyone else)
  const middlePerformers = totalEmployees > 10 
    ? employeesWithStats.slice(5, -5)
    : [];

  if (employeesWithStats.length === 0) {
    return (
      <Card className="p-3">
        <p className="text-xs text-slate-500 text-center">No employees to display</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-2 md:p-3 border-b bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs md:text-sm font-semibold text-slate-900">Employee Performance</h3>
            <p className="text-[10px] md:text-xs text-slate-500">{timeRangeLabel} • {totalEmployees} team members</p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {employeesWithStats.filter(e => {
              const rate = e.stats.total > 0 ? (e.stats.completed / e.stats.total) * 100 : 0;
              return rate >= 80;
            }).length} high performers
          </Badge>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {/* Top Performers Section */}
        {topPerformers.length > 0 && (
          <div className="p-1.5 md:p-2">
            <p className="text-[10px] font-semibold text-emerald-600 px-2 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              TOP PERFORMERS
            </p>
            {topPerformers.map(({ employee, stats }, idx) => (
              <CompactEmployeeRow
                key={employee.id}
                employee={employee}
                stats={stats}
                rank={idx + 1}
                totalEmployees={totalEmployees}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}

        {/* Bottom Performers Section */}
        {bottomPerformers.length > 0 && (
          <div className="p-1.5 md:p-2">
            <p className="text-[10px] font-semibold text-rose-600 px-2 mb-1 flex items-center gap-1">
              <Heart className="w-3 h-3" />
              NEEDS ATTENTION
            </p>
            {bottomPerformers.map(({ employee, stats }, idx) => (
              <CompactEmployeeRow
                key={employee.id}
                employee={employee}
                stats={stats}
                rank={totalEmployees - bottomPerformers.length + idx + 1}
                totalEmployees={totalEmployees}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}

        {/* Expandable Middle Section */}
        {middlePerformers.length > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <button className="w-full p-2 flex items-center justify-center gap-1 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
                <span>{isExpanded ? "Hide" : "Show"} {middlePerformers.length} more team members</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-1.5 md:p-2 border-t">
                <p className="text-[10px] font-semibold text-slate-500 px-2 mb-1">OTHER TEAM MEMBERS</p>
                {middlePerformers.map(({ employee, stats }, idx) => (
                  <CompactEmployeeRow
                    key={employee.id}
                    employee={employee}
                    stats={stats}
                    rank={6 + idx}
                    totalEmployees={totalEmployees}
                    onViewDetails={onViewDetails}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Show all button if small team */}
        {totalEmployees <= 10 && totalEmployees > 5 && !isExpanded && (
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-full p-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
          >
            View all {totalEmployees} team members
          </button>
        )}
      </div>
    </Card>
  );
}