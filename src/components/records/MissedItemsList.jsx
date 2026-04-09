// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, XCircle, Clock, RefreshCw, ShieldAlert, 
  ChevronDown, ChevronUp, User, Calendar, MapPin 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const REASON_CONFIG = {
  not_selected: {
    label: "Not Selected",
    icon: XCircle,
    color: "bg-slate-100 text-slate-700",
    description: "Task was available but not selected by any employee"
  },
  reopened: {
    label: "Reopened",
    icon: RefreshCw,
    color: "bg-amber-100 text-amber-700",
    description: "Task was reopened after session auto-ended"
  },
  overdue: {
    label: "Overdue",
    icon: Clock,
    color: "bg-red-100 text-red-700",
    description: "Task exceeded its deadline without completion"
  },
  low_confidence: {
    label: "Low Confidence",
    icon: ShieldAlert,
    color: "bg-purple-100 text-purple-700",
    description: "Completed but flagged for verification concerns"
  }
};

export default function MissedItemsList({ 
  items = [], 
  type = "task",
  onViewItem,
  title = "Missed Items"
}) {
  const [expanded, setExpanded] = useState(true);
  const [groupByReason, setGroupByReason] = useState(true);

  if (items.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-emerald-700 font-medium">No Missed Items</p>
          <p className="text-emerald-600 text-sm">All expected items were completed</p>
        </CardContent>
      </Card>
    );
  }

  // Group items by reason
  const groupedItems = items.reduce((acc, item) => {
    const reason = item.missedReason || "overdue";
    if (!acc[reason]) acc[reason] = [];
    acc[reason].push(item);
    return acc;
  }, {});

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-slate-500">{items.length} items require attention</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGroupByReason(!groupByReason)}
              className="text-xs rounded-full"
            >
              {groupByReason ? "Flat View" : "Group by Reason"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {groupByReason ? (
            Object.entries(groupedItems).map(([reason, reasonItems]) => {
              const config = REASON_CONFIG[reason] || REASON_CONFIG.overdue;
              const Icon = config.icon;
              
              return (
                <div key={reason} className="space-y-2">
                  <div className="flex items-center gap-2 py-1">
                    <Badge className={cn("rounded-full", config.color)}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label} ({reasonItems.length})
                    </Badge>
                    <span className="text-xs text-slate-500">{config.description}</span>
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-slate-200">
                    {reasonItems.map((item, idx) => (
                      <MissedItemRow 
                        key={item.id || idx} 
                        item={item} 
                        type={type}
                        onView={() => onViewItem?.(item)}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <MissedItemRow 
                  key={item.id || idx} 
                  item={item} 
                  type={type}
                  showReason
                  onView={() => onViewItem?.(item)}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function MissedItemRow({ item, type, showReason = false, onView }) {
  const config = REASON_CONFIG[item.missedReason] || REASON_CONFIG.overdue;
  const Icon = config.icon;

  return (
    <div 
      className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-slate-300 cursor-pointer transition-colors"
      onClick={onView}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-900 truncate">
            {item.title || item.drain_id || item.diverter_id || item.name || "Unknown"}
          </p>
          {showReason && (
            <Badge className={cn("text-xs rounded-full", config.color)}>
              <Icon className="w-2.5 h-2.5 mr-1" />
              {config.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
          {item.area && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {item.area}
            </span>
          )}
          {item.assigned_to_name && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {item.assigned_to_name}
            </span>
          )}
          {item.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Due: {format(parseISO(item.due_date), "MMM d")}
            </span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="sm" className="text-xs rounded-full">
        View
      </Button>
    </div>
  );
}