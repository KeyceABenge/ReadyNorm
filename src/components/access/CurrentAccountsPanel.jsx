// @ts-nocheck
import { useState } from "react";
import { invokeFunction } from "@/lib/adapters/functions";
import { OrganizationRepo, OrganizationGroupRepo, OrgGroupMembershipRepo, AccessRequestRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, UserMinus, Loader2, Shield, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

export default function CurrentAccountsPanel({ organizationId, currentUserEmail }) {
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["org_users", organizationId],
    queryFn: async () => {
      // Fetch the org to get its org_group_id
      const orgs = await OrganizationRepo.filter({ id: organizationId });
      const org = orgs[0];
      if (!org) return [];

      const usersMap = new Map();

      // Fetch active org group members (migration 010 grants owners SELECT
      // access without needing a pre-existing membership row)
      if (org.org_group_id) {
        const memberships = await OrgGroupMembershipRepo.filter({
          org_group_id: org.org_group_id,
          status: "active",
        });
        for (const m of memberships) {
          // Respect site_access_type — null/undefined means 'all'
          const hasAccess =
            !m.site_access_type ||
            m.site_access_type === "all" ||
            (m.site_access_type === "selected" &&
              (m.allowed_site_ids || []).includes(organizationId));
          if (!hasAccess) continue;
          if (!usersMap.has(m.user_email)) {
            usersMap.set(m.user_email, {
              id: m.id,
              full_name: m.user_name || m.user_email,
              email: m.user_email,
              role: m.role || "manager",
              type: "manager",
              created_date: m.created_date,
            });
          }
        }
      }

      // Fetch approved access requests for this specific site
      const approved = await AccessRequestRepo.filter({
        organization_id: organizationId,
        status: "approved",
      });
      for (const ar of approved) {
        if (!usersMap.has(ar.requester_email)) {
          usersMap.set(ar.requester_email, {
            id: ar.id,
            full_name: ar.requester_name || ar.requester_email,
            email: ar.requester_email,
            role: ar.requested_role || "employee",
            type: "approved_access",
            approved_at: ar.reviewed_at,
            created_date: ar.created_date,
          });
        }
      }

      // Guaranteed fallback: fetch the org group owner directly from
      // organization_groups (SELECT policy is USING(true) — always readable).
      // This ensures the owner always appears even when org_group_memberships
      // is empty due to RLS (fixed by migration 010, but works before it too).
      if (org.org_group_id) {
        const groups = await OrganizationGroupRepo.filter({ id: org.org_group_id });
        const grp = groups[0];
        if (grp?.owner_email) {
          const ownerKey = grp.owner_email.toLowerCase();
          const alreadyIn = [...usersMap.values()].some(
            u => u.email?.toLowerCase() === ownerKey
          );
          if (!alreadyIn) {
            usersMap.set(ownerKey, {
              id: `grp-owner-${grp.id}`,
              full_name: grp.owner_name || grp.owner_email.split('@')[0],
              email: grp.owner_email,
              role: 'org_owner',
              type: 'manager',
              created_date: grp.created_date,
            });
          }
        }
      }

      return Array.from(usersMap.values());
    },
    enabled: !!organizationId,
  });

  const removeAccessMutation = useMutation({
    mutationFn: async (userId) => {
      await invokeFunction("removeUserAccess", {
        user_id: userId,
        organization_id: organizationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_users"] });
      toast.success("Access removed");
      setRemovingId(null);
    },
    onError: () => {
      toast.error("Failed to remove access");
      setRemovingId(null);
    },
  });

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  // Group users by role category
  const roleOrder = ["org_owner", "site_manager", "manager", "admin", "employee", "user"];
  const roleLabels = {
    org_owner: "Organization Owners",
    site_manager: "Site Managers",
    manager: "Managers",
    admin: "Managers",
    employee: "Employees",
    user: "Employees",
  };

  const getRoleGroup = (u) => {
    const r = (u.role || "user").toLowerCase();
    if (r === "org_owner") return "org_owner";
    if (r === "site_manager" || r === "org_manager") return "site_manager";
    if (r === "admin" || r === "manager") return "admin";
    return "employee";
  };

  const sortedUsers = [...filtered].sort((a, b) => {
    const aGroup = getRoleGroup(a);
    const bGroup = getRoleGroup(b);
    const aIdx = roleOrder.indexOf(aGroup);
    const bIdx = roleOrder.indexOf(bGroup);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return (a.full_name || "").localeCompare(b.full_name || "");
  });

  // Build grouped sections
  const groupedSections = [];
  let currentGroup = null;
  for (const u of sortedUsers) {
    const group = getRoleGroup(u);
    if (group !== currentGroup) {
      currentGroup = group;
      groupedSections.push({ group, label: roleLabels[group] || group, users: [] });
    }
    groupedSections[groupedSections.length - 1].users.push(u);
  }

  return (
    <Card>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Current Accounts</h3>
              <p className="text-xs text-slate-500">
                {users.length} user{users.length !== 1 ? "s" : ""} with access
              </p>
            </div>
          </div>
        </div>

        {users.length > 3 && (
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : sortedUsers.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            {search ? "No matching accounts found" : "No accounts with access"}
          </p>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {groupedSections.map((section) => (
              <div key={section.group}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {section.label}
                  </h4>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">
                    {section.users.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {section.users.map((u) => {
                    const isCurrentUser = u.email === currentUserEmail;
                    const isAdmin = ["admin", "manager", "org_owner", "org_manager", "site_manager"].includes(u.role);
                    const isApprovedAccess = u.type === "approved_access";

                    return (
                      <div
                        key={u.id}
                        className={cn(
                          "flex items-center justify-between gap-3 p-3 rounded-lg border bg-white",
                          isCurrentUser && "border-blue-200 bg-blue-50/30"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                              isAdmin
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {u.full_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 truncate">
                                {u.full_name || "Unknown"}
                              </span>
                              {isCurrentUser && (
                                <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="text-xs text-slate-500 truncate">{u.email}</span>
                            </div>
                          </div>
                          <Badge
                            className={cn(
                              "text-[10px] flex-shrink-0",
                              u.role === "org_owner"
                                ? "bg-amber-100 text-amber-700"
                                : isAdmin
                                ? "bg-slate-900 text-white"
                                : isApprovedAccess
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {isAdmin ? (
                              <ShieldCheck className="w-3 h-3 mr-0.5" />
                            ) : (
                              <Shield className="w-3 h-3 mr-0.5" />
                            )}
                            {u.role || "user"}
                          </Badge>
                        </div>

                        {!isCurrentUser && (
                          <AlertDialog
                            open={removingId === u.id}
                            onOpenChange={(open) => {
                              if (!open) setRemovingId(null);
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRemovingId(u.id)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 flex-shrink-0"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="sm:max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Access</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove access for{" "}
                                  <strong>{u.full_name}</strong> ({u.email})?
                                  They will no longer be able to access this site.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2 sm:gap-0">
                                <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
                                <Button
                                  variant="destructive"
                                  className="min-h-[44px]"
                                  disabled={removeAccessMutation.isPending}
                                  onClick={() => removeAccessMutation.mutate(u.id)}
                                >
                                  {removeAccessMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <UserMinus className="w-4 h-4 mr-2" />
                                  )}
                                  Remove Access
                                </Button>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}