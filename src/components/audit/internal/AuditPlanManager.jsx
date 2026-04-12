// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, 
  Sparkles, Loader2, Check, CalendarDays, LayoutGrid
} from "lucide-react";
import { toast } from "sonner";
import { format, addMonths, startOfQuarter, startOfYear } from "date-fns";
import AuditAssignmentModal from "./AuditAssignmentModal.jsx";
import AuditCalendarView from "./AuditCalendarView.jsx";
import { AuditPlanRepo, ScheduledAuditRepo } from "@/lib/adapters/database";

export default function AuditPlanManager({ 
  organization, user, standards, sections, plans, scheduledAudits, employees = [], onRefresh 
}) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingAudit, setEditingAudit] = useState(null);
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" or "quarters"

  const currentYearPlan = plans.find(p => p.year === selectedYear);
  const planAudits = scheduledAudits.filter(a => a.plan_id === currentYearPlan?.id);

  const auditsByQuarter = useMemo(() => {
    const quarters = { 1: [], 2: [], 3: [], 4: [] };
    planAudits.forEach(audit => {
      if (audit.quarter) {
        quarters[audit.quarter].push(audit);
      }
    });
    return quarters;
  }, [planAudits]);

  const generateAnnualPlan = async () => {
    if (standards.length === 0 || sections.length === 0) {
      toast.error("Add standards and sections first");
      return;
    }

    setIsGenerating(true);
    try {
      // Create or get plan
      let plan = currentYearPlan;
      if (!plan) {
        plan = await AuditPlanRepo.create({
          organization_id: organization.id,
          title: `${selectedYear} Annual Audit Plan`,
          name: `${selectedYear} Annual Audit Plan`,
          year: selectedYear,
          standards_included: standards.map(s => ({ standard_id: s.id, standard_name: s.name })),
          status: "draft"
        });
      }

      // Generate scheduled audits for each section based on frequency
      const activeSections = sections.filter(s => s.status === "active");
      let totalScheduled = 0;

      for (const section of activeSections) {
        const frequency = section.audit_frequency || "quarterly";
        const standard = standards.find(s => s.id === section.standard_id);

        // Calculate audit dates based on frequency
        const auditDates = calculateAuditDates(selectedYear, frequency);

        for (const { date, quarter } of auditDates) {
          // Check if already scheduled
          const existing = scheduledAudits.find(a => 
            a.section_id === section.id && 
            a.quarter === quarter &&
            new Date(a.due_date).getFullYear() === selectedYear
          );

          if (!existing) {
            await ScheduledAuditRepo.create({
              organization_id: organization.id,
              audit_plan_id: plan.id,
              plan_id: plan.id,
              standard_id: section.standard_id,
              standard_name: standard?.name,
              title: `${section.section_number || ''} ${section.title} - Q${quarter}`.trim(),
              section_id: section.id,
              section_number: section.section_number,
              section_title: section.title,
              auditor_email: section.default_auditor_email || user?.email,
              auditor_name: section.default_auditor_name || user?.full_name,
              scheduled_date: format(date, "yyyy-MM-dd"),
              due_date: format(date, "yyyy-MM-dd"),
              frequency,
              quarter,
              status: "scheduled"
            });
            totalScheduled++;
          }
        }
      }

      // Update plan
      await AuditPlanRepo.update(plan.id, {
        total_scheduled_audits: (plan.total_scheduled_audits || 0) + totalScheduled,
        status: "active"
      });

      toast.success(`Generated ${totalScheduled} scheduled audits`);
      onRefresh();
    } catch (error) {
      console.error("Error generating plan:", error);
      toast.error("Failed to generate plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateAuditDates = (year, frequency) => {
    const dates = [];
    const yearStart = startOfYear(new Date(year, 0, 1));

    switch (frequency) {
      case "monthly":
        for (let month = 0; month < 12; month++) {
          const date = addMonths(yearStart, month);
          dates.push({ date, quarter: Math.floor(month / 3) + 1 });
        }
        break;
      case "quarterly":
        for (let q = 1; q <= 4; q++) {
          const date = startOfQuarter(new Date(year, (q - 1) * 3, 1));
          dates.push({ date, quarter: q });
        }
        break;
      case "semi_annual":
        dates.push({ date: new Date(year, 0, 15), quarter: 1 });
        dates.push({ date: new Date(year, 6, 15), quarter: 3 });
        break;
      case "annual":
        dates.push({ date: new Date(year, 0, 15), quarter: 1 });
        break;
    }
    return dates;
  };

  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-amber-100 text-amber-800",
    completed: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-800"
  };

  const QuarterCard = ({ quarter, audits }) => {
    const completed = audits.filter(a => a.status === "completed").length;
    const overdue = audits.filter(a => a.status === "overdue" || 
      (a.status === "scheduled" && new Date(a.due_date) < new Date())).length;

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Q{quarter}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{completed}/{audits.length}</Badge>
              {overdue > 0 && <Badge variant="destructive">{overdue} overdue</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No audits scheduled</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {audits.map(audit => (
                <div 
                  key={audit.id}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer"
                  onClick={() => setEditingAudit(audit)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{audit.section_title}</p>
                    <p className="text-xs text-slate-500">{audit.auditor_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-500">
                      {format(new Date(audit.due_date), "MMM d")}
                    </span>
                    <Badge className={statusColors[audit.status]} variant="secondary">
                      {audit.status === "completed" && <Check className="w-3 h-3 mr-1" />}
                      {audit.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(new Date().getFullYear() - 1)}>
                {new Date().getFullYear() - 1}
              </SelectItem>
              <SelectItem value={String(new Date().getFullYear())}>
                {new Date().getFullYear()}
              </SelectItem>
              <SelectItem value={String(new Date().getFullYear() + 1)}>
                {new Date().getFullYear() + 1}
              </SelectItem>
            </SelectContent>
          </Select>
          
          {currentYearPlan && (
            <Badge variant="outline" className="text-sm">
              {planAudits.filter(a => a.status === "completed").length} / {planAudits.length} complete
            </Badge>
          )}
        </div>

        <Button onClick={generateAnnualPlan} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {currentYearPlan ? "Update Plan" : "Generate Annual Plan"}
        </Button>
      </div>

      {/* View Mode Toggle */}
      {currentYearPlan && (
        <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="quarters" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Quarters
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Plan Content */}
      {!currentYearPlan ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">No Audit Plan for {selectedYear}</h3>
            <p className="text-sm text-slate-500 mb-4">
              Generate an annual plan to schedule audits across all sections
            </p>
            <Button onClick={generateAnnualPlan} disabled={isGenerating}>
              Generate {selectedYear} Plan
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "calendar" ? (
        <AuditCalendarView 
          scheduledAudits={planAudits}
          standards={standards}
          onAuditClick={setEditingAudit}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(q => (
            <QuarterCard key={q} quarter={q} audits={auditsByQuarter[q]} />
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {editingAudit && (
        <AuditAssignmentModal 
          open={!!editingAudit}
          onClose={() => setEditingAudit(null)}
          audit={editingAudit}
          employees={employees}
          onSuccess={() => {
            setEditingAudit(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}