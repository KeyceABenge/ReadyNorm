import { useEffect, useState } from "react";
import { isAuthenticated, getCurrentUser, redirectToLogin } from "@/lib/adapters/auth";
import { useQuery } from "@tanstack/react-query";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";

export function useRouteGuard(currentPageName) {
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [didRedirect, setDidRedirect] = useState(false);

  // Reuse the same cached auth query as Layout and useOrganization
  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ["auth_me"],
    queryFn: async () => {
      const isAuth = await isAuthenticated();
      if (!isAuth) return null;
      return getCurrentUser();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (authLoading || didRedirect) return;

    if (user) {
      setIsAuthorized(true);
      return;
    }

    // Not authenticated — check standalone mode
    const isStandaloneMode = sessionStorage.getItem('standalone_program') === 'true';
    if (isStandaloneMode) {
      setIsAuthorized(true);
      return;
    }

    // Redirect to login
    setDidRedirect(true);
    redirectToLogin(window.location.href);
  }, [authLoading, user, didRedirect]);

  return { isAuthorized, isLoading: authLoading, userRole: user?.role || null };
}

export default function RouteGuard({ children, currentPageName }) {
  const { isAuthorized, isLoading } = useRouteGuard(currentPageName);

  if (isLoading || isAuthorized === null) {
    return <ReadyNormLoader />;
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  return children;
}