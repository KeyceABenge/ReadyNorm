// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, subDays, isAfter } from "date-fns";
import { AlertTriangle, Clock, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { color: "bg-rose-100 text-rose-700 border-rose-200", label: "Critical" },
  major: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Major" },
  moderate: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Moderate" },
  minor: { color: "bg-slate-100 text-slate-600 border-slate-200", label: "Minor" }
};

const CATEGORY_LABELS = {
  quality: "Quality", food_safety: "Food Safety", sanitation: "Sanitation",
  pest: "Pest Control", environmental: "Environmental", audit: "Audit",
  customer: "Customer", operational: "Operational", other: "Other"
};

export default function IssueDashboard({ issues, onSelectIssue, onNewIssue }) {
  const today = new Date();
  const last7Days = subDays(today, 7);
  const last30Days = subDays(today, 30);

  const recentIssues = issues.filter(i => isAfter(new Date(i.created_date), last7Days));
  const highPriorityIssues = issues.filter(i => 
    !["closed", "pending_verification"].includes(i.status) &&
    (i.severity === "critical" || i.severity === "major")
  ).slice(0, 5);

  const overdueIssues = issues.filter(i => 
    !["closed", "pending_verification"].includes(i.status) &&
    i.due_date && new Date(i.due_date) < today
  ).slice(0, 5);

  const categoryStats = Object.keys(CATEGORY_LABELS).map(cat => ({
    category: cat, label: CATEGORY_LABELS[cat],
    count: issues.filter(i => i.category === cat && isAfter(new Date(i.created_date), last30Days)).length
  })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

  const statusStats = {
    open: issues.filter(i => i.status === "open").length,
    under_review: issues.filter(i => i.status === "under_review").length,
    containment: issues.filter(i => i.status === "containment").length,
    corrective_action: issues.filter(i => i.status === "corrective_action").length,
    capa_required: issues.filter(i => i.status === "capa_required").length,
    pending_verification: issues.filter(i => i.status === "pending_verification").length,
    closed: issues.filter(i => i.status === "closed").length
  };

  const closedLast30 = issues.filter(i => i.status === "closed" && i.closed_at && isAfter(new Date(i.closed_at), last30Days)).length;
  const totalLast30 = issues.filter(i => isAfter(new Date(i.created_date), last30Days)).length;
  const closureRate = totalLast30 > 0 ? Math.round((closedLast30 / totalLast30) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              High Priority Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {highPriorityIssues.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No high priority issues</p>
            ) : (
              <div className="space-y-2">
                {highPriorityIssues.map(issue => (
                  <div key={issue.id} onClick={() => onSelectIssue(issue)}
                    className="p-3 bg-white/80 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">{issue.issue_number}</span>
                          <Badge className={SEVERITY_CONFIG[issue.severity]?.color}>{SEVERITY_CONFIG[issue.severity]?.label}</Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate">{issue.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{CATEGORY_LABELS[issue.category]} • {issue.area_name || issue.specific_location || "—"}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              30-Day Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Issues Reported</span>
              <span className="text-lg font-bold text-slate-800">{totalLast30}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm text-emerald-700">Closure Rate</span>
              <span className="text-lg font-bold text-emerald-600">{closureRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">Last 7 Days</span>
              <span className="text-lg font-bold text-blue-600">{recentIssues.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Overdue Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueIssues.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No overdue issues</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueIssues.map(issue => (
                  <div key={issue.id} onClick={() => onSelectIssue(issue)}
                    className="p-3 bg-orange-50 rounded-lg border border-orange-100 hover:border-orange-200 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{issue.title}</p>
                        <p className="text-xs text-orange-600">Due: {format(new Date(issue.due_date), "MMM d, yyyy")}</p>
                      </div>
                      <Badge className={SEVERITY_CONFIG[issue.severity]?.color}>{SEVERITY_CONFIG[issue.severity]?.label}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Issues by Category (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryStats.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No issues in the last 30 days</p>
            ) : (
              <div className="space-y-2">
                {categoryStats.slice(0, 6).map(cat => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700">{cat.label}</span>
                        <span className="text-sm font-medium text-slate-800">{cat.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-400 to-orange-400 rounded-full"
                          style={{ width: `${Math.min((cat.count / Math.max(...categoryStats.map(c => c.count))) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Issue Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[
              { key: "open", label: "Open", color: "bg-slate-500" },
              { key: "under_review", label: "Under Review", color: "bg-blue-500" },
              { key: "containment", label: "Containment", color: "bg-amber-500" },
              { key: "corrective_action", label: "Corrective Action", color: "bg-purple-500" },
              { key: "capa_required", label: "CAPA Required", color: "bg-rose-500" },
              { key: "pending_verification", label: "Pending Verify", color: "bg-teal-500" },
              { key: "closed", label: "Closed", color: "bg-emerald-500" }
            ].map(status => (
              <div key={status.key} className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg border border-slate-100">
                <div className={`w-3 h-3 rounded-full ${status.color}`} />
                <span className="text-sm text-slate-600">{status.label}</span>
                <span className="text-sm font-bold text-slate-800">{statusStats[status.key]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}