import { format, parseISO, startOfWeek, getWeek, getMonth, getYear } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function groupSignOffsByAssignment(signOffs, lineAssignments, productionLines) {
  const groups = {};
  
  signOffs.forEach(signOff => {
    const assignment = lineAssignments.find(a => a.id === signOff.line_cleaning_assignment_id);
    const line = assignment ? productionLines.find(l => l.id === assignment.production_line_id) : null;
    
    if (assignment) {
      const key = `${assignment.id}`;
      if (!groups[key]) {
        const startDate = parseISO(assignment.estimated_start_time || assignment.assigned_date);
        const endDate = assignment.estimated_completion ? parseISO(assignment.estimated_completion) : startDate;
        const label = `${line?.name || 'Line'} • ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
        
        groups[key] = {
          assignment,
          line,
          label,
          signOffs: []
        };
      }
      groups[key].signOffs.push(signOff);
    }
  });
  
  return Object.values(groups).sort((a, b) => 
    new Date(b.assignment.assigned_date) - new Date(a.assignment.assigned_date)
  );
}

export function groupTasksByWeek(tasks) {
  const groups = {};
  
  tasks.forEach(task => {
    const date = parseISO(task.completed_at || task.due_date);
    const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
    const key = format(weekStart, 'yyyy-MM-dd');
    
    if (!groups[key]) {
      groups[key] = {
        weekStart,
        weekEnd: new Date(weekStart),
        tasks: []
      };
      groups[key].weekEnd.setDate(groups[key].weekEnd.getDate() + 6);
    }
    groups[key].tasks.push(task);
  });
  
  return Object.values(groups)
    .sort((a, b) => b.weekStart - a.weekStart)
    .map(group => ({
      ...group,
      label: `${format(group.weekStart, 'MMM d')} - ${format(group.weekEnd, 'MMM d, yyyy')}`
    }));
}

export function groupTasksByMonth(tasks) {
  const groups = {};
  
  tasks.forEach(task => {
    const date = parseISO(task.completed_at || task.due_date);
    const month = getMonth(date);
    const year = getYear(date);
    const key = `${year}-${month}`;
    
    if (!groups[key]) {
      groups[key] = {
        month: new Date(year, month, 1),
        tasks: []
      };
    }
    groups[key].tasks.push(task);
  });
  
  return Object.values(groups)
    .sort((a, b) => b.month - a.month)
    .map(group => ({
      ...group,
      label: format(group.month, 'MMMM yyyy')
    }));
}

export function groupTasksByBiweekly(tasks) {
  const groups = {};
  
  tasks.forEach(task => {
    const date = parseISO(task.completed_at || task.due_date);
    const weekNumber = getWeek(date);
    const year = getYear(date);
    const biweekNumber = Math.floor((weekNumber - 1) / 2);
    const key = `${year}-biweek-${biweekNumber}`;
    
    const biweekStart = new Date(year, 0, 1);
    biweekStart.setDate(biweekStart.getDate() + (biweekNumber * 14));
    const biweekEnd = new Date(biweekStart);
    biweekEnd.setDate(biweekEnd.getDate() + 13);
    
    if (!groups[key]) {
      groups[key] = {
        biweekStart,
        biweekEnd,
        tasks: []
      };
    }
    groups[key].tasks.push(task);
  });
  
  return Object.values(groups)
    .sort((a, b) => b.biweekStart - a.biweekStart)
    .map(group => ({
      ...group,
      label: `${format(group.biweekStart, 'MMM d')} - ${format(group.biweekEnd, 'MMM d, yyyy')}`
    }));
}

export function GroupHeader({ label, isOpen, onToggle, count, completed = 0 }) {
  const total = count;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const statusColor = percentage === 100 ? '#059669' : percentage >= 75 ? '#0891b2' : percentage >= 50 ? '#f59e0b' : '#ef4444';
  
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors mb-3"
    >
      <ChevronDown className={cn("w-4 h-4 text-slate-600 transition-transform", !isOpen && "-rotate-90")} />
      <span className="font-semibold text-slate-900">{label}</span>
      <span className="ml-auto flex items-center gap-2">
        <div className="text-sm text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
          {count} {count === 1 ? 'item' : 'items'}
        </div>
        <div className="text-sm font-medium px-2 py-1 rounded border" style={{ backgroundColor: `${statusColor}20`, color: statusColor, borderColor: statusColor }}>
          {completed}/{total} ({percentage}%)
        </div>
      </span>
    </button>
  );
}

export function GroupedRecords({ groups, renderItem, type = "records" }) {
  const [openGroups, setOpenGroups] = useState({});
  
  const toggleGroup = (key) => {
    setOpenGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  const getCompletionStats = (group, type) => {
    const items = group.signOffs || group.tasks || [];
    
    if (type === "signoffs") {
      const completed = items.filter(item => item.status === 'passed_inspection').length;
      return { completed, total: items.length };
    } else if (type === "tasks") {
      const completed = items.filter(item => item.status === 'completed' || item.status === 'verified').length;
      return { completed, total: items.length };
    }
    return { completed: 0, total: items.length };
  };
  
  return (
    <div className="space-y-4">
      {groups.map((group, idx) => {
        const groupKey = `group-${idx}`;
        const isOpen = openGroups[groupKey] !== false; // Default to open
        const items = group.signOffs || group.tasks || [];
        const stats = getCompletionStats(group, type);
        
        return (
          <div key={groupKey}>
            <GroupHeader
              label={group.label || group.assignment?.assigned_date}
              isOpen={isOpen}
              onToggle={() => toggleGroup(groupKey)}
              count={items.length}
              completed={stats.completed}
            />
            {isOpen && (
              <div className="space-y-3 ml-2">
                {items.map(item => renderItem(item))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}