// @ts-nocheck
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Search, Calendar, Users, CheckCircle2, Clock } from "lucide-react";

const STATUS_CONFIG = {
  draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
  scheduled: { color: "bg-blue-100 text-blue-700", label: "Scheduled" },
  in_progress: { color: "bg-purple-100 text-purple-700", label: "In Progress" },
  pending_approval: { color: "bg-amber-100 text-amber-700", label: "Pending Approval" },
  completed: { color: "bg-emerald-100 text-emerald-700", label: "Completed" },
  cancelled: { color: "bg-slate-100 text-slate-500", label: "Cancelled" }
};

const TYPE_LABELS = { monthly: "Monthly", quarterly: "Quarterly", semi_annual: "Semi-Annual", annual: "Annual", special: "Special" };

export default function ManagementReviewList({ reviews, onSelectReview, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredReviews = reviews.filter(r => {
    const matchSearch = r.title?.toLowerCase().includes(search.toLowerCase()) || r.review_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search reviews..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/60" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-white/60"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500">{filteredReviews.length} reviews found</p>

      <div className="grid gap-3">
        {filteredReviews.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="py-12 text-center"><p className="text-slate-500">No reviews found</p></CardContent>
          </Card>
        ) : (
          filteredReviews.map(review => (
            <Card key={review.id} onClick={() => onSelectReview(review)} className="bg-white/60 backdrop-blur-xl border-white/80 hover:bg-white/80 cursor-pointer transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-slate-400">{review.review_number}</span>
                      <Badge className={STATUS_CONFIG[review.status]?.color}>{STATUS_CONFIG[review.status]?.label}</Badge>
                      <Badge variant="outline">{TYPE_LABELS[review.review_type]}</Badge>
                    </div>
                    <h3 className="text-sm font-medium text-slate-800 mb-1">{review.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {review.scheduled_date ? format(new Date(review.scheduled_date), "MMM d, yyyy") : "Not scheduled"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {(review.attendees || []).length} attendees
                      </span>
                      {review.facilitator_name && <span>Facilitator: {review.facilitator_name}</span>}
                    </div>
                  </div>
                  {review.status === "completed" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {["draft", "scheduled"].includes(review.status) && <Clock className="w-5 h-5 text-amber-500" />}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}