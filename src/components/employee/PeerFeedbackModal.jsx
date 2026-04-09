import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTranslation } from "@/components/i18n/translations";

// Keys for translation lookup
const FEEDBACK_KEYS = {
  teamwork: ["teamwork1", "teamwork2", "teamwork3", "teamwork4"],
  communication: ["communication1", "communication2", "communication3", "communication4"],
  quality: ["quality1", "quality2", "quality3", "quality4"],
  initiative: ["initiative1", "initiative2", "initiative3", "initiative4"],
  helpfulness: ["helpfulness1", "helpfulness2", "helpfulness3", "helpfulness4"],
  other: ["other1", "other2", "other3", "other4"],
};

// Fallback English messages
const FEEDBACK_FALLBACKS = {
  teamwork1: "Great collaboration on the team!",
  teamwork2: "You work really well with others.",
  teamwork3: "Thanks for being such a good team player.",
  teamwork4: "I appreciate how you support the team.",
  communication1: "You communicate clearly and effectively.",
  communication2: "Great job explaining things clearly.",
  communication3: "I appreciate your open communication.",
  communication4: "You listen well to others' ideas.",
  quality1: "Your work quality is excellent.",
  quality2: "I'm impressed with the attention to detail.",
  quality3: "You consistently deliver great results.",
  quality4: "The quality of your work is top-notch.",
  initiative1: "You show great initiative!",
  initiative2: "I appreciate you taking the lead.",
  initiative3: "You don't wait to be asked—great attitude.",
  initiative4: "You're proactive and resourceful.",
  helpfulness1: "You're always willing to help others.",
  helpfulness2: "Thanks for being so helpful to the team.",
  helpfulness3: "I appreciate your willingness to pitch in.",
  helpfulness4: "You make others' jobs easier.",
  other1: "You're doing a great job!",
  other2: "Keep up the excellent work!",
  other3: "I really appreciate what you do.",
  other4: "You're a valuable team member.",
};

export default function PeerFeedbackModal({ open, onOpenChange, selectedEmployee, onSubmit, isLoading, language = "en" }) {
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("other");

  const t = (cat, key, fallback) => getTranslation(cat, key, language) || fallback;

  // Get translated options for current category
  const categoryKeys = FEEDBACK_KEYS[category] || FEEDBACK_KEYS.other;
  const options = categoryKeys.map(key => ({
    key,
    text: t("peerFeedback", key, FEEDBACK_FALLBACKS[key])
  }));

  const handleSelectFeedback = (selectedText) => {
    setFeedback(selectedText);
  };

  const handleSubmit = () => {
    if (feedback.trim()) {
      onSubmit({
        to_email: selectedEmployee.email,
        to_name: selectedEmployee.name,
        feedback: feedback.trim(),
        category
      });
      setFeedback("");
      setCategory("other");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("peerFeedback", "givePositiveFeedbackTo", "Give Positive Feedback to")} {selectedEmployee?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="category">{t("peerFeedback", "category", "Category")}</Label>
            <Select value={category} onValueChange={(val) => {
              setCategory(val);
              setFeedback("");
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teamwork">{t("peerFeedback", "teamwork", "Teamwork")}</SelectItem>
                <SelectItem value="communication">{t("peerFeedback", "communicationCat", "Communication")}</SelectItem>
                <SelectItem value="quality">{t("peerFeedback", "qualityWork", "Quality Work")}</SelectItem>
                <SelectItem value="initiative">{t("peerFeedback", "initiativeCat", "Initiative")}</SelectItem>
                <SelectItem value="helpfulness">{t("peerFeedback", "helpfulness", "Helpfulness")}</SelectItem>
                <SelectItem value="other">{t("peerFeedback", "other", "Other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("peerFeedback", "selectMessage", "Select a Message")}</Label>
            <div className="space-y-2">
              {options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectFeedback(option.text)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border-2 transition-all",
                    feedback === option.text
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-emerald-300 bg-white"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      feedback === option.text ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                    )}>
                      {feedback === option.text && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-slate-700">{option.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common", "cancel", "Cancel")}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !feedback.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {t("peerFeedback", "sendFeedback", "Send Feedback")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}