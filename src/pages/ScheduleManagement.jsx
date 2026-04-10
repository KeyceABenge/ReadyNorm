// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Download, Palmtree, Calendar, Megaphone, Pencil, Trash2, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import SimulateChangeButton from "@/components/simulation/SimulateChangeButton";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format, addMonths, subMonths, eachDayOfInterval, parseISO } from "date-fns";
import CrewScheduleFormModal from "@/components/scheduling/CrewScheduleFormModal";
import ShiftEditModal from "@/components/scheduling/ShiftEditModal";
import ScheduleCalendarGrid from "@/components/scheduling/ScheduleCalendarGrid";
import { useScheduleCalculator } from "@/components/scheduling/useScheduleCalculator";
import { createPageUrl } from "@/utils";
import ScheduleEmployeeManager from "@/components/scheduling/ScheduleEmployeeManager";
import ShiftRequestsPanel from "@/components/scheduling/ShiftRequestsPanel";
import { CrewRepo, CrewScheduleRepo, EmployeeRepo, EmployeeShiftRepo, OrganizationRepo, PlantExceptionRepo, RoleConfigRepo } from "@/lib/adapters/database";

export default function ScheduleManagement() {
  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [vacationModalOpen, setVacationModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [showAnnouncementInput, setShowAnnouncementInput] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [hiddenCrews, setHiddenCrews] = useState(() => {
    const saved = localStorage.getItem("schedule_hiddenCrews");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [hiddenEmployees, setHiddenEmployees] = useState(() => {
    const saved = localStorage.getItem("schedule_hiddenEmployees");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [hideUnassigned, setHideUnassigned] = useState(() => {
    return localStorage.getItem("schedule_hideUnassigned") === "true";
  });
  const [crewOrder, setCrewOrder] = useState(() => {
    const saved = localStorage.getItem("schedule_crewOrder");
    return saved ? JSON.parse(saved) : [];
  });
  const calendarRef = useRef(null);
  const queryClient = useQueryClient();

  // Persist visibility & order preferences to localStorage
  useEffect(() => { localStorage.setItem("schedule_hiddenCrews", JSON.stringify([...hiddenCrews])); }, [hiddenCrews]);
  useEffect(() => { localStorage.setItem("schedule_hiddenEmployees", JSON.stringify([...hiddenEmployees])); }, [hiddenEmployees]);
  useEffect(() => { localStorage.setItem("schedule_hideUnassigned", String(hideUnassigned)); }, [hideUnassigned]);
  useEffect(() => { localStorage.setItem("schedule_crewOrder", JSON.stringify(crewOrder)); }, [crewOrder]);

  // Org resolution
  const { data: organizationId } = useQuery({
    queryKey: ["my_org_id"],
    queryFn: async () => {
      const storedSiteCode = localStorage.getItem("site_code");
      if (!storedSiteCode) { window.location.href = createPageUrl("Home"); return null; }
      const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
      if (orgs.length > 0) return orgs[0].id;
      localStorage.removeItem("site_code");
      window.location.href = createPageUrl("Home");
      return null;
    },
  });

  // Data queries
  const { data: crews = [] } = useQuery({
    queryKey: ["crews", organizationId],
    queryFn: () => CrewRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
  });

  const { data: crewSchedules = [] } = useQuery({
    queryKey: ["crew_schedules", organizationId],
    queryFn: () => CrewScheduleRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
  });

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["employees", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
  });

  const { data: employeeShifts = [] } = useQuery({
    queryKey: ["employee_shifts", organizationId],
    queryFn: () => EmployeeShiftRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
  });

  const { data: plantExceptions = [] } = useQuery({
    queryKey: ["plant_exceptions", organizationId],
    queryFn: () => PlantExceptionRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
  });

  const { data: roleConfigs = [] } = useQuery({
    queryKey: ["role_configs", organizationId],
    queryFn: () => RoleConfigRepo.filter({ organization_id: organizationId }, "sort_order"),
    enabled: !!organizationId,
  });

  // Compute schedule
  const { scheduleMap, closedDates, days } = useScheduleCalculator({
    currentMonth,
    crews,
    crewSchedules,
    employees,
    employeeShifts,
    plantExceptions,
  });

  // Mutations
  const crewMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (id) await CrewScheduleRepo.update(id, data);
      else await CrewScheduleRepo.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew_schedules"] });
      setCrewModalOpen(false);
      setEditingCrew(null);
      toast.success("Schedule saved");
    },
  });

  const shiftSaveMutation = useMutation({
    mutationFn: async ({ employeeEmail, employeeName, action, startDate, endDate, startTime, endTime, crewScheduleId, notes }) => {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const datesToSet = eachDayOfInterval({ start, end });

      // Find crew name from schedule id
      let crewName = "";
      if (action === "scheduled" && crewScheduleId && crewScheduleId !== "custom" && crewScheduleId !== "vacation") {
        const cs = crewSchedules.find(s => s.id === crewScheduleId);
        crewName = cs?.crew_name || "";
      } else if (action === "cancelled") {
        crewName = "Vacation";
      } else if (action === "absent") {
        crewName = "Absent";
      }

      const shiftsToCreate = datesToSet.map((day) => ({
        organization_id: organizationId,
        employee_email: employeeEmail,
        employee_name: employeeName,
        crew_schedule_id: crewScheduleId || "custom",
        crew_name: crewName,
        shift_date: format(day, "yyyy-MM-dd"),
        shift_start_time: startTime || "00:00",
        shift_end_time: endTime || "00:00",
        status: action,
        notes,
      }));

      // Delete existing overrides for these dates
      const existingShifts = employeeShifts.filter(
        (s) => s.employee_email === employeeEmail &&
          datesToSet.some((d) => format(d, "yyyy-MM-dd") === s.shift_date)
      );
      await Promise.all(existingShifts.map((s) => EmployeeShiftRepo.delete(s.id)));

      if (shiftsToCreate.length > 0) {
        await EmployeeShiftRepo.bulkCreate(shiftsToCreate);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_shifts"] });
      setVacationModalOpen(false);
      toast.success("Schedule updated");
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => EmployeeShiftRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_shifts"] });
      setVacationModalOpen(false);
      toast.success("Override removed");
    },
  });

  // Cell click handler
  const handleCellClick = (employee, dateStr, entry) => {
    setSelectedEmployee(employee);
    setSelectedDate(dateStr);
    setSelectedEntry(entry || null);
    setVacationModalOpen(true);
  };

  // PDF export — clone grid off-screen with no overflow so all days render, then capture
  const exportToPDF = async () => {
    if (!calendarRef.current) return;
    setExportingPDF(true);
    try {
      // Clone the calendar into an off-screen container with no overflow constraints
      const clone = calendarRef.current.cloneNode(true);
      clone.style.position = "absolute";
      clone.style.left = "-99999px";
      clone.style.top = "0";
      clone.style.width = "auto";
      clone.style.maxWidth = "none";
      clone.style.overflow = "visible";

      // Remove all overflow clipping inside the clone
      clone.querySelectorAll("*").forEach(child => {
        const cs = window.getComputedStyle(child);
        if (cs.overflow === "auto" || cs.overflow === "hidden" || cs.overflowX === "auto" || cs.overflowX === "hidden") {
          child.style.overflow = "visible";
          child.style.overflowX = "visible";
        }
        // Expand inline-block containers
        if (cs.display === "inline-block") {
          child.style.display = "block";
        }
      });

      // Remove sticky positioning which can cause rendering issues
      clone.querySelectorAll("*").forEach(child => {
        if (window.getComputedStyle(child).position === "sticky") {
          child.style.position = "relative";
        }
      });

      // Ensure flex items are vertically centered for proper PDF rendering
      clone.querySelectorAll("*").forEach(child => {
        const cs = window.getComputedStyle(child);
        if (cs.display === "flex" && cs.alignItems === "center") {
          child.style.alignItems = "center";
        }
      });

      // Remove today highlight from PDF clone
      clone.querySelectorAll(".bg-blue-50, .bg-blue-50\\/30").forEach(el => {
        el.classList.remove("bg-blue-50", "bg-blue-50/30");
      });
      // Remove blue circle from today's date number
      clone.querySelectorAll(".bg-blue-600.rounded-full").forEach(el => {
        el.classList.remove("bg-blue-600", "text-white", "rounded-full");
        el.classList.add("text-slate-800");
        el.style.width = "auto";
        el.style.height = "auto";
        el.style.display = "block";
        el.style.backgroundColor = "transparent";
      });
      // Remove blue text color from today's day name
      clone.querySelectorAll(".text-blue-600").forEach(el => {
        el.classList.remove("text-blue-600");
        el.classList.add("text-slate-500");
      });

      // Hide the announcement edit controls in PDF
      clone.querySelectorAll("[data-pdf-hide]").forEach(el => {
        el.style.display = "none";
      });

      // Add bottom padding to prevent clipping last rows
      clone.style.paddingBottom = "40px";

      document.body.appendChild(clone);

      // Let browser layout the clone
      await new Promise(r => setTimeout(r, 150));

      const fullWidth = clone.scrollWidth;
      const fullHeight = clone.scrollHeight;

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth + 50,
        scrollX: 0,
        scrollY: 0,
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/png");

      // Tabloid landscape: 17×11 inches = 431.8×279.4 mm
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "tabloid" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;

      const imgAspect = canvas.width / canvas.height;
      let imgW = availW;
      let imgH = imgW / imgAspect;
      if (imgH > availH) {
        imgH = availH;
        imgW = imgH * imgAspect;
      }

      const x = margin + (availW - imgW) / 2;
      const y = margin;

      pdf.addImage(imgData, "PNG", x, y, imgW, imgH);
      pdf.save(`schedule-${format(currentMonth, "yyyy-MM")}.pdf`);
      toast.success("Exported to PDF");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF");
    } finally {
      setExportingPDF(false);
    }
  };

  if (!organizationId || empLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-slate-600" />
              Schedule Calendar
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Auto-populated from crew schedules. Click a cell to add time off.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setRosterModalOpen(true)} variant="outline" size="sm">
              <Users className="w-4 h-4 mr-1" />
              Roster
            </Button>
            <SimulateChangeButton
              organizationId={organizationId}
              scenarioType="staffing"
              label="Simulate"
              variant="outline"
            />
            {!announcementText && !showAnnouncementInput && (
              <Button onClick={() => setShowAnnouncementInput(true)} variant="outline" size="sm">
                <Megaphone className="w-4 h-4 mr-1" />
                Announcement
              </Button>
            )}
            <Button onClick={exportToPDF} disabled={exportingPDF} variant="outline" size="sm">
              {exportingPDF ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
              PDF
            </Button>
            <Button
              onClick={() => { setEditingCrew(null); setCrewModalOpen(true); }}
              className="bg-slate-900 hover:bg-slate-800"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Schedule
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-4 rounded bg-blue-100 border border-blue-300" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-4 rounded bg-amber-100 border border-amber-300 flex items-center justify-center">
              <Palmtree className="w-2.5 h-2.5 text-amber-600" />
            </div>
            <span>Vacation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-4 rounded bg-slate-100 border border-slate-200 flex items-center justify-center">
              <span className="text-[8px] text-slate-400 font-bold">OFF</span>
            </div>
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-4 rounded bg-red-50 border border-red-200 flex items-center justify-center">
              <span className="text-[8px] text-red-400 font-bold">CLO</span>
            </div>
            <span>Plant Closed</span>
          </div>
        </div>

        {/* Calendar Grid + Announcement Banner (inside ref for PDF export) */}
        <div ref={calendarRef}>
          {/* Announcement Banner */}
          {announcementText && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900 font-medium whitespace-pre-wrap flex-1">{announcementText}</p>
              <button data-pdf-hide onClick={() => setShowAnnouncementInput(true)} className="text-amber-500 hover:text-amber-700 flex-shrink-0">
                <Pencil className="w-4 h-4" />
              </button>
              <button data-pdf-hide onClick={() => { setAnnouncementText(""); setShowAnnouncementInput(false); }} className="text-amber-500 hover:text-amber-700 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          {showAnnouncementInput && (
            <div className="bg-white border rounded-xl p-4 mb-3 space-y-2" data-pdf-hide>
              <label className="text-sm font-medium text-slate-700">Announcement Banner</label>
              <Textarea
                placeholder="Enter important information to display on the schedule..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="min-h-[80px] rounded-lg"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAnnouncementInput(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
          <ScheduleCalendarGrid
            days={days}
            scheduleMap={scheduleMap}
            closedDates={closedDates}
            crews={crews}
            crewSchedules={crewSchedules}
            employees={employees}
            roleConfigs={roleConfigs}
            currentMonth={currentMonth}
            onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
            onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
            onCellClick={handleCellClick}
            hiddenCrews={hiddenCrews}
            hiddenEmployees={hiddenEmployees}
            hideUnassigned={hideUnassigned}
            onHideCrew={(crewId) => setHiddenCrews(prev => new Set([...prev, crewId]))}
            onHideEmployee={(empId) => setHiddenEmployees(prev => new Set([...prev, empId]))}
            onHideUnassigned={() => setHideUnassigned(true)}
            onShowAll={() => { setHiddenCrews(new Set()); setHiddenEmployees(new Set()); setHideUnassigned(false); }}
            crewOrder={crewOrder}
            onReorderCrews={setCrewOrder}
          />
        </div>

        {/* Shift Requests */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mt-6">
          <h3 className="font-semibold text-sm text-slate-700 mb-3">Employee Requests</h3>
          <ShiftRequestsPanel organizationId={organizationId} crews={crews} />
        </div>

        {/* Shift Presets */}
        {crewSchedules.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-4 mt-6">
            <h3 className="font-semibold text-sm text-slate-700 mb-3">Shift Presets</h3>
            <div className="flex flex-wrap gap-2">
              {crewSchedules.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => { setEditingCrew(schedule); setCrewModalOpen(true); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border text-sm transition-colors"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: schedule.crew_color || "#64748b" }} />
                  <span className="font-medium text-slate-700">{schedule.crew_name}</span>
                  <span className="text-slate-400 text-xs">
                    {schedule.shift_start_time} – {schedule.shift_end_time}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CrewScheduleFormModal
        open={crewModalOpen}
        onOpenChange={setCrewModalOpen}
        schedule={editingCrew}
        crews={crews}
        onSave={(data) => crewMutation.mutate({ id: editingCrew?.id, data })}
        isLoading={crewMutation.isPending}
      />

      <ScheduleEmployeeManager
        open={rosterModalOpen}
        onOpenChange={setRosterModalOpen}
        employees={employees}
        crews={crews}
        organizationId={organizationId}
        hiddenCrews={hiddenCrews}
        hiddenEmployees={hiddenEmployees}
        hideUnassigned={hideUnassigned}
        onToggleHideCrew={(crewId) => setHiddenCrews(prev => {
          const next = new Set(prev);
          if (next.has(crewId)) next.delete(crewId); else next.add(crewId);
          return next;
        })}
        onToggleHideEmployee={(empId) => setHiddenEmployees(prev => {
          const next = new Set(prev);
          if (next.has(empId)) next.delete(empId); else next.add(empId);
          return next;
        })}
        onToggleHideUnassigned={() => setHideUnassigned(prev => !prev)}
        onShowAll={() => { setHiddenCrews(new Set()); setHiddenEmployees(new Set()); setHideUnassigned(false); }}
      />

      {selectedEmployee && selectedDate && (
        <ShiftEditModal
          open={vacationModalOpen}
          onOpenChange={setVacationModalOpen}
          employee={selectedEmployee}
          date={selectedDate}
          existingEntry={selectedEntry}
          crewSchedules={crewSchedules}
          isLoading={shiftSaveMutation.isPending || deleteShiftMutation.isPending}
          onSave={({ action, startDate, endDate, startTime, endTime, crewScheduleId, notes }) => {
            shiftSaveMutation.mutate({
              employeeEmail: selectedEmployee.email,
              employeeName: selectedEmployee.name,
              action,
              startDate,
              endDate,
              startTime,
              endTime,
              crewScheduleId,
              notes,
            });
          }}
          onDelete={(id) => {
            if (id) deleteShiftMutation.mutate(id);
          }}
        />
      )}
    </div>
  );
}