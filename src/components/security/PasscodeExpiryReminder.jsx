/**
 * Passcode Expiry Reminder
 * Shows a warning banner when the manager passcode hasn't been changed in N days.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuditLogRepo } from "@/lib/adapters/database";
import { differenceInDays } from "date-fns";
import { AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

const PASSCODE_MAX_AGE_DAYS = 90;

export default function PasscodeExpiryReminder({ organizationId, organization }) {
  const { data: passcodeEvents = [] } = useQuery({
    queryKey: ["passcode_change_events", organizationId],
    queryFn: () => AuditLogRepo.filter(
      { organization_id: organizationId, entity_type: "SecurityEvent", action: "password_change" },
      "-timestamp",
      1
    ),
    enabled: !!organizationId && !!organization?.manager_passcode,
    staleTime: 5 * 60 * 1000,
  });

  const daysSinceChange = useMemo(() => {
    if (!organization?.manager_passcode) return null;
    if (passcodeEvents.length > 0) {
      return differenceInDays(new Date(), new Date(passcodeEvents[0].timestamp));
    }
    // No change event found — use org creation date as fallback
    if (organization?.created_date) {
      return differenceInDays(new Date(), new Date(organization.created_date));
    }
    return null;
  }, [passcodeEvents, organization]);

  if (!organization?.manager_passcode || daysSinceChange === null || daysSinceChange < PASSCODE_MAX_AGE_DAYS) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
        <KeyRound className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">
          Manager passcode is {daysSinceChange} days old
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          For security best practices, rotate your manager passcode every {PASSCODE_MAX_AGE_DAYS} days.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-amber-300 text-amber-700 hover:bg-amber-100 flex-shrink-0"
        onClick={() => window.location.href = createPageUrl("GeneralSiteSettings") + "?tab=general"}
      >
        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
        Change
      </Button>
    </div>
  );
}