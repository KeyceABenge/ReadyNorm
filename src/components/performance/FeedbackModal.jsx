import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function FeedbackModal({ open, onOpenChange, employee, manager, onSubmit, isLoading }) {
  const [feedbackType, setFeedbackType] = useState("general");
  const [subject, setSubject] = useState("");
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (!subject.trim() || !feedback.trim() || !manager?.email) return;

    const data = {
      employee_id: employee.id,
      employee_email: String(employee.email || ""),
      employee_name: employee.name,
      manager_email: manager.email,
      manager_name: manager.full_name || manager.name,
      feedback_type: feedbackType,
      subject: subject,
      feedback: feedback,
      is_private: false
    };

    onSubmit(data);

    // Reset form
    setFeedbackType("general");
    setSubject("");
    setFeedback("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Provide Feedback to {employee?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="feedback_type">Feedback Type</Label>
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger id="feedback_type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">Positive Recognition</SelectItem>
                <SelectItem value="constructive">Constructive Feedback</SelectItem>
                <SelectItem value="corrective">Corrective Action</SelectItem>
                <SelectItem value="general">General Feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Excellent work on Line 1 cleaning"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="feedback">Feedback *</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide detailed feedback..."
              rows={6}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !subject.trim() || !feedback.trim() || !manager?.email}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}