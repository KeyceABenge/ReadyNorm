import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CheckCircle2, Clock, AlertTriangle, Calendar, 
  TrendingUp, ClipboardCheck, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

export default function CAPAEffectivenessTracker({ capas, user, onUpdate }) {
  const [selectedCapa, setSelectedCapa] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // CAPAs pending effectiveness check
  const pendingChecks = useMemo(() => {
    const now = new Date();
    return capas
      .filter(c => 
        c.status === "closed" &&
        c.effectiveness_status === "pending" &&
        c.next_effectiveness_check
      )
      .map(c => ({
        ...c,
        daysUntilCheck: differenceInDays(new Date(c.next_effectiveness_check), now),
        isOverdue: isBefore(new Date(c.next_effectiveness_check), now)
      }))
      .sort((a, b) => new Date(a.next_effectiveness_check) - new Date(b.next_effectiveness_check));
  }, [capas]);

  // Effectiveness metrics
  const metrics = useMemo(() => {
    const verified = capas.filter(c => c.effectiveness_status && c.effectiveness_status !== "pending");
    return {
      effective: verified.filter(c => c.effectiveness_status === "effective").length,
      partial: verified.filter(c => c.effectiveness_status === "partial").length,
      ineffective: verified.filter(c => c.effectiveness_status === "ineffective").length,
      pendingCount: pendingChecks.length,
      overdueCount: pendingChecks.filter(c => c.isOverdue).length
    };
  }, [capas, pendingChecks]);

  const openVerifyModal = (capa) => {
    setSelectedCapa(capa);
    setShowVerifyModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{metrics.effective}</div>
              <div className="text-xs text-slate-500">Effective</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold">{metrics.partial}</div>
              <div className="text-xs text-slate-500">Partially Effective</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <div className="text-2xl font-bold">{metrics.ineffective}</div>
              <div className="text-xs text-slate-500">Ineffective</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{metrics.pendingCount}</div>
              <div className="text-xs text-slate-500">Pending Checks</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-red-600" />
            <div>
              <div className="text-2xl font-bold">{metrics.overdueCount}</div>
              <div className="text-xs text-slate-500">Overdue Checks</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Effectiveness Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-500" />
            Pending Effectiveness Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingChecks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No effectiveness checks pending
            </p>
          ) : (
            <div className="space-y-3">
              {pendingChecks.map(capa => (
                <div 
                  key={capa.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    capa.isOverdue ? "bg-red-50 border-red-200" : "bg-slate-50 border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-slate-500">{capa.capa_id}</span>
                        {capa.isOverdue && (
                          <Badge className="bg-red-100 text-red-800 text-xs">Overdue</Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{capa.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Closed: {format(new Date(capa.closed_at), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-slate-500">
                        Check due: {format(new Date(capa.next_effectiveness_check), "MMM d, yyyy")}
                        {capa.isOverdue ? (
                          <span className="text-red-600 ml-1">
                            ({Math.abs(capa.daysUntilCheck)} days overdue)
                          </span>
                        ) : (
                          <span className="ml-1">
                            (in {capa.daysUntilCheck} days)
                          </span>
                        )}
                      </p>
                      {capa.effectiveness_criteria && (
                        <div className="mt-2 p-2 bg-white rounded text-xs">
                          <span className="font-medium">Success Criteria: </span>
                          {capa.effectiveness_criteria}
                        </div>
                      )}
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => openVerifyModal(capa)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Verify Effectiveness
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Effectiveness History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Effectiveness History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {capas
              .filter(c => c.effectiveness_status && c.effectiveness_status !== "pending")
              .sort((a, b) => new Date(b.effectiveness_verified_at) - new Date(a.effectiveness_verified_at))
              .slice(0, 10)
              .map(capa => (
                <div key={capa.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-mono text-xs text-slate-500 mr-2">{capa.capa_id}</span>
                    <span className="text-sm">{capa.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn(
                      capa.effectiveness_status === "effective" ? "bg-green-100 text-green-800" :
                      capa.effectiveness_status === "partial" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    )}>
                      {capa.effectiveness_status}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {capa.effectiveness_verified_at && format(new Date(capa.effectiveness_verified_at), "MMM d")}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Verification Modal */}
      {showVerifyModal && selectedCapa && (
        <EffectivenessVerifyModal
          capa={selectedCapa}
          user={user}
          onClose={() => {
            setShowVerifyModal(false);
            setSelectedCapa(null);
          }}
          onVerified={() => {
            setShowVerifyModal(false);
            setSelectedCapa(null);
            onUpdate?.();
          }}
        />
      )}
    </div>
  );
}

function EffectivenessVerifyModal({ capa, user, onClose, onVerified }) {
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!status) {
      toast.error("Please select effectiveness status");
      return;
    }

    setIsSubmitting(true);
    try {
      await CAPARepo.update(capa.id, {
        effectiveness_status: status,
        effectiveness_notes: notes,
        effectiveness_verified_by: user?.email,
        effectiveness_verified_at: new Date().toISOString()
      });

      // Create comment
      await CAPACommentRepo.create({
        organization_id: capa.organization_id,
        capa_id: capa.id,
        author_email: user?.email,
        author_name: user?.full_name,
        comment: `Effectiveness verified as "${status}". ${notes ? `Notes: ${notes}` : ""}`,
        comment_type: "system"
      });

      // If ineffective, potentially reopen
      if (status === "ineffective") {
        await CAPARepo.update(capa.id, {
          status: "reopened",
          reopened_at: new Date().toISOString(),
          reopened_by: user?.email,
          reopen_reason: "Effectiveness verification failed"
        });
      }

      toast.success("Effectiveness verified");
      onVerified();
    } catch (error) {
      toast.error("Failed to verify effectiveness");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Effectiveness</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="font-mono text-xs text-slate-500">{capa.capa_id}</span>
            <h4 className="font-medium">{capa.title}</h4>
          </div>

          {capa.effectiveness_criteria && (
            <div>
              <label className="text-sm font-medium">Success Criteria:</label>
              <p className="text-sm text-slate-600 mt-1">{capa.effectiveness_criteria}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Effectiveness Status *</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="effective">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Effective - Issue resolved
                  </span>
                </SelectItem>
                <SelectItem value="partial">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-600" />
                    Partially Effective - Some improvement
                  </span>
                </SelectItem>
                <SelectItem value="ineffective">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Ineffective - Issue persists
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Verification Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe how effectiveness was evaluated..."
              rows={3}
              className="mt-1"
            />
          </div>

          {status === "ineffective" && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              This CAPA will be automatically reopened for further investigation.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Verify Effectiveness"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}