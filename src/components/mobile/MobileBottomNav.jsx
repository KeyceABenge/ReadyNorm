/**
 * Mobile Bottom Navigation
 * Fixed bottom nav with large touch targets for one-handed use
 * Includes a "More" menu for additional pages
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { 
  ClipboardList, MessageSquare, BarChart3, 
  GraduationCap, Droplets, Calendar, Menu, X,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

const navItems = [
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "feedback", label: "Messages", icon: MessageSquare },
  { id: "performance", label: "Stats", icon: BarChart3 },
  { id: "training", label: "Training", icon: GraduationCap },
];

const moreTabItems = [
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "diverters", label: "Rain Diverters", icon: Droplets },
  { id: "profile", label: "My Profile", icon: User, route: "MyProfile" },
];

// Root routes for each tab section - used when clicking active tab
const TAB_ROOT_ROUTES = {
  tasks: "EmployeeDashboard",
  feedback: "EmployeeDashboard",
  performance: "EmployeeDashboard",
  training: "EmployeeDashboard",
  schedule: "EmployeeDashboard",
  diverters: "EmployeeDashboard",
  lines: "EmployeeDashboard",
  profile: "EmployeeDashboard"
};

export default function MobileBottomNav({ 
  activeTab, 
  onTabChange, 
  badges = {},
  onActiveTabClick = null // Called when clicking already active tab
}) {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  
  const isMoreTabActive = moreTabItems.some(item => item.id === activeTab);
  
  const handleTabClick = (tabId) => {
    setMoreOpen(false);
    // Check if the tab has a dedicated route
    const tabItem = moreTabItems.find(item => item.id === tabId);
    if (tabItem?.route) {
      navigate(createPageUrl(tabItem.route));
      return;
    }
    if (tabId === activeTab) {
      if (onActiveTabClick) {
        onActiveTabClick(tabId);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const rootRoute = TAB_ROOT_ROUTES[tabId];
        if (rootRoute && !window.location.pathname.includes(rootRoute)) {
          navigate(createPageUrl(rootRoute));
        }
      }
    } else {
      onTabChange(tabId);
    }
  };

  const handleMoreClick = () => {
    setMoreOpen(prev => !prev);
  };

  const navContent = (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/30 z-[9997]"
          onClick={() => setMoreOpen(false)}
        />
      )}
      
      {/* More menu popup */}
      {moreOpen && (
        <div className="md:hidden fixed bottom-[68px] right-2 bg-white rounded-2xl border border-slate-200 shadow-xl z-[9999] w-56 py-2 safe-area-pb">
          {moreTabItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  "active:bg-slate-100 min-h-[48px]",
                  isActive ? "bg-slate-50 text-slate-900" : "text-slate-600"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-slate-900" : "text-slate-400")} />
                <span className={cn("text-sm font-medium", isActive && "font-semibold")}>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[9998] safe-area-pb">
        <div className="flex items-stretch h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = badges[item.id] || 0;
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5",
                  "touch-manipulation active:bg-slate-100 transition-colors",
                  "relative min-h-[64px] min-w-[44px]",
                  "select-none",
                  isActive && "text-blue-600"
                )}
              >
                <div className="relative">
                  <Icon className={cn(
                    "w-6 h-6 transition-colors",
                    isActive ? "text-slate-900" : "text-slate-400"
                  )} />
                  {badgeCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#e8734a] rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">
                        {badgeCount > 9 ? "9+" : badgeCount}
                      </span>
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-slate-900" : "text-slate-500"
                )}>
                  {item.label}
                </span>
                
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-slate-900 rounded-b-full" />
                )}
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={handleMoreClick}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5",
              "touch-manipulation active:bg-slate-100 transition-colors",
              "relative min-h-[64px] min-w-[44px]",
              "select-none"
            )}
          >
            <div className="relative">
              {moreOpen ? (
                <X className={cn("w-6 h-6 transition-colors", isMoreTabActive ? "text-slate-900" : "text-slate-400")} />
              ) : (
                <Menu className={cn("w-6 h-6 transition-colors", isMoreTabActive ? "text-slate-900" : "text-slate-400")} />
              )}
            </div>
            <span className={cn(
              "text-[10px] font-medium transition-colors",
              isMoreTabActive ? "text-slate-900" : "text-slate-500"
            )}>
              More
            </span>
            
            {/* Active Indicator for More tab items */}
            {isMoreTabActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-slate-900 rounded-b-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );

  return createPortal(navContent, document.body);
}