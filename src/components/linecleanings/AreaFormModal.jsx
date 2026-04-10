// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export default function AreaFormModal({ open, onOpenChange, area, lineId, lines = [], onSubmit, isLoading }) {
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [selectedLineIds, setSelectedLineIds] = useState([]);

  useEffect(() => {
    if (area) {
      setFormData(area);
      setSelectedLineIds([lineId].filter(Boolean));
    } else {
      setFormData({ name: "", description: "" });
      setSelectedLineIds([lineId].filter(Boolean));
    }
  }, [area, lineId, open]);

  const toggleLine = (id) => {
    setSelectedLineIds(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (area) {
      onSubmit({ ...formData, production_line_id: lineId });
    } else {
      onSubmit({ ...formData, lineIds: selectedLineIds });
    }
  };

  const isCreating = !area;
  const showMultiLine = isCreating && lines.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{area ? "Edit Area" : "Add Area"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Area Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Floor, Walls, Equipment"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          {showMultiLine && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Add to Lines</Label>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() =>
                    setSelectedLineIds(
                      selectedLineIds.length === lines.length ? [] : lines.map(l => l.id)
                    )
                  }
                >
                  {selectedLineIds.length === lines.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-2">Select one or more production lines</p>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {lines.map(line => (
                  <div key={line.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`line-${line.id}`}
                      checked={selectedLineIds.includes(line.id)}
                      onCheckedChange={() => toggleLine(line.id)}
                    />
                    <Label htmlFor={`line-${line.id}`} className="font-normal cursor-pointer">
                      {line.name}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedLineIds.length > 1 && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  Will add this area to {selectedLineIds.length} lines
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.name || (isCreating && selectedLineIds.length === 0)}
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {area ? "Update" : selectedLineIds.length > 1 ? `Add to ${selectedLineIds.length} Lines` : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}