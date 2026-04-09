/**
 * Data Retention Policy Panel
 * Shows current retention categories and flags records nearing expiry.
 * Provides visibility into what data will be archived/purged.
 */
import { useQuery } from "@tanstack/react-query";
import { AuditLogRepo } from "@/lib/adapters/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Clock, Archive, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO, addYears } from "date-fns";

const RETENTION_POLICIES = [
  { category: "operational", years: 3, label: "Operational", description: "Task completions, routine activities", color: "bg-blue-100 text-blue-700" },
  { category: "compliance", years: 5, label: "Compliance", description: "Audit events, access reviews, security logs", color: "bg-purple-100 text-purple-700" },
  { category: "safety", years: 7, label: "Safety", description: "Incidents, CAPAs, corrective actions", color: "bg-amber-100 text-amber-700" },
  { category: "training", years: 5, label: "Training", description: "Training records, competency evaluations", color: "bg-emerald-100 text-emerald-700" },
  { category: "incident", years: 7, label: "Incident", description: "Foreign material, glass breakage, recalls", color: "bg-rose-100 text-rose-700" },
];

export default function DataRetentionPanel({ organizationId }) {
  const { data: auditStats = [], isLoading } = useQuery({
    queryKey: ["data_retention_stats", organizationId],
    queryFn: async () => {
      const logs = await AuditLogRepo.filter(
        { organization_id: organizationId },
        "-timestamp",
        200
      );
      return logs;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // Count records by retention category
  const categoryCounts = {};
  const nearingExpiry = [];
  const now = new Date();

  auditStats.forEach(log => {
    const cat = log.retention_category || "operational";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    // Check if nearing expiry (within 6 months)
    const retentionYears = log.retention_years || 3;
    const expiryDate = addYears(parseISO(log.timestamp), retentionYears);
    const daysUntilExpiry = differenceInDays(expiryDate, now);
    if (daysUntilExpiry > 0 && daysUntilExpiry <= 180) {
      nearingExpiry.push({ ...log, expiryDate, daysUntilExpiry });
    }
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-slate-600" />
          Data Retention Policies
        </CardTitle>
        <CardDescription>How long different types of records are retained for compliance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-4">
          {RETENTION_POLICIES.map(policy => (
            <div key={policy.category} className="flex items-center justify-between p-3 rounded-lg border bg-white">
              <div className="flex items-center gap-3">
                <Badge className={cn("text-[10px] px-2 py-0.5", policy.color)}>
                  {policy.label}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-slate-900">{policy.description}</p>
                  <p className="text-xs text-slate-500">
                    {categoryCounts[policy.category] || 0} records in audit log
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {policy.years} years
              </div>
            </div>
          ))}
        </div>

        {nearingExpiry.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">
                {nearingExpiry.length} record{nearingExpiry.length !== 1 ? "s" : ""} nearing retention expiry
              </p>
            </div>
            <p className="text-xs text-amber-600">
              These records will be eligible for archival within the next 6 months.
              Export them as SOC2 evidence before they expire.
            </p>
          </div>
        )}

        {nearingExpiry.length === 0 && !isLoading && (
          <div className="text-center py-4">
            <Shield className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500">All records are within retention period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}