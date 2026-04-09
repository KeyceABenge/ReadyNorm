import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import BadgeSelector from "@/components/badges/BadgeSelector";
import { Lock, ChevronRight } from "lucide-react";
import ProxiedImage from "@/components/ui/ProxiedImage";

function BadgeSeriesDisplay({ seriesId, seriesBadges, earnedBadgeIds, badgeProgress }) {
  // Sort by series_order
  const sorted = [...seriesBadges].sort((a, b) => (a.series_order || 0) - (b.series_order || 0));
  
  // Find the highest earned badge in the series
  let highestEarnedIdx = -1;
  sorted.forEach((b, i) => {
    if (earnedBadgeIds.has(b.id)) highestEarnedIdx = i;
  });

  const highestEarned = highestEarnedIdx >= 0 ? sorted[highestEarnedIdx] : null;
  const nextBadge = highestEarnedIdx < sorted.length - 1 ? sorted[highestEarnedIdx + 1] : null;

  // Calculate progress to next badge
  const nextProgress = nextBadge ? (badgeProgress?.[nextBadge.id] || 0) : null;
  const nextThreshold = nextBadge?.threshold || 1;
  const progressPct = nextProgress !== null ? Math.min(100, Math.round((nextProgress / nextThreshold) * 100)) : null;

  return (
    <Card className="p-4 border border-slate-200 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{seriesId}</span>
        <span className="text-[10px] text-slate-400">({sorted.length} tiers)</span>
      </div>

      {/* Tier progression row */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
        {sorted.map((b, idx) => {
          const isEarned = earnedBadgeIds.has(b.id);
          const isCurrent = highestEarned?.id === b.id;
          const isNext = nextBadge?.id === b.id;
          return (
            <div key={b.id} className="flex items-center">
              <div className={`relative flex flex-col items-center ${idx > 0 ? "ml-0" : ""}`}>
                <div className={`w-10 h-10 rounded-full border-2 overflow-hidden flex-shrink-0 transition-all ${
                  isCurrent ? "border-slate-900 ring-2 ring-slate-900/20" :
                  isEarned ? "border-emerald-500" :
                  isNext ? "border-amber-400 border-dashed" :
                  "border-slate-200 opacity-40"
                }`}>
                  <ProxiedImage 
                    src={b.photo_url} 
                    alt={b.name} 
                    className={`w-full h-full object-cover ${!isEarned && !isNext ? "grayscale" : isNext ? "grayscale-[50%]" : ""}`}
                  />
                </div>
                {isCurrent && (
                  <Badge className="absolute -bottom-1 text-[8px] px-1 py-0 bg-slate-900">Current</Badge>
                )}
                {isNext && (
                  <Badge variant="outline" className="absolute -bottom-1 text-[8px] px-1 py-0 border-amber-400 text-amber-600 bg-amber-50">Next</Badge>
                )}
              </div>
              {idx < sorted.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-300 mx-0.5 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Current + Next detail */}
      <div className="space-y-2">
        {highestEarned ? (
          <div className="flex items-center gap-2">
            <ProxiedImage src={highestEarned.photo_url} alt="" className="w-8 h-8 rounded object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{highestEarned.name}</p>
              <p className="text-xs text-emerald-600">Earned ✓</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500">
            <Lock className="w-4 h-4" />
            <p className="text-xs">No badges earned in this series yet</p>
          </div>
        )}

        {nextBadge && (
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <ProxiedImage src={nextBadge.photo_url} alt="" className="w-6 h-6 rounded object-cover opacity-70" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700">Next: {nextBadge.name}</p>
                <p className="text-[10px] text-slate-500">{nextBadge.description}</p>
              </div>
            </div>
            {progressPct !== null && (
              <div className="flex items-center gap-2">
                <Progress value={progressPct} className="h-1.5 flex-1" />
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{nextProgress}/{nextThreshold}</span>
              </div>
            )}
          </div>
        )}

        {!nextBadge && highestEarned && (
          <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg p-2 text-center font-medium">
            🎉 Series complete!
          </p>
        )}
      </div>
    </Card>
  );
}

export default function BadgesDisplay({ badges, earnedBadges, employee, onDisplayBadgesUpdate, badgeProgress }) {
  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">No badges earned yet. Keep working on tasks to unlock achievements!</p>
      </div>
    );
  }

  const earnedBadgeIds = new Set(earnedBadges.map(b => b.id));

  // Separate badges into series and standalone
  const seriesMap = {};
  const standaloneBadges = [];
  badges.forEach(b => {
    if (b.series_id) {
      if (!seriesMap[b.series_id]) seriesMap[b.series_id] = [];
      seriesMap[b.series_id].push(b);
    } else {
      standaloneBadges.push(b);
    }
  });

  const seriesEntries = Object.entries(seriesMap);

  return (
    <div>
      {/* Badge selector for display */}
      {employee && earnedBadges.length > 0 && (
        <BadgeSelector employee={employee} earnedBadges={earnedBadges} onUpdate={onDisplayBadgesUpdate} />
      )}

      <div className="mb-6 mt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Achievements ({earnedBadges.length}/{badges.length})
        </h3>

        {/* Series badges */}
        {seriesEntries.length > 0 && (
          <div className="space-y-3 mb-6">
            {seriesEntries.map(([seriesId, seriesBadges]) => (
              <BadgeSeriesDisplay
                key={seriesId}
                seriesId={seriesId}
                seriesBadges={seriesBadges}
                earnedBadgeIds={earnedBadgeIds}
                badgeProgress={badgeProgress}
              />
            ))}
          </div>
        )}

        {/* Standalone badges grid */}
        {standaloneBadges.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {standaloneBadges.map((badge, idx) => {
              const isEarned = earnedBadgeIds.has(badge.id);
              
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`p-4 text-center cursor-default transition-all ${
                    isEarned 
                      ? 'bg-white border-2 shadow-md' 
                      : 'bg-slate-50 border border-slate-200 opacity-60'
                  }`}
                  style={isEarned ? { borderColor: "#1e293b" } : {}}
                  >
                    <div className={`mb-2 ${!isEarned && 'grayscale'}`}>
                      <ProxiedImage 
                        src={badge.photo_url} 
                        alt={badge.name}
                        className="w-16 h-16 rounded object-cover mx-auto"
                      />
                    </div>
                    <h4 className="font-semibold text-sm text-slate-900">{badge.name}</h4>
                    <p className="text-xs text-slate-600 mt-2">{badge.description}</p>
                    {isEarned && (
                      <div className="mt-2 inline-block">
                        <Badge className="text-xs bg-slate-900">
                          Unlocked
                        </Badge>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}