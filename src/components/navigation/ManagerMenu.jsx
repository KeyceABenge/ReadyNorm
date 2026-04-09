import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { logout } from "@/lib/adapters/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Menu, ChevronDown, ChevronRight, Star, StarOff, LogOut,
  BarChart3, TrendingUp, ClipboardList, Package2, Zap, Droplets, Droplet, FlaskConical,
  Calendar, Clock, FolderOpen, Users, Trophy, Shield, FileText, Flag, Megaphone,
  MessageSquare, Settings, Brain, Heart, Lock, AlertTriangle, Bug, UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

import ManagerProfileModal from "@/components/navigation/ManagerProfileModal";

const MENU_SECTIONS = [
  {
    id: "overview",
    label: "Overview",
    color: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    activeColor: "bg-slate-600",
    items: [
      { id: "overview", label: "Overview", icon: BarChart3 }
    ]
  },
  {
    id: "operations",
    label: "Operations (Daily Execution)",
    color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    activeColor: "bg-blue-600",
    items: [
      { id: "tasks", label: "Tasks", icon: ClipboardList },
      { id: "line-cleanings", label: "Line Cleanings", icon: Package2 },
      { id: "assignments", label: "Schedule Cleanings", icon: Zap },
      { id: "shift-handoff", label: "Shift Handoff", icon: FileText, isLink: true, href: "ShiftHandoff" },
      { id: "rain-diverters", label: "Rain Diverters", icon: Droplets, isLink: true, href: "ManagerRainDiverters" },
      { id: "drain-cleaning", label: "Drain Cleaning", icon: Droplet, isLink: true, href: "DrainManagement" },
      { id: "chemical-inventory", label: "Chemical Inventory", icon: Package2, isLink: true, href: "ChemicalInventory" },
      { id: "sds-management", label: "SDS Documents", icon: FileText, isLink: true, href: "SDSManagement" },
      { id: "allergen-matrix", label: "Allergen Matrix", icon: AlertTriangle, isLink: true, href: "AllergenMatrix" },
      { id: "pest-control", label: "Pest Control", icon: Bug, isLink: true, href: "PestControl" },
      { id: "emp", label: "Environmental Monitoring", icon: FlaskConical, isLink: true, href: "EnvironmentalMonitoring" },
      { id: "chemicals", label: "Chemical Titrations", icon: FlaskConical }
    ]
  },
  {
    id: "planning",
    label: "Planning & Scheduling",
    color: "bg-purple-50 text-purple-700 hover:bg-purple-100",
    activeColor: "bg-purple-600",
    items: [
      { id: "plant-schedule", label: "Plant Schedule", icon: Calendar },
      { id: "schedules", label: "Schedules", icon: Clock },
      { id: "task-groups", label: "Task Groups", icon: FolderOpen }
    ]
  },
  {
    id: "people",
    label: "People & Teams",
    color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    activeColor: "bg-emerald-600",
    items: [
      { id: "employees", label: "Employees", icon: Users },
      { id: "crews", label: "Crews", icon: Users },
      { id: "badges", label: "Badges", icon: Trophy },
      { id: "team-health", label: "Team Health", icon: Heart },
      { id: "mentor-coach", label: "Mentor/Coach Mode", icon: Brain }
    ]
  },
  {
    id: "standards",
    label: "Standards & Training",
    color: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    activeColor: "bg-amber-600",
    items: [
      { id: "training-docs", label: "Training Documents", icon: FolderOpen },
      { id: "competency", label: "Competency Management", icon: Shield, badgeKey: "competency" }
    ]
  },
  {
    id: "records",
    label: "Records & Verification",
    color: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
    activeColor: "bg-cyan-600",
    items: [
      { id: "records", label: "Records", icon: FileText },
      { id: "verification", label: "Manager Verification", icon: Shield, badgeKey: "verification" },
      { id: "compliance", label: "Regulatory Compliance", icon: Shield, isLink: true, href: "ComplianceDashboard" },
      { id: "reports", label: "Condition Reports", icon: Flag, badgeKey: "reports" },
      { id: "incidents", label: "Incidents & Near Misses", icon: AlertTriangle, isLink: true, href: "IncidentsPage" },
      { id: "downtime-capa", label: "Downtime & CAPA", icon: Clock, isLink: true, href: "DowntimeTracking" },
      { id: "soc2-compliance", label: "SOC 2 Compliance", icon: Shield, isLink: true, href: "SOC2Compliance" },
      { id: "audit-mode", label: "Audit Mode", icon: Lock, isLink: true, href: "AuditMode" }
    ]
  },
  {
    id: "analytics",
    label: "Analytics & Insights",
    color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    activeColor: "bg-indigo-600",
    items: [
      { id: "analytics", label: "Analytics", icon: TrendingUp },
      { id: "narrative", label: "Executive Summary", icon: FileText },
      { id: "simulation", label: "Scenario Simulation", icon: FlaskConical }
    ]
  },
  {
    id: "communications",
    label: "Communications",
    color: "bg-pink-50 text-pink-700 hover:bg-pink-100",
    activeColor: "bg-pink-600",
    items: [
      { id: "announcements", label: "Announcements", icon: Megaphone },
      { id: "feedback", label: "Employee Feedback", icon: MessageSquare, badgeKey: "feedback" }
    ]
  },
  {
    id: "system",
    label: "Settings",
    color: "bg-stone-100 text-stone-700 hover:bg-stone-200",
    activeColor: "bg-stone-600",
    items: [
      { id: "my-profile", label: "My Profile", icon: UserCircle, isAction: true, actionType: "profile" },
      { id: "settings", label: "Shifts & Targets", icon: Settings },
      { id: "sign-out", label: "Sign Out", icon: LogOut, isAction: true, actionType: "logout" }
    ]
  }
];

const STORAGE_KEY = "manager_menu_state";
const FAVORITES_KEY = "manager_menu_favorites";

export default function ManagerMenu({ activeTab, setActiveTab, feedbackCount = 0, badgeCounts = {}, onNewTask, user }) {
  const [expandedSection, setExpandedSection] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || "overview";
  });
  
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, expandedSection);
  }, [expandedSection]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (itemId, e) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSectionToggle = (sectionId) => {
    setExpandedSection(prev => prev === sectionId ? null : sectionId);
  };

  const handleItemClick = (item) => {
    if (item.isAction && item.actionType === "logout") {
      // Use setTimeout to let Radix dropdown close first, then redirect
      setTimeout(() => logout(), 0);
      return;
    }
    if (item.isAction && item.actionType === "profile") {
      setProfileModalOpen(true);
      return;
    }
    if (!item.isLink) {
      setActiveTab(item.id);
    }
  };

  // Get all items for favorites lookup
  const allItems = MENU_SECTIONS.flatMap(section => section.items);
  const favoriteItems = favorites
    .map(id => allItems.find(item => item.id === id))
    .filter(Boolean);

  const renderMenuItem = (item, showFavoriteStar = true, sectionActiveColor = "bg-slate-900") => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const isFavorite = favorites.includes(item.id);

    const content = (
      <div
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 rounded-full text-sm transition-colors cursor-pointer",
          isActive 
            ? `${sectionActiveColor} text-white` 
            : "text-slate-700 hover:bg-slate-100"
        )}
        onClick={() => handleItemClick(item)}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span>{item.label}</span>
          {item.badgeKey && (badgeCounts[item.badgeKey] || 0) > 0 && (
            <Badge className="bg-rose-500 text-white text-[10px] ml-1 px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">{badgeCounts[item.badgeKey]}</Badge>
          )}
        </div>
        {showFavoriteStar && (
          <button
            onClick={(e) => toggleFavorite(item.id, e)}
            className={cn(
              "p-1 rounded hover:bg-slate-200 transition-colors",
              isActive && "hover:bg-slate-700"
            )}
          >
            {isFavorite ? (
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            ) : (
              <StarOff className={cn("w-3 h-3", isActive ? "text-slate-400" : "text-slate-300")} />
            )}
          </button>
        )}
      </div>
    );

    if (item.isLink) {
      return (
        <Link key={item.id} to={createPageUrl(item.href)}>
          {content}
        </Link>
      );
    }

    return <div key={item.id}>{content}</div>;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 px-3 text-xs flex-shrink-0 rounded-full">
          <Menu className="w-4 h-4 mr-1.5" />
          Menu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-72 max-h-[80vh] overflow-y-auto p-2"
        sideOffset={4}
        style={{ zIndex: 9999 }}
      >
        {/* Pinned Favorites */}
        {favoriteItems.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              Favorites
            </div>
            <div className="space-y-0.5 mb-2">
              {favoriteItems.map(item => renderMenuItem(item, false))}
            </div>
            <DropdownMenuSeparator className="my-2" />
          </>
        )}

        {/* Collapsible Sections */}
        {MENU_SECTIONS.filter(s => s.id !== 'system').map(section => (
          <Collapsible
            key={section.id}
            open={expandedSection === section.id}
            onOpenChange={() => handleSectionToggle(section.id)}
            className="mb-1"
          >
            <CollapsibleTrigger className={cn(
              "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-full transition-colors",
              section.color
            )}>
              <div className="flex items-center gap-1.5">
                <span>{section.label}</span>
                {(() => {
                  const sectionTotal = section.items.reduce((sum, item) => sum + (item.badgeKey ? (badgeCounts[item.badgeKey] || 0) : 0), 0);
                  return sectionTotal > 0 && expandedSection !== section.id ? (
                    <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                  ) : null;
                })()}
              </div>
              {expandedSection === section.id ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-2 space-y-0.5 pb-2 pt-1">
              {section.items.map(item => renderMenuItem(item, true, section.activeColor))}
            </CollapsibleContent>
          </Collapsible>
        ))}

        {/* Settings section - rendered as flat items outside collapsible */}
        <DropdownMenuSeparator className="my-2" />
        {MENU_SECTIONS.find(s => s.id === 'system')?.items.filter(i => i.id !== 'sign-out').map(item => (
          <DropdownMenuItem
            key={item.id}
            onSelect={(e) => {
              e.preventDefault();
              handleItemClick(item);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer"
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            console.log('[MENU] Sign Out clicked!');
            logout();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      <ManagerProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        user={currentUser || user}
        onUpdated={(updatedUser) => setCurrentUser(updatedUser)}
      />
    </DropdownMenu>
  );
}