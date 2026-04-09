import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { format, isPast } from "date-fns";

export default function SOC2GapsList({ controls, onViewGap }) {
  const allGaps = controls.flatMap(control => 
    (control.gaps_identified || []).map(gap => ({
      ...gap,
      control_id: control.control_id,
      control_name: control.control_name
    }))
  ).filter(gap => gap.remediation_status !== 'resolved');

  const sortedGaps = allGaps.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
  });

  if (sortedGaps.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900">No Open Gaps</h3>
          <p className="text-sm text-slate-500">All identified gaps have been remediated</p>
        </CardContent>
      </Card>
    );
  }

  const severityColors = {
    critical: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-blue-100 text-blue-800 border-blue-200"
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Open Compliance Gaps
          </CardTitle>
          <Badge variant="outline">{sortedGaps.length} gaps</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedGaps.slice(0, 10).map((gap, idx) => {
          const isOverdue = gap.remediation_due && isPast(new Date(gap.remediation_due));
          
          return (
            <div 
              key={gap.id || idx}
              className={`p-3 rounded-lg border ${severityColors[gap.severity] || severityColors.medium}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      {gap.control_id}
                    </Badge>
                    <Badge className={severityColors[gap.severity]}>
                      {gap.severity}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">Overdue</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-900">{gap.description}</p>
                  <p className="text-xs text-slate-600 mt-1">{gap.control_name}</p>
                  
                  {gap.remediation_due && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>Due: {format(new Date(gap.remediation_due), "MMM d, yyyy")}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => onViewGap?.(gap)}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
        
        {sortedGaps.length > 10 && (
          <p className="text-sm text-center text-slate-500">
            +{sortedGaps.length - 10} more gaps
          </p>
        )}
      </CardContent>
    </Card>
  );
}