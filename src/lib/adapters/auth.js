/**
 * AUTH ADAPTER — Supabase Authentication ()
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
    return session;
  } catch (error) {
    console.error("[Auth] Error getting session:", error.message);
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
  const session = await getSupabaseSession();
  if (!session?.user) return null;

  const sbUser = session.user;
  
  const userData = {
    id: sbUser.id,
    email: sbUser.email,
    full_name: sbUser.user_metadata?.full_name || sbUser.email.split('@')[0],
    role: 'user',
    organization_id: null,
  };

  // Optional profile lookup only if a User table exists in this project
  if (ENABLE_USER_TABLE_LOOKUPS && !userTableUnavailable) {
    try {
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .eq('email', sbUser.email)
        .maybeSingle();

      if (!error && data) {
        Object.assign(userData, data);
      } else if (error) {
        if (isMissingUserTableError(error)) {
          userTableUnavailable = true;
        }
      }
    } catch (err) {
      if (isMissingUserTableError(err)) {
        userTableUnavailable = true;
      }
    }
  }

  // Guard against legacy non-UUID org IDs causing Postgres 22P02 errors downstream.
  if (!isUuid(userData.organization_id)) {
    userData.organization_id = null;
  }

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
    const { error } = await supabase
      .from('User')
      .update(payload)
      .eq('email', session.user.email);
    
    if (error) {
      if (isMissingUserTableError(error)) {
        userTableUnavailable = true;
        return;
      }
      // Silently continue if User table doesn't exist yet
      return;
    }
  } catch (err) {
    // Don't throw — let the app continue
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