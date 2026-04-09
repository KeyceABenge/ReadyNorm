import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Droplets, Calculator } from "lucide-react";

// Conversion constants
const OZ_PER_GALLON = 128; // fl oz in a US gallon
const ML_PER_GALLON = 3785.41;
const ML_PER_OZ = 29.5735;
const ML_PER_LITER = 1000;

/**
 * Parse a dilution ratio string into a numeric "parts concentrate per 128 parts water" value.
 * Handles formats like:
 *   "1:128", "1:64", "2 oz/gal", "1 oz per gallon", "0.5 oz/gal", "15 ml/gal"
 * Returns oz-per-gallon equivalent, or null if unparseable.
 */
function parseRatioToOzPerGal(ratioStr) {
  if (!ratioStr || typeof ratioStr !== "string") return null;
  const s = ratioStr.trim().toLowerCase();

  // "X:Y" ratio format  → X parts concentrate to Y parts total (or water)
  const ratioMatch = s.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (ratioMatch) {
    const num = parseFloat(ratioMatch[1]);
    const den = parseFloat(ratioMatch[2]);
    if (den === 0) return null;
    // 1:128 means 1 oz per 128 oz = 1 oz per gallon
    return (num / den) * OZ_PER_GALLON;
  }

  // "X oz per gallon" / "X oz/gal" / "X fl oz per gallon"
  const ozGalMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz\.?\s*(?:per|\/)\s*gal(?:lon)?$/);
  if (ozGalMatch) return parseFloat(ozGalMatch[1]);

  // "X ml per gallon" / "X ml/gal"
  const mlGalMatch = s.match(/^(\d+(?:\.\d+)?)\s*ml\.?\s*(?:per|\/)\s*gal(?:lon)?$/);
  if (mlGalMatch) return parseFloat(mlGalMatch[1]) / ML_PER_OZ;

  // "X ml per liter" / "X ml/L"
  const mlLMatch = s.match(/^(\d+(?:\.\d+)?)\s*ml\.?\s*(?:per|\/)\s*(?:liter|litre|l)$/);
  if (mlLMatch) {
    const mlPerLiter = parseFloat(mlLMatch[1]);
    const mlPerGallon = mlPerLiter * (ML_PER_GALLON / ML_PER_LITER);
    return mlPerGallon / ML_PER_OZ;
  }

  return null;
}

function formatNumber(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const rounded = Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
  // Remove trailing zeros
  return rounded.toString();
}

function ConversionDisplay({ ratioStr, label }) {
  const ozPerGal = useMemo(() => parseRatioToOzPerGal(ratioStr), [ratioStr]);

  if (!ozPerGal || !ratioStr) return null;

  const mlPerGal = ozPerGal * ML_PER_OZ;
  const mlPerLiter = (ozPerGal * ML_PER_OZ) / (ML_PER_GALLON / ML_PER_LITER);
  const ratio = Math.round(OZ_PER_GALLON / ozPerGal);
  const tspPerGal = ozPerGal * 6; // 6 tsp per oz
  const tbspPerGal = ozPerGal * 2; // 2 tbsp per oz

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Calculator className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-xs font-semibold text-slate-700">{label} — Converted</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <ConvBadge label="Ratio" value={`1:${ratio}`} />
        <ConvBadge label="oz/gal" value={formatNumber(ozPerGal)} />
        <ConvBadge label="mL/gal" value={formatNumber(mlPerGal, 1)} />
        <ConvBadge label="mL/L" value={formatNumber(mlPerLiter, 1)} />
        <ConvBadge label="tbsp/gal" value={formatNumber(tbspPerGal, 1)} />
        <ConvBadge label="tsp/gal" value={formatNumber(tspPerGal, 1)} />
      </div>
    </div>
  );
}

function ConvBadge({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5">
      <span className="text-xs font-bold text-slate-800">{value}</span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

export default function DilutionRatioSection({ formData, setFormData }) {
  return (
    <div className="space-y-3 border border-blue-100 bg-blue-50/30 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Droplets className="w-4 h-4 text-blue-600" />
        <Label className="text-sm font-semibold text-slate-800">Dilution Ratios</Label>
      </div>
      <p className="text-xs text-slate-500 -mt-1">
        Enter ratios in any format: "1:128", "1 oz/gal", "30 ml/gal", "7.8 ml/L" — conversions shown automatically
      </p>

      {/* Food Contact */}
      <div className="space-y-1">
        <Label className="text-xs">Food Contact Surfaces</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={formData.dilution_food_contact || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, dilution_food_contact: e.target.value }))}
            placeholder='e.g. 1:128 or 1 oz/gal'
            className="text-sm"
          />
          <Input
            type="number"
            value={formData.dilution_food_contact_ppm || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, dilution_food_contact_ppm: e.target.value ? Number(e.target.value) : "" }))}
            placeholder="ppm (if known)"
            className="text-sm"
          />
        </div>
        <ConversionDisplay ratioStr={formData.dilution_food_contact} label="Food Contact" />
      </div>

      {/* Non-Food Contact */}
      <div className="space-y-1">
        <Label className="text-xs">Non-Food Contact Surfaces</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={formData.dilution_non_food_contact || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, dilution_non_food_contact: e.target.value }))}
            placeholder='e.g. 1:64 or 2 oz/gal'
            className="text-sm"
          />
          <Input
            type="number"
            value={formData.dilution_non_food_contact_ppm || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, dilution_non_food_contact_ppm: e.target.value ? Number(e.target.value) : "" }))}
            placeholder="ppm (if known)"
            className="text-sm"
          />
        </div>
        <ConversionDisplay ratioStr={formData.dilution_non_food_contact} label="Non-Food Contact" />
      </div>

      {/* Heavy Duty */}
      <div className="space-y-1">
        <Label className="text-xs">Heavy Duty / Full Strength</Label>
        <Input
          value={formData.dilution_heavy_duty || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, dilution_heavy_duty: e.target.value }))}
          placeholder='e.g. 1:32 or 4 oz/gal or "full strength"'
          className="text-sm"
        />
        <ConversionDisplay ratioStr={formData.dilution_heavy_duty} label="Heavy Duty" />
      </div>

      {/* Dilution Notes */}
      <div className="space-y-1">
        <Label className="text-xs">Dilution Notes (contact time, special instructions)</Label>
        <Textarea
          value={formData.dilution_notes || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, dilution_notes: e.target.value }))}
          rows={2}
          placeholder="e.g. 10 min contact time for sanitizing, rinse required on food contact"
          className="text-sm"
        />
      </div>
    </div>
  );
}