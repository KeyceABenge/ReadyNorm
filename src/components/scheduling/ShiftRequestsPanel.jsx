// @ts-nocheck
import { useState } from "react";
import { ShiftRequestRepo, EmployeeShiftRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Palmtree, Clock, ArrowRightLeft, Check, X, Loader2, Bell, Megaphone, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_CONFIG = {
  vacation: { label: "Day Off", icon: Palmtree, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  overtime: { label: "Overtime", icon: Clock, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  shift_cover: { label: "Shift Cover", icon: ArrowRightLeft, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
};

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-800" },
  denied: { label: "Denied", color: "bg-red-100 text-red-800" },
};

export default function ShiftRequestsPanel({ organizationId, crews = [] }) {
  const [reviewNotes, setReviewNotes] = useState({});
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["shift_requests", organizationId],
    queryFn: () => ShiftRequestRepo.filter({ organization_id: organizationId }, "-created_date"),
    enabled: !!organizationId,
  });

  // Helper: find crew info for an employee email
  const findCrewForEmployee = (email) => {
    return crews.find(c => c.status === "active" && c.members?.includes(email));
  };

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, request }) => {
      // 1. Update the request status
      await ShiftRequestRepo.update(id, {
        status,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes[id] || "",
      });

      // 2. If approved, automatically update schedules
      if (status === "approved" && request) {
        const shiftOps = [];
        const requesterCrew = findCrewForEmployee(request.requester_email);

        if (request.request_type === "vacation") {
          // Cancel the requester's shift for that date
          shiftOps.push(
            EmployeeShiftRepo.create({
              organization_id: organizationId,
              employee_email: request.requester_email,
              employee_name: request.requester_name,
              crew_schedule_id: requesterCrew?.id || "",
              crew_name: requesterCrew?.name || "",
              shift_date: request.target_date,
              shift_start_time: requesterCrew?.shift_start_time || "00:00",
              shift_end_time: requesterCrew?.shift_end_time || "00:00",
              status: "cancelled",
              notes: `Approved vacation request`,
            })
          );
        } else if (request.request_type === "overtime") {
          // Create a scheduled shift for the requester on their off day
          shiftOps.push(
            EmployeeShiftRepo.create({
              organization_id: organizationId,
              employee_email: request.requester_email,
              employee_name: request.requester_name,
              crew_schedule_id: requesterCrew?.id || "",
              crew_name: requesterCrew?.name || "",
              shift_date: request.target_date,
              shift_start_time: requesterCrew?.shift_start_time || "05:00",
              shift_end_time: requesterCrew?.shift_end_time || "17:00",
              status: "scheduled",
              notes: `Approved overtime request`,
            })
          );
        } else if (request.request_type === "shift_cover" && request.cover_employee_email) {
          const coverCrew = findCrewForEmployee(request.cover_employee_email);
          // Mark requester as absent (off, not PTO)
          shiftOps.push(
            EmployeeShiftRepo.create({
              organization_id: organizationId,
              employee_email: request.requester_email,
              employee_name: request.requester_name,
              crew_schedule_id: requesterCrew?.id || "",
              crew_name: requesterCrew?.name || "",
              shift_date: request.target_date,
              shift_start_time: requesterCrew?.shift_start_time || "00:00",
              shift_end_time: requesterCrew?.shift_end_time || "00:00",
              status: "absent",
              notes: `Shift covered by ${request.cover_employee_name}`,
            })
          );
          // Create shift for the cover employee
          shiftOps.push(
            EmployeeShiftRepo.create({
              organization_id: organizationId,
              employee_email: request.cover_employee_email,
              employee_name: request.cover_employee_name,
              crew_schedule_id: requesterCrew?.id || "",
              crew_name: requesterCrew?.name || "",
              shift_date: request.target_date,
              shift_start_time: requesterCrew?.shift_start_time || "05:00",
              shift_end_time: requesterCrew?.shift_end_time || "17:00",
              status: "scheduled",
              notes: `Covering for ${request.requester_name}`,
            })
          );
        }

        if (shiftOps.length > 0) {
          await Promise.all(shiftOps);
        }
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["shift_requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee_shifts"] });
      queryClient.invalidateQueries({ queryKey: ["crew_schedules"] });
      toast.success(`Request ${status}${status === "approved" ? " — schedule updated" : ""}`);
    },
  });

  const pendingRequests = requests.filter(r => r.status === "pending");
  const pastRequests = requests.filter(r => r.status !== "pending").slice(0, 20);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Pending Requests
          {pendingRequests.length > 0 && (
            <Badge className="bg-amber-500 text-white">{pendingRequests.length}</Badge>
          )}
        </h3>

        {pendingRequests.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No pending requests</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(req => {
              const config = TYPE_CONFIG[req.request_type] || TYPE_CONFIG.vacation;
              const Icon = config.icon;
              return (
                <Card key={req.id} className={cn("p-4 border-2", config.bg)}>
                  <div className="flex items-start gap-3">
                    <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", config.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-slate-900 text-sm">{req.requester_name}</span>
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        <span className="text-xs text-slate-500">
                          {format(new Date(req.target_date + "T12:00:00"), "EEE, MMM d")}
                        </span>
                      </div>
                      {req.request_type === "shift_cover" && (
                        <div className="mb-1">
                          {req.cover_mode === "open_bid" ? (
                            <div className="flex items-center gap-1.5 text-xs text-teal-700">
                              <Megaphone className="w-3 h-3" />
                              <span className="font-medium">Open bid</span>
                              {req.cover_employee_name ? (
                                <span>
                                  — <span className="font-medium">{req.cover_employee_name}</span> volunteered
                                  <Badge className="ml-1 text-xs bg-emerald-100 text-emerald-700">accepted</Badge>
                                </span>
                              ) : (
                                <span className="text-slate-500">— waiting for a volunteer</span>
                              )}
                            </div>
                          ) : req.cover_employee_name ? (
                            <div className="flex items-center gap-1.5 text-xs text-purple-700">
                              <User className="w-3 h-3" />
                              Asking <span className="font-medium">{req.cover_employee_name}</span> to cover
                              {req.cover_response !== "pending" && (
                                <Badge className={cn("ml-1 text-xs", req.cover_response === "accepted" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                  {req.cover_response}
                                </Badge>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}
                      {req.notes && <p className="text-xs text-slate-600 mb-2">{req.notes}</p>}

                      <div className="flex items-center gap-2 mt-2">
                        <Textarea
                          value={reviewNotes[req.id] || ""}
                          onChange={(e) => setReviewNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="Add notes (optional)..."
                          className="min-h-[32px] h-8 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => reviewMutation.mutate({ id: req.id, status: "approved", request: req })}
                          disabled={reviewMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 h-8"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reviewMutation.mutate({ id: req.id, status: "denied", request: req })}
                          disabled={reviewMutation.isPending}
                          className="border-red-300 text-red-600 hover:bg-red-50 h-8"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Requests */}
      {pastRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Decisions</h3>
          <div className="space-y-2">
            {pastRequests.map(req => {
              const config = TYPE_CONFIG[req.request_type] || TYPE_CONFIG.vacation;
              const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              return (
                <div key={req.id} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border text-sm">
                  <span className="font-medium text-slate-700 flex-1 truncate">{req.requester_name}</span>
                  <Badge variant="outline" className="text-xs">{config.label}</Badge>
                  <span className="text-xs text-slate-500">{format(new Date(req.target_date + "T12:00:00"), "MMM d")}</span>
                  <Badge className={cn("text-xs", statusCfg.color)}>{statusCfg.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}