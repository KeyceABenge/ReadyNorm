import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, GraduationCap, User, ClipboardList, CheckCircle2, Loader2, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskTrainingGapRepo } from "@/lib/adapters/database";

export default function TrainingGapsPanel({ organizationId }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: trainingGaps = [], isLoading } = useQuery({
    queryKey: ["training_gaps", organizationId],
    queryFn: () => TaskTrainingGapRepo.filter({ 
      organization_id: organizationId,
      status: "pending"
    }, "-created_date"),
    enabled: !!organizationId
  });

  // Group gaps by employee
  const gapsByEmployee = {};
  trainingGaps.forEach(gap => {
    const key = gap.employee_email;
    if (!gapsByEmployee[key]) {
      gapsByEmployee[key] = {
        employee_name: gap.employee_name,
        employee_email: gap.employee_email,
        gaps: []
      };
    }
    gapsByEmployee[key].gaps.push(gap);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (trainingGaps.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
          <p className="text-sm text-slate-600 font-medium">No Training Gaps</p>
          <p className="text-xs text-slate-500">All employees have completed required training</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-sm text-slate-900">Training Gaps</span>
            <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0">{trainingGaps.length} pending</Badge>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="space-y-2 mt-2">
          {Object.values(gapsByEmployee).map(({ employee_name, employee_email, gaps }) => (
            <Card key={employee_email} className="border-amber-200">
              <CardContent className="p-2.5">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{employee_name}</p>
                    <p className="text-xs text-slate-500 truncate">{employee_email}</p>
                    
                    <div className="mt-1.5 space-y-1">
                      {gaps.map(gap => (
                        <div 
                          key={gap.id} 
                          className="flex items-center justify-between p-1.5 bg-amber-50 rounded text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <ClipboardList className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            <span className="text-slate-700 truncate">{gap.task_title}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <GraduationCap className="w-3 h-3 text-amber-600" />
                            <span className="text-amber-700 font-medium truncate max-w-[100px]">{gap.training_title}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Recorded: {gaps[0]?.session_date ? format(parseISO(gaps[0].session_date), "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}