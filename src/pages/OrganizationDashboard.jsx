/**
 * Organization Dashboard — cross-site management for org owners/managers.
 * Shows all sites, members, and organization-level controls.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationGroupRepo, OrgGroupMembershipRepo, OrganizationRepo, EmployeeRepo } from "@/lib/adapters/database";
import { invokeFunction } from "@/lib/adapters/functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MapPin, Users, ArrowLeft, Copy, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import OrgSitesList from "@/components/org/OrgSitesList";
import OrgMembersList from "@/components/org/OrgMembersList";

export default function OrganizationDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const orgGroupId = urlParams.get("id");

  const { data: user } = useQuery({
    queryKey: ["auth_me"],
    queryFn: async () => {
      const isAuth = await isAuthenticated();
      if (!isAuth) return null;
      return getCurrentUser();
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: orgGroup, isLoading: orgLoading } = useQuery({
    queryKey: ["org_group", orgGroupId, user?.email],
    queryFn: async () => {
      if (orgGroupId) {
        const groups = await OrganizationGroupRepo.filter({ id: orgGroupId, status: "active" });
        return groups[0] || null;
      }
      if (!user?.email) return null;
      const memberships = await OrgGroupMembershipRepo.filter({ user_email: user.email, status: "active" });
      if (memberships.length === 0) return null;
      const groupId = memberships[0].org_group_id;
      const groups = await OrganizationGroupRepo.filter({ id: groupId, status: "active" });
      return groups[0] || null;
    },
    enabled: !!orgGroupId || !!user?.email
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["org_sites", orgGroup?.id],
    queryFn: () => OrganizationRepo.filter({ org_group_id: orgGroup.id }),
    enabled: !!orgGroup?.id
  });

  const { data: members = [] } = useQuery({
    queryKey: ["org_members", orgGroup?.id],
    queryFn: () => OrgGroupMembershipRepo.filter({ org_group_id: orgGroup.id }),
    enabled: !!orgGroup?.id
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ["org_all_employees", orgGroup?.id],
    queryFn: async () => {
      const siteIds = sites.map(s => s.id);
      const allEmps = [];
      for (const siteId of siteIds) {
        const emps = await EmployeeRepo.filter({ organization_id: siteId, status: "active" });
        allEmps.push(...emps);
      }
      return allEmps;
    },
    enabled: sites.length > 0
  });

  // Fetch admin users from each site (site owners/managers)
  const { data: allSiteAdmins = [] } = useQuery({
    queryKey: ["org_site_admins", orgGroup?.id],
    queryFn: async () => {
      const admins = [];
      for (const site of sites) {
        const response = await invokeFunction("listOrgUsers", {
          organization_id: site.id,
        });
        const users = response.data?.users || [];
        for (const u of users) {
          // Only include admin/manager level users, skip employees
          if (u.role === "admin" || u.role === "manager" || u.role === "org_owner" || u.role === "org_manager" || u.role === "site_manager") {
            admins.push({ ...u, site_id: site.id, site_name: site.site_name || site.name });
          }
        }
      }
      // Deduplicate by email
      const seen = new Set();
      return admins.filter(a => {
        if (seen.has(a.email)) return false;
        seen.add(a.email);
        return true;
      });
    },
    enabled: sites.length > 0
  });

  const queryClient = useQueryClient();

  // Check user's role in the org.
  // Primary: look for an active membership row.
  // Fallback: check orgGroup.owner_email for legacy accounts that have no membership row yet.
  const isOrgGroupOwner =
    !!orgGroup && !!user?.email &&
    orgGroup.owner_email?.toLowerCase() === user.email.toLowerCase();

  const userMembership = members.find(
    m => m.user_email?.toLowerCase() === user?.email?.toLowerCase() && m.status === "active"
  );
  const isOwner = userMembership?.role === "org_owner" || isOrgGroupOwner;
  const isManager = userMembership?.role === "org_manager" || isOwner;

  // Auto-repair: if this user IS the org group owner but has no membership row
  // (legacy account or row was never persisted), silently create the row so that
  // the user list, listOrgUsers edge function, and RLS all work going forward.
  useEffect(() => {
    if (!orgGroup || !user?.email || !isOrgGroupOwner) return;
    const hasRow = members.some(
      m => m.user_email?.toLowerCase() === user.email.toLowerCase() && m.status === "active"
    );
    if (!hasRow) {
      OrgGroupMembershipRepo.create({
        org_group_id: orgGroup.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        role: "org_owner",
        site_access_type: "all",
        status: "active"
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ["org_members", orgGroup.id] }))
        .catch(() => {}); // silently ignore duplicates / constraint errors
    }
  }, [orgGroup?.id, user?.email, members.length]);

  // Synthesize the owner entry from orgGroup.owner_email when the membership
  // rows can't be read (RLS blocks until migration 010 runs). orgGroup is
  // fetched from organization_groups which has SELECT USING(true) — always works.
  const effectiveMembers = (() => {
    if (!orgGroup?.owner_email) return members;
    const ownerEmail = orgGroup.owner_email.toLowerCase();
    const alreadyIn = members.some(
      m => m.user_email?.toLowerCase() === ownerEmail && m.status === "active"
    );
    if (alreadyIn) return members;
    return [
      {
        id: `synthetic-${orgGroup.id}`,
        org_group_id: orgGroup.id,
        user_email: orgGroup.owner_email,
        user_name: orgGroup.owner_name || orgGroup.owner_email.split('@')[0],
        role: "org_owner",
        site_access_type: "all",
        status: "active",
      },
      ...members,
    ];
  })();

  // Absolute fallback: if the authenticated user is an owner/manager but still
  // not in effectiveMembers (org_group_id null, owner_email null, or any other
  // data gap), inject them directly. We know who they are from auth.
  const displayMembers = (() => {
    if (!isOwner && !isManager) return effectiveMembers;
    if (!user?.email) return effectiveMembers;
    const alreadyIn = effectiveMembers.some(
      m => m.user_email?.toLowerCase() === user.email.toLowerCase() && m.status === "active"
    );
    if (alreadyIn) return effectiveMembers;
    return [
      {
        id: `auth-user-${user.id || user.email}`,
        org_group_id: orgGroup?.id,
        user_email: user.email,
        user_name: user.full_name || user.email.split('@')[0],
        role: "org_owner",
        site_access_type: "all",
        status: "active",
      },
      ...effectiveMembers,
    ];
  })();

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!orgGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No Organization Found</h2>
          <p className="text-sm text-slate-500 mb-4">You don't have an organization yet, or the link is invalid.</p>
          <Button onClick={() => window.location.href = createPageUrl("Home")} variant="outline">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => window.location.href = createPageUrl("Home")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{orgGroup.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{orgGroup.org_code}</code>
                <button onClick={() => { navigator.clipboard.writeText(orgGroup.org_code); toast.success("Copied!"); }}>
                  <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                </button>
                {(isOwner || isManager) && (
                  <Badge className={isOwner ? "bg-amber-600" : "bg-indigo-600"} variant="default">
                    {isOwner ? "Owner" : "Manager"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="w-5 h-5 text-sky-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">{sites.length}</p>
              <p className="text-xs text-slate-500">Sites</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">{displayMembers.filter(m => m.status === "active").length + allSiteAdmins.filter(a => !displayMembers.some(m => m.user_email === a.email && m.status === "active")).length}</p>
              <p className="text-xs text-slate-500">Owners & Managers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">{allEmployees.length}</p>
              <p className="text-xs text-slate-500">Total Employees</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sites">
          <TabsList className="mb-6">
            <TabsTrigger value="sites">
              <MapPin className="w-4 h-4 mr-1.5" />
              Sites
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-1.5" />
              Owners & Managers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sites">
            <OrgSitesList orgGroup={orgGroup} sites={sites} employees={allEmployees} />
          </TabsContent>

          <TabsContent value="members">
            {isManager ? (
              <OrgMembersList orgGroup={orgGroup} members={displayMembers} sites={sites} currentUserEmail={user?.email} allSiteAdmins={allSiteAdmins} />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-slate-500">Only organization owners and managers can manage members.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}