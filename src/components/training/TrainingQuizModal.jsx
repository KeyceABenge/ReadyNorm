import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, XCircle, Loader2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation, useContentTranslation } from "@/components/i18n";

export default function TrainingQuizModal({ 
  quiz, 
  onPass, 
  onFail,
  isSubmitting,
  employeeLanguage
}) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const { t, language } = useTranslation();
  
  // Use employee's preferred language
  const lang = employeeLanguage || language;

  const questions = quiz?.questions || [];

  // Prepare content for translation (questions and options) as object format
  const contentToTranslate = useMemo(() => {
    if (lang === "en" || questions.length === 0) return {};
    const content = {};
    questions.forEach((q, qIdx) => {
      if (q.question) content[`q_${qIdx}`] = q.question;
      q.options?.forEach((opt, oIdx) => {
        if (opt) content[`q_${qIdx}_opt_${oIdx}`] = opt;
      });
    });
    return content;
  }, [questions, lang]);

  const { translatedContent, isTranslating } = useContentTranslation(contentToTranslate, lang);
  
  // Helper to get translated text
  const tr = (id, fallback) => translatedContent[id] || fallback;

  const handleSelectAnswer = (questionIndex, optionIndex) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleSubmit = () => {
    // Calculate results
    let correct = 0;
    const questionResults = questions.map((q, idx) => {
      const isCorrect = answers[idx] === q.correct_answer;
      if (isCorrect) correct++;
      return {
        questionIndex: idx,
        selectedAnswer: answers[idx],
        correctAnswer: q.correct_answer,
        isCorrect
      };
    });

    const passed = correct >= Math.ceil(questions.length * 0.8); // 80% to pass
    setResults({
      correct,
      total: questions.length,
      passed,
      questionResults
    });
    setSubmitted(true);

    if (passed) {
      setTimeout(() => onPass(), 1500);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setResults(null);
  };

  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  if (!quiz || questions.length === 0) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">Loading quiz questions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Banner */}
      {submitted && results && (
        <Card className={cn(
          "border-2",
          results.passed ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"
        )}>
          <CardContent className="p-4 flex items-center gap-3">
            {results.passed ? (
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
            <div className="flex-1">
              <p className={cn("font-semibold", results.passed ? "text-emerald-700" : "text-red-700")}>
                {results.passed ? t("training", "quizPassed", "Quiz Passed!") : t("training", "quizNotPassed", "Quiz Not Passed")}
              </p>
              <p className="text-sm text-slate-600">
                {t("training", "youGot", "You got")} {results.correct} {t("common", "outOf", "out of")} {results.total} {t("training", "correct", "correct")} ({Math.round(results.correct / results.total * 100)}%)
              </p>
              {!results.passed && (
                <p className="text-sm text-slate-500 mt-1">
                  {t("training", "need80ToPass", "You need 80% to pass. Please review and try again.")}
                </p>
              )}
            </div>
            {!results.passed && (
              <Button onClick={handleRetry} variant="outline">
                {t("common", "tryAgain", "Try Again")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qIdx) => {
          const questionResult = results?.questionResults?.find(r => r.questionIndex === qIdx);
          
          return (
            <Card key={qIdx} className={cn(
              "border",
              submitted && questionResult?.isCorrect && "border-emerald-300 bg-emerald-50/50",
              submitted && !questionResult?.isCorrect && "border-red-300 bg-red-50/50"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Badge variant="outline" className="flex-shrink-0">Q{qIdx + 1}</Badge>
                  <p className="font-medium text-slate-900">{tr(`q_${qIdx}`, q.question)}</p>
                </div>
                <div className="space-y-2 ml-8">
                  {q.options.map((option, oIdx) => {
                    const isSelected = answers[qIdx] === oIdx;
                    const isCorrect = q.correct_answer === oIdx;
                    const showCorrect = submitted && isCorrect;
                    const showWrong = submitted && isSelected && !isCorrect;

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectAnswer(qIdx, oIdx)}
                        disabled={submitted}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all",
                          !submitted && isSelected && "border-blue-500 bg-blue-50",
                          !submitted && !isSelected && "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                          showCorrect && "border-emerald-500 bg-emerald-100",
                          showWrong && "border-red-500 bg-red-100",
                          submitted && !showCorrect && !showWrong && "border-slate-200 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                            !submitted && isSelected && "bg-blue-500 text-white",
                            !submitted && !isSelected && "bg-slate-200 text-slate-600",
                            showCorrect && "bg-emerald-500 text-white",
                            showWrong && "bg-red-500 text-white"
                          )}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="text-sm">{tr(`q_${qIdx}_opt_${oIdx}`, option)}</span>
                          {showCorrect && <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto" />}
                          {showWrong && <XCircle className="w-4 h-4 text-red-600 ml-auto" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Button */}
      {!submitted && (
        <Button 
          onClick={handleSubmit}
          disabled={!allAnswered || isSubmitting}
          className="w-full bg-slate-900 hover:bg-slate-800"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("common", "submitting", "Submitting...")}
            </>
          ) : (
            `${t("training", "submitAnswers", "Submit Answers")} (${Object.keys(answers).length}/${questions.length})`
          )}
        </Button>
      )}

      {!allAnswered && !submitted && (
        <p className="text-center text-sm text-slate-500">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          {t("training", "answerAllQuestions", "Please answer all questions before submitting")}
        </p>
      )}
    </div>
  );
}