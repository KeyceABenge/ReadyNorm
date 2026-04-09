/**
 * Employee Q&A Chat Modal
 * Provides AI-powered answers from approved internal sources
 */

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { invokeLLM } from "@/lib/adapters/integrations";
import {
  SSOPRepo, TrainingDocumentRepo, ChemicalRepo, SDSDocumentRepo,
  SiteSettingsRepo, AllergenRepo, ProductionLineRepo, AreaRepo,
  DrainLocationRepo, RoleConfigRepo, TaskRepo, CrewRepo,
  EmployeeQALogRepo
} from "@/lib/adapters/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Send, Loader2, BookOpen, AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const QUICK_QUESTIONS = [
  "What PPE do I need for this task?",
  "What is the correct chemical dilution?",
  "What does each color code mean?",
  "What are the allergen handling rules?",
  "What are the shift hours?",
  "How do I report a quality issue?"
];

const SAFETY_KEYWORDS = [
  "loto", "lockout", "tagout", "chemical", "hazard", "emergency",
  "allergen", "recall", "injury", "accident", "spill", "fire"
];

export default function EmployeeQAModal({
  open,
  onOpenChange,
  context = "general",
  contextId = null,
  contextTitle = null,
  organizationId,
  employee
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch internal sources for context
  const { data: ssops = [] } = useQuery({
    queryKey: ["qa_ssops", organizationId],
    queryFn: () => SSOPRepo.filter({ organization_id: organizationId, status: "published" }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: trainingDocs = [] } = useQuery({
    queryKey: ["qa_training_docs", organizationId],
    queryFn: () => TrainingDocumentRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: chemicals = [] } = useQuery({
    queryKey: ["qa_chemicals", organizationId],
    queryFn: () => ChemicalRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: sdsDocuments = [] } = useQuery({
    queryKey: ["qa_sds_documents", organizationId],
    queryFn: () => SDSDocumentRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["qa_site_settings", organizationId],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: allergens = [] } = useQuery({
    queryKey: ["qa_allergens", organizationId],
    queryFn: () => AllergenRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: productionLines = [] } = useQuery({
    queryKey: ["qa_production_lines", organizationId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["qa_areas", organizationId],
    queryFn: () => AreaRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: drainLocations = [] } = useQuery({
    queryKey: ["qa_drains", organizationId],
    queryFn: () => DrainLocationRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: roleConfigs = [] } = useQuery({
    queryKey: ["qa_roles", organizationId],
    queryFn: () => RoleConfigRepo.filter({ organization_id: organizationId, is_active: true }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["qa_tasks", organizationId],
    queryFn: () => TaskRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  const { data: crews = [] } = useQuery({
    queryKey: ["qa_crews", organizationId],
    queryFn: () => CrewRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId && open,
    staleTime: 300000
  });

  // Initialize with welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      const welcomeMsg = {
        role: "assistant",
        content: getWelcomeMessage()
      };
      setMessages([welcomeMsg]);
    }
  }, [open, context, contextTitle]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const getWelcomeMessage = () => {
    if (context === "task" && contextTitle) {
      return `👋 Hi! I can help answer questions about **${contextTitle}**.\n\nAsk me about the procedure, required PPE, chemicals to use, or any quality standards. I'll only use our approved site documentation to answer.`;
    }
    if (context === "training" && contextTitle) {
      return `👋 Hi! I can help clarify anything about **${contextTitle}**.\n\nFeel free to ask questions about the content, procedures, or how to apply what you've learned.`;
    }
    return "👋 Hi! I'm your Sanitation & Quality Q&A assistant.\n\nI can answer questions about:\n- Cleaning procedures & SSOPs\n- Chemical safety, PPE & SDS info\n- Color coding system\n- Shift hours & schedules\n- Allergen handling\n- Production lines & areas\n- Drain locations\n- Role responsibilities\n- Task procedures\n\nAll my answers come from our approved site documentation.";
  };

  const buildSourceContext = () => {
    // Build FULL content from available sources for the LLM to use
    let sourceContext = "AVAILABLE INTERNAL SOURCES (USE THIS CONTENT TO ANSWER):\n\n";

    // Add SSOPs with FULL content
    if (ssops.length > 0) {
      sourceContext += "=== SSOP DOCUMENTS ===\n\n";
      ssops.forEach(ssop => {
        sourceContext += `### ${ssop.title} (Source ID: ${ssop.id})\n`;
        if (ssop.description) sourceContext += `Description: ${ssop.description}\n`;
        if (ssop.content) {
          sourceContext += `\nFULL CONTENT:\n${ssop.content}\n`;
        }
        if (ssop.steps && ssop.steps.length > 0) {
          sourceContext += `\nSTEPS:\n`;
          ssop.steps.forEach((step, i) => {
            sourceContext += `${i + 1}. ${step}\n`;
          });
        }
        sourceContext += "\n---\n\n";
      });
    }

    // Add Training Documents with FULL content
    if (trainingDocs.length > 0) {
      sourceContext += "=== TRAINING DOCUMENTS ===\n\n";
      trainingDocs.forEach(doc => {
        sourceContext += `### ${doc.title} (Source ID: ${doc.id})\n`;
        if (doc.description) sourceContext += `Description: ${doc.description}\n`;
        if (doc.content) {
          sourceContext += `\nFULL CONTENT:\n${doc.content}\n`;
        }
        if (doc.learning_objectives) {
          sourceContext += `\nLearning Objectives: ${doc.learning_objectives}\n`;
        }
        if (doc.key_points && doc.key_points.length > 0) {
          sourceContext += `\nKey Points:\n`;
          doc.key_points.forEach((point, i) => {
            sourceContext += `- ${point}\n`;
          });
        }
        sourceContext += "\n---\n\n";
      });
    }

    // Add Chemicals with full details
    if (chemicals.length > 0) {
      sourceContext += "=== APPROVED CHEMICALS ===\n\n";
      chemicals.forEach(chem => {
        sourceContext += `### ${chem.name}\n`;
        sourceContext += `- Dilution Ratio: ${chem.dilution_ratio || 'N/A'}\n`;
        sourceContext += `- Contact Time: ${chem.contact_time || 'N/A'} minutes\n`;
        if (chem.usage_instructions) sourceContext += `- Usage Instructions: ${chem.usage_instructions}\n`;
        if (chem.safety_precautions) sourceContext += `- Safety Precautions: ${chem.safety_precautions}\n`;
        if (chem.ppe_required) sourceContext += `- PPE Required: ${chem.ppe_required}\n`;
        sourceContext += "\n";
      });
      sourceContext += "---\n\n";
    }

    // Add SDS Documents with FULL details
    if (sdsDocuments.length > 0) {
      sourceContext += "=== SAFETY DATA SHEETS (SDS) ===\n\n";
      sdsDocuments.forEach(sds => {
        sourceContext += `### SDS: ${sds.chemical_name} (Manufacturer: ${sds.manufacturer || 'N/A'})\n`;
        if (sds.product_code) sourceContext += `- Product Code: ${sds.product_code}\n`;
        if (sds.cas_number) sourceContext += `- CAS Number: ${sds.cas_number}\n`;
        if (sds.signal_word && sds.signal_word !== 'none') sourceContext += `- Signal Word: ${sds.signal_word.toUpperCase()}\n`;
        if (sds.ghs_hazard_classes?.length > 0) sourceContext += `- GHS Hazard Classes: ${sds.ghs_hazard_classes.join(', ')}\n`;
        if (sds.ppe_required?.length > 0) sourceContext += `- **PPE Required**: ${sds.ppe_required.join(', ')}\n`;
        if (sds.first_aid_summary) sourceContext += `- **First Aid**: ${sds.first_aid_summary}\n`;
        if (sds.dilution_food_contact) sourceContext += `- Dilution (Food Contact): ${sds.dilution_food_contact}${sds.dilution_food_contact_ppm ? ` (${sds.dilution_food_contact_ppm} ppm)` : ''}\n`;
        if (sds.dilution_non_food_contact) sourceContext += `- Dilution (Non-Food Contact): ${sds.dilution_non_food_contact}${sds.dilution_non_food_contact_ppm ? ` (${sds.dilution_non_food_contact_ppm} ppm)` : ''}\n`;
        if (sds.dilution_heavy_duty) sourceContext += `- Dilution (Heavy Duty): ${sds.dilution_heavy_duty}\n`;
        if (sds.dilution_notes) sourceContext += `- Dilution Notes: ${sds.dilution_notes}\n`;
        if (sds.storage_location) sourceContext += `- Storage: ${sds.storage_location}\n`;
        if (sds.emergency_contact) sourceContext += `- Emergency Contact: ${sds.emergency_contact}\n`;
        if (sds.notes) sourceContext += `- Additional Notes: ${sds.notes}\n`;
        sourceContext += "\n---\n\n";
      });
    }

    // Add Site Settings
    const settings = siteSettings[0];
    if (settings) {
      sourceContext += "=== SITE STANDARDS ===\n\n";
      if (settings.color_coding_categories?.length > 0) {
        sourceContext += "COLOR CODING SYSTEM:\n";
        settings.color_coding_categories.forEach(cat => {
          sourceContext += `\n**${cat.name}**${cat.description ? ` - ${cat.description}` : ''}:\n`;
          if (cat.items?.length > 0) {
            cat.items.forEach(item => {
              sourceContext += `  - ${item.color_name || item.color}: ${item.label}\n`;
            });
          }
        });
        sourceContext += "\n";
      }
      if (settings.facility_colors?.length > 0 && (!settings.color_coding_categories || settings.color_coding_categories.length === 0)) {
        sourceContext += `Color Coding System: ${JSON.stringify(settings.facility_colors, null, 2)}\n\n`;
      }
      if (settings.shifts?.length > 0) {
        sourceContext += "SHIFT SCHEDULE:\n";
        settings.shifts.forEach(shift => {
          sourceContext += `  - ${shift.name}: ${shift.start_time} to ${shift.end_time}\n`;
        });
        sourceContext += "\n";
      }
      if (settings.task_quotas && Object.keys(settings.task_quotas).length > 0) {
        sourceContext += "TASK QUOTAS PER SHIFT:\n";
        Object.entries(settings.task_quotas).forEach(([freq, count]) => {
          sourceContext += `  - ${freq}: ${count} tasks\n`;
        });
        sourceContext += "\n";
      }
      if (settings.auto_end_settings) {
        sourceContext += "AUTO SESSION END SETTINGS:\n";
        sourceContext += `  - Grace period: ${settings.auto_end_settings.grace_period_minutes || 60} minutes after shift\n`;
        sourceContext += `  - Idle threshold: ${settings.auto_end_settings.idle_threshold_minutes || 30} minutes\n\n`;
      }
      if (settings.raw_rte_rules) sourceContext += `Raw vs RTE Rules: ${settings.raw_rte_rules}\n\n`;
      if (settings.allergen_policy) sourceContext += `Allergen Policy: ${settings.allergen_policy}\n\n`;
      if (settings.sanitation_standards) sourceContext += `Sanitation Standards: ${settings.sanitation_standards}\n\n`;
      sourceContext += "---\n\n";
    }

    // Add Allergens
    if (allergens.length > 0) {
      sourceContext += "=== ALLERGENS ===\n\n";
      allergens.forEach(a => {
        sourceContext += `- **${a.name}**${a.description ? `: ${a.description}` : ''}\n`;
        if (a.color) sourceContext += `  Color code: ${a.color}\n`;
      });
      sourceContext += "\n---\n\n";
    }

    // Add Production Lines
    if (productionLines.length > 0) {
      sourceContext += "=== PRODUCTION LINES ===\n\n";
      productionLines.forEach(line => {
        sourceContext += `- **${line.name}**${line.description ? `: ${line.description}` : ''}\n`;
      });
      sourceContext += "\n---\n\n";
    }

    // Add Areas
    if (areas.length > 0) {
      sourceContext += "=== CLEANING AREAS ===\n\n";
      areas.forEach(area => {
        sourceContext += `- **${area.name}**${area.description ? `: ${area.description}` : ''}\n`;
        if (area.sequence_number != null) sourceContext += `  Sequence: ${area.sequence_number}\n`;
      });
      sourceContext += "\n---\n\n";
    }

    // Add Drain Locations
    if (drainLocations.length > 0) {
      sourceContext += "=== DRAIN LOCATIONS ===\n\n";
      drainLocations.forEach(drain => {
        sourceContext += `- **${drain.name || drain.drain_id}**`;
        if (drain.location) sourceContext += ` - Location: ${drain.location}`;
        if (drain.zone) sourceContext += ` - Zone: ${drain.zone}`;
        if (drain.frequency) sourceContext += ` - Cleaning frequency: ${drain.frequency}`;
        sourceContext += "\n";
      });
      sourceContext += "\n---\n\n";
    }

    // Add Role Configs
    if (roleConfigs.length > 0) {
      sourceContext += "=== ROLES & RESPONSIBILITIES ===\n\n";
      roleConfigs.forEach(role => {
        sourceContext += `### ${role.role_name}${role.department ? ` (${role.department})` : ''}\n`;
        if (role.description) sourceContext += `${role.description}\n`;
        if (role.responsibilities?.length > 0) {
          sourceContext += `Responsibilities:\n`;
          role.responsibilities.forEach(r => sourceContext += `  - ${r}\n`);
        }
        if (role.reports_to) sourceContext += `Reports to: ${role.reports_to}\n`;
        sourceContext += "\n";
      });
      sourceContext += "---\n\n";
    }

    // Add Tasks (summary — titles, areas, frequencies, descriptions)
    if (tasks.length > 0) {
      sourceContext += "=== TASKS ===\n\n";
      tasks.filter(t => !t.is_group).slice(0, 100).forEach(task => {
        sourceContext += `- **${task.title}**`;
        if (task.area) sourceContext += ` | Area: ${task.area}`;
        if (task.frequency) sourceContext += ` | Frequency: ${task.frequency}`;
        if (task.category) sourceContext += ` | Category: ${task.category}`;
        sourceContext += "\n";
        if (task.description) sourceContext += `  ${task.description.slice(0, 200)}\n`;
      });
      sourceContext += "\n---\n\n";
    }

    // Add Crews
    if (crews.length > 0) {
      sourceContext += "=== CREWS ===\n\n";
      crews.forEach(crew => {
        sourceContext += `- **${crew.name}**`;
        if (crew.shift_start_time && crew.shift_end_time) sourceContext += ` | Hours: ${crew.shift_start_time} - ${crew.shift_end_time}`;
        if (crew.members?.length > 0) sourceContext += ` | ${crew.members.length} members`;
        sourceContext += "\n";
      });
      sourceContext += "\n---\n\n";
    }

    return sourceContext;
  };

  const isSafetyCritical = (question) => {
    const lowerQuestion = question.toLowerCase();
    return SAFETY_KEYWORDS.some(keyword => lowerQuestion.includes(keyword));
  };

  const handleSend = async (questionText = inputValue) => {
    if (!questionText.trim() || isLoading) return;

    const userMessage = { role: "user", content: questionText };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const sourceContext = buildSourceContext();
      const isSafety = isSafetyCritical(questionText);

      const prompt = `${sourceContext}

CURRENT CONTEXT: ${context === "task" ? `Employee is working on task: ${contextTitle}` : context === "training" ? `Employee is viewing training: ${contextTitle}` : "General question from employee dashboard"}

EMPLOYEE QUESTION: ${questionText}

EMPLOYEE'S PREFERRED LANGUAGE: ${employee?.preferred_language === 'es' ? 'Spanish' : employee?.preferred_language === 'fr' ? 'French' : employee?.preferred_language === 'pt' ? 'Portuguese' : employee?.preferred_language === 'zh' ? 'Chinese' : employee?.preferred_language === 'vi' ? 'Vietnamese' : employee?.preferred_language === 'ko' ? 'Korean' : employee?.preferred_language === 'tl' ? 'Tagalog' : 'English'}

INSTRUCTIONS:
1. READ the full content from the sources above and EXTRACT the specific information that answers the question
2. Provide the ACTUAL steps, procedures, or information - DO NOT just tell them to "refer to the document"
3. Format as numbered steps if it's a procedure
4. Keep it concise and mobile-friendly
5. ALWAYS cite your source at the end (e.g., "Source: [Document Title]")
6. If the answer is NOT found in any source above, respond EXACTLY: "This is not covered in our site standards—please ask your lead or manager."
${isSafety ? '7. This is a SAFETY-CRITICAL topic - add: "⚠️ Safety Note: Please verify this with your supervisor before proceeding."' : ''}
8. Respond in the employee's preferred language listed above (translate your answer if not English)

IMPORTANT: Give the ACTUAL answer with specific details from the content, not just a reference to read the document.

Provide your answer:`;

      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            source_used: { type: "string" },
            source_type: { type: "string", enum: ["ssop", "training_doc", "site_settings", "chemical", "sds", "allergen", "production_line", "area", "drain", "role", "task", "crew", "no_source"] },
            topic_category: { type: "string", enum: ["sanitation", "food_safety", "quality", "chemicals", "allergens", "ppe", "equipment", "training", "color_coding", "shifts", "roles", "drains", "tasks", "lines", "crews", "other"] },
            was_answered: { type: "boolean" }
          }
        }
      });

      const assistantMessage = { 
        role: "assistant", 
        content: response.answer,
        source: response.source_used,
        sourceType: response.source_type,
        isSafety
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Log the question for training gap analysis
      try {
        await EmployeeQALogRepo.create({
          organization_id: organizationId,
          employee_id: employee?.id,
          employee_name: employee?.name,
          question: questionText,
          topic_category: response.topic_category,
          source_used: response.source_used,
          source_type: response.source_type,
          was_answered: response.was_answered,
          context_type: context,
          context_id: contextId,
          flagged_for_review: !response.was_answered || isSafety
        });
      } catch (logError) {
        console.log("Failed to log Q&A:", logError);
      }

    } catch (error) {
      console.error("Q&A error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again or ask your supervisor for help.",
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    handleSend(question);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[85vh] sm:h-[620px] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <img 
              src="/readynorm-logo-main.svg" 
              alt="Q&A Assistant" 
              className="w-11 h-11 rounded-full bg-white object-cover border-2 border-white/30"
            />
            <div>
              <p className="text-xs text-blue-100 font-medium">Chat with</p>
              <DialogTitle className="text-white text-lg font-bold">Q&A Assistant</DialogTitle>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-blue-100">
              {contextTitle ? `Helping with: ${contextTitle}` : "Documentation Assistant"}
            </span>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50/50" ref={scrollRef}>
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] px-4 py-2.5 text-sm",
                    message.role === "user"
                      ? "bg-white border border-slate-200 rounded-2xl rounded-br-md text-slate-800 shadow-sm"
                      : message.isError
                      ? "bg-red-50 border border-red-200 rounded-2xl rounded-bl-md text-red-800"
                      : "bg-blue-500 text-white rounded-2xl rounded-bl-md shadow-sm"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="space-y-2">
                      <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-blue-200 [&_strong]:text-white [&_li]:text-white/90">
                        {message.content}
                      </ReactMarkdown>
                      
                      {message.isSafety && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-amber-400/20 border border-amber-300/30 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-amber-200 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-100">
                            <strong>Safety Note:</strong> Verify with your supervisor before proceeding.
                          </p>
                        </div>
                      )}

                      {message.source && message.sourceType !== "no_source" && (
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/20">
                          <BookOpen className="w-3 h-3 text-blue-200" />
                          <span className="text-xs text-blue-100">
                            {message.source}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-blue-500 text-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm opacity-80">Searching docs...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <div className="px-4 py-2 border-t bg-white">
            <p className="text-xs text-slate-400 mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  className="text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                  onClick={() => handleQuickQuestion(q)}
                  disabled={isLoading}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 bg-white border-t flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={isLoading}
              style={{ fontSize: 16 }}
              className="flex-1 bg-transparent border-none outline-none placeholder:text-slate-400 min-h-[44px] min-w-0"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                inputValue.trim() && !isLoading
                  ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                  : "bg-blue-300"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Send className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}