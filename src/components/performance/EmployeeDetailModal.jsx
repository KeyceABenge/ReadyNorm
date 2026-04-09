import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  CheckCircle2, Clock, Calendar, Package2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";

export default function EmployeeDetailModal({ open, onOpenChange, employee, tasks, sessions }) {
  if (!employee) return null;

  const completed = tasks.filter(t => t.status === "completed" || t.status === "verified");
  const pending = tasks.filter(t => t.status === "pending");
  const inProgress = tasks.filter(t => t.status === "in_progress");
  const overdue = tasks.filter(t => t.status === "overdue");

  const completionRate = tasks.length > 0 
    ? Math.round((completed.length / tasks.length) * 100) 
    : 0;

  const initials = employee.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = session.session_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-semibold">
              {employee.avatar_url ? (
                <img src={employee.avatar_url} alt={employee.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">{employee.name} <EmployeeBadgeIcons employee={employee} size="md" /> <BirthdayCakeIcon employee={employee} className="w-5 h-5" /></DialogTitle>
              {employee.department && (
                <p className="text-sm text-slate-500">{employee.department}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Overall Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 mb-2">Total Tasks</p>
            <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 mb-2">Completed</p>
            <p className="text-2xl font-bold text-emerald-600">{completed.length}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 mb-2">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{inProgress.length}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 mb-2">Completion Rate</p>
            <p className={cn(
              "text-2xl font-bold",
              completionRate >= 80 ? "text-emerald-600" : 
              completionRate >= 60 ? "text-yellow-600" : "text-rose-600"
            )}>
              {completionRate}%
            </p>
          </Card>
        </div>

        {/* Shift History */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Shift History ({sessions.length} shifts)
          </h3>

          {sessions.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No shifts recorded</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(sessionsByDate)
                .sort(([a], [b]) => new Date(b) - new Date(a))
                .map(([date, dateSessions]) => (
                  <Card key={date} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-900">
                        {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                      </h4>
                      <Badge variant="outline">
                        {dateSessions.length} session{dateSessions.length > 1 ? 's' : ''}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {dateSessions.map(session => {
                        const sessionTasks = tasks.filter(t => 
                          session.selected_tasks?.includes(t.id)
                        );
                        const sessionCompleted = sessionTasks.filter(t => 
                          t.status === "completed" || t.status === "verified"
                        );

                        return (
                          <div key={session.id} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-600">
                                  {session.start_time ? format(parseISO(session.start_time), "h:mm a") : "N/A"}
                                  {session.end_time && ` - ${format(parseISO(session.end_time), "h:mm a")}`}
                                </span>
                              </div>
                              <Badge className={cn(
                                session.status === "active" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                              )}>
                                {session.status}
                              </Badge>
                            </div>

                            {session.color_coded_role_name && (
                              <div className="flex items-center gap-2 mb-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: session.color_coded_role_color }}
                                />
                                <span className="text-xs text-slate-600">
                                  Role: {session.color_coded_role_name}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{sessionCompleted.length} completed</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package2 className="w-3 h-3 text-slate-500" />
                                <span>{sessionTasks.length} total tasks</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="space-y-3 mt-6">
          <h3 className="text-lg font-semibold text-slate-900">Recent Tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No tasks assigned</p>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 10).map(task => (
                <div key={task.id} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.area && (
                        <span className="text-xs text-slate-500">{task.area}</span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-slate-500">
                          • Due: {format(parseISO(task.due_date), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={cn(
                    task.status === "completed" || task.status === "verified" 
                      ? "bg-emerald-100 text-emerald-700"
                      : task.status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-700"
                  )}>
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}