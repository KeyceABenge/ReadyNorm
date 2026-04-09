import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit2, Trash2, Clock } from "lucide-react";

const DAY_LABELS = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

export default function CrewScheduleCard({ schedule, onEdit, onDelete }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{schedule.crew_name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            {schedule.shift_start_time} - {schedule.shift_end_time}
          </div>
        </div>
        <Badge className={schedule.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
          {schedule.status}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <p className="font-medium text-slate-700 mb-1">Week A (Work):</p>
          <div className="flex gap-1 flex-wrap">
            {schedule.week_a_days.map(day => (
              <span key={day} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                {DAY_LABELS[day]}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="font-medium text-slate-700 mb-1">Week B (Off):</p>
          <div className="flex gap-1 flex-wrap">
            {schedule.week_b_days.map(day => (
              <span key={day} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                {DAY_LABELS[day]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={() => onEdit(schedule)} className="flex-1">
          <Edit2 className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(schedule)} className="text-rose-600 hover:text-rose-700">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}