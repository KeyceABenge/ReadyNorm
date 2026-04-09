import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Search, ArrowUpDown, MapPin, Mail, FileText } from "lucide-react";

const RISK_CONFIG = {
  low: { color: "bg-emerald-100 text-emerald-700", label: "Low" },
  medium: { color: "bg-yellow-100 text-yellow-700", label: "Medium" },
  high: { color: "bg-orange-100 text-orange-700", label: "High" },
  critical: { color: "bg-rose-100 text-rose-700", label: "Critical" }
};

const STATUS_CONFIG = {
  pending_approval: { color: "bg-slate-100 text-slate-700", label: "Pending" },
  approved: { color: "bg-emerald-100 text-emerald-700", label: "Approved" },
  conditional: { color: "bg-amber-100 text-amber-700", label: "Conditional" },
  suspended: { color: "bg-rose-100 text-rose-700", label: "Suspended" },
  disqualified: { color: "bg-red-100 text-red-700", label: "Disqualified" },
  inactive: { color: "bg-slate-100 text-slate-600", label: "Inactive" }
};

const TYPE_LABELS = {
  ingredient: "Ingredient", packaging: "Packaging", service: "Service",
  equipment: "Equipment", chemical: "Chemical", other: "Other"
};

export default function SupplierList({ suppliers, onSelectSupplier, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const filteredSuppliers = useMemo(() => {
    let result = [...suppliers];
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(searchLower) ||
        s.supplier_code?.toLowerCase().includes(searchLower) ||
        s.contact_name?.toLowerCase().includes(searchLower)
      );
    }
    if (filterStatus !== "all") result = result.filter(s => s.status === filterStatus);
    if (filterRisk !== "all") result = result.filter(s => s.risk_rating === filterRisk);
    if (filterType !== "all") result = result.filter(s => s.supplier_type === filterType);

    result.sort((a, b) => {
      let aVal = a[sortBy], bVal = b[sortBy];
      if (typeof aVal === "string") aVal = aVal?.toLowerCase() || "";
      if (typeof bVal === "string") bVal = bVal?.toLowerCase() || "";
      return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return result;
  }, [suppliers, search, filterStatus, filterRisk, filterType, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/60" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 bg-white/60"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (<SelectItem key={key} value={key}>{val.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="w-32 bg-white/60"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                {Object.entries(RISK_CONFIG).map(([key, val]) => (<SelectItem key={key} value={key}>{val.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36 bg-white/60"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([key, val]) => (<SelectItem key={key} value={key}>{val}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{filteredSuppliers.length} suppliers found</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => toggleSort("name")}>Name<ArrowUpDown className="w-3 h-3 ml-1" /></Button>
          <Button variant="ghost" size="sm" onClick={() => toggleSort("risk_rating")}>Risk<ArrowUpDown className="w-3 h-3 ml-1" /></Button>
        </div>
      </div>

      <div className="grid gap-3">
        {filteredSuppliers.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="py-12 text-center"><p className="text-slate-500">No suppliers found</p></CardContent>
          </Card>
        ) : (
          filteredSuppliers.map(supplier => (
            <Card key={supplier.id} onClick={() => onSelectSupplier(supplier)} className="bg-white/60 backdrop-blur-xl border-white/80 hover:bg-white/80 cursor-pointer transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{supplier.supplier_code}</span>
                      <Badge className={STATUS_CONFIG[supplier.status]?.color}>{STATUS_CONFIG[supplier.status]?.label}</Badge>
                      <Badge className={RISK_CONFIG[supplier.risk_rating]?.color}>{RISK_CONFIG[supplier.risk_rating]?.label} Risk</Badge>
                      <Badge variant="outline">{TYPE_LABELS[supplier.supplier_type]}</Badge>
                    </div>
                    <h3 className="text-sm font-medium text-slate-800 mb-1">{supplier.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      {supplier.contact_name && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{supplier.contact_name}</span>}
                      {supplier.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{supplier.city}{supplier.country && `, ${supplier.country}`}</span>}
                      <span><FileText className="w-3 h-3 inline mr-1" />{supplier.total_nonconformances || 0} NCs</span>
                      {supplier.performance_score && <span>Score: {supplier.performance_score}%</span>}
                      {supplier.next_review_date && (
                        <span className={new Date(supplier.next_review_date) < new Date() ? "text-orange-600 font-medium" : ""}>
                          Review: {format(new Date(supplier.next_review_date), "MMM d, yyyy")}
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