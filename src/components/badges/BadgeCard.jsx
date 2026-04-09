import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import ProxiedImage from "@/components/ui/ProxiedImage";
import { cn } from "@/lib/utils";
import { TASK_CATEGORIES } from "@/components/tasks/taskCategoryClassifier";

const TYPE_LABELS = {
  total_tasks: "Total Tasks",
  streak: "Streak",
  category_completion: "Category",
  task_group_completion: "Task Group",
  top_performer: "Top Performer"
};

const RANK_LABELS = { 1: "🥇 1st", 2: "🥈 2nd", 3: "🥉 3rd", 4: "4th", 5: "5th" };
const PERIOD_LABELS = { weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly" };

export default function BadgeCard({ badge, onEdit, onDelete, seriesPosition }) {
  const categoryConfig = badge.category ? (TASK_CATEGORIES[badge.category] || null) : null;
  const categoryLabel = categoryConfig?.shortLabel || badge.category;

  const requirement = badge.badge_type === "top_performer"
    ? `${RANK_LABELS[badge.threshold] || badge.threshold} · ${PERIOD_LABELS[badge.top_performer_period] || "Monthly"}`
    : badge.counting_method === "all"
      ? "All tasks"
      : `${badge.threshold} ${badge.badge_type === "streak" ? "days" : badge.counting_method === "unique" ? "unique" : "total"}`;

  const subtitle = badge.task_group_name || categoryLabel || "";

  return (
    <Card className="p-3 border-0 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <ProxiedImage src={badge.photo_url} alt={badge.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{badge.name}</h3>
            <Badge className={cn("text-[10px] px-1.5 py-0", badge.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>
              {badge.status === "active" ? "Active" : "Off"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 truncate">
            {seriesPosition ? `#${seriesPosition} · ` : ""}{TYPE_LABELS[badge.badge_type]}{subtitle ? ` · ${subtitle}` : ""} · {requirement}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button size="icon" variant="ghost" onClick={() => onEdit(badge)} className="h-7 w-7">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(badge)} className="h-7 w-7 text-rose-500 hover:text-rose-600">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}