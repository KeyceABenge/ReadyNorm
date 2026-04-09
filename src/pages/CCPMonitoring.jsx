// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CCPMonitoringPointRepo, CCPRecordRepo, ProductionLineRepo } from "@/lib/adapters/database";
import useOrganization from "@/components/auth/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Thermometer, AlertTriangle, CheckCircle2, Loader2, Clock, XCircle, Activity } from "lucide-react";
import { format, parseISO, isToday, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORY_ICONS = { temperature: Thermometer, time: Clock, metal_detection: Activity, visual: CheckCircle2 };
const CATEGORY_LABELS = { temperature: "Temperature", time: "Time", pressure: "Pressure", ph: "pH", water_activity: "Water Activity", metal_detection: "Metal Detection", xray: "X-Ray", visual: "Visual", other: "Other" };

export default function CCPMonitoring() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pointModalOpen, setPointModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [pointForm, setPointForm] = useState({});
  const [recordForm, setRecordForm] = useState({});

  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: points = [], isLoading: pointsLoading } = useQuery({
    queryKey: ["ccp_points", orgId],
    queryFn: () => CCPMonitoringPointRepo.filter({ organization_id: orgId }),
    enabled: !!orgId, staleTime: 60000
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["ccp_records", orgId],
    queryFn: () => CCPRecordRepo.filter({ organization_id: orgId }, "-record_date", 500),
    enabled: !!orgId, staleTime: 30000
  });

  const { data: productionLines = [] } = useQuery({
    queryKey: ["production_lines", orgId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: orgId }),
    enabled: !!orgId, staleTime: 300000
  });

  const pointMutation = useMutation({
    mutationFn: data => editingPoint?.id ? CCPMonitoringPointRepo.update(editingPoint.id, data) : CCPMonitoringPointRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ccp_points"] }); setPointModalOpen(false); toast.success("Monitoring point saved"); }
  });

  const recordMutation = useMutation({
    mutationFn: data => CCPRecordRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ccp_records"] }); setRecordModalOpen(false); toast.success("Record saved"); }
  });

  const todayRecords = records.filter(r => r.record_date && isToday(parseISO(r.record_date)));
  const deviations = records.filter(r => r.is_deviation);
  const todayDeviations = todayRecords.filter(r => r.is_deviation);
  const last7DaysDeviations = records.filter(r => r.is_deviation && r.record_date && parseISO(r.record_date) >= subDays(new Date(), 7));

  const openPointModal = (point = null) => {
    setEditingPoint(point);
    setPointForm(point || { type: "ccp", category: "temperature", monitoring_frequency: "every_hour", status: "active" });
    setPointModalOpen(true);
  };

  const openRecordModal = (point) => {
    setSelectedPoint(point);
    setRecordForm({ monitoring_point_id: point.id, monitoring_point_name: point.name, record_date: format(new Date(), "yyyy-MM-dd"), record_time: format(new Date(), "HH:mm"), unit: point.unit || "°F", value: "" });
    setRecordModalOpen(true);
  };

  const handleRecordSave = () => {
    const val = parseFloat(recordForm.value);
    if (isNaN(val)) { toast.error("Enter a valid value"); return; }
    const pt = selectedPoint;
    const withinLimits = (!pt.critical_limit_min || val >= pt.critical_limit_min) && (!pt.critical_limit_max || val <= pt.critical_limit_max);
    const isDev = !withinLimits;
    recordMutation.mutate({ ...recordForm, value: val, is_within_limits: withinLimits, is_deviation: isDev, deviation_type: isDev ? "major" : "none" });
  };

  if (orgLoading || pointsLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-orange-500" /> CCP & Process Monitoring
          </h1>
          <p className="text-slate-500 text-sm mt-1">Critical control points, temperatures, and process parameters</p>
        </div>
        <Button onClick={() => openPointModal()}><Plus className="w-4 h-4 mr-2" /> Add Monitoring Point</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Activity className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{points.length}</p><p className="text-xs text-slate-500">Monitoring Points</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{todayRecords.length}</p><p className="text-xs text-slate-500">Today's Records</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", todayDeviations.length > 0 ? "bg-rose-100" : "bg-slate-100")}><AlertTriangle className={cn("w-5 h-5", todayDeviations.length > 0 ? "text-rose-600" : "text-slate-400")} /></div>
          <div><p className="text-2xl font-bold">{todayDeviations.length}</p><p className="text-xs text-slate-500">Today's Deviations</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg"><XCircle className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{last7DaysDeviations.length}</p><p className="text-xs text-slate-500">7-Day Deviations</p></div>
        </CardContent></Card>
      </div>

      {/* Monitoring Points Grid */}
      <h2 className="text-lg font-semibold">Monitoring Points</h2>
      {points.length === 0 ? (
        <Card className="p-12 text-center">
          <Thermometer className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No monitoring points configured</h3>
          <p className="text-slate-500 text-sm mb-4">Add CCPs, OPRPs, and process parameters to monitor</p>
          <Button onClick={() => openPointModal()}><Plus className="w-4 h-4 mr-2" /> Add First Point</Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {points.map(pt => {
            const ptRecords = todayRecords.filter(r => r.monitoring_point_id === pt.id);
            const lastRecord = ptRecords[ptRecords.length - 1];
            const hasDev = ptRecords.some(r => r.is_deviation);
            return (
              <Card key={pt.id} className={cn("p-4 cursor-pointer hover:shadow-md transition-shadow", hasDev && "border-rose-200 bg-rose-50/30")} onClick={() => openRecordModal(pt)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge className={cn("text-xs mb-1", pt.type === "ccp" ? "bg-rose-100 text-rose-700" : pt.type === "oprp" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                      {pt.type?.toUpperCase()}
                    </Badge>
                    <h3 className="font-semibold text-slate-900">{pt.name}</h3>
                  </div>
                  <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[pt.category] || pt.category}</Badge>
                </div>
                {pt.critical_limit_min != null || pt.critical_limit_max != null ? (
                  <p className="text-xs text-slate-500 mb-2">Limits: {pt.critical_limit_min ?? "—"} – {pt.critical_limit_max ?? "—"} {pt.unit}</p>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{pt.monitoring_frequency?.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{ptRecords.length} readings today</span>
                    {lastRecord && (
                      <Badge className={lastRecord.is_deviation ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
                        {lastRecord.value}{pt.unit}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Point Modal */}
      <Dialog open={pointModalOpen} onOpenChange={setPointModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPoint ? "Edit" : "Add"} Monitoring Point</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={pointForm.name || ""} onChange={e => setPointForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={pointForm.type || "ccp"} onValueChange={v => setPointForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ccp">CCP</SelectItem><SelectItem value="oprp">OPRP</SelectItem><SelectItem value="prp">PRP</SelectItem><SelectItem value="process_parameter">Process Parameter</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Category</Label>
                <Select value={pointForm.category || "temperature"} onValueChange={v => setPointForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Min Limit</Label><Input type="number" value={pointForm.critical_limit_min ?? ""} onChange={e => setPointForm(p => ({ ...p, critical_limit_min: parseFloat(e.target.value) || null }))} /></div>
              <div><Label>Target</Label><Input type="number" value={pointForm.target_value ?? ""} onChange={e => setPointForm(p => ({ ...p, target_value: parseFloat(e.target.value) || null }))} /></div>
              <div><Label>Max Limit</Label><Input type="number" value={pointForm.critical_limit_max ?? ""} onChange={e => setPointForm(p => ({ ...p, critical_limit_max: parseFloat(e.target.value) || null }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Unit</Label>
                <Select value={pointForm.unit || "°F"} onValueChange={v => setPointForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="°F">°F</SelectItem><SelectItem value="°C">°C</SelectItem><SelectItem value="minutes">Minutes</SelectItem><SelectItem value="seconds">Seconds</SelectItem><SelectItem value="psi">PSI</SelectItem><SelectItem value="pH">pH</SelectItem><SelectItem value="ppm">PPM</SelectItem><SelectItem value="mm">mm</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Frequency</Label>
                <Select value={pointForm.monitoring_frequency || "every_hour"} onValueChange={v => setPointForm(p => ({ ...p, monitoring_frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="continuous">Continuous</SelectItem><SelectItem value="every_batch">Every Batch</SelectItem><SelectItem value="every_hour">Hourly</SelectItem><SelectItem value="every_2_hours">Every 2 Hours</SelectItem><SelectItem value="per_shift">Per Shift</SelectItem><SelectItem value="daily">Daily</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Process Step</Label><Input value={pointForm.process_step || ""} onChange={e => setPointForm(p => ({ ...p, process_step: e.target.value }))} /></div>
            <div><Label>Hazard</Label><Textarea value={pointForm.hazard_description || ""} onChange={e => setPointForm(p => ({ ...p, hazard_description: e.target.value }))} rows={2} /></div>
            <div><Label>Corrective Action Procedure</Label><Textarea value={pointForm.corrective_action_procedure || ""} onChange={e => setPointForm(p => ({ ...p, corrective_action_procedure: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPointModalOpen(false)}>Cancel</Button>
              <Button onClick={() => pointMutation.mutate(pointForm)} disabled={pointMutation.isPending}>{pointMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Reading Modal */}
      <Dialog open={recordModalOpen} onOpenChange={setRecordModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Reading — {selectedPoint?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {selectedPoint && (selectedPoint.critical_limit_min != null || selectedPoint.critical_limit_max != null) && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                Critical Limits: {selectedPoint.critical_limit_min ?? "—"} – {selectedPoint.critical_limit_max ?? "—"} {selectedPoint.unit}
                {selectedPoint.target_value != null && <span className="ml-2">(Target: {selectedPoint.target_value})</span>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={recordForm.record_date || ""} onChange={e => setRecordForm(p => ({ ...p, record_date: e.target.value }))} /></div>
              <div><Label>Time</Label><Input type="time" value={recordForm.record_time || ""} onChange={e => setRecordForm(p => ({ ...p, record_time: e.target.value }))} /></div>
            </div>
            <div><Label>Value *</Label><Input type="number" step="0.1" value={recordForm.value} onChange={e => setRecordForm(p => ({ ...p, value: e.target.value }))} placeholder={`Enter ${selectedPoint?.unit || "value"}`} /></div>
            <div><Label>Lot Number</Label><Input value={recordForm.lot_number || ""} onChange={e => setRecordForm(p => ({ ...p, lot_number: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={recordForm.notes || ""} onChange={e => setRecordForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRecordModalOpen(false)}>Cancel</Button>
              <Button onClick={handleRecordSave} disabled={recordMutation.isPending}>{recordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}