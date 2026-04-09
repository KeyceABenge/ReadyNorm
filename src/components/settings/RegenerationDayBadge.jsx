import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { getFiscalWeek } from "@/lib/fiscalCalendar";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Shows which day of the week tasks regenerate for a given frequency.
 * - daily: shows "Every day" or the specific days_of_week if configured
 * - "days" interval (e.g. weekly=7): calculates from fiscal week start
 * - monthly_dates: shows the day-of-month dates
 * - months: shows "Every X months"
 * - yearly: shows the specific date
 */
export default function RegenerationDayBadge({ freq, freqSetting, settings }) {
  if (!freqSetting) return null;

  const fiscalSettings = settings?.fiscal_year_settings || {};
  const fiscalMode = fiscalSettings.fiscal_calendar_mode;

  // Daily tasks
  if (freqSetting.interval_type === "daily") {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
        <CalendarDays className="w-3 h-3" />
        Every working day
      </Badge>
    );
  }

  // Every X days (e.g. weekly = 7 days)
  if (freqSetting.interval_type === "days") {
    const intervalDays = freqSetting.interval_days || 7;
    
    // Determine regeneration anchor day from fiscal calendar
    let anchorDay;
    if (fiscalMode === "weekly_october" || !fiscalMode || fiscalMode === "") {
      // Fiscal weeks start on Sunday
      const now = new Date();
      const { weekStart } = getFiscalWeek(now);
      anchorDay = weekStart.getDay(); // 0 = Sunday
    } else {
      // Default: Sunday
      anchorDay = 0;
    }

    const dayName = DAY_NAMES[anchorDay];

    if (intervalDays === 7) {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 gap-1">
          <CalendarDays className="w-3 h-3" />
          Regenerates on {dayName}s
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 gap-1">
        <CalendarDays className="w-3 h-3" />
        Every {intervalDays} days from {dayName}
      </Badge>
    );
  }

  // Monthly dates
  if (freqSetting.interval_type === "monthly_dates") {
    const dates = freqSetting.monthly_dates || [1];
    const suffix = (d) => {
      if (d >= 11 && d <= 13) return "th";
      switch (d % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
      }
    };
    const dateStr = dates.map(d => `${d}${suffix(d)}`).join(", ");
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50 text-violet-700 border-violet-200 gap-1">
        <CalendarDays className="w-3 h-3" />
        {dateStr} of each month
      </Badge>
    );
  }

  // Every X months
  if (freqSetting.interval_type === "months") {
    const months = freqSetting.interval_months || 3;
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-700 border-orange-200 gap-1">
        <CalendarDays className="w-3 h-3" />
        Every {months} month{months > 1 ? "s" : ""}
      </Badge>
    );
  }

  // Yearly — default to fiscal year start
  if (freqSetting.interval_type === "yearly") {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fyStartMonth = fiscalSettings.fiscal_year_start_month || 10;
    const fyStartDay = fiscalSettings.fiscal_year_start_day || 1;
    const m = freqSetting.yearly_month || fyStartMonth;
    const d = freqSetting.yearly_day || fyStartDay;
    const isFiscalStart = m === fyStartMonth && d === fyStartDay;
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-pink-50 text-pink-700 border-pink-200 gap-1">
        <CalendarDays className="w-3 h-3" />
        {monthNames[m - 1]} {d} — {isFiscalStart ? "Fiscal year start" : "each year"}
      </Badge>
    );
  }

  return null;
}