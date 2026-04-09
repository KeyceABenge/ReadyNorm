import { useQuery } from "@tanstack/react-query";
import { BadgeRepo } from "@/lib/adapters/database";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ProxiedImage from "@/components/ui/ProxiedImage";

/**
 * Displays up to 3 tiny badge icons next to an employee's name.
 * Pass the employee object — it reads display_badges array and fetches badge data.
 */
export default function EmployeeBadgeIcons({ employee, size = "sm" }) {
  const badgeIds = employee?.display_badges;
  const orgId = employee?.organization_id;
  
  const { data: allBadges = [] } = useQuery({
    queryKey: ["badges_active", orgId],
    queryFn: () => BadgeRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId && !!badgeIds && badgeIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (!badgeIds || badgeIds.length === 0 || allBadges.length === 0) return null;

  const badgeMap = new Map(allBadges.map(b => [b.id, b]));
  const displayBadges = badgeIds.map(id => badgeMap.get(id)).filter(Boolean).slice(0, 3);

  if (displayBadges.length === 0) return null;

  const sizeClass = size === "xs" ? "w-5 h-5" : size === "sm" ? "w-6 h-6" : size === "md" ? "w-7 h-7" : "w-8 h-8";

  return (
    <TooltipProvider delayDuration={300}>
      <span className="inline-flex items-center gap-0.5 align-middle">
        {displayBadges.map(badge => (
          <Tooltip key={badge.id}>
            <TooltipTrigger asChild>
              <ProxiedImage
                src={badge.photo_url}
                alt={badge.name}
                className={`${sizeClass} rounded-full object-cover ring-1 ring-white align-middle`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {badge.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </span>
    </TooltipProvider>
  );
}