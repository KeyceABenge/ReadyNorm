// @ts-nocheck
import { useState } from "react";
import { OrgGroupMembershipRepo, OrganizationRepo, OrganizationGroupRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Globe, Building2, LogOut, Loader2, Copy, Check, AlertTriangle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

function clearSiteCache() {
  localStorage.removeItem('site_code');
  localStorage.removeItem('organization_id');
  localStorage.removeItem('site_role');
}

const ROLE_LABELS = {
  org_owner: "Owner",
  org_manager: "Manager",
  site_manager: "Site Manager",
  manager: "Manager",
};

const ROLE_COLORS = {
  org_owner: "bg-violet-100 text-violet-800 border-violet-200",
  org_manager: "bg-blue-100 text-blue-800 border-blue-200",
  site_manager: "bg-sky-100 text-sky-800 border-sky-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1 text-slate-400 hover:text-slate-700 transition-colors"
      title="Copy site code"
      type="button"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function MySitesPanel({ currentUserEmail }) {
  const queryClient = useQueryClient();

  // 1. Fetch user's active memberships
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ["my_memberships", currentUserEmail],
    queryFn: () => OrgGroupMembershipRepo.filter({ user_email: currentUserEmail, status: "active" }),
    enabled: !!currentUserEmail,
    staleTime: 0,
  });

  const orgGroupIds = [...new Set(memberships.map(m => m.org_group_id).filter(Boolean))];

  // 2. Fetch all org groups the user belongs to
  const { data: orgGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["my_org_groups", orgGroupIds.join(",")],
    queryFn: async () => {
      const groups = [];
      for (const id of orgGroupIds) {
        const g = await OrganizationGroupRepo.filter({ id });
        if (g[0]) groups.push(g[0]);
      }
      return groups;
    },
    enabled: orgGroupIds.length > 0,
    staleTime: 0,
  });

  // 3. Fetch all sites for those org groups
  const { data: allSites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["my_sites_all", orgGroupIds.join(",")],
    queryFn: async () => {
      const sites = [];
      for (const groupId of orgGroupIds) {
        const s = await OrganizationRepo.filter({ org_group_id: groupId });
        sites.push(...s);
      }
      return sites;
    },
    enabled: orgGroupIds.length > 0,
    staleTime: 0,
  });

  // Leave an entire org group membership
  const leaveMutation = useMutation({
    mutationFn: ({ membershipId }) =>
      OrgGroupMembershipRepo.update(membershipId, { status: "inactive" }),
    onSuccess: (_, { sites }) => {
      queryClient.invalidateQueries({ queryKey: ["my_memberships"] });
      queryClient.invalidateQueries({ queryKey: ["my_sites_all"] });
      const currentCode = localStorage.getItem('site_code');
      const leftCurrent = sites.some(s => s.site_code === currentCode);
      if (leftCurrent) {
        clearSiteCache();
        toast.success("You have left this organization. Redirecting…");
        setTimeout(() => { window.location.href = createPageUrl("Home"); }, 1200);
      } else {
        toast.success("You have left this organization");
      }
    },
    onError: () => toast.error("Failed to leave organization"),
  });

  // Remove a specific site from allowed_site_ids
  const removeSiteMutation = useMutation({
    mutationFn: async ({ membership, siteId }) => {
      const updated = (membership.allowed_site_ids || []).filter(id => id !== siteId);
      if (updated.length === 0) {
        // Last site — deactivate the whole membership
        return OrgGroupMembershipRepo.update(membership.id, { status: "inactive" });
      }
      return OrgGroupMembershipRepo.update(membership.id, { allowed_site_ids: updated });
    },
    onSuccess: (_, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: ["my_memberships"] });
      const removedSite = allSites.find(s => s.id === siteId);
      const currentCode = localStorage.getItem('site_code');
      if (removedSite?.site_code && removedSite.site_code === currentCode) {
        clearSiteCache();
        toast.success("Site access removed. Redirecting…");
        setTimeout(() => { window.location.href = createPageUrl("Home"); }, 1200);
      } else {
        toast.success("Site access removed");
      }
    },
    onError: () => toast.error("Failed to remove site access"),
  });

  // Resolve which sites a membership grants
  function getSitesForMembership(membership) {
    if (
      membership.site_access_type === "selected" &&
      Array.isArray(membership.allowed_site_ids) &&
      membership.allowed_site_ids.length > 0
    ) {
      return allSites.filter(s => membership.allowed_site_ids.includes(s.id));
    }
    // "all" access — all sites in the org group
    return allSites.filter(s => s.org_group_id === membership.org_group_id);
  }

  const isLoading = membershipsLoading || groupsLoading || sitesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Loading your sites…</span>
        </CardContent>
      </Card>
    );
  }

  if (memberships.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <Globe className="w-10 h-10 text-slate-300" />
          <p className="font-medium text-slate-700">No sites found</p>
          <p className="text-sm text-slate-500 max-w-xs">
            You don't have approved access to any sites yet. Contact your organization owner to request access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            My Sites & Organizations
          </CardTitle>
          <CardDescription>
            All sites and organizations you are currently approved for. You can leave individual sites or entire organizations.
          </CardDescription>
        </CardHeader>
      </Card>

      {memberships.map(membership => {
        const orgGroup = orgGroups.find(g => g.id === membership.org_group_id);
        const memberSites = getSitesForMembership(membership);
        const roleLabel = ROLE_LABELS[membership.role] || membership.role || "Member";
        const roleColor = ROLE_COLORS[membership.role] || "bg-slate-100 text-slate-700 border-slate-200";

        return (
          <Card key={membership.id} className="border border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {orgGroup?.name || "Organization"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {membership.site_access_type === "all"
                        ? `Access to all ${memberSites.length} site${memberSites.length !== 1 ? "s" : ""}`
                        : `Access to ${memberSites.length} selected site${memberSites.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn("text-xs font-medium border", roleColor)}
                  >
                    {roleLabel}
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs h-7 px-2"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-1" />
                        Leave
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="sm:max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                          <AlertTriangle className="w-5 h-5" />
                          Leave Organization?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          You will lose access to <strong>{orgGroup?.name || "this organization"}</strong> and all its sites. You would need to request access again to rejoin.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button
                          variant="destructive"
                          onClick={() => leaveMutation.mutate({ membershipId: membership.id, sites: memberSites })}
                          disabled={leaveMutation.isPending}
                          className="min-h-[36px]"
                        >
                          {leaveMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                          Leave Organization
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>

            {memberSites.length > 0 && (
              <CardContent className="pt-0">
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
                  {memberSites.map(site => (
                    <div
                      key={site.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {site.site_name || site.name || "Unnamed Site"}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {site.site_code || "—"}
                            </span>
                            {site.site_code && <CopyButton text={site.site_code} />}
                          </div>
                        </div>
                      </div>

                      {membership.site_access_type === "selected" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs h-7 px-2 shrink-0"
                              title="Remove access to this site"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="sm:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                                <AlertTriangle className="w-5 h-5" />
                                Remove Site Access?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove your access to <strong>{site.site_name || site.name}</strong>{" "}
                                ({site.site_code}). You would need re-approval to regain access.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  removeSiteMutation.mutate({ membership, siteId: site.id })
                                }
                                disabled={removeSiteMutation.isPending}
                                className="min-h-[36px]"
                              >
                                {removeSiteMutation.isPending && (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                )}
                                Remove Access
                              </Button>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}

            {memberSites.length === 0 && (
              <CardContent className="pt-0">
                <p className="text-sm text-slate-400 italic py-2 text-center">
                  No sites found for this organization
                </p>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
