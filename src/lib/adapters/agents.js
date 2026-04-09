/**
 * AGENTS ADAPTER — Stubbed out (no Base44 dependency).
 * 
 * The agent chat features (EmployeeQA, SOC2 assistant) now use
 * invokeLLM directly with inline conversation state — they don't
 * go through this adapter.
 * 
 * WhatsApp agent integration is not available without Base44.
 * These stubs preserve the function signatures so nothing breaks.
 *
 * To restore full agent functionality, implement:
 *   - Conversation storage in Supabase (agent_conversations table)
 *   - LLM orchestration with tool calling
 *   - Real-time subscription via Supabase Realtime
 */

export function createConversation(agentName, metadata) {
  console.warn("[agents] createConversation stubbed — agent system not connected");
  return Promise.resolve({ id: `stub_${Date.now()}`, agent_name: agentName, metadata, messages: [] });
}

export function listConversations(agentName) {
  console.warn("[agents] listConversations stubbed — agent system not connected");
  return Promise.resolve([]);
}

export function getConversation(conversationId) {
  console.warn("[agents] getConversation stubbed — agent system not connected");
  return Promise.resolve({ id: conversationId, messages: [] });
}

export function updateConversation(conversationId, metadata) {
  console.warn("[agents] updateConversation stubbed — agent system not connected");
  return Promise.resolve({ id: conversationId, metadata });
}

export function addMessage(conversation, message) {
  console.warn("[agents] addMessage stubbed — agent system not connected");
  return Promise.resolve(message);
}

export function subscribeToConversation(conversationId, callback) {
  console.warn("[agents] subscribeToConversation stubbed — agent system not connected");
  return () => {}; // no-op unsubscribe
}

export function getWhatsAppConnectURL(agentName) {
  console.warn("[agents] getWhatsAppConnectURL stubbed — WhatsApp not available without Base44");
  return "#";
}