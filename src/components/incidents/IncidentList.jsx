import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, AlertCircle, Clock, CheckCircle2, ChevronRight,
  ArrowUpRight, RefreshCw, User, MapPin
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS = {
  missed_task: "Missed Task",
  chemical_misapplication: "Chemical Misapplication",
  allergen_control: "Allergen Control",
  equipment_failure: "Equipment Failure",
  contamination_risk: "Contamination Risk",
  wet_finding: "Wet Finding",
  drain_issue: "Drain Issue",
  pest_activity: "Pest Activity",
  foreign_material: "Foreign Material",
  employee_error: "Employee Error",
  procedure_deviation: "Procedure Deviation",
  other: "Other"
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-amber-100 text-amber-700", icon: Clock },
  containment: { label: "Containment", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
  correction: { label: "Correction", color: "bg-blue-100 text-blue-700", icon: RefreshCw },
  corrective_action: { label: "Corrective Action", color: "bg-purple-100 text-purple-700", icon: ArrowUpRight },
  verification: { label: "Verification", color: "bg-indigo-100 text-indigo-700", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  escalated: { label: "Escalated", color: "bg-rose-100 text-rose-700", icon: AlertTriangle }
};

const SEVERITY_CONFIG = {
  low: { color: "bg-slate-100 text-slate-700" },
  medium: { color: "bg-amber-100 text-amber-700" },
  high: { color: "bg-orange-100 text-orange-700" },
  critical: { color: "bg-rose-100 text-rose-700" }
};

export default function IncidentList({ incidents, onSelect }) {
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  if (incidents.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No incidents found</p>
        </CardContent>
      </Card>
    );
  }

  // Mobile card layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {incidents.map(incident => {
          const status = STATUS_CONFIG[incident.status] || STATUS_CONFIG.open;
          const severity = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.medium;
          const StatusIcon = status.icon;

          return (
            <Card 
              key={incident.id} 
              className={cn(
                "active:bg-slate-50 transition-colors cursor-pointer",
                incident.severity === "critical" && "border-l-4 border-l-rose-500"
              )}
              onClick={() => onSelect(incident)}
            >
              <CardContent className="p-3">
                {/* Header row with ID and date */}
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    {incident.incident_number || `INC-${incident.id?.slice(-6)}`}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {incident.created_date && format(parseISO(incident.created_date), "MMM d")}
                  </span>
                </div>
                
                {/* Title */}
                <h3 className="font-semibold text-slate-900 text-sm mb-2 line-clamp-2">
                  {incident.title}
                </h3>
                
                {/* Status badges - stacked for mobile */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge className={cn("text-xs", status.color)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                  <Badge className={cn("text-xs", severity.color)}>
                    {incident.severity}
                  </Badge>
                  {incident.type === "near_miss" && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs">Near Miss</Badge>
                  )}
                </div>
                
                {/* Meta info in compact format */}
                <div className="flex flex-col gap-1 text-xs text-slate-500">
                  <span className="truncate">
                    {CATEGORY_LABELS[incident.category] || incident.category}
                  </span>
                  {incident.area_name && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {incident.area_name}
                    </span>
                  )}
                  {incident.assigned_to_name && (
                    <span className="flex items-center gap-1 truncate">
                      <User className="w-3 h-3 flex-shrink-0" />
                      {incident.assigned_to_name}
                    </span>
                  )}
                </div>
                
                {/* Recurrence badge if present */}
                {incident.recurrence_count > 0 && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {incident.recurrence_count} recurrences
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop layout (original)
  return (
    <div className="space-y-3">
      {incidents.map(incident => {
        const status = STATUS_CONFIG[incident.status] || STATUS_CONFIG.open;
        const severity = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.medium;
        const StatusIcon = status.icon;

        return (
          <Card 
            key={incident.id} 
            className={cn(
              "hover:shadow-md transition-shadow cursor-pointer",
              incident.severity === "critical" && "border-l-4 border-l-rose-500"
            )}
            onClick={() => onSelect(incident)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {incident.incident_number || `INC-${incident.id?.slice(-6)}`}
                    </Badge>
                    <Badge className={cn("text-xs", status.color)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                    <Badge className={cn("text-xs", severity.color)}>
                      {incident.severity}
                    </Badge>
                    {incident.type === "near_miss" && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">Near Miss</Badge>
                    )}
                    {incident.recurrence_count > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {incident.recurrence_count} recurrences
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-slate-900 mb-1">{incident.title}</h3>
                  
                  <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                    {incident.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{CATEGORY_LABELS[incident.category] || incident.category}</span>
                    {incident.area_name && (
                      <>
                        <span>•</span>
                        <span>{incident.area_name}</span>
                      </>
                    )}
                    {incident.assigned_to_name && (
                      <>
                        <span>•</span>
                        <span>Assigned to {incident.assigned_to_name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-right text-xs text-slate-500">
                    <p>{incident.created_date && format(parseISO(incident.created_date), "MMM d, yyyy")}</p>
                    <p>{incident.created_date && format(parseISO(incident.created_date), "h:mm a")}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}