import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { getTranslation } from "@/components/i18n/translations";

export default function AnonymousFeedbackModal({ open, onOpenChange, onSubmit, isLoading, language = "en" }) {
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("recognition");

  const t = (cat, key, fallback) => getTranslation(cat, key, language) || fallback;

  const handleSubmit = () => {
    if (feedback.trim()) {
      onSubmit({
        feedback: feedback.trim(),
        category,
        recipient_type: "team" // Anonymous feedback goes to the whole management team
      });
      setFeedback("");
      setCategory("recognition");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("anonymousFeedback", "title", "Anonymous Feedback to Manager")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            💡 {t("anonymousFeedback", "disclaimer", "Your name will not be included with this feedback. It will be sent anonymously to your manager.")}
          </div>

          <div>
            <Label htmlFor="category">{t("peerFeedback", "category", "Category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recognition">{t("anonymousFeedback", "recognition", "Recognition/Praise")}</SelectItem>
                <SelectItem value="suggestion">{t("anonymousFeedback", "suggestion", "Suggestion")}</SelectItem>
                <SelectItem value="concern">{t("anonymousFeedback", "concern", "Concern")}</SelectItem>
                <SelectItem value="other">{t("peerFeedback", "other", "Other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="feedback">{t("anonymousFeedback", "yourFeedback", "Your Feedback")}</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t("anonymousFeedback", "placeholder", "Share your thoughts, suggestions, or recognition...")}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-slate-500 mt-1">{feedback.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common", "cancel", "Cancel")}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !feedback.trim()}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {t("anonymousFeedback", "submitAnonymously", "Submit Anonymously")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}