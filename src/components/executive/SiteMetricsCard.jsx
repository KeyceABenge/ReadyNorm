/**
 * Compact card showing key metrics for a single site in the Executive Command Center.
 */
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SprayCan } from "lucide-react";

export default function SiteMetricsCard({ siteName, siteCode, metrics }) {
  if (!metrics) return null;

  const score = metrics.score || 0;
  const scoreColor = score >= 85 ? "text-emerald-600" : score >= 70 ? "text-blue-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  const scoreBg = score >= 85 ? "bg-emerald-50 border-emerald-200" : score >= 70 ? "bg-blue-50 border-blue-200" : score >= 50 ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200";

  const mssRate = metrics.mss?.rate ?? null;
  const mssColor = mssRate === null ? "text-slate-400" : mssRate >= 90 ? "text-emerald-600" : mssRate >= 70 ? "text-amber-600" : "text-rose-600";

  return (
    <Card className={cn("border-2 transition-all hover:shadow-md cursor-pointer", scoreBg)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-slate-900 truncate">{siteName}</p>
            {siteCode && <p className="text-[10px] text-slate-400">{siteCode}</p>}
          </div>
          <span className={cn("text-2xl font-bold", scoreColor)}>{score}</span>
        </div>
        <div className="space-y-1 text-xs">
          <MetricRow label="CAPAs Overdue" value={metrics.capas?.overdue || 0} warn={metrics.capas?.overdue > 0} />
          <MetricRow label="Pathogen +" value={metrics.emp?.pathogenPositives || 0} warn={metrics.emp?.pathogenPositives > 0} />
          <MetricRow label="Major Gaps" value={metrics.audit?.majorGaps || 0} warn={metrics.audit?.majorGaps > 0} />
          <MetricRow label="Critical Pest" value={metrics.pest?.critical || 0} warn={metrics.pest?.critical > 0} />
          {mssRate !== null && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 mt-1">
              <span className="text-slate-500 flex items-center gap-1">
                <SprayCan className="w-3 h-3" /> MSS
              </span>
              <span className={cn("font-semibold", mssColor)}>{mssRate}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, warn }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-medium", warn ? "text-rose-600" : "text-slate-700")}>{value}</span>
    </div>
  );
}