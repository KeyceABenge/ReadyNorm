// @ts-nocheck
import { useState, useMemo, useEffect } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RoleTargetsBreakdown from "@/components/settings/RoleTargetsBreakdown";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, ChevronUp, Loader2, Settings2, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleConfigRepo, TaskRepo, OrganizationRepo } from "@/lib/adapters/database";

const ALL_DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" }
];

const DEFAULT_CYCLE_DAYS = {
  weekly: 5,
  biweekly: 10,
  monthly: 20,
  bimonthly: 40,
  quarterly: 60,
  annually: 250
};

function normalizeFrequency(f) {
  if (!f) return "other";
  const lower = f.toLowerCase().trim().replace(/[-_\s]+/g, "");
  if (lower === "daily") return "daily";
  if (lower === "weekly") return "weekly";
  if (lower === "biweekly") return "biweekly";
  if (lower === "monthly") return "monthly";
  if (lower === "bimonthly") return "bimonthly";
  if (lower === "quarterly") return "quarterly";
  if (lower === "annually" || lower === "annual") return "annually";
  return "other";
}

/**
 * Determine how many times daily tasks regenerate per day.
 * Looks at the daily frequency_settings reset_times array.
 * If daily has 2 reset times (e.g. 05:00 and 17:00), tasks regenerate per shift,
 * meaning each shift gets the FULL pool — not split.
 */
function getDailyResetsPerDay(settings) {
  const freqSettings = settings?.frequency_settings || {};
  const dailySettings = freqSettings.daily || {};
  const resetTimes = dailySettings.reset_times || [];
  // If there are multiple reset times, daily tasks regenerate that many times per day
  return Math.max(1, resetTimes.length);
}

/**
 * Format a reset time string like "05:00" or "17:00" to "5:00 AM" / "5:00 PM"
 */
function formatResetTime(t) {
  if (!t) return t;
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export default function CompletionTargetsPanel({ settings, tasks: propTasks, onSave, isLoading, organizationId }) {
  // Fallback: if parent didn't resolve org yet, look it up ourselves from localStorage
  const fallbackSiteCode = (!organizationId && !settings?.organization_id)
    ? localStorage.getItem('site_code')
    : null;
  const { data: fallbackOrg = null } = useQuery({
    queryKey: ["organization_by_site_code", fallbackSiteCode],
    queryFn: async () => {
      const orgs = await OrganizationRepo.filter({ site_code: fallbackSiteCode, status: "active" });
      return orgs[0] || null;
    },
    enabled: !!fallbackSiteCode,
    staleTime: 10 * 60 * 1000,
  });
  const orgId = organizationId || settings?.organization_id || fallbackOrg?.id || null;
  const queryClient = useQueryClient();
  const { data: roleConfigs = [], isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: ["role_configs", orgId],
    queryFn: () => RoleConfigRepo.filter({ organization_id: orgId }, "sort_order"),
    enabled: !!orgId,
    staleTime: 0,
  });

  // Self-fetch tasks if none provided, using same query key as ManagerDashboard for cache sharing
  const { data: fetchedTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", orgId],
    queryFn: () => TaskRepo.filter({ organization_id: orgId }, "-created_date", 2000),
    enabled: !!orgId && (!propTasks || propTasks.length === 0),
    staleTime: 60000,
  });

  const tasks = (propTasks && propTasks.length > 0) ? propTasks : fetchedTasks;

  const cts = settings?.completion_target_settings || {};
  const [workingDays, setWorkingDays] = useState(cts.working_days || ["monday", "tuesday", "wednesday", "thursday", "friday"]);
  // shiftsPerDay is derived from the daily reset times configured in Task Regeneration.
  // We still persist it in completion_target_settings so non-daily quota math has a stable value,
  // but we don't let the user override it here — they control it via reset times.
  const dailyResetsPerDay = getDailyResetsPerDay(settings);
  const [shiftsPerDay, setShiftsPerDay] = useState(cts.shifts_per_day || dailyResetsPerDay);
  const [cycleDays, setCycleDays] = useState({ ...DEFAULT_CYCLE_DAYS, ...(cts.cycle_days || {}) });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync state when settings first loads from DB.
  // Only runs once (when settings.id goes from undefined -> UUID).
  // Does NOT reset if user has already made changes (hasChanges guard).
  useEffect(() => {
    if (!settings?.id) return;
    const c = settings.completion_target_settings || {};
    setWorkingDays(c.working_days || ["monday", "tuesday", "wednesday", "thursday", "friday"]);
    // Always re-derive shifts from reset times on load — keeps them in sync
    const resets = getDailyResetsPerDay(settings);
    setShiftsPerDay(resets);
    setCycleDays({ ...DEFAULT_CYCLE_DAYS, ...(c.cycle_days || {}) });
    // Only clear dirty flag on initial load, not on background refetch
    setHasChanges(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.id]); // intentionally only on id change, not every settings update

  // Keep shiftsPerDay in sync whenever reset times change (e.g. user saves Task Regeneration tab)
  useEffect(() => {
    const resets = getDailyResetsPerDay(settings);
    setShiftsPerDay(resets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.frequency_settings?.daily?.reset_times?.length]);

  const toggleDay = (dayKey) => {
    const updated = workingDays.includes(dayKey)
      ? workingDays.filter(d => d !== dayKey)
      : [...workingDays, dayKey];
    if (updated.length === 0) return;
    setWorkingDays(updated);
    setHasChanges(true);
  };

  // Build a preview settings object that reflects the current (possibly unsaved) UI state
  const previewSettings = useMemo(() => ({
    ...settings,
    completion_target_settings: {
      working_days: workingDays,
      shifts_per_day: shiftsPerDay,
      cycle_days: cycleDays
    }
  }), [settings, workingDays, shiftsPerDay, cycleDays]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        completion_target_settings: {
          working_days: workingDays,
          shifts_per_day: shiftsPerDay,
          cycle_days: cycleDays
        }
      });
      setHasChanges(false);
    } catch (e) {
      console.error("[CompletionTargetsPanel] Save failed:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const freqLabel = (f) => f.charAt(0).toUpperCase() + f.slice(1);

  if (tasksLoading && tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-2" />
          <span className="text-sm text-slate-500">Loading task data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quota Calculation Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Quota Calculation
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Define your operating days and shifts per day. These values determine how task quotas are distributed across shifts.
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              size="sm"
              className={cn(
                "shrink-0 min-w-[120px]",
                hasChanges
                  ? "bg-slate-900 hover:bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
              ) : hasChanges ? (
                <><Save className="w-3.5 h-3.5 mr-1.5" />Save Changes</>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Saved</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-sm font-medium">Working Days</Label>
            <p className="text-xs text-slate-500 mb-2">Select the days your facility operates</p>
            <div className="flex gap-1.5">
              {ALL_DAYS.map(day => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-medium transition-all border",
                    workingDays.includes(day.key)
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">{workingDays.length} working days/week</p>
          </div>

          <div>
            <Label className="text-sm font-medium">Shifts Per Day</Label>
            <p className="text-xs text-slate-500 mb-2">Derived from your daily task reset times in the Task Regeneration tab</p>
            <div className="flex items-center gap-3">
              <div className="w-20 h-9 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-medium text-slate-700 text-sm select-none">
                {dailyResetsPerDay}
              </div>
              <div className="text-sm text-slate-600">
                {dailyResetsPerDay} reset{dailyResetsPerDay !== 1 ? 's' : ''} × {workingDays.length} days = {dailyResetsPerDay * workingDays.length} shift-completions/week
                {(() => {
                  const times = (settings?.frequency_settings?.daily?.reset_times || []);
                  if (times.length === 0) return null;
                  return <span className="ml-1 text-slate-400">({times.map(formatResetTime).join(', ')})</span>;
                })()}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Each reset produces the <strong>full daily task pool</strong> — tasks are not split between resets.
              To change the number of shifts, update the reset times in <strong>Task Regeneration</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced: Cycle length configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Cycle Lengths
          </CardTitle>
          <p className="text-xs text-slate-500">
            Configure how many working days are in each frequency cycle. These affect per-shift quota calculations.
          </p>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-3"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showAdvanced ? "Hide cycle settings" : "Show cycle settings"}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border">
              {Object.entries(cycleDays).map(([freq, days]) => (
                <div key={freq}>
                  <Label className="text-xs capitalize">{freqLabel(freq)} cycle</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      min={1}
                      value={days}
                      onChange={(e) => {
                        setCycleDays(prev => ({ ...prev, [freq]: parseInt(e.target.value) || days }));
                        setHasChanges(true);
                      }}
                      className="h-8 text-sm w-16"
                    />
                    <span className="text-xs text-slate-500">work days</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role-based targets */}
      <RoleTargetsBreakdown
        tasks={tasks}
        roleConfigs={roleConfigs}
        settings={previewSettings}
        onRoleQuotasSaved={async (extraData) => {
          // Refresh role configs after quota edits
          queryClient.invalidateQueries({ queryKey: ["role_configs", orgId] });
          // If extra site settings data to persist (e.g. excluded_roles_from_targets)
          if (extraData && typeof extraData === "object") {
            await onSave(extraData);
          }
        }}
      />
    </div>
  );
}