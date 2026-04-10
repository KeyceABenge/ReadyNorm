import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, CheckCircle2, XCircle,
  ArrowRight, Calendar, User
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { ControlledDocumentRepo } from "@/lib/adapters/database";

export default function DocumentReviewQueue({ documents, versions, changeRequests, organizationId, user, onRefresh }) {
  const [activeTab, setActiveTab] = useState("pending");

  // Documents pending review/approval
  const pendingReview = documents.filter(d => d.status === "pending_review");
  const pendingApproval = documents.filter(d => d.status === "pending_approval");

  // Documents due for periodic review
  const today = new Date();
  const overdueReviews = documents.filter(d => 
    d.status === "effective" && d.next_review_date && new Date(d.next_review_date) < today
  );
  const upcomingReviews = documents.filter(d => {
    if (d.status !== "effective" || !d.next_review_date) return false;
    const reviewDate = new Date(d.next_review_date);
    const daysUntil = differenceInDays(reviewDate, today);
    return daysUntil >= 0 && daysUntil <= 30;
  });

  // Change requests needing action
  const pendingCRs = changeRequests.filter(cr => cr.status === "submitted" || cr.status === "under_review");

  const handleApprove = async (doc) => {
    await ControlledDocumentRepo.update(doc.id, {
      status: "effective",
      approvers: [
        ...(doc.approvers || []),
        { email: user?.email, name: user?.full_name, approved_at: new Date().toISOString(), status: "approved" }
      ]
    });
    toast.success("Document approved and effective");
    onRefresh();
  };

  const handleReject = async (doc) => {
    await ControlledDocumentRepo.update(doc.id, {
      status: "draft",
      approvers: [
        ...(doc.approvers || []),
        { email: user?.email, name: user?.full_name, approved_at: new Date().toISOString(), status: "rejected" }
      ]
    });
    toast.success("Document rejected");
    onRefresh();
  };

  const ReviewCard = ({ doc, showActions = false }) => {
    const isOverdue = doc.next_review_date && new Date(doc.next_review_date) < today;
    const daysUntil = doc.next_review_date ? differenceInDays(new Date(doc.next_review_date), today) : null;

    return (
      <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${isOverdue ? "bg-rose-100" : "bg-slate-100"}`}>
              <FileText className={`w-5 h-5 ${isOverdue ? "text-rose-600" : "text-slate-600"}`} />
            </div>
            <div>
              <p className="font-mono text-sm text-slate-500">{doc.document_number}</p>
              <p className="font-medium text-slate-900">{doc.title}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {doc.author_name || "Unknown"}
                </span>
                {doc.next_review_date && (
                  <span className={`flex items-center gap-1 ${isOverdue ? "text-rose-600 font-medium" : ""}`}>
                    <Calendar className="w-3 h-3" />
                    {isOverdue ? "Overdue" : `Due in ${daysUntil} days`}
                  </span>
                )}
              </div>
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleReject(doc)}>
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(doc)}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/60 backdrop-blur-xl border border-white/80 p-1 rounded-xl">
          <TabsTrigger value="pending" className="data-[state=active]:bg-white rounded-lg">
            Pending Approval
            {(pendingReview.length + pendingApproval.length) > 0 && (
              <Badge className="ml-2 bg-amber-100 text-amber-700">{pendingReview.length + pendingApproval.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="data-[state=active]:bg-white rounded-lg">
            Overdue Reviews
            {overdueReviews.length > 0 && (
              <Badge className="ml-2 bg-rose-100 text-rose-700">{overdueReviews.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-white rounded-lg">
            Upcoming Reviews
            {upcomingReviews.length > 0 && (
              <Badge className="ml-2 bg-blue-100 text-blue-700">{upcomingReviews.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="changes" className="data-[state=active]:bg-white rounded-lg">
            Change Requests
            {pendingCRs.length > 0 && (
              <Badge className="ml-2 bg-purple-100 text-purple-700">{pendingCRs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingReview.length === 0 && pendingApproval.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
              <p className="text-slate-500">No documents pending approval</p>
            </div>
          ) : (
            [...pendingReview, ...pendingApproval].map(doc => (
              <ReviewCard key={doc.id} doc={doc} showActions={true} />
            ))
          )}
        </TabsContent>

        <TabsContent value="overdue" className="mt-4 space-y-3">
          {overdueReviews.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
              <p className="text-slate-500">No overdue reviews</p>
            </div>
          ) : (
            overdueReviews.map(doc => (
              <ReviewCard key={doc.id} doc={doc} />
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcomingReviews.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No reviews due in the next 30 days</p>
            </div>
          ) : (
            upcomingReviews.map(doc => (
              <ReviewCard key={doc.id} doc={doc} />
            ))
          )}
        </TabsContent>

        <TabsContent value="changes" className="mt-4 space-y-3">
          {pendingCRs.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
              <p className="text-slate-500">No change requests pending review</p>
            </div>
          ) : (
            pendingCRs.map(cr => (
              <Card key={cr.id} className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ArrowRight className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-mono text-sm text-slate-500">{cr.request_number}</p>
                    <p className="font-medium text-slate-900">{cr.document_title || "New Document Request"}</p>
                    <p className="text-sm text-slate-600 mt-1">{cr.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>By {cr.requestor_name}</span>
                      <span>{format(new Date(cr.created_date), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}