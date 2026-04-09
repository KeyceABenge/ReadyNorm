// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Play, Clock, CheckCircle2, AlertTriangle, ChevronRight 
} from "lucide-react";
import { format, isBefore, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import AuditExecutionModal from "./AuditExecutionModal.jsx";

export default function AuditExecution({ 
  organization, user, standards, sections, requirements, 
  scheduledAudits, results, findings, onRefresh 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedAudit, setSelectedAudit] = useState(null);

  const filteredAudits = useMemo(() => {
    const now = new Date();
    
    return scheduledAudits
      .filter(audit => {
        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!audit.section_title?.toLowerCase().includes(q) &&
              !audit.standard_name?.toLowerCase().includes(q) &&
              !audit.auditor_name?.toLowerCase().includes(q)) {
            return false;
          }
        }

        // Status filter
        if (statusFilter === "pending") {
          return audit.status === "scheduled" || audit.status === "in_progress";
        } else if (statusFilter === "overdue") {
          return (audit.status === "scheduled" || audit.status === "in_progress") &&
                 isBefore(new Date(audit.due_date), now);
        } else if (statusFilter === "completed") {
          return audit.status === "completed";
        } else if (statusFilter === "my_audits") {
          return audit.auditor_email === user?.email &&
                 (audit.status === "scheduled" || audit.status === "in_progress");
        }
        return true;
      })
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  }, [scheduledAudits, searchQuery, statusFilter, user]);

  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-amber-100 text-amber-800",
    completed: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800"
  };

  const getAuditStatus = (audit) => {
    if (audit.status === "completed") return "completed";
    if (audit.status === "in_progress") return "in_progress";
    if (isBefore(new Date(audit.due_date), new Date())) return "overdue";
    return "scheduled";
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search audits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="my_audits">My Audits</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("my_audits")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {scheduledAudits.filter(a => a.auditor_email === user?.email && 
                    (a.status === "scheduled" || a.status === "in_progress")).length}
                </p>
                <p className="text-xs text-slate-500">My Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("overdue")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {scheduledAudits.filter(a => 
                    (a.status === "scheduled" || a.status === "in_progress") &&
                    isBefore(new Date(a.due_date), new Date())
                  ).length}
                </p>
                <p className="text-xs text-slate-500">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("pending")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Play className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {scheduledAudits.filter(a => a.status === "in_progress").length}
                </p>
                <p className="text-xs text-slate-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("completed")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {scheduledAudits.filter(a => a.status === "completed").length}
                </p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {statusFilter === "my_audits" ? "My Audits" : 
             statusFilter === "pending" ? "Pending Audits" :
             statusFilter === "overdue" ? "Overdue Audits" :
             statusFilter === "completed" ? "Completed Audits" : "All Audits"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAudits.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No audits match your filters
            </p>
          ) : (
            <div className="space-y-2">
              {filteredAudits.map(audit => {
                const status = getAuditStatus(audit);
                const daysUntilDue = differenceInDays(new Date(audit.due_date), new Date());
                const isMyAudit = audit.auditor_email === user?.email;
                
                return (
                  <div 
                    key={audit.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                      isMyAudit ? "bg-blue-50 border-blue-200 hover:bg-blue-100" : "bg-white hover:bg-slate-50",
                      status === "overdue" && "border-red-200 bg-red-50"
                    )}
                    onClick={() => setSelectedAudit(audit)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{audit.section_title}</span>
                        {isMyAudit && <Badge variant="outline" className="text-xs">Assigned to me</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                        <span>{audit.standard_name}</span>
                        <span>•</span>
                        <span>Section {audit.section_number}</span>
                        <span>•</span>
                        <span>{audit.auditor_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge className={statusColors[status]}>
                          {status}
                        </Badge>
                        <p className={cn(
                          "text-xs mt-1",
                          status === "overdue" ? "text-red-600 font-medium" : "text-slate-500"
                        )}>
                          {status === "overdue" 
                            ? `${Math.abs(daysUntilDue)}d overdue`
                            : daysUntilDue === 0 
                              ? "Due today"
                              : `Due ${format(new Date(audit.due_date), "MMM d")}`
                          }
                        </p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Modal */}
      {selectedAudit && (
        <AuditExecutionModal 
          open={!!selectedAudit}
          onClose={() => setSelectedAudit(null)}
          audit={selectedAudit}
          organization={organization}
          user={user}
          section={sections.find(s => s.id === selectedAudit.section_id)}
          requirements={requirements.filter(r => r.section_id === selectedAudit.section_id)}
          existingResult={results.find(r => r.scheduled_audit_id === selectedAudit.id)}
          existingFindings={findings.filter(f => f.scheduled_audit_id === selectedAudit.id)}
          onSuccess={() => {
            setSelectedAudit(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}