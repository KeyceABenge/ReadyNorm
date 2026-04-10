// @ts-nocheck
import { useState, useEffect } from "react";
import {
  ChemicalCountEntryRepo,
  ChemicalInventoryRecordRepo,
  ChemicalInventorySettingsRepo,
  ChemicalLocationAssignmentRepo,
  ChemicalStorageLocationRepo
} from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FlaskConical, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Play
} from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import InventoryCountForm from "@/components/inventory/InventoryCountForm";

export default function EmployeeInventoryCountPage() {
  const [employee, setEmployee] = useState(null);
  const [countFormOpen, setCountFormOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const stored = localStorage.getItem("selectedEmployee");
    if (!stored) {
      window.location.href = createPageUrl("EmployeeLogin");
      return;
    }
    setEmployee(JSON.parse(stored));
  }, []);

  const organizationId = employee?.organization_id;

  const { data: assignments = [] } = useQuery({
    queryKey: ["chemical_assignments", organizationId],
    queryFn: () => ChemicalLocationAssignmentRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["chemical_locations", organizationId],
    queryFn: () => ChemicalStorageLocationRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: inventorySettings = [] } = useQuery({
    queryKey: ["inventory_settings", organizationId],
    queryFn: () => ChemicalInventorySettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: inventoryRecords = [] } = useQuery({
    queryKey: ["inventory_records", organizationId],
    queryFn: () => ChemicalInventoryRecordRepo.filter({ organization_id: organizationId }, "-week_start_date"),
    enabled: !!organizationId
  });

  const settings = inventorySettings[0];
  
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  
  const currentWeekRecord = inventoryRecords.find(r => r.week_start_date === weekStartStr);

  // Fetch count entries for current week
  const { data: countEntries = [] } = useQuery({
    queryKey: ["count_entries", currentWeekRecord?.id],
    queryFn: () => ChemicalCountEntryRepo.filter({ inventory_record_id: currentWeekRecord?.id }),
    enabled: !!currentWeekRecord?.id
  });

  // Create record mutation
  const createRecordMutation = useMutation({
    mutationFn: async () => {
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");
      return ChemicalInventoryRecordRepo.create({
        organization_id: organizationId,
        week_start_date: weekStartStr,
        week_end_date: weekEndStr,
        status: "in_progress"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_records"] });
      setCountFormOpen(true);
    }
  });

  const handleStartInventory = () => {
    if (currentWeekRecord) {
      setCountFormOpen(true);
    } else {
      createRecordMutation.mutate();
    }
  };

  // Calculate stats
  const totalAssignments = assignments.length;
  const completedCounts = countEntries.filter(e => e.on_hand_quantity !== undefined).length;
  const progress = totalAssignments > 0 ? Math.round((completedCounts / totalAssignments) * 100) : 0;

  if (!employee) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-4 md:px-6 max-w-3xl mx-auto py-6">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl("EmployeeDashboard")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-emerald-600" />
            Chemical Inventory Count
          </h1>
          <p className="text-slate-500 mt-1">
            Week of {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>

        {/* Status Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {settings?.task_title || "Weekly Inventory Count"}
            </h2>
            {currentWeekRecord ? (
              <Badge className={
                currentWeekRecord.status === "completed" ? "bg-emerald-600" :
                currentWeekRecord.status === "in_progress" ? "bg-blue-600" :
                "bg-amber-600"
              }>
                {currentWeekRecord.status === "completed" ? "Completed" :
                 currentWeekRecord.status === "in_progress" ? "In Progress" : 
                 currentWeekRecord.status}
              </Badge>
            ) : (
              <Badge variant="outline">Not Started</Badge>
            )}
          </div>

          {/* Progress */}
          {currentWeekRecord && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Progress</span>
                <span className="font-medium">{completedCounts} / {totalAssignments} items</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          )}

          {/* Summary Stats */}
          {currentWeekRecord && completedCounts > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-emerald-700">{completedCounts}</p>
                <p className="text-xs text-emerald-600">Counted</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <AlertTriangle className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-700">{totalAssignments - completedCounts}</p>
                <p className="text-xs text-slate-600">Remaining</p>
              </div>
            </div>
          )}

          {/* Action Button */}
          {currentWeekRecord?.status === "completed" ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="text-emerald-700 font-medium">Inventory Complete!</p>
              <p className="text-sm text-slate-500">Thank you for completing this week's count.</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-4">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-2" />
              <p className="text-amber-700 font-medium">No Chemicals Assigned</p>
              <p className="text-sm text-slate-500">Ask your manager to set up chemical assignments.</p>
            </div>
          ) : (
            <Button 
              onClick={handleStartInventory} 
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={createRecordMutation.isPending}
            >
              {createRecordMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {currentWeekRecord ? "Continue Count" : "Start Inventory Count"}
            </Button>
          )}
        </Card>

        {/* Instructions */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Count each chemical at its designated storage location</li>
            <li>• Enter the current quantity on hand</li>
            <li>• Add notes for any issues or concerns</li>
            <li>• Submit when all items are counted</li>
          </ul>
        </Card>
      </div>

      {/* Count Form Modal */}
      {countFormOpen && currentWeekRecord && (
        <InventoryCountForm
          open={countFormOpen}
          onClose={() => setCountFormOpen(false)}
          organizationId={organizationId}
          inventoryRecord={currentWeekRecord}
          assignments={assignments}
          locations={locations}
          existingEntries={countEntries}
          user={{ email: employee.email, full_name: employee.name }}
        />
      )}
    </div>
  );
}