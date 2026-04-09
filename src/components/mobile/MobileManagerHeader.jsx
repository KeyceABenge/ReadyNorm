/**
 * Mobile Manager Header
 * Compact header with actions and offline status for manager dashboard
 */

import { Button } from "@/components/ui/button";
import { 
  Plus, RefreshCw, Menu
} from "lucide-react";


import { cn } from "@/lib/utils";
import OfflineStatusIndicator from "@/components/offline/OfflineStatusIndicator";

export default function MobileManagerHeader({ 
  title = "Dashboard",
  onRefresh,
  onNewTask,
  onOpenMenu,
  isRefreshing = false
}) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-slate-200 safe-area-pt md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Title */}
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-lg text-slate-900 truncate">{title}</h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Offline Status */}
          <OfflineStatusIndicator showDetails={false} />
          
          {/* New Task - Large Touch Target */}
          <Button
            size="icon"
            onClick={onNewTask}
            className="h-10 w-10 touch-manipulation bg-slate-900 hover:bg-slate-800"
          >
            <Plus className="w-5 h-5" />
          </Button>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-10 w-10 touch-manipulation"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </Button>

          {/* Menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMenu}
            className="h-10 w-10 touch-manipulation"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}