// @ts-nocheck
import { useState } from "react";
import { AccessRequestRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserCheck, UserX, Clock, CheckCircle2, XCircle, Users, 
  ChevronDown, ChevronUp, Mail, Loader2 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function AccessRequestsPanel({ organizationId, user, alwaysShow = false }) {
  const [showHistory, setShowHistory] = useState(false);
  const [denyNotes, setDenyNotes] = useState({});
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["access_requests", organizationId],
    queryFn: () => AccessRequestRepo.filter({ organization_id: organizationId }, "-created_date"),
    enabled: !!organizationId,
    refetchInterval: 30000 // Poll every 30s for new requests
  });

  const pendingRequests = requests.filter(r => r.status === "pending");
  const reviewedRequests = requests.filter(r => r.status !== "pending");

  const approveMutation = useMutation({
    mutationFn: (requestId) => AccessRequestRepo.update(requestId, {
      status: "approved",
      reviewed_by: user?.email,
      reviewed_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access_requests"] });
      toast.success("Access approved");
    }
  });

  const denyMutation = useMutation({
    mutationFn: ({ requestId, notes }) => AccessRequestRepo.update(requestId, {
      status: "denied",
      reviewed_by: user?.email,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || ""
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access_requests"] });
      toast.success("Access denied");
    }
  });

  if (isLoading) return null;
  if (!alwaysShow && pendingRequests.length === 0 && !showHistory) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Access Requests</h3>
              {pendingRequests.length > 0 && (
                <p className="text-xs text-amber-700">{pendingRequests.length} pending</p>
              )}
            </div>
          </div>
          {reviewedRequests.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-slate-500 h-7"
            >
              History
              {showHistory ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          )}
        </div>

        {/* Pending Requests */}
        <AnimatePresence>
          {pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map(request => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-lg p-3 border border-amber-100"
                >
                  <div className="flex items-start justify-between gap-3">
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                       <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                       <span className="text-sm font-medium text-slate-900 truncate">
                         {request.requester_name}
                       </span>
                       {request.requested_role === "manager" && (
                         <Badge className="bg-slate-800 text-white text-[10px] px-1.5 py-0">
                           Manager
                         </Badge>
                       )}
                     </div>
                     <div className="flex items-center gap-1.5 ml-5.5">
                       <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                       <span className="text-xs text-slate-500 truncate">{request.requester_email}</span>
                     </div>
                     <p className="text-xs text-slate-400 ml-5.5 mt-1">
                       {request.created_date ? format(parseISO(request.created_date), "MMM d, h:mm a") : ""}
                     </p>
                   </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(request.id)}
                        disabled={approveMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 h-8 px-3 text-xs"
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => denyMutation.mutate({ requestId: request.id, notes: denyNotes[request.id] || "" })}
                        disabled={denyMutation.isPending}
                        className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3 text-xs"
                      >
                        {denyMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <UserX className="w-3 h-3 mr-1" />
                            Deny
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">No pending requests</p>
          )}
        </AnimatePresence>

        {/* History */}
        {showHistory && reviewedRequests.length > 0 && (
          <div className="mt-4 pt-4 border-t border-amber-200">
            <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Review History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {reviewedRequests.slice(0, 20).map(request => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-white/60"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {request.status === "approved" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-xs text-slate-700 truncate">{request.requester_name}</span>
                    {request.requested_role === "manager" && (
                      <Badge className="bg-slate-800 text-white text-[9px] px-1 py-0">Mgr</Badge>
                    )}
                    <span className="text-xs text-slate-400 truncate">{request.requester_email}</span>
                  </div>
                  <Badge 
                    className={cn(
                      "text-[10px] flex-shrink-0",
                      request.status === "approved" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}