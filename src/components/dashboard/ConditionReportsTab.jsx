// @ts-nocheck
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { SanitaryReportRepo } from "@/lib/adapters/database";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ConditionReportsTab({ sanitaryReports = [], user }) {
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Unsanitary Condition Reports</h2>
        <p className="text-slate-500 text-sm mt-1">Reports from QA team members</p>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({sanitaryReports.filter(r => r.status === "open").length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({sanitaryReports.filter(r => r.status === "in_progress").length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({sanitaryReports.filter(r => r.status === "resolved").length})</TabsTrigger>
        </TabsList>

        {["open", "in_progress", "resolved"].map(status => (
          <TabsContent key={status} value={status} className="space-y-4 mt-4">
            {sanitaryReports.filter(r => r.status === status).length === 0 ? (
              <p className="text-slate-500 text-center py-12">No {status.replace("_", " ")} reports</p>
            ) : (
              sanitaryReports.filter(r => r.status === status).map(report => (
                <Card key={report.id} className="p-4">
                  <div className="flex gap-4">
                    {report.photo_url && (
                      <img src={report.photo_url} alt="Condition" className="w-32 h-32 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={
                            report.severity === "critical" ? "bg-rose-600 text-white" :
                            report.severity === "high" ? "bg-orange-100 text-orange-800" :
                            report.severity === "medium" ? "bg-yellow-100 text-yellow-800" :
                            "bg-slate-100 text-slate-800"
                          }>{report.severity}</Badge>
                          {report.production_line_name && <span className="text-sm text-slate-600">📦 {report.production_line_name}</span>}
                          {report.area_name && <span className="text-sm text-slate-600">• {report.area_name}</span>}
                        </div>
                        {status === "open" && (
                          <Button size="sm" variant="outline" onClick={async () => {
                            await SanitaryReportRepo.update(report.id, { status: "in_progress" });
                            queryClient.invalidateQueries({ queryKey: ["sanitary_reports"] });
                            toast.success("Status updated");
                          }}>Mark In Progress</Button>
                        )}
                        {status === "in_progress" && (
                          <Button size="sm" onClick={async () => {
                            await SanitaryReportRepo.update(report.id, {
                              status: "resolved", resolved_by: user?.display_name || user?.full_name || user?.email, resolved_at: new Date().toISOString()
                            });
                            queryClient.invalidateQueries({ queryKey: ["sanitary_reports"] });
                            toast.success("Report resolved");
                          }}>Mark Resolved</Button>
                        )}
                      </div>
                      <p className="text-slate-900 mb-2">{report.description}</p>
                      <div className="text-sm text-slate-500 space-y-1">
                        <p>Reported by {report.reporter_name} • {format(parseISO(report.created_date), "MMM d, yyyy 'at' h:mm a")}</p>
                        {report.resolved_at && (
                          <p className="text-emerald-600">Resolved {format(parseISO(report.resolved_at), "MMM d, yyyy 'at' h:mm a")}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}