// @ts-nocheck
import { useState, useEffect } from "react";
import { TaskRepo, HelperTrainingRepo, TrainingDocumentRepo, SiteSettingsRepo, LineCleaningAssignmentRepo, AssetRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, Loader2, RefreshCw, ArrowLeft,
  HandHelping, AlertTriangle, GraduationCap, Play
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import CompleteTaskModal from "@/components/modals/CompleteTaskModal";
import HelperTrainingModal from "@/components/modals/HelperTrainingModal";
import HelperTaskList from "@/components/helper/HelperTaskList";
import HelperLineCleaningSection from "@/components/helper/HelperLineCleaningSection";
import HelperLineTrainingModal from "@/components/modals/HelperLineTrainingModal";

export default function HelperDashboard() {
  const [helper, setHelper] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [taskRequiringTraining, setTaskRequiringTraining] = useState(null);
  const [lineTrainingModalOpen, setLineTrainingModalOpen] = useState(false);
  const [selectedLineCleaning, setSelectedLineCleaning] = useState(null);
  const [pendingLineTrainings, setPendingLineTrainings] = useState([]);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const stored = localStorage.getItem("selectedHelper");
    if (!stored) {
      window.location.href = createPageUrl("Home");
      return;
    }
    setHelper(JSON.parse(stored));
  }, []);

  const { data: availableTasks = [], isLoading, refetch } = useQuery({
    queryKey: ["helper-tasks", helper?.organization_id],
    queryFn: async () => {
      // Get tasks that are pending and unassigned or assigned to helpers
      const tasks = await TaskRepo.filter({ 
        organization_id: helper?.organization_id, 
        status: "pending" 
      });
      // Only show unassigned tasks available for helpers
      return tasks.filter(t => !t.assigned_to);
    },
    enabled: !!helper?.organization_id
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ["helper-my-tasks", helper?.id],
    queryFn: async () => {
      const tasks = await TaskRepo.filter({ 
        organization_id: helper?.organization_id
      });
      return tasks.filter(t => 
        t.assigned_to === `helper:${helper?.id}` && 
        (t.status === "pending" || t.status === "in_progress")
      );
    },
    enabled: !!helper?.id
  });

  const { data: helperTrainings = [] } = useQuery({
    queryKey: ["helper-trainings", helper?.id],
    queryFn: () => HelperTrainingRepo.filter({ 
      organization_id: helper?.organization_id, 
      helper_id: helper?.id 
    }),
    enabled: !!helper?.id
  });

  const { data: trainingDocuments = [] } = useQuery({
    queryKey: ["training-docs", helper?.organization_id],
    queryFn: () => TrainingDocumentRepo.filter({ 
      organization_id: helper?.organization_id,
      status: "active"
    }),
    enabled: !!helper?.organization_id
  });

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["site_settings", helper?.organization_id],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: helper?.organization_id }),
    enabled: !!helper?.organization_id,
    initialData: []
  });

  const settings = siteSettings[0] || {};

  // Fetch active line cleanings (today and recent)
  const { data: lineCleanings = [] } = useQuery({
    queryKey: ["helper-line-cleanings", helper?.organization_id],
    queryFn: async () => {
      const cleanings = await LineCleaningAssignmentRepo.filter({
        organization_id: helper?.organization_id
      });
      // Show scheduled or in_progress cleanings
      return cleanings.filter(lc => lc.status === "scheduled" || lc.status === "in_progress");
    },
    enabled: !!helper?.organization_id
  });

  // Fetch assets for training requirements
  const { data: assets = [] } = useQuery({
    queryKey: ["helper-assets", helper?.organization_id],
    queryFn: () => AssetRepo.filter({ organization_id: helper?.organization_id }),
    enabled: !!helper?.organization_id
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => TaskRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helper-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["helper-my-tasks"] });
      setCompleteModalOpen(false);
      setTaskToComplete(null);
      toast.success("Task updated");
    }
  });

  const checkTrainingRequirement = (task) => {
    if (!task.required_training_id) return { required: false };
    
    const hasTraining = helperTrainings.some(t => t.document_id === task.required_training_id);
    const trainingDoc = trainingDocuments.find(d => d.id === task.required_training_id);
    
    // Check if task is high-risk (blocked until training complete)
    const isHighRisk = task.priority === "critical" || task.priority === "high";
    
    return {
      required: !hasTraining,
      isBlocked: isHighRisk && !hasTraining,
      trainingDoc,
      trainingTitle: task.required_training_title || trainingDoc?.title
    };
  };

  const handleSelectTask = async (task) => {
    const trainingCheck = checkTrainingRequirement(task);
    
    if (trainingCheck.required) {
      if (trainingCheck.isBlocked) {
        // High-risk task - must complete training first
        toast.error("This task requires training completion before you can start.");
        setTaskRequiringTraining(task);
        setTrainingModalOpen(true);
        return;
      } else {
        // Can select but will need training before completion
        setTaskRequiringTraining(task);
        setTrainingModalOpen(true);
        return;
      }
    }
    
    // Assign task to helper
    await updateTaskMutation.mutateAsync({
      id: task.id,
      data: {
        assigned_to: `helper:${helper.id}`,
        assigned_to_name: `${helper.name} (Helper)`,
        status: "in_progress"
      }
    });
    toast.success("Task assigned to you!");
  };

  const handleStartTask = async (task) => {
    const trainingCheck = checkTrainingRequirement(task);
    
    if (trainingCheck.required && trainingCheck.isBlocked) {
      toast.error("Complete required training first");
      setTaskRequiringTraining(task);
      setTrainingModalOpen(true);
      return;
    }
    
    updateTaskMutation.mutate({ 
      id: task.id, 
      data: { status: "in_progress" }
    });
  };

  const handleCompleteTask = (task) => {
    const trainingCheck = checkTrainingRequirement(task);
    
    if (trainingCheck.required) {
      // Must complete training before sign-off
      toast.error("You must complete required training before signing off on this task.");
      setTaskRequiringTraining(task);
      setTrainingModalOpen(true);
      return;
    }
    
    setTaskToComplete(task);
    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async (task, notes, signatureData) => {
    await updateTaskMutation.mutateAsync({
      id: task.id,
      data: {
        status: "completed",
        completed_at: new Date().toISOString(),
        completion_notes: notes ? `[Helper: ${helper.name}] ${notes}` : `[Completed by Helper: ${helper.name}]`,
        signature_data: signatureData
      }
    });
  };

  const handleTrainingComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["helper-trainings"] });
    setTrainingModalOpen(false);
    setTaskRequiringTraining(null);
    toast.success("Training completed! You can now proceed with the task.");
  };

  const handleSelectLineCleaning = (lineCleaning, pendingTrainings) => {
    if (pendingTrainings.length > 0) {
      setSelectedLineCleaning(lineCleaning);
      setPendingLineTrainings(pendingTrainings);
      setLineTrainingModalOpen(true);
    } else {
      // All training complete, navigate to line cleaning
      window.location.href = createPageUrl("LineCleaningDetail") + `?id=${lineCleaning.id}`;
    }
  };

  const handleLineTrainingComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["helper-trainings"] });
    setLineTrainingModalOpen(false);
    if (selectedLineCleaning) {
      window.location.href = createPageUrl("LineCleaningDetail") + `?id=${selectedLineCleaning.id}`;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("selectedHelper");
    localStorage.removeItem("helperSession");
    window.location.href = createPageUrl("Home");
  };

  if (isLoading || !helper) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  const initials = helper.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50">
      <div className="w-full px-3 sm:px-4 md:px-6 max-w-5xl mx-auto py-4 sm:py-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>

          <div className="flex items-center gap-2">
            <HandHelping className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-semibold text-slate-900">{helper.name}</span>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">Helper</Badge>
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 w-9 p-0 rounded-full">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Helper Account Restrictions</p>
              <p className="text-sm text-amber-700">
                Some tasks require training completion before you can sign off. High-priority tasks may be blocked until training is complete.
              </p>
            </div>
          </div>
        </Card>

        {/* My Active Tasks */}
        {myTasks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">My Active Tasks</h2>
            <div className="space-y-3">
              {myTasks.map(task => {
                const trainingCheck = checkTrainingRequirement(task);
                return (
                  <Card key={task.id} className="p-4 bg-white border-2 border-amber-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{task.title}</h3>
                          {trainingCheck.required && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <GraduationCap className="w-3 h-3 mr-1" />
                              Training Required
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{task.area}</span>
                          {task.frequency && (
                            <>
                              <span>•</span>
                              <span>{task.frequency}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {task.status === "pending" && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStartTask(task)}
                            disabled={trainingCheck.isBlocked}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          onClick={() => handleCompleteTask(task)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Line Cleanings */}
        <HelperLineCleaningSection
          lineCleanings={lineCleanings}
          assets={assets}
          trainingDocs={trainingDocuments}
          helperTrainings={helperTrainings}
          onSelectLineCleaning={handleSelectLineCleaning}
        />

        {/* Available Tasks */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Tasks</h2>
          {availableTasks.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No tasks available</p>
              <p className="text-slate-500 text-sm">Check back later for available tasks</p>
            </Card>
          ) : (
            <HelperTaskList
              tasks={availableTasks}
              onSelectTask={handleSelectTask}
              checkTrainingRequirement={checkTrainingRequirement}
            />
          )}
        </div>
      </div>

      {/* Complete Task Modal */}
      <CompleteTaskModal
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        task={taskToComplete}
        onComplete={handleConfirmComplete}
        isLoading={updateTaskMutation.isPending}
      />

      {/* Training Modal */}
      <HelperTrainingModal
        open={trainingModalOpen}
        onOpenChange={setTrainingModalOpen}
        helper={helper}
        task={taskRequiringTraining}
        onComplete={handleTrainingComplete}
      />

      {/* Line Training Modal */}
      <HelperLineTrainingModal
        open={lineTrainingModalOpen}
        onOpenChange={setLineTrainingModalOpen}
        helper={helper}
        lineCleaning={selectedLineCleaning}
        pendingTrainings={pendingLineTrainings}
        onAllComplete={handleLineTrainingComplete}
      />
    </div>
  );
}