import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package2 } from "lucide-react";
import { format } from "date-fns";
import LineCleaningGantt from "@/components/linecleanings/LineCleaningGantt";

export default function LineCleaningTracker({ 
  assignments, 
  signOffs, 
  productionLines, 
  areas,
  assets,
  employees = [],
  postCleanInspections = [],
  preOpInspections = [],
}) {
  const today = format(new Date(), "yyyy-MM-dd");

  const todayAssignments = useMemo(() => {
    return (assignments || []).filter(a => a.scheduled_date === today);
  }, [assignments, today]);

  const counts = useMemo(() => {
    const completed = todayAssignments.filter(a => a.status === "completed").length;
    const total = todayAssignments.length;
    return { completed, total };
  }, [todayAssignments]);

  const hasLiveData = todayAssignments.some(a => a.status === "in_progress");

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Package2 className="w-3.5 h-3.5 text-blue-600" />
            Line Cleaning
            {hasLiveData && (
              <span className="flex items-center gap-1 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-medium text-emerald-600 uppercase tracking-wider">Live</span>
              </span>
            )}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {counts.completed}/{counts.total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-3 flex-1 flex flex-col">
        {todayAssignments.length === 0 ? (
          <div className="text-center py-6 px-4">
            <Package2 className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
            <p className="text-xs text-slate-500">No line cleanings scheduled today</p>
          </div>
        ) : (
          <div className="px-0">
            <LineCleaningGantt
              assignments={todayAssignments}
              signOffs={signOffs}
              employees={employees}
              live={true}
              title="Cleaning"
              postCleanInspections={postCleanInspections}
              preOpInspections={preOpInspections}
              headerRight={
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {counts.completed}/{counts.total}
                </Badge>
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}