/**
 * Employee Layout Navigation (Desktop/Tablet)
 * Simple navigation for employees - no manager actions
 */

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Menu, ClipboardList, MessageSquare, BarChart3, Calendar, GraduationCap, Droplets, User } from "lucide-react";
import OfflineStatusIndicator from "@/components/offline/OfflineStatusIndicator";
import { createPageUrl } from "@/utils";
import { getTranslation } from "@/components/i18n/translations";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";

export default function EmployeeLayout({ employee }) {
  const initials = employee?.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const lang = employee?.preferred_language || localStorage.getItem("employee_language") || "en";
  const t = (category, key, fallback) => getTranslation(category, key, lang) || fallback;

  const handleMenuClick = (tab) => {
    window.location.href = createPageUrl("EmployeeDashboard") + `?tab=${tab}`;
  };

  return (
    <div className="flex items-center gap-2">
      <OfflineStatusIndicator showDetails={true} />
      
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-medium text-xs">
          {employee?.avatar_url ? (
            <img src={employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <span className="hidden sm:inline font-medium flex items-center gap-1">
          {employee?.name}
          <EmployeeBadgeIcons employee={employee} size="sm" />
          <BirthdayCakeIcon employee={employee} className="w-4 h-4" />
        </span>
      </div>

      {/* Employee Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 px-3">
            <Menu className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">{t("common", "menu", "Menu")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleMenuClick("tasks")}>
            <ClipboardList className="w-4 h-4 mr-2" />
            {t("dashboard", "myTasks", "My Tasks")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuClick("feedback")}>
            <MessageSquare className="w-4 h-4 mr-2" />
            {t("dashboard", "feedback", "Feedback")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuClick("performance")}>
            <BarChart3 className="w-4 h-4 mr-2" />
            {t("dashboard", "performance", "Performance")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuClick("schedule")}>
            <Calendar className="w-4 h-4 mr-2" />
            {t("dashboard", "schedule", "Schedule")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuClick("training")}>
            <GraduationCap className="w-4 h-4 mr-2" />
            {t("training", "training", "Training")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuClick("diverters")}>
            <Droplets className="w-4 h-4 mr-2" />
            {t("tasks", "rainDiverterInspection", "Rain Diverters")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { window.location.href = createPageUrl("MyProfile"); }}>
            <User className="w-4 h-4 mr-2" />
            My Profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}