import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, AccessRequestRepo, EmployeeRepo } from "@/lib/adapters/database";
import { createPageUrl } from "@/utils";
import { ClipboardCheck, ArrowLeft, User, ShieldAlert } from "lucide-react";
import { getDeviceId } from "@/components/access/AccessRequestForm";
import { motion } from "framer-motion";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";
import { useQuery } from "@tanstack/react-query";

export default function QualityLogin() {
  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [siteCode, setSiteCode] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSiteCode = urlParams.get('site');
      const storedSiteCode = localStorage.getItem('site_code');
      const code = urlSiteCode || storedSiteCode;

      if (!code) {
        window.location.href = createPageUrl("Home");
        return;
      }

      try {
        const orgs = await OrganizationRepo.filter({ site_code: code, status: "active" });
        if (orgs.length > 0) {
          setSiteCode(code);
          setOrganization(orgs[0]);
          localStorage.setItem('site_code', code);
          
          // Check if site creator/admin - bypass access check
          let bypassAccess = false;
          try {
            const isAuth = await isAuthenticated();
            if (isAuth) {
              const user = await getCurrentUser();
              if (user.role === "admin" || user.email === orgs[0].created_by) bypassAccess = true;
            }
          } catch (e) { /* not authenticated */ }
          
          if (!bypassAccess) {
            const deviceId = getDeviceId();
            const requests = await AccessRequestRepo.filter({
              organization_id: orgs[0].id, device_id: deviceId, status: "approved"
            });
            if (requests.length === 0) {
              setAccessDenied(true);
              setIsLoading(false);
              return;
            }
          }
        } else {
          window.location.href = createPageUrl("Home");
          return;
        }
      } catch (e) {
        console.error("Error:", e);
        window.location.href = createPageUrl("Home");
        return;
      }

      setIsLoading(false);
    };

    init();
  }, []);

  const { data: qaEmployees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["qa_employees", organization?.id],
    queryFn: () => EmployeeRepo.filter({ 
      organization_id: organization.id, 
      status: "active",
      is_qa_team: true 
    }),
    enabled: !!organization?.id
  });

  const handleSelectEmployee = (employee) => {
    localStorage.setItem("selectedQAEmployee", JSON.stringify(employee));
    window.location.href = createPageUrl("PreOpInspection");
  };

  if (isLoading || employeesLoading) {
    {/* @ts-ignore */}
    return <ReadyNormLoader />;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <button 
            onClick={() => window.location.href = createPageUrl("Home")}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>

          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-slate-900">Quality Assurance</span>
          </div>

          <div className="w-10" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <p className="text-slate-600">Select your name to continue</p>
        </motion.div>

        {/* QA Team Members */}
        {qaEmployees.length === 0 ? (
          <Card className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No QA Team Members</h3>
            <p className="text-slate-500 text-sm">
              Ask your manager to add QA team members in the employee settings.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {qaEmployees.map((employee, index) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                  onClick={() => handleSelectEmployee(employee)}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                      style={{ backgroundColor: employee.color || "#8b5cf6" }}
                    >
                      {employee.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{employee.name}</h3>
                      <p className="text-sm text-slate-500">Quality Assurance</p>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}