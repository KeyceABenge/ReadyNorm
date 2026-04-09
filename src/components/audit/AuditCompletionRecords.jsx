import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ClipboardCheck, Download, Search, Calendar, CheckCircle2,
  Clock, FileText, User
} from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";

export default function AuditCompletionRecords({ tasks, employees, dateRange, selectedArea }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter completed tasks in date range
  const completedRecords = useMemo(() => {
    return tasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = parseISO(t.completed_at);
      if (!isWithinInterval(completedDate, { start: dateRange.start, end: dateRange.end })) return false;
      if (searchQuery && !t.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  }, [tasks, dateRange, searchQuery, statusFilter]);

  // Group by date
  const recordsByDate = useMemo(() => {
    const groups = {};
    completedRecords.forEach(task => {
      const dateKey = format(parseISO(task.completed_at), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(task);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [completedRecords]);

  const exportRecords = () => {
    const csvContent = `Task Completion Records\nGenerated: ${format(new Date(), "yyyy-MM-dd HH:mm")}\nPeriod: ${format(dateRange.start, "yyyy-MM-dd")} to ${format(dateRange.end, "yyyy-MM-dd")}\n\nTask ID,Title,Area,Assigned To,Completed At,Status,Has Signature,Verification Status\n${completedRecords.map(t => `"${t.id}","${t.title}","${t.area || ''}","${t.assigned_to_name || ''}","${t.completed_at}","${t.status}","${t.signature_data ? 'Yes' : 'No'}","${t.verified_by ? 'Verified' : 'Pending'}"`).join('\n')}`;
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `completion_records_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            MSS Completion Records
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {completedRecords.length} completed tasks in selected period
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {/* @ts-ignore */}
            <Input 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" onClick={exportRecords}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Total Completed" 
          value={completedRecords.length} 
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard 
          label="Verified" 
          value={completedRecords.filter(t => t.verified_by).length} 
          icon={FileText}
          color="blue"
        />
        <StatCard 
          label="With Signature" 
          value={completedRecords.filter(t => t.signature_data).length} 
          icon={User}
          color="purple"
        />
        <StatCard 
          label="Unique Areas" 
          value={new Set(completedRecords.map(t => t.area)).size} 
          icon={Calendar}
          color="slate"
        />
      </div>

      {/* Records by Date */}
      <div className="space-y-4">
        {recordsByDate.map(([date, dayTasks]) => (
          <Card key={date}>
            <CardHeader className="py-3 px-4 bg-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                </CardTitle>
                <Badge variant="outline" className="">{dayTasks.length} tasks</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {dayTasks.map(task => (
                  <div key={task.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-slate-900 truncate">{task.title}</h4>
                          <Badge variant="default" className={cn(
                            "text-xs",
                            task.status === "verified" ? "bg-emerald-100 text-emerald-700" :
                            task.status === "completed" ? "bg-blue-100 text-blue-700" :
                            "bg-slate-100 text-slate-700"
                          )}>
                            {task.status}
                          </Badge>
                          {task.signature_data && (
                            <Badge variant="outline" className="text-xs">Signed</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>{task.area || "No area"}</span>
                          <span>•</span>
                          <span>{task.assigned_to_name || "Unassigned"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(task.completed_at), "h:mm a")}
                          </span>
                        </div>
                        {task.completion_notes && (
                          <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">
                            {task.completion_notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <p>ID: {task.id?.slice(-8)}</p>
                        {task.verified_by && (
                          <p className="text-emerald-600 mt-1">
                            Verified by {task.verified_by}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {recordsByDate.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No completion records found for selected period</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200"
  };

  return (
    <Card className={cn("border", colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}