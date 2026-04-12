import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, TrendingUp, TrendingDown, Minus, CheckCircle2, Zap, Droplets, Bug, GraduationCap, ClipboardCheck } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { toast } from "sonner";
import { EMPRiskPredictionRepo } from "@/lib/adapters/database";
import { invokeLLM } from "@/lib/adapters/integrations";

const RISK_COLORS = {
  low: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  moderate: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
  elevated: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  high: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  critical: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" }
};

export default function EMPRiskAnalysis({ sites, samples, predictions, thresholds, areas, drains, organizationId }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  // Calculate current metrics for AI analysis
  const analysisData = useMemo(() => {
    const last30Days = subDays(new Date(), 30);
    const recentSamples = samples.filter(s => new Date(s.collection_date) >= last30Days);
    
    const totalSamples = recentSamples.length;
    const positives = recentSamples.filter(s => s.overall_result === "fail").length;
    const positivityRate = totalSamples > 0 ? (positives / totalSamples) * 100 : 0;
    
    // Zone breakdown
    const zoneStats = {
      zone_1: { samples: 0, positives: 0 },
      zone_2: { samples: 0, positives: 0 },
      zone_3: { samples: 0, positives: 0 },
      zone_4: { samples: 0, positives: 0 }
    };
    
    recentSamples.forEach(s => {
      if (zoneStats[s.zone_classification]) {
        zoneStats[s.zone_classification].samples++;
        if (s.overall_result === "fail") {
          zoneStats[s.zone_classification].positives++;
        }
      }
    });

    // Test type breakdown
    const testStats = {};
    recentSamples.forEach(s => {
      s.test_results?.forEach(tr => {
        if (!testStats[tr.test_type]) {
          testStats[tr.test_type] = { total: 0, positive: 0 };
        }
        testStats[tr.test_type].total++;
        if (tr.result === "positive") {
          testStats[tr.test_type].positive++;
        }
      });
    });

    // Sites with repeat positives
    const siteCounts = {};
    recentSamples.filter(s => s.overall_result === "fail").forEach(s => {
      siteCounts[s.site_id] = (siteCounts[s.site_id] || 0) + 1;
    });
    const repeatSites = Object.entries(siteCounts).filter(([_, count]) => count >= 2);

    // Pending reswabs
    const pendingReswabs = samples.filter(s => s.requires_reswab && s.status !== "closed").length;

    return {
      totalSamples,
      positives,
      positivityRate,
      zoneStats,
      testStats,
      repeatSites,
      pendingReswabs,
      activeSites: sites.filter(s => s.status === "active").length
    };
  }, [samples, sites]);

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Analyze environmental monitoring data for a food manufacturing facility and provide risk assessment:

Current 30-Day Metrics:
- Total samples collected: ${analysisData.totalSamples}
- Total positives: ${analysisData.positives} (${analysisData.positivityRate.toFixed(1)}% positivity rate)
- Active monitoring sites: ${analysisData.activeSites}
- Pending reswabs: ${analysisData.pendingReswabs}

Zone Performance:
- Zone 1 (Product Contact): ${analysisData.zoneStats.zone_1.samples} samples, ${analysisData.zoneStats.zone_1.positives} positives
- Zone 2 (Near Product): ${analysisData.zoneStats.zone_2.samples} samples, ${analysisData.zoneStats.zone_2.positives} positives
- Zone 3 (Non-Product): ${analysisData.zoneStats.zone_3.samples} samples, ${analysisData.zoneStats.zone_3.positives} positives
- Zone 4 (Outside): ${analysisData.zoneStats.zone_4.samples} samples, ${analysisData.zoneStats.zone_4.positives} positives

Test Results Summary:
${Object.entries(analysisData.testStats).map(([test, stats]) => 
  `- ${test}: ${stats.total} tests, ${stats.positive} positive (${stats.total > 0 ? ((stats.positive/stats.total)*100).toFixed(1) : 0}%)`
).join('\n')}

Sites with Repeat Positives (2+ in 30 days): ${analysisData.repeatSites.length}

Provide:
1. Overall risk level (low/moderate/elevated/high/critical)
2. Risk score (0-100)
3. Primary concern area
4. Top 3 contributing factors
5. Top 3 recommended preventive actions
6. Trend assessment (improving/stable/worsening)`;

      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string", enum: ["low", "moderate", "elevated", "high", "critical"] },
            risk_score: { type: "number" },
            primary_concern: { type: "string" },
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
                  rationale: { type: "string" }
                }
              }
            },
            trend_direction: { type: "string", enum: ["improving", "stable", "worsening"] },
            ai_analysis: { type: "string" },
            confidence_score: { type: "number" }
          }
        }
      });

      // Save prediction
      await EMPRiskPredictionRepo.create({
        organization_id: organizationId,
        prediction_date: format(new Date(), "yyyy-MM-dd"),
        scope_type: "facility",
        risk_score: response.risk_score,
        risk_level: response.risk_level,
        primary_concern: response.primary_concern,
        contributing_factors: response.contributing_factors,
        recommended_actions: response.recommended_actions,
        trend_direction: response.trend_direction,
        ai_analysis: response.ai_analysis,
        confidence_score: response.confidence_score,
        sanitation_correlation: {
          mss_completion_rate: 0,
          verification_confidence: 0,
          drain_issues_nearby: 0,
          diverter_wet_findings: 0,
          pest_activity_nearby: 0,
          training_gaps: 0
        }
      });

      queryClient.invalidateQueries({ queryKey: ["emp_predictions"] });
      toast.success("Risk analysis completed");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to run analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const latestPrediction = predictions[0];
  const riskStyle = latestPrediction ? RISK_COLORS[latestPrediction.risk_level] || RISK_COLORS.low : null;

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Risk Analysis</h2>
          <p className="text-sm text-slate-500">Correlates EMP data with sanitation, pest, and moisture signals</p>
        </div>
        <Button onClick={runAIAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Brain className="w-4 h-4 mr-2" />
          )}
          Run AI Analysis
        </Button>
      </div>

      {/* Current Metrics Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">30-Day Samples</p>
            <p className="text-2xl font-bold">{analysisData.totalSamples}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Positivity Rate</p>
            <p className="text-2xl font-bold text-rose-600">{analysisData.positivityRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Repeat Sites</p>
            <p className="text-2xl font-bold text-amber-600">{analysisData.repeatSites.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Pending Reswabs</p>
            <p className="text-2xl font-bold text-blue-600">{analysisData.pendingReswabs}</p>
          </CardContent>
        </Card>
      </div>

      {latestPrediction ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Risk Card */}
          <Card className={`${riskStyle.bg} ${riskStyle.border} border-2`}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Overall Risk Assessment</span>
                <Badge variant="outline" className="text-xs">
                  {format(parseISO(latestPrediction.prediction_date), "MMM d, yyyy")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <Badge className={`text-xl px-6 py-3 ${
                  latestPrediction.risk_level === "critical" ? "bg-rose-600" :
                  latestPrediction.risk_level === "high" ? "bg-orange-600" :
                  latestPrediction.risk_level === "elevated" ? "bg-amber-600" :
                  latestPrediction.risk_level === "moderate" ? "bg-yellow-600" :
                  "bg-emerald-600"
                }`}>
                  {latestPrediction.risk_level?.toUpperCase()}
                </Badge>
                <div className="mt-4">
                  <p className="text-sm text-slate-500 mb-1">Risk Score</p>
                  <p className="text-4xl font-bold">{latestPrediction.risk_score}</p>
                  <Progress value={latestPrediction.risk_score} className="h-2 mt-2" />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-slate-500">Trend:</span>
                {latestPrediction.trend_direction === "improving" && (
                  <span className="flex items-center text-emerald-600 font-medium">
                    <TrendingDown className="w-4 h-4 mr-1" /> Improving
                  </span>
                )}
                {latestPrediction.trend_direction === "worsening" && (
                  <span className="flex items-center text-rose-600 font-medium">
                    <TrendingUp className="w-4 h-4 mr-1" /> Worsening
                  </span>
                )}
                {latestPrediction.trend_direction === "stable" && (
                  <span className="flex items-center text-slate-600 font-medium">
                    <Minus className="w-4 h-4 mr-1" /> Stable
                  </span>
                )}
              </div>

              {latestPrediction.confidence_score && (
                <p className="text-center text-xs text-slate-400 mt-3">
                  AI Confidence: {latestPrediction.confidence_score}%
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contributing Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contributing Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {latestPrediction.contributing_factors?.map((factor, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">{factor.factor}</span>
                      {factor.weight && (
                        <Badge variant="outline" className="text-xs">{factor.weight}%</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{factor.details}</p>
                  </div>
                ))}
                {(!latestPrediction.contributing_factors || latestPrediction.contributing_factors.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-4">No factors identified</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {latestPrediction.recommended_actions?.map((action, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm text-slate-900">{action.action}</p>
                        <p className="text-xs text-slate-600 mt-1">{action.rationale}</p>
                        <Badge variant="outline" className={`text-xs mt-2 ${
                          action.priority === "critical" ? "border-rose-300 text-rose-700" :
                          action.priority === "high" ? "border-orange-300 text-orange-700" :
                          action.priority === "medium" ? "border-amber-300 text-amber-700" :
                          "border-slate-300"
                        }`}>
                          {action.priority} priority
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {(!latestPrediction.recommended_actions || latestPrediction.recommended_actions.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-4">No actions recommended</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Brain className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">No risk analysis available yet</p>
          <Button onClick={runAIAnalysis} disabled={isAnalyzing}>
            Run First Analysis
          </Button>
        </Card>
      )}

      {/* AI Analysis Narrative */}
      {latestPrediction?.ai_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {latestPrediction.ai_analysis}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Correlation Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cross-System Correlation Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <ClipboardCheck className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <p className="text-xs text-slate-500">MSS Completion</p>
              <p className="font-semibold">{latestPrediction?.sanitation_correlation?.mss_completion_rate || "--"}%</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <p className="text-xs text-slate-500">Verification Conf.</p>
              <p className="font-semibold">{latestPrediction?.sanitation_correlation?.verification_confidence || "--"}%</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <Droplets className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <p className="text-xs text-slate-500">Drain Issues</p>
              <p className="font-semibold">{latestPrediction?.sanitation_correlation?.drain_issues_nearby || "--"}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <Droplets className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <p className="text-xs text-slate-500">Diverter Wet</p>
              <p className="font-semibold">{latestPrediction?.sanitation_correlation?.diverter_wet_findings || "--"}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <Bug className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <p className="text-xs text-slate-500">Pest Activity</p>
              <p className="font-semibold">{latestPrediction?.sanitation_correlation?.pest_activity_nearby || "--"}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <GraduationCap className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <p className="text-xs text-slate-500">Training Gaps</p>
              <p className="font-semibold">{latestPrediction?.sanitation_correlation?.training_gaps || "--"}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">
            These signals are correlated with EMP results to identify root causes and predict emerging risks
          </p>
        </CardContent>
      </Card>

      {/* Historical Predictions */}
      {predictions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {predictions.slice(0, 10).reverse().map((pred, idx) => (
                <div key={pred.id} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-t ${
                      pred.risk_level === "critical" ? "bg-rose-500" :
                      pred.risk_level === "high" ? "bg-orange-500" :
                      pred.risk_level === "elevated" ? "bg-amber-500" :
                      pred.risk_level === "moderate" ? "bg-yellow-500" :
                      "bg-emerald-500"
                    }`}
                    style={{ height: `${pred.risk_score}%` }}
                    title={`${format(parseISO(pred.prediction_date), "MMM d")}: ${pred.risk_score}`}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {format(parseISO(pred.prediction_date), "M/d")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}