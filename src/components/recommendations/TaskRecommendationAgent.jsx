import { useState, useEffect } from "react";
import { invokeLLM } from "@/lib/adapters/integrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, ChevronDown, ChevronUp, Plus, GraduationCap, 
  Target, BookOpen, AlertTriangle, RotateCcw, Shield,
  Loader2, RefreshCw, Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation, SUPPORTED_LANGUAGES } from "@/components/i18n";

// Labels are now translated in the component using the t() function
const REASON_CONFIG = {
  coverage: { 
    icon: Target, 
    color: "bg-blue-100 text-blue-700 border-blue-200",
    labelKey: "coverageGap"
  },
  learning: { 
    icon: BookOpen, 
    color: "bg-purple-100 text-purple-700 border-purple-200",
    labelKey: "skillBuilding"
  },
  backlog: { 
    icon: AlertTriangle, 
    color: "bg-amber-100 text-amber-700 border-amber-200",
    labelKey: "backlog"
  },
  priority: { 
    icon: Shield, 
    color: "bg-rose-100 text-rose-700 border-rose-200",
    labelKey: "highPriority"
  },
  rotation: { 
    icon: RotateCcw, 
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    labelKey: "crossTraining"
  },
  training_opportunity: {
    icon: GraduationCap,
    color: "bg-amber-100 text-amber-700 border-amber-200",
    labelKey: "trainingOpportunity"
  }
};

export default function TaskRecommendationAgent({ 
  employee,
  tasks,
  employeeTrainings,
  taskHistory = [],
  selectedTasks,
  onSelectTask,
  onSelectTraining,
  config = {},
  translatedContent = {} // Accept translated content from parent
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState(null);
  const [translatedExplanations, setTranslatedExplanations] = useState({});
  const { t, language } = useTranslation();
  
  // Helper to get translated task content from parent
  const tr = (id, fallback) => translatedContent[id] || fallback;

  const {
    rotationAggressiveness = 'balanced', // 'conservative', 'balanced', 'aggressive'
    maxRecommendations = 5,
    protectedTaskIds = [],
    traineeLimit = 2 // max new task types to suggest
  } = config;

  useEffect(() => {
    if (employee && tasks.length > 0) {
      generateRecommendations();
    }
  }, [employee?.id, tasks.length]);

  const generateRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Analyze employee's task history
      const completedTaskIds = taskHistory.map(t => t.id);
      const tasksByArea = {};
      const tasksByCategory = {};
      
      taskHistory.forEach(task => {
        tasksByArea[task.area] = (tasksByArea[task.area] || 0) + 1;
        if (task.category) {
          tasksByCategory[task.category] = (tasksByCategory[task.category] || 0) + 1;
        }
      });

      // Get trained task IDs
      const trainedDocIds = employeeTrainings.map(t => t.document_id);
      
      // Filter available tasks (not completed) - include tasks needing training too
      const availableTasks = tasks.filter(task => {
        if (task.status === 'completed' || task.status === 'verified') return false;
        if (task.is_group) return false;
        if (selectedTasks.includes(task.id)) return false;
        return true;
      });

      // Score each available task
      const scoredTasks = availableTasks.map(task => {
        let score = 0;
        let reasons = [];
        
        // Check if task needs training
        const needsTraining = task.required_training_id && !trainedDocIds.includes(task.required_training_id);

        // Priority scoring
        if (task.priority === 'critical') {
          score += 50;
          reasons.push({ type: 'priority', weight: 50 });
        } else if (task.priority === 'high') {
          score += 30;
          reasons.push({ type: 'priority', weight: 30 });
        }

        // Overdue/backlog scoring
        if (task.status === 'overdue' || (task.due_date && new Date(task.due_date) < new Date())) {
          score += 40;
          reasons.push({ type: 'backlog', weight: 40 });
        }

        // Cross-training scoring (areas employee rarely works in)
        const areaCount = tasksByArea[task.area] || 0;
        const avgAreaCount = Object.values(tasksByArea).reduce((a, b) => a + b, 0) / Math.max(Object.keys(tasksByArea).length, 1);
        
        if (areaCount < avgAreaCount * 0.5) {
          const rotationBonus = rotationAggressiveness === 'aggressive' ? 35 : 
                                rotationAggressiveness === 'balanced' ? 25 : 15;
          score += rotationBonus;
          reasons.push({ type: areaCount === 0 ? 'learning' : 'rotation', weight: rotationBonus });
        }

        // Coverage gap (tasks with no recent completions)
        if (!task.assigned_to || task.assigned_to === employee?.email) {
          score += 15;
          reasons.push({ type: 'coverage', weight: 15 });
        }

        // Penalize protected tasks slightly if employee hasn't done them
        if (protectedTaskIds.includes(task.id) && areaCount === 0) {
          score -= 10;
        }

        // Get primary reason
        const primaryReason = reasons.sort((a, b) => b.weight - a.weight)[0];

        return {
          task,
          score,
          reason: primaryReason?.type || 'coverage',
          reasons,
          needsTraining,
          trainingId: needsTraining ? task.required_training_id : null,
          trainingTitle: needsTraining ? task.required_training_title : null
        };
      });

      // Sort by score and limit
      const topRecommendations = scoredTasks
        .sort((a, b) => b.score - a.score)
        .slice(0, maxRecommendations);

      // Generate explanations
      const lang = employee?.preferred_language || language;
      const finalRecommendations = topRecommendations.map(rec => ({
        ...rec,
        explanation: generateExplanation(rec, tasksByArea, employee, lang)
      }));

      setRecommendations(finalRecommendations);
    } catch (err) {
      console.error("Error generating recommendations:", err);
      setError("Couldn't generate recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  const generateExplanation = (rec, tasksByArea, employee, lang) => {
    const areaCount = tasksByArea[rec.task.area] || 0;
    const areaName = tr(`task_area_${rec.task.id}`, rec.task.area);
    
    // Return key-based explanations that will be translated
    return {
      reason: rec.reason,
      areaCount,
      areaName,
      needsTraining: rec.needsTraining,
      trainingTitle: rec.trainingTitle
    };
  };

  // Translate explanations when language is not English
  useEffect(() => {
    const lang = employee?.preferred_language || language;
    if (lang === "en" || recommendations.length === 0) {
      setTranslatedExplanations({});
      return;
    }

    const translateExplanations = async () => {
      try {
        const langName = SUPPORTED_LANGUAGES.find(l => l.code === lang)?.name || lang;
        const explanationsToTranslate = recommendations.map(rec => {
          const exp = rec.explanation;
          let text = "";
          switch (exp.reason) {
            case 'priority':
              text = "High priority task that needs attention today.";
              break;
            case 'backlog':
              text = "This task is overdue or at risk - completing it helps the team stay on track.";
              break;
            case 'learning':
              text = `You haven't worked in ${exp.areaName} before - great opportunity to build new skills!`;
              break;
            case 'rotation':
              text = `You've done ${exp.areaCount} task${exp.areaCount !== 1 ? 's' : ''} here vs your average - helps build flexibility.`;
              break;
            case 'coverage':
            default:
              text = "Helps ensure coverage across all areas today.";
          }
          if (exp.needsTraining) {
            text += ` ⚠️ Requires training: "${exp.trainingTitle}" - complete training first to start this task.`;
          }
          return { id: rec.task.id, text };
        });

        const textsToTranslate = explanationsToTranslate.map(e => e.text);
        
        const result = await invokeLLM({
          prompt: `Translate the following texts to ${langName}. Keep them short and natural. Return a JSON object where keys are the original texts and values are the translations.\n\nTexts:\n${textsToTranslate.join("\n")}`,
          response_json_schema: {
            type: "object",
            additionalProperties: { type: "string" }
          }
        });

        const translations = {};
        explanationsToTranslate.forEach(item => {
          if (result[item.text]) {
            translations[item.id] = result[item.text];
          }
        });
        setTranslatedExplanations(translations);
      } catch (e) {
        console.error("Error translating explanations:", e);
      }
    };

    translateExplanations();
  }, [recommendations, employee?.preferred_language, language]);

  const getExplanationText = (rec) => {
    const lang = employee?.preferred_language || language;
    
    // If we have a translated version, use it
    if (translatedExplanations[rec.task.id]) {
      return translatedExplanations[rec.task.id];
    }
    
    // Otherwise, generate English version
    const exp = rec.explanation;
    const areaName = tr(`task_area_${rec.task.id}`, rec.task.area);
    
    let text = "";
    switch (exp.reason) {
      case 'priority':
        text = "High priority task that needs attention today.";
        break;
      case 'backlog':
        text = "This task is overdue or at risk - completing it helps the team stay on track.";
        break;
      case 'learning':
        text = `You haven't worked in ${areaName} before - great opportunity to build new skills!`;
        break;
      case 'rotation':
        text = `You've done ${exp.areaCount} task${exp.areaCount !== 1 ? 's' : ''} here vs your average - helps build flexibility.`;
        break;
      case 'coverage':
      default:
        text = "Helps ensure coverage across all areas today.";
    }
    if (exp.needsTraining) {
      text += ` ⚠️ Requires training: "${exp.trainingTitle}" - complete training first to start this task.`;
    }
    return text;
  };

  const handleSelectTask = (rec) => {
    if (rec.needsTraining) {
      onSelectTraining?.(rec.trainingId, rec.trainingTitle);
    } else {
      onSelectTask(rec.task.id);
    }
  };

  if (!employee || tasks.length === 0) return null;

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white mb-6 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-indigo-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">{t("tasks", "taskRecommendations", "Task Recommendations")}</h3>
            <p className="text-xs text-slate-500">{t("tasks", "personalizedForDevelopment", "Personalized for your development")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); generateRecommendations(); }}
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-indigo-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
              <span className="text-sm text-slate-600">{t("messages", "analyzingProfile", "Analyzing your profile...")}</span>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500">{error}</p>
              <Button variant="link" size="sm" onClick={generateRecommendations}>
                {t("messages", "tryAgain", "Try again")}
              </Button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-4">
              <Lightbulb className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">{t("messages", "noRecommendations", "No additional recommendations right now")}</p>
            </div>
          ) : (
            <div className="space-y-2 pt-3">
              {recommendations.map((rec, idx) => {
                const ReasonIcon = REASON_CONFIG[rec.reason]?.icon || Target;
                const reasonStyle = REASON_CONFIG[rec.reason]?.color || "bg-slate-100 text-slate-700";
                const reasonLabelKey = REASON_CONFIG[rec.reason]?.labelKey || "suggested";
                const reasonLabel = t("recommendations", reasonLabelKey, reasonLabelKey);
                const isSelected = selectedTasks.includes(rec.task.id);

                return (
                  <div 
                    key={rec.task.id}
                    className={cn(
                      "flex items-start gap-3 p-2.5 rounded-lg border transition-all",
                      isSelected 
                        ? "bg-indigo-50 border-indigo-300" 
                        : rec.needsTraining 
                          ? "bg-amber-50/50 border-amber-200 hover:border-amber-300"
                          : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={cn("text-xs py-0 px-1.5 border", reasonStyle)}>
                          <ReasonIcon className="w-3 h-3 mr-1" />
                          {reasonLabel}
                        </Badge>
                        {rec.needsTraining && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs py-0 border border-amber-200">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {t("training", "trainingRequired", "Training Required")}
                          </Badge>
                        )}
                      </div>
                      <p className={cn(
                        "font-medium text-sm",
                        isSelected ? "text-indigo-900" : "text-slate-900"
                      )}>
                        {tr(`task_title_${rec.task.id}`, rec.task.title)}
                      </p>
                      {rec.task.area && (
                        <p className="text-xs text-slate-500">{tr(`task_area_${rec.task.id}`, rec.task.area)}</p>
                      )}
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {getExplanationText(rec)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : rec.needsTraining ? "outline" : "default"}
                      className={cn(
                        "h-8 px-3 flex-shrink-0",
                        isSelected 
                          ? "bg-indigo-600" 
                          : rec.needsTraining
                            ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                            : "bg-slate-900 hover:bg-slate-800"
                      )}
                      onClick={() => handleSelectTask(rec)}
                      disabled={isSelected}
                    >
                      {isSelected ? (
                        t("common", "done", "Added")
                      ) : rec.needsTraining ? (
                        <>
                          <GraduationCap className="w-3.5 h-3.5 mr-1" />
                          {t("training", "training", "Train")}
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          {t("tasks", "add", "Add")}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}