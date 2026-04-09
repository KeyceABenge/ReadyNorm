import { useState } from "react";
import { EmployeeRepo, ShiftRequestRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Palmtree, Clock, ArrowRightLeft, Loader2, Megaphone } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay } from "date-fns";
import { useTranslation } from "@/components/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ShiftRequestModal from "@/components/scheduling/ShiftRequestModal";

export default function EmployeeScheduleView({ employeeEmail, employeeShifts, crewSchedules, crews, employee }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedDateScheduled, setSelectedDateScheduled] = useState(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const employeeCrew = (crews || []).find(c => c.members?.includes(employeeEmail) && c.status === "active");

  // Fetch all active employees for shift cover selection
  const { data: allOrgEmployees = [] } = useQuery({
    queryKey: ["all_employees_schedule", employee?.organization_id],
    queryFn: () => EmployeeRepo.filter({ organization_id: employee?.organization_id, status: "active" }),
    enabled: !!employee?.organization_id,
  });

  // Fetch existing shift requests for this employee
  const { data: shiftRequests = [] } = useQuery({
    queryKey: ["my_shift_requests", employee?.organization_id, employeeEmail],
    queryFn: () => ShiftRequestRepo.filter({ organization_id: employee?.organization_id, requester_email: employeeEmail }, "-created_date"),
    enabled: !!employee?.organization_id && !!employeeEmail,
  });

  // Fetch requests where this employee is asked to cover (direct)
  const { data: coverRequests = [] } = useQuery({
    queryKey: ["cover_requests_for_me", employee?.organization_id, employeeEmail],
    queryFn: () => ShiftRequestRepo.filter({ organization_id: employee?.organization_id, cover_employee_email: employeeEmail, request_type: "shift_cover" }, "-created_date"),
    enabled: !!employee?.organization_id && !!employeeEmail,
  });

  // Fetch open bid requests from the whole org (not by this employee)
  const { data: openBidRequests = [] } = useQuery({
    queryKey: ["open_bid_requests", employee?.organization_id],
    queryFn: () => ShiftRequestRepo.filter({ organization_id: employee?.organization_id, request_type: "shift_cover", cover_mode: "open_bid", status: "pending" }, "-created_date"),
    enabled: !!employee?.organization_id,
  });

  const createRequestMutation = useMutation({
    mutationFn: (data) => ShiftRequestRepo.create({
      organization_id: employee?.organization_id,
      requester_email: employeeEmail,
      requester_name: employee?.name,
      ...data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_shift_requests"] });
      toast.success("Request submitted!");
    },
  });

  const respondCoverMutation = useMutation({
    mutationFn: ({ id, response }) => ShiftRequestRepo.update(id, { cover_response: response }),
    onSuccess: (_, { response }) => {
      queryClient.invalidateQueries({ queryKey: ["cover_requests_for_me"] });
      queryClient.invalidateQueries({ queryKey: ["open_bid_requests"] });
      toast.success(response === "accepted" ? "You accepted the cover request" : "You declined the cover request");
    },
  });

  // Volunteer for an open bid
  const volunteerBidMutation = useMutation({
    mutationFn: ({ id }) => ShiftRequestRepo.update(id, {
      cover_employee_email: employeeEmail,
      cover_employee_name: employee?.name,
      cover_response: "accepted",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open_bid_requests"] });
      queryClient.invalidateQueries({ queryKey: ["shift_requests"] });
      toast.success("You volunteered to cover this shift! Waiting for manager approval.");
    },
  });

  const getShiftForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const explicit = employeeShifts.find(s => s.employee_email === employeeEmail && s.shift_date === dateStr);
    if (explicit) return explicit;

    if (employeeCrew?.schedule_pattern?.length > 0 && employeeCrew.schedule_pattern_start_date) {
      const patternStart = new Date(employeeCrew.schedule_pattern_start_date + "T00:00:00");
      const targetDate = new Date(dateStr + "T00:00:00");
      const daysSince = Math.floor((targetDate.getTime() - patternStart.getTime()) / (1000 * 60 * 60 * 24));
      const totalPatternDays = employeeCrew.schedule_pattern.length * 7;
      const dayInPattern = ((daysSince % totalPatternDays) + totalPatternDays) % totalPatternDays;
      const weekIdx = Math.floor(dayInPattern / 7);
      const dayIdx = targetDate.getDay();

      const isWorkDay = employeeCrew.schedule_pattern[weekIdx]?.[dayIdx];
      if (isWorkDay) {
        return {
          _fromCrew: true,
          crew_name: employeeCrew.name,
          crew_color: employeeCrew.color,
          shift_start_time: employeeCrew.shift_start_time,
          shift_end_time: employeeCrew.shift_end_time,
          status: "scheduled"
        };
      } else {
        return { _fromCrew: true, status: "absent" };
      }
    }
    return null;
  };

  const getCrewColor = (crewScheduleId) => {
    const schedule = crewSchedules.find(s => s.id === crewScheduleId);
    return schedule?.crew_color || "#3b82f6";
  };

  const getRequestForDate = (dateStr) => {
    return shiftRequests.find(r => r.target_date === dateStr && r.status === "pending");
  };

  const getApprovedRequestForDate = (dateStr) => {
    return shiftRequests.find(r => r.target_date === dateStr && r.status === "approved");
  };

  const handleDayClick = (day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    // Don't allow requests for past dates
    if (isBefore(day, startOfDay(new Date()))) return;
    // Don't allow if already have a pending request
    if (getRequestForDate(dateStr)) return;

    const shift = getShiftForDate(day);
    const isScheduled = shift && shift.status !== "absent";
    setSelectedDate(dateStr);
    setSelectedDateScheduled(isScheduled);
    setRequestModalOpen(true);
  };

  // Pending direct cover requests for me
  const pendingCoverRequests = coverRequests.filter(r => r.status === "pending" && r.cover_response === "pending" && r.cover_mode !== "open_bid");

  // Open bids from others (not my own, and not already claimed)
  const availableOpenBids = openBidRequests.filter(r => 
    r.requester_email !== employeeEmail && !r.cover_employee_email
  );

  return (
    <div className="space-y-6">
      {/* Pending Direct Cover Requests for this employee */}
      {pendingCoverRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-purple-700 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Cover Requests for You
          </h3>
          {pendingCoverRequests.map(req => (
            <div key={req.id} className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {req.requester_name} wants you to cover on {format(new Date(req.target_date + "T12:00:00"), "EEE, MMM d")}
                </p>
                {req.notes && <p className="text-xs text-slate-500 mt-0.5">{req.notes}</p>}
              </div>
              <Button size="sm" onClick={() => respondCoverMutation.mutate({ id: req.id, response: "accepted" })}
                disabled={respondCoverMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 h-8">
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => respondCoverMutation.mutate({ id: req.id, response: "declined" })}
                disabled={respondCoverMutation.isPending} className="h-8">
                Decline
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Open Bid Shifts Available */}
      {availableOpenBids.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-teal-700 flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            Open Shifts — Volunteers Needed
          </h3>
          {availableOpenBids.map(req => (
            <div key={req.id} className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {req.requester_name} needs coverage on {format(new Date(req.target_date + "T12:00:00"), "EEE, MMM d")}
                </p>
                {req.notes && <p className="text-xs text-slate-500 mt-0.5">{req.notes}</p>}
              </div>
              <Button size="sm" onClick={() => volunteerBidMutation.mutate({ id: req.id })}
                disabled={volunteerBidMutation.isPending} className="bg-teal-600 hover:bg-teal-700 h-8">
                {volunteerBidMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "I'll Cover"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t("dashboard", "mySchedule", "My Schedule")}</h2>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addDays(currentMonth, -30))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="w-40 text-center font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addDays(currentMonth, 30))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="p-2 text-center font-semibold text-slate-600 text-sm bg-slate-50">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square border-b border-r bg-slate-50" />
          ))}

          {calendarDays.map(day => {
            const dateStr = format(day, "yyyy-MM-dd");
            const shift = getShiftForDate(day);
            const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
            const isPast = isBefore(day, startOfDay(new Date()));
            const pendingReq = getRequestForDate(dateStr);
            const approvedReq = getApprovedRequestForDate(dateStr);
            const isScheduled = shift && shift.status !== "absent";

            return (
              <div
                key={dateStr}
                className={cn(
                  "aspect-square border-b border-r p-1.5 sm:p-2 relative transition-all",
                  !isPast && "cursor-pointer hover:ring-2 hover:ring-inset hover:ring-slate-300",
                  isPast && "opacity-60"
                )}
                style={{
                  backgroundColor: shift ? (
                    shift.status === 'absent' ? 'white' :
                    shift.status === 'cancelled' ? '#fef3c7' :
                    (shift._fromCrew ? shift.crew_color : getCrewColor(shift.crew_schedule_id)) + "20"
                  ) : "white"
                }}
                onClick={() => handleDayClick(day)}
              >
                <div className={cn("text-sm font-medium mb-0.5", isToday ? "text-blue-600 font-bold" : "text-slate-700")}>
                  {format(day, "d")}
                </div>

                {shift && (
                  <div className="space-y-0.5">
                    {shift.status === 'absent' ? (
                      <div className="text-[10px] text-slate-400">Off</div>
                    ) : shift.status === 'cancelled' ? (
                      <div className="text-[10px] font-semibold text-yellow-700">Vacation</div>
                    ) : (
                      <div
                        className="text-[10px] font-semibold px-1 py-0.5 rounded truncate"
                        style={{
                          backgroundColor: (shift._fromCrew ? shift.crew_color : getCrewColor(shift.crew_schedule_id)) + "40",
                          color: shift._fromCrew ? shift.crew_color : getCrewColor(shift.crew_schedule_id)
                        }}
                      >
                        {shift._fromCrew
                          ? (shift.shift_start_time && shift.shift_end_time
                              ? `${shift.shift_start_time.replace(':00','')}–${shift.shift_end_time.replace(':00','')}`
                              : shift.crew_name)
                          : shift.crew_name
                        }
                      </div>
                    )}
                  </div>
                )}

                {/* Request status indicators */}
                {pendingReq && (
                  <div className="absolute bottom-1 right-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      pendingReq.request_type === "vacation" ? "bg-amber-500" :
                      pendingReq.request_type === "overtime" ? "bg-blue-500" : "bg-purple-500"
                    )} title={`Pending ${pendingReq.request_type} request`} />
                  </div>
                )}
                {approvedReq && (
                  <div className="absolute bottom-1 right-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" title="Request approved" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
          <span className="text-slate-600">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
          <span className="text-slate-600">Vacation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-white border border-slate-300" />
          <span className="text-slate-600">Off Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-600">Pending request</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-600">Approved</span>
        </div>
      </div>

      {/* My Requests */}
      {shiftRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">My Requests</h3>
          <div className="space-y-2">
            {shiftRequests.slice(0, 10).map(req => {
              const typeIcon = req.request_type === "vacation" ? Palmtree : req.request_type === "overtime" ? Clock : ArrowRightLeft;
              const TypeIcon = typeIcon;
              const statusColor = req.status === "pending" ? "bg-amber-100 text-amber-800" : req.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800";
              return (
                <div key={req.id} className="flex items-center gap-2 p-2 bg-white border rounded-lg text-sm">
                  <TypeIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="flex-1 truncate text-slate-700">
                    {format(new Date(req.target_date + "T12:00:00"), "EEE, MMM d")}
                    {req.cover_mode === "open_bid" ? " (open bid)" : ""}
                    {req.cover_employee_name && ` → ${req.cover_employee_name}`}
                  </span>
                  <Badge className={cn("text-xs", statusColor)}>{req.status}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Request Modal */}
      <ShiftRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        date={selectedDate}
        isScheduled={selectedDateScheduled}
        allEmployees={allOrgEmployees}
        employee={employee}
        onSubmit={(data) => createRequestMutation.mutate(data)}
        isLoading={createRequestMutation.isPending}
      />
    </div>
  );
}