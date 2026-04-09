/**
 * Mobile Employee List
 * Touch-friendly employee cards for mobile view
 */

// @ts-nocheck
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, Pencil, MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";

export default function MobileEmployeeList({ 
  employees, 
  getTaskCount,
  onEdit,
  onDelete,
  onViewDetail
}) {
  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No employees added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {employees.map((employee) => {
        const taskCount = getTaskCount?.(employee.email) || 0;
        const initials = employee.name
          ?.split(" ")
          .map(n => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2) || "??";

        return (
          <Card
            key={employee.id}
            className="overflow-hidden touch-manipulation active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2.5 p-3">
              {/* Avatar */}
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                style={{ backgroundColor: employee.color || "#3b82f6" }}
              >
                {employee.avatar_url ? (
                  <img 
                    src={employee.avatar_url} 
                    alt="" 
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              {/* Info */}
              <div 
                className="flex-1 min-w-0"
                onClick={() => onViewDetail?.(employee)}
              >
                <p className="font-medium text-sm text-slate-900 truncate flex items-center gap-1">
                  {employee.name}
                  <EmployeeBadgeIcons employee={employee} size="xs" />
                  <BirthdayCakeIcon employee={employee} className="w-3.5 h-3.5" />
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-500 truncate">
                    {employee.role || employee.department || "Employee"}
                  </span>
                  {taskCount > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {taskCount} tasks
                    </Badge>
                  )}
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-1.5">
                <Badge 
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5",
                    employee.status === "active" 
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {employee.status || "active"}
                </Badge>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 touch-manipulation"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => onEdit?.(employee)}
                      className="py-2.5 touch-manipulation"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(employee)}
                      className="py-2.5 touch-manipulation text-rose-600"
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}