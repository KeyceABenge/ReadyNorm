// @ts-nocheck
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function FeedbackTab({ anonymousFeedback = [], peerFeedback = [] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Employee Feedback</h2>
        <p className="text-slate-500 text-sm mt-1">View feedback submitted by employees</p>
      </div>

      <Tabs defaultValue="anonymous">
        <TabsList>
          <TabsTrigger value="anonymous">Anonymous Feedback ({anonymousFeedback.length})</TabsTrigger>
          <TabsTrigger value="peer">Peer Recognition ({peerFeedback.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="anonymous" className="space-y-4 mt-4">
          {anonymousFeedback.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No anonymous feedback yet</p>
              <p className="text-slate-400 text-sm mt-1">Employees can submit anonymous feedback from their dashboard</p>
            </div>
          ) : (
            anonymousFeedback.map(feedback => (
              <Card key={feedback.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        feedback.category === "recognition" ? "bg-emerald-100 text-emerald-800" :
                        feedback.category === "suggestion" ? "bg-blue-100 text-blue-800" :
                        feedback.category === "concern" ? "bg-amber-100 text-amber-800" :
                        "bg-slate-100 text-slate-800"
                      }>{feedback.category}</Badge>
                      {feedback.recipient_type === "specific_person" && feedback.recipient_name && (
                        <span className="text-sm text-slate-500">To: {feedback.recipient_name}</span>
                      )}
                      {feedback.recipient_type === "team" && (
                        <span className="text-sm text-slate-500">To: Entire Team</span>
                      )}
                    </div>
                    <p className="text-slate-900">{feedback.feedback}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      Submitted {format(parseISO(feedback.created_date), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="peer" className="space-y-4 mt-4">
          {peerFeedback.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No peer feedback yet</p>
              <p className="text-slate-400 text-sm mt-1">Employees can give recognition to their peers from their dashboard</p>
            </div>
          ) : (
            peerFeedback.map(feedback => (
              <Card key={feedback.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold flex-shrink-0">
                    {feedback.from_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{feedback.from_name || feedback.from_email}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium text-slate-900">{feedback.to_name || feedback.to_email}</span>
                    </div>
                    <Badge className={
                      feedback.category === "teamwork" ? "bg-blue-100 text-blue-800" :
                      feedback.category === "communication" ? "bg-purple-100 text-purple-800" :
                      feedback.category === "quality" ? "bg-emerald-100 text-emerald-800" :
                      feedback.category === "initiative" ? "bg-amber-100 text-amber-800" :
                      feedback.category === "helpfulness" ? "bg-pink-100 text-pink-800" :
                      "bg-slate-100 text-slate-800"
                    }>{feedback.category}</Badge>
                    <p className="text-slate-700 mt-2">{feedback.feedback}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {format(parseISO(feedback.created_date), "MMM d, yyyy 'at' h:mm a")}
                    </p>
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