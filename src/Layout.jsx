import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, SiteSettingsRepo } from "@/lib/adapters/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import OfflineBanner from "@/components/offline/OfflineBanner";
import ManagerLayout from "@/components/navigation/ManagerLayout";
import EmployeeLayout from "@/components/navigation/EmployeeLayout";
import RouteGuard from "@/components/navigation/RouteGuard";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { motion, AnimatePresence } from "framer-motion";
import AppFooter from "@/components/navigation/AppFooter";
import { ReadyNormLogoText } from "@/components/brand/ReadyNormLogo";
import ProxiedImage from "@/components/ui/ProxiedImage";
import SessionTimeoutProvider from "@/components/security/SessionTimeoutProvider";

// Tab scroll position store for multi-stack navigation
const tabScrollPositions = {};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  // When the org logo URL exists but fails to load (e.g. CORS on localhost),
  // fall back to the letter-initial square instead of a broken image.
  const [navLogoError, setNavLogoError] = useState(false);
  const location = useLocation();
  
  // Initialize activeTab from URL parameter to preserve state across reloads
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("tab") || "tasks";
  });
  const queryClient = useQueryClient();
  const prevPathRef = useRef(location.pathname);
  const prevTabRef = useRef("tasks");
  const [slideDirection, setSlideDirection] = useState(0);
  
  // Save scroll position for current tab
  const saveTabScrollPosition = useCallback((tabId) => {
    tabScrollPositions[tabId] = window.scrollY;
  }, []);
  
  // Restore scroll position for tab
  const restoreTabScrollPosition = useCallback((tabId) => {
    const savedPosition = tabScrollPositions[tabId] || 0;
    requestAnimationFrame(() => {
      window.scrollTo(0, savedPosition);
    });
  }, []);
  
  // Handle tab change with independent navigation stacks per tab
  const handleTabChange = useCallback((newTab) => {
    // Save current tab's scroll position
    saveTabScrollPosition(prevTabRef.current);
    prevTabRef.current = newTab;
    setActiveTab(newTab);
    // Restore new tab's scroll position
    restoreTabScrollPosition(newTab);
    // Update URL with tab parameter to preserve state across reloads
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.pushState({ tab: newTab, timestamp: Date.now() }, '', url.toString());
  }, [saveTabScrollPosition, restoreTabScrollPosition]);
  
  // Sync activeTab with URL parameters on mount and when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
      prevTabRef.current = tabFromUrl;
    }
  }, [location.search]);
  
  // Listen for browser back/forward navigation to restore tab state
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state?.tab) {
        saveTabScrollPosition(prevTabRef.current);
        prevTabRef.current = event.state.tab;
        setActiveTab(event.state.tab);
        restoreTabScrollPosition(event.state.tab);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [saveTabScrollPosition, restoreTabScrollPosition]);
  
  // Handle clicking already active tab - scroll to top
  const handleActiveTabClick = useCallback((tabId) => {
    tabScrollPositions[tabId] = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Track navigation direction for slide animation
  useEffect(() => {
    const prevPath = prevPathRef.current;
    const currentPath = location.pathname;
    
    // Simple heuristic: deeper paths slide left, shallower slide right
    if (currentPath.length > prevPath.length) {
      setSlideDirection(1); // slide from right
    } else if (currentPath.length < prevPath.length) {
      setSlideDirection(-1); // slide from left
    } else {
      setSlideDirection(0);
    }
    
    prevPathRef.current = currentPath;
  }, [location.pathname]);
  
  // Pull to refresh handler
  const handlePullToRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  // Get org ID and org details from cached React Query
  const layoutSiteCode = localStorage.getItem('site_code');
  
  const { data: layoutOrg = null } = useQuery({
    queryKey: ["organization_by_site_code", layoutSiteCode],
    queryFn: async () => {
      const orgs = await OrganizationRepo.filter({ site_code: layoutSiteCode, status: "active" });
      return orgs[0] || null;
    },
    enabled: !!layoutSiteCode,
    staleTime: 10 * 60 * 1000, // 10 min cache — shared with useOrganization
  });
  
  const layoutOrgId = layoutOrg?.id || null;

  // Reset logo error state whenever the org changes (e.g. site switcher)
  useEffect(() => { setNavLogoError(false); }, [layoutOrg?.id]);

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["site_settings", layoutOrgId],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: layoutOrgId }),
    enabled: !!layoutOrgId,
    staleTime: 5 * 60 * 1000, // 5 min cache
    initialData: []
  });

  const settings = siteSettings[0] || { app_name: "Sanitation Manager", logo_url: null };

  // Load employee from localStorage for employee-specific pages
  useEffect(() => {
    const isEmployeeSpecificPage = (currentPageName?.startsWith("Employee") && currentPageName !== "EmployeeProfile") || 
      currentPageName === "LineCleaningDetail" || 
      currentPageName === "PreOpInspection" ||
      currentPageName === "RainDiverters";
    
    if (isEmployeeSpecificPage) {
      const stored = localStorage.getItem("selectedEmployee");
      if (stored) {
        setEmployee(JSON.parse(stored));
      }
    }
  }, [currentPageName]);

  // Use React Query for auth — shared cache with useOrganization hook
  const { data: authUser, isLoading: authUserLoading } = useQuery({
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
    if (!authUserLoading) {
      setUser(authUser || null);
      setUserLoading(false);
    }
  }, [authUser, authUserLoading]);

  const isLoggedIn = !!user;
  const isEmployeeMode = !!employee;
  
  // Determine if we're on an employee page
    const isEmployeePage = (currentPageName?.startsWith("Employee") && currentPageName !== "EmployeeProfile") || 
      currentPageName === "LineCleaningDetail" || 
      currentPageName === "PreOpInspection" ||
      currentPageName === "RainDiverters";

    // Sanitation Manager pages - ONLY these should show the sanitation manager nav
    const isSanitationManagerPage = currentPageName === "ManagerDashboard" || 
      currentPageName === "Analytics" ||
      currentPageName === "ComplianceDashboard" ||
      currentPageName === "SDSManagement" ||
      currentPageName === "SiteSettings" ||
      currentPageName === "ShiftHandoff" ||
      currentPageName === "DrainManagement" ||
      currentPageName === "ChemicalInventory" ||
      currentPageName === "ChemicalManagement" ||
      currentPageName === "TrainingDocuments" ||
      currentPageName === "CompetencyManagement" ||
      currentPageName === "IncidentsPage" ||
      currentPageName === "AllergenMatrix" ||
      currentPageName === "AuditMode" ||
      currentPageName === "SSOPManagement" ||
      currentPageName === "CrewsManagement" ||
      currentPageName === "LineCleaningsSetup" ||
      currentPageName === "LineCleaningAssignments" ||
      currentPageName === "BadgesManagement" ||
      currentPageName === "PlantSchedule" ||
      currentPageName === "ScheduleManagement" ||
      currentPageName === "DowntimeTracking" ||
      currentPageName === "ManagerRainDiverters" ||
      currentPageName === "RecallManagement" ||
      currentPageName === "CCPMonitoring" ||
      currentPageName === "CalibrationTracking" ||
      currentPageName === "HoldReleaseManagement" ||
      currentPageName === "ReceivingInspections" ||
      currentPageName === "WaterTesting" ||
      currentPageName === "GlassBrittleProgram" ||
      currentPageName === "VisitorManagement" ||
      currentPageName === "ChangeControlProgram" ||
      currentPageName === "ForeignMaterialControl" ||
      currentPageName === "LabelVerificationProgram" ||
      currentPageName === "SOC2Dashboard";

    // Show manager nav on sanitation manager pages for logged-in admin users
    // Also show for logged-in users on manager dashboard regardless of role check timing
    const showManagerNav = user && isSanitationManagerPage && !(isEmployeeMode && isEmployeePage);
  
  // Display info: manager takes precedence over employee
  const displayInfo = isLoggedIn ? {
    name: user?.full_name,
    initials: user?.full_name
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  } : isEmployeeMode ? {
    name: employee?.name,
    initials: employee?.name
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "E"
  } : null;

  // Don't show layout on home/login pages and program landing pages (they have their own nav)
  const noLayoutPages = [
    "Home", 
    "EmployeeLogin",
    "SanitationProgram",
    "QualityProgram",
    "FoodSafetyProgram",
    "PreOpInspection",
    "PostCleanInspection",
    "QualityLogin",
    "MyProfile",
    "OrganizationDashboard",
    "GeneralSiteSettings",
    "PublicPolicies"
  ];
  
  if (noLayoutPages.includes(currentPageName)) {
    return <>{children}</>;
  }
  
  // Dynamically detect child routes by checking if pathname has more than one segment
  // e.g., /EmployeeProfile?id=123 is a child, /Home is not
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const hasQueryParams = window.location.search.length > 0;

  // Pages that are "child" routes and should show back button on mobile
  const childRoutePages = [
    "LineCleaningDetail",
    "PreOpInspection",
    "RainDiverters",
    "EmployeeDrainCleaning",
    "EmployeeInventoryCount"
  ];

  // Show back button if: explicitly listed as child route, or has multiple path segments
  // IMPORTANT: Do NOT treat pages with just ?tab= as child routes — those are tab navigation params
  const hasNonTabQueryParams = (() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("tab"); // tab param is for navigation, not a detail view
    return params.toString().length > 0;
  })();
  
  const isChildRoute = childRoutePages.includes(currentPageName) || 
    pathSegments.length > 1 || 
    (hasNonTabQueryParams && !["Home", "EmployeeDashboard", "ManagerDashboard"].includes(currentPageName));
  
  // Mobile page titles
  const mobilePageTitles = {
    "LineCleaningDetail": "Line Cleaning",
    "PreOpInspection": "Pre-Op Inspection",
    "RainDiverters": "Rain Diverters",
    "EmployeeDrainCleaning": "Drain Cleaning",
    "EmployeeInventoryCount": "Inventory Count"
  };

  // Apply route guard for protected pages
  // These are actual admin-only pages that require auth
  const isProtectedManagerPage = [
  "ManagerDashboard", "Analytics", "SiteSettings", "ChemicalManagement", 
  "TrainingDocuments", "CompetencyManagement", "CrewsManagement", 
  "LineCleaningsSetup", "LineCleaningAssignments", "BadgesManagement",
  "PlantSchedule", "ScheduleManagement", "AuditMode", "AllergenMatrix",
  "SSOPManagement", "DrainManagement", "ChemicalInventory", "ShiftHandoff",
  "SDSManagement", "ComplianceDashboard", "DowntimeTracking", "IncidentsPage",
  "DocumentControl", "CAPAProgram", "PestControl", "EnvironmentalMonitoring",
  "InternalAudit", "TrainingCompetency", "IssuesManagement", "CustomerComplaints",
  "SupplierManagement", "RiskManagement", "FoodSafetyPlan",
  "RecallManagement", "CCPMonitoring", "CalibrationTracking", "HoldReleaseManagement",
  "ReceivingInspections", "WaterTesting", "GlassBrittleProgram", "VisitorManagement",
  "ChangeControlProgram", "ForeignMaterialControl", "LabelVerificationProgram",
  "SOC2Dashboard"
  ].includes(currentPageName);
  
  // EmployeeProfile handles its own redirect if no `id` param is present

  const navItems = [];



  return (
    <SessionTimeoutProvider timeoutMinutes={30} organizationId={layoutOrgId}>
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50",
      isMobile && "safe-area-pt"
    )}>
      {/* Mobile Header for child routes */}
      {isMobile && isChildRoute && (
        <MobileHeader
          showBackButton={true}
          title={mobilePageTitles[currentPageName] || currentPageName}
          employee={employee}
        />
      )}
      
      {/* Desktop Navigation - Hidden on mobile for employee pages, or when showing mobile header */}
      <nav className={cn(
        "bg-white border-b border-slate-200 sticky top-0 z-[9999]",
        isMobile && (isEmployeePage || isChildRoute) && "hidden"
      )}>
        <div className="w-full px-3 sm:px-4 md:px-6 max-w-[1600px] mx-auto">
          <div className="flex items-center h-14 sm:h-16 py-2 gap-2 overflow-hidden">
            {/* Left: Back button (manager pages) or Logo (other pages) — never shrinks */}
            {showManagerNav ? (
              <button 
                onClick={() => window.location.href = createPageUrl("Home")}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm flex-shrink-0"
              >
                <span className="text-slate-600 text-lg">←</span>
              </button>
            ) : (
              <Link to={createPageUrl(isEmployeeMode && isEmployeePage ? "EmployeeDashboard" : "Home")} className="flex items-center flex-shrink-0">
                <ReadyNormLogoText className="h-6 sm:h-7 w-auto text-slate-900" />
              </Link>
            )}

            {/* Center: Org name — takes remaining space, clips with truncate */}
            {showManagerNav && layoutOrg ? (
              <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                <img src="/readynorm-logo-large.svg" alt="ReadyNorm" className="h-6 w-auto flex-shrink-0" />
                <div className="h-5 w-px bg-slate-300 flex-shrink-0" />
                {layoutOrg.logo_url && !navLogoError ? (
                  <ProxiedImage
                    src={layoutOrg.logo_url}
                    alt=""
                    className="h-5 w-auto flex-shrink-0 max-w-[48px] object-contain"
                    onError={() => setNavLogoError(true)}
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {(layoutOrg.site_name || layoutOrg.name)?.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {layoutOrg.site_name || layoutOrg.name}
                </span>
              </div>
            ) : (isLoggedIn || isEmployeeMode) ? (
              <div className="hidden md:flex items-center gap-1 flex-1">
                {navItems.map(item => (
                  <Link 
                    key={item.href}
                    to={createPageUrl(item.href)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                      currentPageName === item.href 
                        ? "bg-slate-100 text-slate-900" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}

            {/* Right side actions — never shrinks, always fully visible */}
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-auto">
              {/* Site code pill removed from nav - now in footer */}

              {/* Employee layout - for employee-specific pages (desktop only) */}
              {!isMobile && isEmployeeMode && isEmployeePage && (
                <EmployeeLayout employee={employee} />
              )}

              {/* Manager layout - show for logged in admin users (except on employee pages in employee mode or standalone program pages) */}
              {!userLoading && showManagerNav && (
                <div className="flex items-center gap-1">
                  <ManagerLayout user={user} orgId={layoutOrgId} />
                </div>
              )}

              {/* Not logged in and no employee - show sign in button */}
              {!userLoading && !user && !employee && (
                <Button 
                  onClick={() => window.location.href = '/ManagerLogin'}
                  className="bg-slate-900 hover:bg-slate-800 text-sm sm:text-base h-11 min-h-[44px]"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Main Content
          IMPORTANT: Always render the same tree regardless of isMobile to prevent unmount/remount.
          PullToRefresh is enabled only on mobile (and disabled for EmployeeDashboard which handles its own). */}
      <PullToRefresh
        onRefresh={handlePullToRefresh}
        enabled={isMobile && currentPageName !== "EmployeeDashboard"}
        className={cn("w-full overflow-x-hidden", isMobile && isEmployeePage && "pb-20")}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0.9, x: isMobile ? slideDirection * 20 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0.9, x: isMobile ? slideDirection * -20 : 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full overflow-x-hidden"
          >
            {isProtectedManagerPage ? (
              <RouteGuard currentPageName={currentPageName}>
                {children}
              </RouteGuard>
            ) : (
              children
            )}
          </motion.main>
        </AnimatePresence>
      </PullToRefresh>

      {/* Footer with logo and site code */}
      {(isLoggedIn || isEmployeeMode) && !noLayoutPages.includes(currentPageName) && (
        <AppFooter siteCode={layoutSiteCode} />
      )}

      {/* Mobile Bottom Navigation — EmployeeDashboard renders its own MobileBottomNav
          with proper tab state management, so we skip it here for that page */}
      {isMobile && isEmployeePage && employee && !isChildRoute && currentPageName !== "EmployeeDashboard" && (
        <MobileBottomNav 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onActiveTabClick={handleActiveTabClick}
        />
      )}


      </div>
      </SessionTimeoutProvider>
      );
      }