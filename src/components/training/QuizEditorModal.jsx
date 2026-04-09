// @ts-nocheck
import { useState, useEffect } from "react";

import { TrainingQuizRepo } from "@/lib/adapters/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Loader2, Plus, Trash2, CheckCircle, Sparkles, Save, HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function QuizEditorModal({ 
  open, 
  onOpenChange, 
  document, 
  existingQuiz,
  organizationId,
  onSave 
}) {
  const [questions, setQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingQuiz?.questions) {
      setQuestions(existingQuiz.questions);
    } else {
      setQuestions([]);
    }
  }, [existingQuiz, open]);

  const generateQuestions = async () => {
    setIsGenerating(true);
    try {
      const prompt = `You are analyzing a training document titled "${document.title}" of type "${document.type}".
      
Document description: ${document.description || "No description provided"}
Document URL: ${document.file_url}

Based on this training material, generate 4 multiple choice questions that test employee understanding of the key concepts, procedures, or safety information. Each question should be practical and relevant to workplace application.

Return ONLY a valid JSON object with this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0
    }
  ]
}

Where correct_answer is the index (0-3) of the correct option.`;

      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "number" }
                }
              }
            }
          }
        }
      });

      const generatedQuestions = response.questions || [];
      setQuestions(generatedQuestions);
      toast.success("Questions generated! Review and edit as needed.");
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateQuestion = (index, field, value) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const updateOption = (qIndex, oIndex, value) => {
    setQuestions(prev => prev.map((q, i) => 
      i === qIndex ? { 
        ...q, 
        options: q.options.map((o, j) => j === oIndex ? value : o) 
      } : q
    ));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      question: "",
      options: ["", "", "", ""],
      correct_answer: 0
    }]);
  };

  const removeQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (status) => {
    if (questions.length === 0) {
      toast.error("Please add at least one question");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} is empty`);
        return;
      }
      if (q.options.some(o => !o.trim())) {
        toast.error(`Question ${i + 1} has empty options`);
        return;
      }
    }

    setIsSaving(true);
    try {
      if (existingQuiz?.id) {
        await TrainingQuizRepo.update(existingQuiz.id, {
          questions,
          status
        });
      } else {
        await TrainingQuizRepo.create({
          organization_id: organizationId,
          document_id: document.id,
          document_title: document.title,
          questions,
          status
        });
      }

      toast.success(status === "approved" ? "Quiz approved and saved!" : "Quiz saved as draft");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error("Failed to save quiz");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Quiz for: {document?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Generate Button */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={generateQuestions}
              disabled={isGenerating}
              variant="outline"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Questions with AI
                </>
              )}
            </Button>
            <Button onClick={addQuestion} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Question
            </Button>
          </div>

          {/* Questions List */}
          {questions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
              <HelpCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No questions yet</p>
              <p className="text-sm">Generate with AI or add manually</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <Card key={qIdx}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge>Q{qIdx + 1}</Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500"
                        onClick={() => removeQuestion(qIdx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Question</Label>
                      <Input
                        value={q.question}
                        onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                        placeholder="Enter question..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((option, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(qIdx, "correct_answer", oIdx)}
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors",
                              q.correct_answer === oIdx 
                                ? "bg-emerald-500 text-white" 
                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                            )}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </button>
                          <Input
                            value={option}
                            onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                            className="flex-1"
                          />
                          {q.correct_answer === oIdx && (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Click a letter to mark correct answer</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Save Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleSave("generated")}
              disabled={isSaving || questions.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              onClick={() => handleSave("approved")}
              disabled={isSaving || questions.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Approve & Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}