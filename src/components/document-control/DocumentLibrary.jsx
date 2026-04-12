import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Plus, FileText, Download, Eye, Edit, 
  History, Link2, MoreVertical, CheckCircle2, Clock, AlertTriangle,
  FileWarning, Archive
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import DocumentFormModal from "./DocumentFormModal";
import DocumentDetailModal from "./DocumentDetailModal";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", icon: FileText },
  pending_review: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  pending_approval: { label: "Pending Approval", color: "bg-blue-100 text-blue-700", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  effective: { label: "Effective", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  superseded: { label: "Superseded", color: "bg-orange-100 text-orange-700", icon: Archive },
  obsolete: { label: "Obsolete", color: "bg-rose-100 text-rose-700", icon: FileWarning }
};

const TYPE_CONFIG = {
  policy: { label: "Policy", color: "bg-purple-100 text-purple-700" },
  sop: { label: "SOP", color: "bg-blue-100 text-blue-700" },
  ssop: { label: "SSOP", color: "bg-cyan-100 text-cyan-700" },
  work_instruction: { label: "Work Instruction", color: "bg-teal-100 text-teal-700" },
  form: { label: "Form", color: "bg-green-100 text-green-700" },
  training_material: { label: "Training Material", color: "bg-violet-100 text-violet-700" },
  customer_requirement: { label: "Customer Req.", color: "bg-amber-100 text-amber-700" },
  customer_policy: { label: "Customer Policy", color: "bg-amber-100 text-amber-700" },
  audit_standard: { label: "Audit Standard", color: "bg-indigo-100 text-indigo-700" },
  specification: { label: "Specification", color: "bg-pink-100 text-pink-700" },
  manual: { label: "Manual", color: "bg-slate-100 text-slate-700" },
  procedure: { label: "Procedure", color: "bg-sky-100 text-sky-700" },
  guideline: { label: "Guideline", color: "bg-lime-100 text-lime-700" },
  other: { label: "Other", color: "bg-gray-100 text-gray-700" }
};

export default function DocumentLibrary({ documents, versions, organizationId, user, settings, onRefresh }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [initialTab, setInitialTab] = useState("details");

  // Get unique categories
  const categories = [...new Set(documents.map(d => d.category).filter(Boolean))];

  // Filter documents
  const filtered = documents.filter(doc => {
    const matchesSearch = !search || 
      doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.document_number?.toLowerCase().includes(search.toLowerCase()) ||
      doc.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    const matchesSource = sourceFilter === "all" || 
      (sourceFilter === "training" && doc.training_document_id) ||
      (sourceFilter === "manual" && !doc.training_document_id);
    return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesSource;
  });

  const isOverdue = (doc) => doc.next_review_date && new Date(doc.next_review_date) < new Date();

  // Compute next review date: use stored value, or derive from effective_date + frequency
  const getNextReviewDate = (doc) => {
    if (doc.next_review_date) return doc.next_review_date;
    if (doc.effective_date) {
      const eff = new Date(doc.effective_date);
      const months = doc.review_frequency_months || 12;
      eff.setMonth(eff.getMonth() + months);
      return eff.toISOString().split("T")[0];
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/80"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 bg-white/80">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-white/80">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36 bg-white/80">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36 bg-white/80">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="training">From Training</SelectItem>
                <SelectItem value="manual">Created Here</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditingDoc(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-1.5" />
              New Document
            </Button>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Document</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Version</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Effective</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Next Review</th>
                <th className="text-right text-xs font-semibold text-slate-600 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No documents found</p>
                  </td>
                </tr>
              ) : filtered.map(doc => {
                const statusConfig = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                const typeConfig = TYPE_CONFIG[doc.document_type] || TYPE_CONFIG.other;
                const overdue = isOverdue(doc);

                return (
                  <tr key={doc.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <FileText className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                         <div className="flex items-center gap-1.5">
                           <p className="font-medium text-sm text-slate-900">{doc.document_number || doc.title}</p>
                           {doc.training_document_id && (
                             <Badge className="bg-violet-100 text-violet-700 text-[9px] px-1 py-0">Training</Badge>
                           )}
                         </div>
                         {doc.document_number && <p className="text-xs text-slate-600 line-clamp-1">{doc.title}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${typeConfig.color} text-[10px]`}>{typeConfig.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{doc.category || "-"}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-700">{doc.current_version}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusConfig.color} text-[10px]`}>{statusConfig.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {doc.effective_date ? format(new Date(doc.effective_date), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const reviewDate = getNextReviewDate(doc);
                        if (!reviewDate) return "-";
                        const isLate = new Date(reviewDate) < new Date();
                        return (
                          <span className={`text-sm ${isLate ? "text-rose-600 font-medium" : "text-slate-600"}`}>
                            {isLate && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                            {format(new Date(reviewDate), "MMM d, yyyy")}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setInitialTab("details"); setViewingDoc(doc); }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {doc.file_url && (
                            <DropdownMenuItem onClick={() => window.open(doc.file_url, "_blank")}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setEditingDoc(doc); setShowForm(true); }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setInitialTab("history"); setViewingDoc(doc); }}>
                            <History className="w-4 h-4 mr-2" />
                            Version History
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Link2 className="w-4 h-4 mr-2" />
                            Manage Links
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <DocumentFormModal
          open={showForm}
          onOpenChange={setShowForm}
          document={editingDoc}
          organizationId={organizationId}
          user={user}
          settings={settings}
          onSaved={() => { setShowForm(false); onRefresh(); }}
        />
      )}

      {viewingDoc && (
        <DocumentDetailModal
          open={!!viewingDoc}
          onOpenChange={() => setViewingDoc(null)}
          document={viewingDoc}
          versions={versions.filter(v => v.document_id === viewingDoc.id)}
          initialTab={initialTab}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}