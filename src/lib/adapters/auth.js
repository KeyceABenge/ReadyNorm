/**
 * AUTH ADAPTER — Supabase Authentication (no Base44)
 * All auth goes through Supabase. No fallback.
 */
import { supabase } from "@/api/supabaseClient";

const ENABLE_USER_TABLE_LOOKUPS = false;

let userTableUnavailable = !ENABLE_USER_TABLE_LOOKUPS;

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isMissingUserTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 'PGRST205' || message.includes("could not find the table 'public.user'");
}

async function getSupabaseSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log("✓ [Auth] Session exists for:", session.user?.email);
      // Also log the token expiry to detect if session is stale
      const expiresIn = session.expires_in;
      const expiresAt = session.expires_at;
      console.log("  ℹ️ Session valid for", expiresIn, "seconds, expires at:", new Date(expiresAt * 1000).toISOString());
    } else {
      console.log("❌ [Auth] No session found");
      // Check if there's auth data in localStorage that we might be missing
      const storedAuth = localStorage.getItem('supabase.auth.token');
      console.log("  ℹ️ Auth token in localStorage:", storedAuth ? 'YES' : 'NO');
    }
    return session;
  } catch (error) {
    console.error("❌ [Auth] Error getting session:", error.message);
    return null;
  }
}

/**
 * Get the currently authenticated user.
 * 
 * IMPORTANT: This function now works WITHOUT a User table.
 * It returns the Supabase auth user data directly.
 * Optional: Later you can add a User table for custom fields.
 */
export async function getCurrentUser() {
  console.log("🔍 [Auth] Checking current user session...");
  const session = await getSupabaseSession();
  if (!session?.user) {
    console.log("❌ [Auth] No session found");
    return null;
  }

  const sbUser = session.user;
  console.log("✓ [Auth] Session found for:", sbUser.email);
  
  // Build user data from Supabase auth user
  // Attempt to get User profile as a bonus, but don't block on it
  const userData = {
    id: sbUser.id,
    email: sbUser.email,
    full_name: sbUser.user_metadata?.full_name || sbUser.email.split('@')[0],
    role: 'user', // Default role, will be overridden by profile if it exists
    organization_id: null,
  };

  // Optional profile lookup only if a User table exists in this project
  if (ENABLE_USER_TABLE_LOOKUPS && !userTableUnavailable) {
    try {
      console.log("🔍 [Auth] Attempting to look up User profile for email:", sbUser.email);

      const { data, error } = await supabase
        .from('User')
        .select('*')
        .eq('email', sbUser.email)
        .maybeSingle();

      if (!error && data) {
        console.log("✓ [Auth] Profile found:", data?.email);
        Object.assign(userData, data);
      } else if (error) {
        if (isMissingUserTableError(error)) {
          userTableUnavailable = true;
          console.log("ℹ️ [Auth] User table not present. Skipping future User-table lookups.");
        } else {
          console.log("ℹ️ [Auth] User table lookup:", error.code === 'PGRST116' ? "no profile exists (will use defaults)" : error.message);
        }
      }
    } catch (err) {
      if (isMissingUserTableError(err)) {
        userTableUnavailable = true;
        console.log("ℹ️ [Auth] User table not present. Skipping future User-table lookups.");
      } else {
        console.log("ℹ️ [Auth] User table query skipped:", err.message);
      }
    }
  }

  // Guard against legacy non-UUID org IDs causing Postgres 22P02 errors downstream.
  if (!isUuid(userData.organization_id)) {
    userData.organization_id = null;
  }

  console.log("✓ [Auth] Returning user:", userData.email, "role:", userData.role);
  return userData;
}

/**
 * Check if a user is currently authenticated.
 */
export async function isAuthenticated() {
  const session = await getSupabaseSession();
  return !!session;
}

/**
 * Update custom fields on the current user's profile.
 * Gracefully handles the case where the User table doesn't exist yet.
 */
export async function updateCurrentUser(data) {
  const session = await getSupabaseSession();
  if (!session?.user) throw new Error('Not authenticated');

  if (userTableUnavailable) return;

  const payload = { ...data };
  if ('organization_id' in payload && payload.organization_id && !isUuid(payload.organization_id)) {
    delete payload.organization_id;
  }

  if (Object.keys(payload).length === 0) return;

  try {
    console.log("🔍 [Auth] Updating user profile with:", Object.keys(data));
    const { error } = await supabase
      .from('User')
      .update(payload)
      .eq('email', session.user.email);
    
    if (error) {
      if (isMissingUserTableError(error)) {
        userTableUnavailable = true;
        return;
      }
      console.warn("⚠️ [Auth] Update error:", error.message);
      // Silently continue if User table doesn't exist yet
      // This allows the app to work without the User table for now
      return;
    }
    console.log("✓ [Auth] User profile updated");
  } catch (err) {
    console.log("ℹ️ [Auth] Profile update skipped (User table may not exist):", err.message);
    // Don't throw - let the app continue
  }
}

/**
 * Log out the current user.
 */
export async function logout() {
  // Clear all app session data
  localStorage.removeItem('site_code');
  localStorage.removeItem('site_role');
  localStorage.removeItem('selectedEmployee');
  
  // Sign out from Supabase — await it so the session is fully cleared
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // If signOut fails, manually clear Supabase tokens
  }
  
  // Clear any remaining Supabase auth tokens from localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Redirect to login
  window.location.href = '/ManagerLogin';
}

/**
 * Redirect to the manager login page.
 */
export function redirectToLogin(nextUrl) {
  const loginUrl = nextUrl ? `/ManagerLogin?next=${encodeURIComponent(nextUrl)}` : '/ManagerLogin';
  window.location.href = loginUrl;
}

/**
 * Send a magic link to the given email.
 */
export async function sendMagicLink(email) {
  const redirectTo = "https://readynorm.app/";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });
  return { error };
}

/**
 * Listen to auth state changes.
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

/**
 * Invite a new user — creates a row in the User table.
 */
export async function inviteUser(email, role) {
  if (userTableUnavailable) return;
  const { error } = await supabase
    .from('User')
    .upsert({ email, role }, { onConflict: 'email' });
  if (error && isMissingUserTableError(error)) {
    userTableUnavailable = true;
    return;
  }
  if (error) throw error;
}