import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Factory, Clock, GraduationCap, CheckCircle2, AlertTriangle, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

export default function HelperLineCleaningSection({ 
  lineCleanings, 
  assets,
  trainingDocs,
  helperTrainings,
  onSelectLineCleaning 
}) {
  // Always show section even if empty, so helpers know where to look
  if (!lineCleanings || lineCleanings.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Factory className="w-5 h-5 text-blue-600" />
          Active Line Cleanings
        </h2>
        <Card className="p-6 text-center border-dashed">
          <Factory className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No active line cleanings scheduled</p>
        </Card>
      </div>
    );
  }

  // Get all unique training requirements for a line cleaning's assets
  const getLineTrainingRequirements = (lineCleaning) => {
    const lineAssets = assets.filter(a => a.production_line_id === lineCleaning.production_line_id);
    const requiredTrainingIds = new Set();
    
    // Check SSOPs linked to assets for training requirements
    lineCleaning.assets_snapshot?.forEach(asset => {
      const fullAsset = assets.find(a => a.id === asset.id);
      if (fullAsset?.required_training_id) {
        requiredTrainingIds.add(fullAsset.required_training_id);
      }
    });
    
    // Get all training docs that are linked to this line
    trainingDocs.forEach(doc => {
      if (doc.production_line_id === lineCleaning.production_line_id) {
        requiredTrainingIds.add(doc.id);
      }
    });

    const requirements = [];
    requiredTrainingIds.forEach(trainingId => {
      const doc = trainingDocs.find(d => d.id === trainingId);
      const hasCompleted = helperTrainings.some(t => t.document_id === trainingId);
      if (doc) {
        requirements.push({
          id: trainingId,
          title: doc.title,
          completed: hasCompleted
        });
      }
    });

    return requirements;
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Factory className="w-5 h-5 text-blue-600" />
        Active Line Cleanings
      </h2>
      <div className="space-y-3">
        {lineCleanings.map(lc => {
          const trainingReqs = getLineTrainingRequirements(lc);
          const pendingTrainings = trainingReqs.filter(t => !t.completed);
          const allTrainingComplete = pendingTrainings.length === 0;
          
          return (
            <Card key={lc.id} className="p-4 border-2 border-blue-200 bg-blue-50/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-slate-900">
                      {lc.production_line_name}
                    </h3>
                    <Badge className={cn(
                      lc.status === "in_progress" && "bg-blue-100 text-blue-800",
                      lc.status === "scheduled" && "bg-slate-100 text-slate-800"
                    )}>
                      {lc.status === "in_progress" ? "In Progress" : "Scheduled"}
                    </Badge>
                    {!allTrainingComplete && (
                      <Badge className="bg-orange-100 text-orange-800">
                        <GraduationCap className="w-3 h-3 mr-1" />
                        {pendingTrainings.length} Training{pendingTrainings.length > 1 ? 's' : ''} Required
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                    {lc.scheduled_date && (
                      <>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {isToday(parseISO(lc.scheduled_date)) ? "Today" : 
                           isTomorrow(parseISO(lc.scheduled_date)) ? "Tomorrow" :
                           format(parseISO(lc.scheduled_date), 'MMM d')}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    {lc.expected_line_down_time && (
                      <>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(lc.expected_line_down_time), 'h:mm a')}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span>{lc.duration_minutes} min</span>
                    <span>•</span>
                    <span>{lc.assets_snapshot?.length || 0} assets</span>
                  </div>

                  {/* Training requirements list */}
                  {trainingReqs.length > 0 && (
                    <div className="mt-3 p-2 bg-white rounded-lg border">
                      <p className="text-xs font-medium text-slate-700 mb-2">Required Training:</p>
                      <div className="space-y-1">
                        {trainingReqs.map(req => (
                          <div key={req.id} className="flex items-center gap-2 text-xs">
                            {req.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                            )}
                            <span className={req.completed ? "text-slate-500" : "text-slate-700"}>
                              {req.title}
                            </span>
                            {req.completed && (
                              <span className="text-emerald-600 text-xs">✓ Complete</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  size="sm" 
                  onClick={() => onSelectLineCleaning(lc, pendingTrainings)}
                  className={cn(
                    allTrainingComplete 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "bg-orange-600 hover:bg-orange-700"
                  )}
                >
                  {allTrainingComplete ? (
                    "Join Cleaning"
                  ) : (
                    <>
                      <GraduationCap className="w-4 h-4 mr-1" />
                      Complete Training
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}