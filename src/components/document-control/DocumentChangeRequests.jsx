import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, Search, GitBranch, Clock, MoreVertical
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import ChangeRequestFormModal from "./ChangeRequestFormModal";
import { DocumentChangeRequestRepo } from "@/lib/adapters/database";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700" },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700" }
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-600" },
  high: { label: "High", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Urgent", color: "bg-rose-100 text-rose-600" }
};

export default function DocumentChangeRequests({ changeRequests, documents, trainingDocuments = [], organizationId, user, settings, onRefresh }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCR, setEditingCR] = useState(null);

  const filtered = changeRequests.filter(cr => {
    if (!search) return true;
    return cr.request_number?.toLowerCase().includes(search.toLowerCase()) ||
           cr.document_title?.toLowerCase().includes(search.toLowerCase()) ||
           cr.description?.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const handleSubmitCR = async (cr) => {
    await DocumentChangeRequestRepo.update(cr.id, { status: "submitted" });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search change requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/80"
            />
          </div>
          <Button onClick={() => { setEditingCR(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-1.5" />
            New Change Request
          </Button>
        </div>
      </div>

      {/* Change Request Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-12 text-center">
            <GitBranch className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No change requests found</p>
          </div>
        ) : (
          filtered.map(cr => {
            const statusConfig = STATUS_CONFIG[cr.status] || STATUS_CONFIG.draft;
            const priorityConfig = PRIORITY_CONFIG[cr.priority] || PRIORITY_CONFIG.medium;
            
            return (
              <Card key={cr.id} className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <GitBranch className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-slate-700">{cr.request_number || "DCR-DRAFT"}</span>
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                        <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
                      </div>
                      <p className="text-sm text-slate-900 font-medium line-clamp-1">
                        {cr.request_type === "new_document" ? "New Document" : cr.document_title || "Document Change"}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{cr.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>By {cr.requestor_name || "Unknown"}</span>
                        <span>{format(new Date(cr.created_date), "MMM d, yyyy")}</span>
                        {cr.target_effective_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Target: {format(new Date(cr.target_effective_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingCR(cr); setShowForm(true); }}>
                        Edit
                      </DropdownMenuItem>
                      {cr.status === "draft" && (
                        <DropdownMenuItem onClick={() => handleSubmitCR(cr)}>
                          Submit for Review
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Impact Assessment Preview */}
                {cr.impact_assessment && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    {cr.impact_assessment.training_impact && (
                      <Badge variant="outline" className="text-[10px]">Training Impact</Badge>
                    )}
                    {cr.impact_assessment.process_impact && (
                      <Badge variant="outline" className="text-[10px]">Process Impact</Badge>
                    )}
                    {cr.impact_assessment.regulatory_impact && (
                      <Badge variant="outline" className="text-[10px]">Regulatory Impact</Badge>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {showForm && (
        <ChangeRequestFormModal
          open={showForm}
          onOpenChange={setShowForm}
          changeRequest={editingCR}
          documents={documents}
          trainingDocuments={trainingDocuments}
          organizationId={organizationId}
          user={user}
          onSaved={() => { setShowForm(false); onRefresh(); }}
        />
      )}
    </div>
  );
}