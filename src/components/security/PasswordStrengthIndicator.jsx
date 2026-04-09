/**
 * Password Strength Indicator
 * Validates password/passcode strength and shows visual feedback
 */
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const RULES = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "Contains uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "Contains lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "Contains a number", test: (v) => /\d/.test(v) },
  { id: "special", label: "Contains special character (!@#$...)", test: (v) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v) },
];

function getStrength(value) {
  if (!value) return { score: 0, label: "", color: "" };
  const passed = RULES.filter((r) => r.test(value)).length;
  if (passed <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (passed <= 2) return { score: 2, label: "Fair", color: "bg-orange-500" };
  if (passed <= 3) return { score: 3, label: "Good", color: "bg-yellow-500" };
  if (passed <= 4) return { score: 4, label: "Strong", color: "bg-emerald-500" };
  return { score: 5, label: "Excellent", color: "bg-emerald-600" };
}

export default function PasswordStrengthIndicator({ value = "", showRules = true }) {
  const strength = useMemo(() => getStrength(value), [value]);
  const results = useMemo(() => RULES.map((r) => ({ ...r, passed: r.test(value) })), [value]);

  if (!value) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= strength.score ? strength.color : "bg-slate-200"
              )}
            />
          ))}
        </div>
        <span className={cn("text-xs font-medium", {
          "text-red-600": strength.score <= 1,
          "text-orange-600": strength.score === 2,
          "text-yellow-600": strength.score === 3,
          "text-emerald-600": strength.score >= 4,
        })}>
          {strength.label}
        </span>
      </div>

      {/* Rules checklist */}
      {showRules && (
        <div className="space-y-1">
          {results.map((rule) => (
            <div key={rule.id} className="flex items-center gap-1.5 text-xs">
              {rule.passed ? (
                <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              ) : (
                <X className="w-3 h-3 text-slate-300 flex-shrink-0" />
              )}
              <span className={rule.passed ? "text-emerald-700" : "text-slate-400"}>
                {rule.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { getStrength, RULES };