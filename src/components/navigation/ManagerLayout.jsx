/**
 * Manager Layout Navigation
 * Full navigation with all manager actions (Refresh, New Task, Menu)
 */

import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";
import OfflineStatusIndicator from "@/components/offline/OfflineStatusIndicator";
import ManagerMenu from "@/components/navigation/ManagerMenu";
import useManagerBadgeCounts from "@/hooks/useManagerBadgeCounts";

export default function ManagerLayout({ user, orgId }) {
  const badgeCounts = useManagerBadgeCounts(orgId);

  return (
    <div className="flex items-center gap-1 md:gap-2">
      <OfflineStatusIndicator showDetails={true} />
      
      {/* Refresh button - icon only on mobile, with text on desktop */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => window.location.reload()}
        className="h-9 w-9 p-0 md:w-auto md:px-3 rounded-full"
      >
        <RefreshCw className="w-4 h-4 md:mr-1.5" />
        <span className="hidden md:inline text-xs">Refresh</span>
      </Button>
      
      {/* New Task button - icon only on mobile, with text on desktop */}
      <Button 
        size="sm"
        className="bg-slate-900 hover:bg-slate-800 h-9 w-9 p-0 md:w-auto md:px-3 rounded-full"
        onClick={() => {
          // If already on ManagerDashboard, dispatch a custom event to open the modal
          if (window.location.pathname.includes("ManagerDashboard")) {
            window.dispatchEvent(new CustomEvent("openNewTaskModal"));
          } else {
            window.location.href = createPageUrl("ManagerDashboard") + "?action=newTask";
          }
        }}
      >
        <Plus className="w-4 h-4 md:mr-1.5" />
        <span className="hidden md:inline text-xs">New Task</span>
      </Button>
      
      {/* Manager Menu - always visible */}
      <div className="relative">
        <ManagerMenu 
          activeTab="overview"
          setActiveTab={(tab) => {
            if (tab !== "sign-out") {
              window.location.href = createPageUrl("ManagerDashboard") + `?tab=${tab}`;
            }
          }}
          badgeCounts={badgeCounts}
          user={user}
        />
        {badgeCounts.total > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center pointer-events-none">
            {badgeCounts.total > 9 ? "9+" : badgeCounts.total}
          </span>
        )}
      </div>
    </div>
  );
}