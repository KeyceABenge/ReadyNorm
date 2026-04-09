import { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { OrganizationGroupRepo, OrgGroupMembershipRepo, OrganizationRepo } from "@/lib/adapters/database";
import { updateCurrentUser } from "@/lib/adapters/auth";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Sparkles, Building2, MapPin } from "lucide-react";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const generateCode = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value);

export default function OrganizationSetupModal({ open, user }) {
  const [step, setStep] = useState(1); // 1=org name, 2=site name, 3=success
  const [orgName, setOrgName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [createdOrg, setCreatedOrg] = useState(null);
  const [createdGroup, setCreatedGroup] = useState(null);

  const createMutation = useMutation({
    mutationFn: async ({ orgName, siteName }) => {
      try {
        console.log("🚀 Starting organization creation for:", orgName);

        // Generate unique org code
        let orgCode = generateCode(6);
        let attempts = 0;
        while (attempts < 10) {
          const existing = await OrganizationGroupRepo.filter({ org_code: orgCode });
          if (existing.length === 0) break;
          orgCode = generateCode(6);
          attempts++;
        }
        console.log("✓ Generated org code:", orgCode);

        // Generate unique site code
        let siteCode = generateCode(6);
        attempts = 0;
        while (attempts < 10) {
          const existing = await OrganizationRepo.filter({ site_code: siteCode });
          if (existing.length === 0) break;
          siteCode = generateCode(6);
          attempts++;
        }
        console.log("✓ Generated site code:", siteCode);

        // Create the organization group
        console.log("📝 Creating organization group...");
        const group = await OrganizationGroupRepo.create({
          name: orgName,
          org_code: orgCode,
          owner_email: user.email,
          owner_name: user.full_name || user.email,
          status: "active"
        });
        console.log("✓ Organization group created:", group);

        // Create the site linked to the group
        console.log("📝 Creating site...");
        const site = await OrganizationRepo.create({
          name: orgName,
          site_name: siteName,
          site_code: siteCode,
          org_group_id: group.id,
          created_by: user.email,
          status: "active"
        });
        console.log("✓ Site created:", site);

        // Create owner membership
        console.log("📝 Creating membership...");
        await OrgGroupMembershipRepo.create({
          org_group_id: group.id,
          user_email: user.email,
          user_name: user.full_name || user.email,
          role: "org_owner",
          site_access_type: "all",
          status: "active"
        });
        console.log("✓ Membership created");

        // Link user to this site
        console.log("📝 Updating user...");
        await updateCurrentUser({
          organization_id: site.id,
          organization_name: orgName
        });
        console.log("✓ User updated");

        // Also store in localStorage as a fallback (in case User table doesn't exist)
        localStorage.setItem('site_code', siteCode);
        if (isUuid(site.id)) {
          localStorage.setItem('organization_id', site.id);
        } else {
          localStorage.removeItem('organization_id');
        }
        localStorage.setItem('organization_name', orgName);
        console.log("✅ Organization creation completed successfully");
        console.log("💾 Stored in localStorage - site_code:", siteCode, "org_id:", site.id);

        return { group, site };
      } catch (error) {
        console.error("❌ Error during organization creation:", error);
        throw error;
      }
    },
    onSuccess: ({ group, site }) => {
      console.log("🎉 Mutation succeeded, moving to success step");
      setCreatedOrg(site);
      setCreatedGroup(group);
      setStep(3);
    },
    onError: (error) => {
      console.error("❌ Mutation error:", error);
      const errorMsg = error?.message || error?.response?.data?.message || "Failed to create organization";
      toast.error(errorMsg);
    }
  });

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1 && orgName.trim()) {
      setStep(2);
    } else if (step === 2 && siteName.trim()) {
      createMutation.mutate({ orgName: orgName.trim(), siteName: siteName.trim() });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
              {step === 1 ? <Building2 className="w-6 h-6 text-white" /> :
               step === 2 ? <MapPin className="w-6 h-6 text-white" /> :
               <Sparkles className="w-6 h-6 text-white" />}
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {step === 1 ? "Name Your Organization" :
             step === 2 ? "Name Your First Site" :
             "You're All Set!"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 1 ? "This is the parent company or group that holds all your sites" :
             step === 2 ? `Add the first site under "${orgName}"` :
             "Your organization and site have been created"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <form onSubmit={handleNext} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Acme Food Corp"
                className="mt-2"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1.5">
                The umbrella name for all your sites
              </p>
            </div>
            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800"
              size="lg"
              disabled={!orgName.trim()}
            >
              Next
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleNext} className="space-y-4 mt-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-700">{orgName}</span>
            </div>
            <div>
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g., Chicago Plant, Main Facility"
                className="mt-2"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1.5">
                A specific location or facility within your organization
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
                size="lg"
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-slate-900 hover:bg-slate-800"
                size="lg"
                disabled={createMutation.isPending || !siteName.trim()}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 3 && createdOrg && createdGroup && (
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
              <div>
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Organization Code</p>
                <code className="text-2xl font-bold text-emerald-800 tracking-wider">{createdGroup.org_code}</code>
              </div>
              <div className="border-t border-emerald-200 pt-3">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Site Code</p>
                <code className="text-2xl font-bold text-emerald-800 tracking-wider">{createdOrg.site_code}</code>
              </div>
              <p className="text-xs text-emerald-700">
                Share the <strong>site code</strong> with employees to give them access to this site. Use the <strong>org code</strong> for organization-level access.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(createdOrg.site_code);
                  toast.success("Site code copied!");
                }}
                variant="outline"
                className="flex-1"
              >
                Copy Site Code
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(createdGroup.org_code);
                  toast.success("Org code copied!");
                }}
                variant="outline"
                className="flex-1"
              >
                Copy Org Code
              </Button>
            </div>

            <Button
              onClick={async () => {
                console.log("🔄 [OrganizationSetupModal] Preparing to redirect...");
                // Get current session to ensure it's saved
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                  console.log("✓ [OrganizationSetupModal] Session confirmed:", session.user?.email);
                } else {
                  console.warn("⚠️ [OrganizationSetupModal] No session found!");
                }
                
                // Longer delay to ensure everything is written to storage
                setTimeout(() => {
                  console.log("🔄 [OrganizationSetupModal] Redirecting to dashboard...");
                  window.location.href = createPageUrl("ManagerDashboard");
                }, 2500);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800"
              size="lg"
            >
              Continue to Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}