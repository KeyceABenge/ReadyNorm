// @ts-nocheck
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/adapters/auth";
import {
  AreaRepo,
  CAPARepo,
  EmployeeRepo,
  OrganizationRepo,
  ProductionLineRepo,
  SSOPRepo,
  SanitationDowntimeRepo,
  TaskRepo,
  TrainingDocumentRepo
} from "@/lib/adapters/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, Clock, AlertTriangle,
  FileText, CheckCircle2, XCircle, Loader2
} from "lucide-react";
import { subDays } from "date-fns";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import DowntimeEventModal from "@/components/downtime/DowntimeEventModal";
import DowntimeEventCard from "@/components/downtime/DowntimeEventCard";
import CAPAModal from "@/components/downtime/CAPAModal";
import CAPACard from "@/components/downtime/CAPACard";
import DowntimeAnalytics from "@/components/downtime/DowntimeAnalytics";

export default function DowntimeTracking() {
  const [activeTab, setActiveTab] = useState("events");
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [capaModalOpen, setCapaModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingCapa, setEditingCapa] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lineFilter, setLineFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        // CRITICAL: Get organization_id ONLY from site_code in localStorage
        const storedSiteCode = localStorage.getItem('site_code');
        if (!storedSiteCode) {
          window.location.href = createPageUrl("Home");
          return;
        }
        
        const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
        if (orgs.length > 0) {
          setOrgId(orgs[0].id);
        } else {
          localStorage.removeItem('site_code');
          window.location.href = createPageUrl("Home");
        }
      } catch (e) {
        console.error("Auth error:", e);
      }
    };
    getUser();
  }, []);

  const queryConfig = { staleTime: 60000, refetchOnWindowFocus: false };

  const { data: downtimeEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["downtime_events", orgId],
    queryFn: () => SanitationDowntimeRepo.filter({ organization_id: orgId }, "-event_date"),
    enabled: !!orgId,
    ...queryConfig
  });

  const { data: capas = [] } = useQuery({
    queryKey: ["capas", orgId],
    queryFn: () => CAPARepo.filter({ organization_id: orgId }, "-created_date"),
    enabled: !!orgId,
    ...queryConfig
  });

  const { data: productionLines = [] } = useQuery({
    queryKey: ["production_lines", orgId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    ...queryConfig
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas", orgId],
    queryFn: () => AreaRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    ...queryConfig
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", orgId],
    queryFn: () => TaskRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    ...queryConfig
  });

  const { data: ssops = [] } = useQuery({
    queryKey: ["ssops", orgId],
    queryFn: () => SSOPRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    ...queryConfig
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: () => EmployeeRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    ...queryConfig
  });

  const { data: trainingDocs = [] } = useQuery({
    queryKey: ["training_docs", orgId],
    queryFn: () => TrainingDocumentRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    ...queryConfig
  });

  // Calculate stats
  const last30Days = subDays(new Date(), 30);
  const recentEvents = downtimeEvents.filter(e => new Date(e.event_date) >= last30Days);
  const totalDowntimeMinutes = recentEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const openEvents = downtimeEvents.filter(e => e.status === "open" || e.status === "immediate_action_taken");
  const openCapas = capas.filter(c => !["closed", "effective"].includes(c.status));
  const overdueCapas = capas.filter(c => {
    if (c.status === "closed" || c.status === "effective") return false;
    if (!c.target_close_date) return false;
    return new Date(c.target_close_date) < new Date();
  });

  // Filter events
  const filteredEvents = downtimeEvents.filter(event => {
    const matchesSearch = !searchQuery || 
      event.reason_detail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.production_line_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.event_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const matchesLine = lineFilter === "all" || event.production_line_id === lineFilter;
    let matchesDate = true;
    if (dateRange.start) {
      matchesDate = matchesDate && new Date(event.event_date) >= new Date(dateRange.start);
    }
    if (dateRange.end) {
      matchesDate = matchesDate && new Date(event.event_date) <= new Date(dateRange.end);
    }
    return matchesSearch && matchesStatus && matchesLine && matchesDate;
  });

  // Filter CAPAs
  const filteredCapas = capas.filter(capa => {
    const matchesSearch = !searchQuery ||
      capa.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      capa.capa_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || capa.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventModalOpen(true);
  };

  const handleEditCapa = (capa) => {
    setEditingCapa(capa);
    setCapaModalOpen(true);
  };

  const handleCreateCapaFromEvent = (event) => {
    setEditingCapa({
      source_type: "downtime_event",
      source_id: event.id,
      source_reference: event.event_number,
      title: `CAPA for ${event.reason_category?.replace(/_/g, " ")} - ${event.production_line_name || ""}`,
      description: event.reason_detail,
      category: "sanitation",
      priority: event.severity === "critical" ? "critical" : event.severity === "major" ? "high" : "medium",
      root_cause_analysis: event.root_cause,
      root_cause_category: event.root_cause_category
    });
    setCapaModalOpen(true);
  };

  if (eventsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Downtime & CAPA Tracking</h1>
            <p className="text-slate-500 text-sm mt-1">Track sanitation-related downtime and corrective actions</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setEditingEvent(null); setEventModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Log Downtime
            </Button>
            <Button variant="outline" onClick={() => { setEditingCapa(null); setCapaModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              New CAPA
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="bg-rose-50 border-rose-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-rose-700">{Math.round(totalDowntimeMinutes / 60)}h</p>
                  <p className="text-xs text-rose-600">Last 30 Days</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">{openEvents.length}</p>
                  <p className="text-xs text-amber-600">Open Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700">{openCapas.length}</p>
                  <p className="text-xs text-blue-600">Active CAPAs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border", overdueCapas.length > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", overdueCapas.length > 0 ? "bg-rose-100" : "bg-emerald-100")}>
                  {overdueCapas.length > 0 ? (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <p className={cn("text-2xl font-bold", overdueCapas.length > 0 ? "text-rose-700" : "text-emerald-700")}>
                    {overdueCapas.length}
                  </p>
                  <p className={cn("text-xs", overdueCapas.length > 0 ? "text-rose-600" : "text-emerald-600")}>
                    Overdue CAPAs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border shadow-sm p-1 mb-4">
            <TabsTrigger value="events" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Downtime Events
            </TabsTrigger>
            <TabsTrigger value="capas" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              CAPAs
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {activeTab === "events" ? (
                  <>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="immediate_action_taken">Immediate Action</SelectItem>
                    <SelectItem value="capa_in_progress">CAPA In Progress</SelectItem>
                    <SelectItem value="capa_complete">CAPA Complete</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigation">Investigation</SelectItem>
                    <SelectItem value="corrective_action">Corrective Action</SelectItem>
                    <SelectItem value="preventive_action">Preventive Action</SelectItem>
                    <SelectItem value="verification">Verification</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {activeTab === "events" && (
              <Select value={lineFilter} onValueChange={setLineFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Line" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lines</SelectItem>
                  {productionLines.map(line => (
                    <SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-36"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-36"
            />
          </div>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-3">
            {filteredEvents.length === 0 ? (
              <Card className="p-12 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">No downtime events</h3>
                <p className="text-slate-500 text-sm mb-4">Log sanitation-related downtime to track and prevent future occurrences</p>
                <Button onClick={() => { setEditingEvent(null); setEventModalOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Log First Event
                </Button>
              </Card>
            ) : (
              filteredEvents.map(event => (
                <DowntimeEventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEditEvent}
                  onCreateCapa={handleCreateCapaFromEvent}
                  capas={capas}
                />
              ))
            )}
          </TabsContent>

          {/* CAPAs Tab */}
          <TabsContent value="capas" className="space-y-3">
            {filteredCapas.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">No CAPAs</h3>
                <p className="text-slate-500 text-sm mb-4">Create corrective and preventive action records</p>
                <Button onClick={() => { setEditingCapa(null); setCapaModalOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create CAPA
                </Button>
              </Card>
            ) : (
              filteredCapas.map(capa => (
                <CAPACard
                  key={capa.id}
                  capa={capa}
                  onEdit={handleEditCapa}
                  employees={employees}
                />
              ))
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <DowntimeAnalytics
              events={downtimeEvents}
              capas={capas}
              productionLines={productionLines}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <DowntimeEventModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        event={editingEvent}
        organizationId={orgId}
        user={user}
        productionLines={productionLines}
        areas={areas}
        tasks={tasks}
        ssops={ssops}
        employees={employees}
        trainingDocs={trainingDocs}
        existingEvents={downtimeEvents}
      />

      <CAPAModal
        open={capaModalOpen}
        onOpenChange={setCapaModalOpen}
        capa={editingCapa}
        organizationId={orgId}
        user={user}
        employees={employees}
        tasks={tasks}
        ssops={ssops}
        trainingDocs={trainingDocs}
        downtimeEvents={downtimeEvents}
      />
    </div>
  );
}