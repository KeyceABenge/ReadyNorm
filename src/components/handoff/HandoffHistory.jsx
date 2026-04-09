import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Calendar, Clock, Mail, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function HandoffHistory({ handoffs, isLoading, onView }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (handoffs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">No Handoffs Yet</h3>
          <p className="text-slate-500">Generate your first shift handoff to see it here.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const groupedByDate = handoffs.reduce((acc, h) => {
    const date = h.handoff_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, dateHandoffs]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-700">
              {format(parseISO(date), "EEEE, MMMM d, yyyy")}
            </h3>
          </div>
          <div className="space-y-3">
            {dateHandoffs.map(handoff => (
              <Card key={handoff.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        handoff.status === "finalized" ? "bg-emerald-100" :
                        handoff.status === "reviewed" ? "bg-blue-100" :
                        "bg-slate-100"
                      )}>
                        <FileText className={cn(
                          "w-5 h-5",
                          handoff.status === "finalized" ? "text-emerald-600" :
                          handoff.status === "reviewed" ? "text-blue-600" :
                          "text-slate-600"
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900">{handoff.shift_name}</h4>
                          <Badge className={cn(
                            handoff.status === "finalized" ? "bg-emerald-100 text-emerald-700" :
                            handoff.status === "reviewed" ? "bg-blue-100 text-blue-700" :
                            "bg-slate-100 text-slate-700"
                          )}>
                            {handoff.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(handoff.period_start), "h:mm a")} — {format(parseISO(handoff.period_end), "h:mm a")}
                          </span>
                          <span>({handoff.hours_covered}h)</span>
                          {handoff.emailed_at && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Mail className="w-3 h-3" />
                              Emailed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">
                          {handoff.performance_metrics?.mss_completion_pct || 0}% completion
                        </p>
                        <p className="text-xs text-slate-500">
                          {handoff.team_summary?.total_employees || 0} team members
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => onView(handoff)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}