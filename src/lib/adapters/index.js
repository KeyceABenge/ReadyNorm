/**
 * ADAPTER INDEX — Single import point for all Supabase adapters.
 * 
 * Usage:
 *   import { getRepository, getCurrentUser, uploadFile, invokeLLM } from "@/lib/adapters";
 * 
 * This module centralizes adapter exports to keep app imports stable.
 */

export { getRepository } from "./database";
export * from "./database"; // Named repos: TaskRepo, EmployeeRepo, etc.

export {
  getCurrentUser,
  isAuthenticated,
  updateCurrentUser,
  logout,
  redirectToLogin,
  inviteUser,
} from "./auth";

export {
  uploadFile,
  uploadPrivateFile,
  createSignedUrl,
} from "./storage";

export {
  invokeLLM,
  generateImage,
  sendEmail,
  extractDataFromFile,
} from "./integrations";

export {
  invokeFunction,
  listOrgUsers,
  transferOwnership,
  removeUserAccess,
  seedDemoData,
  fetchExecutiveData,
} from "./functions";  // Now uses direct fetch() + Supabase JWT — no Base44 SDK

export { trackEvent } from "./analytics";

export {
  createConversation,
  listConversations,
  getConversation,
  updateConversation,
  addMessage,
  subscribeToConversation,
  getWhatsAppConnectURL,
} from "./agents";