// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllCategories, getAllCategoryOrder } from "./taskCategoryClassifier";

export default function CategorySelector({ value, onChange, customCategories = [], onAddCategory, onAutoDetect }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCatId, setNewCatId] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatDescription, setNewCatDescription] = useState("");

  const allCategories = getAllCategories(customCategories);
  const allCategoryOrder = getAllCategoryOrder(customCategories);

  const handleAddCategory = () => {
    if (!newCatLabel.trim()) return;
    const id = newCatId.trim().toUpperCase().replace(/\s+/g, "_") || newCatLabel.trim().toUpperCase().replace(/\s+/g, "_");
    if (allCategories[id]) return; // Already exists

    onAddCategory?.({
      id,
      label: newCatLabel.trim(),
      shortLabel: newCatLabel.trim(),
      description: newCatDescription.trim(),
    });

    onChange(id);
    setShowAddDialog(false);
    setNewCatId("");
    setNewCatLabel("");
    setNewCatDescription("");
  };

  const selectedCat = allCategories[value];

  return (
    <>
      <div className="flex gap-2">
        <Select
          value={allCategories[value] ? value : ""}
          onValueChange={onChange}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={value || "Select category"} />
          </SelectTrigger>
          <SelectContent>
            {allCategoryOrder.map(catId => {
              const cat = allCategories[catId];
              if (!cat) return null;
              return (
                <SelectItem key={catId} value={catId}>
                  <span className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", cat.badgeColor?.split(" ")[0] || "bg-slate-100")} />
                    {cat.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs whitespace-nowrap h-10"
          onClick={onAutoDetect}
          title="Auto-detect category from task name and description"
        >
          Auto
        </Button>
        {onAddCategory && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 px-2"
            onClick={() => setShowAddDialog(true)}
            title="Add new category"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      {selectedCat?.description && (
        <p className="text-xs text-slate-500">{selectedCat.description}</p>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                value={newCatLabel}
                onChange={(e) => {
                  setNewCatLabel(e.target.value);
                  if (!newCatId) {
                    // Auto-generate ID from label
                  }
                }}
                placeholder="e.g., Exterior Grounds"
              />
            </div>
            <div className="space-y-2">
              <Label>Short ID (optional)</Label>
              <Input
                value={newCatId}
                onChange={(e) => setNewCatId(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                placeholder={newCatLabel ? newCatLabel.toUpperCase().replace(/\s+/g, "_") : "e.g., EXTERIOR"}
                className="font-mono"
              />
              <p className="text-xs text-slate-500">Unique identifier. Auto-generated from name if left blank.</p>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newCatDescription}
                onChange={(e) => setNewCatDescription(e.target.value)}
                placeholder="Brief description of this category"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button
                type="button"
                disabled={!newCatLabel.trim()}
                onClick={handleAddCategory}
                className="bg-slate-900 hover:bg-slate-800"
              >
                Add Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}