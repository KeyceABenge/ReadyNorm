import { useState, useEffect } from "react";
import { ChemicalInventoryRecordRepo, ChemicalCountEntryRepo } from "@/lib/adapters/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, FlaskConical, CheckCircle2, Save, Loader2, ChevronDown, ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function InventoryCountForm({ 
  open, onClose, organizationId, inventoryRecord, assignments, locations, existingEntries, user 
}) {
  const [counts, setCounts] = useState({});
  const [notes, setNotes] = useState({});
  const [expandedLocations, setExpandedLocations] = useState({});
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  // Initialize from existing entries
  useEffect(() => {
    const initialCounts = {};
    const initialNotes = {};
    existingEntries.forEach(entry => {
      const key = `${entry.chemical_id}-${entry.location_id}`;
      if (entry.on_hand_quantity !== undefined) {
        initialCounts[key] = entry.on_hand_quantity;
      }
      if (entry.notes) {
        initialNotes[key] = entry.notes;
      }
    });
    setCounts(initialCounts);
    setNotes(initialNotes);
    
    // Expand all locations by default
    const expanded = {};
    locations.forEach(loc => { expanded[loc.id] = true; });
    setExpandedLocations(expanded);
  }, [existingEntries, locations]);

  // Group assignments by location
  const assignmentsByLocation = {};
  locations.forEach(loc => {
    assignmentsByLocation[loc.id] = assignments.filter(a => a.location_id === loc.id);
  });

  const handleCountChange = (chemicalId, locationId, value) => {
    const key = `${chemicalId}-${locationId}`;
    setCounts(prev => ({ ...prev, [key]: value === "" ? undefined : parseFloat(value) }));
  };

  const handleNoteChange = (chemicalId, locationId, value) => {
    const key = `${chemicalId}-${locationId}`;
    setNotes(prev => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaving(true);
      const entries = [];
      
      for (const assignment of assignments) {
        const key = `${assignment.chemical_id}-${assignment.location_id}`;
        const onHand = counts[key];
        
        if (onHand !== undefined) {
          const parLevel = assignment.par_level || 0;
          const reorderTo = assignment.reorder_to_level || parLevel;
          const suggestedQty = onHand < parLevel ? Math.max(0, reorderTo - onHand) : 0;
          
          const existingEntry = existingEntries.find(
            e => e.chemical_id === assignment.chemical_id && e.location_id === assignment.location_id
          );
          
          const entryData = {
            organization_id: organizationId,
            inventory_record_id: inventoryRecord.id,
            chemical_id: assignment.chemical_id,
            chemical_name: assignment.chemical_name,
            location_id: assignment.location_id,
            location_name: assignment.location_name,
            assignment_id: assignment.id,
            on_hand_quantity: onHand,
            par_level: parLevel,
            reorder_to_level: reorderTo,
            unit: assignment.unit,
            suggested_order_qty: suggestedQty,
            notes: notes[key] || "",
            counted_by: user?.email,
            counted_at: new Date().toISOString()
          };
          
          if (existingEntry) {
            await ChemicalCountEntryRepo.update(existingEntry.id, entryData);
          } else {
            await ChemicalCountEntryRepo.create(entryData);
          }
        }
      }
      
      // Check if all items counted
      const totalCounted = Object.values(counts).filter(v => v !== undefined).length;
      if (totalCounted === assignments.length) {
        await ChemicalInventoryRecordRepo.update(inventoryRecord.id, {
          status: "completed",
          completed_by: user?.email,
          completed_by_name: user?.full_name,
          completed_at: new Date().toISOString()
        });
      }
    },
    onMutate: async () => {
      // Optimistic update - immediately mark as saving
      await queryClient.cancelQueries({ queryKey: ["count_entries"] });
      await queryClient.cancelQueries({ queryKey: ["inventory_records"] });
    },
    onSuccess: () => {
      setSaving(false);
      // Immediately invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["count_entries"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_records"] });
      queryClient.invalidateQueries({ queryKey: ["chemical_assignments"] });
      toast.success("Counts saved");
      onClose();
    },
    onError: () => {
      setSaving(false);
      toast.error("Failed to save counts");
    }
  });

  const totalItems = assignments.length;
  const countedItems = Object.values(counts).filter(v => v !== undefined).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Chemical Inventory Count</span>
            <Badge variant="outline">{countedItems} / {totalItems} counted</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {locations.filter(loc => assignmentsByLocation[loc.id]?.length > 0).map(location => (
            <Card key={location.id} className="overflow-hidden">
              <div 
                className="flex items-center gap-3 p-4 bg-slate-50 cursor-pointer"
                onClick={() => setExpandedLocations(prev => ({ ...prev, [location.id]: !prev[location.id] }))}
              >
                {expandedLocations[location.id] ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
                <MapPin className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-slate-900 flex-1">{location.name}</h3>
                <Badge variant="outline">
                  {assignmentsByLocation[location.id]?.filter(a => {
                    const key = `${a.chemical_id}-${a.location_id}`;
                    return counts[key] !== undefined;
                  }).length} / {assignmentsByLocation[location.id]?.length}
                </Badge>
              </div>

              {expandedLocations[location.id] && (
                <div className="p-4 space-y-3">
                  {assignmentsByLocation[location.id]?.map(assignment => {
                    const key = `${assignment.chemical_id}-${assignment.location_id}`;
                    const counted = counts[key] !== undefined;
                    const belowPar = counted && counts[key] < assignment.par_level;
                    
                    return (
                      <div key={key} className={cn(
                        "p-3 rounded-lg border",
                        counted ? (belowPar ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200") : "bg-white"
                      )}>
                        <div className="flex items-start gap-3">
                          <FlaskConical className={cn("w-5 h-5 mt-1", counted ? "text-emerald-600" : "text-slate-400")} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-slate-900">{assignment.chemical_name}</span>
                              <span className="text-xs text-slate-500">
                                Par: {assignment.par_level} {assignment.unit}
                              </span>
                              {counted && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">On-Hand Quantity ({assignment.unit})</Label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.5"
                                  value={counts[key] ?? ""}
                                  onChange={e => handleCountChange(assignment.chemical_id, assignment.location_id, e.target.value)}
                                  placeholder="Enter count..."
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Notes (optional)</Label>
                                <Input 
                                  value={notes[key] || ""}
                                  onChange={e => handleNoteChange(assignment.chemical_id, assignment.location_id, e.target.value)}
                                  placeholder="Any notes..."
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            {belowPar && (
                              <p className="text-xs text-amber-600 mt-2">
                                ⚠️ Below par level - will suggest ordering {Math.max(0, (assignment.reorder_to_level || assignment.par_level) - counts[key])} {assignment.unit}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-slate-500">
            {countedItems === totalItems ? "All items counted!" : `${totalItems - countedItems} items remaining`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saving || countedItems === 0}
                    className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Counts
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}