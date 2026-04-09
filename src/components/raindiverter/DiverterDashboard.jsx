// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Droplets, Sun, AlertTriangle, CheckCircle2, Clock, 
  Search, Plus, Map
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInHours, format } from "date-fns";

// Get the overdue threshold in hours based on the frequency setting
function getOverdueHours(frequency) {
  const freq = (frequency || "weekly").toLowerCase();
  if (freq === "daily") return 24;
  if (freq === "weekly") return 7 * 24;
  if (freq === "bi-weekly" || freq === "biweekly") return 14 * 24;
  if (freq === "monthly") return 31 * 24;
  return 7 * 24; // default to weekly
}

export default function DiverterDashboard({ 
  diverters = [], 
  inspections = [],
  onAddNew,
  onViewMap,
  onSelectDiverter,
  isManager = false,
  frequency = "weekly"
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  const overdueHours = getOverdueHours(frequency);

  // Calculate stats
  const stats = useMemo(() => {
    const active = diverters.filter(d => d.status === "active");
    const now = new Date();
    
    const wetToday = active.filter(d => d.last_finding === "wet");
    const eligibleForRemoval = active.filter(d => d.eligible_for_removal);
    
    // Overdue = not inspected within the frequency period
    const overdue = active.filter(d => {
      if (!d.last_inspection_date) return true;
      const hoursSince = differenceInHours(now, new Date(d.last_inspection_date));
      return hoursSince > overdueHours;
    });

    return {
      total: active.length,
      wet: wetToday.length,
      dry: active.length - wetToday.length,
      overdue: overdue.length,
      eligibleForRemoval: eligibleForRemoval.length
    };
  }, [diverters, overdueHours]);

  // Filter diverters
  const filteredDiverters = useMemo(() => {
    let result = diverters.filter(d => d.status === "active");
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d => 
        d.diverter_id?.toLowerCase().includes(term) ||
        d.location_description?.toLowerCase().includes(term) ||
        d.wo_number?.toLowerCase().includes(term)
      );
    }

    switch (filter) {
      case "wet":
        result = result.filter(d => d.last_finding === "wet");
        break;
      case "dry":
        result = result.filter(d => d.last_finding === "dry");
        break;
      case "eligible":
        result = result.filter(d => d.eligible_for_removal);
        break;
      case "wo_attached":
        result = result.filter(d => d.wo_tag_attached && !d.wo_completed);
        break;
      case "overdue":
        result = result.filter(d => {
          if (!d.last_inspection_date) return true;
          return differenceInHours(new Date(), new Date(d.last_inspection_date)) > overdueHours;
        });
        break;
    }

    return result;
  }, [diverters, searchTerm, filter]);

  const filterOptions = [
    { value: "all", label: "All Active", count: stats.total },
    { value: "wet", label: "Wet", count: stats.wet },
    { value: "dry", label: "Dry", count: stats.dry },
    { value: "overdue", label: "Overdue", count: stats.overdue },
    { value: "eligible", label: "Eligible for Removal", count: stats.eligibleForRemoval },
    { value: "wo_attached", label: "WO Attached", count: diverters.filter(d => d.status === "active" && d.wo_tag_attached && !d.wo_completed).length }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Active</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Droplets className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Wet Today</p>
                <p className="text-2xl font-bold text-amber-900">{stats.wet}</p>
              </div>
              <Droplets className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rose-50 border-rose-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-600 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-rose-900">{stats.overdue}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium">Dry</p>
                <p className="text-2xl font-bold text-emerald-900">{stats.dry}</p>
              </div>
              <Sun className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium">Ready to Remove</p>
                <p className="text-2xl font-bold text-purple-900">{stats.eligibleForRemoval}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by ID, location, or WO#..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onViewMap}>
            <Map className="w-4 h-4 mr-2" />
            Map View
          </Button>
          {isManager && (
            <Button onClick={onAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Diverter
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map(opt => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(opt.value)}
            className={cn(
              filter === opt.value && "bg-slate-900"
            )}
          >
            {opt.label}
            <Badge variant="secondary" className="ml-2 text-xs">
              {opt.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Diverter List */}
      <div className="space-y-2">
        {filteredDiverters.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <Droplets className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No diverters found</p>
          </Card>
        ) : (
          filteredDiverters.map(diverter => (
            <DiverterListItem 
              key={diverter.id}
              diverter={diverter}
              overdueHours={overdueHours}
              onClick={() => onSelectDiverter(diverter)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DiverterListItem({ diverter, overdueHours = 168, onClick }) {
  const isOverdue = !diverter.last_inspection_date || 
    differenceInHours(new Date(), new Date(diverter.last_inspection_date)) > overdueHours;

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        diverter.eligible_for_removal && "border-purple-300 bg-purple-50",
        isOverdue && !diverter.eligible_for_removal && "border-rose-300 bg-rose-50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Status Indicator */}
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
            diverter.last_finding === "wet" ? "bg-amber-100" : "bg-emerald-100"
          )}>
            {diverter.last_finding === "wet" ? (
              <Droplets className="w-6 h-6 text-amber-600" />
            ) : (
              <Sun className="w-6 h-6 text-emerald-600" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900">{diverter.diverter_id}</span>
              {diverter.eligible_for_removal && (
                <Badge className="bg-purple-600 text-white text-xs">
                  Ready to Remove
                </Badge>
              )}
              {isOverdue && !diverter.eligible_for_removal && (
                <Badge className="bg-rose-600 text-white text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
              {diverter.wo_tag_attached && !diverter.wo_completed && (
                <Badge variant="outline" className="text-xs">
                  WO: {diverter.wo_number}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 truncate">{diverter.location_description}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              {diverter.last_inspection_date && (
                <span>Last checked: {format(new Date(diverter.last_inspection_date), "MMM d, h:mm a")}</span>
              )}
              {diverter.consecutive_dry_days > 0 && (
                <span className="text-emerald-600 font-medium">
                  {diverter.consecutive_dry_days} dry days
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}