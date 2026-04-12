/**
 * BACKEND FUNCTIONS ADAPTER — Supabase Edge Functions.
 * 
 * All backend functions are now hosted on Supabase Edge Functions.
 * Calls go to: {SUPABASE_URL}/functions/v1/{functionName}
 * Auth: Supabase JWT in Authorization header + anon key in apikey header.
 */
import { supabase } from "@/api/supabaseClient";

// Supabase project constants
const SUPABASE_URL = "https://zamrusolomzustgenpin.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_p-ZZcpZzIqRW1dRNoHT69Q_l8l2XH3Q";

/**
 * Invoke a backend function by name with a payload.
 * Uses raw fetch with the user's session JWT in Authorization
 * and the anon key in apikey header (required by the Supabase API gateway).
 *
 * @param {string} functionName - Name of the function (e.g. "listOrgUsers")
 * @param {object} [payload={}] - Request body
 * @returns {Promise<{data: any, status: number}>} Response shape
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
          'apikey': SUPABASE_ANON_KEY,
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