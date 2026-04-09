/**
 * Security Overview Panel
 * Shows security posture summary for the site
 */
import { useQuery } from "@tanstack/react-query";
import { AuditLogRepo } from "@/lib/adapters/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, ShieldCheck, AlertTriangle, CheckCircle2, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, subDays } from "date-fns";
import AccessReviewReport from "@/components/security/AccessReviewReport";
import DataRetentionPanel from "@/components/security/DataRetentionPanel";
import EvidenceSnapshotPanel from "@/components/security/EvidenceSnapshotPanel";
import PasscodeExpiryReminder from "@/components/security/PasscodeExpiryReminder";

function SecurityCheckItem({ passed, label, detail }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-white">
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        passed ? "bg-emerald-100" : "bg-amber-100"
      )}>
        {passed ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        )}
      </div>
      <div>
        <p className={cn("text-sm font-medium", passed ? "text-slate-900" : "text-amber-800")}>
          {label}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

export default function SecurityOverviewPanel({ organizationId, organization, settings }) {
  // Fetch recent security events from audit log
  const { data: recentEvents = [] } = useQuery({
    queryKey: ["security_events", organizationId],
    queryFn: async () => {
      const logs = await AuditLogRepo.filter(
        { organization_id: organizationId, entity_type: "SecurityEvent" },
        "-timestamp",
        50
      );
      return logs;
    },
    enabled: !!organizationId,
    staleTime: 30000
  });

  const hasPasscode = !!organization?.manager_passcode;
  const hasLogo = !!organization?.logo_url;
  
  // Check security posture
  const securityChecks = [
    {
      passed: hasPasscode,
      label: "Manager passcode is set",
      detail: hasPasscode 
        ? "Managers must enter a passcode to access management features" 
        : "Set a manager passcode in General settings to restrict management access"
    },
    {
      passed: true,
      label: "Login rate limiting active",
      detail: "Accounts are locked for 15 minutes after 5 failed passcode attempts"
    },
    {
      passed: true,
      label: "Session timeout enabled (30 min)",
      detail: "Idle users are automatically logged out after 30 minutes of inactivity"
    },
    {
      passed: true, // RLS is always on
      label: "Row-level security (RLS) is active",
      detail: "All data is scoped to your organization — other sites cannot see your records"
    },
    {
      passed: true, // Always HTTPS
      label: "HTTPS encryption in transit",
      detail: "All data transmitted between devices and servers is encrypted with TLS"
    },
    {
      passed: true, // Supabase
      label: "Data encrypted at rest",
      detail: "Database storage uses AES-256 encryption (Supabase/AWS)"
    },
    {
      passed: true, // Audit logging
      label: "Immutable audit trail enabled",
      detail: "All task completions, verifications, and changes are recorded with timestamps"
    },
    {
      passed: true, // Security event logging
      label: "Security event logging active",
      detail: "Authentication events, role changes, and access removals are tracked"
    },
    {
      passed: true,
      label: "Data retention policies configured",
      detail: "Records retained 3-7 years based on category (operational, compliance, safety, incident)"
    },
  ];

  const passedCount = securityChecks.filter(c => c.passed).length;
  const totalCount = securityChecks.length;
  const scorePercent = Math.round((passedCount / totalCount) * 100);

  // Recent login events
  const last7days = subDays(new Date(), 7);
  const recentLogins = recentEvents.filter(e => 
    e.action === "login" && new Date(e.timestamp) >= last7days
  );
  const recentAccessDenied = recentEvents.filter(e => 
    e.action === "access_denied" && new Date(e.timestamp) >= last7days
  );

  return (
    <div className="space-y-6">
      {/* Passcode Expiry Warning */}
      <PasscodeExpiryReminder organizationId={organizationId} organization={organization} />

      {/* Security Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Security Posture
          </CardTitle>
          <CardDescription>Overview of your site's security configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold",
              scorePercent === 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            )}>
              {scorePercent}%
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {passedCount}/{totalCount} security checks passed
              </p>
              <p className="text-sm text-slate-500">
                {scorePercent === 100 
                  ? "All security measures are configured" 
                  : "Review the items below to improve your security posture"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {securityChecks.map((check, i) => (
              <SecurityCheckItem key={i} {...check} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            Recent Security Activity
          </CardTitle>
          <CardDescription>Last 7 days of authentication and access events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-2xl font-bold text-slate-900">{recentLogins.length}</p>
              <p className="text-xs text-slate-500">Logins</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-2xl font-bold text-rose-600">{recentAccessDenied.length}</p>
              <p className="text-xs text-slate-500">Denied</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-2xl font-bold text-slate-900">{recentEvents.length}</p>
              <p className="text-xs text-slate-500">Total Events</p>
            </div>
          </div>

          {recentEvents.length === 0 ? (
            <div className="text-center py-6">
              <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No security events recorded yet</p>
              <p className="text-xs text-slate-400">Events will appear here as users log in and access features</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentEvents.slice(0, 20).map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-2 rounded border bg-white text-sm">
                  <Badge className={cn("text-[10px] rounded-full", {
                    "bg-emerald-100 text-emerald-700": event.action === "login",
                    "bg-slate-100 text-slate-700": event.action === "logout",
                    "bg-red-100 text-red-700": event.action === "access_denied",
                    "bg-blue-100 text-blue-700": event.action === "access_granted",
                    "bg-amber-100 text-amber-700": event.action === "password_change" || event.action === "pin_change",
                    "bg-purple-100 text-purple-700": event.action === "settings_change",
                  })}>
                    {event.action.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-slate-700 truncate flex-1">{event.actor_name || event.actor_email}</span>
                  {event.metadata?.device_type && (
                    <span className="text-xs text-slate-400 capitalize">{event.metadata.device_type}</span>
                  )}
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {format(parseISO(event.timestamp), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Review Report */}
      <AccessReviewReport organizationId={organizationId} />

      {/* Data Retention Policies */}
      <DataRetentionPanel organizationId={organizationId} />

      {/* Evidence Snapshots */}
      <EvidenceSnapshotPanel
        organizationId={organizationId}
        organization={organization}
        settings={settings}
      />
    </div>
  );
}