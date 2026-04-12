// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { ShieldCheck, Brush, LayoutDashboard, Award, Leaf, LogOut, Clock, Building2, Settings
} from "lucide-react";
import { toast } from "sonner";
import { isAuthenticated, getCurrentUser, updateCurrentUser, logout } from "@/lib/adapters/auth";
import useSecurityLogger from "@/hooks/useSecurityLogger";
import { clearAttempts, recordFailedAttempt } from "@/components/security/LoginRateLimiter";
import { OrganizationRepo, OrganizationGroupRepo, OrgGroupMembershipRepo, SiteSettingsRepo, AccessRequestRepo } from "@/lib/adapters/database";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";
import { useQuery } from "@tanstack/react-query";
import OrganizationSetupModal from "@/components/modals/OrganizationSetupModal";
import ManagerPasscodeModal from "@/components/modals/ManagerPasscodeModal";
import ProgramCard from "@/components/home/ProgramCard";
import { Link } from "react-router-dom";
import AccessRequestForm, { getDeviceId } from "@/components/access/AccessRequestForm";
import RoleChooser from "@/components/home/RoleChooser";
import EmployeeLanding from "@/components/home/EmployeeLanding";
import CreateOrganizationModal from "@/components/org/CreateOrganizationModal";
import SiteSwitcher from "@/components/home/SiteSwitcher";
import { ReadyNormLogoIcon } from "@/components/brand/ReadyNormLogo";
import ProxiedImage from "@/components/ui/ProxiedImage";
import PasscodeExpiryReminder from "@/components/security/PasscodeExpiryReminder";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === "string" && UUID_REGEX.test(value);

export default function Home() {
  const [showOrgSetup, setShowOrgSetup] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [siteCode, setSiteCode] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState(false);
  const [accessStatus, setAccessStatus] = useState(null); // null = loading, "approved", "pending", "denied", "none"
  const [existingRequest, setExistingRequest] = useState(null);
  const [chosenRole, setChosenRole] = useState(() => {
    const stored = localStorage.getItem("site_role");
    // manager_pending is a UI state, not stored permanently
    return stored === "manager_pending" ? "manager_pending" : stored || null;
  });
  const [managerAccessStatus, setManagerAccessStatus] = useState(null); // null, "pending", "approved", "denied"
  const [managerRequest, setManagerRequest] = useState(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [authResolved, setAuthResolved] = useState(false); // true once initializeSite finishes auth check
  const { logEvent } = useSecurityLogger();

  // Check if current site belongs to an org group
  const { data: orgGroup = null } = useQuery({
    queryKey: ["org_group_for_site", organization?.id],
    queryFn: async () => {
      if (!organization?.org_group_id) return null;
      const groups = await OrganizationGroupRepo.filter({ id: organization.org_group_id, status: "active" });
      return groups[0] || null;
    },
    enabled: !!organization?.org_group_id,
    staleTime: 5 * 60 * 1000
  });

  // Check if user is an org member (to show org dashboard link)
  const { data: userOrgMembership = null } = useQuery({
    queryKey: ["user_org_membership", currentUser?.email],
    queryFn: async () => {
      const memberships = await OrgGroupMembershipRepo.filter({
        user_email: currentUser.email,
        status: "active"
      });
      return memberships[0] || null;
    },
    enabled: !!currentUser?.email,
    staleTime: 5 * 60 * 1000
  });

  // Fetch all sites in the org group for site switching
  const { data: orgGroupSites = [] } = useQuery({
    queryKey: ["org_group_sites_for_switcher", organization?.org_group_id],
    queryFn: () => OrganizationRepo.filter({ org_group_id: organization.org_group_id, status: "active" }),
    enabled: !!organization?.org_group_id,
    staleTime: 5 * 60 * 1000
  });

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["site_settings", organization?.id],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
    initialData: []
  });

  const settings = siteSettings[0] || { 
    app_name: "ReadyNorm", 
    logo_url: null,
    programs_enabled: { sanitation: true, quality: true, food_safety: true }
  };

  const programsEnabled = settings.programs_enabled || { sanitation: true };

  useEffect(() => {
    const initializeSite = async () => {
      setIsLoading(true);
      
      try {
        const storedOrgId = localStorage.getItem('organization_id');
        if (storedOrgId && !isUuid(storedOrgId)) {
          localStorage.removeItem('organization_id');
        }

        const urlParams = new URLSearchParams(window.location.search);
        const urlSiteCode = urlParams.get('site');
        const storedSiteCode = localStorage.getItem('site_code');
        let code = urlSiteCode || storedSiteCode;

        // Try to get authenticated user
        let userData = null;
        try {
          const isAuth = await isAuthenticated();
          if (isAuth) {
            userData = await getCurrentUser();
            setCurrentUser(userData);
          }
        } catch (e) {
          // Not authenticated — fine
        }

        // ── Membership gate ────────────────────────────────────────────────────
        // If a site code was cached/resolved AND the user is authenticated, verify
        // they still have active access before trusting it.
        // Skip for URL-supplied codes (explicit navigation always trusted).
        //
        // Priority order:
        //   1. Active org_group_memberships row  → allow
        //   2. No membership rows at all AND user is creator/group-owner → allow (legacy)
        //   3. Membership exists but inactive / no access to this site  → deny, clear cache
        if (code && !urlSiteCode && userData) {
          try {
            const codeOrgs = await OrganizationRepo.filter({ site_code: code, status: "active" });
            const codeOrg = codeOrgs[0];
            if (codeOrg && codeOrg.org_group_id) {
              const emailLower = userData.email.toLowerCase();

              // Always fetch ALL membership rows (any status) for this user+group
              const allMemberships = await OrgGroupMembershipRepo.filter({
                user_email: emailLower,
                org_group_id: codeOrg.org_group_id,
              });
              const activeMemberships = allMemberships.filter(m => m.status === "active");

              const hasActiveMembership = activeMemberships.some(m =>
                m.site_access_type === "all" ||
                (Array.isArray(m.allowed_site_ids) && m.allowed_site_ids.includes(codeOrg.id))
              );

              if (hasActiveMembership) {
                // ✅ Valid active membership — pass through
              } else if (allMemberships.length === 0) {
                // No membership rows at all → legacy org. Only trust if user is
                // the actual creator or org group owner (no membership system yet).
                const isCreator = codeOrg.created_by && codeOrg.created_by.toLowerCase() === emailLower;
                let isGroupOwner = false;
                if (!isCreator) {
                  const ownedGroups = await OrganizationGroupRepo.filter({ owner_email: userData.email });
                  isGroupOwner = ownedGroups.some(g => g.id === codeOrg.org_group_id);
                }
                if (!isCreator && !isGroupOwner) {
                  console.log("[Home] Membership gate: no membership, not creator — clearing cache.");
                  code = null;
                  localStorage.removeItem('site_code');
                  localStorage.removeItem('organization_id');
                  localStorage.removeItem('site_role');
                }
              } else {
                // Membership rows exist but none are active for this site → user left
                console.log("[Home] Membership gate: user has left this site — clearing cache.");
                code = null;
                localStorage.removeItem('site_code');
                localStorage.removeItem('organization_id');
                localStorage.removeItem('site_role');
              }
            }
          } catch (e) {
            console.warn("[Home] Membership gate check failed, keeping cached code:", e?.message);
          }
        }

        // Helper: given a list of orgs, return the first one the user still has
        // active membership for. Falls back to the first org only when NO membership
        // rows exist at all (truly legacy org before the membership model was added).
        const pickAccessibleSite = async (orgs, emailLower) => {
          for (const org of orgs) {
            if (!org.site_code) continue;
            if (!org.org_group_id) return org; // no membership system on this org
            const allM = await OrgGroupMembershipRepo.filter({
              user_email: emailLower,
              org_group_id: org.org_group_id,
            });
            if (allM.length === 0) return org; // legacy — no rows yet
            const hasActive = allM.filter(m => m.status === "active").some(m =>
              m.site_access_type === "all" ||
              (Array.isArray(m.allowed_site_ids) && m.allowed_site_ids.includes(org.id))
            );
            if (hasActive) return org;
          }
          return null;
        };

        // If no code, try to resolve from user's org — each path is independent
        // NOTE: status:"active" is intentionally omitted from resolution paths to handle
        // legacy orgs migrated from Base44 that may not have the status field set.
        let resolvedViaOwnership = false; // true when user is identified as org owner/creator

        if (!code && userData) {

          // Path 1: org_id cached in localStorage from a previous session
          if (!code) {
            try {
              const storedOrgId = localStorage.getItem('organization_id');
              if (isUuid(storedOrgId)) {
                const userOrgs = await OrganizationRepo.filter({ id: storedOrgId });
                const accessible = await pickAccessibleSite(userOrgs, userData.email.toLowerCase());
                if (accessible?.site_code) {
                  code = accessible.site_code;
                  localStorage.setItem('site_code', code);
                  console.log("[Home] Path 1 (cached org_id) found code:", code);
                }
              }
            } catch (e) { console.warn("[Home] Path 1 (cached org_id) failed:", e?.message); }
          }

          // Path 2: org where created_by = user email (new Supabase orgs)
          if (!code) {
            try {
              const createdOrgs = await OrganizationRepo.filter({ created_by: userData.email });
              const accessible = await pickAccessibleSite(createdOrgs, userData.email.toLowerCase());
              if (accessible?.site_code) {
                code = accessible.site_code;
                resolvedViaOwnership = true;
                localStorage.setItem('site_code', code);
                try { await updateCurrentUser({ organization_id: accessible.id }); } catch (_) {}
                console.log("[Home] Path 2 (created_by email) found code:", code);
              }
            } catch (e) { console.warn("[Home] Path 2 (created_by) failed:", e?.message); }
          }

          // Path 3: OrganizationGroup.owner_email → Organization.org_group_id
          // Most reliable for org owners — owner_email is always the real email,
          // and the group's id is always a valid Supabase UUID.
          // Handles legacy orgs where created_by was stored as a Base44 ObjectId.
          if (!code) {
            try {
              const ownedGroups = await OrganizationGroupRepo.filter({ owner_email: userData.email });
              for (const group of ownedGroups) {
                if (!isUuid(group.id)) continue;
                const groupSites = await OrganizationRepo.filter({ org_group_id: group.id });
                const accessible = await pickAccessibleSite(groupSites, userData.email.toLowerCase());
                if (accessible?.site_code) {
                  code = accessible.site_code;
                  resolvedViaOwnership = true;
                  localStorage.setItem('site_code', code);
                  try { await updateCurrentUser({ organization_id: accessible.id }); } catch (_) {}
                  console.log("[Home] Path 3 (org group owner) found code:", code);
                  break;
                }
              }
            } catch (e) { console.warn("[Home] Path 3 (org group owner) failed:", e?.message); }
          }

          // Path 4: approved access request by email
          if (!code) {
            try {
              const approvedRequests = await AccessRequestRepo.filter(
                { requester_email: userData.email.toLowerCase(), status: "approved" },
                "-created_date",
                5
              );
              const validReq = approvedRequests.find(r => isUuid(r.organization_id));
              if (validReq) {
                const reqOrgs = await OrganizationRepo.filter({ id: validReq.organization_id });
                if (reqOrgs.length > 0 && reqOrgs[0].site_code) {
                  code = reqOrgs[0].site_code;
                  localStorage.setItem('site_code', code);
                  try { await updateCurrentUser({ organization_id: reqOrgs[0].id }); } catch (_) {}
                  console.log("[Home] Path 4 (access_requests) found code:", code);
                }
              }
            } catch (e) { console.warn("[Home] Path 4 (access_requests) failed:", e?.message); }
          }

          // Path 5: org_group_memberships by email (skip rows with corrupt non-UUID org_group_id)
          if (!code) {
            try {
              const memberships = await OrgGroupMembershipRepo.filter({
                user_email: userData.email, status: "active"
              });
              for (const membership of memberships) {
                if (!isUuid(membership.org_group_id)) continue;
                const groupSites = await OrganizationRepo.filter({ org_group_id: membership.org_group_id });
                if (groupSites.length > 0 && groupSites[0].site_code) {
                  code = groupSites[0].site_code;
                  // Org owners and admins in the group
                  if (["org_owner", "org_manager", "org_admin"].includes(membership.role)) {
                    resolvedViaOwnership = true;
                  }
                  localStorage.setItem('site_code', code);
                  try { await updateCurrentUser({ organization_id: groupSites[0].id }); } catch (_) {}
                  console.log("[Home] Path 5 (membership) found code:", code);
                  break;
                }
              }
            } catch (e) { console.warn("[Home] Path 5 (membership) failed:", e?.message); }
          }
        }

        if (code) {
          try {
            // Try active orgs first; fall back to any status (handles migrated orgs)
            let orgs = await OrganizationRepo.filter({ site_code: code, status: "active" });
            if (orgs.length === 0) {
              orgs = await OrganizationRepo.filter({ site_code: code });
            }
            if (orgs.length > 0) {
              setSiteCode(code);
              setOrganization(orgs[0]);
              localStorage.setItem('site_code', code);

              // ── Ownership resolution (runs even when site_code was already cached) ──
              // The 5 paths above only run when code was missing, so resolvedViaOwnership
              // is always false for returning users. We re-check here against the resolved org.
              if (userData && !resolvedViaOwnership) {
                // Case-insensitive created_by match (handles email casing differences)
                if (orgs[0].created_by && userData.email.toLowerCase() === orgs[0].created_by.toLowerCase()) {
                  resolvedViaOwnership = true;
                }
                // Check org group owner_email
                if (!resolvedViaOwnership && orgs[0].org_group_id) {
                  try {
                    const ownedGroups = await OrganizationGroupRepo.filter({ owner_email: userData.email });
                    if (ownedGroups.some(g => g.id === orgs[0].org_group_id)) {
                      resolvedViaOwnership = true;
                    }
                  } catch (_) {}
                }
                // NOTE: We intentionally do NOT fall back to localStorage.site_role here.
                // The membership gate above already validated access before this point,
                // so an expired/stale site_role in localStorage must not re-grant access.
              }

              const isManager = userData && (
                userData.role === "admin" ||
                resolvedViaOwnership
              );
              
              if (isManager) {
                console.log("✓ User is manager/owner - granting access");
                setAccessStatus("approved");
                localStorage.setItem("site_role", "manager");
                setChosenRole("manager");
              } else {
                // Check access request — first by device_id, then fall back to email if authenticated
                try {
                  const deviceId = getDeviceId();
                  let existingRequests = await AccessRequestRepo.filter({
                    organization_id: orgs[0].id, device_id: deviceId
                  }, "-created_date");

                  // If no device match but user is authenticated, look up by email
                  if (existingRequests.length === 0 && userData?.email) {
                    existingRequests = await AccessRequestRepo.filter({
                      organization_id: orgs[0].id, requester_email: userData.email.toLowerCase()
                    }, "-created_date");
                  }

                  if (existingRequests.length > 0) {
                    const generalReq = existingRequests.find(r => !r.requested_role || r.requested_role === "employee");
                    const managerReq = existingRequests.find(r => r.requested_role === "manager");
                    const latest = generalReq || existingRequests[0];
                    setExistingRequest(latest);
                    setAccessStatus(latest.status === "approved" ? "approved" : latest.status);
                    if (managerReq) {
                      setManagerRequest(managerReq);
                      setManagerAccessStatus(managerReq.status);
                      if (managerReq.status === "approved") {
                        localStorage.setItem("site_role", "manager");
                        setChosenRole("manager");
                      } else if (localStorage.getItem("site_role") === "manager_pending" && managerReq.status === "approved") {
                        localStorage.setItem("site_role", "manager");
                      }
                    }
                    // Auto-apply stored role for approved users
                    if (latest.status === "approved") {
                      const storedRole = localStorage.getItem("site_role");
                      if (storedRole === "employee" || storedRole === "manager") {
                        setChosenRole(storedRole);
                      }
                    }
                  } else {
                    setAccessStatus("none");
                  }
                } catch (e) {
                  console.warn("Error checking access:", e);
                  setAccessStatus("none");
                }
              }
            } else {
              localStorage.removeItem('site_code');
              toast.error("Invalid site code");
            }
          } catch (e) {
            console.error("Error validating site code:", e);
            if (e?.status === 429 && code) {
              setSiteCode(code);
              toast.error("Server is busy. Please try again.");
            }
          }
        }
      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        setIsLoading(false);
        setAuthResolved(true);
      }
    };
    
    initializeSite();
  }, []);

  const handleManagerLogin = async () => {
    if (!siteCode || !organization) {
      toast.error("No site code found. Please create a new site first.");
      return;
    }
    
    if (!organization.manager_passcode) {
      await proceedWithAuth();
      return;
    }
    
    setShowPasscodeModal(true);
  };

  const proceedWithAuth = async () => {
    try {
      const isAuth = await isAuthenticated();
      if (isAuth) {
        sessionStorage.removeItem('standalone_program');
        window.location.href = createPageUrl("ManagerDashboard");
      } else {
        window.location.href = "/ManagerLogin";
      }
    } catch (e) {
      window.location.href = "/ManagerLogin";
    }
  };

  const handleRoleSelect = async (role) => {
    if (role === "employee") {
      localStorage.setItem("site_role", "employee");
      setChosenRole("employee");
    } else if (role === "manager") {
      // Check if there's already a manager request
      if (managerAccessStatus === "approved") {
        // Already approved as manager - proceed to auth
        localStorage.setItem("site_role", "manager");
        setChosenRole("manager");
        handleManagerLogin();
        return;
      }
      
      if (managerAccessStatus === "pending") {
        // Already pending
        setChosenRole("manager_pending");
        return;
      }
      
      // Submit a manager access request
      const deviceId = getDeviceId();
      const req = await AccessRequestRepo.create({
        organization_id: organization.id,
        site_code: siteCode,
        requester_name: existingRequest?.requester_name || "Manager Request",
        requester_email: existingRequest?.requester_email || "",
        device_id: deviceId,
        requested_role: "manager",
        status: "pending"
      });
      setManagerRequest(req);
      setManagerAccessStatus("pending");
      setChosenRole("manager_pending");
      localStorage.setItem("site_role", "manager_pending");
      toast.success("Manager access request submitted for admin approval");
    }
  };

  const handleChangeRole = () => {
    localStorage.removeItem("site_role");
    setChosenRole(null);
  };

  const handlePasscodeSubmit = async (passcode) => {
    setIsVerifyingPasscode(true);
    
    if (passcode !== organization.manager_passcode) {
      setIsVerifyingPasscode(false);
      // Track failed attempt for rate limiting
      const result = recordFailedAttempt();
      if (result.isLocked) {
        toast.error("Too many failed attempts. Locked for 15 minutes.");
        if (organization?.id) logEvent("access_denied", organization.id, "Passcode lockout triggered");
      } else {
        toast.error(`Incorrect passcode. ${result.attemptsRemaining} attempt${result.attemptsRemaining !== 1 ? "s" : ""} remaining.`);
        if (organization?.id) logEvent("access_denied", organization.id, "Failed passcode attempt");
      }
      // Notify the modal component
      if (typeof ManagerPasscodeModal.onFailed === "function") ManagerPasscodeModal.onFailed();
      return;
    }
    
    // Success — clear attempts and log
    clearAttempts();
    if (organization?.id) logEvent("login", organization.id, "Manager login via passcode");
    if (typeof ManagerPasscodeModal.onSuccess === "function") ManagerPasscodeModal.onSuccess();
    setShowPasscodeModal(false);
    await proceedWithAuth();
    setIsVerifyingPasscode(false);
  };

  if (isLoading) {
    return <ReadyNormLoader />;
  }

  // No site code - show create new site or enter code options
  if (!siteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: "url('/background-image.svg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
        <div className="max-w-2xl w-full">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            {settings.logo_url ? (
              <ProxiedImage src={settings.logo_url} alt="Logo" className="w-32 h-32 object-contain mx-auto mb-4" fallbackText="RN" />
            ) : (
              <ReadyNormLogoIcon className="w-24 h-24 mx-auto mb-4" />
            )}

            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Welcome</h1>
            <p className="text-sm text-slate-600">Enter your site code or create a new organization</p>
          </motion.div>

          <div className="space-y-3">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-3 text-center">Have a Site Code?</h2>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter your site code"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8734a]/30 font-mono text-center text-sm text-slate-800 placeholder:text-slate-400"
                  maxLength={6}
                />
                <Button
                  onClick={async () => {
                    if (!codeInput.trim()) {
                      toast.error("Please enter a site code");
                      return;
                    }
                    try {
                      const orgs = await OrganizationRepo.filter({ site_code: codeInput.trim(), status: "active" });
                      if (orgs.length > 0) {
                        localStorage.setItem('site_code', codeInput.trim());
                        window.location.reload();
                      } else {
                        toast.error("Invalid site code");
                      }
                    } catch (e) {
                      toast.error("Error validating site code");
                    }
                  }}
                  size="lg"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white border-0 rounded-full"
                >
                  Go
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 text-slate-500">OR</span>
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                <ShieldCheck className="w-6 h-6 text-sky-600" />
              </div>
              <h2 className="text-base font-bold text-slate-800 mb-2">Create New Site</h2>
              <p className="text-xs text-slate-600 mb-4">Set up a new organization and get your unique site code</p>
              <Button
                onClick={async () => {
                  try {
                    const isAuth = await isAuthenticated();
                    if (isAuth) {
                      const user = await getCurrentUser();
                      setCurrentUser(user);
                      setShowOrgSetup(true);
                    } else {
                      window.location.href = "/ManagerLogin";
                    }
                  } catch (e) {
                    window.location.href = "/ManagerLogin";
                  }
                }}
                size="lg"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white border-0 rounded-full"
              >
                Create New Site
              </Button>
            </div>
          </div>

          <div className="text-center mt-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout(window.location.href)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </Button>
          </div>
        </div>

        <OrganizationSetupModal open={showOrgSetup} user={currentUser} />
      </div>
    );
  }

  // Has a pending/denied request — show the access request form.
  // IMPORTANT: only render this after auth has fully resolved AND the status is explicitly
  // a non-approved value. Never show it while accessStatus is still null (loading).
  if (authResolved && siteCode && accessStatus !== null && accessStatus !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: "url('/background-image.svg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
        <div className="max-w-lg w-full">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            {organization?.logo_url ? (
              <ProxiedImage src={organization.logo_url} alt="Logo" className="h-20 w-auto object-contain mx-auto mb-4" />
            ) : settings.logo_url ? (
              <ProxiedImage src={settings.logo_url} alt="Logo" className="h-20 w-auto object-contain mx-auto mb-4" />
            ) : (
              <ReadyNormLogoIcon className="w-20 h-20 mx-auto mb-4" />
            )}
            <h1 className="text-xl font-semibold text-slate-800 mb-1">{organization.site_name || organization.name}</h1>
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 mb-4">
              <span className="text-xs text-slate-600">Site:</span>
              <code className="text-xs font-mono font-semibold text-slate-800">{siteCode}</code>
            </div>
          </motion.div>
          
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <AccessRequestForm 
              organization={organization}
              siteCode={siteCode}
              existingRequest={existingRequest}
              onRequestSubmitted={() => window.location.reload()}
            />
          </div>

          <div className="text-center mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem('site_code');
                localStorage.removeItem('site_role');
                window.location.reload();
              }}
              className="text-slate-500 hover:text-slate-700 text-xs"
            >
              Change Site
            </Button>
          </div>
        </div>
        <OrganizationSetupModal open={showOrgSetup} user={currentUser} />
      </div>
    );
  }

  // Has site code and approved — check if role is chosen
  
  // If user is an authenticated admin/manager, go straight to full program view
  const isAuthenticatedManager = currentUser && (currentUser.role === "admin" || currentUser.email === organization?.created_by);

  // Employee role chosen — show employee landing
  // HYBRID TESTING: respect explicit employee role even for admin users
  if (chosenRole === "employee") {
    return (
      <EmployeeLanding
        organization={organization}
        siteCode={siteCode}
        settings={settings}
        onChangeRole={handleChangeRole}
      />
    );
  }

  // Manager pending approval
  if (chosenRole === "manager_pending" && !isAuthenticatedManager) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: "url('/background-image.svg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
        <div className="max-w-sm w-full text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            {organization?.logo_url ? (
              <ProxiedImage src={organization.logo_url} alt="Logo" className="h-20 w-auto object-contain mx-auto mb-4" />
            ) : settings.logo_url ? (
              <ProxiedImage src={settings.logo_url} alt="Logo" className="h-20 w-auto object-contain mx-auto mb-4" />
            ) : null}
            <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Manager Access Pending</h2>
            <p className="text-sm text-slate-600 mb-6">
              Your request for manager access to <span className="font-semibold">{organization?.site_name || organization?.name}</span> is being reviewed by an admin. You'll be notified once approved.
            </p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Check Status
              </Button>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setChosenRole(null);
                    localStorage.removeItem("site_role");
                  }}
                  className="text-slate-500 text-xs"
                >
                  Go back as Employee instead
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Manager with approved access — show full programs.
  // chosenRole is only ever set to "manager" when:
  //   a) initializeSite confirmed the user is the org owner/admin, OR
  //   b) the user's manager access request was approved.
  // So checking chosenRole === "manager" alone is sufficient; we don't
  // also need to check managerAccessStatus (which is only set for external requests).
  if (isAuthenticatedManager || chosenRole === "manager") {
    return (
      <div className="min-h-screen" style={{ backgroundImage: "url('/background-image.svg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">

          {/* Top Bar */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6 sm:mb-8"
          >
            <div className="flex items-center gap-2">
              <img src="/readynorm-logo-large.svg" alt="ReadyNorm" className="h-7 w-auto" />
              <div className="h-5 w-px bg-slate-300" />
              {organization?.logo_url ? (
                <ProxiedImage src={organization.logo_url} alt="" className="h-6 w-auto" />
              ) : settings.logo_url ? (
                <ProxiedImage src={settings.logo_url} alt="" className="h-6 w-auto" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{(organization?.site_name || organization?.name)?.charAt(0)}</span>
                </div>
              )}
              <div className="hidden sm:block">
                <span className="text-sm font-semibold text-slate-900">{organization?.site_name || organization?.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {orgGroupSites.length > 1 && userOrgMembership && ["org_owner", "org_manager", "site_manager"].includes(userOrgMembership.role) ? (
                <SiteSwitcher
                  currentSiteCode={siteCode}
                  sites={
                    (userOrgMembership.role === "site_manager" && userOrgMembership.site_access_type === "selected" && userOrgMembership.allowed_site_ids?.length > 0)
                      ? orgGroupSites.filter(s => userOrgMembership.allowed_site_ids.includes(s.id))
                      : orgGroupSites
                  }
                />
              ) : (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Site</span>
                  <code className="text-xs font-mono font-bold text-slate-800">{siteCode}</code>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (organization?.id) logEvent("logout", organization.id, "Manager logged out");
                  logout(window.location.href);
                }}
                className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full h-9 w-9 p-0"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Passcode Expiry Reminder */}
          {organization?.id && (
            <PasscodeExpiryReminder organizationId={organization.id} organization={organization} />
          )}

          {/* Hero prompt */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6 sm:mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              Select a program
            </h1>
            <p className="text-base text-slate-400 mt-1">
              Choose where you'd like to go
            </p>
          </motion.div>

          {/* Quick actions row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center gap-3 mb-6 sm:mb-8"
          >
            <Link to={createPageUrl("ExecutiveCommandCenter")}>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800 border-slate-900 rounded-full px-4"
              >
                <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                Executive View
              </Button>
            </Link>

            {/* Organization Dashboard link - if user has an org group or site is linked */}
            {(userOrgMembership || organization?.org_group_id) ? (
              <Link to={createPageUrl("OrganizationDashboard") + `?id=${userOrgMembership?.org_group_id || organization?.org_group_id}`}>
                <Button variant="outline" size="sm" className="rounded-full px-4">
                  <Building2 className="w-3.5 h-3.5 mr-1.5" />
                  View Sites in Organization
                </Button>
              </Link>
            ) : isAuthenticatedManager ? (
              <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => setShowCreateOrg(true)}>
                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                Create Organization
              </Button>
            ) : null}

            <Link to={createPageUrl("GeneralSiteSettings")}>
              <Button variant="outline" size="sm" className="rounded-full px-4">
                <Settings className="w-3.5 h-3.5 mr-1.5" />
                Site Settings
              </Button>
            </Link>


          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {programsEnabled.sanitation !== false && (
              <ProgramCard
                icon={Brush}
                title="Sanitation Program"
                description="Daily execution, task management, and compliance tracking."
                color="from-blue-500 to-blue-600"
                enabled={true}
                onClick={() => window.location.href = createPageUrl("SanitationProgram")}
                delay={0}
                subModules={[
                  "Master Sanitation Schedule",
                  "Line Cleanings",
                  "Drain Management",
                  "Chemical Titration"
                ]}
              />
            )}

            <ProgramCard
              icon={Award}
              title="Quality Management System"
              description="Governance, verification, and continuous improvement across all quality functions."
              color="from-indigo-500 to-purple-600"
              enabled={programsEnabled.quality !== false}
              onClick={() => window.location.href = createPageUrl("QualityProgram")}
              delay={0.1}
              subModules={[
                "Document Control",
                "Internal Audit",
                "CAPA Program",
                "Issues & Nonconformance",
                "Receiving Inspections",
                "Hold & Release",
                "Change Control",
                "Calibration Tracking",
                "Supplier Management",
                "Training & Competency",
                "Risk & Management Review"
              ]}
            />

            <ProgramCard
              icon={Leaf}
              title="Food Safety Program"
              description="Environmental controls, pest management, and HACCP/HARPC compliance."
              color="from-emerald-500 to-teal-600"
              enabled={programsEnabled.food_safety !== false}
              onClick={() => window.location.href = createPageUrl("FoodSafetyProgram")}
              delay={0.2}
              subModules={[
                "Environmental Monitoring",
                "Pest Control",
                "Food Safety Plan (HACCP/HARPC)",
                "CCP & Process Monitoring",
                "Recall & Traceability",
                "Water Testing",
                "Glass & Brittle Plastics",
                "Foreign Material Control",
                "Label Verification",
                "Visitor & Contractor Log"
              ]}
            />
          </div>
        </div>

        <OrganizationSetupModal open={showOrgSetup} user={currentUser} />
        <ManagerPasscodeModal
          open={showPasscodeModal}
          onOpenChange={setShowPasscodeModal}
          onSubmit={handlePasscodeSubmit}
          isLoading={isVerifyingPasscode}
        />
        {organization && (
          <CreateOrganizationModal
            open={showCreateOrg}
            onOpenChange={setShowCreateOrg}
            user={currentUser}
            currentSite={organization}
            onCreated={(group) => {
              setOrganization(prev => ({ ...prev, org_group_id: group.id }));
            }}
          />
        )}
      </div>
    );
  }

  // No role chosen yet — show role chooser
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: "url('/background-image.svg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
      <div className="w-full max-w-lg">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {organization?.logo_url ? (
            <ProxiedImage src={organization.logo_url} alt="Logo" className="h-20 w-auto object-contain mx-auto mb-4" />
          ) : settings.logo_url ? (
            <ProxiedImage src={settings.logo_url} alt="Logo" className="h-20 w-auto object-contain mx-auto mb-4" />
          ) : (
            <ReadyNormLogoIcon className="w-20 h-20 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            {organization?.site_name || organization?.name || "Welcome"}
          </h1>
          <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 mt-2 mb-4">
            <span className="text-xs text-slate-600">Site:</span>
            <code className="text-xs font-mono font-semibold text-slate-800">{siteCode}</code>
          </div>
        </motion.div>

        <RoleChooser onSelect={handleRoleSelect} />

        <div className="text-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem('site_code');
              localStorage.removeItem('site_role');
              window.location.reload();
            }}
            className="text-slate-500 hover:text-slate-700 text-xs"
          >
            Change Site
          </Button>
        </div>
      </div>

      <OrganizationSetupModal open={showOrgSetup} user={currentUser} />
    </div>
  );
}