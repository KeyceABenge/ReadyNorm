import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Edit2, Trash2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES } from "@/components/i18n";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";

const roleColors = {
  cleaner: "bg-slate-100 text-slate-700",
  supervisor: "bg-blue-100 text-blue-700",
  lead: "bg-purple-100 text-purple-700"
};

export default function EmployeeCard({ employee, tasksCount = 0, onEdit, onDelete }) {
  const initials = employee.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
          {employee.avatar_url ? (
            <img src={employee.avatar_url} alt={employee.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 truncate">{employee.name}</h3>
            <EmployeeBadgeIcons employee={employee} size="sm" />
            <BirthdayCakeIcon employee={employee} />
            <Badge className={cn("text-xs font-medium capitalize", roleColors[employee.role] || roleColors.cleaner)}>
              {employee.role}
            </Badge>
          </div>
          
          {employee.department && (
            <p className="text-sm text-slate-500 mb-2">{employee.department}</p>
          )}
          
          <div className="space-y-1 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="truncate">{employee.email}</span>
            </div>
            {employee.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{employee.phone}</span>
              </div>
            )}
            {employee.preferred_language && employee.preferred_language !== "en" && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>
                  {SUPPORTED_LANGUAGES.find(l => l.code === employee.preferred_language)?.flag || ""}{" "}
                  {SUPPORTED_LANGUAGES.find(l => l.code === employee.preferred_language)?.name || employee.preferred_language}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => onEdit(employee)} className="h-8">
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(employee)} className="h-8 w-8">
              <Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-600" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}