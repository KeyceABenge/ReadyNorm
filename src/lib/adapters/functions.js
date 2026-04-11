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
export async function invokeFunction(functionName, payload = {}) {
  try {
    // Explicitly get the session JWT. With sb_publishable_ keys, the SDK's
    // default Bearer token is the publishable key (not a JWT), which Supabase's
    // edge function gateway rejects as "Invalid JWT". We override it here.
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers: accessToken
        ? { 'Authorization': `Bearer ${accessToken}` }
        : {},
    });

    if (error) {
      const status = error?.context?.status ?? 500;
      let errorBody = { error: error.message };
      try {
        const parsed = await error.context?.json?.();
        if (parsed) errorBody = parsed;
      } catch (_) { /* non-JSON body */ }
      return { data: errorBody, status };
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