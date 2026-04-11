/**
 * BACKEND FUNCTIONS ADAPTER — Supabase Edge Functions.
 * 
 * All backend functions are now hosted on Supabase Edge Functions.
 * Calls go to: {SUPABASE_URL}/functions/v1/{functionName}
 * Auth: Supabase JWT in Authorization header + anon key in apikey header.
 */
import { supabase } from "@/api/supabaseClient";

/**
 * Invoke a backend function by name with a payload.
 * Uses supabase.functions.invoke() which automatically attaches the user's JWT,
 * handles the sb_publishable_ key format, and refreshes tokens as needed.
 * 
 * @param {string} functionName - Name of the function (e.g. "listOrgUsers")
 * @param {object} [payload={}] - Request body
 * @returns {Promise<{data: any, status: number}>} Axios-compatible response shape
 */
// Supabase project constants
const SUPABASE_URL = "https://zamrusolomzustgenpin.supabase.co";

/**
 * Invoke a backend function by name with a payload.
 * Uses raw fetch with the user's session JWT in Authorization.
 * Functions deployed with --no-verify-jwt skip gateway JWT validation
 * and verify auth themselves using the service role key.
 */
export async function invokeFunction(functionName, payload = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    return { data, status: response.status };
  } catch (e) {
    console.error(`[invokeFunction] ${functionName} threw:`, e);
    return { data: { error: String(e?.message ?? e) }, status: 500 };
  }
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