import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function TaskCommentModal({ open, onOpenChange, task, onSubmit, isLoading }) {
  const [comment, setComment] = useState("");
  const [commentType, setCommentType] = useState("note");

  const handleSubmit = () => {
    if (!comment.trim()) return;
    onSubmit(task, comment, commentType);
    setComment("");
    setCommentType("note");
  };

  const handleClose = () => {
    setComment("");
    setCommentType("note");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Comment on Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <p className="font-medium text-slate-900 mb-1">{task?.title}</p>
            <p className="text-sm text-slate-500">
              Completed by {task?.assigned_to_name || task?.assigned_to}
            </p>
          </div>

          <div>
            <Label htmlFor="comment_type">Comment Type</Label>
            <Select value={commentType} onValueChange={setCommentType}>
              <SelectTrigger id="comment_type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">Positive Recognition</SelectItem>
                <SelectItem value="constructive">Constructive Feedback</SelectItem>
                <SelectItem value="note">General Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="comment">Comment *</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave your feedback for the employee..."
              rows={5}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!comment.trim() || isLoading}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Comment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}