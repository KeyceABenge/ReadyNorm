// @ts-nocheck
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, SiteSettingsRepo } from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Settings, ShieldAlert, Trash2, AlertTriangle, Users, KeyRound, Building2, ArrowLeft, CheckCircle2, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoleConfigPanel from "@/components/settings/RoleConfigPanel";
import SecurityOverviewPanel from "@/components/security/SecurityOverviewPanel";
import PasswordStrengthIndicator from "@/components/security/PasswordStrengthIndicator";
import AccessRequestsPanel from "@/components/access/AccessRequestsPanel";
import CurrentAccountsPanel from "@/components/access/CurrentAccountsPanel";
import FacilityColorCodingPanel from "@/components/settings/FacilityColorCodingPanel";
import FiscalYearPanel from "@/components/settings/FiscalYearPanel";
import TransferOwnershipPanel from "@/components/access/TransferOwnershipPanel";
import useSecurityLogger from "@/hooks/useSecurityLogger";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function GeneralSiteSettings() {
  const [siteName, setSiteName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [companyLogoFile, setCompanyLogoFile] = useState(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState(null);
  const [colorCodingCategories, setColorCodingCategories] = useState([]);
  const [facilityColors, setFacilityColors] = useState([]);
  const [fiscalYearSettings, setFiscalYearSettings] = useState({});
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [user, setUser] = useState(null);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [changeSummary, setChangeSummary] = useState([]);

  const queryClient = useQueryClient();
  const { logEvent } = useSecurityLogger();

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => {});
  }, []);

  const storedSiteCode = localStorage.getItem("site_code");
  const { data: organizations = [] } = useQuery({
    queryKey: ["organization_by_site_code", storedSiteCode],
    queryFn: async () => {
      const storedSiteCode = localStorage.getItem("site_code");
      if (!storedSiteCode) {
        window.location.href = createPageUrl("Home");
        return [];
      }
      const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
      if (orgs.length > 0) {
        setOrgId(orgs[0].id);
        return orgs;
      } else {
        localStorage.removeItem("site_code");
        window.location.href = createPageUrl("Home");
        return [];
      }
    },
  });

  const organization = organizations[0];

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["site_settings", orgId],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
  });

  const settingsRecord = settings[0];

  useEffect(() => {
    if (settingsRecord && !initialized) {
      setFacilityColors(settingsRecord.facility_colors || []);
      setColorCodingCategories(settingsRecord.color_coding_categories || []);
      setFiscalYearSettings(settingsRecord.fiscal_year_settings || {});
      setInitialized(true);
    }
  }, [settingsRecord]);

  useEffect(() => {
    if (organization && !initialized) {
      setPasscode(organization.manager_passcode || "");
      setSiteName(organization.site_name || organization.name || "");
      setCompanyLogoPreview(organization.logo_url || null);
    }
  }, [organization]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settingsRecord) {
        return SiteSettingsRepo.update(settingsRecord.id, data);
      }
      return SiteSettingsRepo.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_settings"] });
    },
  });

  const handleSave = async () => {
    setUploading(true);
    const changes = [];

    // Detect what changed
    const origSiteName = organization?.site_name || organization?.name || "";
    const origPasscode = organization?.manager_passcode || "";

    if (siteName !== origSiteName) changes.push(`Site name updated to "${siteName}"`);
    if (passcode !== origPasscode) changes.push(passcode ? "Manager passcode updated" : "Manager passcode removed");
    if (companyLogoFile) changes.push("Company logo updated");

    const origFiscal = settingsRecord?.fiscal_year_settings || {};
    const fiscalMode = fiscalYearSettings?.fiscal_calendar_mode;
    const origMode = origFiscal?.fiscal_calendar_mode;
    if (fiscalMode !== origMode) {
      changes.push(`Fiscal calendar mode set to ${fiscalMode === "weekly_october" ? "Weekly Fiscal Calendar (Oct start)" : "Custom Periods"}`);
    } else if (fiscalMode === "custom") {
      const monthChanged = fiscalYearSettings?.fiscal_year_start_month !== origFiscal?.fiscal_year_start_month;
      const dayChanged = fiscalYearSettings?.fiscal_year_start_day !== origFiscal?.fiscal_year_start_day;
      if (monthChanged || dayChanged) changes.push("Fiscal year start date updated");
      const origPeriods = origFiscal?.tracking_periods?.length || 0;
      const newPeriods = fiscalYearSettings?.tracking_periods?.length || 0;
      if (newPeriods !== origPeriods) changes.push(`Tracking periods updated (${newPeriods} periods)`);
    }

    if (JSON.stringify(colorCodingCategories) !== JSON.stringify(settingsRecord?.color_coding_categories || [])) {
      changes.push(`Color coding categories updated (${colorCodingCategories?.length || 0} categories)`);
    }

    if (changes.length === 0) changes.push("Settings confirmed (no changes detected)");

    try {
      let companyLogoUrl = organization?.logo_url || null;
      if (companyLogoFile) {
        const uploadResult = await uploadFile(companyLogoFile);
        companyLogoUrl = uploadResult.file_url;
      }

      await saveSettingsMutation.mutateAsync({
        organization_id: orgId,
        app_name: settingsRecord?.app_name || "Sanitation Manager",
        logo_url: settingsRecord?.logo_url || null,
        frequency_settings: settingsRecord?.frequency_settings || {},
        facility_colors: facilityColors,
        color_coding_categories: colorCodingCategories,
        fiscal_year_settings: fiscalYearSettings,
      });

      if (orgId && organization) {
        await OrganizationRepo.update(orgId, {
          manager_passcode: passcode || null,
          site_name: siteName || null,
          name: siteName || null,
          logo_url: companyLogoUrl,
        });
        queryClient.invalidateQueries({ queryKey: ["organization_by_site_code"] });

        // Log security events for sensitive changes
        if (passcode !== (organization.manager_passcode || "")) {
          logEvent("password_change", orgId, passcode ? "Manager passcode updated" : "Manager passcode removed");
        }
        if (changes.length > 0) {
          logEvent("settings_change", orgId, changes.join("; "));
        }
      }

      setChangeSummary(changes);
      setSaveSuccessOpen(true);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => window.location.href = createPageUrl("Home")}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Site Settings
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              General configuration for {organization?.name || "your site"}
            </p>
          </div>
        </div>

        <Tabs
          defaultValue={new URLSearchParams(window.location.search).get("tab") || "general"}
          className="space-y-6"
        >
          <TabsList className="bg-white border shadow-sm flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="general" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs px-2 py-1.5">
              <Settings className="w-3.5 h-3.5 mr-1" />
              General
            </TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs px-2 py-1.5">
              <Users className="w-3.5 h-3.5 mr-1" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="access" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs px-2 py-1.5">
              <KeyRound className="w-3.5 h-3.5 mr-1" />
              Access
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs px-2 py-1.5">
              <Shield className="w-3.5 h-3.5 mr-1" />
              Security
            </TabsTrigger>
            <TabsTrigger value="danger" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white text-xs px-2 py-1.5 text-rose-600">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              Danger
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Site Identity
                </CardTitle>
                <CardDescription>Configure your site name and company logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g., Main Plant, West Facility"
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This name identifies your site within the organization
                  </p>
                </div>

                <div>
                  <Label htmlFor="companyLogo">Company Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {companyLogoPreview && (
                      <div className="w-16 h-16 rounded-lg border-2 border-slate-200 flex items-center justify-center overflow-hidden bg-white">
                        <img src={companyLogoPreview} alt="Company Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="companyLogo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setCompanyLogoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setCompanyLogoPreview(reader.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Your company logo displayed alongside ReadyNorm branding (PNG or JPG)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manager Access</CardTitle>
                <CardDescription>Set a passcode required for manager sign-in</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="passcode">Manager Passcode</Label>
                  <Input
                    id="passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter passcode (leave empty to disable)"
                    className="mt-2"
                  />
                  <PasswordStrengthIndicator value={passcode} showRules={passcode.length > 0} />
                  <p className="text-xs text-slate-500 mt-1">
                    This passcode will be required when managers sign in. Leave empty to disable passcode protection.
                  </p>
                </div>
              </CardContent>
            </Card>

            <FiscalYearPanel
              settings={settingsRecord}
              onChange={setFiscalYearSettings}
            />

            <FacilityColorCodingPanel
              categories={colorCodingCategories}
              legacyColors={facilityColors}
              onChange={setColorCodingCategories}
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={uploading || saveSettingsMutation.isPending}
                size="lg"
                className="bg-slate-900 hover:bg-slate-800"
              >
                {uploading || saveSettingsMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                Save Settings
              </Button>
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <RoleConfigPanel organizationId={orgId} />
          </TabsContent>

          {/* Access Tab */}
          <TabsContent value="access" className="space-y-6">
            <CurrentAccountsPanel organizationId={orgId} currentUserEmail={user?.email} />
            <AccessRequestsPanel organizationId={orgId} user={user} alwaysShow={true} />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <SecurityOverviewPanel
              organizationId={orgId}
              organization={organization}
              settings={settingsRecord}
            />
          </TabsContent>

          {/* Danger Tab */}
          <TabsContent value="danger" className="space-y-6">
            <TransferOwnershipPanel
              organizationId={orgId}
              organizationName={organization?.name}
              currentUserEmail={user?.email}
            />
            <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-900">
                  <ShieldAlert className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible and destructive actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border border-rose-200 rounded-lg p-4 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-slate-900">Delete Account</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Permanently delete this organization and all associated data. This cannot be undone.
                      </p>
                    </div>
                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="min-h-[44px] border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 whitespace-nowrap"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="sm:max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="w-5 h-5" />
                            Delete Organization?
                          </AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-4">
                              <p>
                                This will <strong>permanently delete</strong> your organization{" "}
                                <strong>{organization?.name}</strong> and all associated data.
                              </p>
                              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-rose-800 mb-2">Data that will be deleted:</p>
                                <ul className="text-xs text-rose-700 space-y-1">
                                  <li>• All employees and their records</li>
                                  <li>• All tasks and completion history</li>
                                  <li>• All settings and configurations</li>
                                  <li>• All incidents, CAPAs, and reports</li>
                                </ul>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-slate-700 block mb-2">
                                  Type{" "}
                                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-rose-600">
                                    DELETE
                                  </span>{" "}
                                  to confirm:
                                </label>
                                <Input
                                  type="text"
                                  value={deleteConfirmText}
                                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                                  placeholder="DELETE"
                                  className="font-mono"
                                  autoComplete="off"
                                />
                              </div>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 sm:gap-0">
                          <AlertDialogCancel onClick={() => setDeleteConfirmText("")} className="min-h-[44px]">
                            Cancel
                          </AlertDialogCancel>
                          <Button
                            variant="destructive"
                            disabled={deleteConfirmText !== "DELETE"}
                            onClick={async () => {
                              try {
                                if (orgId) {
                                  await OrganizationRepo.update(orgId, {
                                    status: "deleted",
                                    deletion_requested_at: new Date().toISOString(),
                                  });
                                }
                                toast.success("Account deletion initiated. Your data will be removed within 30 days.");
                                localStorage.removeItem("site_code");
                                window.location.href = createPageUrl("Home");
                              } catch (error) {
                                toast.error("Failed to delete account. Please contact support.");
                              }
                            }}
                            className="min-h-[44px]"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Account
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Save Success Dialog */}
      <Dialog open={saveSuccessOpen} onOpenChange={setSaveSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              Settings Saved Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">The following changes were saved:</p>
            <ul className="space-y-1.5">
              {changeSummary.map((change, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">&#10003;</span>
                  <span className="text-slate-700">{change}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setSaveSuccessOpen(false)} className="bg-slate-900 hover:bg-slate-800">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}