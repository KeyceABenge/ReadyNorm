// @ts-nocheck
import { useState, useEffect } from "react";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, AccessRequestRepo, HelperRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, HandHelping, ArrowLeft, UserPlus, ShieldAlert } from "lucide-react";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { getDeviceId } from "@/components/access/AccessRequestForm";

export default function HelperLogin() {
  const [organization, setOrganization] = useState(null);
  const [siteCode, setSiteCode] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("site") || localStorage.getItem("siteCode");
    
    if (!code) {
      window.location.href = createPageUrl("Home");
      return;
    }
    
    setSiteCode(code);
    localStorage.setItem("siteCode", code);
  }, []);

  // Fetch organization
  const { data: orgs = [], isLoading: loadingOrg } = useQuery({
    queryKey: ["org-by-code", siteCode],
    queryFn: async () => {
      const results = await OrganizationRepo.filter({ site_code: siteCode });
      if (results.length > 0) {
        setOrganization(results[0]);
        
        // Check if site creator/admin - bypass access check
        let bypassAccess = false;
        try {
          const isAuth = await isAuthenticated();
          if (isAuth) {
            const user = await getCurrentUser();
            if (user.role === "admin" || user.email === results[0].created_by) bypassAccess = true;
          }
        } catch (e) { /* not authenticated */ }
        
        if (!bypassAccess) {
          const deviceId = getDeviceId();
          const requests = await AccessRequestRepo.filter({
            organization_id: results[0].id, device_id: deviceId, status: "approved"
          });
          if (requests.length === 0) {
            setAccessDenied(true);
          }
        }
      }
      return results;
    },
    enabled: !!siteCode
  });

  // Fetch existing helpers
  const { data: helpers = [], isLoading: loadingHelpers } = useQuery({
    queryKey: ["helpers", organization?.id],
    queryFn: () => HelperRepo.filter({ 
      organization_id: organization?.id,
      status: "active"
    }),
    enabled: !!organization?.id
  });

  const handleSelectHelper = async (helper) => {
    localStorage.setItem("selectedHelper", JSON.stringify(helper));
    localStorage.setItem("helperSession", JSON.stringify({
      helper_id: helper.id,
      helper_name: helper.name,
      organization_id: organization.id,
      session_date: new Date().toISOString().split('T')[0],
      start_time: new Date().toISOString()
    }));

    toast.success(`Welcome back, ${helper.name}!`);
    window.location.href = createPageUrl("HelperDashboard") + `?site=${siteCode}`;
  };

  const handleCreateHelper = async (e) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsCreating(true);
    try {
      const helper = await HelperRepo.create({
        organization_id: organization.id,
        name: newName.trim(),
        status: "active",
        user_type: "helper"
      });

      localStorage.setItem("selectedHelper", JSON.stringify(helper));
      localStorage.setItem("helperSession", JSON.stringify({
        helper_id: helper.id,
        helper_name: helper.name,
        organization_id: organization.id,
        session_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toISOString()
      }));

      toast.success("Welcome! You're signed in as a Helper.");
      window.location.href = createPageUrl("HelperDashboard") + `?site=${siteCode}`;
    } catch (error) {
      console.error("Error creating helper:", error);
      toast.error("Failed to create helper account");
    } finally {
      setIsCreating(false);
    }
  };

  if (loadingOrg || !organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Required</h2>
          <p className="text-sm text-slate-600 mb-4">You need approved access to use this portal.</p>
          <Button onClick={() => window.location.href = createPageUrl("Home")}>Request Access</Button>
        </div>
      </div>
    );
  }

  const filteredHelpers = helpers.filter(h =>
    h.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50">
      <div className="w-full px-4 max-w-2xl mx-auto py-4 sm:py-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <button 
            onClick={() => window.location.href = createPageUrl("Home") + `?site=${siteCode}`}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>

          <div className="flex items-center gap-2">
            <HandHelping className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-semibold text-slate-900">Helper Sign In</span>
          </div>

          <div className="w-10" />
        </div>

        <div className="text-center mb-6">
          <p className="text-slate-600">{organization.name}</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search for your name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg bg-white"
          />
        </div>

        {/* Helpers List */}
        {loadingHelpers ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
          </div>
        ) : filteredHelpers.length > 0 ? (
          <div className="space-y-2 mb-6">
            <p className="text-sm text-slate-500 mb-3">Select your name:</p>
            {filteredHelpers.map(helper => (
              <Card
                key={helper.id}
                className="p-4 cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-colors"
                onClick={() => handleSelectHelper(helper)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
                    {helper.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{helper.name}</p>
                    <p className="text-xs text-slate-500">Tap to sign in</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-8 mb-6">
            <p className="text-slate-500">No helpers found matching "{searchQuery}"</p>
          </div>
        ) : null}

        {/* Create New Helper */}
        <Card className="p-4 border-2 border-dashed border-amber-300 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-5 h-5 text-amber-600" />
            <p className="font-medium text-amber-900">
              {helpers.length === 0 ? "Create your helper profile" : "New here? Create your profile"}
            </p>
          </div>
          <form onSubmit={handleCreateHelper} className="flex gap-2">
            <Input
              placeholder="Enter your full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-white"
            />
            <Button 
              type="submit" 
              disabled={isCreating || !newName.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </Card>

        {/* Removed redundant back button — circle back button is in top bar */}
      </div>
    </div>
  );
}