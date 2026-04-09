import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Clock, MoreVertical, Edit, FileText, 
  Factory, MapPin, Calendar, DollarSign, RefreshCw
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-rose-100 text-rose-800" },
  immediate_action_taken: { label: "Immediate Action", color: "bg-amber-100 text-amber-800" },
  capa_in_progress: { label: "CAPA In Progress", color: "bg-blue-100 text-blue-800" },
  capa_complete: { label: "CAPA Complete", color: "bg-emerald-100 text-emerald-800" },
  verified_effective: { label: "Verified Effective", color: "bg-emerald-100 text-emerald-800" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-800" }
};

const SEVERITY_CONFIG = {
  minor: { label: "Minor", color: "bg-slate-100 text-slate-700" },
  moderate: { label: "Moderate", color: "bg-amber-100 text-amber-700" },
  major: { label: "Major", color: "bg-orange-100 text-orange-700" },
  critical: { label: "Critical", color: "bg-rose-100 text-rose-700" }
};

const REASON_LABELS = {
  equipment_contamination: "Equipment Contamination",
  foreign_material: "Foreign Material",
  allergen_control: "Allergen Control",
  pest_activity: "Pest Activity",
  chemical_issue: "Chemical Issue",
  drain_backup: "Drain Backup",
  water_leak: "Water Leak",
  cleaning_failure: "Cleaning Failure",
  employee_error: "Employee Error",
  training_gap: "Training Gap",
  ssop_deviation: "SSOP Deviation",
  equipment_failure: "Equipment Failure",
  other: "Other"
};

export default function DowntimeEventCard({ event, onEdit, onCreateCapa, capas = [] }) {
  const status = STATUS_CONFIG[event.status] || STATUS_CONFIG.open;
  const severity = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.moderate;
  const linkedCapa = capas.find(c => c.source_id === event.id);

  const formatDuration = (minutes) => {
    if (!minutes) return "Unknown";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      event.is_recurring && "border-amber-300 bg-amber-50/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-sm text-slate-500">{event.event_number}</span>
              <Badge className={status.color}>{status.label}</Badge>
              <Badge className={severity.color}>{severity.label}</Badge>
              {event.is_recurring && (
                <Badge className="bg-amber-500 text-white">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Recurring ({event.recurrence_count}x)
                </Badge>
              )}
            </div>

            {/* Reason */}
            <h3 className="font-semibold text-slate-900 mb-1">
              {REASON_LABELS[event.reason_category] || event.reason_category}
            </h3>
            <p className="text-sm text-slate-600 line-clamp-2 mb-3">
              {event.reason_detail}
            </p>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{formatDuration(event.duration_minutes)}</span>
              </div>
              {event.production_line_name && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Factory className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{event.production_line_name}</span>
                </div>
              )}
              {event.area_name && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{event.area_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{format(parseISO(event.event_date), "MMM d, h:mm a")}</span>
              </div>
            </div>

            {/* Cost Impact */}
            {event.impact_cost_estimate > 0 && (
              <div className="flex items-center gap-1.5 text-rose-600 mt-2">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">${event.impact_cost_estimate.toLocaleString()} estimated impact</span>
              </div>
            )}

            {/* Immediate Action */}
            {event.immediate_action && (
              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Immediate Action:</p>
                <p className="text-sm text-slate-700">{event.immediate_action}</p>
              </div>
            )}

            {/* Linked CAPA */}
            {linkedCapa && (
              <div className="mt-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-600">
                  Linked to CAPA: {linkedCapa.capa_number}
                </span>
                <Badge className="text-xs">{linkedCapa.status}</Badge>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(event)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Event
                </DropdownMenuItem>
                {!linkedCapa && event.requires_capa && (
                  <DropdownMenuItem onClick={() => onCreateCapa(event)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Create CAPA
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Photos */}
        {event.photo_urls?.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {event.photo_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80"
                onClick={() => window.open(url, "_blank")}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}