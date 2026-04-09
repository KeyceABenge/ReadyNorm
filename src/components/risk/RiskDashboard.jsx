import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowRight, CheckCircle2, Clock, Calendar } from "lucide-react";

const RISK_LEVEL_CONFIG = {
  low: { color: "bg-emerald-100 text-emerald-700", bgColor: "bg-emerald-500" },
  medium: { color: "bg-yellow-100 text-yellow-700", bgColor: "bg-yellow-500" },
  high: { color: "bg-orange-100 text-orange-700", bgColor: "bg-orange-500" },
  critical: { color: "bg-rose-100 text-rose-700", bgColor: "bg-rose-500" }
};

const TREND_ICONS = { improving: TrendingDown, stable: Minus, worsening: TrendingUp };
const TREND_COLORS = { improving: "text-emerald-500", stable: "text-slate-400", worsening: "text-rose-500" };

export default function RiskDashboard({ risks, reviews, onSelectRisk, onSelectReview }) {
  const activeRisks = risks.filter(r => !["closed", "accepted"].includes(r.status));
  const now = new Date();

  const risksByLevel = {
    critical: activeRisks.filter(r => r.risk_level === "critical"),
    high: activeRisks.filter(r => r.risk_level === "high"),
    medium: activeRisks.filter(r => r.risk_level === "medium"),
    low: activeRisks.filter(r => r.risk_level === "low")
  };

  const overdueReviews = activeRisks.filter(r => r.next_review_date && new Date(r.next_review_date) < now);
  const upcomingReviews = activeRisks.filter(r => {
    if (!r.next_review_date) return false;
    const d = new Date(r.next_review_date);
    return d >= now && d <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }).slice(0, 5);

  const pendingMgmtReviews = reviews.filter(r => ["draft", "scheduled", "in_progress"].includes(r.status)).slice(0, 3);
  const recentMgmtReviews = reviews.filter(r => r.status === "completed").slice(0, 3);

  const topRisks = [...activeRisks].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 5);

  const risksByCategory = {};
  activeRisks.forEach(r => { risksByCategory[r.category] = (risksByCategory[r.category] || 0) + 1; });

  const risksBySource = {};
  activeRisks.forEach(r => { risksBySource[r.source] = (risksBySource[r.source] || 0) + 1; });

  return (
    <div className="space-y-6">
      {/* Risk Matrix Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { level: "critical", label: "Critical Risks", count: risksByLevel.critical.length },
          { level: "high", label: "High Risks", count: risksByLevel.high.length },
          { level: "medium", label: "Medium Risks", count: risksByLevel.medium.length },
          { level: "low", label: "Low Risks", count: risksByLevel.low.length }
        ].map(item => (
          <Card key={item.level} className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${RISK_LEVEL_CONFIG[item.level].bgColor}`} />
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
              <p className={`text-3xl font-bold ${item.level === "critical" ? "text-rose-600" : item.level === "high" ? "text-orange-600" : item.level === "medium" ? "text-yellow-600" : "text-emerald-600"}`}>
                {item.count}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Risks */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />Top Risks by Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topRisks.length === 0 ? (
              <div className="text-center py-6"><CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" /><p className="text-sm text-slate-500">No active risks</p></div>
            ) : (
              <div className="space-y-2">
                {topRisks.map(risk => {
                  const TrendIcon = TREND_ICONS[risk.trend] || Minus;
                  return (
                    <div key={risk.id} onClick={() => onSelectRisk(risk)} className="p-3 bg-white/80 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-slate-400">{risk.risk_number}</span>
                            <Badge className={RISK_LEVEL_CONFIG[risk.risk_level]?.color}>{risk.risk_level}</Badge>
                            <Badge variant="outline" className="capitalize">{risk.category.replace(/_/g, " ")}</Badge>
                          </div>
                          <p className="text-sm font-medium text-slate-800">{risk.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>Score: <strong>{risk.risk_score || "—"}</strong></span>
                            <span className="flex items-center gap-1"><TrendIcon className={`w-3 h-3 ${TREND_COLORS[risk.trend]}`} />{risk.trend}</span>
                            {risk.owner_name && <span>Owner: {risk.owner_name}</span>}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3"><CardTitle className="text-base">By Category</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(risksByCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700 capitalize">{cat.replace(/_/g, " ")}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {Object.keys(risksByCategory).length === 0 && <p className="text-sm text-slate-500 text-center py-4">No risks</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Risk Reviews */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" />Overdue Risk Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueReviews.length === 0 ? (
              <div className="text-center py-6"><CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" /><p className="text-sm text-slate-500">All reviews up to date</p></div>
            ) : (
              <div className="space-y-2">
                {overdueReviews.slice(0, 5).map(risk => (
                  <div key={risk.id} onClick={() => onSelectRisk(risk)} className="p-3 bg-amber-50 rounded-lg border border-amber-100 cursor-pointer hover:border-amber-200">
                    <p className="text-sm font-medium text-slate-800">{risk.title}</p>
                    <p className="text-xs text-amber-600">Due: {format(new Date(risk.next_review_date), "MMM d, yyyy")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Management Reviews */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-500" />Management Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingMgmtReviews.length === 0 && recentMgmtReviews.length === 0 ? (
              <div className="text-center py-6"><p className="text-sm text-slate-500">No reviews scheduled</p></div>
            ) : (
              <div className="space-y-3">
                {pendingMgmtReviews.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Upcoming</p>
                    {pendingMgmtReviews.map(review => (
                      <div key={review.id} onClick={() => onSelectReview(review)} className="p-3 bg-purple-50 rounded-lg border border-purple-100 cursor-pointer hover:border-purple-200 mb-2">
                        <p className="text-sm font-medium text-slate-800">{review.title}</p>
                        <p className="text-xs text-purple-600">{review.scheduled_date ? format(new Date(review.scheduled_date), "MMM d, yyyy") : "Not scheduled"} • {review.status}</p>
                      </div>
                    ))}
                  </div>
                )}
                {recentMgmtReviews.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Recent</p>
                    {recentMgmtReviews.map(review => (
                      <div key={review.id} onClick={() => onSelectReview(review)} className="p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                        <p className="text-sm text-slate-700">{review.title}</p>
                        <p className="text-xs text-slate-500">{review.actual_date ? format(new Date(review.actual_date), "MMM d, yyyy") : "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}