import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, subDays, isAfter } from "date-fns";
import { AlertTriangle, Clock, TrendingUp, ArrowRight, CheckCircle2, Users } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { color: "bg-rose-100 text-rose-700", label: "Critical" },
  major: { color: "bg-amber-100 text-amber-700", label: "Major" },
  moderate: { color: "bg-yellow-100 text-yellow-700", label: "Moderate" },
  minor: { color: "bg-slate-100 text-slate-600", label: "Minor" }
};

const COMPLAINT_TYPE_LABELS = {
  foreign_material: "Foreign Material", quality_defect: "Quality Defect", food_safety: "Food Safety",
  allergen: "Allergen", labeling: "Labeling", packaging: "Packaging", taste_odor: "Taste/Odor",
  appearance: "Appearance", short_weight: "Short Weight", spoilage: "Spoilage", other: "Other"
};

const IMPACT_CONFIG = {
  none: { color: "bg-slate-100 text-slate-600", label: "No Impact" },
  inconvenience: { color: "bg-blue-100 text-blue-700", label: "Inconvenience" },
  illness_claimed: { color: "bg-amber-100 text-amber-700", label: "Illness Claimed" },
  illness_confirmed: { color: "bg-rose-100 text-rose-700", label: "Illness Confirmed" },
  injury: { color: "bg-red-100 text-red-700", label: "Injury" },
  hospitalization: { color: "bg-red-200 text-red-800", label: "Hospitalization" }
};

export default function ComplaintDashboard({ complaints, onSelectComplaint, onNewComplaint }) {
  const today = new Date();
  const last7Days = subDays(today, 7);
  const last30Days = subDays(today, 30);

  const recentComplaints = complaints.filter(c => isAfter(new Date(c.created_date), last7Days));
  
  const urgentComplaints = complaints.filter(c =>
    !["closed", "responded"].includes(c.status) &&
    (c.severity === "critical" || c.severity === "major" || 
     ["illness_claimed", "illness_confirmed", "injury", "hospitalization"].includes(c.customer_impact))
  ).slice(0, 5);

  const overdueComplaints = complaints.filter(c =>
    !["closed", "responded"].includes(c.status) &&
    c.response_due_date && new Date(c.response_due_date) < today
  ).slice(0, 5);

  const typeStats = Object.keys(COMPLAINT_TYPE_LABELS).map(type => ({
    type, label: COMPLAINT_TYPE_LABELS[type],
    count: complaints.filter(c => c.complaint_type === type && isAfter(new Date(c.created_date), last30Days)).length
  })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

  const statusStats = {
    received: complaints.filter(c => c.status === "received").length,
    under_investigation: complaints.filter(c => c.status === "under_investigation").length,
    root_cause_identified: complaints.filter(c => c.status === "root_cause_identified").length,
    corrective_action: complaints.filter(c => c.status === "corrective_action").length,
    pending_response: complaints.filter(c => c.status === "pending_response").length,
    responded: complaints.filter(c => c.status === "responded").length,
    closed: complaints.filter(c => c.status === "closed").length
  };

  const topCustomers = complaints.reduce((acc, c) => {
    if (c.customer_name && isAfter(new Date(c.created_date), last30Days)) {
      acc[c.customer_name] = (acc[c.customer_name] || 0) + 1;
    }
    return acc;
  }, {});

  const customerStats = Object.entries(topCustomers)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const closedLast30 = complaints.filter(c => c.status === "closed" && c.closed_at && isAfter(new Date(c.closed_at), last30Days)).length;
  const totalLast30 = complaints.filter(c => isAfter(new Date(c.created_date), last30Days)).length;
  const closureRate = totalLast30 > 0 ? Math.round((closedLast30 / totalLast30) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Urgent Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            {urgentComplaints.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No urgent complaints</p>
            ) : (
              <div className="space-y-2">
                {urgentComplaints.map(complaint => (
                  <div key={complaint.id} onClick={() => onSelectComplaint(complaint)}
                    className="p-3 bg-white/80 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">{complaint.complaint_number}</span>
                          <Badge className={SEVERITY_CONFIG[complaint.severity]?.color}>{SEVERITY_CONFIG[complaint.severity]?.label}</Badge>
                          {complaint.customer_impact && complaint.customer_impact !== "none" && (
                            <Badge className={IMPACT_CONFIG[complaint.customer_impact]?.color}>{IMPACT_CONFIG[complaint.customer_impact]?.label}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-800">{complaint.customer_name}</p>
                        <p className="text-xs text-slate-500 mt-1">{COMPLAINT_TYPE_LABELS[complaint.complaint_type]} • {complaint.product_name || "—"}</p>
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
              <span className="text-sm text-slate-600">Complaints Received</span>
              <span className="text-lg font-bold text-slate-800">{totalLast30}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm text-emerald-700">Closure Rate</span>
              <span className="text-lg font-bold text-emerald-600">{closureRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">Last 7 Days</span>
              <span className="text-lg font-bold text-blue-600">{recentComplaints.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Overdue Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueComplaints.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">All responses on track</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueComplaints.map(complaint => (
                  <div key={complaint.id} onClick={() => onSelectComplaint(complaint)}
                    className="p-3 bg-orange-50 rounded-lg border border-orange-100 hover:border-orange-200 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{complaint.customer_name}</p>
                        <p className="text-xs text-orange-600">Due: {format(new Date(complaint.response_due_date), "MMM d, yyyy")}</p>
                      </div>
                      <Badge className={SEVERITY_CONFIG[complaint.severity]?.color}>{SEVERITY_CONFIG[complaint.severity]?.label}</Badge>
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
              <Users className="w-4 h-4 text-purple-500" />
              Top Customers (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customerStats.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No complaints in the last 30 days</p>
            ) : (
              <div className="space-y-2">
                {customerStats.map((cust, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700 truncate">{cust.name}</span>
                        <span className="text-sm font-medium text-slate-800">{cust.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                          style={{ width: `${Math.min((cust.count / Math.max(...customerStats.map(c => c.count))) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Complaints by Type (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {typeStats.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No complaints in the last 30 days</p>
            ) : (
              <div className="space-y-2">
                {typeStats.slice(0, 6).map(t => (
                  <div key={t.type} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700">{t.label}</span>
                        <span className="text-sm font-medium text-slate-800">{t.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                          style={{ width: `${Math.min((t.count / Math.max(...typeStats.map(x => x.count))) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Complaint Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[
                { key: "received", label: "Received", color: "bg-slate-500" },
                { key: "under_investigation", label: "Investigating", color: "bg-blue-500" },
                { key: "root_cause_identified", label: "Root Cause", color: "bg-amber-500" },
                { key: "corrective_action", label: "Corrective Action", color: "bg-purple-500" },
                { key: "pending_response", label: "Pending Response", color: "bg-teal-500" },
                { key: "responded", label: "Responded", color: "bg-cyan-500" },
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
    </div>
  );
}