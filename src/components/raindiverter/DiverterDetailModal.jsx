import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Droplets, Sun, MapPin, Clock,
  CheckCircle2, Edit, Trash2, ClipboardCheck, Loader2
} from "lucide-react";
import { getCurrentUser } from "@/lib/adapters/auth";
import { RainDiverterRepo } from "@/lib/adapters/database";
import { format, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";

export default function DiverterDetailModal({
  open,
  onOpenChange,
  diverter,
  inspections = [],
  isManager = false,
  onEdit,
  onInspect,
  onRemove,
  onMarkWOComplete,
  onRefresh
}) {
  const [isMarkingWO, setIsMarkingWO] = useState(false);

  if (!diverter) return null;

  const isOverdue = !diverter.last_inspection_date ||
    differenceInHours(new Date(), new Date(diverter.last_inspection_date)) > 24;

  const diverterInspections = inspections
    .filter(i => i.diverter_id === diverter.id)
    .sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));

  const handleMarkWOComplete = async () => {
    setIsMarkingWO(true);
    try {
      const user = await getCurrentUser();
      await RainDiverterRepo.update(diverter.id, {
        wo_completed: true,
        wo_completed_at: new Date().toISOString(),
        wo_completed_by: user.full_name || user.email,
        eligible_for_removal: true,
        removal_criteria_reason: "wo_completed"
      });
      onRefresh?.();
    } catch (err) {
      console.error("Failed to mark WO complete:", err);
    } finally {
      setIsMarkingWO(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              diverter.last_finding === "wet" ? "bg-amber-100" : "bg-emerald-100"
            )}>
              {diverter.last_finding === "wet" ? (
                <Droplets className="w-4 h-4 text-amber-600" />
              ) : (
                <Sun className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            {diverter.diverter_id}
          </DialogTitle>
        </DialogHeader>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={diverter.status === "active" ? "bg-blue-600" : "bg-slate-500"}>
            {diverter.status}
          </Badge>
          {diverter.eligible_for_removal && (
            <Badge className="bg-purple-600">Ready for Removal</Badge>
          )}
          {isOverdue && diverter.status === "active" && (
            <Badge className="bg-rose-600">
              <Clock className="w-3 h-3 mr-1" />
              Inspection Overdue
            </Badge>
          )}
          {diverter.wo_tag_attached && !diverter.wo_completed && (
            <Badge variant="outline">WO: {diverter.wo_number}</Badge>
          )}
          {diverter.wo_completed && (
            <Badge className="bg-emerald-600">WO Completed</Badge>
          )}
        </div>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">
              History ({diverterInspections.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Location */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-medium">{diverter.location_description}</p>
                  <div className="flex gap-2 mt-1 text-sm text-slate-500">
                    {diverter.area_name && <span>{diverter.area_name}</span>}
                    {diverter.production_line_name && <span>• {diverter.production_line_name}</span>}
                  </div>
                </div>
              </div>
            </Card>

            {/* Photo */}
            {diverter.photo_url && (
              <img 
                src={diverter.photo_url} 
                alt="Diverter" 
                className="w-full h-40 object-cover rounded-lg"
              />
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <p className="text-xs text-slate-500">Last Inspection</p>
                <p className="font-medium">
                  {diverter.last_inspection_date 
                    ? format(new Date(diverter.last_inspection_date), "MMM d, h:mm a")
                    : "Never"}
                </p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500">Consecutive Dry Days</p>
                <p className="font-medium text-emerald-600">
                  {diverter.consecutive_dry_days || 0} days
                  {diverter.consecutive_dry_days >= 30 && " ✓"}
                </p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500">Date Installed</p>
                <p className="font-medium">
                  {diverter.date_installed 
                    ? format(new Date(diverter.date_installed), "MMM d, yyyy")
                    : "Unknown"}
                </p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500">Bucket Present</p>
                <p className="font-medium">{diverter.bucket_present ? "Yes" : "No"}</p>
              </Card>
            </div>

            {/* Notes */}
            {diverter.notes && (
              <Card className="p-4">
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <p className="text-sm">{diverter.notes}</p>
              </Card>
            )}

            {/* Removal Eligibility */}
            {diverter.eligible_for_removal && (
              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="flex items-center gap-2 text-purple-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Eligible for Removal</p>
                    <p className="text-sm">
                      {diverter.removal_criteria_reason === "wo_completed" 
                        ? "Work order has been completed"
                        : "Dry for 30+ consecutive days"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* WO Actions */}
            {isManager && diverter.wo_tag_attached && !diverter.wo_completed && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleMarkWOComplete}
                disabled={isMarkingWO}
              >
                {isMarkingWO && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Work Order Completed
              </Button>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {diverterInspections.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No inspections recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {diverterInspections.map(insp => (
                  <Card key={insp.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        insp.finding === "wet" ? "bg-amber-100" : "bg-emerald-100"
                      )}>
                        {insp.finding === "wet" ? (
                          <Droplets className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Sun className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <Badge className={insp.finding === "wet" ? "bg-amber-600" : "bg-emerald-600"}>
                            {insp.finding}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {format(new Date(insp.inspection_date), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          By {insp.inspector_name}
                        </p>
                        <div className="flex gap-2 mt-1 text-xs text-slate-500">
                          {insp.bucket_emptied && <span>✓ Emptied</span>}
                          {insp.cleaned && <span>✓ Cleaned</span>}
                          {insp.sanitized && <span>✓ Sanitized</span>}
                        </div>
                        {insp.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">{insp.notes}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={onInspect} className="flex-1">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Inspect
          </Button>
          {isManager && (
            <>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
              {diverter.eligible_for_removal && (
                <Button variant="destructive" onClick={onRemove}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}