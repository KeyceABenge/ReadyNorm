import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendUp, className, compact }) {
  return (
    <Card className={cn(
      "bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl",
      compact ? "p-1.5" : "p-6",
      className
    )}>
      <div className={cn(
        "flex flex-col items-center justify-center text-center gap-0.5"
      )}>
        <p className={cn(
          "font-medium text-slate-500 tracking-wide uppercase",
          compact ? "text-[10px] leading-tight" : "text-sm"
        )}>{title}</p>
        <p className={cn(
          "font-bold text-slate-900",
          compact ? "text-base leading-tight" : "text-3xl"
        )}>{value}</p>
        {subtitle && (
          <p className={cn("text-slate-500", compact ? "text-xs" : "text-sm")}>{subtitle}</p>
        )}
        {trend && (
          <div className={cn(
            "inline-flex items-center gap-1 font-medium",
            compact ? "text-xs" : "text-sm",
            trendUp ? "text-emerald-600" : "text-rose-600"
          )}>
            <span>{trendUp ? "↑" : "↓"}</span>
            <span>{trend}</span>
          </div>
        )}
      </div>
    </Card>
  );
}