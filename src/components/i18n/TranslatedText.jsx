import { useTranslation } from "./useTranslation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * TranslatedText component - displays content with fallback indicator
 * Use for dynamic/manager-authored content that may have translations
 * 
 * @param {string} content - Default content (usually English)
 * @param {object} translations - Object with language codes as keys, e.g. { es: "Hola", fr: "Bonjour" }
 * @param {boolean} showFallbackIndicator - Whether to show indicator when using fallback
 * @param {string} className - Additional CSS classes
 */
export function TranslatedText({ 
  content, 
  translations = {}, 
  showFallbackIndicator = false,
  className = "" 
}) {
  const { translateContent, language, isDefaultLanguage } = useTranslation();
  
  const translatedContent = translateContent(content, translations, false);
  const isFallback = !isDefaultLanguage && (!translations || !translations[language]);
  
  if (showFallbackIndicator && isFallback) {
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        {translatedContent}
        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-amber-600 border-amber-300">
          EN
        </Badge>
      </span>
    );
  }
  
  return <span className={className}>{translatedContent}</span>;
}

/**
 * UIText component - displays static UI text from translations file
 * Use for static interface labels, buttons, headings
 * 
 * @param {string} category - Translation category (e.g., "common", "tasks", "dashboard")
 * @param {string} textKey - Translation key within the category
 * @param {string} fallback - Fallback text if translation not found
 * @param {string} className - Additional CSS classes
 */
export function UIText({ category, textKey, fallback, className = "" }) {
  const { t } = useTranslation();
  
  return <span className={className}>{t(category, textKey, fallback)}</span>;
}

export default TranslatedText;