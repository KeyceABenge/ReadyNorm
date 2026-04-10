import { useState, useMemo } from "react";

import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Loader2, Lightbulb
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { PestRiskPredictionRepo } from "@/lib/adapters/database";

const RISK_COLORS = {
  low: "#22c55e",
  moderate: "#eab308",
  elevated: "#f97316",
  high: "#ef4444",
  critical: "#dc2626"
};

export default function PestRiskAnalysis({ 
  organizationId, riskPredictions, findings, devices, tasks, drainRecords, 
  areas, productionLines, onRefresh 
}) {
  const [generating, setGenerating] = useState(false);

  // Generate new risk analysis
  const generateAnalysisMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);

      // Gather data for analysis
      const thirtyDaysAgo = subDays(new Date(), 30);
      const recentFindings = findings.filter(f => new Date(f.service_date) >= thirtyDaysAgo);
      
      // Calculate sanitation metrics
      const completedTasks = tasks.filter(t => 
        (t.status === "completed" || t.status === "verified") &&
        t.completed_at && new Date(t.completed_at) >= thirtyDaysAgo
      );
      const totalTasks = tasks.filter(t => t.due_date && new Date(t.due_date) >= thirtyDaysAgo);
      const mssCompletionRate = totalTasks.length > 0 
        ? Math.round((completedTasks.length / totalTasks.length) * 100) 
        : 100;

      // Drain cleaning metrics
      const recentDrainCleanings = drainRecords.filter(r => 
        r.cleaned_at && new Date(r.cleaned_at) >= thirtyDaysAgo
      );

      // Build summary for AI
      const findingsSummary = {};
      recentFindings.forEach(f => {
        const key = f.pest_type || "unknown";
        if (!findingsSummary[key]) findingsSummary[key] = { count: 0, totalPests: 0, exceedances: 0 };
        findingsSummary[key].count++;
        findingsSummary[key].totalPests += f.count || 0;
        if (f.threshold_exceeded) findingsSummary[key].exceedances++;
      });

      // Areas with findings
      const areaFindings = {};
      recentFindings.forEach(f => {
        if (f.area_name) {
          if (!areaFindings[f.area_name]) areaFindings[f.area_name] = 0;
          areaFindings[f.area_name] += f.count || 1;
        }
      });

      const aiResult = await invokeLLM({
        prompt: `You are a pest control analyst for a food manufacturing facility. Analyze the following data and provide a risk assessment.

PEST FINDINGS (Last 30 Days):
${Object.entries(findingsSummary).map(([type, data]) => 
  `- ${type}: ${data.count} findings, ${data.totalPests} total count, ${data.exceedances} threshold exceedances`
).join("\n")}

AREA ACTIVITY:
${Object.entries(areaFindings).map(([area, count]) => `- ${area}: ${count} pests`).join("\n") || "No area-specific data"}

SANITATION METRICS:
- MSS Completion Rate: ${mssCompletionRate}%
- Drain Cleanings (30d): ${recentDrainCleanings.length}
- Active Pest Devices: ${devices.filter(d => d.status === "active").length}

Provide:
1. Overall risk score (0-100)
2. Risk level (low, moderate, elevated, high, critical)
3. Trend direction (improving, stable, worsening)
4. Top 3 contributing factors with weights
5. Top 3 recommended preventive actions with priority
6. Brief analysis summary (2-3 sentences)
7. Confidence score in this assessment (0-100)

Consider correlations between sanitation performance and pest activity.`,
        response_json_schema: {
          type: "object",
          properties: {
            risk_score: { type: "number" },
            risk_level: { type: "string" },
            trend_direction: { type: "string" },
            contributing_factors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factor: { type: "string" },
                  weight: { type: "number" },
                  details: { type: "string" }
                }
              }
            },
            recommended_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  priority: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            analysis_summary: { type: "string" },
            confidence_score: { type: "number" }
          }
        }
      });

      // Save prediction
      await PestRiskPredictionRepo.create({
        organization_id: organizationId,
        prediction_date: format(new Date(), "yyyy-MM-dd"),
        risk_area_type: "facility",
        risk_score: aiResult.risk_score,
        risk_level: aiResult.risk_level,
        contributing_factors: aiResult.contributing_factors,
        sanitation_correlation: {
          mss_completion_rate: mssCompletionRate,
          drain_issues: 0,
          moisture_indicators: 0,
          housekeeping_score: mssCompletionRate
        },
        recommended_actions: aiResult.recommended_actions,
        ai_analysis: aiResult.analysis_summary,
        trend_direction: aiResult.trend_direction,
        confidence_score: aiResult.confidence_score
      });

      return aiResult;
    },
    onSuccess: () => {
      toast.success("Risk analysis generated");
      onRefresh();
    },
    onError: (error) => {
      toast.error("Failed to generate analysis: " + error.message);
    },
    onSettled: () => {
      setGenerating(false);
    }
  });

  const latestRisk = riskPredictions[0];

  // Risk trend data
  const trendData = useMemo(() => {
    return riskPredictions.slice(0, 10).reverse().map(p => ({
      date: format(parseISO(p.prediction_date), "MMM d"),
      score: p.risk_score
    }));
  }, [riskPredictions]);

  // Correlation radar data
  const correlationData = useMemo(() => {
    if (!latestRisk?.sanitation_correlation) return [];
    const corr = latestRisk.sanitation_correlation;
    return [
      { subject: "MSS Completion", A: corr.mss_completion_rate || 0, fullMark: 100 },
      { subject: "Drain Maintenance", A: 100 - (corr.drain_issues || 0) * 10, fullMark: 100 },
      { subject: "Moisture Control", A: 100 - (corr.moisture_indicators || 0) * 10, fullMark: 100 },
      { subject: "Housekeeping", A: corr.housekeeping_score || 0, fullMark: 100 }
    ];
  }, [latestRisk]);

  return (
    <div className="space-y-6">
      {/* Header with Generate Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">AI Risk Analysis</h2>
          <p className="text-sm text-slate-500">
            Correlates pest activity with sanitation performance
          </p>
        </div>
        <Button onClick={() => generateAnalysisMutation.mutate()} disabled={generating}>
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
          ) : (
            <><Brain className="w-4 h-4 mr-2" /> Generate Analysis</>
          )}
        </Button>
      </div>

      {!latestRisk ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Risk Analysis Yet</h3>
            <p className="text-slate-500 mb-4">
              Generate an AI-powered risk analysis to identify trends and correlations
            </p>
            <Button onClick={() => generateAnalysisMutation.mutate()} disabled={generating}>
              {generating ? "Analyzing..." : "Generate First Analysis"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Current Risk Overview */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Current Risk Assessment</span>
                  <span className="text-xs text-slate-400">
                    {format(parseISO(latestRisk.prediction_date), "MMM d, yyyy")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-4">
                  <div className="text-center">
                    <div 
                      className="text-5xl font-bold"
                      style={{ color: RISK_COLORS[latestRisk.risk_level] }}
                    >
                      {latestRisk.risk_score}
                    </div>
                    <Badge 
                      className="mt-1"
                      style={{ 
                        backgroundColor: `${RISK_COLORS[latestRisk.risk_level]}20`,
                        color: RISK_COLORS[latestRisk.risk_level]
                      }}
                    >
                      {latestRisk.risk_level.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <Progress 
                      value={latestRisk.risk_score} 
                      className="h-4 mb-2"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Trend:</span>
                        <Badge className={
                          latestRisk.trend_direction === "improving" ? "bg-emerald-100 text-emerald-800" :
                          latestRisk.trend_direction === "worsening" ? "bg-red-100 text-red-800" :
                          "bg-slate-100 text-slate-800"
                        }>
                          {latestRisk.trend_direction === "improving" && <TrendingDown className="w-3 h-3 mr-1" />}
                          {latestRisk.trend_direction === "worsening" && <TrendingUp className="w-3 h-3 mr-1" />}
                          {latestRisk.trend_direction === "stable" && <Minus className="w-3 h-3 mr-1" />}
                          {latestRisk.trend_direction}
                        </Badge>
                      </div>
                      <span className="text-slate-500">
                        Confidence: {latestRisk.confidence_score}%
                      </span>
                    </div>
                  </div>
                </div>

                {latestRisk.ai_analysis && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-sm text-slate-700">{latestRisk.ai_analysis}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sanitation Correlation Radar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sanitation Correlation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={correlationData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" fontSize={10} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
                      <Radar
                        name="Score"
                        dataKey="A"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contributing Factors & Recommendations */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Contributing Factors */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Contributing Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestRisk.contributing_factors?.length > 0 ? (
                  <div className="space-y-3">
                    {latestRisk.contributing_factors.map((factor, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{factor.factor}</span>
                          <Badge variant="outline">{factor.weight}%</Badge>
                        </div>
                        <p className="text-sm text-slate-600">{factor.details}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No factors identified</p>
                )}
              </CardContent>
            </Card>

            {/* Recommended Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestRisk.recommended_actions?.length > 0 ? (
                  <div className="space-y-3">
                    {latestRisk.recommended_actions.map((action, i) => (
                      <div key={i} className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-emerald-900">{action.action}</span>
                          <Badge className={
                            action.priority === "high" ? "bg-red-100 text-red-800" :
                            action.priority === "medium" ? "bg-amber-100 text-amber-800" :
                            "bg-blue-100 text-blue-800"
                          }>
                            {action.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-emerald-700">{action.impact}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No actions recommended</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Risk Trend Chart */}
          {trendData.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Risk Score Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <Bar 
                        dataKey="score" 
                        name="Risk Score" 
                        fill="#8b5cf6" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historical Predictions */}
          {riskPredictions.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analysis History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {riskPredictions.slice(0, 5).map(prediction => (
                    <div 
                      key={prediction.id}
                      className="p-3 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white"
                          style={{ backgroundColor: RISK_COLORS[prediction.risk_level] }}
                        >
                          {prediction.risk_score}
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(parseISO(prediction.prediction_date), "MMMM d, yyyy")}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="outline" className="text-xs">
                              {prediction.risk_level}
                            </Badge>
                            <span>•</span>
                            <span>{prediction.trend_direction}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-slate-400">
                        {prediction.confidence_score}% confidence
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}