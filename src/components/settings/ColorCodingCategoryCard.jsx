import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Upload, ChevronDown, ChevronUp, Trash2, Image } from "lucide-react";
import { toast } from "sonner";
import ProxiedImage from "@/components/ui/ProxiedImage";

const COLOR_PRESETS = [
  { hex: "#ffffff", name: "White" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#000000", name: "Black" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#8b5cf6", name: "Purple" },
  { hex: "#6b7280", name: "Gray" },
  { hex: "#f59e0b", name: "Yellow" },
  { hex: "#22c55e", name: "Green" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#14b8a6", name: "Teal" },
  { hex: "#92400e", name: "Brown" },
];

export default function ColorCodingCategoryCard({ category, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  const [uploadingIdx, setUploadingIdx] = useState(null);

  const updateCategory = (updates) => {
    onChange({ ...category, ...updates });
  };

  const addItem = () => {
    const newItem = {
      id: `item_${Date.now()}`,
      color: "#3b82f6",
      color_name: "Blue",
      label: "",
      photo_urls: []
    };
    updateCategory({ items: [...(category.items || []), newItem] });
  };

  const updateItem = (idx, updates) => {
    const items = [...(category.items || [])];
    items[idx] = { ...items[idx], ...updates };
    updateCategory({ items });
  };

  const removeItem = (idx) => {
    updateCategory({ items: (category.items || []).filter((_, i) => i !== idx) });
  };

  const handlePhotoUpload = async (itemIdx, file) => {
    setUploadingIdx(itemIdx);
    try {
      const { file_url } = await uploadFile({ file });
      const items = [...(category.items || [])];
      const currentPhotos = items[itemIdx].photo_urls || [];
      items[itemIdx] = { ...items[itemIdx], photo_urls: [...currentPhotos, file_url] };
      updateCategory({ items });
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingIdx(null);
    }
  };

  const removePhoto = (itemIdx, photoIdx) => {
    const items = [...(category.items || [])];
    const photos = [...(items[itemIdx].photo_urls || [])];
    photos.splice(photoIdx, 1);
    items[itemIdx] = { ...items[itemIdx], photo_urls: photos };
    updateCategory({ items });
  };

  const handleColorPresetClick = (idx, preset) => {
    updateItem(idx, { color: preset.hex, color_name: preset.name });
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      {/* Category Header */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 border-b border-slate-200">
        <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors min-h-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>
        <div className="flex-1 min-w-0">
          <Input
            value={category.name || ""}
            onChange={(e) => updateCategory({ name: e.target.value })}
            placeholder="Category name (e.g., Buckets & Pails, Brushes & Brooms, Hoses)"
            className="font-semibold text-sm border-0 bg-transparent p-0 h-auto focus-visible:ring-0 shadow-none"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0 min-h-0 h-8 w-8"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Category description */}
          <div>
            <Label className="text-xs text-slate-500">Description (optional)</Label>
            <Input
              value={category.description || ""}
              onChange={(e) => updateCategory({ description: e.target.value })}
              placeholder="Brief description of what this category covers"
              className="mt-1 text-sm"
            />
          </div>

          {/* Color items */}
          <div className="space-y-3">
            {(category.items || []).map((item, idx) => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  {/* Color swatch */}
                  <div className="shrink-0 pt-0.5">
                    <div
                      className="w-10 h-10 rounded-lg border-2 border-slate-300 shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>

                  {/* Label and color name */}
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.label || ""}
                      onChange={(e) => updateItem(idx, { label: e.target.value })}
                      placeholder="Item use (e.g., Food Contact, Allergen, Drains)"
                      className="text-sm font-medium"
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-500 shrink-0">Color:</Label>
                      <Input
                        value={item.color_name || ""}
                        onChange={(e) => updateItem(idx, { color_name: e.target.value })}
                        placeholder="Color name (e.g., Red, Blue, Green)"
                        className="text-xs h-7 flex-1"
                      />
                      <input
                        type="color"
                        value={item.color || "#3b82f6"}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const match = COLOR_PRESETS.find(p => p.hex.toLowerCase() === hex.toLowerCase());
                          updateItem(idx, { color: hex, color_name: match ? match.name : item.color_name });
                        }}
                        className="w-7 h-7 rounded border cursor-pointer shrink-0"
                      />
                    </div>
                    {/* Quick color presets */}
                    <div className="flex flex-wrap gap-1">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.hex}
                          onClick={() => handleColorPresetClick(idx, preset)}
                          className={`w-5 h-5 rounded-full border-2 transition-all min-h-0 ${
                            item.color?.toLowerCase() === preset.hex.toLowerCase()
                              ? "border-slate-900 scale-110"
                              : "border-slate-300 hover:border-slate-500"
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(idx)}
                    className="text-rose-500 hover:text-rose-700 shrink-0 min-h-0 h-7 w-7"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Example photos */}
                <div>
                  <Label className="text-xs text-slate-500 flex items-center gap-1 mb-1.5">
                    <Image className="w-3 h-3" />
                    Example Photos
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(item.photo_urls || []).map((url, pIdx) => (
                      <div key={pIdx} className="relative group w-16 h-16">
                        <ProxiedImage
                          src={url}
                          alt="Example"
                          className="w-16 h-16 rounded-lg border border-slate-200 object-cover"
                        />
                        <button
                          onClick={() => removePhoto(idx, pIdx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity min-h-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className={`w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors ${uploadingIdx === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-[9px] text-slate-400 mt-0.5">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files[0]) handlePhotoUpload(idx, e.target.files[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addItem}
            className="w-full border-dashed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Color Code to This Category
          </Button>
        </div>
      )}
    </div>
  );
}