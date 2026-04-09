import { useContext } from 'react';
import { AuthContext } from '@/lib/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // During Vite Fast Refresh, context can be briefly unavailable.
    // Return a safe fallback that avoids infinite loader.
    return {
      user: null,
      isAuthenticated: false,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: { type: 'auth_required' },
      appPublicSettings: null,
      logout: async () => {},
      navigateToLogin: () => {},
      checkAppState: async () => {},
    };
  }
  return context;
};

export default useAuth;
