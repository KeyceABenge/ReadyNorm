import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, X, History, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CAPAActionRepo,
  CAPACommentRepo
} from "@/lib/adapters/database";

export default function CAPAActionEditModal({ open, onClose, action, organization, user, onUpdate }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    action_type: "corrective",
    priority: "medium",
    target_date: "",
    owners: [],
  });
  const [newOwner, setNewOwner] = useState({ email: "", name: "" });

  // Initialize form data when action changes
  useEffect(() => {
    if (action) {
      setFormData({
        title: action.title || "",
        description: action.description || "",
        action_type: action.action_type || "corrective",
        priority: action.priority || "medium",
        target_date: action.target_date || action.due_date || "",
        owners: action.owners?.length > 0 ? [...action.owners] : 
          (action.owner_email ? [{ email: action.owner_email, name: action.owner_name || "" }] : []),
      });
      setEditReason("");
      setShowHistory(false);
    }
  }, [action]);

  const addOwner = () => {
    if (!newOwner.email.trim()) {
      toast.error("Please enter an email");
      return;
    }
    if (formData.owners.some(o => o.email === newOwner.email)) {
      toast.error("Owner already added");
      return;
    }
    setFormData({
      ...formData,
      owners: [...formData.owners, { ...newOwner }]
    });
    setNewOwner({ email: "", name: "" });
  };

  const removeOwner = (email) => {
    setFormData({
      ...formData,
      owners: formData.owners.filter(o => o.email !== email)
    });
  };

  const handleSave = async () => {
    console.log("handleSave called", { formData, editReason });
    
    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (formData.owners.length === 0) {
      toast.error("Please add at least one owner");
      return;
    }
    if (!editReason.trim()) {
      toast.error("Please provide a reason for the edit");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build changes object
      const changes = {};
      if (formData.title !== action.title) changes.title = { from: action.title, to: formData.title };
      if (formData.description !== (action.description || "")) changes.description = { from: action.description, to: formData.description };
      if (formData.action_type !== action.action_type) changes.action_type = { from: action.action_type, to: formData.action_type };
      if (formData.priority !== action.priority) changes.priority = { from: action.priority, to: formData.priority };
      if (formData.target_date !== (action.target_date || action.due_date || "")) changes.target_date = { from: action.target_date || action.due_date, to: formData.target_date };
      
      const oldOwnerEmails = (action.owners || []).map(o => o.email).sort().join(",");
      const newOwnerEmails = formData.owners.map(o => o.email).sort().join(",");
      if (oldOwnerEmails !== newOwnerEmails) changes.owners = { from: action.owners, to: formData.owners };

      const editEntry = {
        edited_at: new Date().toISOString(),
        edited_by: user?.email,
        edited_by_name: user?.full_name,
        reason: editReason,
        changes
      };

      await CAPAActionRepo.update(action.id, {
        ...formData,
        due_date: formData.target_date, // Keep legacy field in sync
        owner_email: formData.owners[0]?.email || "",
        owner_name: formData.owners[0]?.name || "",
        edit_history: [...(action.edit_history || []), editEntry]
      });

      await CAPACommentRepo.create({
        organization_id: organization.id,
        capa_id: action.capa_id,
        author_email: user?.email,
        author_name: user?.full_name,
        content: `Edited action "${formData.title}": ${editReason}`,
        comment: `Edited action "${formData.title}": ${editReason}`,
        comment_type: "action_update",
      });

      onUpdate();
      onClose();
      toast.success("Action updated");
    } catch (error) {
      toast.error("Failed to update action");
    } finally {
      setIsSubmitting(false);
    }
  };

  const editHistory = action?.edit_history || [];

  return (
    <Dialog open={open} onOpenChange={onClose} modal={true}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto z-[10000]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Edit Action
            {editHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-slate-500"
              >
                <History className="w-4 h-4 mr-1" />
                History ({editHistory.length})
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {showHistory ? (
          <div className="space-y-3">
            <Button variant="outline" size="sm" onClick={() => setShowHistory(false)}>
              ← Back to Edit
            </Button>
            <h4 className="font-medium text-sm">Edit History</h4>
            {editHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No edit history</p>
            ) : (
              <div className="space-y-2">
                {editHistory.slice().reverse().map((entry, idx) => (
                  <Card key={idx} className="p-3 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{entry.edited_by_name || entry.edited_by}</span>
                      <span className="text-xs text-slate-400">
                        {format(new Date(entry.edited_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    <p className="text-slate-600 mb-2">Reason: {entry.reason}</p>
                    <div className="space-y-1">
                      {Object.entries(entry.changes || {}).map(([field, change]) => (
                        <div key={field} className="text-xs">
                          <span className="text-slate-500">{field}:</span>{" "}
                          <span className="text-red-500 line-through">{
                            typeof change.from === 'object' ? JSON.stringify(change.from) : (change.from || '(empty)')
                          }</span>{" → "}
                          <span className="text-green-600">{
                            typeof change.to === 'object' ? JSON.stringify(change.to) : (change.to || '(empty)')
                          }</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Action title..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select
                  value={formData.action_type}
                  onValueChange={(val) => setFormData({ ...formData, action_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="preventive">Preventive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Target Completion Date</label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              />
            </div>

            {action?.actual_completion_date && (
              <div className="p-3 bg-green-50 rounded-lg">
                <label className="text-sm font-medium text-green-800">Actual Completion Date</label>
                <p className="text-sm text-green-700">
                  {format(new Date(action.actual_completion_date), "MMM d, yyyy")}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Owners *</label>
              <div className="space-y-2 mb-2">
                {formData.owners.map((owner, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <User className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{owner.name || owner.email}</p>
                      {owner.name && <p className="text-xs text-slate-500">{owner.email}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOwner(owner.email)}
                      className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Email"
                  value={newOwner.email}
                  onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Name (optional)"
                  value={newOwner.name}
                  onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })}
                  className="flex-1"
                />
                <Button variant="outline" onClick={addOwner} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Reason for Edit *</label>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Why are you making this change?"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t relative z-50">
              <Button type="button" variant="outline" onClick={() => onClose()}>Cancel</Button>
              <Button 
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}