import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Search, FileText, Users, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
  under_review: { color: "bg-blue-100 text-blue-700", label: "Under Review" },
  approved: { color: "bg-amber-100 text-amber-700", label: "Approved" },
  active: { color: "bg-emerald-100 text-emerald-700", label: "Active" },
  superseded: { color: "bg-purple-100 text-purple-700", label: "Superseded" },
  archived: { color: "bg-slate-100 text-slate-500", label: "Archived" }
};

export default function FSPlanList({ plans, onSelectPlan, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredPlans = plans.filter(p => {
    const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase()) || p.plan_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchType = filterType === "all" || p.plan_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-4">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardContent className="pt-4">
          <div className={cn("flex gap-3", isMobile ? "flex-col" : "flex-wrap")}>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search plans..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/60" />
            </div>
            <div className={cn("flex gap-2", isMobile && "flex-wrap")}>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className={cn("bg-white/60", isMobile ? "flex-1 min-w-[120px]" : "w-36")}><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className={cn("bg-white/60", isMobile ? "flex-1 min-w-[100px]" : "w-32")}><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="haccp">HACCP</SelectItem>
                  <SelectItem value="harpc">HARPC</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500">{filteredPlans.length} plans found</p>

      <div className="grid gap-3">
        {filteredPlans.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="py-12 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No plans found</p>
            </CardContent>
          </Card>
        ) : isMobile ? (
          // Mobile card-based list
          filteredPlans.map(plan => (
            <Card key={plan.id} onClick={() => onSelectPlan(plan)} className="bg-white/60 backdrop-blur-xl border-white/80 active:bg-slate-50 cursor-pointer transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400">{plan.plan_number}</span>
                  <Badge className={STATUS_CONFIG[plan.status]?.color + " text-xs"}>{STATUS_CONFIG[plan.status]?.label}</Badge>
                </div>
                <h3 className="text-sm font-medium text-slate-800 mb-2 line-clamp-2">{plan.title}</h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">{plan.plan_type?.toUpperCase()}</Badge>
                  <Badge variant="outline" className="text-xs">v{plan.version}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate">
                    {plan.team_leader_name || plan.product_category || "No category"}
                  </span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          // Desktop view
          filteredPlans.map(plan => (
            <Card key={plan.id} onClick={() => onSelectPlan(plan)} className="bg-white/60 backdrop-blur-xl border-white/80 hover:bg-white/80 cursor-pointer transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{plan.plan_number}</span>
                      <Badge className={STATUS_CONFIG[plan.status]?.color}>{STATUS_CONFIG[plan.status]?.label}</Badge>
                      <Badge className="bg-emerald-100 text-emerald-700">{plan.plan_type?.toUpperCase()}</Badge>
                      <Badge variant="outline">v{plan.version}</Badge>
                    </div>
                    <h3 className="text-sm font-medium text-slate-800 mb-1">{plan.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      {plan.product_category && <span>{plan.product_category}</span>}
                      {plan.team_leader_name && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{plan.team_leader_name}</span>}
                      {plan.effective_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Effective: {format(new Date(plan.effective_date), "MMM d, yyyy")}</span>}
                      {plan.next_review_date && (
                        <span className={new Date(plan.next_review_date) < new Date() ? "text-amber-600 font-medium" : ""}>
                          Review: {format(new Date(plan.next_review_date), "MMM d, yyyy")}
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