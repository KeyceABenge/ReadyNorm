// @ts-nocheck
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, EmployeeRepo, TaskRepo, AreaSignOffRepo, EmployeeSessionRepo, PerformanceGoalRepo, EmployeeFeedbackRepo, ProductionLineRepo, AreaRepo, AssetRepo } from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, MessageSquare, Target, History, Award, Trash2, AlertTriangle, ShieldAlert, Camera } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format, parseISO } from "date-fns";
import PerformanceMetrics from "@/components/performance/PerformanceMetrics";
import TaskRecordCard from "@/components/dashboard/TaskRecordCard";
import LineCleaningRecordCard from "@/components/dashboard/LineCleaningRecordCard";
import FeedbackModal from "@/components/performance/FeedbackModal";
import GoalModal from "@/components/performance/GoalModal";
import { toast } from "sonner";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

export default function EmployeeProfile() {
  const [employeeId, setEmployeeId] = useState(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();
  
  // Account deletion mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // This would call the auth deletion API
      // For now, we'll mark the employee as inactive and clear their data
      if (!employee?.id) throw new Error("No employee ID");
      
      await EmployeeRepo.update(employee.id, {
        status: "deleted",
        email: `deleted_${Date.now()}_${employee.email}`,
        deletion_requested_at: new Date().toISOString()
      });
      
      return true;
    },
    onSuccess: () => {
      toast.success("Account deletion initiated. Your data will be removed within 30 days.");
      localStorage.removeItem("selectedEmployee");
      localStorage.removeItem("employeeSession");
      window.location.href = createPageUrl("Home");
    },
    onError: (error) => {
      toast.error("Failed to delete account. Please try again or contact support.");
      console.error("Delete account error:", error);
    }
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    
    // If no ID provided, redirect to home (not manager dashboard which might cause routing issues)
    if (!id) {
      window.location.href = createPageUrl("Home");
      return;
    }
    
    setEmployeeId(id);
  }, []);

  // Get org ID from site_code or from the employee record itself
  const [orgId, setOrgId] = useState(null);
  useEffect(() => {
    const storedSiteCode = localStorage.getItem('site_code');
    if (storedSiteCode) {
      OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" })
        .then(orgs => { if (orgs.length > 0) setOrgId(orgs[0].id); })
        .catch(() => {});
    }
  }, []);

  // Fetch employee - scoped to organization
  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ["employee", employeeId, orgId],
    queryFn: async () => {
      if (orgId) {
        const employees = await EmployeeRepo.filter({ organization_id: orgId });
        const found = employees.find(e => e.id === employeeId);
        if (found) return found;
      }
      return null;
    },
    enabled: !!employeeId && !!orgId
  });

  // Sync orgId from employee if it was loaded without site_code
  useEffect(() => {
    if (employee?.organization_id && !orgId) setOrgId(employee.organization_id);
  }, [employee, orgId]);

  const { data: user } = useQuery({
    queryKey: ["current_user"],
    queryFn: () => getCurrentUser()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["employee_tasks", employee?.email, orgId],
    queryFn: () => TaskRepo.filter({ organization_id: orgId, assigned_to: employee?.email }),
    enabled: !!employee?.email && !!orgId
  });

  const { data: signOffs = [] } = useQuery({
    queryKey: ["employee_signoffs", employee?.email, orgId],
    queryFn: () => AreaSignOffRepo.filter({ organization_id: orgId, employee_email: employee?.email }),
    enabled: !!employee?.email && !!orgId
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["employee_sessions", employee?.email, orgId],
    queryFn: () => EmployeeSessionRepo.filter({ organization_id: orgId, employee_email: employee?.email }, "-session_date"),
    enabled: !!employee?.email && !!orgId
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["employee_goals", employee?.email, orgId],
    queryFn: () => PerformanceGoalRepo.filter({ organization_id: orgId, employee_email: employee?.email }, "-created_date"),
    enabled: !!employee?.email && !!orgId
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ["employee_feedback", employee?.email, orgId],
    queryFn: () => EmployeeFeedbackRepo.filter({ organization_id: orgId, employee_email: employee?.email }, "-created_date"),
    enabled: !!employee?.email && !!orgId
  });

  const { data: allLines = [] } = useQuery({
    queryKey: ["production_lines", orgId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: allAreas = [] } = useQuery({
    queryKey: ["areas", orgId],
    queryFn: () => AreaRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: allAssets = [] } = useQuery({
    queryKey: ["assets", orgId],
    queryFn: () => AssetRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const feedbackMutation = useMutation({
    mutationFn: (data) => EmployeeFeedbackRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_feedback"] });
      setFeedbackModalOpen(false);
      toast.success("Feedback submitted successfully");
    }
  });

  const avatarMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await uploadFile(file);
      await EmployeeRepo.update(employee.id, { avatar_url: file_url });
      return file_url;
    },
    onSuccess: (file_url) => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["all_employees"] });
      // Also update localStorage if this employee is the currently selected employee
      // so the employee dashboard reflects the change immediately
      const stored = localStorage.getItem("selectedEmployee");
      if (stored) {
        try {
          const storedEmp = JSON.parse(stored);
          if (storedEmp.id === employee.id) {
            localStorage.setItem("selectedEmployee", JSON.stringify({ ...storedEmp, avatar_url: file_url }));
          }
        } catch {}
      }
      toast.success("Profile photo updated");
    }
  });

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    avatarMutation.mutate(file);
  };

  const goalMutation = useMutation({
    mutationFn: ({ data, id }) => {
      if (id) {
        return PerformanceGoalRepo.update(id, data);
      }
      return PerformanceGoalRepo.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_goals"] });
      setGoalModalOpen(false);
      setSelectedGoal(null);
      toast.success("Goal saved successfully");
    }
  });

  const handleGoalSubmit = (data, id) => {
    goalMutation.mutate({ data, id });
  };

  // Show loading while data is being fetched
  if (!employeeId || employeeLoading || !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  const initials = employee.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => window.location.href = createPageUrl("ManagerDashboard")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-2xl overflow-hidden">
                    {employee.avatar_url ? (
                      <img src={employee.avatar_url} alt={employee.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border-2 border-white flex items-center justify-center cursor-pointer transition-colors shadow-md">
                    {avatarMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={avatarMutation.isPending}
                    />
                  </label>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">{employee.name} <EmployeeBadgeIcons employee={employee} size="md" /> <BirthdayCakeIcon employee={employee} className="w-6 h-6" /></h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    {employee.role && <Badge variant="outline">{employee.role}</Badge>}
                    {employee.department && <span>{employee.department}</span>}
                    {employee.email && <span>• {employee.email}</span>}
                    {employee.phone && <span>• {employee.phone}</span>}
                  </div>
                  <Badge className={employee.status === "active" ? "bg-emerald-600 mt-2" : "bg-slate-400 mt-2"}>
                    {employee.status}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setGoalModalOpen(true)}>
                  <Target className="w-4 h-4 mr-2" />
                  Set Goal
                </Button>
                <Button onClick={() => setFeedbackModalOpen(true)} variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Give Feedback
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <PerformanceMetrics employee={employee} tasks={tasks} signOffs={signOffs} goals={goals} />

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="mt-6">
          <TabsList>
            <TabsTrigger value="tasks">
              <History className="w-4 h-4 mr-2" />
              Task History
            </TabsTrigger>
            <TabsTrigger value="line-cleanings">
              Line Cleanings
            </TabsTrigger>
            <TabsTrigger value="goals">
              <Target className="w-4 h-4 mr-2" />
              Goals ({goals.length})
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback ({feedback.length})
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Award className="w-4 h-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="account">
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4 mt-6">
            {tasks.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-slate-500">No tasks found</p>
              </Card>
            ) : (
              tasks.map(task => <TaskRecordCard key={task.id} task={task} />)
            )}
          </TabsContent>

          <TabsContent value="line-cleanings" className="space-y-4 mt-6">
            {signOffs.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-slate-500">No line cleaning records found</p>
              </Card>
            ) : (
              signOffs.map(signOff => {
                const asset = allAssets.find(a => a.id === signOff.asset_id);
                const area = allAreas.find(a => a.id === signOff.area_id);
                const line = allLines.find(l => l.id === asset?.production_line_id);
                return (
                  <LineCleaningRecordCard
                    key={signOff.id}
                    signOff={signOff}
                    line={line}
                    area={area}
                    asset={asset}
                  />
                );
              })
            )}
          </TabsContent>

          <TabsContent value="goals" className="space-y-4 mt-6">
            {goals.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-slate-500 mb-4">No performance goals set</p>
                <Button onClick={() => setGoalModalOpen(true)}>
                  <Target className="w-4 h-4 mr-2" />
                  Set First Goal
                </Button>
              </Card>
            ) : (
              goals.map(goal => {
                const progress = goal.target_value > 0 
                  ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                  : 0;
                
                return (
                  <Card key={goal.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{goal.title}</h3>
                          <Badge className={
                            goal.status === "completed" ? "bg-emerald-600" :
                            goal.status === "overdue" ? "bg-rose-600" :
                            goal.status === "cancelled" ? "bg-slate-400" :
                            "bg-blue-600"
                          }>
                            {goal.status}
                          </Badge>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-slate-600 mb-3">{goal.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>Type: <span className="font-medium">{goal.goal_type.replace(/_/g, " ")}</span></span>
                          <span>•</span>
                          <span>Start: {format(parseISO(goal.start_date), "MMM d, yyyy")}</span>
                          <span>•</span>
                          <span>End: {format(parseISO(goal.end_date), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedGoal(goal);
                        setGoalModalOpen(true);
                      }}>
                        Edit
                      </Button>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Progress: {goal.current_value} / {goal.target_value}</span>
                      <span className="font-semibold text-slate-900">{progress}%</span>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4 mt-6">
            {feedback.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-slate-500 mb-4">No feedback provided yet</p>
                <Button onClick={() => setFeedbackModalOpen(true)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Give First Feedback
                </Button>
              </Card>
            ) : (
              feedback.map(item => (
                <Card key={item.id} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{item.subject}</h3>
                        <Badge className={
                          item.feedback_type === "positive" ? "bg-emerald-600" :
                          item.feedback_type === "constructive" ? "bg-blue-600" :
                          item.feedback_type === "corrective" ? "bg-rose-600" :
                          "bg-slate-600"
                        }>
                          {item.feedback_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{item.feedback}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>From: {item.manager_name || item.manager_email}</span>
                        <span>•</span>
                        <span>{format(parseISO(item.created_date), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4 mt-6">
            {sessions.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-slate-500">No session history found</p>
              </Card>
            ) : (
              sessions.map(session => (
                <Card key={session.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">
                          {format(parseISO(session.session_date), "EEEE, MMMM d, yyyy")}
                        </h3>
                        <Badge className={session.status === "active" ? "bg-emerald-600" : "bg-slate-400"}>
                          {session.status}
                        </Badge>
                        {session.color_coded_role_name && (
                          <Badge variant="outline" style={{ backgroundColor: session.color_coded_role_color + "20", borderColor: session.color_coded_role_color }}>
                            {session.color_coded_role_name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div>Started: {format(parseISO(session.start_time), "h:mm a")}</div>
                        {session.end_time && (
                          <div>Ended: {format(parseISO(session.end_time), "h:mm a")}</div>
                        )}
                        {session.selected_tasks?.length > 0 && (
                          <div>Tasks selected: {session.selected_tasks.length}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="account" className="space-y-4 mt-6">
            {/* Account Info Card */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Management</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-sm text-slate-600">Email</span>
                  <span className="text-sm font-medium">{employee?.email || "—"}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-sm text-slate-600">Status</span>
                  <Badge className={employee?.status === "active" ? "bg-emerald-600" : "bg-slate-400"}>
                    {employee?.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-sm text-slate-600">Member Since</span>
                  <span className="text-sm font-medium">
                    {employee?.created_date ? format(parseISO(employee.created_date), "MMM d, yyyy") : "—"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Security Section */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-slate-700" />
                <h3 className="text-lg font-semibold text-slate-900">Security</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Manage your account security settings and data.
              </p>
            </Card>

            {/* Danger Zone Section */}
            <Card className="p-6 border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-rose-900">Danger Zone</h3>
                  <p className="text-sm text-rose-700 mt-1">
                    Irreversible and destructive actions
                  </p>
                </div>
              </div>
              
              <div className="border border-rose-200 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">Delete Account</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Permanently delete this account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline"
                        className="min-h-[44px] border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="sm:max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                          <AlertTriangle className="w-5 h-5" />
                          Delete Account Permanently?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-4">
                            <p>
                              This action <strong>cannot be undone</strong>. All data associated with <strong>{employee?.name}</strong> will be permanently deleted within 30 days.
                            </p>
                            
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                              <p className="text-xs font-medium text-rose-800 mb-2">
                                Data that will be deleted:
                              </p>
                              <ul className="text-xs text-rose-700 space-y-1">
                                <li>• Profile and personal information</li>
                                <li>• Task completion history</li>
                                <li>• Training records and certifications</li>
                                <li>• Session and performance data</li>
                                <li>• Feedback and recognitions</li>
                              </ul>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium text-slate-700 block mb-2">
                                Type <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-rose-600">DELETE</span> to confirm:
                              </label>
                              <Input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                                placeholder="DELETE"
                                className="font-mono"
                                autoComplete="off"
                              />
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel 
                          onClick={() => setDeleteConfirmText("")}
                          className="min-h-[44px]"
                        >
                          Cancel
                        </AlertDialogCancel>
                        <Button
                          variant="destructive"
                          disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
                          onClick={() => deleteAccountMutation.mutate()}
                          className="min-h-[44px]"
                        >
                          {deleteAccountMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Account
                            </>
                          )}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        employee={employee}
        manager={user}
        onSubmit={(data) => feedbackMutation.mutate(data)}
        isLoading={feedbackMutation.isPending}
      />

      <GoalModal
        open={goalModalOpen}
        onOpenChange={(open) => {
          setGoalModalOpen(open);
          if (!open) setSelectedGoal(null);
        }}
        employee={employee}
        goal={selectedGoal}
        onSubmit={handleGoalSubmit}
        isLoading={goalMutation.isPending}
      />

      {/* Bottom Delete Account Button - Only show to the employee themselves, not managers */}
    </div>
  );
}