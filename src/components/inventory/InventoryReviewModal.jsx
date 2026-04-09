import { useState } from "react";
import { getCurrentUser } from "@/lib/adapters/auth";
import { ChemicalInventoryRecordRepo, ChemicalCountEntryRepo } from "@/lib/adapters/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, ShoppingCart, Package, AlertTriangle, 
  Loader2, FileCheck, X
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function InventoryReviewModal({ 
  open, onClose, organizationId, inventoryRecord, countEntries, isManager 
}) {
  const [activeTab, setActiveTab] = useState("summary");
  const [orderQuantities, setOrderQuantities] = useState(() => {
    const initial = {};
    countEntries.forEach(e => {
      if (e.suggested_order_qty > 0) {
        initial[e.id] = e.actual_order_qty ?? e.suggested_order_qty;
      }
    });
    return initial;
  });
  const [reviewNotes, setReviewNotes] = useState(inventoryRecord.review_notes || "");

  const queryClient = useQueryClient();

  // Group entries for display
  const entriesByLocation = {};
  countEntries.forEach(entry => {
    if (!entriesByLocation[entry.location_name]) {
      entriesByLocation[entry.location_name] = [];
    }
    entriesByLocation[entry.location_name].push(entry);
  });

  const lowStockEntries = countEntries.filter(e => e.on_hand_quantity < e.par_level);
  const orderableEntries = countEntries.filter(e => e.suggested_order_qty > 0);

  // Consolidate order by chemical (sum across locations)
  const consolidatedOrders = {};
  orderableEntries.forEach(entry => {
    const qty = orderQuantities[entry.id] || 0;
    if (qty > 0) {
      if (!consolidatedOrders[entry.chemical_name]) {
        consolidatedOrders[entry.chemical_name] = {
          chemical_name: entry.chemical_name,
          unit: entry.unit,
          total_qty: 0,
          locations: []
        };
      }
      consolidatedOrders[entry.chemical_name].total_qty += qty;
      consolidatedOrders[entry.chemical_name].locations.push({
        location: entry.location_name,
        qty: qty
      });
    }
  });

  const updateOrderQty = (entryId, qty) => {
    setOrderQuantities(prev => ({ ...prev, [entryId]: parseFloat(qty) || 0 }));
  };

  const markReviewedMutation = useMutation({
    mutationFn: async () => {
      // Update individual entries with actual order quantities
      for (const entry of orderableEntries) {
        await ChemicalCountEntryRepo.update(entry.id, {
          actual_order_qty: orderQuantities[entry.id] || 0
        });
      }
      
      // Update record status
      const currentUser = await getCurrentUser();
      await ChemicalInventoryRecordRepo.update(inventoryRecord.id, {
        status: "reviewed",
        reviewed_by: currentUser?.email,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_records"] });
      queryClient.invalidateQueries({ queryKey: ["count_entries"] });
      toast.success("Inventory reviewed");
      onClose();
    }
  });

  const markOrderPlacedMutation = useMutation({
    mutationFn: async () => {
      await ChemicalInventoryRecordRepo.update(inventoryRecord.id, {
        status: "closed",
        order_placed: true,
        order_placed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_records"] });
      toast.success("Week closed - order marked as placed");
      onClose();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Inventory Review</span>
            <div className="flex items-center gap-2">
              <Badge className={
                inventoryRecord.status === "reviewed" ? "bg-blue-600" :
                inventoryRecord.status === "closed" ? "bg-slate-600" :
                "bg-emerald-600"
              }>
                {inventoryRecord.status}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Week Info */}
        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Week</p>
              <p className="font-medium">
                {format(parseISO(inventoryRecord.week_start_date), "MMM d")} - {format(parseISO(inventoryRecord.week_end_date), "MMM d")}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Completed By</p>
              <p className="font-medium">{inventoryRecord.completed_by_name || "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">Items Counted</p>
              <p className="font-medium">{countEntries.length}</p>
            </div>
            <div>
              <p className="text-slate-500">Low Stock Items</p>
              <p className="font-medium text-amber-600">{lowStockEntries.length}</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">All Items</TabsTrigger>
            <TabsTrigger value="order">
              Order List
              {orderableEntries.length > 0 && (
                <Badge className="ml-2 bg-blue-600">{orderableEntries.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{countEntries.length}</p>
                <p className="text-sm text-slate-500">Items Counted</p>
              </Card>
              <Card className="p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{lowStockEntries.length}</p>
                <p className="text-sm text-slate-500">Below Par</p>
              </Card>
              <Card className="p-4 text-center">
                <ShoppingCart className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{Object.keys(consolidatedOrders).length}</p>
                <p className="text-sm text-slate-500">Chemicals to Order</p>
              </Card>
            </div>

            {/* Consolidated Order Summary */}
            {Object.keys(consolidatedOrders).length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  Suggested Order Summary
                </h3>
                <div className="space-y-2">
                  {Object.values(consolidatedOrders).map(item => (
                    <div key={item.chemical_name} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <span className="font-medium">{item.chemical_name}</span>
                      <span className="text-blue-700 font-semibold">
                        {item.total_qty} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {Object.entries(entriesByLocation).map(([locationName, entries]) => (
              <Card key={locationName} className="p-4">
                <h3 className="font-semibold text-slate-900 mb-3">{locationName}</h3>
                <div className="space-y-2">
                  {entries.map(entry => (
                    <div key={entry.id} className={cn(
                      "flex justify-between items-center p-2 rounded",
                      entry.on_hand_quantity < entry.par_level ? "bg-amber-50" : "bg-slate-50"
                    )}>
                      <div>
                        <span className="font-medium">{entry.chemical_name}</span>
                        {entry.notes && <span className="text-xs text-slate-500 ml-2">({entry.notes})</span>}
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "font-semibold",
                          entry.on_hand_quantity < entry.par_level ? "text-amber-700" : "text-slate-700"
                        )}>
                          {entry.on_hand_quantity} / {entry.par_level} {entry.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="order" className="space-y-4">
            {orderableEntries.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">All items are at or above par level</p>
              </Card>
            ) : (
              <>
                <p className="text-sm text-slate-500">
                  Adjust order quantities as needed before finalizing.
                </p>
                <div className="space-y-3">
                  {orderableEntries.map(entry => (
                    <Card key={entry.id} className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{entry.chemical_name}</p>
                          <p className="text-sm text-slate-500">
                            {entry.location_name} • On hand: {entry.on_hand_quantity} • Par: {entry.par_level}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div>
                            <Label className="text-xs">Order Qty ({entry.unit})</Label>
                            <Input 
                              type="number" 
                              min="0"
                              step="0.5"
                              value={orderQuantities[entry.id] || ""}
                              onChange={e => updateOrderQty(entry.id, e.target.value)}
                              className="w-24"
                            />
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => updateOrderQty(entry.id, 0)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Review Notes */}
        {isManager && inventoryRecord.status !== "closed" && (
          <div className="mt-4">
            <Label>Review Notes</Label>
            <Textarea 
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              placeholder="Any notes about this week's inventory..."
              className="mt-1"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
          
          {isManager && inventoryRecord.status === "completed" && (
            <Button onClick={() => markReviewedMutation.mutate()} 
                    disabled={markReviewedMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700">
              {markReviewedMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <FileCheck className="w-4 h-4 mr-2" />
              Mark Reviewed
            </Button>
          )}
          
          {isManager && inventoryRecord.status === "reviewed" && (
            <Button onClick={() => markOrderPlacedMutation.mutate()}
                    disabled={markOrderPlacedMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700">
              {markOrderPlacedMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <ShoppingCart className="w-4 h-4 mr-2" />
              Order Placed - Close Week
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}