import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Filter, Download, RefreshCw, ChevronDown, ChevronUp,
  ArrowUpDown, AlertTriangle
} from "lucide-react";
import { format, differenceInDays, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

const severityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800"
};

const statusColors = {
  draft: "bg-slate-100 text-slate-800",
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  pending_verification: "bg-purple-100 text-purple-800",
  closed: "bg-green-100 text-green-800",
  reopened: "bg-red-100 text-red-800"
};

const sourceLabels = {
  sanitation: "Sanitation",
  pest: "Pest Control",
  emp: "EMP",
  audit: "Audit",
  downtime: "Downtime",
  incident: "Incident",
  other: "Other"
};

const SAVED_VIEWS = [
  { id: "all", name: "All CAPAs", filters: {} },
  { id: "overdue", name: "Overdue", filters: { overdue: true } },
  { id: "high_severity", name: "High Severity", filters: { severity: ["high", "critical"] } },
  { id: "emp_related", name: "EMP-Related", filters: { source: "emp" } },
  { id: "pest_related", name: "Pest-Related", filters: { source: "pest" } },
  { id: "audit_findings", name: "Audit Findings", filters: { source: "audit" } },
  { id: "downtime", name: "Downtime CAPAs", filters: { source: "downtime" } },
  { id: "effectiveness", name: "Waiting on Effectiveness", filters: { status: "closed", effectivenessPending: true } },
];

export default function CAPADatabase({ capas, actions, settings, onCapaClick, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedView, setSelectedView] = useState("all");
  const [filters, setFilters] = useState({
    status: "all",
    severity: "all",
    source: "all",
    owner: "all"
  });
  const [sortField, setSortField] = useState("created_date");
  const [sortDir, setSortDir] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  const owners = useMemo(() => {
    const unique = [...new Set(capas.map(c => c.owner_name).filter(Boolean))];
    return unique.sort();
  }, [capas]);

  const filteredCapas = useMemo(() => {
    const view = SAVED_VIEWS.find(v => v.id === selectedView);
    const now = new Date();

    return capas.filter(capa => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !capa.title?.toLowerCase().includes(q) &&
          !capa.capa_id?.toLowerCase().includes(q) &&
          !capa.problem_description?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      // View filters
      if (view?.filters.overdue) {
        const capaActions = actions.filter(a => a.capa_id === capa.id);
        const hasOverdue = capaActions.some(a => 
          a.status !== "completed" && a.status !== "verified" &&
          a.due_date && isBefore(new Date(a.due_date), now)
        );
        if (!hasOverdue) return false;
      }

      if (view?.filters.severity) {
        if (!view.filters.severity.includes(capa.severity)) return false;
      }

      if (view?.filters.source) {
        if (capa.source !== view.filters.source) return false;
      }

      if (view?.filters.status) {
        if (capa.status !== view.filters.status) return false;
      }

      // Manual filters
      if (filters.status !== "all" && capa.status !== filters.status) return false;
      if (filters.severity !== "all" && capa.severity !== filters.severity) return false;
      if (filters.source !== "all" && capa.source !== filters.source) return false;
      if (filters.owner !== "all" && capa.owner_name !== filters.owner) return false;

      return true;
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === "created_date" || sortField === "closed_at") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [capas, actions, searchQuery, selectedView, filters, sortField, sortDir]);

  const getNextDueDate = (capaId) => {
    const capaActions = actions.filter(a => 
      a.capa_id === capaId && 
      a.status !== "completed" && 
      a.status !== "verified"
    );
    if (capaActions.length === 0) return null;
    const sorted = capaActions.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    return sorted[0]?.due_date;
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search CAPAs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedView} onValueChange={setSelectedView}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            {SAVED_VIEWS.map(view => (
              <SelectItem key={view.id} value={view.id}>{view.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        <Button variant="outline" onClick={onRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>

        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
              <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending_verification">Pending Verification</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="reopened">Reopened</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Severity</label>
              <Select value={filters.severity} onValueChange={(v) => setFilters({...filters, severity: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Source</label>
              <Select value={filters.source} onValueChange={(v) => setFilters({...filters, source: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {Object.entries(sourceLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Owner</label>
              <Select value={filters.owner} onValueChange={(v) => setFilters({...filters, owner: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {owners.map(owner => (
                    <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Results count */}
      <div className="text-sm text-slate-600">
        Showing {filteredCapas.length} of {capas.length} CAPAs
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                  <button onClick={() => toggleSort("capa_id")} className="flex items-center gap-1">
                    CAPA ID <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                  <button onClick={() => toggleSort("created_date")} className="flex items-center gap-1">
                    Days Open <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Next Due</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCapas.map(capa => {
                const daysOpen = differenceInDays(new Date(), new Date(capa.created_date));
                const nextDue = getNextDueDate(capa.id);
                const isOverdue = nextDue && isBefore(new Date(nextDue), new Date());

                return (
                  <tr 
                    key={capa.id}
                    onClick={() => onCapaClick(capa)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{capa.capa_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{capa.title}</span>
                        {capa.is_recurrence && (
                          <span title="Recurring issue" className="text-purple-500">🔄</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusColors[capa.status]}>
                        {capa.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={severityColors[capa.severity]}>
                        {capa.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {sourceLabels[capa.source] || capa.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{capa.owner_name || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-sm font-medium",
                        daysOpen > 30 ? "text-red-600" : daysOpen > 14 ? "text-amber-600" : "text-slate-600"
                      )}>
                        {capa.status === "closed" ? "—" : `${daysOpen}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {nextDue ? (
                        <span className={cn(
                          "text-sm",
                          isOverdue ? "text-red-600 font-medium" : "text-slate-600"
                        )}>
                          {isOverdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {format(new Date(nextDue), "MMM d")}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCapas.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No CAPAs match your filters
          </div>
        )}
      </Card>
    </div>
  );
}