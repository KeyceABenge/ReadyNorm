// @ts-nocheck
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import AuditTrailTab from "@/components/audit/AuditTrailTab";
import RecordsSummaryCard from "@/components/records/RecordsSummaryCard";
import MissedItemsList from "@/components/records/MissedItemsList";
import LineInspectionGroupView from "@/components/records/LineInspectionGroupView";
import AssetHistoryView from "@/components/records/AssetHistoryView";
import FrequencyRecordsTab from "@/components/records/FrequencyRecordsTab";
import { exportRecordsToPDF } from "@/components/records/RecordsPDFExporter";

export default function RecordsTab({
  orgId, tasks, lineAssignments, areaSignOffs, inspectionRecords, preOpInspections,
  productionLines, areas, assets, drainLocations, drainCleaningRecords,
  rainDiverters, diverterInspections, siteSettings, onEditTask, onAddComment
}) {
  const [recordsTab, setRecordsTab] = useState("overview");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [signOffLineFilter, setSignOffLineFilter] = useState("all");

  const filterByDate = (record, dateField) => {
    if (!dateRange.start && !dateRange.end) return true;
    if (!record[dateField]) return false;
    try {
      const recordDate = parseISO(record[dateField]);
      if (isNaN(recordDate.getTime())) return false;
      if (dateRange.start && dateRange.end) {
        return isWithinInterval(recordDate, { start: startOfDay(parseISO(dateRange.start)), end: endOfDay(parseISO(dateRange.end)) });
      } else if (dateRange.start) {
        return recordDate >= startOfDay(parseISO(dateRange.start));
      } else if (dateRange.end) {
        return recordDate <= endOfDay(parseISO(dateRange.end));
      }
      return true;
    } catch { return false; }
  };

  const frequencies = [...new Set(tasks.filter(t => t.frequency).map(t => t.frequency.toLowerCase().trim()))].sort((a, b) => {
    const order = ['daily', 'weekly', 'bi-weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'annually'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">System of Record</h2>
          <p className="text-sm text-slate-500">Expected vs Actual completion tracking</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="w-40 rounded-full" />
          <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="w-40 rounded-full" />
          {(dateRange.start || dateRange.end || signOffLineFilter !== "all") && (
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setDateRange({ start: "", end: "" }); setSignOffLineFilter("all"); }}>Clear</Button>
          )}
          <Button onClick={() => exportRecordsToPDF({
            recordsTab, tasks, inspectionRecords, areaSignOffs, lineAssignments,
            productionLines, areas, assets, preOpInspections, dateRange, signOffLineFilter, filterByDate
          })} className="bg-slate-900 hover:bg-slate-800 rounded-full">
            <Download className="w-4 h-4 mr-2" />Export PDF
          </Button>
        </div>
      </div>

      <Tabs value={recordsTab} onValueChange={setRecordsTab}>
        <TabsList className="bg-white border shadow-sm p-1 h-auto flex-wrap rounded-full">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white px-3 py-2 text-sm rounded-full">Overview</TabsTrigger>
          <TabsTrigger value="audit-trail" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white px-3 py-2 text-sm rounded-full">Audit Trail</TabsTrigger>
          <TabsTrigger value="inspections-grouped" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white px-3 py-2 text-sm rounded-full">Line Cleaning & Inspections</TabsTrigger>
          <TabsTrigger value="asset-history" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white px-3 py-2 text-sm rounded-full">Asset History</TabsTrigger>
          {frequencies.map(freq => (
            <TabsTrigger key={freq} value={`freq-${freq}`} className="data-[state=active]:bg-slate-900 data-[state=active]:text-white px-3 py-2 text-sm capitalize rounded-full">{freq}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="audit-trail" className="mt-4">
          <AuditTrailTab organizationId={orgId} />
        </TabsContent>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {frequencies.slice(0, 4).map(freq => {
              const freqTasks = tasks.filter(t => t.frequency?.toLowerCase().trim() === freq);
              const completed = freqTasks.filter(t => (t.status === "completed" || t.status === "verified") && filterByDate(t, 'completed_at')).length;
              const missed = freqTasks.filter(t => {
                if (t.status === "completed" || t.status === "verified") return false;
                if (!t.due_date) return false;
                return parseISO(t.due_date) < new Date() && filterByDate(t, 'due_date');
              }).length;
              return (
                <RecordsSummaryCard key={freq} title={`${freq.charAt(0).toUpperCase() + freq.slice(1)} Tasks`} expected={(completed + missed) || freqTasks.length} completed={completed} completedLate={0} missed={missed} onDrillDown={() => setRecordsTab(`freq-${freq}`)} />
              );
            })}
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Line Cleaning Coverage</h3>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setRecordsTab("inspections-grouped")}>View Details</Button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">{lineAssignments.filter(a => a.status === "completed" && filterByDate(a, 'scheduled_date')).length}</div>
                  <div className="text-xs text-slate-500">Completed</div>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{areaSignOffs.filter(s => s.status === "passed_inspection" && filterByDate(s, 'signed_off_at')).length}</div>
                  <div className="text-xs text-emerald-600">Passed</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{areaSignOffs.filter(s => s.status === "failed_inspection" && filterByDate(s, 'signed_off_at')).length}</div>
                  <div className="text-xs text-red-600">Failed</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{preOpInspections.filter(p => p.status === "passed" && filterByDate(p, 'inspection_date')).length}/{preOpInspections.filter(p => filterByDate(p, 'inspection_date')).length}</div>
                  <div className="text-xs text-blue-600">Pre-Ops</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {(() => {
            const allMissed = tasks.filter(t => {
              if (t.status === "completed" || t.status === "verified") return false;
              if (!t.due_date) return false;
              const dueDate = parseISO(t.due_date);
              if (dueDate >= new Date()) return false;
              return dateRange.start || dateRange.end ? filterByDate(t, 'due_date') : true;
            }).map(t => ({ ...t, missedReason: t.status === "overdue" ? "overdue" : !t.assigned_to ? "not_selected" : "overdue" }));
            if (allMissed.length === 0) return null;
            return <MissedItemsList items={allMissed.slice(0, 10)} type="task" onViewItem={onEditTask} title={`Missed Tasks (${allMissed.length} total)`} />;
          })()}
        </TabsContent>

        <TabsContent value="inspections-grouped" className="mt-4">
          <LineInspectionGroupView
            assignments={lineAssignments.filter(a => (dateRange.start || dateRange.end) ? filterByDate(a, 'scheduled_date') : true)}
            signOffs={areaSignOffs} inspections={inspectionRecords} preOpInspections={preOpInspections}
            productionLines={productionLines} areas={areas} assets={assets}
            onViewAssignment={(assignment) => console.log("View assignment:", assignment)}
          />
        </TabsContent>

        <TabsContent value="asset-history" className="mt-4">
          <Tabs defaultValue="tasks">
            <TabsList className="mb-4 rounded-full">
              <TabsTrigger value="tasks" className="rounded-full">Tasks</TabsTrigger>
              <TabsTrigger value="drains" className="rounded-full">Drains</TabsTrigger>
              <TabsTrigger value="diverters" className="rounded-full">Diverters</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks">
              <AssetHistoryView type="tasks" items={[...new Map(tasks.map(t => [`${t.title}|${t.area}`, t])).values()]} records={tasks.filter(t => t.status === "completed" || t.status === "verified")} onViewRecord={onEditTask} />
            </TabsContent>
            <TabsContent value="drains">
              <AssetHistoryView type="drains" items={drainLocations} records={drainCleaningRecords} onViewRecord={(r) => console.log("View drain:", r)} />
            </TabsContent>
            <TabsContent value="diverters">
              <AssetHistoryView type="diverters" items={rainDiverters} records={diverterInspections} onViewRecord={(r) => console.log("View diverter:", r)} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {frequencies.map(freq => (
          <TabsContent key={freq} value={`freq-${freq}`} className="mt-4">
            <FrequencyRecordsTab frequency={freq} tasks={tasks} siteSettings={siteSettings || {}} dateRange={dateRange} onViewTask={onEditTask} onAddComment={onAddComment} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}