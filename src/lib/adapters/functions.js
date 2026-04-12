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
 * Uses supabase.functions.invoke() which automatically handles:
 *   - apikey header (anon key)
 *   - Authorization header (user JWT from current session)
 *   - Token refresh if needed
 *
 * @param {string} functionName - Name of the function (e.g. "listOrgUsers")
 * @param {object} [payload={}] - Request body
 * @returns {Promise<{data: any, status: number}>} Response shape
 */
export async function invokeFunction(functionName, payload = {}) {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      console.error(`[invokeFunction] ${functionName} error:`, error);
      // FunctionsHttpError has a status, FunctionsRelayError / FunctionsFetchError do not
      const status = error.context?.status || 500;
      return { data: { error: error.message || String(error) }, status };
    }

    return { data, status: 200 };
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