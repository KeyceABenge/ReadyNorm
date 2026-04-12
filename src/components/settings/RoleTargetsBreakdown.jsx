// @ts-nocheck
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Target, Sparkles, Save, Loader2, RotateCcw, XCircle, PlusCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleConfigRepo } from "@/lib/adapters/database";
import { toast } from "sonner";

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

  // Per-role dirty quota edits: { [roleId]: { [freq]: number } }
  const [dirtyQuotas, setDirtyQuotas] = useState({});
  // Which role has an in-flight DB operation
  const [pendingRole, setPendingRole] = useState(null);
  const [aiLoadingRole, setAiLoadingRole] = useState(null);

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

  const roleBreakdowns = useMemo(() => {
    return roles.map(role => {
      const roleName = role.role_name;
      const eligibleTasks = uniqueTasks.filter(t => {
        const er = t.eligible_roles || [];
        return er.length === 0 || er.includes(roleName);
      });
      const { poolByFreq, targets: autoTargets } = calcAutoTargets(eligibleTasks);
      const savedQuotas = role.task_quotas || {};
      const freqBreakdown = [];
      let totalPerShift = 0;

      FREQ_ORDER.forEach(freq => {
        const pool = poolByFreq[freq] || 0;
        if (pool === 0) return;
        const auto = autoTargets[freq] || 0;
        const saved = savedQuotas[freq];
        const effective = (saved !== undefined && saved !== null && saved !== "") ? Number(saved) : auto;
        totalPerShift += effective;
        freqBreakdown.push({ freq, pool, autoPerShift: auto, perShift: effective, isOverridden: saved !== undefined && saved !== null && saved !== "" });
      });

      const totalTasks = eligibleTasks.filter(t => normalizeFrequency(t.frequency) !== "other").length;
      return { role, roleName, totalTasks, totalPerShift,
        totalPerDay: totalPerShift * shiftsPerDay,
        totalPerWeek: totalPerShift * shiftsPerDay * wdCount,
        freqBreakdown, poolByFreq, autoTargets, savedQuotas,
        hasCustomQuotas: Object.keys(savedQuotas).length > 0,
        // Read exclusion directly from role record (migration 017)
        isExcluded: !!role.excluded_from_targets,
      };
    });
  }, [roles, uniqueTasks, shiftsPerDay, cycleDays, wdCount, dailyResetsPerDay, calcAutoTargets]);

  const unrestrictedCount = useMemo(() =>
    uniqueTasks.filter(t => !t.eligible_roles || t.eligible_roles.length === 0).length,
    [uniqueTasks]
  );

  // Update a quota value for a role — marks it dirty
  const handleQuotaChange = (roleId, freq, value) => {
    setDirtyQuotas(prev => ({
      ...prev,
      [roleId]: { ...(prev[roleId] || {}), [freq]: parseInt(value) || 0 }
    }));
  };

  /** Save dirty quota edits for a role to role_configs.task_quotas */
  const saveRoleQuotas = async (role, savedQuotas) => {
    const dirty = dirtyQuotas[role.id] || {};
    const merged = { ...savedQuotas, ...dirty };
    setPendingRole(role.id);
    try {
      await RoleConfigRepo.update(role.id, { task_quotas: merged });
      setDirtyQuotas(prev => {
        const next = { ...prev };
        delete next[role.id];
        return next;
      });
      toast.success(`${role.role_name} targets saved`);
      if (onRoleQuotasSaved) onRoleQuotasSaved();
    } catch (e) {
      console.error("[RoleTargetsBreakdown] saveRoleQuotas:", e);
      toast.error("Failed to save role quotas. Please try again.");
    } finally {
      setPendingRole(null);
    }
  };

  /** Clear all custom quotas — reverts the role to auto-calculated targets */
  const resetToAuto = async (role) => {
    setPendingRole(role.id);
    try {
      await RoleConfigRepo.update(role.id, { task_quotas: null });
      discardChanges(role.id);
      toast.success(`${role.role_name} quotas reset to auto`);
      if (onRoleQuotasSaved) onRoleQuotasSaved();
    } catch (e) {
      console.error("[RoleTargetsBreakdown] resetToAuto:", e);
      toast.error("Failed to reset quotas. Please try again.");
    } finally {
      setPendingRole(null);
    }
  };

  /** Exclude this role from completion tracking — saved to role_configs.excluded_from_targets */
  const excludeRole = async (role) => {
    setPendingRole(role.id);
    try {
      await RoleConfigRepo.update(role.id, { excluded_from_targets: true });
      discardChanges(role.id);
      toast.success(`${role.role_name} excluded from completion tracking`);
      if (onRoleQuotasSaved) onRoleQuotasSaved();
    } catch (e) {
      console.error("[RoleTargetsBreakdown] excludeRole:", e);
      toast.error("Failed to exclude role. Please try again.");
    } finally {
      setPendingRole(null);
    }
  };

  /** Re-include a previously excluded role */
  const includeRole = async (role) => {
    setPendingRole(role.id);
    try {
      await RoleConfigRepo.update(role.id, { excluded_from_targets: false });
      toast.success(`${role.role_name} added back to completion tracking`);
      if (onRoleQuotasSaved) onRoleQuotasSaved();
    } catch (e) {
      console.error("[RoleTargetsBreakdown] includeRole:", e);
      toast.error("Failed to re-include role. Please try again.");
    } finally {
      setPendingRole(null);
    }
  };

  // Discard dirty changes for a role
  const discardChanges = (roleId) => {
    setDirtyQuotas(prev => {
      const next = { ...prev };
      delete next[roleId];
      return next;
    });
  };

  // AI suggest aggressive quotas
  const aiSuggest = async (role, breakdown) => {
    setAiLoadingRole(role.id);
    const aggressive = {};
    breakdown.freqBreakdown.forEach(({ freq, pool }) => {
      if (freq === "daily") {
        aggressive[freq] = pool;
      } else {
        const cd = cycleDays[freq] || DEFAULT_CYCLE_DAYS[freq] || 20;
        const aggressiveCycleDays = Math.max(1, Math.floor(cd * 0.6));
        aggressive[freq] = Math.ceil(pool / (aggressiveCycleDays * shiftsPerDay));
      }
    });
    setDirtyQuotas(prev => ({ ...prev, [role.id]: aggressive }));
    setAiLoadingRole(null);
  };

  const activeBreakdowns = roleBreakdowns.filter(b => !b.isExcluded);
  const excludedBreakdowns = roleBreakdowns.filter(b => b.isExcluded);

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
          Set per-shift quotas for each role. Use <strong>Remove Targets</strong> to exclude a role from completion tracking entirely.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-slate-500 flex items-center gap-2 pb-1 border-b">
          <Target className="w-3.5 h-3.5" />
          <span>{unrestrictedCount} of {uniqueTasks.length} unique tasks are available to all roles</span>
        </div>

        {activeBreakdowns.map((breakdown) => {
          const { role, roleName, totalTasks, freqBreakdown, savedQuotas, hasCustomQuotas } = breakdown;
          const dirty = dirtyQuotas[role.id] || {};
          const hasDirty = Object.keys(dirty).length > 0;
          const isBusy = pendingRole === role.id;

          // Effective totals including unsaved dirty values
          const effectiveTotalPerShift = freqBreakdown.reduce((sum, { freq, perShift }) => {
            return sum + (dirty[freq] !== undefined ? dirty[freq] : perShift);
          }, 0);

          return (
            <div key={role.id} className={cn("border rounded-lg overflow-hidden transition-all", hasDirty && "border-blue-300 shadow-sm")}>
              {/* Role header */}
              <div className={cn("flex items-center justify-between px-3 py-2 border-b", hasDirty ? "bg-blue-50" : "bg-slate-50")}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: role.color || "#64748b" }} />
                  <span className="font-semibold text-sm text-slate-800 truncate">{roleName}</span>
                  <span className="text-xs text-slate-500">{totalTasks} tasks</span>
                  {hasDirty && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">unsaved</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!hasDirty && (
                    <div className="flex items-center gap-2 text-xs mr-1">
                      <span className="font-bold text-slate-800">{effectiveTotalPerShift}/shift</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{effectiveTotalPerShift * shiftsPerDay}/day</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{effectiveTotalPerShift * shiftsPerDay * wdCount}/wk</span>
                    </div>
                  )}
                  {hasDirty && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-slate-400 hover:text-slate-600 text-xs"
                        onClick={() => discardChanges(role.id)}
                        disabled={isBusy}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                        disabled={isBusy}
                        onClick={() => saveRoleQuotas(role, savedQuotas)}
                      >
                        {isBusy
                          ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Saving…</>
                          : <><Save className="w-3.5 h-3.5 mr-1" />Save</>
                        }
                      </Button>
                    </>
                  )}
                  {!hasDirty && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="AI: suggest aggressive quotas"
                        disabled={isBusy}
                        onClick={() => aiSuggest(role, breakdown)}
                      >
                        {aiLoadingRole === role.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                      </Button>
                      {hasCustomQuotas && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                          title="Reset all custom quotas back to auto-calculated"
                          disabled={isBusy}
                          onClick={() => resetToAuto(role)}
                        >
                          {isBusy
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                          Reset
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Exclude this role from completion tracking"
                        disabled={isBusy}
                        onClick={() => excludeRole(role)}
                      >
                        {isBusy
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <XCircle className="w-3.5 h-3.5 mr-1" />}
                        Remove Targets
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Frequency rows — inputs always visible */}
              {freqBreakdown.length > 0 ? (
                <div className="divide-y">
                  {freqBreakdown.map(({ freq, pool, autoPerShift, perShift, isOverridden }) => {
                    const currentVal = dirty[freq] !== undefined ? dirty[freq] : perShift;
                    const isDirtyField = dirty[freq] !== undefined && dirty[freq] !== perShift;
                    return (
                      <div key={freq} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">{freqLabel(freq)}</Badge>
                          <span className="text-slate-500">{pool} tasks</span>
                          {isOverridden && !isDirtyField && (
                            <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded">custom</span>
                          )}
                          {isDirtyField && (
                            <span className="text-[9px] text-blue-600 bg-blue-50 px-1 rounded">edited</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            value={currentVal}
                            onChange={(e) => handleQuotaChange(role.id, freq, e.target.value)}
                            className={cn(
                              "w-16 h-7 text-xs text-center px-1 font-medium",
                              isDirtyField && "border-blue-400 bg-blue-50 text-blue-800"
                            )}
                          />
                          <span className="text-slate-400">/shift</span>
                          {autoPerShift !== currentVal && (
                            <span className="text-[10px] text-slate-400">(auto: {autoPerShift})</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-2 text-xs text-slate-400">No tasks assigned to this role</div>
              )}
            </div>
          );
        })}

        {/* Excluded roles */}
        {excludedBreakdowns.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-slate-500 mb-2">
              Excluded from completion tracking ({excludedBreakdowns.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {excludedBreakdowns.map(({ role }) => {
                const isBusy = pendingRole === role.id;
                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between px-3 py-2 rounded-md border border-dashed border-slate-200 bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full opacity-40" style={{ backgroundColor: role.color || "#64748b" }} />
                      <span className="text-sm text-slate-500">{role.role_name}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">not tracked</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                      disabled={isBusy}
                      onClick={() => includeRole(role)}
                    >
                      {isBusy
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <PlusCircle className="w-3.5 h-3.5 mr-1" />}
                      Add Back
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
