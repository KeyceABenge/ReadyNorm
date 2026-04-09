/**
 * Hook to compute notification badge counts for manager action items.
 * Returns counts for: verifications, feedback, condition reports, competency requests, overdue tasks.
 */
import { getRepository } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";

const queryConfig = {
  staleTime: 2 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 1,
};

export default function useManagerBadgeCounts(orgId) {
  // Pending verifications — tasks completed but not yet verified
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", orgId],
    queryFn: () => getRepository("Task").filter({ organization_id: orgId }, "-created_date"),
    enabled: !!orgId,
    ...queryConfig,
  });

  // Anonymous feedback
  const { data: anonymousFeedback = [] } = useQuery({
    queryKey: ["anonymous_feedback", orgId],
    queryFn: () => getRepository("AnonymousFeedback").filter({ organization_id: orgId }, "-created_date"),
    enabled: !!orgId,
    ...queryConfig,
  });

  // Peer feedback
  const { data: peerFeedback = [] } = useQuery({
    queryKey: ["peer_feedback", orgId],
    queryFn: () => getRepository("EmployeePeerFeedback").filter({ organization_id: orgId }, "-created_date"),
    enabled: !!orgId,
    ...queryConfig,
  });

  // Sanitary / condition reports
  const { data: sanitaryReports = [] } = useQuery({
    queryKey: ["sanitary_reports", orgId],
    queryFn: () => getRepository("SanitaryReport").filter({ organization_id: orgId }, "-created_date"),
    enabled: !!orgId,
    ...queryConfig,
  });

  // Competency evaluations — pending ones
  const { data: competencyEvaluations = [] } = useQuery({
    queryKey: ["competency_evaluations_health", orgId],
    queryFn: () => getRepository("CompetencyEvaluation").filter({ organization_id: orgId }),
    enabled: !!orgId,
    ...queryConfig,
  });

  // Access requests
  const { data: accessRequests = [] } = useQuery({
    queryKey: ["access_requests_badge", orgId],
    queryFn: () => getRepository("AccessRequest").filter({ organization_id: orgId, status: "pending" }),
    enabled: !!orgId,
    ...queryConfig,
  });

  // Calculate counts
  const pendingVerifications = tasks.filter(
    (t) => t.status === "completed" && !t.verified_by
  ).length;

  const unreadFeedback =
    anonymousFeedback.filter((f) => !f.is_read).length +
    peerFeedback.filter((f) => !f.is_read).length;

  const openReports = sanitaryReports.filter((r) => r.status === "open").length;

  const pendingCompetency = competencyEvaluations.filter(
    (e) => e.status === "pending" || e.status === "requested"
  ).length;

  const pendingAccessRequests = accessRequests.length;

  const overdueTasks = tasks.filter((t) => {
    if (t.is_group) return false;
    if (t.status === "completed" || t.status === "verified") return false;
    if (!t.due_date) return false;
    const today = new Date().toISOString().split("T")[0];
    return t.due_date < today;
  }).length;

  const totalActionable =
    pendingVerifications + unreadFeedback + openReports + pendingCompetency;

  return {
    verification: pendingVerifications,
    feedback: unreadFeedback,
    reports: openReports,
    competency: pendingCompetency,
    accessRequests: pendingAccessRequests,
    overdue: overdueTasks,
    total: totalActionable,
  };
}