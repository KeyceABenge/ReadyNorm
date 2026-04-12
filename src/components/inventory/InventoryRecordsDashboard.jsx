import { useState } from "react";
import { ChemicalInventoryRecordRepo, ChemicalCountEntryRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardList, Play, CheckCircle2, AlertTriangle, 
  ShoppingCart, Loader2, Eye
} from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

import InventoryCountForm from "./InventoryCountForm";
import InventoryReviewModal from "./InventoryReviewModal";

export default function InventoryRecordsDashboard({ 
  organizationId, isManager, chemicals, locations, assignments, settings, currentWeekRecord, user,
  onNavigateToSettings
}) {
  const [countFormOpen, setCountFormOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const queryClient = useQueryClient();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  // Fetch count entries for current week
  const { data: countEntries = [] } = useQuery({
    queryKey: ["count_entries", currentWeekRecord?.id],
    queryFn: () => ChemicalCountEntryRepo.filter({ inventory_record_id: currentWeekRecord?.id }),
    enabled: !!currentWeekRecord?.id
  });

  // Create or get current week's record
  const createRecordMutation = useMutation({
    mutationFn: async () => {
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
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

  const handleViewReview = (record) => {
    setSelectedRecord(record || currentWeekRecord);
    setReviewModalOpen(true);
  };

  // Calculate stats
  const totalAssignments = assignments.length;
  const completedCounts = countEntries.filter(e => e.on_hand_quantity !== undefined).length;
  const progress = totalAssignments > 0 ? Math.round((completedCounts / totalAssignments) * 100) : 0;

  // Calculate low stock items
  const lowStockItems = countEntries.filter(e => 
    e.on_hand_quantity !== undefined && e.on_hand_quantity < e.par_level
  );

  // Calculate suggested orders
  const suggestedOrders = countEntries.filter(e => 
    e.suggested_order_qty && e.suggested_order_qty > 0
  );

  if (!settings?.is_enabled) {
    return (
      <Card className="p-8 text-center">
        <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Inventory Not Configured</h3>
        <p className="text-slate-500 mb-4">
          {isManager ? "Enable inventory and add chemicals to get started." : "Inventory tracking is not yet set up."}
        </p>
        {isManager && onNavigateToSettings && (
          <Button onClick={onNavigateToSettings} className="bg-slate-900 hover:bg-slate-800">
            Go to Settings
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Week Status */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Week of {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </h2>
            <p className="text-sm text-slate-500">
              {settings.task_title || "Chemical Inventory Count"} • {settings.frequency}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentWeekRecord ? (
              <Badge className={
                currentWeekRecord.status === "completed" ? "bg-emerald-600" :
                currentWeekRecord.status === "reviewed" ? "bg-blue-600" :
                currentWeekRecord.status === "closed" ? "bg-slate-600" :
                "bg-amber-600"
              }>
                {currentWeekRecord.status}
              </Badge>
            ) : (
              <Badge variant="outline">Not Started</Badge>
            )}
          </div>
        </div>

        {/* Progress */}
        {currentWeekRecord && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">Counting Progress</span>
              <span className="font-medium">{completedCounts} / {totalAssignments} items</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {(!currentWeekRecord || currentWeekRecord.status === "pending" || currentWeekRecord.status === "in_progress") && (
            <Button onClick={handleStartInventory} className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={createRecordMutation.isPending || assignments.length === 0}>
              {createRecordMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {currentWeekRecord ? "Continue Count" : "Start Inventory"}
            </Button>
          )}
          
          {currentWeekRecord && (currentWeekRecord.status === "completed" || currentWeekRecord.status === "in_progress") && isManager && (
            <Button onClick={() => handleViewReview()} variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Review & Order
            </Button>
          )}
        </div>

        {assignments.length === 0 && (
          <p className="text-amber-600 text-sm mt-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            No chemicals assigned to locations yet. {isManager && "Add assignments in the Assignments tab."}
          </p>
        )}
      </Card>

      {/* Quick Stats */}
      {currentWeekRecord && countEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completedCounts}</p>
                <p className="text-sm text-slate-500">Items Counted</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{lowStockItems.length}</p>
                <p className="text-sm text-slate-500">Below Par Level</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{suggestedOrders.length}</p>
                <p className="text-sm text-slate-500">Items to Order</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" />
            Low Stock Items
          </h3>
          <div className="space-y-2">
            {lowStockItems.slice(0, 5).map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-amber-900">{item.chemical_name} @ {item.location_name}</span>
                <span className="font-medium text-amber-800">
                  {item.on_hand_quantity} / {item.par_level} {item.unit}
                </span>
              </div>
            ))}
            {lowStockItems.length > 5 && (
              <p className="text-sm text-amber-700">+ {lowStockItems.length - 5} more items</p>
            )}
          </div>
        </Card>
      )}

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
          user={user}
        />
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedRecord && (
        <InventoryReviewModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          organizationId={organizationId}
          inventoryRecord={selectedRecord}
          countEntries={countEntries}
          isManager={isManager}
        />
      )}
    </div>
  );
}