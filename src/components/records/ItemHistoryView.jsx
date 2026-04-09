import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { CheckCircle2, XCircle, Clock, AlertTriangle, User, Calendar, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ItemHistoryView({ open, onClose, item, records, type = "task" }) {
  const [activeTab, setActiveTab] = useState("history");

  if (!item) return null;

  // Sort records by date descending
  const sortedRecords = [...records].sort((a, b) => {
    const dateA = a.completed_at || a.signed_off_at || a.cleaned_at || a.inspection_date || a.created_date;
    const dateB = b.completed_at || b.signed_off_at || b.cleaned_at || b.inspection_date || b.created_date;
    return new Date(dateB) - new Date(dateA);
  });

  // Calculate trends
  const totalRecords = sortedRecords.length;
  const completedRecords = sortedRecords.filter(r => 
    r.status === "completed" || r.status === "verified" || r.status === "passed_inspection"
  ).length;
  const missedCount = sortedRecords.filter(r => 
    r.status === "missed" || r.status === "overdue" || r.status === "failed_inspection"
  ).length;

  const completionRate = totalRecords > 0 ? Math.round((completedRecords / totalRecords) * 100) : 0;

  // Check for repeat misses (3+ misses in last 10 records)
  const recentMisses = sortedRecords.slice(0, 10).filter(r => 
    r.status === "missed" || r.status === "overdue" || r.status === "failed_inspection"
  ).length;
  const hasRepeatIssue = recentMisses >= 3;

  const getStatusBadge = (record) => {
    const status = record.status;
    if (status === "completed" || status === "verified" || status === "passed_inspection") {
      return <Badge className="bg-emerald-100 text-emerald-700 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
    }
    if (status === "failed_inspection") {
      return <Badge className="bg-rose-100 text-rose-700 rounded-full"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    }
    if (status === "missed" || status === "overdue") {
      return <Badge className="bg-amber-100 text-amber-700 rounded-full"><AlertTriangle className="w-3 h-3 mr-1" />Missed</Badge>;
    }
    if (status === "pending") {
      return <Badge className="bg-slate-100 text-slate-700 rounded-full"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
    return <Badge variant="outline" className="rounded-full">{status}</Badge>;
  };

  const getRecordDate = (record) => {
    const dateStr = record.completed_at || record.signed_off_at || record.cleaned_at || record.inspection_date || record.created_date;
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "MMM d, yyyy h:mm a");
    } catch {
      return "—";
    }
  };

  const getRecordPerson = (record) => {
    return record.assigned_to_name || record.employee_name || record.inspector_name || record.cleaned_by_name || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" />
            {type === "task" ? item.title : item.name}
          </DialogTitle>
          {item.area && <p className="text-sm text-slate-500">{item.area}</p>}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 rounded-full">
            <TabsTrigger value="history" className="rounded-full">History ({totalRecords})</TabsTrigger>
            <TabsTrigger value="trends" className="rounded-full">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="flex-1 overflow-y-auto mt-4 space-y-2">
            {sortedRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No history available</p>
              </div>
            ) : (
              sortedRecords.map((record, idx) => (
                <Card key={record.id || idx} className="bg-white/80">
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(record)}
                          {record.shift_name && (
                            <Badge variant="outline" className="text-xs rounded-full">{record.shift_name}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600 mt-2">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {getRecordPerson(record)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {getRecordDate(record)}
                          </span>
                        </div>
                        {(record.completion_notes || record.notes || record.inspection_notes) && (
                          <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded">
                            {record.completion_notes || record.notes || record.inspection_notes}
                          </p>
                        )}
                        {record.evidence_url && (
                          <a href={record.evidence_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                            View Evidence
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="trends" className="flex-1 overflow-y-auto mt-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="py-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{completionRate}%</p>
                  <p className="text-sm text-emerald-700">Completion Rate</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-50">
                <CardContent className="py-4 text-center">
                  <p className="text-3xl font-bold text-slate-700">{totalRecords}</p>
                  <p className="text-sm text-slate-600">Total Records</p>
                </CardContent>
              </Card>
            </div>

            {hasRepeatIssue && (
              <Card className="bg-amber-50 border-amber-200 mb-4">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">Repeat Issue Detected</p>
                      <p className="text-sm text-amber-700">{recentMisses} misses in the last 10 records</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Completed</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-600">{completedRecords}</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Missed/Failed</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-600">{missedCount}</span>
                  {missedCount > 0 ? <TrendingDown className="w-4 h-4 text-rose-500" /> : <Minus className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}