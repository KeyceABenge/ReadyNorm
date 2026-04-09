// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalibrationEquipmentRepo, CalibrationRecordRepo } from "@/lib/adapters/database";
import useOrganization from "@/components/auth/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wrench, AlertTriangle, CheckCircle2, Loader2, Search, Clock, Pencil } from "lucide-react";
import { format, parseISO, isPast, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_LABELS = { thermometer: "Thermometer", scale: "Scale", ph_meter: "pH Meter", atp_meter: "ATP Meter", metal_detector: "Metal Detector", xray: "X-Ray", pressure_gauge: "Pressure Gauge", timer: "Timer", hygrometer: "Hygrometer", flow_meter: "Flow Meter", other: "Other" };
const FREQ_LABELS = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", semi_annual: "Semi-Annual", annual: "Annual" };

export default function CalibrationTracking() {
  const [equipModalOpen, setEquipModalOpen] = useState(false);
  const [calibModalOpen, setCalibModalOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState(null);
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [equipForm, setEquipForm] = useState({});
  const [calibForm, setCalibForm] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["calibration_equipment", orgId],
    queryFn: () => CalibrationEquipmentRepo.filter({ organization_id: orgId }),
    enabled: !!orgId, staleTime: 60000
  });

  const { data: calibRecords = [] } = useQuery({
    queryKey: ["calibration_records", orgId],
    queryFn: () => CalibrationRecordRepo.filter({ organization_id: orgId }, "-calibration_date", 500),
    enabled: !!orgId, staleTime: 60000
  });

  const equipMutation = useMutation({
    // @ts-ignore - mutationFn data parameter typing
    mutationFn: data => editingEquip?.id ? CalibrationEquipmentRepo.update(editingEquip.id, data) : CalibrationEquipmentRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["calibration_equipment"] }); setEquipModalOpen(false); toast.success("Equipment saved"); }
  });

  const calibMutation = useMutation({
    // @ts-ignore - mutationFn data parameter typing
    mutationFn: async (data) => {
      await CalibrationRecordRepo.create({ ...data, organization_id: orgId });
      // Update equipment with last calibration info
      const freqDays = { daily: 1, weekly: 7, monthly: 30, quarterly: 90, semi_annual: 180, annual: 365 };
      const equip = equipment.find(e => e.id === data.equipment_id);
      const nextDue = format(addDays(new Date(), freqDays[equip?.calibration_frequency] || 30), "yyyy-MM-dd");
      await CalibrationEquipmentRepo.update(data.equipment_id, {
        last_calibrated_at: data.calibration_date,
        last_calibrated_by: data.calibrated_by_name,
        last_calibration_result: data.result,
        next_calibration_due: nextDue,
        is_overdue: false
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["calibration_equipment"] }); queryClient.invalidateQueries({ queryKey: ["calibration_records"] }); setCalibModalOpen(false); toast.success("Calibration recorded"); }
  });

  const overdue = equipment.filter(e => e.status === "active" && e.next_calibration_due && isPast(parseISO(e.next_calibration_due)));
  const dueSoon = equipment.filter(e => e.status === "active" && e.next_calibration_due && !isPast(parseISO(e.next_calibration_due)) && parseISO(e.next_calibration_due) <= addDays(new Date(), 7));
  const filtered = equipment.filter(e => !searchQuery || e.name?.toLowerCase().includes(searchQuery.toLowerCase()) || e.equipment_id?.toLowerCase().includes(searchQuery.toLowerCase()));

  const openEquipModal = (equip = null) => { setEditingEquip(equip); setEquipForm(equip || { type: "thermometer", calibration_frequency: "monthly", status: "active" }); setEquipModalOpen(true); };
  const openCalibModal = (equip) => { setSelectedEquip(equip); setCalibForm({ equipment_id: equip.id, equipment_name: equip.name, equipment_tag: equip.equipment_id, calibration_date: new Date().toISOString(), result: "pass" }); setCalibModalOpen(true); };

  if (orgLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><Wrench className="w-6 h-6 text-indigo-500" /> Calibration Tracking</h1>
          <p className="text-slate-500 text-sm mt-1">Equipment calibration schedules, records, and verification</p>
        </div>
        <Button onClick={() => openEquipModal()}><Plus className="w-4 h-4 mr-2" /> Add Equipment</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Wrench className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{equipment.filter(e => e.status === "active").length}</p><p className="text-xs text-slate-500">Active Equipment</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{equipment.filter(e => e.last_calibration_result === "pass").length}</p><p className="text-xs text-slate-500">Last Pass</p></div></CardContent></Card>
        <Card className={overdue.length > 0 ? "border-rose-200 bg-rose-50/50" : ""}><CardContent className="p-4 flex items-center gap-3"><div className={cn("p-2 rounded-lg", overdue.length > 0 ? "bg-rose-100" : "bg-slate-100")}><AlertTriangle className={cn("w-5 h-5", overdue.length > 0 ? "text-rose-600" : "text-slate-400")} /></div><div><p className="text-2xl font-bold">{overdue.length}</p><p className="text-xs text-slate-500">Overdue</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-amber-100 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{dueSoon.length}</p><p className="text-xs text-slate-500">Due This Week</p></div></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        {/* @ts-ignore - Input component properly accepts props */}
        <Input placeholder="Search equipment..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="font-semibold mb-2">No equipment registered</h3><Button onClick={() => openEquipModal()}><Plus className="w-4 h-4 mr-2" /> Add Equipment</Button></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(eq => {
            const isOverdue = eq.next_calibration_due && isPast(parseISO(eq.next_calibration_due));
            return (
              <Card key={eq.id} className={cn("p-4", isOverdue && "border-rose-200 bg-rose-50/30")}>
                <div className="flex items-start justify-between mb-2">
                  <div><Badge variant="outline" className="text-xs mb-1">{eq.equipment_id}</Badge><h3 className="font-semibold">{eq.name}</h3><p className="text-xs text-slate-500">{TYPE_LABELS[eq.type]}</p></div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEquipModal(eq)}><Pencil className="w-3 h-3" /></Button>
                  </div>
                </div>
                {eq.location && <p className="text-xs text-slate-400 mb-2">{eq.location}</p>}
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-slate-500">
                    {eq.next_calibration_due ? (<span className={isOverdue ? "text-rose-600 font-medium" : ""}>{isOverdue ? "OVERDUE: " : "Due: "}{format(parseISO(eq.next_calibration_due), "MMM d, yyyy")}</span>) : "No due date"}
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openCalibModal(eq)}>Calibrate</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Equipment Modal */}
      <Dialog open={equipModalOpen} onOpenChange={setEquipModalOpen}>
        {/* @ts-ignore - DialogContent accepts children prop */}
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {/* @ts-ignore - DialogHeader accepts children prop */}
          <DialogHeader>{/* @ts-ignore - DialogTitle accepts children prop */}<DialogTitle>{editingEquip ? "Edit" : "Add"} Equipment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* @ts-ignore - Label and Input accept children and props */}
              <div><Label>Name *</Label><Input value={equipForm.name || ""} onChange={e => setEquipForm(p => ({ ...p, name: e.target.value }))} /></div>
              {/* @ts-ignore - Label and Input accept children and props */}
              <div><Label>Equipment ID/Tag *</Label><Input value={equipForm.equipment_id || ""} onChange={e => setEquipForm(p => ({ ...p, equipment_id: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>{/* @ts-ignore - Label accepts children prop */}<Label>Type</Label>{/* @ts-ignore - Select accepts children and props */}<Select value={equipForm.type || "thermometer"} onValueChange={v => setEquipForm(p => ({ ...p, type: v }))}>{/* @ts-ignore - SelectTrigger accepts children prop */}<SelectTrigger>{/* @ts-ignore - SelectValue accepts props */}<SelectValue /></SelectTrigger>{/* @ts-ignore - SelectContent accepts children prop */}<SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div>{/* @ts-ignore - Label accepts children prop */}<Label>Frequency</Label>{/* @ts-ignore - Select accepts children and props */}<Select value={equipForm.calibration_frequency || "monthly"} onValueChange={v => setEquipForm(p => ({ ...p, calibration_frequency: v }))}>{/* @ts-ignore - SelectTrigger accepts children prop */}<SelectTrigger>{/* @ts-ignore - SelectValue accepts props */}<SelectValue /></SelectTrigger>{/* @ts-ignore - SelectContent accepts children prop */}<SelectContent>{Object.entries(FREQ_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div>{/* @ts-ignore - Label accepts children prop */}<Label>Location</Label>{/* @ts-ignore - Input accepts props */}<Input value={equipForm.location || ""} onChange={e => setEquipForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>{/* @ts-ignore - Label accepts children prop */}<Label>Manufacturer</Label>{/* @ts-ignore - Input accepts props */}<Input value={equipForm.manufacturer || ""} onChange={e => setEquipForm(p => ({ ...p, manufacturer: e.target.value }))} /></div>
              <div>{/* @ts-ignore - Label accepts children prop */}<Label>Serial Number</Label>{/* @ts-ignore - Input accepts props */}<Input value={equipForm.serial_number || ""} onChange={e => setEquipForm(p => ({ ...p, serial_number: e.target.value }))} /></div>
            </div>
            <div>{/* @ts-ignore - Label accepts children prop */}<Label>Calibration Method</Label>{/* @ts-ignore - Textarea accepts props */}<Textarea value={equipForm.calibration_method || ""} onChange={e => setEquipForm(p => ({ ...p, calibration_method: e.target.value }))} rows={2} /></div>
            <div>{/* @ts-ignore - Label accepts children prop */}<Label>Tolerance</Label>{/* @ts-ignore - Input accepts props */}<Input value={equipForm.tolerance || ""} onChange={e => setEquipForm(p => ({ ...p, tolerance: e.target.value }))} placeholder="e.g., ±1°F" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEquipModalOpen(false)}>Cancel</Button>
        <Button onClick={() => {
          // @ts-ignore
          equipMutation.mutate(equipForm);
        }} disabled={equipMutation.isPending}>{equipMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calibration Record Modal */}
      <Dialog open={calibModalOpen} onOpenChange={setCalibModalOpen}>
        {/* @ts-ignore - DialogContent accepts children prop */}
        <DialogContent>
          {/* @ts-ignore - DialogHeader accepts children prop */}
          <DialogHeader>{/* @ts-ignore - DialogTitle accepts children prop */}<DialogTitle>Record Calibration — {selectedEquip?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Result</Label><Select value={calibForm.result || "pass"} onValueChange={v => setCalibForm(p => ({ ...p, result: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem><SelectItem value="adjusted_pass">Adjusted & Pass</SelectItem><SelectItem value="out_of_tolerance">Out of Tolerance</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Reading Before</Label><Input type="number" step="0.1" value={calibForm.reading_before ?? ""} onChange={e => setCalibForm(p => ({ ...p, reading_before: parseFloat(e.target.value) || null }))} /></div>
              <div><Label>Reference Value</Label><Input type="number" step="0.1" value={calibForm.reference_value ?? ""} onChange={e => setCalibForm(p => ({ ...p, reference_value: parseFloat(e.target.value) || null }))} /></div>
              <div><Label>Reading After</Label><Input type="number" step="0.1" value={calibForm.reading_after ?? ""} onChange={e => setCalibForm(p => ({ ...p, reading_after: parseFloat(e.target.value) || null }))} /></div>
            </div>
            <div><Label>Calibrated By</Label><Input value={calibForm.calibrated_by_name || ""} onChange={e => setCalibForm(p => ({ ...p, calibrated_by_name: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={calibForm.notes || ""} onChange={e => setCalibForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCalibModalOpen(false)}>Cancel</Button>
              <Button onClick={() => calibMutation.mutate(calibForm)} disabled={calibMutation.isPending}>{calibMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}