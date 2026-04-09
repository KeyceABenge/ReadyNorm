import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

export default function ShiftSelector({ 
  sessions, 
  shifts, 
  selectedDate, 
  selectedShiftId, 
  onSelect,
  isLive 
}) {
  const shiftDefs = shifts?.length > 0 ? shifts : [{ id: "default", name: "Shift", start_time: "06:00", end_time: "14:30" }];

  // Build dates that have session data (today + last 7 days)
  const availableDates = useMemo(() => {
    const dates = [];
    for (let d = 0; d < 8; d++) {
      const date = subDays(new Date(), d);
      const dateStr = format(date, "yyyy-MM-dd");
      const hasData = d === 0 || sessions.some(s => s.session_date === dateStr);
      if (hasData) {
        dates.push({ date: dateStr, isToday: d === 0 });
      }
    }
    return dates;
  }, [sessions]);

  const currentDateObj = availableDates.find(d => d.date === selectedDate) || availableDates[0];
  const dateIndex = availableDates.indexOf(currentDateObj);
  const canGoNewer = dateIndex > 0;
  const canGoOlder = dateIndex < availableDates.length - 1;

  const goNewer = () => {
    if (canGoNewer) {
      onSelect(availableDates[dateIndex - 1].date, selectedShiftId);
    }
  };
  const goOlder = () => {
    if (canGoOlder) {
      onSelect(availableDates[dateIndex + 1].date, selectedShiftId);
    }
  };

  const dateLabel = currentDateObj?.isToday 
    ? "Today" 
    : currentDateObj ? format(parseISO(currentDateObj.date), "EEE, MMM d") : "Today";

  return (
    <div className="space-y-2">
      {/* Date navigation */}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goOlder} disabled={!canGoOlder}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <div className="flex items-center gap-1.5 text-[11px]">
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          <span className="font-medium text-slate-700">{dateLabel}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goNewer} disabled={!canGoNewer}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Shift tabs */}
      {shiftDefs.length > 1 && (
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {shiftDefs.map(shift => {
            const isSelected = shift.id === selectedShiftId;
            return (
              <button
                key={shift.id}
                onClick={() => onSelect(selectedDate, shift.id)}
                className={`flex-1 text-[11px] font-medium py-1.5 px-2 rounded-md transition-all ${
                  isSelected
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {shift.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}