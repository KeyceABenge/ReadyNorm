import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulePatternEditor({ weeks, onChange }) {
  const handleToggleDay = (weekIdx, dayIdx) => {
    const updated = weeks.map((w, wi) =>
      wi === weekIdx ? w.map((d, di) => (di === dayIdx ? !d : d)) : w
    );
    onChange(updated);
  };

  const handleAddWeek = () => {
    onChange([...weeks, [false, false, false, false, false, false, false]]);
  };

  const handleRemoveWeek = (weekIdx) => {
    if (weeks.length <= 1) return;
    onChange(weeks.filter((_, i) => i !== weekIdx));
  };

  return (
    <div className="space-y-3">
      {/* Day labels header */}
      <div className="flex items-center gap-1 pl-20 pr-10">
        {DAY_LABELS.map((d) => (
          <div key={d} className="flex-1 text-center text-[10px] font-medium text-slate-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="flex items-center gap-1">
          <span className="w-20 text-xs font-medium text-slate-500 flex-shrink-0">
            Week {weekIdx + 1}
          </span>
          <div className="flex gap-1 flex-1">
            {week.map((isOn, dayIdx) => (
              <button
                key={dayIdx}
                type="button"
                onClick={() => handleToggleDay(weekIdx, dayIdx)}
                className={cn(
                  "flex-1 h-8 rounded-lg text-[11px] font-medium transition-all border",
                  isOn
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {DAY_LABELS[dayIdx].charAt(0)}
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="rounded-full h-7 w-7 flex-shrink-0"
            onClick={() => handleRemoveWeek(weekIdx)}
            disabled={weeks.length <= 1}
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full w-full text-xs"
        onClick={handleAddWeek}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add Week to Pattern
      </Button>
    </div>
  );
}