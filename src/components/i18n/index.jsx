
// Multi-Language Support System
// Export all i18n components and utilities

export { 
  translations, 
  SUPPORTED_LANGUAGES, 
  DEFAULT_LANGUAGE,
  getTranslation,
  getLanguageName,
  getLanguageNativeName,
  isLanguageSupported
} from "./translations";

export { 
  LanguageProvider, 
  useLanguage, 
  useTranslation 
} from "./useTranslation";

export { default as LanguageSelector } from "./LanguageSelector";

export { TranslatedText, UIText } from "./TranslatedText";

// Export the content translation hook for dynamic content
export { useContentTranslation } from "./useContentTranslation";
