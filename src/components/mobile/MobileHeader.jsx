/**
 * Mobile Header
 * Compact header with employee info and essential actions
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LogOut, RefreshCw, Plus, MoreVertical, Power, ArrowLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import OfflineStatusIndicator from "@/components/offline/OfflineStatusIndicator";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";

export default function MobileHeader({ 
  employee,
  onRefresh,
  onAddTasks,
  onLogout,
  onEndDay,
  isRefreshing = false,
  showBackButton = false,
  title = null,
  onBack = null
}) {
  const navigate = useNavigate();
  const initials = employee?.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-slate-200 safe-area-pt">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Back button or Employee Info */}
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-11 w-11 touch-manipulation flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          {title ? (
            <h1 className="font-semibold text-slate-900 text-lg truncate">{title}</h1>
          ) : (
            <>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {employee?.avatar_url ? (
              <img src={employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate text-sm flex items-center gap-1">
              {employee?.name}
              <EmployeeBadgeIcons employee={employee} size="xs" />
              <BirthdayCakeIcon employee={employee} className="w-4 h-4" />
            </p>
            <p className="text-xs text-slate-500">Ready to work</p>
          </div>
          </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Offline Status */}
          <OfflineStatusIndicator showDetails={false} />
          
          {/* Add Tasks - Large Touch Target */}
          {onAddTasks && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddTasks}
              className="h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation select-none"
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}

          {/* Refresh */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation select-none"
            >
              <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
            </Button>
          )}

          {/* More Menu */}
          {(onLogout || onEndDay) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation select-none">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onLogout && (
                <DropdownMenuItem onClick={onLogout} className="py-3 min-h-[44px] touch-manipulation select-none">
                  <LogOut className="w-4 h-4 mr-3" />
                  Switch Person
                </DropdownMenuItem>
              )}
              {onLogout && onEndDay && <DropdownMenuSeparator />}
              {onEndDay && (
                <DropdownMenuItem 
                  onClick={onEndDay} 
                  className="py-3 min-h-[44px] touch-manipulation select-none text-rose-600"
                >
                  <Power className="w-4 h-4 mr-3" />
                  End My Day
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}