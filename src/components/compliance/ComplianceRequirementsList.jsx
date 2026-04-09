import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Plus, CheckCircle2, XCircle, AlertTriangle, 
  FileText, Link, Clock, ChevronDown, ChevronUp, Edit, ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  compliant: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  non_compliant: { color: "bg-rose-100 text-rose-700 border-rose-200", icon: XCircle },
  partial: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
  not_applicable: { color: "bg-slate-100 text-slate-500 border-slate-200", icon: null },
  not_assessed: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock }
};

const CRITICALITY_CONFIG = {
  critical: { color: "bg-rose-600 text-white", label: "Critical" },
  major: { color: "bg-amber-500 text-white", label: "Major" },
  minor: { color: "bg-slate-400 text-white", label: "Minor" }
};

function RequirementRow({ requirement, evidence, expanded, onToggle, onEdit }) {
  const statusConfig = STATUS_CONFIG[requirement.status] || STATUS_CONFIG.not_assessed;
  const StatusIcon = statusConfig.icon;
  const criticalityConfig = CRITICALITY_CONFIG[requirement.criticality] || CRITICALITY_CONFIG.major;
  
  const reqEvidence = evidence.filter(e => e.requirement_id === requirement.id);

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all",
      requirement.status === "non_compliant" && "border-rose-200 bg-rose-50/50",
      requirement.status === "compliant" && "border-emerald-200 bg-emerald-50/50"
    )}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-4 hover:bg-white/50 transition-colors text-left"
      >
        <div className={cn("p-2 rounded-lg flex-shrink-0 border", statusConfig.color)}>
          {StatusIcon ? <StatusIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-sm text-slate-500">{requirement.section}</span>
            <Badge className={cn("text-xs", criticalityConfig.color)}>
              {criticalityConfig.label}
            </Badge>
            {requirement.category && (
              <Badge variant="outline" className="text-xs capitalize">
                {requirement.category.replace("_", " ")}
              </Badge>
            )}
          </div>
          <h4 className="font-medium text-slate-900">{requirement.title}</h4>
          {requirement.description && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{requirement.description}</p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {reqEvidence.length} evidence items
            </span>
            {requirement.linked_task_ids?.length > 0 && (
              <span className="flex items-center gap-1">
                <Link className="w-3 h-3" />
                {requirement.linked_task_ids.length} linked tasks
              </span>
            )}
            {requirement.last_reviewed_at && (
              <span>
                Reviewed: {format(parseISO(requirement.last_reviewed_at), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit className="w-4 h-4" />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 border-t bg-white">
          <div className="grid md:grid-cols-2 gap-4 pt-4">
            {/* Left - Details */}
            <div className="space-y-3">
              <div>
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Requirement Details</h5>
                <p className="text-sm text-slate-700">{requirement.description || "No description provided"}</p>
              </div>
              
              {requirement.evidence_required?.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Evidence Required</h5>
                  <div className="flex flex-wrap gap-1">
                    {requirement.evidence_required.map((type, i) => (
                      <Badge key={i} variant="outline" className="text-xs capitalize">
                        {type.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {requirement.notes && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Notes</h5>
                  <p className="text-sm text-slate-600">{requirement.notes}</p>
                </div>
              )}
              
              {requirement.status === "non_compliant" && requirement.corrective_action && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-rose-700 uppercase mb-1">Corrective Action Required</h5>
                  <p className="text-sm text-rose-700">{requirement.corrective_action}</p>
                  {requirement.due_date && (
                    <p className="text-xs text-rose-500 mt-1">
                      Due: {format(parseISO(requirement.due_date), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Right - Evidence */}
            <div>
              <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Evidence ({reqEvidence.length})</h5>
              {reqEvidence.length === 0 ? (
                <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500">
                  No evidence collected yet
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reqEvidence.slice(0, 5).map(ev => (
                    <div key={ev.id} className="bg-slate-50 rounded-lg p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">{ev.title}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {ev.evidence_type.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(parseISO(ev.evidence_date), "MMM d, yyyy")} by {ev.collected_by_name || ev.collected_by}
                      </p>
                    </div>
                  ))}
                  {reqEvidence.length > 5 && (
                    <p className="text-xs text-slate-400 text-center">+{reqEvidence.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComplianceRequirementsList({ 
  frameworks, 
  requirements, 
  evidence,
  selectedFramework,
  onSelectFramework,
  onEditRequirement,
  onAddRequirement
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [criticalityFilter, setCriticalityFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      if (selectedFramework && req.framework_id !== selectedFramework.id) return false;
      if (statusFilter !== "all" && req.status !== statusFilter) return false;
      if (criticalityFilter !== "all" && req.criticality !== criticalityFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          req.title?.toLowerCase().includes(query) ||
          req.section?.toLowerCase().includes(query) ||
          req.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [requirements, selectedFramework, statusFilter, criticalityFilter, searchQuery]);

  // Group by section
  const groupedRequirements = useMemo(() => {
    const groups = {};
    filteredRequirements.forEach(req => {
      const section = req.section?.split(".")[0] || "Other";
      if (!groups[section]) groups[section] = [];
      groups[section].push(req);
    });
    return groups;
  }, [filteredRequirements]);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {/* Filters - Mobile responsive */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex gap-3", isMobile ? "flex-col" : "flex-wrap")}>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className={cn("flex gap-2", isMobile ? "flex-wrap" : "")}>
              <Select value={selectedFramework?.id || "all"} onValueChange={(v) => onSelectFramework(v === "all" ? null : frameworks.find(f => f.id === v))}>
                <SelectTrigger className={cn(isMobile ? "flex-1 min-w-[140px]" : "w-48")}>
                  <SelectValue placeholder="All Frameworks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frameworks</SelectItem>
                  {frameworks.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn(isMobile ? "flex-1 min-w-[100px]" : "w-36")}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="not_assessed">Not Assessed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                <SelectTrigger className={cn(isMobile ? "flex-1 min-w-[100px]" : "w-32")}>
                  <SelectValue placeholder="Criticality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedFramework && (
              <Button onClick={() => onAddRequirement(selectedFramework.id)} className={cn(isMobile && "w-full")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Requirement
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requirements List - Mobile card view */}
      {filteredRequirements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No requirements found</p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        // Mobile card-based list view
        <div className="space-y-3">
          {filteredRequirements.map(req => {
            const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.not_assessed;
            const StatusIcon = statusConfig.icon;
            const criticalityConfig = CRITICALITY_CONFIG[req.criticality] || CRITICALITY_CONFIG.major;
            const reqEvidence = evidence.filter(e => e.requirement_id === req.id);
            
            return (
              <Card 
                key={req.id} 
                className={cn(
                  "active:bg-slate-50 transition-colors cursor-pointer",
                  req.status === "non_compliant" && "border-l-4 border-l-rose-500",
                  req.status === "compliant" && "border-l-4 border-l-emerald-500"
                )}
                onClick={() => onEditRequirement(req)}
              >
                <CardContent className="p-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-slate-500">{req.section}</span>
                    <div className={cn("p-1.5 rounded", statusConfig.color)}>
                      {StatusIcon ? <StatusIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h4 className="font-medium text-slate-900 text-sm mb-2 line-clamp-2">{req.title}</h4>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge className={cn("text-xs", criticalityConfig.color)}>
                      {criticalityConfig.label}
                    </Badge>
                    {req.category && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {req.category.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Meta info */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {reqEvidence.length} evidence
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Desktop expandable rows
        Object.entries(groupedRequirements).map(([section, reqs]) => (
          <div key={section}>
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">
              Section {section} ({reqs.length})
            </h3>
            <div className="space-y-2">
              {reqs.map(req => (
                <RequirementRow
                  key={req.id}
                  requirement={req}
                  evidence={evidence}
                  expanded={expandedRows[req.id]}
                  onToggle={() => toggleRow(req.id)}
                  onEdit={() => onEditRequirement(req)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}