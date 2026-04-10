/**
 * Access Review Report
 * Shows who has access, their roles, last login, and flags stale accounts.
 * Supports CSV export for SOC2 evidence collection.
 */
import { useQuery } from "@tanstack/react-query";
import { invokeFunction } from "@/lib/adapters/functions";
import { AuditLogRepo } from "@/lib/adapters/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, Download, AlertTriangle, ShieldCheck, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";

const STALE_THRESHOLD_DAYS = 90;

export default function AccessReviewReport({ organizationId }) {
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["access_review_users", organizationId],
    queryFn: async () => {
      const response = await invokeFunction("listOrgUsers", {
        organization_id: organizationId,
      });
      return response.data?.users || [];
    },
    enabled: !!organizationId,
  });

  const { data: loginEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["access_review_logins", organizationId],
    queryFn: async () => {
      const logs = await AuditLogRepo.filter(
        { organization_id: organizationId, entity_type: "SecurityEvent", action: "login" },
        "-timestamp",
        500
      );
      return logs;
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  const isLoading = usersLoading || eventsLoading;

  // Build last login map
  const lastLoginMap = {};
  loginEvents.forEach(e => {
    const email = e.actor_email;
    if (!lastLoginMap[email] || new Date(e.timestamp) > new Date(lastLoginMap[email])) {
      lastLoginMap[email] = e.timestamp;
    }
  });

  // Enrich users with last login
  const enrichedUsers = users.map(u => {
    const lastLogin = lastLoginMap[u.email];
    const daysSinceLogin = lastLogin ? differenceInDays(new Date(), parseISO(lastLogin)) : null;
    const isStale = daysSinceLogin === null || daysSinceLogin > STALE_THRESHOLD_DAYS;
    const isAdmin = ["admin", "manager", "org_owner", "org_manager", "site_manager"].includes(u.role);
    return { ...u, lastLogin, daysSinceLogin, isStale, isAdmin };
  });

  const staleCount = enrichedUsers.filter(u => u.isStale).length;
  const adminCount = enrichedUsers.filter(u => u.isAdmin).length;

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Role", "Is Admin", "Last Login", "Days Since Login", "Stale Account"];
    const rows = enrichedUsers.map(u => [
      u.full_name || "",
      u.email || "",
      u.role || "user",
      u.isAdmin ? "Yes" : "No",
      u.lastLogin ? format(parseISO(u.lastLogin), "yyyy-MM-dd HH:mm") : "Never",
      u.daysSinceLogin !== null ? u.daysSinceLogin : "N/A",
      u.isStale ? "Yes" : "No"
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `access-review-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Access Review Report
            </CardTitle>
            <CardDescription>Periodic review of user access for SOC2 compliance</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-slate-50 text-center">
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
            <p className="text-xs text-slate-500">Total Users</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 text-center">
            <p className="text-2xl font-bold text-slate-900">{adminCount}</p>
            <p className="text-xs text-slate-500">Admins</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 text-center">
            <p className={cn("text-2xl font-bold", staleCount > 0 ? "text-amber-600" : "text-emerald-600")}>
              {staleCount}
            </p>
            <p className="text-xs text-slate-500">Stale ({STALE_THRESHOLD_DAYS}d+)</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : enrichedUsers.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No users found</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {enrichedUsers
              .sort((a, b) => (a.isStale === b.isStale ? 0 : a.isStale ? -1 : 1))
              .map(u => (
                <div key={u.id} className={cn(
                  "flex items-center justify-between gap-3 p-3 rounded-lg border bg-white",
                  u.isStale && "border-amber-200 bg-amber-50/30"
                )}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                      u.isAdmin ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      {u.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">{u.full_name || "Unknown"}</span>
                        {u.isStale && (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0 gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Stale
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="truncate">{u.email}</span>
                        <span>•</span>
                        <Badge className={cn("text-[10px]", u.isAdmin ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500")}>
                          {u.isAdmin && <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />}
                          {u.role || "user"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {u.lastLogin ? (
                      <div>
                        <p className="text-xs font-medium text-slate-700">
                          {format(parseISO(u.lastLogin), "MMM d, yyyy")}
                        </p>
                        <p className="text-[10px] text-slate-400">{u.daysSinceLogin}d ago</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Never logged in</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}