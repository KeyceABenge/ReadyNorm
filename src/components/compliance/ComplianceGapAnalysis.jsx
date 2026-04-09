import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, XCircle, Clock, FileText, CheckCircle2, TrendingUp, Link
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ComplianceGapAnalysis({ 
  frameworks, 
  requirements, 
  evidence, 
  tasks, 
  trainings 
}) {
  const analysis = useMemo(() => {
    const gaps = [];
    const byCategory = {};
    const byFramework = {};

    requirements.forEach(req => {
      const framework = frameworks.find(f => f.id === req.framework_id);
      const frameworkName = framework?.name || "Unknown";
      
      // Initialize framework tracking
      if (!byFramework[frameworkName]) {
        byFramework[frameworkName] = { total: 0, compliant: 0, gaps: 0 };
      }
      byFramework[frameworkName].total++;
      
      // Initialize category tracking
      const category = req.category || "other";
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, compliant: 0, gaps: 0 };
      }
      byCategory[category].total++;

      if (req.status === "compliant") {
        byFramework[frameworkName].compliant++;
        byCategory[category].compliant++;
        return;
      }

      // This is a gap
      byFramework[frameworkName].gaps++;
      byCategory[category].gaps++;

      const reqEvidence = evidence.filter(e => e.requirement_id === req.id);
      const linkedTasks = tasks.filter(t => req.linked_task_ids?.includes(t.id));
      const linkedTrainings = trainings.filter(t => req.linked_training_ids?.includes(t.id));

      // Analyze the gap
      const gapReasons = [];
      
      if (reqEvidence.length === 0) {
        gapReasons.push("No evidence collected");
      }
      
      if (req.evidence_frequency && reqEvidence.length > 0) {
        // Check if evidence is current
        const latestEvidence = reqEvidence.sort((a, b) => 
          new Date(b.evidence_date) - new Date(a.evidence_date)
        )[0];
        const daysSince = Math.floor((new Date() - new Date(latestEvidence.evidence_date)) / (1000 * 60 * 60 * 24));
        
        const maxDays = {
          daily: 1, weekly: 7, monthly: 30, quarterly: 90, annual: 365
        }[req.evidence_frequency] || 30;
        
        if (daysSince > maxDays) {
          gapReasons.push(`Evidence is ${daysSince} days old (requires ${req.evidence_frequency})`);
        }
      }

      if (linkedTasks.length === 0 && req.linked_entity_types?.includes("Task")) {
        gapReasons.push("No tasks linked to this requirement");
      }

      if (req.status === "non_compliant" && !req.corrective_action) {
        gapReasons.push("No corrective action defined");
      }

      gaps.push({
        requirement: req,
        framework: frameworkName,
        reasons: gapReasons,
        evidenceCount: reqEvidence.length,
        linkedTasksCount: linkedTasks.length,
        priority: req.criticality === "critical" ? 1 : req.criticality === "major" ? 2 : 3
      });
    });

    // Sort by priority
    gaps.sort((a, b) => a.priority - b.priority);

    return { gaps, byCategory, byFramework };
  }, [frameworks, requirements, evidence, tasks, trainings]);

  const criticalGaps = analysis.gaps.filter(g => g.requirement.criticality === "critical");
  const majorGaps = analysis.gaps.filter(g => g.requirement.criticality === "major");
  const minorGaps = analysis.gaps.filter(g => g.requirement.criticality === "minor");

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={criticalGaps.length > 0 ? "border-rose-200 bg-rose-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", criticalGaps.length > 0 ? "bg-rose-100" : "bg-slate-100")}>
                <XCircle className={cn("w-5 h-5", criticalGaps.length > 0 ? "text-rose-600" : "text-slate-400")} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Critical Gaps</p>
                <p className={cn("text-2xl font-bold", criticalGaps.length > 0 ? "text-rose-600" : "text-slate-900")}>
                  {criticalGaps.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Major Gaps</p>
                <p className="text-2xl font-bold text-amber-600">{majorGaps.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Minor Gaps</p>
                <p className="text-2xl font-bold text-slate-600">{minorGaps.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Compliance Rate</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {requirements.length > 0 
                    ? Math.round((requirements.filter(r => r.status === "compliant").length / requirements.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compliance by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analysis.byCategory)
              .sort((a, b) => (a[1].compliant / a[1].total) - (b[1].compliant / b[1].total))
              .map(([category, stats]) => {
                const rate = Math.round((stats.compliant / stats.total) * 100);
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{category.replace("_", " ")}</span>
                      <span className="text-sm text-slate-500">
                        {stats.compliant}/{stats.total} ({rate}%)
                      </span>
                    </div>
                    <Progress 
                      value={rate} 
                      className={cn("h-2", rate < 50 && "[&>div]:bg-rose-500", rate >= 50 && rate < 80 && "[&>div]:bg-amber-500")}
                    />
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Compliance by Framework */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compliance by Framework</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analysis.byFramework).map(([name, stats]) => {
              const rate = Math.round((stats.compliant / stats.total) * 100);
              return (
                <div key={name} className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">{name}</h4>
                  <div className="flex items-center gap-3 mb-2">
                    <Progress value={rate} className="flex-1 h-2" />
                    <span className="text-sm font-semibold">{rate}%</span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      {stats.compliant} compliant
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-500" />
                      {stats.gaps} gaps
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gap Details */}
      {analysis.gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Gap Details ({analysis.gaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.gaps.slice(0, 20).map((gap, i) => (
                <div 
                  key={gap.requirement.id}
                  className={cn(
                    "border rounded-lg p-4",
                    gap.requirement.criticality === "critical" && "border-rose-200 bg-rose-50",
                    gap.requirement.criticality === "major" && "border-amber-200 bg-amber-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-slate-500">{gap.requirement.section}</span>
                        <Badge className={cn(
                          "text-xs",
                          gap.requirement.criticality === "critical" && "bg-rose-600",
                          gap.requirement.criticality === "major" && "bg-amber-500"
                        )}>
                          {gap.requirement.criticality}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{gap.framework}</Badge>
                      </div>
                      <h4 className="font-medium text-slate-900">{gap.requirement.title}</h4>
                      
                      {gap.reasons.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {gap.reasons.map((reason, j) => (
                            <p key={j} className="text-sm text-slate-600 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {reason}
                            </p>
                          ))}
                        </div>
                      )}
                      
                      {gap.requirement.corrective_action && (
                        <div className="mt-2 bg-white/50 rounded p-2">
                          <p className="text-xs font-medium text-slate-500">Corrective Action:</p>
                          <p className="text-sm text-slate-700">{gap.requirement.corrective_action}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right text-xs text-slate-500 space-y-1">
                      <p className="flex items-center gap-1 justify-end">
                        <FileText className="w-3 h-3" />
                        {gap.evidenceCount} evidence
                      </p>
                      <p className="flex items-center gap-1 justify-end">
                        <Link className="w-3 h-3" />
                        {gap.linkedTasksCount} tasks
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {analysis.gaps.length > 20 && (
                <p className="text-sm text-slate-500 text-center py-2">
                  +{analysis.gaps.length - 20} more gaps
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}