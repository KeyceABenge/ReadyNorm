/**
 * Mobile Tab Selector
 * Horizontal scrollable tabs for mobile view
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";

export default function MobileTabSelector({ 
  tabs, 
  activeTab, 
  onTabChange,
  badges = {}
}) {
  const containerRef = useRef(null);
  const activeRef = useRef(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      
      if (activeRect.left < containerRect.left) {
        container.scrollLeft -= (containerRect.left - activeRect.left) + 20;
      } else if (activeRect.right > containerRect.right) {
        container.scrollLeft += (activeRect.right - containerRect.right) + 20;
      }
    }
  }, [activeTab]);

  return (
    <div 
      ref={containerRef}
      className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const badgeCount = badges[tab.id] || 0;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            ref={isActive ? activeRef : null}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap",
              "touch-manipulation transition-colors flex-shrink-0",
              "text-sm font-medium",
              isActive 
                ? "bg-slate-900 text-white" 
                : "bg-white text-slate-600 border border-slate-200"
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            {badgeCount > 0 && (
              <Badge 
                className={cn(
                  "h-5 px-1.5 text-xs",
                  isActive ? "bg-white text-slate-900" : "bg-rose-500 text-white"
                )}
              >
                {badgeCount}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}