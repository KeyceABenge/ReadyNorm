/**
 * BACKEND FUNCTIONS ADAPTER — Supabase Edge Functions.
 * 
 * All backend functions are now hosted on Supabase Edge Functions.
 * Calls go to: {SUPABASE_URL}/functions/v1/{functionName}
 * Auth: Supabase JWT in Authorization header + anon key in apikey header.
 */
import { supabase } from "@/api/supabaseClient";

// Supabase project constants (same as supabaseClient.js)
const SUPABASE_URL = "https://zamrusolomzustgenpin.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_p-ZZcpZzIqRW1dRNoHT69Q_l8l2XH3Q";

/**
 * Get the Supabase Edge Function URL for a given function name.
 * Supabase Edge Functions are at: {SUPABASE_URL}/functions/v1/{name}
 */
function getFunctionUrl(functionName) {
  return `${SUPABASE_URL}/functions/v1/${functionName}`;
}

/**
 * Get the current Supabase access token.
 */
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Invoke a backend function by name with a payload.
 * Uses direct fetch() with Supabase JWT + apikey headers.
 * 
 * @param {string} functionName - Name of the function (e.g. "listOrgUsers")
 * @param {object} [payload={}] - Request body
 * @returns {Promise<{data: any, status: number}>} Axios-compatible response shape
 */
export async function invokeFunction(functionName, payload = {}) {
  const token = await getAccessToken();
  const url = getFunctionUrl(functionName);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  // Return Axios-compatible response shape for backward compatibility
  return { data, status: response.status };
}

// Convenience wrappers for known backend functions

/**
 * List all users for an organization (admin/manager only).
 */
export async function listOrgUsers(organizationId) {
  return invokeFunction("listOrgUsers", { organization_id: organizationId });
}

/**
 * Transfer organization ownership to a new user.
 */
export async function transferOwnership(organizationId, newOwnerEmail) {
  return invokeFunction("transferOwnership", { organization_id: organizationId, new_owner_email: newOwnerEmail });
}

/**
 * Remove a user's access from an organization.
 */
export async function removeUserAccess(payload) {
  return invokeFunction("removeUserAccess", payload);
}

/**
 * Seed demo data (admin only).
 */
export async function seedDemoData(phase = "all") {
  return invokeFunction("seedDemoData", { phase });
}

/**
 * Fetch executive dashboard data across sites.
 */
export async function fetchExecutiveData(siteCode) {
  return invokeFunction("fetchExecutiveData", { siteCode });
}