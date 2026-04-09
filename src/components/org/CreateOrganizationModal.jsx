/**
 * Modal for existing site admins to create an OrganizationGroup
 * and link their current site to it.
 */
import { useState } from "react";
import { OrganizationGroupRepo, OrgGroupMembershipRepo, OrganizationRepo } from "@/lib/adapters/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Building2, Check } from "lucide-react";
import { toast } from "sonner";

const generateCode = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function CreateOrganizationModal({ open, onOpenChange, user, currentSite, onCreated }) {
  const [orgName, setOrgName] = useState(currentSite?.name || "");
  const [siteName, setSiteName] = useState(currentSite?.site_name || currentSite?.name || "");
  const [step, setStep] = useState(1);
  const [createdGroup, setCreatedGroup] = useState(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      let orgCode = generateCode(6);
      let attempts = 0;
      while (attempts < 10) {
        const existing = await OrganizationGroupRepo.filter({ org_code: orgCode });
        if (existing.length === 0) break;
        orgCode = generateCode(6);
        attempts++;
      }

      const group = await OrganizationGroupRepo.create({
        name: orgName.trim(),
        org_code: orgCode,
        owner_email: user.email,
        owner_name: user.full_name || user.email,
        status: "active"
      });

      // Link current site to the new org group + update site_name
      await OrganizationRepo.update(currentSite.id, {
        org_group_id: group.id,
        site_name: siteName.trim()
      });

      // Create owner membership
      await OrgGroupMembershipRepo.create({
        org_group_id: group.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        role: "org_owner",
        site_access_type: "all",
        status: "active"
      });

      return group;
    },
    onSuccess: (group) => {
      setCreatedGroup(group);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ["org_group"] });
      queryClient.invalidateQueries({ queryKey: ["organization_by_site_code"] });
      queryClient.invalidateQueries({ queryKey: ["user_org_membership"] });
      queryClient.invalidateQueries({ queryKey: ["org_group_for_site"] });
      if (onCreated) onCreated(group);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create organization");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1 && orgName.trim()) {
      setStep(2);
    } else if (step === 2 && siteName.trim()) {
      createMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
              {step === 3 ? <Check className="w-6 h-6 text-white" /> : <Building2 className="w-6 h-6 text-white" />}
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {step === 1 ? "Create Organization" : step === 2 ? "Name This Site" : "Organization Created"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 1 ? "Group your sites under one organization" :
             step === 2 ? "Give your current site a name within the organization" :
             "Your organization is ready"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Organization Name</Label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Acme Food Corp"
                className="mt-2"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" size="lg" disabled={!orgName.trim()}>
              Next
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-700">{orgName}</span>
            </div>
            <div>
              <Label>Site Name</Label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g., Chicago Plant"
                className="mt-2"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1" size="lg">
                Back
              </Button>
              <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800" size="lg" disabled={createMutation.isPending || !siteName.trim()}>
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create"}
              </Button>
            </div>
          </form>
        )}

        {step === 3 && createdGroup && (
          <div className="space-y-4 mt-4 text-center">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">Organization Code</p>
              <code className="text-3xl font-bold text-emerald-800 tracking-wider">{createdGroup.org_code}</code>
              <p className="text-xs text-emerald-700 mt-2">Use this code for organization-level access</p>
            </div>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(createdGroup.org_code);
                toast.success("Org code copied!");
              }}
              variant="outline"
              className="w-full"
            >
              Copy Org Code
            </Button>
            <Button onClick={() => onOpenChange(false)} className="w-full bg-slate-900 hover:bg-slate-800" size="lg">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}