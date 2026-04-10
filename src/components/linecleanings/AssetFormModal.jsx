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

export default function AssetFormModal({ open, onOpenChange, asset, areaId, lineId, allAreas = [], lines = [], onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ssop_url: "",
    requires_atp_swab: false,
    estimated_hours: "",
    is_locked: false
  });
  const [selectedAreaIds, setSelectedAreaIds] = useState([]);

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || "",
        description: asset.description || "",
        ssop_url: asset.ssop_url || "",
        requires_atp_swab: asset.requires_atp_swab || false,
        estimated_hours: asset.estimated_hours || "",
        is_locked: asset.is_locked || false
      });
      setSelectedAreaIds([areaId].filter(Boolean));
    } else {
      setFormData({ name: "", description: "", ssop_url: "", requires_atp_swab: false, estimated_hours: "", is_locked: false });
      setSelectedAreaIds([areaId].filter(Boolean));
    }
  }, [asset, areaId, open]);

  const toggleArea = (id) => {
    setSelectedAreaIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (asset) {
      onSubmit({ ...formData, area_id: areaId, production_line_id: lineId });
    } else {
      onSubmit({ ...formData, areaIds: selectedAreaIds });
    }
  };

  const isCreating = !asset;
  const showMultiArea = isCreating && allAreas.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Create Asset"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Asset Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Conveyor Belt, Mixer"
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

          <div>
            <Label htmlFor="ssop_url">SSOP URL</Label>
            <Input
              id="ssop_url"
              value={formData.ssop_url}
              onChange={(e) => setFormData(prev => ({ ...prev, ssop_url: e.target.value }))}
              placeholder="URL to SSOP document"
              type="url"
            />
          </div>

          <div>
            <Label htmlFor="estimated_hours">Estimated Hours (1 employee)</Label>
            <Input
              id="estimated_hours"
              type="number"
              min="0"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || "" }))}
              placeholder="e.g., 2.5"
            />
            <p className="text-xs text-slate-500 mt-1">
              Time needed for one employee to complete this asset
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_locked"
              checked={formData.is_locked}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_locked: checked }))}
            />
            <Label htmlFor="is_locked" className="font-normal cursor-pointer">
              Lock time (1-person job, cannot speed up with more employees)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="atp_swab"
              checked={formData.requires_atp_swab}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_atp_swab: checked }))}
            />
            <Label htmlFor="atp_swab" className="font-normal cursor-pointer">
              Requires ATP swab testing
            </Label>
          </div>

          {showMultiArea && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Add to Areas</Label>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() =>
                    setSelectedAreaIds(
                      selectedAreaIds.length === allAreas.length ? [] : allAreas.map(a => a.id)
                    )
                  }
                >
                  {selectedAreaIds.length === allAreas.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-2">Select one or more areas across any line</p>
              <div className="space-y-3 max-h-52 overflow-y-auto border rounded-lg p-3">
                {lines.map(line => {
                  const lineAreas = allAreas.filter(a => a.production_line_id === line.id);
                  if (lineAreas.length === 0) return null;
                  return (
                    <div key={line.id}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{line.name}</p>
                      <div className="space-y-1 pl-2">
                        {lineAreas.map(area => (
                          <div key={area.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`area-${area.id}`}
                              checked={selectedAreaIds.includes(area.id)}
                              onCheckedChange={() => toggleArea(area.id)}
                            />
                            <Label htmlFor={`area-${area.id}`} className="font-normal cursor-pointer">
                              {area.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedAreaIds.length > 1 && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  Will add this asset to {selectedAreaIds.length} areas
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
            disabled={isLoading || !formData.name || (isCreating && selectedAreaIds.length === 0)}
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {asset ? "Update" : selectedAreaIds.length > 1 ? `Add to ${selectedAreaIds.length} Areas` : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}