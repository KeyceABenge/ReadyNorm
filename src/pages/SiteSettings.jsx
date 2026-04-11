// @ts-nocheck
import { useState, useEffect } from "react";
import { OrganizationRepo, SiteSettingsRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Plus, X, Clock, RefreshCw, Sun, Target, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import QuotaAdjustmentDashboard from "@/components/quota/QuotaAdjustmentDashboard";
import ShiftSettingsPanel from "@/components/settings/ShiftSettingsPanel";
import CompletionTargetsPanel from "@/components/settings/CompletionTargetsPanel";
import { toast } from "sonner";
import RegenerationDayBadge from "@/components/settings/RegenerationDayBadge";

export default function SiteSettings() {
  const [frequencySettings, setFrequencySettings] = useState({});
  const [newFrequency, setNewFrequency] = useState("");
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("shifts");

  const queryClient = useQueryClient();

  const storedSiteCode = localStorage.getItem('site_code');
  const { data: organizations = [] } = useQuery({
    queryKey: ["organization_by_site_code", storedSiteCode],
    queryFn: async () => {
      if (!storedSiteCode) {
        window.location.href = createPageUrl("Home");
        return [];
      }
      const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
      if (orgs.length > 0) {
        return orgs;
      } else {
        localStorage.removeItem('site_code');
        window.location.href = createPageUrl("Home");
        return [];
      }
    },
    staleTime: 10 * 60 * 1000
  });

  // Derive orgId directly from query data — works even when data comes from cache
  // (queryFn side-effects don't run on cache hits, so useState would stay null)
  const orgId = organizations[0]?.id || null;

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["site_settings", orgId],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const settingsRecord = settings[0];

  // Fiscal year starts in October by default (weekly_october mode)
  const fiscalStartMonth = settingsRecord?.fiscal_year_settings?.fiscal_year_start_month || 10;
  const fiscalStartDay = settingsRecord?.fiscal_year_settings?.fiscal_year_start_day || 1;

  const defaultFrequencySettings = {
    daily: { interval_type: "daily", reset_times: ["05:00", "17:00"] },
    weekly: { interval_type: "days", interval_days: 7, reset_times: ["05:00"] },
    biweekly: { interval_type: "monthly_dates", monthly_dates: [1, 15], reset_times: ["05:00"] },
    monthly: { interval_type: "monthly_dates", monthly_dates: [1], reset_times: ["05:00"] },
    quarterly: { interval_type: "months", interval_months: 3, reset_times: ["05:00"] },
    annually: { interval_type: "yearly", yearly_month: fiscalStartMonth, yearly_day: fiscalStartDay, reset_times: ["05:00"] }
  };

  useEffect(() => {
    if (settingsRecord && !initialized) {
      const savedFreqSettings = settingsRecord.frequency_settings || {};
      setFrequencySettings({ ...defaultFrequencySettings, ...savedFreqSettings });
      setInitialized(true);
    }
  }, [settingsRecord]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settingsRecord) {
        return SiteSettingsRepo.update(settingsRecord.id, data);
      }
      return SiteSettingsRepo.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("Settings saved successfully");
    }
  });

  const handleSave = async () => {
    setUploading(true);
    try {
      await saveSettingsMutation.mutateAsync({
        ...settingsRecord,
        organization_id: orgId,
        frequency_settings: frequencySettings,
      });
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sun className="w-6 h-6" />
            Shifts & Targets
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure shifts, completion targets, and task regeneration</p>
        </div>

        <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 rounded-xl p-1 h-auto flex flex-wrap w-full">
            <TabsTrigger value="shifts" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">
              <Clock className="w-4 h-4 mr-2" />
              Shifts & Schedule
            </TabsTrigger>
            <TabsTrigger value="targets" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">
              <Target className="w-4 h-4 mr-2" />
              Completion Targets
            </TabsTrigger>
            <TabsTrigger value="regeneration" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Task Regeneration
            </TabsTrigger>
            <TabsTrigger value="quota" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">
              <Brain className="w-4 h-4 mr-2" />
              Quota Adjustment
            </TabsTrigger>
          </TabsList>

          {/* Shifts & Schedule Tab */}
          <TabsContent value="shifts" className="space-y-6">
            <ShiftSettingsPanel
              settings={settingsRecord}
              onSave={async (data) => {
              setUploading(true);
              try {
                await saveSettingsMutation.mutateAsync({
                  ...settingsRecord,
                  shifts: data.shifts,
                  auto_end_settings: data.auto_end_settings
                });
              } finally {
                setUploading(false);
              }
            }}
            isLoading={uploading || saveSettingsMutation.isPending}
          />
          </TabsContent>

          {/* Completion Targets Tab */}
          <TabsContent value="targets" className="space-y-6">
            <CompletionTargetsPanel
              settings={settingsRecord}
              organizationId={orgId}
              onSave={async (data) => {
                setUploading(true);
                try {
                  await saveSettingsMutation.mutateAsync({
                    ...settingsRecord,
                    ...data
                  });
                } finally {
                  setUploading(false);
                }
              }}
              isLoading={uploading || saveSettingsMutation.isPending}
            />
          </TabsContent>

          {/* Task Regeneration Tab */}
          <TabsContent value="regeneration" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="w-4 h-4" />
                Task Regeneration
              </CardTitle>
              <CardDescription className="text-xs">
                Configure when completed tasks regenerate. Daily reset times directly affect completion targets above.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(frequencySettings).map(([freq, freqSetting]) => (
                <div key={freq} className="p-3 bg-slate-50 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 capitalize text-sm">{freq}</h3>
                    <RegenerationDayBadge freq={freq} freqSetting={freqSetting} settings={settingsRecord} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select 
                        value={freqSetting.interval_type}
                        onValueChange={(value) => {
                          setFrequencySettings(prev => ({
                            ...prev,
                            [freq]: { ...prev[freq], interval_type: value }
                          }));
                        }}
                      >
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Every Day</SelectItem>
                          <SelectItem value="days">Every X Days</SelectItem>
                          <SelectItem value="monthly_dates">Days of Month</SelectItem>
                          <SelectItem value="months">Every X Months</SelectItem>
                          <SelectItem value="yearly">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {freqSetting.interval_type === "days" && (
                      <div>
                        <Label className="text-xs">Days Between</Label>
                        <Input
                          type="number"
                          min="1"
                          value={freqSetting.interval_days || 7}
                          onChange={(e) => {
                            setFrequencySettings(prev => ({
                              ...prev,
                              [freq]: { ...prev[freq], interval_days: parseInt(e.target.value) || 7 }
                            }));
                          }}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    )}

                    {freqSetting.interval_type === "monthly_dates" && (
                      <div>
                        <Label className="text-xs">Days (comma-separated)</Label>
                        <Input
                          value={(freqSetting.monthly_dates || [1]).join(", ")}
                          onChange={(e) => {
                            const dates = e.target.value.split(",").map(d => parseInt(d.trim())).filter(d => d >= 1 && d <= 31);
                            setFrequencySettings(prev => ({
                              ...prev,
                              [freq]: { ...prev[freq], monthly_dates: dates.length > 0 ? dates : [1] }
                            }));
                          }}
                          placeholder="1, 15"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    )}

                    {freqSetting.interval_type === "months" && (
                      <div>
                        <Label className="text-xs">Months Between</Label>
                        <Input
                          type="number"
                          min="1"
                          value={freqSetting.interval_months || 3}
                          onChange={(e) => {
                            setFrequencySettings(prev => ({
                              ...prev,
                              [freq]: { ...prev[freq], interval_months: parseInt(e.target.value) || 3 }
                            }));
                          }}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    )}

                    {freqSetting.interval_type === "yearly" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Month</Label>
                          <Select
                            value={String(freqSetting.yearly_month || 1)}
                            onValueChange={(value) => {
                              setFrequencySettings(prev => ({
                                ...prev,
                                [freq]: { ...prev[freq], yearly_month: parseInt(value) }
                              }));
                            }}
                          >
                            <SelectTrigger className="mt-1 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Day</Label>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={freqSetting.yearly_day || 1}
                            onChange={(e) => {
                              setFrequencySettings(prev => ({
                                ...prev,
                                [freq]: { ...prev[freq], yearly_day: parseInt(e.target.value) || 1 }
                              }));
                            }}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reset Times */}
                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      Reset Times
                      {freq === "daily" && (
                        <Badge variant="outline" className="text-[9px] ml-1 px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                          {(freqSetting.reset_times || ["05:00"]).length} resets = {(freqSetting.reset_times || ["05:00"]).length} regenerations/day
                        </Badge>
                      )}
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(freqSetting.reset_times || ["05:00"]).map((time, idx) => (
                        <div key={idx} className="flex items-center gap-0.5">
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const newTimes = [...(freqSetting.reset_times || ["05:00"])];
                              newTimes[idx] = e.target.value;
                              setFrequencySettings(prev => ({
                                ...prev,
                                [freq]: { ...prev[freq], reset_times: newTimes }
                              }));
                            }}
                            className="w-24 h-7 text-xs"
                          />
                          {(freqSetting.reset_times || ["05:00"]).length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-rose-600"
                              onClick={() => {
                                const newTimes = (freqSetting.reset_times || ["05:00"]).filter((_, i) => i !== idx);
                                setFrequencySettings(prev => ({
                                  ...prev,
                                  [freq]: { ...prev[freq], reset_times: newTimes }
                                }));
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          const newTimes = [...(freqSetting.reset_times || ["05:00"]), "12:00"];
                          setFrequencySettings(prev => ({
                            ...prev,
                            [freq]: { ...prev[freq], reset_times: newTimes }
                          }));
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add new frequency setting */}
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2">Add regeneration for another frequency:</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., semiannual"
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      const freq = newFrequency.toLowerCase().trim();
                      if (freq && !frequencySettings[freq]) {
                        setFrequencySettings(prev => ({
                          ...prev,
                          [freq]: { interval_type: "days", interval_days: 7, reset_times: ["05:00"] }
                        }));
                        setNewFrequency("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={uploading || saveSettingsMutation.isPending}
              size="sm"
              className="bg-slate-900 hover:bg-slate-800"
            >
              {uploading || saveSettingsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Save Regeneration Settings
            </Button>
          </div>
          </TabsContent>

          {/* Quota Adjustment Tab */}
          <TabsContent value="quota" className="space-y-6">
            <QuotaAdjustmentDashboard organizationId={orgId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}