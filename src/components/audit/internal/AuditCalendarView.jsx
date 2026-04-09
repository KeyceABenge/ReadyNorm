// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO
} from "date-fns";
import { getStandardColorByIndex } from "./auditColors";

export default function AuditCalendarView({ scheduledAudits, standards = [], onAuditClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const auditsByDate = useMemo(() => {
    const map = {};
    scheduledAudits.forEach(audit => {
      const dateKey = audit.due_date;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(audit);
    });
    return map;
  }, [scheduledAudits]);

  // Build a map of standard_id to color_index for color coding
  const standardColorMap = useMemo(() => {
    const map = {};
    standards.forEach(s => {
      map[s.id] = s.color_index;
    });
    return map;
  }, [standards]);

  const getAuditCalendarColor = (audit) => {
    if (audit.status === "completed") return "bg-green-100 text-green-800 hover:bg-green-200 border-l-4 border-l-green-600";
    if (audit.status === "overdue") {
      return "bg-red-100 text-red-800 hover:bg-red-200 border-l-4 border-l-red-600";
    }
    // Use the standard's assigned color
    const colorIndex = standardColorMap[audit.standard_id];
    const colors = getStandardColorByIndex(colorIndex);
    return colors.calendar;
  };

  const renderDays = () => {
    const days = [];
    let day = startDate;

    while (day <= endDate) {
      const dateKey = format(day, "yyyy-MM-dd");
      const dayAudits = auditsByDate[dateKey] || [];
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());

      days.push(
        <div
          key={dateKey}
          className={`min-h-[100px] border border-slate-100 p-1 ${
            !isCurrentMonth ? "bg-slate-50" : "bg-white"
          } ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""}`}
        >
          <div className={`text-xs font-medium mb-1 ${
            !isCurrentMonth ? "text-slate-300" : "text-slate-600"
          } ${isToday ? "text-blue-600" : ""}`}>
            {format(day, "d")}
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {dayAudits.slice(0, 3).map(audit => (
              <div
                key={audit.id}
                onClick={() => onAuditClick(audit)}
                className={`text-xs px-1.5 py-1 rounded cursor-pointer truncate ${getAuditCalendarColor(audit)}`}
                title={`${audit.standard_name} - ${audit.section_title} - ${audit.auditor_name}`}
              >
                {audit.status === "completed" && <Check className="w-3 h-3 inline mr-1" />}
                {audit.section_title}
              </div>
            ))}
            {dayAudits.length > 3 && (
              <div className="text-xs text-slate-500 text-center">
                +{dayAudits.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    return days;
  };

  const monthAudits = scheduledAudits.filter(a => {
    const auditDate = parseISO(a.due_date);
    return isSameMonth(auditDate, currentMonth);
  });

  // Get unique standards in this month for the legend
  const monthStandards = useMemo(() => {
    const standardIds = new Set(monthAudits.map(a => a.standard_id));
    return standards.filter(s => standardIds.has(s.id));
  }, [monthAudits, standards]);

  const completedThisMonth = monthAudits.filter(a => a.status === "completed").length;
  const overdueThisMonth = monthAudits.filter(a => a.status === "overdue").length;

  return (
    <Card>
      <CardContent className="p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-40 text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline">
              {completedThisMonth}/{monthAudits.length} complete
            </Badge>
            {overdueThisMonth > 0 && (
              <Badge variant="destructive">{overdueThisMonth} overdue</Badge>
            )}
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-xs font-medium text-slate-500 text-center py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {renderDays()}
        </div>

        {/* Legend - Standards */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-xs">
          <span className="text-slate-500 font-medium">Standards:</span>
          {monthStandards.map(standard => {
            const colors = getStandardColorByIndex(standard.color_index);
            return (
              <div key={standard.id} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${colors.bg}`} />
                <span className="text-slate-600">{standard.name}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1 ml-4">
            <div className="w-3 h-3 rounded bg-green-600" />
            <span className="text-slate-600">Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-600" />
            <span className="text-slate-600">Overdue</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}