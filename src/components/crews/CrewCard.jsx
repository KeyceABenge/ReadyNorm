import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Edit2, Trash2 } from "lucide-react";

export default function CrewCard({ crew, employees, onEdit, onDelete }) {
  const memberDetails = crew.members?.map(email => 
    employees.find(e => e.email === email)
  ).filter(Boolean) || [];

  const crewColor = crew.color || "#3b82f6";
  
  // Convert hex to RGB and create background
  const hexToRgba = (hex, alpha = 0.1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const hexToBorder = (hex, alpha = 0.3) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <Card 
      className="p-4 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div 
            className="w-3.5 h-3.5 rounded-full mt-1.5 flex-shrink-0 ring-2 ring-white shadow-sm" 
            style={{ backgroundColor: crewColor }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold text-base text-slate-900">{crew.name}</h3>
              <Badge className="bg-slate-100 text-slate-600 rounded-full text-[11px] font-medium">{crew.members?.length || 0} members</Badge>
            </div>

          {(crew.shift_hours || crew.shift_start_time || crew.schedule_pattern?.length > 0) && (
            <p className="text-xs text-slate-500 mb-1.5">
              {crew.description ? `${crew.description} · ` : ""}
              {crew.shift_hours ? `${crew.shift_hours} hours` : ""}
              {crew.shift_start_time && crew.shift_end_time ? `. ${crew.shift_start_time}–${crew.shift_end_time}` : ""}
              {crew.schedule_pattern?.length > 0 && ` · ${crew.schedule_pattern.length}-week rotation`}
            </p>
          )}

          {!crew.shift_hours && !crew.shift_start_time && crew.description && (
            <p className="text-sm text-slate-500 mb-2">{crew.description}</p>
          )}

          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex gap-1 flex-wrap">
              {memberDetails.length > 0 ? (
                memberDetails.map((emp, idx) => (
                  <span key={emp.email} className="text-xs text-slate-500">
                    {emp.name}{idx < memberDetails.length - 1 ? "," : ""}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No members</span>
              )}
            </div>
          </div>
          </div>
        </div>

        <div className="flex gap-0.5">
          <Button size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={() => onEdit(crew)}>
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          </Button>
          <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 hover:bg-rose-50" onClick={() => onDelete(crew)}>
            <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
          </Button>
        </div>
      </div>
    </Card>
  );
}