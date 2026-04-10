import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, CheckCircle2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { PolicyRepo } from "@/lib/adapters/database";

export default function SOC2PolicyViewer({ policy, onBack, onEdit, orgId }) {
  const [approving, setApproving] = useState(false);
  const queryClient = useQueryClient();

  const handleApprove = async () => {
    setApproving(true);
    try {
      await SOC2PolicyRepo.update(policy.id, {
        status: "approved",
        approved_date: format(new Date(), "yyyy-MM-dd"),
        last_reviewed_date: format(new Date(), "yyyy-MM-dd")
      });
      queryClient.invalidateQueries({ queryKey: ["soc2_policies"] });
      toast.success("Policy approved");
      onBack();
    } catch (e) {
      toast.error("Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Policies
        </Button>
        <div className="flex gap-2">
          {policy.status !== "approved" && (
            <Button variant="outline" onClick={handleApprove} disabled={approving} className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve Policy
            </Button>
          )}
          <Button variant="outline" onClick={onEdit} className="gap-1.5">
            <Pencil className="w-4 h-4" /> Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">{policy.policy_name}</h2>
            <Badge className={policy.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
              {policy.status}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-6 pb-6 border-b">
            <span>Version: {policy.version || "1.0"}</span>
            <span>Owner: {policy.owner || "—"}</span>
            {policy.approved_date && <span>Approved: {format(parseISO(policy.approved_date), "MMM d, yyyy")}</span>}
            {policy.next_review_date && <span>Next Review: {format(parseISO(policy.next_review_date), "MMM d, yyyy")}</span>}
          </div>

          <div className="prose prose-sm prose-slate max-w-none">
            <ReactMarkdown>{policy.content || "*No content yet.*"}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}