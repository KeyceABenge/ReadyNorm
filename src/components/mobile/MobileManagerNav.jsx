/**
 * Mobile Manager Navigation
 * Slide-out drawer navigation for manager dashboard on mobile
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, LayoutDashboard, ClipboardList, Users, Package2, 
  BarChart3, FileText, Calendar, Settings, MessageSquare,
  GraduationCap, Shield, Megaphone,
  Trophy, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navSections = [
  {
    title: "Main",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "tasks", label: "Tasks", icon: ClipboardList },
      { id: "employees", label: "Employees", icon: Users },
    ]
  },
  {
    title: "Operations",
    items: [
      { id: "line-cleanings", label: "Line Cleanings", icon: Package2 },
      { id: "assignments", label: "Assignments", icon: Calendar },
      { id: "records", label: "Records", icon: FileText },
    ]
  },
  {
    title: "Analytics",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "team-health", label: "Team Health", icon: Shield },
    ]
  },
  {
    title: "Training",
    items: [
      { id: "training-docs", label: "Training", icon: GraduationCap },
      { id: "competency", label: "Competency", icon: Trophy },
    ]
  },
  {
    title: "Communication",
    items: [
      { id: "announcements", label: "Announcements", icon: Megaphone },
      { id: "feedback", label: "Feedback", icon: MessageSquare },
    ]
  },
  {
    title: "Settings",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
    ]
  }
];

export default function MobileManagerNav({ 
  open, 
  onClose, 
  activeTab, 
  onTabChange,
  badges = {}
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">Menu</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Nav Items */}
            <div className="overflow-y-auto h-[calc(100%-60px)] pb-safe">
              {navSections.map((section) => (
                <div key={section.title} className="py-2">
                  <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const badgeCount = badges[item.id] || 0;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onTabChange(item.id);
                          onClose();
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3",
                          "touch-manipulation active:bg-slate-100 transition-colors",
                          isActive && "bg-slate-100 border-r-4 border-slate-900"
                        )}
                      >
                        <Icon className={cn(
                          "w-5 h-5",
                          isActive ? "text-slate-900" : "text-slate-500"
                        )} />
                        <span className={cn(
                          "flex-1 text-left",
                          isActive ? "font-medium text-slate-900" : "text-slate-700"
                        )}>
                          {item.label}
                        </span>
                        {badgeCount > 0 && (
                          <Badge className="bg-rose-500 text-white text-xs">
                            {badgeCount}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}