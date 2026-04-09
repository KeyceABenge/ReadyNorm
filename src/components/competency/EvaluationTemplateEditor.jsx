import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, Save, CheckCircle2, Plus, Trash2, GripVertical,
  Sparkles, Edit3, Shield
} from "lucide-react";
import { EvaluationTemplateRepo } from "@/lib/adapters/database";
import { getCurrentUser } from "@/lib/adapters/auth";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const CATEGORIES = [
  { value: "safety", label: "Safety", color: "bg-rose-100 text-rose-700" },
  { value: "pre_op", label: "Pre-Op", color: "bg-blue-100 text-blue-700" },
  { value: "procedure", label: "Procedure", color: "bg-indigo-100 text-indigo-700" },
  { value: "chemical", label: "Chemical", color: "bg-purple-100 text-purple-700" },
  { value: "quality", label: "Quality", color: "bg-emerald-100 text-emerald-700" },
  { value: "post_clean", label: "Post-Clean", color: "bg-amber-100 text-amber-700" }
];

export default function EvaluationTemplateEditor({
  open,
  onOpenChange,
  template,
  ssop,
  organizationId,
  onSave
}) {
  const [items, setItems] = useState(template?.checklist_items || []);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleAddItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      item: "New checklist item",
      category: "procedure",
      sanitation_step: "1",
      critical: false
    };
    setItems(prev => [...prev, newItem]);
    setEditingItemId(newItem.id);
  };

  const handleDeleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const reordered = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setItems(reordered);
  };

  const handleSave = async (approve = false) => {
    setIsSaving(true);
    try {
      const user = await getCurrentUser();
      
      const templateData = {
        organization_id: organizationId,
        ssop_id: ssop?.id,
        ssop_version: ssop?.version || 1,
        ssop_title: ssop?.title,
        cleaning_method: ssop?.cleaning_method || "wet",
        checklist_items: items,
        ai_generated: template?.ai_generated || false,
        last_edited_by: user.email,
        last_edited_at: new Date().toISOString(),
        status: approve ? "approved" : "draft"
      };

      if (template?.id) {
        await EvaluationTemplateRepo.update(template.id, templateData);
      } else {
        await EvaluationTemplateRepo.create(templateData);
      }

      onSave?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save template:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryConfig = (category) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[2];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-600" />
            Edit Evaluation Checklist Template
          </DialogTitle>
          {ssop && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{ssop.title}</Badge>
              <Badge variant="outline" className="capitalize">{ssop.cleaning_method || "wet"} clean</Badge>
              {template?.ai_generated && (
                <Badge className="bg-amber-100 text-amber-700">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="checklist">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "p-3 rounded-lg border bg-white transition-shadow",
                            snapshot.isDragging && "shadow-lg",
                            editingItemId === item.id && "ring-2 ring-amber-400"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              {...provided.dragHandleProps}
                              className="mt-2 cursor-grab text-slate-400 hover:text-slate-600"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <div className="flex-1 space-y-2">
                              {editingItemId === item.id ? (
                                <>
                                  <Input
                                    value={item.item}
                                    onChange={(e) => handleItemChange(item.id, "item", e.target.value)}
                                    placeholder="Checklist item text..."
                                    className="text-sm"
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Select
                                      value={item.category}
                                      onValueChange={(v) => handleItemChange(item.id, "category", v)}
                                    >
                                      <SelectTrigger className="w-32 h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {CATEGORIES.map(cat => (
                                          <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    <Select
                                      value={item.sanitation_step}
                                      onValueChange={(v) => handleItemChange(item.id, "sanitation_step", v)}
                                    >
                                      <SelectTrigger className="w-24 h-8 text-xs">
                                        <SelectValue placeholder="Step" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[1,2,3,4,5,6,7].map(s => (
                                          <SelectItem key={s} value={String(s)}>Step {s}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <label className="flex items-center gap-1.5 text-xs">
                                      <Checkbox
                                        checked={item.critical}
                                        onCheckedChange={(v) => handleItemChange(item.id, "critical", v)}
                                      />
                                      <Shield className="w-3 h-3 text-rose-500" />
                                      Critical
                                    </label>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingItemId(null)}
                                      className="h-7 text-xs"
                                    >
                                      Done
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <div 
                                  className="flex items-center gap-2 cursor-pointer"
                                  onClick={() => setEditingItemId(item.id)}
                                >
                                  <Badge className={cn("text-xs shrink-0", getCategoryConfig(item.category).color)}>
                                    {getCategoryConfig(item.category).label}
                                  </Badge>
                                  <span className="text-sm flex-1">{item.item}</span>
                                  {item.critical && (
                                    <Badge className="bg-rose-600 text-white text-xs">Critical</Badge>
                                  )}
                                </div>
                              )}
                            </div>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteItem(item.id)}
                              className="h-8 w-8 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Button
            variant="outline"
            onClick={handleAddItem}
            className="w-full mt-3 border-dashed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Checklist Item
          </Button>
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSaving || items.length === 0}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={isSaving || items.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}