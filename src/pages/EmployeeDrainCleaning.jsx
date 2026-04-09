// @ts-nocheck
import { useState, useEffect } from "react";
import { DrainCleaningRecordRepo, DrainLocationRepo, DrainFacilityMapRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Droplet, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, CloudOff, Info
} from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DrainSignaturePad from "@/components/employee/DrainSignaturePad";
import DrainMapViewerInline from "@/components/employee/DrainMapViewerInline";
import { cn } from "@/lib/utils";
import useOfflineStatus from "@/components/offline/useOfflineStatus";

export default function EmployeeDrainCleaningPage() {
  const [employee, setEmployee] = useState(null);
  const [selectedDrainIds, setSelectedDrainIds] = useState([]);
  const [cleaning, setCleaning] = useState(false);
  const [signingDrainId, setSigningDrainId] = useState(null);
  const [signature, setSignature] = useState(null);
  const [issuesFound, setIssuesFound] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [completedDrainIds, setCompletedDrainIds] = useState([]);
  const { isOffline, queueOfflineAction } = useOfflineStatus();

  const queryClient = useQueryClient();

  useEffect(() => {
    const stored = localStorage.getItem("selectedEmployee");
    if (!stored) {
      window.location.href = createPageUrl("EmployeeLogin");
      return;
    }
    setEmployee(JSON.parse(stored));

    // Get selected drains from URL params
    const params = new URLSearchParams(window.location.search);
    const drainIds = params.get("drains");
    if (drainIds) {
      setSelectedDrainIds(drainIds.split(","));
      setCleaning(true);
    }
  }, []);

  const organizationId = employee?.organization_id;

  const { data: drains = [], isLoading } = useQuery({
    queryKey: ["drain_locations", organizationId],
    queryFn: () => DrainLocationRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: facilityMaps = [], isLoading: mapsLoading } = useQuery({
    queryKey: ["drain_facility_maps", organizationId],
    queryFn: () => DrainFacilityMapRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const defaultMap = facilityMaps.find(m => m.is_default) || facilityMaps[0];
  // Fetch today's drain cleaning records to see what's already done
  const { data: todaysCleaningRecords = [] } = useQuery({
    queryKey: ["todays_drain_cleanings", organizationId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const records = await DrainCleaningRecordRepo.filter({ 
        organization_id: organizationId 
      }, "-cleaned_at", 100);
      // Filter to today's records for selected drains
      return records.filter(r => 
        r.cleaned_at && r.cleaned_at.startsWith(today) && 
        selectedDrainIds.includes(r.drain_id)
      );
    },
    enabled: !!organizationId && selectedDrainIds.length > 0
  });

  // Merge already-completed drains from DB with locally completed ones
  const alreadyCompletedDrainIds = todaysCleaningRecords.map(r => r.drain_id);
  const allCompletedDrainIds = [...new Set([...completedDrainIds, ...alreadyCompletedDrainIds])];

  const selectedDrains = drains.filter(d => selectedDrainIds.includes(d.id));
  const completedCount = selectedDrains.filter(d => allCompletedDrainIds.includes(d.id)).length;

  const calculateNextDueDate = (frequency) => {
    const now = new Date();
    switch (frequency) {
      case "daily": return addDays(now, 1);
      case "weekly": return addWeeks(now, 1);
      case "bi-weekly": return addWeeks(now, 2);
      case "monthly": return addMonths(now, 1);
      default: return addWeeks(now, 1);
    }
  };

  const completeDrainMutation = useMutation({
    mutationFn: async (drain) => {
      const now = new Date().toISOString();
      const nextDue = calculateNextDueDate(drain.cleaning_frequency);

      const cleaningRecordData = {
        organization_id: organizationId,
        drain_id: drain.id,
        drain_code: drain.drain_id,
        drain_location: drain.location_description,
        cleaned_at: now,
        cleaned_by: employee.email,
        cleaned_by_name: employee.name,
        signature_data: signature,
        condition_notes: conditionNotes,
        issues_found: issuesFound,
        issue_description: issueDescription
      };

      const drainUpdateData = {
        last_cleaned_at: now,
        last_cleaned_by: employee.email,
        last_cleaned_by_name: employee.name,
        next_due_date: format(nextDue, "yyyy-MM-dd")
      };

      // Handle offline mode
      if (isOffline) {
        await queueOfflineAction({
          entity: 'DrainCleaningRecord',
          operation: 'create',
          data: {
            ...cleaningRecordData,
            _completed_offline: true,
            _offline_completed_at: now
          }
        });

        await queueOfflineAction({
          entity: 'DrainLocation',
          operation: 'update',
          entityId: drain.id,
          data: drainUpdateData
        });

        return drain.id;
      }

      // Online mode - create cleaning record with signature
      await DrainCleaningRecordRepo.create(cleaningRecordData);

      // Update drain
      await DrainLocationRepo.update(drain.id, drainUpdateData);
      
      return drain.id;
    },
    onSuccess: (drainId) => {
      queryClient.invalidateQueries({ queryKey: ["drain_locations"] });
      queryClient.invalidateQueries({ queryKey: ["drain_cleaning_records"] });
      
      // Mark as completed
      setCompletedDrainIds(prev => [...prev, drainId]);
      
      // Reset form
      setSigningDrainId(null);
      setSignature(null);
      setIssuesFound(false);
      setIssueDescription("");
      setConditionNotes("");

      const newCompleted = [...completedDrainIds, drainId];
      const remaining = selectedDrains.filter(d => !newCompleted.includes(d.id) && !alreadyCompletedDrainIds.includes(d.id));
      if (remaining.length === 0) {
        toast.success("All drains cleaned!");
      } else {
        toast.success("Drain signed off!");
      }
    }
  });

  if (!employee || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!cleaning) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="w-full px-4 md:px-6 max-w-3xl mx-auto py-6">
          <Link to={createPageUrl("EmployeeDashboard")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="text-center py-12">
            <Droplet className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">No Drains Selected</h1>
            <p className="text-slate-500 mb-6">Select drain cleaning tasks from your dashboard to get started.</p>
            <Link to={createPageUrl("EmployeeDashboard")}>
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Offline Banner */}
      {isOffline && (
        <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <CloudOff className="w-4 h-4" />
          Offline mode — completions will sync when connected
        </div>
      )}
      
      <div className="w-full px-4 md:px-6 max-w-4xl mx-auto py-6">
        {/* Header - only shown on desktop since MobileHeader handles mobile */}
        <div className="mb-6 hidden md:block">
          <Link to={createPageUrl("EmployeeDashboard")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-2">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Droplet className="w-8 h-8 text-cyan-600" />
            Drain Cleaning
          </h1>
        </div>

        {/* Facility Map Section - with pinch-to-zoom */}
        {defaultMap && (
          <DrainMapViewerInline 
            mapUrl={defaultMap.image_url} 
            drains={selectedDrains} 
            completedDrainIds={allCompletedDrainIds} 
          />
        )}

        {/* Progress Bar */}
        <div className="mb-4 px-1">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-600">Progress</span>
            <span className="font-medium">{completedCount}/{selectedDrains.length}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${(completedCount / selectedDrains.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Drain List - Compact Cards */}
        <div className="space-y-2">
          {selectedDrains.map((drain) => {
          const isCompleted = allCompletedDrainIds.includes(drain.id);
          const isSigning = signingDrainId === drain.id;
            
            return (
              <Card 
                key={drain.id} 
                className={cn(
                  "border transition-all",
                  isCompleted ? "bg-emerald-50 border-emerald-200" : "bg-white",
                  isSigning && "border-cyan-400 ring-2 ring-cyan-200"
                )}
              >
                {/* Compact Header - Large Touch Target */}
                <button 
                  className={cn(
                    "w-full flex items-center gap-3 p-4 text-left",
                    "touch-manipulation active:bg-slate-50 transition-colors",
                    !isSigning && "cursor-pointer"
                  )}
                  onClick={() => !isSigning && setSigningDrainId(drain.id)}
                  disabled={isSigning}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0",
                    isCompleted ? "bg-emerald-500" : "bg-cyan-600"
                  )}>
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Droplet className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold text-lg", isCompleted && "text-emerald-700")}>{drain.drain_id}</p>
                    <p className="text-sm text-slate-500 truncate">{drain.location_description}</p>
                  </div>
                  {isCompleted ? (
                    <Badge className="bg-emerald-600 text-sm px-3 py-1">Done</Badge>
                  ) : isSigning ? (
                    <Badge className="bg-cyan-600 text-sm px-3 py-1">Signing...</Badge>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-cyan-600" />
                    </div>
                  )}
                </button>

                {/* Already completed this cycle notice */}
                {isCompleted && isSigning && (
                  <div className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      This drain has already been cleaned this cycle. You can submit again if needed.
                    </p>
                  </div>
                )}

                {/* Expanded Sign-Off Form - Mobile Optimized */}
                {isSigning && (
                  <div className="border-t p-4 space-y-4 bg-slate-50">
                    {/* Issues Toggle - Large Touch Target */}
                    <div 
                      className="flex items-center justify-between p-3 bg-white rounded-xl border touch-manipulation"
                      onClick={() => setIssuesFound(!issuesFound)}
                    >
                      <span className="font-medium text-slate-700 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Issues Found?
                      </span>
                      <Switch checked={issuesFound} onCheckedChange={setIssuesFound} />
                    </div>
                    {issuesFound && (
                      <Textarea
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        placeholder="Describe the issue..."
                        className="min-h-[80px] text-base"
                      />
                    )}

                    {/* Notes */}
                    <Textarea
                      value={conditionNotes}
                      onChange={(e) => setConditionNotes(e.target.value)}
                      placeholder="Condition notes (optional)..."
                      className="min-h-[80px] text-base"
                    />

                    {/* Signature */}
                    <DrainSignaturePad onSignatureChange={setSignature} />

                    {/* Actions - Large Touch Targets */}
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-14 text-base touch-manipulation"
                        onClick={() => {
                          setSigningDrainId(null);
                          setSignature(null);
                          setIssuesFound(false);
                          setIssueDescription("");
                          setConditionNotes("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => completeDrainMutation.mutate(drain)}
                        disabled={!signature || completeDrainMutation.isPending || (issuesFound && !issueDescription)}
                        className="flex-1 h-14 text-base bg-emerald-600 hover:bg-emerald-700 touch-manipulation"
                      >
                        {completeDrainMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isOffline ? (
                          <>
                            <CloudOff className="w-5 h-5 mr-2" />
                            Save Offline
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Sign Off
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}