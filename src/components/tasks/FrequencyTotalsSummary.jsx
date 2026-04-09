import { cn } from "@/lib/utils";
import { Sun, Calendar, Clock, BarChart3, Zap, Target, AlertCircle } from "lucide-react";
import { getCategoryConfig, getAllCategoryOrder, getAllCategories } from "./taskCategoryClassifier";
import { classifyTask } from "./taskCategoryClassifier";

const frequencyConfig = {
  Daily: { icon: Sun, badgeColor: "bg-blue-100 text-blue-800" },
  Weekly: { icon: Calendar, badgeColor: "bg-emerald-100 text-emerald-800" },
  "Bi-weekly": { icon: BarChart3, badgeColor: "bg-purple-100 text-purple-800" },
  Bimonthly: { icon: Calendar, badgeColor: "bg-teal-100 text-teal-800" },
  Monthly: { icon: Clock, badgeColor: "bg-amber-100 text-amber-800" },
  Quarterly: { icon: Target, badgeColor: "bg-rose-100 text-rose-800" },
  Annually: { icon: Zap, badgeColor: "bg-indigo-100 text-indigo-800" },
  Other: { icon: AlertCircle, badgeColor: "bg-slate-100 text-slate-800" },
};

const frequencyOrder = ["Daily", "Weekly", "Bi-weekly", "Monthly", "Bimonthly", "Quarterly", "Annually", "Other"];

const normalizeFreqLabel = (f) => {
  if (!f) return "Other";
  const lower = f.toLowerCase().trim().replace(/[-_\s]+/g, "");
  if (lower === "daily") return "Daily";
  if (lower === "weekly") return "Weekly";
  if (lower === "biweekly") return "Bi-weekly";
  if (lower === "monthly") return "Monthly";
  if (lower === "bimonthly") return "Bimonthly";
  if (lower === "quarterly") return "Quarterly";
  if (lower === "annually" || lower === "annual") return "Annually";
  return f;
};

export default function FrequencyTotalsSummary({ deduplicatedTasks, customCategories = [] }) {
  if (!deduplicatedTasks || deduplicatedTasks.length === 0) return null;

  const allCategories = getAllCategories(customCategories);
  const allCategoryOrder = getAllCategoryOrder(customCategories);

  const getTaskCategory = (task) => {
    if (task.category && allCategories[task.category]) return task.category;
    if (task.category) {
      const lower = task.category.toLowerCase();
      if (lower.includes("routine") || lower.includes("mss")) return "MSS";
      if (lower.includes("infra") || lower.includes("pic")) return "PIC";
      if (lower.includes("equipment") || lower.includes("pec")) return "PEC";
      if (lower.includes("ameniti")) return "AMENITIES";
      if (lower.includes("fire")) return "FIRE";
      if (lower.includes("one-off") || lower.includes("one off")) return "ONE_OFF";
      if (allCategories[task.category]) return task.category;
    }
    return classifyTask(task);
  };

  // Build frequency totals across all categories
  const freqTotals = {};
  deduplicatedTasks.forEach(task => {
    const freq = normalizeFreqLabel(task.frequency);
    freqTotals[freq] = (freqTotals[freq] || 0) + 1;
  });

  const sortedFreqs = Object.keys(freqTotals).sort((a, b) => {
    const ai = frequencyOrder.indexOf(a);
    const bi = frequencyOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  // Build per-category breakdown
  const catBreakdowns = {};
  deduplicatedTasks.forEach(task => {
    const catId = getTaskCategory(task);
    const freq = normalizeFreqLabel(task.frequency);
    if (!catBreakdowns[catId]) catBreakdowns[catId] = {};
    catBreakdowns[catId][freq] = (catBreakdowns[catId][freq] || 0) + 1;
  });

  const activeCatIds = allCategoryOrder.filter(id => catBreakdowns[id]);
  const extraCatIds = Object.keys(catBreakdowns).filter(id => !allCategoryOrder.includes(id));
  const orderedCatIds = [...activeCatIds, ...extraCatIds];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h4 className="font-semibold text-sm text-slate-900">Task Totals by Frequency</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Category</th>
              {sortedFreqs.map(freq => (
                <th key={freq} className="text-center px-3 py-2 text-xs font-medium text-slate-500 whitespace-nowrap">{freq}</th>
              ))}
              <th className="text-center px-3 py-2 text-xs font-bold text-slate-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {orderedCatIds.map(catId => {
              const catConfig = getCategoryConfig(catId, customCategories);
              const breakdown = catBreakdowns[catId] || {};
              const catTotal = Object.values(breakdown).reduce((s, v) => s + v, 0);
              return (
                <tr key={catId} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", catConfig.badgeColor)}>
                      {catConfig.shortLabel}
                    </span>
                  </td>
                  {sortedFreqs.map(freq => (
                    <td key={freq} className="text-center px-3 py-2.5 text-xs text-slate-600">
                      {breakdown[freq] || <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                  <td className="text-center px-3 py-2.5 text-xs font-bold text-slate-800">{catTotal}</td>
                </tr>
              );
            })}
            {/* Totals row */}
            <tr className="bg-slate-50 border-t border-slate-200">
              <td className="px-4 py-2.5 text-xs font-bold text-slate-700">Total</td>
              {sortedFreqs.map(freq => (
                <td key={freq} className="text-center px-3 py-2.5 text-xs font-bold text-slate-800">{freqTotals[freq]}</td>
              ))}
              <td className="text-center px-3 py-2.5 text-sm font-bold text-slate-900">{deduplicatedTasks.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}