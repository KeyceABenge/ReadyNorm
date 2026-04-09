import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "./translations";

export default function LanguageSelector({ 
  value = DEFAULT_LANGUAGE, 
  onChange, 
  label = "Preferred Language",
  showLabel = true,
  showFlag = true,
  showNativeName = true,
  className = ""
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <Label className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          {label}
        </Label>
      )}
      <Select value={value || DEFAULT_LANGUAGE} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                {showFlag && <span>{lang.flag}</span>}
                <span>{lang.name}</span>
                {showNativeName && lang.name !== lang.nativeName && (
                  <span className="text-slate-500">({lang.nativeName})</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-slate-500">
        Controls the language displayed in the employee app experience
      </p>
    </div>
  );
}