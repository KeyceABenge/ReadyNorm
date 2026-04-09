import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Droplets, Download, CloudRain, Package, CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";

export default function AuditAssetRecords({
  drainLocations,
  drainCleaningRecords,
  rainDiverters,
  diverterInspections,
  chemicalInventoryRecords,
  chemicalCountEntries,
  dateRange
}) {
  const [activeAssetTab, setActiveAssetTab] = useState("drains");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Drain records in date range
  const drainRecordsInRange = useMemo(() => {
    return drainCleaningRecords.filter(r => {
      if (!r.cleaned_at) return false;
      const cleanedDate = parseISO(r.cleaned_at);
      return isWithinInterval(cleanedDate, { start: dateRange.start, end: dateRange.end });
    }).sort((a, b) => new Date(b.cleaned_at).getTime() - new Date(a.cleaned_at).getTime());
  }, [drainCleaningRecords, dateRange]);

  // Diverter inspections in range
  const diverterInspectionsInRange = useMemo(() => {
    return diverterInspections.filter(i => {
      if (!i.inspection_date) return false;
      const inspDate = parseISO(i.inspection_date);
      return isWithinInterval(inspDate, { start: dateRange.start, end: dateRange.end });
    }).sort((a, b) => new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime());
  }, [diverterInspections, dateRange]);

  // Inventory records in range
  const inventoryInRange = useMemo(() => {
    return chemicalInventoryRecords.filter(r => {
      if (!r.completed_at) return false;
      const completedDate = parseISO(r.completed_at);
      return isWithinInterval(completedDate, { start: dateRange.start, end: dateRange.end });
    }).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  }, [chemicalInventoryRecords, dateRange]);

  const activeDrains = drainLocations.filter(d => d.status === "active" && !d.is_sealed);
  const activeDiverters = rainDiverters.filter(d => d.status === "active");

  const exportAssetRecords = () => {
    let csvContent = `Asset Records Report\nGenerated: ${format(new Date(), "yyyy-MM-dd HH:mm")}\nPeriod: ${format(dateRange.start, "yyyy-MM-dd")} to ${format(dateRange.end, "yyyy-MM-dd")}\n\n`;
    
    csvContent += `DRAIN CLEANING RECORDS (${drainRecordsInRange.length} records)\nDrain Code,Location,Cleaned By,Cleaned At,Issues Found\n`;
    drainRecordsInRange.forEach(r => {
      csvContent += `"${r.drain_code}","${r.drain_location || ''}","${r.cleaned_by_name || ''}","${r.cleaned_at}","${r.issues_found ? 'Yes' : 'No'}"\n`;
    });
    
    csvContent += `\nDIVERTER INSPECTIONS (${diverterInspectionsInRange.length} records)\nDiverter Code,Finding,Inspector,Inspected At,Bucket Emptied\n`;
    diverterInspectionsInRange.forEach(i => {
      csvContent += `"${i.diverter_code}","${i.finding}","${i.inspector_name || ''}","${i.inspection_date}","${i.bucket_emptied ? 'Yes' : 'No'}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asset_records_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Droplets className="w-6 h-6 text-cyan-600" />
            Asset Records
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Drains, rain diverters, and chemical inventory records
          </p>
        </div>
        <Button variant="outline" onClick={exportAssetRecords}>
          <Download className="w-4 h-4 mr-2" />
          Export All Records
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-cyan-200 bg-cyan-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Droplets className="w-5 h-5 text-cyan-600" />
              <div>
                <p className="text-2xl font-bold text-cyan-700">{activeDrains.length}</p>
                <p className="text-xs text-cyan-600">Active Drains</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CloudRain className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{activeDiverters.length}</p>
                <p className="text-xs text-blue-600">Active Diverters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-700">{drainRecordsInRange.length}</p>
                <p className="text-xs text-emerald-600">Drain Cleanings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-700">{inventoryInRange.length}</p>
                <p className="text-xs text-purple-600">Inventory Counts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Tabs */}
      <Tabs value={activeAssetTab} onValueChange={setActiveAssetTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="drains">
            <Droplets className="w-4 h-4 mr-2" />
            Drains ({drainRecordsInRange.length})
          </TabsTrigger>
          <TabsTrigger value="diverters">
            <CloudRain className="w-4 h-4 mr-2" />
            Diverters ({diverterInspectionsInRange.length})
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="w-4 h-4 mr-2" />
            Inventory ({inventoryInRange.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drains" className="mt-4">
          {drainRecordsInRange.length > 0 ? (
            isMobile ? (
              // Mobile card-based list
              <div className="space-y-2">
                {drainRecordsInRange.slice(0, 50).map(record => (
                  <Card key={record.id} className="active:bg-slate-50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">{record.drain_code}</Badge>
                        <span className="text-xs text-slate-500">
                          {format(parseISO(record.cleaned_at), "MMM d")}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 mb-1 truncate">
                        {record.drain_location}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {record.cleaned_by_name || "Unknown"}
                        </span>
                        {record.issues_found && (
                          <Badge variant="default" className="bg-amber-100 text-amber-700 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Issues
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Desktop table view
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Drain Cleaning Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {drainRecordsInRange.slice(0, 50).map(record => (
                      <div key={record.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="">{record.drain_code}</Badge>
                            <span className="text-sm font-medium text-slate-900">
                              {record.drain_location}
                            </span>
                            {record.issues_found && (
                              <Badge variant="default" className="bg-amber-100 text-amber-700">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Issues
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Cleaned by {record.cleaned_by_name || "Unknown"}
                          </p>
                        </div>
                        <div className="text-right text-sm text-slate-500">
                          <p>{format(parseISO(record.cleaned_at), "MMM d, yyyy")}</p>
                          <p className="text-xs">{format(parseISO(record.cleaned_at), "h:mm a")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-slate-500">No drain cleaning records in selected period</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="diverters" className="mt-4">
          {diverterInspectionsInRange.length > 0 ? (
            isMobile ? (
              // Mobile card-based list
              <div className="space-y-2">
                {diverterInspectionsInRange.slice(0, 50).map(inspection => (
                  <Card key={inspection.id} className="active:bg-slate-50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">{inspection.diverter_code}</Badge>
                        <span className="text-xs text-slate-500">
                          {format(parseISO(inspection.inspection_date), "MMM d")}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge className={cn(
                          "text-xs",
                          inspection.finding === "dry" 
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        )}>
                          {inspection.finding}
                        </Badge>
                        {inspection.bucket_emptied && (
                          <Badge variant="outline" className="text-xs">Bucket Emptied</Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {inspection.inspector_name || "Unknown"}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Desktop table view
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Diverter Inspection Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {diverterInspectionsInRange.slice(0, 50).map(inspection => (
                      <div key={inspection.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="">{inspection.diverter_code}</Badge>
                            <Badge variant="default" className={cn(
                              "text-xs",
                              inspection.finding === "dry" 
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            )}>
                              {inspection.finding}
                            </Badge>
                            {inspection.bucket_emptied && (
                              <Badge variant="outline" className="text-xs">Bucket Emptied</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Inspected by {inspection.inspector_name || "Unknown"}
                          </p>
                        </div>
                        <div className="text-right text-sm text-slate-500">
                          <p>{format(parseISO(inspection.inspection_date), "MMM d, yyyy")}</p>
                          <p className="text-xs">{format(parseISO(inspection.inspection_date), "h:mm a")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-slate-500">No diverter inspections in selected period</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chemical Inventory Records</CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryInRange.length > 0 ? (
                <div className="divide-y">
                  {inventoryInRange.map(record => (
                    <div key={record.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className={cn(
                            record.status === "completed" || record.status === "reviewed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          )}>
                            {record.status}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            Week of {record.week_start_date}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Completed by {record.completed_by_name || "Unknown"}
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        {record.completed_at && (
                          <>
                            <p>{format(parseISO(record.completed_at), "MMM d, yyyy")}</p>
                            <p className="text-xs">{format(parseISO(record.completed_at), "h:mm a")}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No inventory records in selected period</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}