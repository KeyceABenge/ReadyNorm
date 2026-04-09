// @ts-nocheck
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Calendar, Trash2, Repeat, Cake } from "lucide-react";
import ProxiedImage from "@/components/ui/ProxiedImage";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n";
import { cn } from "@/lib/utils";

export default function AnnouncementCard({ announcement, isManager, onDelete, translatedTitle, translatedContent, compact = false }) {
  const isExpired = new Date(announcement.expiry_date) < new Date();
  const { t } = useTranslation();

  // Use translated content if provided, otherwise use original
  const displayTitle = translatedTitle || announcement.title;
  const displayContent = translatedContent || announcement.content;

  return (
    <Card className="overflow-hidden">
      {announcement.photo_url && (
        <div className="bg-slate-200">
          <ProxiedImage
            src={announcement.photo_url}
            alt={displayTitle}
            className={cn("w-full object-cover", compact ? "h-24" : "h-auto object-contain")}
          />
        </div>
      )}

      <div className={compact ? "p-3" : "p-5"}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={cn("font-semibold text-slate-900", compact ? "text-sm line-clamp-2" : "text-lg")}>{displayTitle}</h3>
          {isManager && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete?.(announcement.id)}
              className="text-slate-400 hover:text-rose-600 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {!compact && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {isExpired && (
              <Badge className="bg-slate-200 text-slate-700">{t("status", "archived", "Archived")}</Badge>
            )}
            {announcement.schedule_type === "recurring" && (
              <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                {announcement.recurrence_frequency === "daily" ? "Daily" :
                 announcement.recurrence_frequency === "weekly" ? "Weekly" :
                 announcement.recurrence_frequency === "biweekly" ? "Bi-weekly" :
                 announcement.recurrence_frequency === "monthly" ? "Monthly" : "Recurring"}
              </Badge>
            )}
            {announcement.is_birthday_template && (
              <Badge className="bg-pink-100 text-pink-700 flex items-center gap-1">
                <Cake className="w-3 h-3" />
                Birthday Template
              </Badge>
            )}
          </div>
        )}

        <p className={cn("text-slate-700 whitespace-pre-wrap", compact ? "text-xs line-clamp-3 mb-2" : "mb-4")}>{displayContent}</p>

        <div className={cn("flex text-xs text-slate-500", compact ? "justify-start" : "items-center justify-between")}>
          {!compact && <span>{t("common", "from", "From")} {announcement.created_by_name || announcement.created_by}</span>}
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>
              {announcement.created_date ? format(parseISO(announcement.created_date), "MMM d") : ""}
              {!compact && !isExpired && announcement.expiry_date ? ` - ${t("time", "expires", "Expires")} ${format(parseISO(announcement.expiry_date), "MMM d")}` : ""}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}