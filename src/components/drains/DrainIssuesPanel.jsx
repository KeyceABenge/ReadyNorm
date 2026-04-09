import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DrainCleaningRecordRepo } from "@/lib/adapters/database";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp,
  Loader2, MessageSquare, Image as ImageIcon
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function IssueCard({ record, user }) {
  const [expanded, setExpanded] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState(record.resolution_notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const status = record.issue_status || "open";

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      toast.error("Please describe the corrective action taken");
      return;
    }
    setIsSaving(true);
    await DrainCleaningRecordRepo.update(record.id, {
      issue_status: "resolved",
      resolution_notes: resolutionNotes,
      resolved_by: user.email,
      resolved_by_name: user.full_name,
      resolved_at: new Date().toISOString()
    });
    queryClient.invalidateQueries({ queryKey: ["drain_cleaning_records"] });
    toast.success("Issue resolved and closed");
    setIsSaving(false);
  };

  const handleMarkInProgress = async () => {
    setIsSaving(true);
    await DrainCleaningRecordRepo.update(record.id, {
      issue_status: "in_progress"
    });
    queryClient.invalidateQueries({ queryKey: ["drain_cleaning_records"] });
    toast.success("Issue marked as in progress");
    setIsSaving(false);
  };

  return (
    <Card className={cn(
      "border-l-4 overflow-hidden",
      status === "open" ? "border-l-red-500" :
      status === "in_progress" ? "border-l-amber-500" :
      "border-l-emerald-500"
    )}>
      {/* Header - always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
              status === "open" ? "bg-red-100" :
              status === "in_progress" ? "bg-amber-100" :
              "bg-emerald-100"
            )}>
              {status === "open" ? <AlertTriangle className="w-4 h-4 text-red-600" /> :
               status === "in_progress" ? <Clock className="w-4 h-4 text-amber-600" /> :
               <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900">{record.drain_code}</span>
                <Badge className={cn(
                  "text-xs",
                  status === "open" ? "bg-red-100 text-red-700" :
                  status === "in_progress" ? "bg-amber-100 text-amber-700" :
                  "bg-emerald-100 text-emerald-700"
                )}>
                  {status === "open" ? "Open" : status === "in_progress" ? "In Progress" : "Resolved"}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 truncate">{record.drain_location}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Reported by {record.cleaned_by_name} — {record.cleaned_at && format(parseISO(record.cleaned_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t bg-slate-50 p-4 space-y-4">
          {/* Employee notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <MessageSquare className="w-4 h-4" />
              Employee Notes
            </div>
            {record.issue_description && (
              <div className="bg-white rounded-lg p-3 border text-sm text-slate-800">
                {record.issue_description}
              </div>
            )}
            {record.condition_notes && (
              <div className="bg-white rounded-lg p-3 border text-sm text-slate-700">
                <span className="text-xs text-slate-500 block mb-1">Condition Notes:</span>
                {record.condition_notes}
              </div>
            )}
            {!record.issue_description && !record.condition_notes && (
              <p className="text-sm text-slate-400 italic">No additional notes provided</p>
            )}
          </div>

          {/* Photos */}
          {record.photo_urls?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ImageIcon className="w-4 h-4" />
                Photos ({record.photo_urls.length})
              </div>
              <div className="flex gap-2 flex-wrap">
                {record.photo_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={url} alt={`Issue photo ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resolution section */}
          {status === "resolved" ? (
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                Resolution
              </div>
              <p className="text-sm text-emerald-900">{record.resolution_notes}</p>
              <p className="text-xs text-emerald-600">
                Resolved by {record.resolved_by_name} — {record.resolved_at && format(parseISO(record.resolved_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">Corrective Action</div>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe the corrective action taken to resolve this issue..."
                rows={3}
              />
              <div className="flex gap-2">
                {status === "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkInProgress}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Clock className="w-3 h-3 mr-1" />}
                    Mark In Progress
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleResolve}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  Resolve & Close
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function DrainIssuesPanel({ cleaningRecords, user }) {
  const [filter, setFilter] = useState("open");

  const issueRecords = cleaningRecords.filter(r => r.issues_found);

  const openCount = issueRecords.filter(r => !r.issue_status || r.issue_status === "open").length;
  const inProgressCount = issueRecords.filter(r => r.issue_status === "in_progress").length;
  const resolvedCount = issueRecords.filter(r => r.issue_status === "resolved").length;

  const filteredRecords = issueRecords.filter(r => {
    const status = r.issue_status || "open";
    if (filter === "all") return true;
    return status === filter;
  }).sort((a, b) => new Date(b.cleaned_at) - new Date(a.cleaned_at));

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card
          className={cn(
            "p-3 text-center cursor-pointer transition-all border-2",
            filter === "open" ? "border-red-300 bg-red-50" : "border-transparent hover:bg-slate-50"
          )}
          onClick={() => setFilter("open")}
        >
          <div className="text-2xl font-bold text-red-600">{openCount}</div>
          <div className="text-xs text-slate-600">Open</div>
        </Card>
        <Card
          className={cn(
            "p-3 text-center cursor-pointer transition-all border-2",
            filter === "in_progress" ? "border-amber-300 bg-amber-50" : "border-transparent hover:bg-slate-50"
          )}
          onClick={() => setFilter("in_progress")}
        >
          <div className="text-2xl font-bold text-amber-600">{inProgressCount}</div>
          <div className="text-xs text-slate-600">In Progress</div>
        </Card>
        <Card
          className={cn(
            "p-3 text-center cursor-pointer transition-all border-2",
            filter === "resolved" ? "border-emerald-300 bg-emerald-50" : "border-transparent hover:bg-slate-50"
          )}
          onClick={() => setFilter("resolved")}
        >
          <div className="text-2xl font-bold text-emerald-600">{resolvedCount}</div>
          <div className="text-xs text-slate-600">Resolved</div>
        </Card>
      </div>

      {/* Issue list */}
      {filteredRecords.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">
            {filter === "open" ? "No open issues" :
             filter === "in_progress" ? "No issues in progress" :
             filter === "resolved" ? "No resolved issues" :
             "No issues reported"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(record => (
            <IssueCard key={record.id} record={record} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}