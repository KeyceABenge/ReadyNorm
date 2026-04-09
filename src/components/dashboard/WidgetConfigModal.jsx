/**
 * Widget Configuration Modal
 * Allows managers to customize which widgets appear on their dashboard and in what order
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  GripVertical, Eye, EyeOff, RotateCcw,
  Shield, TrendingUp, Zap, BarChart3, Droplet, 
  Users, ClipboardList, AlertTriangle, FileText, Play
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "manager_dashboard_widgets";

// All available widgets
export const ALL_WIDGETS = [
  { id: "health-score", label: "Sanitation Health Score", icon: Shield, description: "Overall health metric" },
  { id: "narrative-preview", label: "Executive Summary", icon: FileText, description: "Generated insights" },
  { id: "live-shift-progress", label: "Live Shift Progress", icon: Play, description: "Real-time shift monitoring & ways to win" },
  { id: "decision-intelligence", label: "Decision Intelligence", icon: Zap, description: "What to do next" },
  { id: "performance-scores", label: "Performance Scores", icon: TrendingUp, description: "Completion by period" },
  { id: "atp-module", label: "ATP Testing", icon: Droplet, description: "Swab test results" },
  { id: "stats-cards", label: "Task Statistics", icon: BarChart3, description: "Task counts overview" },
  { id: "sanitary-reports", label: "Condition Reports", icon: AlertTriangle, description: "Open issues" },
  { id: "employee-performance", label: "Employee Performance", icon: Users, description: "Team metrics" },
  { id: "todays-tasks", label: "Today's Tasks", icon: ClipboardList, description: "Tasks due today" },
];

export const DEFAULT_WIDGETS = [
  "health-score",
  "narrative-preview",
  "live-shift-progress",
  "decision-intelligence",
  "performance-scores",
  "atp-module",
  "stats-cards",
  "employee-performance",
];

export function getWidgetConfig() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_WIDGETS;
    }
  }
  return DEFAULT_WIDGETS;
}

export function saveWidgetConfig(widgets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

export default function WidgetConfigModal({ open, onOpenChange, currentWidgets, onSave }) {
  const [widgets, setWidgets] = useState(currentWidgets || DEFAULT_WIDGETS);
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    if (open) {
      setWidgets(currentWidgets || DEFAULT_WIDGETS);
    }
  }, [open, currentWidgets]);

  const toggleWidget = (widgetId) => {
    setWidgets(prev => {
      if (prev.includes(widgetId)) {
        return prev.filter(id => id !== widgetId);
      }
      return [...prev, widgetId];
    });
  };

  const moveWidget = (fromIndex, toIndex) => {
    setWidgets(prev => {
      const newWidgets = [...prev];
      const [moved] = newWidgets.splice(fromIndex, 1);
      newWidgets.splice(toIndex, 0, moved);
      return newWidgets;
    });
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    moveWidget(draggedItem, index);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleSave = () => {
    saveWidgetConfig(widgets);
    onSave(widgets);
    onOpenChange(false);
  };

  const handleReset = () => {
    setWidgets(DEFAULT_WIDGETS);
  };

  // Separate enabled and disabled widgets
  const enabledWidgets = widgets.map(id => ALL_WIDGETS.find(w => w.id === id)).filter(Boolean);
  const disabledWidgets = ALL_WIDGETS.filter(w => !widgets.includes(w.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        
        <p className="text-sm text-slate-500">
          Drag to reorder. Toggle visibility with the eye icon.
        </p>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Enabled Widgets - Draggable */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">VISIBLE WIDGETS</p>
            <div className="space-y-1">
              {enabledWidgets.map((widget, index) => {
                const Icon = widget.icon;
                return (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "flex items-center gap-3 p-3 bg-white border rounded-lg cursor-move transition-all",
                      draggedItem === index && "opacity-50 border-blue-400"
                    )}
                  >
                    <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <div className="p-1.5 rounded bg-slate-100">
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{widget.label}</p>
                      <p className="text-xs text-slate-500 truncate">{widget.description}</p>
                    </div>
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                );
              })}
              {enabledWidgets.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No widgets enabled</p>
              )}
            </div>
          </div>

          {/* Disabled Widgets */}
          {disabledWidgets.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">HIDDEN WIDGETS</p>
              <div className="space-y-1">
                {disabledWidgets.map((widget) => {
                  const Icon = widget.icon;
                  return (
                    <div
                      key={widget.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 border border-dashed rounded-lg"
                    >
                      <div className="w-4" /> {/* Spacer for alignment */}
                      <div className="p-1.5 rounded bg-slate-200">
                        <Icon className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-500 truncate">{widget.label}</p>
                        <p className="text-xs text-slate-400 truncate">{widget.description}</p>
                      </div>
                      <button
                        onClick={() => toggleWidget(widget.id)}
                        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                      >
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800">
            Save Layout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}