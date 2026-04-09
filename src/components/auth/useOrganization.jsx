import { useEffect, useRef } from "react";
import { isAuthenticated, getCurrentUser, redirectToLogin } from "@/lib/adapters/auth";
import { OrganizationRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";

// Module-level cache so multiple hook instances share the same resolved org
let _cachedOrg = null;
let _cachedOrgSiteCode = null;

/**
 * CRITICAL: Centralized organization resolution hook.
 * This is the SINGLE SOURCE OF TRUTH for determining the current organization.
 * 
 * Uses React Query for caching — the Organization.filter call only runs once
 * and is shared across all components that use this hook.
 */
export function useOrganization({ requireAuth = true, redirectIfMissing = true } = {}) {
  const siteCode = localStorage.getItem('site_code');
  const didRedirect = useRef(false);

  // Use React Query for auth — shared cache across all instances
  const { data: user, isLoading: authLoading, isSuccess: authSuccess } = useQuery({
    queryKey: ["auth_me"],
    queryFn: async () => {
      const isAuth = await isAuthenticated();
      if (!isAuth) return null;
      return getCurrentUser();
    },
    enabled: requireAuth,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Redirect to login if auth required and query finished with null result
  useEffect(() => {
    if (requireAuth && authSuccess && user === null && !didRedirect.current) {
      didRedirect.current = true;
      redirectToLogin();
    }
  }, [requireAuth, authSuccess, user]);

  // Use React Query for org lookup — shared cache across all instances
  const { data: orgResult, isLoading: orgLoading, isSuccess: orgSuccess } = useQuery({
    queryKey: ["organization_by_site_code", siteCode],
    queryFn: async () => {
      // Check module-level cache first
      if (_cachedOrg && _cachedOrgSiteCode === siteCode) {
        return _cachedOrg;
      }
      const orgs = await OrganizationRepo.filter({ 
        site_code: siteCode, 
        status: "active" 
      });
      if (orgs.length > 0) {
        _cachedOrg = orgs[0];
        _cachedOrgSiteCode = siteCode;
        return orgs[0];
      }
      return null;
    },
    enabled: !!siteCode,
    staleTime: 10 * 60 * 1000, // 10 minutes — org data rarely changes
    retry: 1,
  });

  // Handle missing site code or invalid org
  useEffect(() => {
    if (didRedirect.current) return;
    
    if (!siteCode && redirectIfMissing) {
      didRedirect.current = true;
      window.location.href = createPageUrl("Home");
      return;
    }
    
    if (orgSuccess && siteCode && orgResult === null && redirectIfMissing) {
      localStorage.removeItem('site_code');
      didRedirect.current = true;
      window.location.href = createPageUrl("Home");
    }
  }, [siteCode, orgSuccess, orgResult, redirectIfMissing]);

  const isLoading = (requireAuth ? authLoading : false) || (siteCode ? orgLoading : false);

  return {
    organizationId: orgResult?.id || null,
    organization: orgResult || null,
    user: user || null,
    isLoading,
    error: (!siteCode && !redirectIfMissing) ? "No site code found" : null,
    siteCode
  };
}

export default useOrganization;