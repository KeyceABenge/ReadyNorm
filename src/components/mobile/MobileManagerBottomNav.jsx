/**
 * Mobile Bottom Navigation for Manager Dashboard
 * Customizable shortcuts - manager can configure which items appear
 */

// @ts-nocheck
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, ClipboardList, Users, BarChart3, 
  Settings, FolderOpen, Package2, Zap, Droplets, Droplet,
  FlaskConical, Calendar, Clock, Trophy, Shield,
  Flag, Megaphone, MessageSquare, Brain, Heart,
  AlertTriangle, Lock, GraduationCap, Check, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "manager_mobile_shortcuts";
const HINT_SHOWN_KEY = "manager_mobile_shortcuts_hint_shown";

// All available items for shortcuts
const ALL_ITEMS = [
  { id: "overview", label: "Home", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "employees", label: "Team", icon: Users },
  { id: "records", label: "Records", icon: FolderOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "line-cleanings", label: "Lines", icon: Package2 },
  { id: "assignments", label: "Schedule", icon: Zap },
  { id: "rain-diverters", label: "Diverters", icon: Droplets, isLink: true, href: "RainDiverters" },
  { id: "drain-cleaning", label: "Drains", icon: Droplet, isLink: true, href: "DrainManagement" },
  { id: "chemical-inventory", label: "Inventory", icon: Package2, isLink: true, href: "ChemicalInventory" },
  { id: "chemicals", label: "Titrations", icon: FlaskConical },
  { id: "plant-schedule", label: "Plant Sched", icon: Calendar },
  { id: "schedules", label: "Schedules", icon: Clock },
  { id: "task-groups", label: "Groups", icon: FolderOpen },
  { id: "crews", label: "Crews", icon: Users },
  { id: "badges", label: "Badges", icon: Trophy },
  { id: "team-health", label: "Health", icon: Heart },
  { id: "mentor-coach", label: "Coach", icon: Brain },
  { id: "training-docs", label: "Training", icon: GraduationCap },
  { id: "competency", label: "Competency", icon: Shield },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "incidents", label: "Incidents", icon: AlertTriangle, isLink: true, href: "IncidentsPage" },
  { id: "audit-mode", label: "Audit", icon: Lock, isLink: true, href: "AuditMode" },
  { id: "announcements", label: "Announce", icon: Megaphone },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

const DEFAULT_SHORTCUTS = ["overview", "tasks", "employees", "records", "analytics"];

export default function MobileManagerBottomNav({ 
  activeTab, 
  onTabChange, 
  badges = {} 
}) {
  const [shortcuts, setShortcuts] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
  });
  const [editMode, setEditMode] = useState(false);
  const [tempShortcuts, setTempShortcuts] = useState(shortcuts);
  const [showHint, setShowHint] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  }, [shortcuts]);

  // Show hint for first-time users
  useEffect(() => {
    const hintShown = localStorage.getItem(HINT_SHOWN_KEY);
    if (!hintShown) {
      // Small delay so user sees the nav first
      const timer = setTimeout(() => {
        setShowHint(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem(HINT_SHOWN_KEY, "true");
  };

  const handleLongPressStart = () => {
    const timer = setTimeout(() => {
      setTempShortcuts([...shortcuts]);
      setEditMode(true);
      // Dismiss hint if still showing
      if (showHint) dismissHint();
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const shortcutItems = shortcuts
    .map(id => ALL_ITEMS.find(item => item.id === id))
    .filter(Boolean)
    .slice(0, 5); // Max 5 items

  const handleSave = () => {
    setShortcuts(tempShortcuts);
    setEditMode(false);
  };

  const toggleShortcut = (itemId) => {
    setTempShortcuts(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      }
      if (prev.length >= 5) {
        return prev; // Max 5 shortcuts
      }
      return [...prev, itemId];
    });
  };

  const handleItemClick = (item) => {
    if (item.isLink) {
      window.location.href = createPageUrl(item.href);
    } else {
      onTabChange(item.id);
    }
  };

  const navContent = (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[9998]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch h-14">
          {shortcutItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = badges[item.id] || 0;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                onTouchStart={handleLongPressStart}
                onTouchEnd={handleLongPressEnd}
                onTouchCancel={handleLongPressEnd}
                onMouseDown={handleLongPressStart}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0",
                  "touch-manipulation active:bg-slate-100 transition-colors",
                  "relative min-h-[56px]",
                  isActive && "text-blue-600"
                )}
              >
                <div className="relative">
                  <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-blue-600" : "text-slate-400"
                  )} />
                  {badgeCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">
                        {badgeCount > 9 ? "9+" : badgeCount}
                      </span>
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-medium transition-colors leading-tight",
                  isActive ? "text-blue-600" : "text-slate-500"
                )}>
                  {item.label}
                </span>
                
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-b-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* First-time hint tooltip */}
      {showHint && (
        <div className="md:hidden fixed bottom-16 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-slate-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg max-w-[280px] text-center relative">
            <button 
              onClick={dismissHint}
              className="absolute -top-2 -right-2 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="font-medium mb-1">💡 Tip</p>
            <p className="text-slate-300 text-xs mb-2">Press and hold any shortcut to customize your navigation bar</p>
            <button 
              onClick={dismissHint}
              className="text-xs text-slate-400 underline hover:text-slate-200"
            >
              Don't show again
            </button>
            {/* Arrow pointing down */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-900" />
          </div>
        </div>
      )}

      {/* Edit Shortcuts Dialog */}
      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Shortcuts</DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-slate-500 mb-4">
            Select up to 5 shortcuts for quick access. Tap to toggle.
          </p>
          
          <div className="grid grid-cols-3 gap-2 mb-6">
            {ALL_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = tempShortcuts.includes(item.id);
              const isDisabled = !isSelected && tempShortcuts.length >= 5;
              
              return (
                <button
                  key={item.id}
                  onClick={() => toggleShortcut(item.id)}
                  disabled={isDisabled}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                    isSelected 
                      ? "border-blue-500 bg-blue-50 text-blue-700" 
                      : "border-slate-200 hover:border-slate-300",
                    isDisabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5",
                    isSelected ? "text-blue-600" : "text-slate-500"
                  )} />
                  <span className="text-xs font-medium text-center leading-tight">
                    {item.label}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-slate-900 hover:bg-slate-800" onClick={handleSave}>
              Save Shortcuts
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  // Use createPortal to render outside any transform/motion wrappers
  // This ensures position:fixed works correctly even inside animated containers
  return createPortal(navContent, document.body);
}