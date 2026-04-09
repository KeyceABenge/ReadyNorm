import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, Edit, Calendar, User, CheckCircle2, 
  Clock, AlertTriangle, FileText
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-800" },
  open: { label: "Open", color: "bg-blue-100 text-blue-800" },
  investigation: { label: "Investigation", color: "bg-purple-100 text-purple-800" },
  corrective_action: { label: "Corrective Action", color: "bg-amber-100 text-amber-800" },
  preventive_action: { label: "Preventive Action", color: "bg-orange-100 text-orange-800" },
  verification: { label: "Verification", color: "bg-cyan-100 text-cyan-800" },
  effective: { label: "Effective", color: "bg-emerald-100 text-emerald-800" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-800" },
  reopened: { label: "Reopened", color: "bg-rose-100 text-rose-800" }
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-100 text-slate-700" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700" },
  high: { label: "High", color: "bg-orange-100 text-orange-700" },
  critical: { label: "Critical", color: "bg-rose-100 text-rose-700" }
};

export default function CAPACard({ capa, onEdit, employees = [] }) {
  const status = STATUS_CONFIG[capa.status] || STATUS_CONFIG.open;
  const priority = PRIORITY_CONFIG[capa.priority] || PRIORITY_CONFIG.medium;
  
  const correctiveActions = capa.corrective_actions || [];
  const preventiveActions = capa.preventive_actions || [];
  const allActions = [...correctiveActions, ...preventiveActions];
  const completedActions = allActions.filter(a => a.status === "completed").length;
  const actionProgress = allActions.length > 0 ? Math.round((completedActions / allActions.length) * 100) : 0;

  const isOverdue = capa.target_close_date && 
    new Date(capa.target_close_date) < new Date() && 
    !["closed", "effective"].includes(capa.status);

  const daysOpen = capa.initiated_date 
    ? differenceInDays(new Date(), parseISO(capa.initiated_date))
    : 0;

  const owner = employees.find(e => e.email === capa.assigned_to);

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isOverdue && "border-rose-300 bg-rose-50/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-sm text-slate-500">{capa.capa_number}</span>
              <Badge className={status.color}>{status.label}</Badge>
              <Badge className={priority.color}>{priority.label}</Badge>
              {isOverdue && (
                <Badge className="bg-rose-500 text-white">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
              {capa.recurrence_found && (
                <Badge className="bg-amber-500 text-white">Recurrence Found</Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-slate-900 mb-1">{capa.title}</h3>
            {capa.description && (
              <p className="text-sm text-slate-600 line-clamp-2 mb-3">{capa.description}</p>
            )}

            {/* Action Progress */}
            {allActions.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Actions Progress</span>
                  <span>{completedActions}/{allActions.length} completed</span>
                </div>
                <Progress value={actionProgress} className="h-2" />
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {owner && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{owner.name}</span>
                </div>
              )}
              {capa.initiated_date && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{format(parseISO(capa.initiated_date), "MMM d, yyyy")}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{daysOpen} days open</span>
              </div>
              {capa.source_reference && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{capa.source_reference}</span>
                </div>
              )}
            </div>

            {/* Action Summary */}
            {(correctiveActions.length > 0 || preventiveActions.length > 0) && (
              <div className="flex gap-4 mt-3 text-xs">
                {correctiveActions.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-600">
                      {correctiveActions.filter(a => a.status === "completed").length}/{correctiveActions.length} Corrective
                    </span>
                  </div>
                )}
                {preventiveActions.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-slate-600">
                      {preventiveActions.filter(a => a.status === "completed").length}/{preventiveActions.length} Preventive
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Root Cause Summary */}
            {capa.root_cause_category && (
              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Root Cause: {capa.root_cause_category}</p>
                {capa.root_cause_analysis && (
                  <p className="text-sm text-slate-700 line-clamp-2">{capa.root_cause_analysis}</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(capa)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit CAPA
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}