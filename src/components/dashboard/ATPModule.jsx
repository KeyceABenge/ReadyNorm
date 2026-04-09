import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplet, CheckCircle2, RotateCcw, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format, addMonths, subMonths } from "date-fns";

export default function ATPModule({ areaSignOffs }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Filter ATP tests completed this month
  const monthlyATPTests = areaSignOffs.filter(s => {
    if (!s.atp_test_result || s.atp_test_result === "not_required") return false;
    if (!s.atp_tested_at) return false;
    const testedDate = parseISO(s.atp_tested_at);
    return isWithinInterval(testedDate, { start: monthStart, end: monthEnd });
  });

  const passedFirstTry = monthlyATPTests.filter(s => s.atp_test_result === "pass" && s.atp_retest_count === 0).length;
  const totalTests = monthlyATPTests.length;
  const firstPassRate = totalTests > 0 ? Math.round((passedFirstTry / totalTests) * 100) : 0;
  const retests = monthlyATPTests.filter(s => s.atp_retest_count > 0).length;

  const passColor = firstPassRate >= 85 ? "#059669" : firstPassRate >= 70 ? "#0891b2" : "#f59e0b";
  const passBg = firstPassRate >= 85 ? "#ecfdf5" : firstPassRate >= 70 ? "#ecf0ff" : "#fef3c7";

  const passed = monthlyATPTests.filter(s => s.atp_test_result === "pass").length;
  const failed = monthlyATPTests.filter(s => s.atp_test_result === "fail").length;

  return (
    <Card className="p-2.5 md:p-4 bg-white border-0 shadow-sm">
      {/* Header row with title + month nav */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-50">
            <Droplet className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <h3 className="text-xs md:text-sm font-semibold text-slate-900">ATP Swab Results</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[10px] md:text-xs font-medium text-slate-600 w-16 text-center">
            {format(selectedMonth, "MMM yyyy")}
          </span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} disabled={addMonths(selectedMonth, 1) > new Date()}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Compact single-row stats */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Total + First Pass */}
        <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-md bg-slate-50 border border-slate-200">
          <span className="text-base md:text-lg font-bold text-slate-900">{totalTests}</span>
          <span className="text-[9px] md:text-[10px] text-slate-500">swabs</span>
        </div>
        <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-md border" style={{ backgroundColor: passBg, borderColor: passColor }}>
          <span className="text-base md:text-lg font-bold" style={{ color: passColor }}>{firstPassRate}%</span>
          <span className="text-[9px] md:text-[10px]" style={{ color: passColor }}>1st pass</span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Breakdown inline */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto text-[10px] md:text-xs">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span className="text-slate-600">{passed}</span>
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-amber-600" />
            <span className="text-slate-600">{retests}</span>
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span className="text-slate-600">{failed}</span>
          </span>
        </div>
      </div>
    </Card>
  );
}