import React, { createContext, useState, useEffect } from 'react';
import { logout as authLogout, redirectToLogin as authRedirectToLogin, onAuthStateChange } from '@/lib/adapters/auth';

export const AuthContext = createContext();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value);

/**
 * Build a normalised user object from the Supabase session user.
 * No network calls — uses only the data already present in the event.
 */
function buildUserFromSession(sbUser) {
  return {
    id: sbUser.id,
    email: sbUser.email,
    full_name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User',
    role: sbUser.user_metadata?.role || 'user',
    organization_id: null,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  // Watchdog: if Supabase never fires any auth event within 15 s, give up.
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingAuth(prev => {
        if (prev) {
          console.warn("⚠️ [AuthContext] Auth bootstrap watchdog tripped; forcing login state.");
          setUser(null);
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required' });
        }
        return false;
      });
    }, 15000);
    return () => clearTimeout(timer);
  }, []); // runs once on mount only

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately (supabase-js v2),
    // then SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT as things change.
    // We use the session object provided by the event directly — no extra
    // getSession() / getCurrentUser() call, which avoids the hang when the
    // stored JWT is expired and the token-refresh round-trip is slow.
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChange((event, session) => {
        console.log("🔐 [AuthContext] Auth state changed:", event);

        if (event === 'PASSWORD_RECOVERY') {
          window.location.href = '/ManagerLogin?mode=reset';
          return;
        }

        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED'
        ) {
          if (session?.user) {
            const currentUser = buildUserFromSession(session.user);

            // Apply localStorage overrides (org selection persisted from a
            // previous session or the org-setup modal).
            const storedOrgId = localStorage.getItem('organization_id');
            const storedOrgName = localStorage.getItem('organization_name');
            if (storedOrgId) {
              if (isUuid(storedOrgId)) {
                currentUser.organization_id = storedOrgId;
              } else {
                localStorage.removeItem('organization_id');
              }
            }
            if (storedOrgName) currentUser.organization_name = storedOrgName;

            console.log("✓ [AuthContext] Session applied for:", currentUser.email);
            setUser(currentUser);
            setIsAuthenticated(true);
            setAuthError(null);
            setIsLoadingAuth(false);
          } else if (event === 'INITIAL_SESSION') {
            // No stored session at startup — go to login.
            console.log("⚠️ [AuthContext] No existing session, showing login");
            setUser(null);
            setIsAuthenticated(false);
            setAuthError({ type: 'auth_required' });
            setIsLoadingAuth(false);
          }
          // SIGNED_IN / TOKEN_REFRESHED with null session is unusual; watchdog covers it.
        } else if (event === 'SIGNED_OUT') {
          console.log("👋 [AuthContext] User signed out");
          setUser(null);
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required' });
          setIsLoadingAuth(false);
        }
      });
    } catch (e) {
      console.warn('Auth state change listener failed:', e);
      setIsLoadingAuth(false);
    }

    return unsubscribe;
  }, []);

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    await authLogout();
  };

  const navigateToLogin = () => {
    authRedirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState: async () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
};