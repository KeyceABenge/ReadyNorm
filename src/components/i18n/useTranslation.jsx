import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, getTranslation } from "./translations";

// Context for language state
const LanguageContext = createContext(null);

// Provider component
export function LanguageProvider({ children, initialLanguage = DEFAULT_LANGUAGE }) {
  const [language, setLanguage] = useState(initialLanguage);
  
  // Update language from employee data when it changes
  const updateLanguage = useCallback((newLanguage) => {
    if (newLanguage && SUPPORTED_LANGUAGES.some(l => l.code === newLanguage)) {
      setLanguage(newLanguage);
      // Store in localStorage for persistence within session
      localStorage.setItem("employee_language", newLanguage);
    }
  }, []);
  
  // Initialize from localStorage on mount
  useEffect(() => {
    const storedLanguage = localStorage.getItem("employee_language");
    if (storedLanguage && SUPPORTED_LANGUAGES.some(l => l.code === storedLanguage)) {
      setLanguage(storedLanguage);
    }
  }, []);
  
  const value = {
    language,
    setLanguage: updateLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    defaultLanguage: DEFAULT_LANGUAGE
  };
  
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use translation context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return default values if not wrapped in provider (for backwards compatibility)
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      supportedLanguages: SUPPORTED_LANGUAGES,
      defaultLanguage: DEFAULT_LANGUAGE
    };
  }
  return context;
}

// Main translation hook
export function useTranslation() {
  const { language } = useLanguage();
  
  // ONLY translate if language is explicitly set to non-English
  // Default behavior is English - no translation
  const effectiveLanguage = language && language !== "en" ? language : "en";
  
  // Translation function - gets UI text
  // Returns English (fallback) unless employee has a non-English preferred_language set by manager
  const t = useCallback((category, key, fallback = null) => {
    // If English or no language set, just return the fallback (English text)
    if (effectiveLanguage === "en") {
      return fallback || key;
    }
    
    const result = getTranslation(category, key, effectiveLanguage);
    // If result equals key (not found), use fallback if provided
    if (result === key && fallback) {
      return fallback;
    }
    return result;
  }, [effectiveLanguage]);
  
  // Translate dynamic content with fallback indicator
  // Only translate if employee has non-English preferred_language set by manager
  const translateContent = useCallback((content, translations = {}, showIndicator = true) => {
    if (!content) return "";
    
    // If English or no specific language, return original content (no translation)
    if (effectiveLanguage === "en") {
      return content;
    }
    
    // If translations object has the current language, use it
    if (translations && translations[effectiveLanguage]) {
      return translations[effectiveLanguage];
    }
    
    // If translations object has English, use that as fallback
    if (translations && translations.en) {
      return showIndicator 
        ? `${translations.en} *` // Asterisk indicates fallback
        : translations.en;
    }
    
    // Return original content
    return content;
  }, [effectiveLanguage]);
  
  // Format date according to language
  const formatDate = useCallback((date, options = {}) => {
    if (!date) return "";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      const localeMap = {
        en: "en-US",
        es: "es-ES",
        fr: "fr-FR",
        pt: "pt-BR",
        zh: "zh-CN",
        vi: "vi-VN",
        ko: "ko-KR",
        tl: "fil-PH"
      };
      return d.toLocaleDateString(localeMap[effectiveLanguage] || "en-US", options);
    } catch {
      return String(date);
    }
  }, [effectiveLanguage]);
  
  // Format time according to language
  const formatTime = useCallback((date, options = {}) => {
    if (!date) return "";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      const localeMap = {
        en: "en-US",
        es: "es-ES",
        fr: "fr-FR",
        pt: "pt-BR",
        zh: "zh-CN",
        vi: "vi-VN",
        ko: "ko-KR",
        tl: "fil-PH"
      };
      return d.toLocaleTimeString(localeMap[effectiveLanguage] || "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        ...options
      });
    } catch {
      return String(date);
    }
  }, [effectiveLanguage]);
  
  return {
    t,
    translateContent,
    formatDate,
    formatTime,
    language: effectiveLanguage,
    isDefaultLanguage: effectiveLanguage === DEFAULT_LANGUAGE
  };
}

export default useTranslation;