import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Search, ArrowUpDown, Calendar, User, Package, Building2, Thermometer } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { color: "bg-rose-100 text-rose-700", label: "Critical" },
  major: { color: "bg-amber-100 text-amber-700", label: "Major" },
  moderate: { color: "bg-yellow-100 text-yellow-700", label: "Moderate" },
  minor: { color: "bg-slate-100 text-slate-600", label: "Minor" }
};

const STATUS_CONFIG = {
  received: { color: "bg-slate-100 text-slate-700", label: "Received" },
  under_investigation: { color: "bg-blue-100 text-blue-700", label: "Investigating" },
  root_cause_identified: { color: "bg-amber-100 text-amber-700", label: "Root Cause Found" },
  corrective_action: { color: "bg-purple-100 text-purple-700", label: "Corrective Action" },
  pending_response: { color: "bg-teal-100 text-teal-700", label: "Pending Response" },
  responded: { color: "bg-cyan-100 text-cyan-700", label: "Responded" },
  closed: { color: "bg-emerald-100 text-emerald-700", label: "Closed" },
  escalated: { color: "bg-red-100 text-red-700", label: "Escalated" }
};

const COMPLAINT_TYPE_LABELS = {
  foreign_material: "Foreign Material", quality_defect: "Quality Defect", food_safety: "Food Safety",
  allergen: "Allergen", labeling: "Labeling", packaging: "Packaging", taste_odor: "Taste/Odor",
  appearance: "Appearance", short_weight: "Short Weight", spoilage: "Spoilage", other: "Other"
};

const IMPACT_CONFIG = {
  illness_claimed: { color: "bg-amber-100 text-amber-700", label: "Illness Claimed" },
  illness_confirmed: { color: "bg-rose-100 text-rose-700", label: "Illness Confirmed" },
  injury: { color: "bg-red-100 text-red-700", label: "Injury" },
  hospitalization: { color: "bg-red-200 text-red-800", label: "Hospitalization" }
};

export default function ComplaintsList({ complaints, onSelectComplaint, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortDir, setSortDir] = useState("desc");

  const filteredComplaints = useMemo(() => {
    let result = [...complaints];
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(c =>
        c.customer_name?.toLowerCase().includes(searchLower) ||
        c.complaint_number?.toLowerCase().includes(searchLower) ||
        c.product_name?.toLowerCase().includes(searchLower) ||
        c.lot_number?.toLowerCase().includes(searchLower) ||
        c.complaint_description?.toLowerCase().includes(searchLower)
      );
    }
    if (filterStatus !== "all") result = result.filter(c => c.status === filterStatus);
    if (filterSeverity !== "all") result = result.filter(c => c.severity === filterSeverity);
    if (filterType !== "all") result = result.filter(c => c.complaint_type === filterType);

    result.sort((a, b) => {
      let aVal = a[sortBy], bVal = b[sortBy];
      if (sortBy === "created_date" || sortBy === "response_due_date") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return result;
  }, [complaints, search, filterStatus, filterSeverity, filterType, sortBy, sortDir]);

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
              <Input placeholder="Search complaints..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/60" />
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 bg-white/60"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(COMPLAINT_TYPE_LABELS).map(([key, val]) => (<SelectItem key={key} value={key}>{val}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{filteredComplaints.length} complaints found</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => toggleSort("created_date")}><Calendar className="w-4 h-4 mr-1" />Date<ArrowUpDown className="w-3 h-3 ml-1" /></Button>
          <Button variant="ghost" size="sm" onClick={() => toggleSort("severity")}>Severity<ArrowUpDown className="w-3 h-3 ml-1" /></Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredComplaints.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="py-12 text-center"><p className="text-slate-500">No complaints found matching your filters</p></CardContent>
          </Card>
        ) : (
          filteredComplaints.map(complaint => (
            <Card key={complaint.id} onClick={() => onSelectComplaint(complaint)} className="bg-white/60 backdrop-blur-xl border-white/80 hover:bg-white/80 cursor-pointer transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{complaint.complaint_number}</span>
                      <Badge className={SEVERITY_CONFIG[complaint.severity]?.color}>{SEVERITY_CONFIG[complaint.severity]?.label}</Badge>
                      <Badge className={STATUS_CONFIG[complaint.status]?.color}>{STATUS_CONFIG[complaint.status]?.label}</Badge>
                      {complaint.customer_impact && IMPACT_CONFIG[complaint.customer_impact] && (
                        <Badge className={IMPACT_CONFIG[complaint.customer_impact]?.color}>{IMPACT_CONFIG[complaint.customer_impact]?.label}</Badge>
                      )}
                      {complaint.linked_capa_id && <Badge variant="outline" className="text-rose-600 border-rose-200">CAPA Linked</Badge>}
                      {complaint.is_recurring && <Badge variant="outline" className="text-amber-600 border-amber-200">Recurring</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <h3 className="text-sm font-medium text-slate-800">{complaint.customer_name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{complaint.complaint_description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" />{COMPLAINT_TYPE_LABELS[complaint.complaint_type]}</span>
                      {complaint.product_name && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{complaint.product_name}</span>}
                      {complaint.lot_number && <span>Lot: {complaint.lot_number}</span>}
                      {complaint.assigned_to_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{complaint.assigned_to_name}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(complaint.created_date), "MMM d, yyyy")}</span>
                      {complaint.response_due_date && (
                        <span className={`flex items-center gap-1 ${new Date(complaint.response_due_date) < new Date() && !["closed", "responded"].includes(complaint.status) ? "text-orange-600 font-medium" : ""}`}>
                          Response Due: {format(new Date(complaint.response_due_date), "MMM d")}
                        </span>
                      )}
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