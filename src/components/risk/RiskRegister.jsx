// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Search, ArrowUpDown, TrendingUp, TrendingDown, Minus } from "lucide-react";

const RISK_LEVEL_CONFIG = {
  low: { color: "bg-emerald-100 text-emerald-700" },
  medium: { color: "bg-yellow-100 text-yellow-700" },
  high: { color: "bg-orange-100 text-orange-700" },
  critical: { color: "bg-rose-100 text-rose-700" }
};

const STATUS_CONFIG = {
  identified: { color: "bg-slate-100 text-slate-700", label: "Identified" },
  assessing: { color: "bg-blue-100 text-blue-700", label: "Assessing" },
  mitigating: { color: "bg-purple-100 text-purple-700", label: "Mitigating" },
  monitoring: { color: "bg-cyan-100 text-cyan-700", label: "Monitoring" },
  accepted: { color: "bg-amber-100 text-amber-700", label: "Accepted" },
  closed: { color: "bg-emerald-100 text-emerald-700", label: "Closed" },
  escalated: { color: "bg-rose-100 text-rose-700", label: "Escalated" }
};

const TREND_ICONS = { improving: TrendingDown, stable: Minus, worsening: TrendingUp };
const TREND_COLORS = { improving: "text-emerald-500", stable: "text-slate-400", worsening: "text-rose-500" };

export default function RiskRegister({ risks, onSelectRisk, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("risk_score");
  const [sortDir, setSortDir] = useState("desc");

  const categories = useMemo(() => [...new Set(risks.map(r => r.category).filter(Boolean))], [risks]);

  const filteredRisks = useMemo(() => {
    let result = [...risks];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => r.title?.toLowerCase().includes(s) || r.risk_number?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s));
    }
    if (filterLevel !== "all") result = result.filter(r => r.risk_level === filterLevel);
    if (filterStatus !== "all") result = result.filter(r => r.status === filterStatus);
    if (filterCategory !== "all") result = result.filter(r => r.category === filterCategory);

    result.sort((a, b) => {
      let aVal = a[sortBy], bVal = b[sortBy];
      if (sortBy === "risk_score") { aVal = aVal || 0; bVal = bVal || 0; }
      if (typeof aVal === "string") { aVal = aVal?.toLowerCase() || ""; bVal = bVal?.toLowerCase() || ""; }
      return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return result;
  }, [risks, search, filterLevel, filterStatus, filterCategory, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir(field === "risk_score" ? "desc" : "asc"); }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search risks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/60" />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-32 bg-white/60"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 bg-white/60"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-36 bg-white/60"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (<SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{filteredRisks.length} risks found</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => toggleSort("risk_score")}>Score<ArrowUpDown className="w-3 h-3 ml-1" /></Button>
          <Button variant="ghost" size="sm" onClick={() => toggleSort("title")}>Title<ArrowUpDown className="w-3 h-3 ml-1" /></Button>
        </div>
      </div>

      <div className="grid gap-3">
        {filteredRisks.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="py-12 text-center"><p className="text-slate-500">No risks found</p></CardContent></Card>
        ) : (
          filteredRisks.map(risk => {
            const TrendIcon = TREND_ICONS[risk.trend] || Minus;
            return (
              <Card key={risk.id} onClick={() => onSelectRisk(risk)} className="bg-white/60 backdrop-blur-xl border-white/80 hover:bg-white/80 cursor-pointer transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-slate-700">{risk.risk_score || "—"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-400">{risk.risk_number}</span>
                        <Badge className={RISK_LEVEL_CONFIG[risk.risk_level]?.color}>{risk.risk_level}</Badge>
                        <Badge className={STATUS_CONFIG[risk.status]?.color}>{STATUS_CONFIG[risk.status]?.label}</Badge>
                        <Badge variant="outline" className="capitalize">{risk.category?.replace(/_/g, " ")}</Badge>
                        <span className="flex items-center gap-1 text-xs"><TrendIcon className={`w-3 h-3 ${TREND_COLORS[risk.trend]}`} />{risk.trend}</span>
                      </div>
                      <h3 className="text-sm font-medium text-slate-800 mb-1">{risk.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span>L:{risk.likelihood} × S:{risk.severity}</span>
                        {risk.owner_name && <span>Owner: {risk.owner_name}</span>}
                        {risk.next_review_date && (
                          <span className={new Date(risk.next_review_date) < new Date() ? "text-amber-600 font-medium" : ""}>
                            Review: {format(new Date(risk.next_review_date), "MMM d, yyyy")}
                          </span>
                        )}
                        <span className="capitalize">{risk.source}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}