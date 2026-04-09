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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export default function AssetGroupFormModal({ 
  open, 
  onOpenChange, 
  group, 
  areaId, 
  lineId, 
  availableAssets,
  onSubmit, 
  isLoading 
}) {
  const [formData, setFormData] = useState({
    name: "",
    estimated_hours: "",
    is_locked: true,
    asset_ids: []
  });

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name || "",
        estimated_hours: group.estimated_hours || "",
        is_locked: group.is_locked !== false,
        asset_ids: group.asset_ids || []
      });
    } else {
      setFormData({ name: "", estimated_hours: "", is_locked: true, asset_ids: [] });
    }
  }, [group, open]);

  const toggleAsset = (assetId) => {
    setFormData(prev => ({
      ...prev,
      asset_ids: prev.asset_ids.includes(assetId)
        ? prev.asset_ids.filter(id => id !== assetId)
        : [...prev.asset_ids, assetId]
    }));
  };

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      area_id: areaId,
      production_line_id: lineId
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? "Edit Asset Group" : "Create Asset Group"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Wet Wash"
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
              placeholder="e.g., 6"
            />
            <p className="text-xs text-slate-500 mt-1">
              Total time for all assets in this group
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_locked"
              checked={formData.is_locked}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_locked: checked }))}
            />
            <Label htmlFor="is_locked" className="font-normal cursor-pointer">
              Lock time (cannot speed up with more employees)
            </Label>
          </div>

          <div>
            <Label>Assets in Group</Label>
            <div className="mt-2 space-y-2 border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
              {availableAssets.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No assets available</p>
              ) : (
                availableAssets.map(asset => (
                  <label
                    key={asset.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
                  >
                    <Checkbox
                      checked={formData.asset_ids.includes(asset.id)}
                      onCheckedChange={() => toggleAsset(asset.id)}
                    />
                    <span className="text-sm text-slate-700">{asset.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select assets that must be completed together
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.name || formData.asset_ids.length === 0}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {group ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}