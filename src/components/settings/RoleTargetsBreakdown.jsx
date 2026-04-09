// @ts-nocheck
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Target, EyeOff, Eye, Sparkles, Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";


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

const DEFAULT_CYCLE_DAYS = {
  weekly: 5, biweekly: 10, monthly: 20, bimonthly: 40, quarterly: 60, annually: 250
};

const FREQ_ORDER = ["daily", "weekly", "biweekly", "monthly", "bimonthly", "quarterly", "annually"];

function freqLabel(f) {
  return f.charAt(0).toUpperCase() + f.slice(1);
}

export default function RoleTargetsBreakdown({ tasks, roleConfigs, settings, onRoleQuotasSaved }) {
  const cts = settings?.completion_target_settings || {};
  const workingDays = cts.working_days || ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const shiftsPerDay = cts.shifts_per_day || 2;
  const cycleDays = { ...DEFAULT_CYCLE_DAYS, ...(cts.cycle_days || {}) };
  const wdCount = workingDays.length;

  const freqSettings = settings?.frequency_settings || {};
  const dailyResets = (freqSettings.daily?.reset_times || []).length;
  const dailyResetsPerDay = Math.max(1, dailyResets);

  // Local state — sync with settings when they load
  const [hiddenRoles, setHiddenRoles] = useState(() => {
    return new Set(settings?.excluded_roles_from_targets || []);
  });
  const [hiddenInitialized, setHiddenInitialized] = useState(false);
  
  // Re-sync hidden roles when settings load (initial useState may run before settings are available)
  if (!hiddenInitialized && settings?.excluded_roles_from_targets?.length > 0) {
    setHiddenRoles(new Set(settings.excluded_roles_from_targets));
    setHiddenInitialized(true);
  }
  const [editingRole, setEditingRole] = useState(null); // role id being edited
  const [editQuotas, setEditQuotas] = useState({}); // { freq: number }
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const workTasks = useMemo(() => tasks.filter(t => !t.is_group), [tasks]);

  const uniqueTasks = useMemo(() => {
    const seen = new Set();
    return workTasks.filter(t => {
      const f = normalizeFrequency(t.frequency);
      const key = `${(t.title || "").toLowerCase().trim()}|${f}|${(t.area || "").toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [workTasks]);

  const roles = useMemo(() =>
    (roleConfigs || [])
      .filter(r => r.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)),
    [roleConfigs]
  );

  // Calculate auto targets for a role
  const calcAutoTargets = useCallback((eligibleTasks) => {
    const poolByFreq = {};
    eligibleTasks.forEach(t => {
      const f = normalizeFrequency(t.frequency);
      if (f === "other") return;
      poolByFreq[f] = (poolByFreq[f] || 0) + 1;
    });

    const targets = {};
    FREQ_ORDER.forEach(freq => {
      const pool = poolByFreq[freq] || 0;
      if (pool === 0) return;
      if (freq === "daily") {
        targets[freq] = dailyResetsPerDay >= shiftsPerDay ? pool : Math.ceil(pool / Math.ceil(shiftsPerDay / dailyResetsPerDay));
      } else {
        const cd = cycleDays[freq] || DEFAULT_CYCLE_DAYS[freq] || 20;
        targets[freq] = Math.ceil(pool / (cd * shiftsPerDay));
      }
    });
    return { poolByFreq, targets };
  }, [shiftsPerDay, cycleDays, dailyResetsPerDay]);

  // Build role breakdowns
  const roleBreakdowns = useMemo(() => {
    return roles.map(role => {
      const roleName = role.role_name;
      const eligibleTasks = uniqueTasks.filter(t => {
        const er = t.eligible_roles || [];
        return er.length === 0 || er.includes(roleName);
      });

      const { poolByFreq, targets: autoTargets } = calcAutoTargets(eligibleTasks);

      // Merge with saved quotas from RoleConfig.task_quotas
      const savedQuotas = role.task_quotas || {};
      const effectiveTargets = {};
      const freqBreakdown = [];
      let totalPerShift = 0;

      FREQ_ORDER.forEach(freq => {
        const pool = poolByFreq[freq] || 0;
        if (pool === 0) return;
        const auto = autoTargets[freq] || 0;
        const saved = savedQuotas[freq];
        const effective = (saved !== undefined && saved !== null && saved !== "") ? Number(saved) : auto;
        effectiveTargets[freq] = effective;
        totalPerShift += effective;
        freqBreakdown.push({ freq, pool, autoPerShift: auto, perShift: effective, isOverridden: saved !== undefined && saved !== null && saved !== "" });
      });

      const totalTasks = eligibleTasks.filter(t => normalizeFrequency(t.frequency) !== "other").length;

      return {
        role,
        roleName,
        totalTasks,
        totalPerShift,
        totalPerDay: totalPerShift * shiftsPerDay,
        totalPerWeek: totalPerShift * shiftsPerDay * wdCount,
        freqBreakdown,
        poolByFreq,
        autoTargets,
      };
    });
  }, [roles, uniqueTasks, shiftsPerDay, cycleDays, wdCount, dailyResetsPerDay, calcAutoTargets]);

  const unrestrictedCount = useMemo(() =>
    uniqueTasks.filter(t => !t.eligible_roles || t.eligible_roles.length === 0).length,
    [uniqueTasks]
  );

  // Toggle role visibility
  const toggleRoleVisibility = async (roleId) => {
    const next = new Set(hiddenRoles);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    setHiddenRoles(next);
    // Persist excluded roles to site settings
    if (onRoleQuotasSaved) {
      onRoleQuotasSaved({ excluded_roles_from_targets: Array.from(next) });
    }
  };

  // Start editing a role
  const startEditing = (role, breakdown) => {
    const currentQuotas = {};
    breakdown.freqBreakdown.forEach(({ freq, perShift }) => {
      currentQuotas[freq] = perShift;
    });
    setEditQuotas(currentQuotas);
    setEditingRole(role.id);
  };

  // Save edited quotas to RoleConfig
  const saveQuotas = async (roleId) => {
    setSaving(true);
    await RoleConfigRepo.update(roleId, { task_quotas: editQuotas });
    setEditingRole(null);
    setSaving(false);
    if (onRoleQuotasSaved) onRoleQuotasSaved();
  };

  // AI suggest aggressive quotas for a role
  const aiSuggest = async (role, breakdown) => {
    setAiLoading(true);
    setEditingRole(role.id);

    // Build aggressive targets: for 100% completion, each shift should handle
    // enough tasks so that over the cycle every task gets done
    const aggressive = {};
    breakdown.freqBreakdown.forEach(({ freq, pool }) => {
      if (freq === "daily") {
        // For daily: complete ALL tasks every shift
        aggressive[freq] = pool;
      } else {
        // For non-daily: aim to complete full pool within 60% of cycle (front-loaded)
        const cd = cycleDays[freq] || DEFAULT_CYCLE_DAYS[freq] || 20;
        const aggressiveCycleDays = Math.max(1, Math.floor(cd * 0.6));
        aggressive[freq] = Math.ceil(pool / (aggressiveCycleDays * shiftsPerDay));
      }
    });
    setEditQuotas(aggressive);
    setAiLoading(false);
  };

  // Visible and hidden roles
  const visibleBreakdowns = roleBreakdowns.filter(b => !hiddenRoles.has(b.role.id));
  const hiddenBreakdowns = roleBreakdowns.filter(b => hiddenRoles.has(b.role.id));

  if (roles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No roles configured yet.</p>
          <p className="text-xs text-slate-400 mt-1">Add roles in the Roles tab to see per-role completion targets.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Targets by Role
        </CardTitle>
        <p className="text-xs text-slate-500">
          Per-shift quotas for each role. Edit quotas manually or use AI to suggest aggressive targets for 100% completion.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary note */}
        <div className="text-xs text-slate-500 flex items-center gap-2 pb-1 border-b">
          <Target className="w-3.5 h-3.5" />
          <span>{unrestrictedCount} of {uniqueTasks.length} unique tasks are available to all roles (no role restriction)</span>
        </div>

        {/* Active role cards */}
        {visibleBreakdowns.map((breakdown) => {
          const { role, roleName, totalTasks, totalPerShift, totalPerDay, totalPerWeek, freqBreakdown } = breakdown;
          const isEditing = editingRole === role.id;

          return (
            <div key={role.id} className="border rounded-lg overflow-hidden">
              {/* Role header */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: role.color || "#64748b" }} />
                  <span className="font-semibold text-sm text-slate-800">{roleName}</span>
                  <span className="text-xs text-slate-500">{totalTasks} tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <div className="flex items-center gap-3 text-xs mr-2">
                      <span className="font-bold text-slate-800">{totalPerShift}/shift</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{totalPerDay}/day</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{totalPerWeek}/wk</span>
                    </div>
                  )}
                  {!isEditing && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="AI Suggest aggressive quotas"
                        onClick={() => aiSuggest(role, breakdown)}
                      >
                        {aiLoading && editingRole === role.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit quotas" onClick={() => startEditing(role, breakdown)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Hide role from targets" onClick={() => toggleRoleVisibility(role.id)}>
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" title="Save" disabled={saving} onClick={() => saveQuotas(role.id)}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" title="Cancel" onClick={() => setEditingRole(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Frequency breakdown */}
              {freqBreakdown.length > 0 ? (
                <div className="divide-y">
                  {freqBreakdown.map(({ freq, pool, autoPerShift, perShift, isOverridden }) => (
                    <div key={freq} className="flex items-center justify-between px-3 py-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">{freqLabel(freq)}</Badge>
                        <span className="text-slate-500">{pool} tasks</span>
                        {isOverridden && !isEditing && (
                          <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded">custom</span>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={pool}
                            value={editQuotas[freq] ?? perShift}
                            onChange={(e) => setEditQuotas(prev => ({ ...prev, [freq]: parseInt(e.target.value) || 0 }))}
                            className="w-16 h-6 text-xs text-center px-1"
                          />
                          <span className="text-slate-500">/shift</span>
                          <span className="text-[10px] text-slate-400 ml-1">(auto: {autoPerShift})</span>
                        </div>
                      ) : (
                        <span className={cn("font-medium", isOverridden ? "text-amber-700" : "text-slate-600")}>{perShift}/shift</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-2 text-xs text-slate-400">No tasks assigned to this role</div>
              )}
            </div>
          );
        })}

        {/* Hidden roles */}
        {hiddenBreakdowns.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-slate-400 mb-2">Hidden from targets ({hiddenBreakdowns.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {hiddenBreakdowns.map(({ role }) => (
                <button
                  key={role.id}
                  onClick={() => toggleRoleVisibility(role.id)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full opacity-50" style={{ backgroundColor: role.color || "#64748b" }} />
                  {role.role_name}
                  <Eye className="w-3 h-3 ml-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}