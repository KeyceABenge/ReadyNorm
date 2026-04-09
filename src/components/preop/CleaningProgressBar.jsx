import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CleaningProgressBar({ lineAssets, signOffs, assignments }) {
  if (!lineAssets.length) return null;

  // Find the most recent assignment for this line's assets
  const lineAssetIds = new Set(lineAssets.map(a => a.id));
  
  // Get sign-offs from today that match this line's assets
  const today = new Date().toISOString().split("T")[0];
  const recentSignOffs = signOffs.filter(so => 
    lineAssetIds.has(so.asset_id) && 
    so.signed_off_at?.startsWith(today)
  );

  // Build a map of asset_id -> most recent sign-off
  const assetSignOffMap = {};
  recentSignOffs.forEach(so => {
    const existing = assetSignOffMap[so.asset_id];
    if (!existing || new Date(so.signed_off_at) > new Date(existing.signed_off_at)) {
      assetSignOffMap[so.asset_id] = so;
    }
  });

  const cleanedCount = Object.keys(assetSignOffMap).length;
  const totalCount = lineAssets.length;
  const percent = totalCount > 0 ? Math.round((cleanedCount / totalCount) * 100) : 0;
  const allCleaned = cleanedCount === totalCount && totalCount > 0;

  if (cleanedCount === 0) {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <Clock className="w-3 h-3 text-slate-400" />
        <span className="text-xs text-slate-400">No cleaning sign-offs today</span>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {allCleaned ? (
            <Sparkles className="w-3 h-3 text-emerald-500" />
          ) : (
            <Clock className="w-3 h-3 text-amber-500" />
          )}
          <span className={cn(
            "text-xs font-medium",
            allCleaned ? "text-emerald-700" : "text-amber-700"
          )}>
            {allCleaned ? "All assets cleaned — Ready for inspection" : `Cleaning: ${cleanedCount}/${totalCount} assets signed off`}
          </span>
        </div>
        <span className={cn(
          "text-xs font-semibold",
          allCleaned ? "text-emerald-600" : "text-amber-600"
        )}>
          {percent}%
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            allCleaned ? "bg-emerald-500" : "bg-amber-400"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}