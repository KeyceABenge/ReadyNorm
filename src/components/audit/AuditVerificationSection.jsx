import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Download, Shield, Droplet, PenTool, ThumbsUp, ThumbsDown
} from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { cn } from "@/lib/utils";

export default function AuditVerificationSection({ tasks, areaSignOffs, employees, assets = [], dateRange }) {
  // Filter completed tasks with verification data
  const completedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = parseISO(t.completed_at);
      return isWithinInterval(completedDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [tasks, dateRange]);

  // ATP tests in range
  const atpTests = useMemo(() => {
    return areaSignOffs.filter(s => {
      if (!s.atp_tested_at || !s.atp_test_result || s.atp_test_result === "not_required") return false;
      const testedDate = parseISO(s.atp_tested_at);
      return isWithinInterval(testedDate, { start: dateRange.start, end: dateRange.end });
    }).sort((a, b) => new Date(b.atp_tested_at).getTime() - new Date(a.atp_tested_at).getTime());
  }, [areaSignOffs, dateRange]);

  // Calculate metrics
  const verifiedCount = completedTasks.filter(t => t.verified_by).length;
  const signedCount = completedTasks.filter(t => t.signature_data).length;
  const atpPassed = atpTests.filter(t => t.atp_test_result === "pass").length;
  const atpFailed = atpTests.filter(t => t.atp_test_result === "fail").length;

  const verificationRate = completedTasks.length > 0 
    ? Math.round((verifiedCount / completedTasks.length) * 100) : 100;
  const signatureRate = completedTasks.length > 0 
    ? Math.round((signedCount / completedTasks.length) * 100) : 100;
  const atpPassRate = atpTests.length > 0 
    ? Math.round((atpPassed / atpTests.length) * 100) : 100;

  // ATP chart data
  const atpChartData = [
    { name: "Passed", value: atpPassed, color: "#059669" },
    { name: "Failed", value: atpFailed, color: "#dc2626" }
  ].filter(d => d.value > 0);

  const exportVerificationReport = () => {
    const csvContent = `Verification Evidence Report\nGenerated: ${format(new Date(), "yyyy-MM-dd HH:mm")}\nPeriod: ${format(dateRange.start, "yyyy-MM-dd")} to ${format(dateRange.end, "yyyy-MM-dd")}\n\nSUMMARY METRICS\nTotal Completed Tasks,${completedTasks.length}\nVerified Tasks,${verifiedCount} (${verificationRate}%)\nSigned Tasks,${signedCount} (${signatureRate}%)\nATP Tests Conducted,${atpTests.length}\nATP Pass Rate,${atpPassRate}%\n\nATP TEST RESULTS\nAsset,Area,Result,RLU Value,Tested By,Tested At\n${atpTests.map(t => `"${t.asset_id || ''}","${t.area_name || ''}","${t.atp_test_result}",${t.atp_test_value || ''},"${t.employee_name || ''}","${t.atp_tested_at}"`).join('\n')}`;
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verification_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            Verification Evidence
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Sign-offs, signatures, and ATP test results
          </p>
        </div>
        <Button variant="outline" onClick={exportVerificationReport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Verification Confidence Indicators */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className={cn(
          "border-2",
          verificationRate >= 80 ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Shield className={cn(
                "w-6 h-6",
                verificationRate >= 80 ? "text-emerald-600" : "text-amber-600"
              )} />
              <span className="font-semibold text-slate-900">Manager Verification</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold">{verificationRate}%</span>
              <span className="text-sm text-slate-500">of tasks verified</span>
            </div>
            {/* @ts-ignore */}
            <Progress value={verificationRate} className="h-2" />
            <p className="text-xs text-slate-500 mt-2">{verifiedCount} of {completedTasks.length} tasks</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          signatureRate >= 80 ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <PenTool className={cn(
                "w-6 h-6",
                signatureRate >= 80 ? "text-emerald-600" : "text-amber-600"
              )} />
              <span className="font-semibold text-slate-900">Employee Signatures</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold">{signatureRate}%</span>
              <span className="text-sm text-slate-500">tasks signed</span>
            </div>
            {/* @ts-ignore */}
            <Progress value={signatureRate} className="h-2" />
            <p className="text-xs text-slate-500 mt-2">{signedCount} of {completedTasks.length} tasks</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          atpPassRate >= 95 ? "border-emerald-300 bg-emerald-50" : 
          atpPassRate >= 85 ? "border-amber-300 bg-amber-50" : "border-rose-300 bg-rose-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Droplet className={cn(
                "w-6 h-6",
                atpPassRate >= 95 ? "text-emerald-600" : 
                atpPassRate >= 85 ? "text-amber-600" : "text-rose-600"
              )} />
              <span className="font-semibold text-slate-900">ATP Testing</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold">{atpPassRate}%</span>
              <span className="text-sm text-slate-500">pass rate</span>
            </div>
            {/* @ts-ignore */}
            <Progress value={atpPassRate} className="h-2" />
            <p className="text-xs text-slate-500 mt-2">{atpPassed} passed, {atpFailed} failed</p>
          </CardContent>
        </Card>
      </div>

      {/* ATP Results Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* ATP Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Droplet className="w-5 h-5 text-blue-600" />
              ATP Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atpTests.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={atpChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {atpChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                No ATP tests in selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent ATP Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent ATP Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {atpTests.slice(0, 20).map(test => {
                // Look up asset name from assets array
                const asset = assets.find(a => a.id === test.asset_id);
                const assetName = asset?.name || asset?.data?.name;
                const displayName = assetName || test.area_name || test.asset_id;

                return (
                  <div key={test.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {test.atp_test_result === "pass" ? (
                        <ThumbsUp className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ThumbsDown className="w-5 h-5 text-rose-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{displayName}</p>
                        <p className="text-xs text-slate-500">
                          {test.atp_test_value && `RLU: ${test.atp_test_value}`}
                          {test.atp_retest_count > 0 && ` • Retest #${test.atp_retest_count}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="default" className={cn(
                        "text-xs",
                        test.atp_test_result === "pass" 
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      )}>
                        {test.atp_test_result}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(parseISO(test.atp_tested_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
              {atpTests.length === 0 && (
                <p className="text-center text-slate-500 py-8">No ATP tests recorded</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Confidence Statement */}
      <Card className="bg-slate-900 text-white">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Verification Confidence</h3>
              <p className="text-slate-300 leading-relaxed">
                {verificationRate >= 80 && signatureRate >= 80 && atpPassRate >= 90 ? (
                  "This sanitation program demonstrates high verification confidence with strong manager oversight, consistent employee sign-offs, and excellent ATP testing results. Records are complete with timestamps and attribution for full traceability."
                ) : verificationRate >= 60 && atpPassRate >= 80 ? (
                  "Verification coverage is adequate with room for improvement in manager verification rates. ATP testing results are satisfactory. Continue focusing on closing verification gaps."
                ) : (
                  "Verification coverage requires attention. Consider increasing manager verification frequency and ensuring all tasks include employee signatures. Review ATP testing protocols to improve pass rates."
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}