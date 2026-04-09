import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle, Plus, Search, CheckCircle2, Clock,
  AlertCircle, ShieldAlert, TrendingDown, FileText
} from "lucide-react";
import { parseISO, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

import IncidentList from "./IncidentList";
import IncidentFormModal from "./IncidentFormModal";
import IncidentDetailModal from "./IncidentDetailModal";
import IncidentAnalytics from "./IncidentAnalytics";

export default function IncidentResponseEngine({
  incidents = [],
  tasks = [],
  employees = [],
  drainLocations = [],
  rainDiverters = [],
  ssops = [],
  trainingDocuments = [],
  competencyEvaluations = [],
  areas = [],
  organizationId,
  onCreateIncident,
  onUpdateIncident,
  currentUser
}) {
  const [activeTab, setActiveTab] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      // Tab filter
      if (activeTab === "open" && (inc.status === "closed" || inc.status === "escalated")) return false;
      if (activeTab === "closed" && inc.status !== "closed") return false;
      if (activeTab === "escalated" && inc.status !== "escalated") return false;
      if (activeTab === "near-miss" && inc.type !== "near_miss") return false;

      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!inc.title?.toLowerCase().includes(query) &&
            !inc.description?.toLowerCase().includes(query) &&
            !inc.incident_number?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "all" && inc.category !== categoryFilter) return false;

      return true;
    }).sort((a, b) => {
      // Sort by severity then date
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const sevDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.created_date) - new Date(a.created_date);
    });
  }, [incidents, activeTab, searchQuery, categoryFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const now = new Date();
    const last30Days = subDays(now, 30);
    
    const recentIncidents = incidents.filter(i => 
      i.created_date && isWithinInterval(parseISO(i.created_date), {
        start: startOfDay(last30Days),
        end: endOfDay(now)
      })
    );

    return {
      open: incidents.filter(i => !["closed", "escalated"].includes(i.status)).length,
      critical: incidents.filter(i => i.severity === "critical" && i.status !== "closed").length,
      nearMisses: incidents.filter(i => i.type === "near_miss").length,
      closedLast30: recentIncidents.filter(i => i.status === "closed").length,
      avgResolutionDays: (() => {
        const closed = incidents.filter(i => i.closed_at && i.created_date);
        if (closed.length === 0) return 0;
        const totalDays = closed.reduce((sum, i) => {
          const days = (new Date(i.closed_at) - new Date(i.created_date)) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        return Math.round(totalDays / closed.length * 10) / 10;
      })(),
      recurrenceRate: (() => {
        const withRecurrence = incidents.filter(i => i.recurrence_count > 0).length;
        return incidents.length > 0 ? Math.round((withRecurrence / incidents.length) * 100) : 0;
      })()
    };
  }, [incidents]);

  const handleOpenDetail = (incident) => {
    setSelectedIncident(incident);
    setShowDetailModal(true);
  };

  const handleCreateNew = () => {
    setSelectedIncident(null);
    setShowFormModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-100">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Incidents & Near Misses</h2>
            <p className="text-sm text-slate-500">Capture, respond, and learn from sanitation events</p>
          </div>
        </div>
        
        <Button onClick={handleCreateNew} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard 
          label="Open" 
          value={stats.open} 
          icon={Clock}
          color={stats.open > 0 ? "amber" : "slate"}
        />
        <StatCard 
          label="Critical" 
          value={stats.critical} 
          icon={AlertCircle}
          color={stats.critical > 0 ? "rose" : "slate"}
        />
        <StatCard 
          label="Near Misses" 
          value={stats.nearMisses} 
          icon={AlertTriangle}
          color="blue"
        />
        <StatCard 
          label="Closed (30d)" 
          value={stats.closedLast30} 
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard 
          label="Avg Resolution" 
          value={`${stats.avgResolutionDays}d`} 
          icon={TrendingDown}
          color="purple"
        />
        <StatCard 
          label="Recurrence" 
          value={`${stats.recurrenceRate}%`} 
          icon={FileText}
          color={stats.recurrenceRate > 10 ? "amber" : "slate"}
        />
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="open">
              Open
              {stats.open > 0 && <Badge className="ml-2 bg-amber-100 text-amber-700">{stats.open}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="near-miss">Near Misses</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="escalated">Escalated</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search incidents..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>

        <TabsContent value="open" className="mt-4">
          <IncidentList 
            incidents={filteredIncidents}
            onSelect={handleOpenDetail}
          />
        </TabsContent>

        <TabsContent value="near-miss" className="mt-4">
          <IncidentList 
            incidents={filteredIncidents}
            onSelect={handleOpenDetail}
          />
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          <IncidentList 
            incidents={filteredIncidents}
            onSelect={handleOpenDetail}
          />
        </TabsContent>

        <TabsContent value="escalated" className="mt-4">
          <IncidentList 
            incidents={filteredIncidents}
            onSelect={handleOpenDetail}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <IncidentAnalytics incidents={incidents} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showFormModal && (
        <IncidentFormModal
          incident={selectedIncident}
          employees={employees}
          areas={areas}
          tasks={tasks}
          drainLocations={drainLocations}
          rainDiverters={rainDiverters}
          ssops={ssops}
          trainingDocuments={trainingDocuments}
          organizationId={organizationId}
          currentUser={currentUser}
          onSave={onCreateIncident}
          onClose={() => setShowFormModal(false)}
        />
      )}

      {showDetailModal && selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          employees={employees}
          tasks={tasks}
          ssops={ssops}
          trainingDocuments={trainingDocuments}
          competencyEvaluations={competencyEvaluations}
          onUpdate={onUpdateIncident}
          onClose={() => setShowDetailModal(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colorClasses = {
    rose: "bg-rose-50 text-rose-600 border-rose-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200"
  };

  return (
    <Card className={cn("border", colorClasses[color])}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}