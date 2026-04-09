import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function GoalModal({ open, onOpenChange, employee, goal, onSubmit, isLoading }) {
  const [goalType, setGoalType] = useState("task_completion_rate");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (goal) {
      setGoalType(goal.goal_type);
      setTitle(goal.title);
      setDescription(goal.description || "");
      setTargetValue(goal.target_value.toString());
      setStartDate(goal.start_date);
      setEndDate(goal.end_date);
    } else {
      setGoalType("task_completion_rate");
      setTitle("");
      setDescription("");
      setTargetValue("");
      setStartDate("");
      setEndDate("");
    }
  }, [goal, open]);

  const handleSubmit = () => {
    if (!title.trim() || !targetValue || !startDate || !endDate) return;

    const goalData = {
      employee_id: employee.id,
      employee_email: String(employee.email || ""),
      employee_name: employee.name,
      goal_type: goalType,
      title: title,
      description: description,
      target_value: parseFloat(targetValue),
      current_value: goal?.current_value || 0,
      start_date: startDate,
      end_date: endDate,
      status: "active"
    };

    onSubmit(goalData, goal?.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit Goal" : "Set Performance Goal"} for {employee?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="goal_type">Goal Type</Label>
            <Select value={goalType} onValueChange={setGoalType}>
              <SelectTrigger id="goal_type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_time_completion">On-Time Completion Rate</SelectItem>
                <SelectItem value="atp_compliance">ATP Test Compliance</SelectItem>
                <SelectItem value="efficiency">Task Efficiency</SelectItem>
                <SelectItem value="task_completion_rate">Task Completion Rate</SelectItem>
                <SelectItem value="quality_score">Quality Score</SelectItem>
                <SelectItem value="custom">Custom Goal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Achieve 95% on-time task completion"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional goal description..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_value">Target Value (%) *</Label>
              <Input
                id="target_value"
                type="number"
                min="0"
                max="100"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g., 95"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !title.trim() || !targetValue || !startDate || !endDate}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {goal ? "Update Goal" : "Set Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}