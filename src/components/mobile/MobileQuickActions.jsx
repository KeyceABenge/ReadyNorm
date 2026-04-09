/**
 * Mobile Quick Actions
 * Large, easy-to-tap action buttons for common tasks
 */

import { 
  Droplets, Package2, FlaskConical, Droplet, 
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MobileQuickActions({ 
  showDiverters = false,
  showInventory = false,
  showDrains = false,
  showLineCleanings = false,
  diverterCount = 0,
  inventoryPending = false,
  drainCount = 0,
  lineCleaningCount = 0,
  onDiverterTap,
  onInventoryTap,
  onDrainTap,
  selectedDrainIds = [],
  lineCleaningAssignments = [],
  onLineCleaningTap
}) {
  const actions = [];

  if (showLineCleanings && lineCleaningCount > 0) {
    // Navigate to the first active assignment, or to the line cleanings tab
    const firstAssignment = lineCleaningAssignments.find(a => a.status === "in_progress") || lineCleaningAssignments[0];
    const lineHref = firstAssignment 
      ? createPageUrl("LineCleaningDetail") + `?id=${firstAssignment.id}`
      : null;
    
    actions.push({
      id: "lines",
      label: "Line Cleanings",
      sublabel: `${lineCleaningCount} scheduled`,
      icon: Package2,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      href: lineHref,
      onClick: !lineHref ? onLineCleaningTap : null,
      badge: lineCleaningCount
    });
  }

  if (showDiverters) {
    actions.push({
      id: "diverters",
      label: "Rain Diverters",
      sublabel: "Bucket inspection",
      icon: Droplets,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      href: createPageUrl("RainDiverters"),
      badge: diverterCount > 0 ? diverterCount : null
    });
  }

  if (showInventory) {
    actions.push({
      id: "inventory",
      label: "Chemical Inventory",
      sublabel: inventoryPending ? "Count pending" : "Up to date",
      icon: FlaskConical,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      href: createPageUrl("EmployeeInventoryCount"),
      badge: inventoryPending ? "!" : null
    });
  }

  if (showDrains && drainCount > 0) {
    actions.push({
      id: "drains",
      label: "Drain Cleaning",
      sublabel: `${drainCount} drains assigned`,
      icon: Droplet,
      color: "bg-cyan-500",
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-200",
      href: createPageUrl("EmployeeDrainCleaning") + `?drains=${selectedDrainIds.join(",")}`,
      badge: drainCount
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide px-1">
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <div
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                "touch-manipulation active:scale-[0.98]",
                action.bgColor,
                action.borderColor
              )}
              onClick={action.onClick}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", action.color)}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{action.label}</p>
                <p className="text-sm text-slate-500">{action.sublabel}</p>
              </div>
              {action.badge && (
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                  action.color
                )}>
                  {action.badge}
                </div>
              )}
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          );

          if (action.href) {
            return (
              <Link key={action.id} to={action.href}>
                {content}
              </Link>
            );
          }

          return <div key={action.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}