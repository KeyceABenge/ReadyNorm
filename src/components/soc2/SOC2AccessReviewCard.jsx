import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, CheckCircle2, AlertCircle, Play } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";

const statusConfig = {
  pending: { color: "bg-slate-100 text-slate-800", icon: Clock },
  in_progress: { color: "bg-blue-100 text-blue-800", icon: Play },
  completed: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  overdue: { color: "bg-red-100 text-red-800", icon: AlertCircle }
};

const reviewTypeLabels = {
  user_access: "User Access Review",
  privileged_access: "Privileged Access Review",
  service_accounts: "Service Accounts Review",
  terminated_users: "Terminated Users Review",
  permission_changes: "Permission Changes Review"
};

export default function SOC2AccessReviewCard({ review, onStart, onView }) {
  const isOverdue = review.status !== 'completed' && review.due_date && isPast(new Date(review.due_date));
  const effectiveStatus = isOverdue ? 'overdue' : review.status;
  const config = statusConfig[effectiveStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  const daysUntilDue = review.due_date 
    ? differenceInDays(new Date(review.due_date), new Date())
    : null;

  return (
    <Card className={`border-l-4 ${effectiveStatus === 'completed' ? 'border-l-green-500' : effectiveStatus === 'overdue' ? 'border-l-red-500' : 'border-l-blue-500'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={config.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {effectiveStatus.replace("_", " ")}
              </Badge>
              {daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= 7 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <h3 className="font-semibold text-slate-900 mb-1">
              {reviewTypeLabels[review.review_type] || review.review_type}
            </h3>

            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(review.review_period_start), "MMM d")} - {format(new Date(review.review_period_end), "MMM d, yyyy")}
                </span>
              </div>
              {review.users_reviewed?.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{review.users_reviewed.length} users reviewed</span>
                </div>
              )}
            </div>

            {review.findings?.length > 0 && (
              <div className="mt-2">
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  {review.findings.length} finding{review.findings.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {review.status === 'pending' && (
              <Button size="sm" onClick={() => onStart?.(review)}>
                Start Review
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onView?.(review)}>
              {review.status === 'completed' ? 'View' : 'Continue'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}