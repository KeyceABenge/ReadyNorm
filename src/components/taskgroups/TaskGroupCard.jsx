import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ClipboardList } from "lucide-react";

export default function TaskGroupCard({ group, tasks, onEdit, onDelete }) {
  const groupTasks = tasks.filter(t => group.task_ids?.includes(t.id));
  
  return (
    <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: group.color || "#64748b" }}
            />
            <h3 className="font-semibold text-slate-900 text-lg">
              {group.name}
            </h3>
            <Badge variant="outline" className="ml-auto">
              {groupTasks.length} tasks
            </Badge>
          </div>
          
          {group.description && (
            <p className="text-sm text-slate-500 mb-3">
              {group.description}
            </p>
          )}
          
          {groupTasks.length > 0 && (
            <div className="space-y-1 mt-3">
              {groupTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 text-sm text-slate-600">
                  <ClipboardList className="w-3 h-3" />
                  <span>{task.title}</span>
                  <span className="text-slate-400">• {task.area}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onEdit(group)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onDelete(group)}
            className="text-rose-600 hover:text-rose-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}