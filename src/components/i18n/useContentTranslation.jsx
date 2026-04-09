import { useState, useEffect, useCallback } from "react";
import { invokeLLM } from "@/lib/adapters/integrations";
import { SUPPORTED_LANGUAGES } from "./translations";

/**
 * Hook for translating dynamic content using AI
 * Use this for database content that needs to be translated on-the-fly
 * 
 * Can accept either:
 * - An object like { title: "Hello", description: "World" }
 * - An array like [{ id: "title", text: "Hello" }, { id: "desc", text: "World" }]
 */
export function useContentTranslation(contentInput, language) {
  const [translations, setTranslations] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);

  // Normalize input to array format
  const contentItems = Array.isArray(contentInput) 
    ? contentInput 
    : Object.entries(contentInput || {})
        .filter(([_, text]) => text)
        .map(([id, text]) => ({ id, text }));

  // Create a stable key for dependencies
  const contentKey = JSON.stringify(contentItems.map(c => c?.id).filter(Boolean));

  useEffect(() => {
    // Skip if English, no explicit language set, or no content
    // Only translate when manager has explicitly set employee's preferred_language to non-English
    if (!language || language === "en" || !contentItems || contentItems.length === 0) {
      setTranslations({});
      return;
    }

    // Filter out items that are already translated or empty
    const itemsToTranslate = contentItems.filter(item => 
      item && item.text && !translations[item.id]
    );

    if (itemsToTranslate.length === 0) return;

    const translateContent = async () => {
      setIsTranslating(true);
      try {
        const langName = SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || language;
        const textsToTranslate = itemsToTranslate.map(c => c.text);

        // Batch translate - limit to 50 items at a time
        const batchSize = 50;
        const batches = [];
        for (let i = 0; i < textsToTranslate.length; i += batchSize) {
          batches.push(textsToTranslate.slice(i, i + batchSize));
        }

        const allTranslations = {};

        for (const batch of batches) {
          const result = await invokeLLM({
            prompt: `Translate the following texts to ${langName}. Keep them short and natural. Return a JSON object where keys are the original texts and values are the translations. Only translate, don't add explanations.\n\nTexts:\n${batch.join("\n")}`,
            response_json_schema: {
              type: "object",
              additionalProperties: { type: "string" }
            }
          });

          // Map results back to IDs
          itemsToTranslate.forEach(item => {
            if (batch.includes(item.text) && result[item.text]) {
              allTranslations[item.id] = result[item.text];
            }
          });
        }

        setTranslations(prev => ({ ...prev, ...allTranslations }));
      } catch (e) {
        console.error("Translation error:", e);
      } finally {
        setIsTranslating(false);
      }
    };

    translateContent();
  }, [language, contentKey]);

  // Helper to get translated text
  const tr = useCallback((id, fallback) => {
    return translations[id] || fallback;
  }, [translations]);

  return { translatedContent: translations, isTranslating, tr };
}

export default useContentTranslation;