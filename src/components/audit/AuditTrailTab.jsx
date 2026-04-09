/**
 * Audit Trail Tab Component
 * Displays immutable audit logs for FDA/USDA compliance
 */

// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuditLogRepo } from "@/lib/adapters/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Download, Clock, User, FileText, 
  CheckCircle2, XCircle, Edit, Trash2, Plus, Eye,
  Shield, AlertTriangle, Lock, ChevronDown, ChevronUp
} from "lucide-react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const ACTION_ICONS = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  complete: CheckCircle2,
  verify: Shield,
  reject: XCircle,
  reopen: AlertTriangle,
  assign: User,
  sign_off: FileText,
  inspect: Eye,
  atp_test: Shield
};

const ACTION_COLORS = {
  create: "bg-blue-100 text-blue-700",
  update: "bg-amber-100 text-amber-700",
  delete: "bg-red-100 text-red-700",
  complete: "bg-emerald-100 text-emerald-700",
  verify: "bg-purple-100 text-purple-700",
  reject: "bg-rose-100 text-rose-700",
  reopen: "bg-orange-100 text-orange-700",
  assign: "bg-cyan-100 text-cyan-700",
  sign_off: "bg-green-100 text-green-700",
  inspect: "bg-indigo-100 text-indigo-700",
  atp_test: "bg-teal-100 text-teal-700"
};

const ENTITY_LABELS = {
  Task: "Task",
  AreaSignOff: "Line Cleaning",
  DrainCleaningRecord: "Drain Cleaning",
  DiverterInspection: "Diverter Inspection",
  PostCleanInspection: "Post-Clean Inspection",
  PreOpInspection: "Pre-Op Inspection",
  TitrationRecord: "Titration",
  ChemicalInventoryRecord: "Chemical Inventory",
  Incident: "Incident",
  CompetencyEvaluation: "Competency Eval",
  EmployeeTraining: "Training",
  SecurityEvent: "Security Event"
};

const ACTION_ICONS_EXTRA = {
  login: Eye,
  logout: Eye,
  access_granted: Shield,
  access_denied: XCircle,
  access_removed: XCircle,
  password_change: Lock,
  pin_change: Lock,
  settings_change: Edit
};

const ACTION_COLORS_EXTRA = {
  login: "bg-sky-100 text-sky-700",
  logout: "bg-slate-100 text-slate-700",
  access_granted: "bg-emerald-100 text-emerald-700",
  access_denied: "bg-red-100 text-red-700",
  access_removed: "bg-red-100 text-red-700",
  password_change: "bg-amber-100 text-amber-700",
  pin_change: "bg-amber-100 text-amber-700",
  settings_change: "bg-purple-100 text-purple-700"
};

function AuditLogEntry({ log, expanded, onToggle }) {
  const ActionIcon = ACTION_ICONS[log.action] || ACTION_ICONS_EXTRA[log.action] || Edit;
  const actionColor = ACTION_COLORS[log.action] || ACTION_COLORS_EXTRA[log.action] || "bg-slate-100 text-slate-700";
  
  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className={cn("p-2 rounded-lg flex-shrink-0", actionColor)}>
          <ActionIcon className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900">{log.entity_title}</span>
            <Badge variant="outline" className="text-xs rounded-full">
              {ENTITY_LABELS[log.entity_type] || log.entity_type}
            </Badge>
            <Badge className={cn("text-xs capitalize rounded-full", actionColor)}>
              {log.action.replace("_", " ")}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {log.actor_name || log.actor_email}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(log.timestamp), "MMM d, yyyy 'at' h:mm:ss a")}
            </span>
            {log.is_locked && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Lock className="w-3 h-3" />
                Immutable
              </span>
            )}
          </div>
          
          {log.notes && (
            <p className="text-sm text-slate-600 mt-1 italic">"{log.notes}"</p>
          )}
        </div>
        
        <div className="flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 border-t bg-slate-50">
          <div className="grid md:grid-cols-2 gap-4 pt-4">
            {/* Changes */}
            {log.changes && Object.keys(log.changes).length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Changes Made</h5>
                <div className="space-y-1">
                  {Object.entries(log.changes).map(([field, change]) => (
                    <div key={field} className="text-sm bg-white p-2 rounded border">
                      <span className="font-medium text-slate-700">{field}:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-rose-600 line-through text-xs">
                          {change.from === null ? "empty" : String(change.from).substring(0, 50)}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="text-emerald-600 text-xs">
                          {change.to === null ? "empty" : String(change.to).substring(0, 50)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Metadata */}
            <div>
              <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Audit Metadata</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between bg-white p-2 rounded border">
                  <span className="text-slate-500">Actor Role</span>
                  <span className="font-medium capitalize">{log.actor_role}</span>
                </div>
                <div className="flex justify-between bg-white p-2 rounded border">
                  <span className="text-slate-500">Record ID</span>
                  <span className="font-mono text-xs">{log.entity_id}</span>
                </div>
                <div className="flex justify-between bg-white p-2 rounded border">
                  <span className="text-slate-500">Retention</span>
                  <span className="font-medium">{log.retention_years} years ({log.retention_category})</span>
                </div>
                {log.metadata?.device_type && (
                  <div className="flex justify-between bg-white p-2 rounded border">
                    <span className="text-slate-500">Device</span>
                    <span className="capitalize">{log.metadata.device_type}</span>
                  </div>
                )}
                {log.metadata?.browser && (
                  <div className="flex justify-between bg-white p-2 rounded border">
                    <span className="text-slate-500">Browser</span>
                    <span>{log.metadata.browser}</span>
                  </div>
                )}
                {log.metadata?.ip_address && log.metadata.ip_address !== 'unknown' && (
                  <div className="flex justify-between bg-white p-2 rounded border">
                    <span className="text-slate-500">IP Address</span>
                    <span className="font-mono text-xs">{log.metadata.ip_address}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Signature */}
            {log.signature_data && (
              <div className="md:col-span-2">
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Signature</h5>
                <img 
                  src={log.signature_data} 
                  alt="Signature" 
                  className="h-16 border rounded bg-white p-2"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditTrailTab({ organizationId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [expandedLogs, setExpandedLogs] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["audit_logs", organizationId],
    queryFn: () => AuditLogRepo.filter(
      { organization_id: organizationId },
      "-timestamp",
      500
    ),
    enabled: !!organizationId,
    staleTime: 30000
  });

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          log.entity_title?.toLowerCase().includes(query) ||
          log.actor_name?.toLowerCase().includes(query) ||
          log.actor_email?.toLowerCase().includes(query) ||
          log.notes?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Entity type filter
      if (entityFilter !== "all" && log.entity_type !== entityFilter) return false;
      
      // Action filter
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      
      // Date range filter
      if (dateRange.start || dateRange.end) {
        const logDate = parseISO(log.timestamp);
        if (dateRange.start && dateRange.end) {
          if (!isWithinInterval(logDate, {
            start: startOfDay(parseISO(dateRange.start)),
            end: endOfDay(parseISO(dateRange.end))
          })) return false;
        } else if (dateRange.start) {
          if (logDate < startOfDay(parseISO(dateRange.start))) return false;
        } else if (dateRange.end) {
          if (logDate > endOfDay(parseISO(dateRange.end))) return false;
        }
      }
      
      return true;
    });
  }, [auditLogs, searchQuery, entityFilter, actionFilter, dateRange]);

  const toggleExpanded = (id) => {
    setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const exportAuditLog = () => {
    const csvRows = [
      ["Timestamp", "Entity Type", "Entity ID", "Entity Title", "Action", "Actor Email", "Actor Name", "Actor Role", "Notes", "Retention Category", "Retention Years"].join(",")
    ];
    
    filteredLogs.forEach(log => {
      csvRows.push([
        log.timestamp,
        log.entity_type,
        log.entity_id,
        `"${(log.entity_title || "").replace(/"/g, '""')}"`,
        log.action,
        log.actor_email,
        `"${(log.actor_name || "").replace(/"/g, '""')}"`,
        log.actor_role,
        `"${(log.notes || "").replace(/"/g, '""')}"`,
        log.retention_category,
        log.retention_years
      ].join(","));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_trail_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`;
    a.click();
  };

  // Get unique entity types and actions for filters
  const entityTypes = [...new Set(auditLogs.map(l => l.entity_type))];
  const actions = [...new Set(auditLogs.map(l => l.action))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Audit Trail
          </h2>
          <p className="text-sm text-slate-500">
            Immutable record of all changes for FDA/USDA compliance
          </p>
        </div>
        <Button onClick={exportAuditLog} variant="outline" className="rounded-full">
          <Download className="w-4 h-4 mr-2" />
          Export Audit Log
        </Button>
      </div>

      {/* Filters - Mobile responsive */}
      <Card>
        <CardContent className="pt-4">
          <div className={cn(
            "flex gap-3",
            isMobile ? "flex-col" : "flex-wrap"
          )}>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
            
            <div className={cn(
              "flex gap-2",
              isMobile ? "flex-wrap" : ""
            )}>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className={cn("rounded-full", isMobile ? "flex-1 min-w-[120px]" : "w-40")}>
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {ENTITY_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className={cn("rounded-full", isMobile ? "flex-1 min-w-[100px]" : "w-36")}>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map(action => (
                    <SelectItem key={action} value={action} className="capitalize">
                      {action.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className={cn(
              "flex gap-2",
              isMobile ? "flex-wrap" : ""
            )}>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className={cn("rounded-full", isMobile ? "flex-1" : "w-36")}
                placeholder="Start"
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className={cn("rounded-full", isMobile ? "flex-1" : "w-36")}
                placeholder="End"
              />
            </div>
            
            {(searchQuery || entityFilter !== "all" || actionFilter !== "all" || dateRange.start || dateRange.end) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setEntityFilter("all");
                  setActionFilter("all");
                  setDateRange({ start: "", end: "" });
                }}
                className={cn("rounded-full", isMobile && "w-full")}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats - Mobile responsive grid */}
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-2" : "grid-cols-4"
      )}>
        <Card>
          <CardContent className={cn("p-3", isMobile && "p-2")}>
            <p className={cn("text-slate-500", isMobile ? "text-xs" : "text-sm")}>Total</p>
            <p className={cn("font-bold text-slate-900", isMobile ? "text-xl" : "text-2xl")}>{filteredLogs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={cn("p-3", isMobile && "p-2")}>
            <p className={cn("text-slate-500", isMobile ? "text-xs" : "text-sm")}>Completions</p>
            <p className={cn("font-bold text-emerald-600", isMobile ? "text-xl" : "text-2xl")}>
              {filteredLogs.filter(l => l.action === "complete" || l.action === "sign_off").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={cn("p-3", isMobile && "p-2")}>
            <p className={cn("text-slate-500", isMobile ? "text-xs" : "text-sm")}>Verified</p>
            <p className={cn("font-bold text-purple-600", isMobile ? "text-xl" : "text-2xl")}>
              {filteredLogs.filter(l => l.action === "verify" || l.action === "inspect").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={cn("p-3", isMobile && "p-2")}>
            <p className={cn("text-slate-500", isMobile ? "text-xs" : "text-sm")}>Rejected</p>
            <p className={cn("font-bold text-rose-600", isMobile ? "text-xl" : "text-2xl")}>
              {filteredLogs.filter(l => l.action === "reject").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Loading audit trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No audit records found</p>
              <p className="text-sm text-slate-400 mt-1">
                Audit entries will appear here as actions are performed
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map(log => (
            <AuditLogEntry
              key={log.id}
              log={log}
              expanded={expandedLogs[log.id]}
              onToggle={() => toggleExpanded(log.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}