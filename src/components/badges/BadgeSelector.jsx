import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import ProxiedImage from "@/components/ui/ProxiedImage";
import { toast } from "sonner";
import { EmployeeRepo } from "@/lib/adapters/database";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/**
 * Lets an employee pick up to 3 earned badges to display next to their name.
 */
export default function BadgeSelector({ employee, earnedBadges, onUpdate }) {
  const queryClient = useQueryClient();
  const currentSelection = employee?.display_badges || [];
  const [selected, setSelected] = useState(currentSelection);
  const [saving, setSaving] = useState(false);

  const hasChanges = JSON.stringify(selected.sort()) !== JSON.stringify([...currentSelection].sort());

  const toggleBadge = (badgeId) => {
    setSelected(prev => {
      if (prev.includes(badgeId)) {
        return prev.filter(id => id !== badgeId);
      }
      if (prev.length >= 3) {
        toast.error("You can display up to 3 badges");
        return prev;
      }
      return [...prev, badgeId];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await EmployeeRepo.update(employee.id, { display_badges: selected });
    // Update localStorage so the change reflects immediately
    const stored = localStorage.getItem("selectedEmployee");
    if (stored) {
      const emp = JSON.parse(stored);
      if (emp.id === employee.id) {
        emp.display_badges = selected;
        localStorage.setItem("selectedEmployee", JSON.stringify(emp));
      }
    }
    // Invalidate all employee-related queries so badge icons refresh everywhere
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    onUpdate?.(selected);
    setSaving(false);
    toast.success("Display badges updated!");
  };

  if (!earnedBadges || earnedBadges.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-semibold text-slate-900">Display Badges</h4>
          <span className="text-xs text-slate-500">({selected.length}/3)</span>
        </div>
        {hasChanges && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-3">Select up to 3 badges to show next to your name.</p>
      <div className="flex flex-wrap gap-2">
        {earnedBadges.map(badge => {
          const isSelected = selected.includes(badge.id);
          return (
            <button
              key={badge.id}
              onClick={() => toggleBadge(badge.id)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-2 transition-all text-left",
                isSelected
                  ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              )}
            >
              <ProxiedImage src={badge.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              <span className="text-xs font-medium text-slate-900">{badge.name}</span>
              {isSelected && (
                <Check className="w-3.5 h-3.5 text-slate-900" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}