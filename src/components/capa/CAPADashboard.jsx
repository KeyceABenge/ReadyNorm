import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, Clock, CheckCircle2, TrendingUp, 
  User, Calendar, AlertCircle, Activity,
  BarChart3, Send
} from "lucide-react";
import { format, differenceInDays, addDays, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

const severityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800"
};

const statusColors = {
  draft: "bg-slate-100 text-slate-800",
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  pending_verification: "bg-purple-100 text-purple-800",
  closed: "bg-green-100 text-green-800",
  reopened: "bg-red-100 text-red-800"
};

export default function CAPADashboard({ capas, actions, user, onCapaClick }) {
  const stats = useMemo(() => {
    const now = new Date();
    const openCapas = capas.filter(c => !["closed", "draft"].includes(c.status));
    const overdueActions = actions.filter(a => 
      a.status !== "completed" && a.status !== "verified" && 
      a.due_date && isBefore(new Date(a.due_date), now)
    );
    
    const overdueCapas = openCapas.filter(c => {
      const capaActions = actions.filter(a => a.capa_id === c.id);
      return capaActions.some(a => 
        a.status !== "completed" && a.status !== "verified" && 
        a.due_date && isBefore(new Date(a.due_date), now)
      );
    });

    const dueIn7 = openCapas.filter(c => {
      const capaActions = actions.filter(a => a.capa_id === c.id);
      return capaActions.some(a => {
        if (a.status === "completed" || a.status === "verified") return false;
        const due = new Date(a.due_date);
        return isAfter(due, now) && isBefore(due, addDays(now, 7));
      });
    });

    const dueIn14 = openCapas.filter(c => {
      const capaActions = actions.filter(a => a.capa_id === c.id);
      return capaActions.some(a => {
        if (a.status === "completed" || a.status === "verified") return false;
        const due = new Date(a.due_date);
        return isAfter(due, now) && isBefore(due, addDays(now, 14));
      });
    });

    const avgDaysOpen = openCapas.length > 0 
      ? Math.round(openCapas.reduce((sum, c) => sum + differenceInDays(now, new Date(c.created_date)), 0) / openCapas.length)
      : 0;

    const recurrences = capas.filter(c => c.is_recurrence);
    
    const effectivenessFollowups = capas.filter(c => 
      c.status === "closed" && 
      c.next_effectiveness_check && 
      isBefore(new Date(c.next_effectiveness_check), addDays(now, 14))
    );

    return {
      open: openCapas.length,
      overdue: overdueCapas.length,
      dueIn7: dueIn7.length,
      dueIn14: dueIn14.length,
      avgDaysOpen,
      recurrences: recurrences.length,
      effectivenessFollowups: effectivenessFollowups.length,
      overdueActions: overdueActions.length
    };
  }, [capas, actions]);

  const atRiskCapas = useMemo(() => {
    const now = new Date();
    return capas
      .filter(c => !["closed", "draft"].includes(c.status))
      .map(c => {
        const capaActions = actions.filter(a => a.capa_id === c.id);
        const overdueActions = capaActions.filter(a => 
          a.status !== "completed" && a.status !== "verified" &&
          a.due_date && isBefore(new Date(a.due_date), now)
        );
        const missingRootCause = !c.root_cause_statement;
        const noEffectivenessPlan = !c.effectiveness_criteria;
        const nextDueAction = capaActions
          .filter(a => a.status !== "completed" && a.status !== "verified")
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

        const riskScore = 
          (overdueActions.length * 30) + 
          (missingRootCause ? 20 : 0) + 
          (noEffectivenessPlan ? 15 : 0) + 
          (c.is_recurrence ? 25 : 0) +
          (c.severity === "critical" ? 20 : c.severity === "high" ? 10 : 0);

        return {
          ...c,
          riskScore,
          overdueActionsCount: overdueActions.length,
          missingRootCause,
          noEffectivenessPlan,
          nextDueAction,
          daysOpen: differenceInDays(now, new Date(c.created_date))
        };
      })
      .filter(c => c.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  }, [capas, actions]);

  const myActions = useMemo(() => {
    if (!user?.email) return [];
    return actions
      .filter(a => 
        a.owner_email === user.email && 
        a.status !== "completed" && 
        a.status !== "verified"
      )
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5);
  }, [actions, user]);

  const capasByCategory = useMemo(() => {
    const counts = {};
    capas.forEach(c => {
      const cat = c.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [capas]);

  const capasBySource = useMemo(() => {
    const counts = {};
    capas.forEach(c => {
      const src = c.source || "other";
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [capas]);

  return (
    <div className="space-y-6">
      {/* Health Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard icon={AlertTriangle} label="Open CAPAs" value={stats.open} color="text-amber-600" />
        <StatCard icon={AlertCircle} label="Overdue" value={stats.overdue} color="text-red-600" />
        <StatCard icon={Clock} label="Due in 7 Days" value={stats.dueIn7} color="text-orange-600" />
        <StatCard icon={Calendar} label="Due in 14 Days" value={stats.dueIn14} color="text-yellow-600" />
        <StatCard icon={Activity} label="Avg Days Open" value={stats.avgDaysOpen} color="text-blue-600" />
        <StatCard icon={TrendingUp} label="Recurrences" value={stats.recurrences} color="text-purple-600" />
        <StatCard icon={CheckCircle2} label="Effectiveness Due" value={stats.effectivenessFollowups} color="text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* At-Risk CAPAs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              At-Risk CAPAs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskCapas.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No at-risk CAPAs</p>
            ) : (
              <div className="space-y-3">
                {atRiskCapas.map(capa => (
                  <div 
                    key={capa.id}
                    onClick={() => onCapaClick(capa)}
                    className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-mono text-slate-500">{capa.capa_id}</span>
                        <h4 className="font-medium text-sm">{capa.title}</h4>
                      </div>
                      <Badge className={severityColors[capa.severity]}>{capa.severity}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {capa.overdueActionsCount > 0 && (
                        <span className="text-red-600">⚠️ {capa.overdueActionsCount} overdue actions</span>
                      )}
                      {capa.missingRootCause && (
                        <span className="text-orange-600">📋 Missing root cause</span>
                      )}
                      {capa.noEffectivenessPlan && (
                        <span className="text-yellow-600">📊 No effectiveness plan</span>
                      )}
                      {capa.is_recurrence && (
                        <span className="text-purple-600">🔄 Recurring issue</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                      <span>{capa.owner_name || "Unassigned"}</span>
                      <span>{capa.daysOpen} days open</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Action Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              My Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myActions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No actions assigned to you</p>
            ) : (
              <div className="space-y-3">
                {myActions.map(action => {
                  const isOverdue = action.due_date && isBefore(new Date(action.due_date), new Date());
                  const capa = capas.find(c => c.id === action.capa_id);
                  return (
                    <div 
                      key={action.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        isOverdue ? "bg-red-50 border-red-200" : "bg-slate-50 border-transparent"
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-sm">{action.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {action.action_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        CAPA: {capa?.capa_id || action.capa_number}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs",
                          isOverdue ? "text-red-600 font-medium" : "text-slate-500"
                        )}>
                          Due: {action.due_date ? format(new Date(action.due_date), "MMM d, yyyy") : "No date"}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Send className="w-3 h-3 mr-1" />
                          Remind
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends by Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              CAPAs by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {capasByCategory.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{cat}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${(count / capas.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CAPAs by Source */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              CAPAs by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {capasBySource.map(([src, count]) => (
                <div key={src} className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="text-xs text-slate-500 capitalize">{src.replace("_", " ")}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Icon className={cn("w-5 h-5", color)} />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      </div>
    </Card>
  );
}