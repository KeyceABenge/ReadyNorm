// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, ClipboardList, Droplet, Droplets, FlaskConical, 
  CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, User, FileText, ChevronRight, AlertTriangle
} from "lucide-react";
import { format, parseISO, subDays, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";

export default function AssetHistoryView({
  type = "tasks", // tasks, drains, diverters, chemicals, inspections
  items = [],
  records = [],
  onViewRecord
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [timeRange, setTimeRange] = useState("30"); // days

  const filteredItems = items.filter(item => {
    const name = item.title || item.drain_id || item.diverter_id || item.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getRecordsForItem = (item) => {
    const now = new Date();
    const rangeStart = subDays(now, parseInt(timeRange));
    
    return records.filter(r => {
      // Match by item ID based on type
      let matches = false;
      if (type === "tasks") {
        matches = r.title === item.title && r.area === item.area;
      } else if (type === "drains") {
        matches = r.drain_id === item.id;
      } else if (type === "diverters") {
        matches = r.diverter_id === item.id;
      } else if (type === "chemicals") {
        matches = r.chemical_id === item.id;
      }
      
      if (!matches) return false;

      // Check date range
      const recordDate = parseISO(r.completed_at || r.cleaned_at || r.inspection_date || r.counted_at || r.created_date);
      return isWithinInterval(recordDate, { start: rangeStart, end: now });
    });
  };

  const getItemStats = (item) => {
    const itemRecords = getRecordsForItem(item);
    // For drains, any record counts as completed (they create record when cleaned)
    // For diverters, check inspection status
    const completed = itemRecords.filter(r => {
      if (type === "drains") return true; // All drain cleaning records are completions
      return r.status === "completed" || r.status === "verified" || r.status === "passed_inspection" || r.status === "pass";
    }).length;
    const failed = itemRecords.filter(r => r.status === "failed_inspection" || r.status === "fail").length;
    const total = itemRecords.length;

    return { completed, failed, total, records: itemRecords };
  };

  const typeConfig = {
    tasks: { icon: ClipboardList, label: "Tasks", color: "bg-blue-100 text-blue-600" },
    drains: { icon: Droplet, label: "Drains", color: "bg-cyan-100 text-cyan-600" },
    diverters: { icon: Droplets, label: "Diverters", color: "bg-purple-100 text-purple-600" },
    chemicals: { icon: FlaskConical, label: "Chemicals", color: "bg-amber-100 text-amber-600" },
    inspections: { icon: FileText, label: "Inspections", color: "bg-emerald-100 text-emerald-600" }
  };

  const config = typeConfig[type] || typeConfig.tasks;
  const Icon = config.icon;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Left Panel - Item List */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={`Search ${config.label.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Last</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs border rounded-full px-3 py-1"
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredItems.map(item => {
            const stats = getItemStats(item);
            const isSelected = selectedItem?.id === item.id;
            const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all",
                  isSelected 
                    ? "border-slate-900 bg-slate-50 shadow-sm" 
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", config.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {item.title || item.drain_id || item.diverter_id || item.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {item.area || item.location_description || item.category || ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    completionRate >= 90 ? "bg-emerald-100 text-emerald-700" :
                    completionRate >= 70 ? "bg-amber-100 text-amber-700" :
                    stats.total === 0 ? "bg-slate-100 text-slate-500" :
                    "bg-red-100 text-red-700"
                  )}>
                    {stats.total > 0 ? `${completionRate}%` : "—"}
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 transition-colors",
                    isSelected ? "text-slate-900" : "text-slate-300"
                  )} />
                </div>
              </button>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No {config.label.toLowerCase()} found
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Item Detail & History */}
      <div className="md:col-span-2">
        {selectedItem ? (
          <ItemDetailPanel 
            item={selectedItem}
            type={type}
            records={getRecordsForItem(selectedItem)}
            timeRange={timeRange}
            onViewRecord={onViewRecord}
            itemType={type}
          />
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <Icon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Select an item to view history</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ItemDetailPanel({ item, type, records, timeRange, onViewRecord, itemType }) {
  // For drains, all records are completions (the record exists = cleaned)
  const completed = records.filter(r => {
    if (type === "drains") return true;
    return r.status === "completed" || r.status === "verified" || r.status === "passed_inspection" || r.status === "pass";
  });
  const failed = records.filter(r => r.status === "failed_inspection" || r.status === "fail");
  const missed = records.filter(r => r.status === "overdue" || r.status === "missed");

  // Calculate trend
  const halfPoint = Math.floor(records.length / 2);
  const recentRecords = records.slice(0, halfPoint);
  const olderRecords = records.slice(halfPoint);
  const recentRate = recentRecords.length > 0 
    ? recentRecords.filter(r => r.status === "completed" || r.status === "verified" || r.status === "passed_inspection").length / recentRecords.length
    : 0;
  const olderRate = olderRecords.length > 0
    ? olderRecords.filter(r => r.status === "completed" || r.status === "verified" || r.status === "passed_inspection").length / olderRecords.length
    : 0;
  const trend = recentRate - olderRate;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{item.title || item.drain_id || item.diverter_id || item.name}</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              {item.area || item.location_description || item.category}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {trend > 0.1 && (
              <Badge className="bg-emerald-100 text-emerald-700 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" />
                Improving
              </Badge>
            )}
            {trend < -0.1 && (
              <Badge className="bg-red-100 text-red-700 rounded-full">
                <TrendingDown className="w-3 h-3 mr-1" />
                Declining
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{records.length}</div>
            <div className="text-xs text-slate-500">Total Records</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{completed.length}</div>
            <div className="text-xs text-emerald-600">Completed</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{failed.length}</div>
            <div className="text-xs text-red-600">Failed</div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{missed.length}</div>
            <div className="text-xs text-amber-600">Missed</div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">History (Last {timeRange} days)</h4>
          {records.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No records in this period</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {records.sort((a, b) => 
                new Date(b.completed_at || b.cleaned_at || b.inspection_date || b.counted_at || b.created_date) -
                new Date(a.completed_at || a.cleaned_at || a.inspection_date || a.counted_at || a.created_date)
              ).map((record, idx) => {
                const recordDate = record.completed_at || record.cleaned_at || record.inspection_date || record.counted_at || record.created_date;
                // For drains, all records are success (cleaning completed)
                const isSuccess = itemType === "drains" ? true : (record.status === "completed" || record.status === "verified" || record.status === "passed_inspection" || record.status === "pass");
                const isFailed = record.status === "failed_inspection" || record.status === "fail";

                return (
                  <div 
                    key={record.id || idx}
                    className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:border-slate-300 cursor-pointer transition-colors"
                    onClick={() => onViewRecord?.(record)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      isSuccess ? "bg-emerald-100" :
                      isFailed ? "bg-red-100" :
                      "bg-amber-100"
                    )}>
                      {isSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                       isFailed ? <XCircle className="w-4 h-4 text-red-600" /> :
                       <Clock className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {itemType === "drains" ? "Cleaned" : isSuccess ? "Completed" : isFailed ? "Failed" : record.status}
                        </span>
                        <Badge variant="outline" className="text-xs rounded-full">
                          {format(parseISO(recordDate), "MMM d, h:mm a")}
                        </Badge>
                        {record.issues_found && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs rounded-full">Issues Found</Badge>
                        )}
                      </div>
                      {(record.assigned_to_name || record.employee_name || record.cleaned_by_name || record.inspector_name) && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" />
                          By: {record.assigned_to_name || record.employee_name || record.cleaned_by_name || record.inspector_name}
                        </p>
                      )}
                      {(record.completion_notes || record.condition_notes || record.notes || record.issue_description) && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {record.completion_notes || record.condition_notes || record.notes || record.issue_description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-center">
                      {record.signature_data ? (
                        <>
                          <img 
                            src={record.signature_data} 
                            alt="Signature" 
                            className="w-16 h-10 object-contain border rounded bg-white"
                          />
                          <p className="text-[9px] text-slate-400 mt-0.5">Signed</p>
                        </>
                      ) : (
                        <div className="w-16 h-10 border border-dashed rounded bg-slate-50 flex items-center justify-center">
                          <span className="text-[9px] text-slate-400">No Sig</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}