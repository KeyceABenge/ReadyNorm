// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Search, Filter, ArrowUpDown, Calendar, User, MapPin } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { color: "bg-rose-100 text-rose-700", label: "Critical" },
  major: { color: "bg-amber-100 text-amber-700", label: "Major" },
  moderate: { color: "bg-yellow-100 text-yellow-700", label: "Moderate" },
  minor: { color: "bg-slate-100 text-slate-600", label: "Minor" }
};

const STATUS_CONFIG = {
  open: { color: "bg-slate-100 text-slate-700", label: "Open" },
  under_review: { color: "bg-blue-100 text-blue-700", label: "Under Review" },
  containment: { color: "bg-amber-100 text-amber-700", label: "Containment" },
  corrective_action: { color: "bg-purple-100 text-purple-700", label: "Corrective Action" },
  capa_required: { color: "bg-rose-100 text-rose-700", label: "CAPA Required" },
  pending_verification: { color: "bg-teal-100 text-teal-700", label: "Pending Verify" },
  closed: { color: "bg-emerald-100 text-emerald-700", label: "Closed" },
  escalated: { color: "bg-red-100 text-red-700", label: "Escalated" }
};

const CATEGORY_LABELS = {
  quality: "Quality", food_safety: "Food Safety", sanitation: "Sanitation",
  pest: "Pest Control", environmental: "Environmental", audit: "Audit",
  customer: "Customer", operational: "Operational", other: "Other"
};

export default function IssuesList({ issues, onSelectIssue, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortDir, setSortDir] = useState("desc");

  const filteredIssues = useMemo(() => {
    let result = [...issues];
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(i =>
        i.title?.toLowerCase().includes(searchLower) ||
        i.issue_number?.toLowerCase().includes(searchLower) ||
        i.description?.toLowerCase().includes(searchLower)
      );
    }
    if (filterStatus !== "all") result = result.filter(i => i.status === filterStatus);
    if (filterSeverity !== "all") result = result.filter(i => i.severity === filterSeverity);
    if (filterCategory !== "all") result = result.filter(i => i.category === filterCategory);

    result.sort((a, b) => {
      let aVal = a[sortBy], bVal = b[sortBy];
      if (sortBy === "created_date" || sortBy === "due_date") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return result;
  }, [issues, search, filterStatus, filterSeverity, filterCategory, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search issues..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/60" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-white/60"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (<SelectItem key={key} value={key}>{val.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-36 bg-white/60"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {Object.entries(SEVERITY_CONFIG).map(([key, val]) => (<SelectItem key={key} value={key}>{val.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40 bg-white/60"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, val]) => (<SelectItem key={key} value={key}>{val}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{filteredIssues.length} issues found</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => toggleSort("created_date")}><Calendar className="w-4 h-4 mr-1" />Date<ArrowUpDown className="w-3 h-3 ml-1" /></Button>
          <Button variant="ghost" size="sm" onClick={() => toggleSort("severity")}>Severity<ArrowUpDown className="w-3 h-3 ml-1" /></Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="py-12 text-center"><p className="text-slate-500">No issues found matching your filters</p></CardContent>
          </Card>
        ) : (
          filteredIssues.map(issue => (
            <Card key={issue.id} onClick={() => onSelectIssue(issue)} className="bg-white/60 backdrop-blur-xl border-white/80 hover:bg-white/80 cursor-pointer transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-slate-400">{issue.issue_number}</span>
                      <Badge className={SEVERITY_CONFIG[issue.severity]?.color}>{SEVERITY_CONFIG[issue.severity]?.label}</Badge>
                      <Badge className={STATUS_CONFIG[issue.status]?.color}>{STATUS_CONFIG[issue.status]?.label}</Badge>
                      {issue.linked_capa_id && <Badge variant="outline" className="text-rose-600 border-rose-200">CAPA Linked</Badge>}
                    </div>
                    <h3 className="text-sm font-medium text-slate-800 mb-1">{issue.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{issue.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Filter className="w-3 h-3" />{CATEGORY_LABELS[issue.category]}</span>
                      {(issue.area_name || issue.specific_location) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{issue.area_name || issue.specific_location}</span>}
                      {issue.assigned_to_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{issue.assigned_to_name}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(issue.created_date), "MMM d, yyyy")}</span>
                      {issue.due_date && <span className={`flex items-center gap-1 ${new Date(issue.due_date) < new Date() && issue.status !== "closed" ? "text-orange-600 font-medium" : ""}`}>Due: {format(new Date(issue.due_date), "MMM d")}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}