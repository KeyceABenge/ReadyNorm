import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Palette, Info, Tag } from "lucide-react";
import ColorCodingCategoryCard from "./ColorCodingCategoryCard";

export default function FacilityColorCodingPanel({ categories, legacyColors, onChange }) {
  // On first load, migrate legacy flat colors into a default category if no categories exist yet
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    if (!initialized && (!categories || categories.length === 0) && legacyColors && legacyColors.length > 0) {
      const migratedCategory = {
        id: `cat_${Date.now()}`,
        name: "General Equipment",
        description: "Default color coding migrated from previous settings",
        items: legacyColors.map((lc, idx) => ({
          id: `item_mig_${idx}`,
          color: lc.color,
          color_name: getColorName(lc.color),
          label: lc.category,
          photo_urls: []
        }))
      };
      onChange([migratedCategory]);
      setInitialized(true);
    } else {
      setInitialized(true);
    }
  }, [legacyColors, categories]);

  const addCategory = () => {
    const newCat = {
      id: `cat_${Date.now()}`,
      name: "",
      description: "",
      items: []
    };
    onChange([...(categories || []), newCat]);
  };

  const updateCategory = (idx, updated) => {
    const cats = [...(categories || [])];
    cats[idx] = updated;
    onChange(cats);
  };

  const deleteCategory = (idx) => {
    onChange((categories || []).filter((_, i) => i !== idx));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Facility Color Coding
        </CardTitle>
        <CardDescription>
          Define color codes for different categories of facility items and equipment. 
          Organize by item type (e.g., Buckets, Brushes, Hoses) with specific colors for each intended use area.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Labeling override notice */}
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Tag className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800">
            <p className="font-semibold mb-1">Labeling Overrides Color Coding</p>
            <p>
              Items may be labeled for their specific intended use, and that label takes precedence 
              over the item's color. For example, a blue bucket labeled "Allergen" should be treated 
              as an allergen-use item regardless of what the blue color typically indicates. Always 
              check for labels first before relying on color.
            </p>
          </div>
        </div>

        {/* Approximate color notice */}
        <div className="flex items-start gap-3 p-3 bg-sky-50 border border-sky-200 rounded-lg">
          <Info className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
          <p className="text-xs text-sky-800">
            Color matches do not need to be exact. If an item is designated as "Green," any shade of 
            green is acceptable. The color name is more important than the precise shade shown here.
          </p>
        </div>

        {/* Category cards */}
        <div className="space-y-4">
          {(categories || []).map((cat, idx) => (
            <ColorCodingCategoryCard
              key={cat.id}
              category={cat}
              onChange={(updated) => updateCategory(idx, updated)}
              onDelete={() => deleteCategory(idx)}
            />
          ))}
        </div>

        <Button
          variant="outline"
          onClick={addCategory}
          className="w-full border-dashed border-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </CardContent>
    </Card>
  );
}

function getColorName(hex) {
  const map = {
    "#ffffff": "White", "#ef4444": "Red", "#000000": "Black", 
    "#3b82f6": "Blue", "#8b5cf6": "Purple", "#6b7280": "Gray",
    "#f59e0b": "Yellow", "#22c55e": "Green", "#f97316": "Orange",
    "#ec4899": "Pink", "#14b8a6": "Teal", "#92400e": "Brown",
    "#ff0000": "Red", "#0000ff": "Blue", "#00ff00": "Green",
  };
  return map[hex?.toLowerCase()] || "";
}