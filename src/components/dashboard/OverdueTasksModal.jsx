// @ts-nocheck
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function OverdueTasksModal({ open, onOpenChange, tasks = [], stats, onEditTask }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            Overdue Tasks ({stats?.overdue || tasks.length})
          </AlertDialogTitle>
          <AlertDialogDescription>Tasks that are past their due date or cycle end</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {tasks.map(task => (
            <div key={task.id} className="p-4 bg-rose-50 border border-rose-200 rounded-lg cursor-pointer hover:bg-rose-100 transition-colors" onClick={() => onEditTask(task)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 truncate">{task.title}</h4>
                  <div className="text-sm text-slate-600 mt-1">
                    <span>{task.area}</span>
                    {task.frequency && <span className="ml-2 text-slate-400">• {task.frequency}</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {task.assigned_to_name && <span>Assigned to: {task.assigned_to_name}</span>}
                    {task.due_date && <span className="ml-2">• Due: {format(parseISO(task.due_date), "MMM d")}</span>}
                  </div>
                </div>
                <Badge className="bg-rose-100 text-rose-800 flex-shrink-0">{task.status}</Badge>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-slate-500 text-center py-8">No overdue tasks</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}