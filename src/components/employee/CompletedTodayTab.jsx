import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function CompletedTodayTab({ tasks, t }) {
  // Sort by completed_at descending (most recent first)
  const sorted = [...tasks].sort((a, b) => {
    const aTime = a.completed_at || a.updated_date || "";
    const bTime = b.completed_at || b.updated_date || "";
    return bTime.localeCompare(aTime);
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <CheckCircle2 className="w-8 sm:w-12 h-8 sm:h-12 text-slate-300 mx-auto mb-2 sm:mb-4" />
        <p className="text-slate-600 font-medium text-sm sm:text-base">
          {t("dashboard", "noCompletedToday", "No tasks completed yet today")}
        </p>
        <p className="text-slate-500 text-xs sm:text-sm">
          {t("dashboard", "completedWillAppear", "Completed tasks will appear here")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {sorted.map((task) => {
          const completedTime = task.completed_at
            ? format(parseISO(task.completed_at), "h:mm a")
            : null;
          const isVerified = task.status === "verified";

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={cn(
                "p-3 sm:p-4 border",
                isVerified ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    isVerified ? "bg-emerald-100" : "bg-slate-100"
                  )}>
                    <CheckCircle2 className={cn(
                      "w-4 h-4",
                      isVerified ? "text-emerald-600" : "text-slate-500"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{task.title}</p>
                    {task.area && (
                      <p className="text-xs text-slate-500 mt-0.5">{task.area}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {isVerified && (
                        <Badge className="bg-emerald-600 text-xs py-0">
                          {t("status", "verified", "Verified")}
                        </Badge>
                      )}
                      {task.frequency && (
                        <Badge variant="outline" className="text-xs py-0 capitalize">
                          {task.frequency}
                        </Badge>
                      )}
                      {completedTime && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {completedTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}