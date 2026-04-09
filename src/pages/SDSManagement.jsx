// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrganizationRepo, SDSDocumentRepo, ChemicalRepo } from "@/lib/adapters/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Plus, Search, AlertTriangle, Clock, CheckCircle2, Eye, Trash2, Edit, Building,
  Shield, Loader2
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import SDSFormModal from "@/components/sds/SDSFormModal";
import SDSViewerModal from "@/components/sds/SDSViewerModal";

export default function SDSManagement() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("all");
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [editingSDS, setEditingSDS] = useState(null);
  const [viewingSDS, setViewingSDS] = useState(null);
  const [orgId, setOrgId] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const getOrg = async () => {
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
    };
    getOrg();
  }, []);

  const { data: sdsDocuments = [], isLoading } = useQuery({
    queryKey: ["sds_documents", orgId],
    queryFn: () => SDSDocumentRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: chemicals = [] } = useQuery({
    queryKey: ["chemicals_sds", orgId],
    queryFn: () => ChemicalRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const sdsMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? SDSDocumentRepo.update(id, data)
         : SDSDocumentRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sds_documents"] });
      setFormModalOpen(false);
      setEditingSDS(null);
      toast.success("SDS saved successfully");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SDSDocumentRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sds_documents"] });
      toast.success("SDS deleted");
    }
  });

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: sdsDocuments.length,
      active: sdsDocuments.filter(s => s.status === "active").length,
      expiringSoon: sdsDocuments.filter(s => {
        if (!s.expiry_date) return false;
        const days = differenceInDays(parseISO(s.expiry_date), now);
        return days >= 0 && days <= 90;
      }).length,
      expired: sdsDocuments.filter(s => {
        if (s.status === "expired") return true;
        if (!s.expiry_date) return false;
        return differenceInDays(parseISO(s.expiry_date), now) < 0;
      }).length,
      pendingReview: sdsDocuments.filter(s => s.status === "pending_review").length
    };
  }, [sdsDocuments]);

  // Get unique manufacturers
  const manufacturers = useMemo(() => {
    return [...new Set(sdsDocuments.map(s => s.manufacturer).filter(Boolean))];
  }, [sdsDocuments]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return sdsDocuments.filter(sds => {
      // Tab filter
      if (activeTab === "expiring") {
        if (!sds.expiry_date) return false;
        const days = differenceInDays(parseISO(sds.expiry_date), new Date());
        if (days < 0 || days > 90) return false;
      } else if (activeTab === "expired") {
        if (sds.status !== "expired") {
          if (!sds.expiry_date) return false;
          if (differenceInDays(parseISO(sds.expiry_date), new Date()) >= 0) return false;
        }
      } else if (activeTab === "pending") {
        if (sds.status !== "pending_review") return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!sds.chemical_name?.toLowerCase().includes(query) &&
            !sds.manufacturer?.toLowerCase().includes(query) &&
            !sds.product_code?.toLowerCase().includes(query) &&
            !sds.cas_number?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Manufacturer filter
      if (manufacturerFilter !== "all" && sds.manufacturer !== manufacturerFilter) {
        return false;
      }

      return true;
    });
  }, [sdsDocuments, activeTab, searchQuery, manufacturerFilter]);

  const getExpiryStatus = (sds) => {
    if (!sds.expiry_date) return { status: "unknown", label: "No expiry set", color: "bg-slate-100 text-slate-600" };
    const days = differenceInDays(parseISO(sds.expiry_date), new Date());
    if (days < 0) return { status: "expired", label: "Expired", color: "bg-rose-100 text-rose-700" };
    if (days <= 30) return { status: "critical", label: `${days}d left`, color: "bg-rose-100 text-rose-700" };
    if (days <= 90) return { status: "warning", label: `${days}d left`, color: "bg-amber-100 text-amber-700" };
    return { status: "ok", label: "Valid", color: "bg-emerald-100 text-emerald-700" };
  };

  const handleEdit = (sds) => {
    setEditingSDS(sds);
    setFormModalOpen(true);
  };

  const handleView = (sds) => {
    setViewingSDS(sds);
    setViewerModalOpen(true);
  };

  const handleDelete = (sds) => {
    if (confirm(`Delete SDS for "${sds.chemical_name}"?`)) {
      deleteMutation.mutate(sds.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-600" />
              SDS Document Management
            </h1>
            <p className="text-slate-500 mt-1">
              Safety Data Sheet repository with expiration tracking
            </p>
          </div>
          <Button onClick={() => { setEditingSDS(null); setFormModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add SDS
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Active</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={stats.expiringSoon > 0 ? "border-amber-200 bg-amber-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stats.expiringSoon > 0 ? "bg-amber-100" : "bg-slate-100")}>
                  <Clock className={cn("w-5 h-5", stats.expiringSoon > 0 ? "text-amber-600" : "text-slate-400")} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Expiring Soon</p>
                  <p className={cn("text-2xl font-bold", stats.expiringSoon > 0 ? "text-amber-600" : "text-slate-900")}>
                    {stats.expiringSoon}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={stats.expired > 0 ? "border-rose-200 bg-rose-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stats.expired > 0 ? "bg-rose-100" : "bg-slate-100")}>
                  <AlertTriangle className={cn("w-5 h-5", stats.expired > 0 ? "text-rose-600" : "text-slate-400")} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Expired</p>
                  <p className={cn("text-2xl font-bold", stats.expired > 0 ? "text-rose-600" : "text-slate-900")}>
                    {stats.expired}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pending Review</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.pendingReview}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expiring Soon Alert */}
        {stats.expiringSoon > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">
                  {stats.expiringSoon} SDS document{stats.expiringSoon > 1 ? 's' : ''} expiring within 90 days
                </p>
                <p className="text-sm text-amber-700">Review and update these documents to maintain compliance</p>
              </div>
              <Button variant="outline" className="border-amber-300" onClick={() => setActiveTab("expiring")}>
                View Expiring
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="bg-white border">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="expiring" className={stats.expiringSoon > 0 ? "text-amber-600" : ""}>
                Expiring ({stats.expiringSoon})
              </TabsTrigger>
              <TabsTrigger value="expired" className={stats.expired > 0 ? "text-rose-600" : ""}>
                Expired ({stats.expired})
              </TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pendingReview})</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, code, CAS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {manufacturers.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-6">
            {filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No SDS documents found</p>
                  <Button onClick={() => { setEditingSDS(null); setFormModalOpen(true); }} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First SDS
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map(sds => {
                  const expiry = getExpiryStatus(sds);
                  return (
                    <Card key={sds.id} className={cn(
                      "hover:shadow-lg transition-shadow",
                      expiry.status === "expired" && "border-rose-200",
                      expiry.status === "critical" && "border-rose-200",
                      expiry.status === "warning" && "border-amber-200"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{sds.chemical_name}</h3>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {sds.manufacturer}
                            </p>
                          </div>
                          <Badge className={cn("text-xs flex-shrink-0", expiry.color)}>
                            {expiry.label}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          {sds.product_code && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Product Code</span>
                              <span className="font-mono">{sds.product_code}</span>
                            </div>
                          )}
                          {sds.cas_number && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">CAS #</span>
                              <span className="font-mono">{sds.cas_number}</span>
                            </div>
                          )}
                          {sds.revision_date && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Revision</span>
                              <span>{format(parseISO(sds.revision_date), "MMM d, yyyy")}</span>
                            </div>
                          )}
                          {sds.expiry_date && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Expires</span>
                              <span className={expiry.status === "expired" || expiry.status === "critical" ? "text-rose-600 font-medium" : ""}>
                                {format(parseISO(sds.expiry_date), "MMM d, yyyy")}
                              </span>
                            </div>
                          )}
                        </div>

                        {sds.signal_word && sds.signal_word !== "none" && (
                          <Badge className={cn(
                            "mt-3 uppercase text-xs",
                            sds.signal_word === "danger" ? "bg-rose-600" : "bg-amber-500"
                          )}>
                            {sds.signal_word}
                          </Badge>
                        )}

                        {sds.ppe_required?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {sds.ppe_required.map((ppe, i) => (
                              <Badge key={i} variant="outline" className="text-xs capitalize">
                                {ppe}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          {sds.file_url && (
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleView(sds)}>
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(sds)}>
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(sds)}>
                            <Trash2 className="w-3 h-3 text-slate-400" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <SDSFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        sds={editingSDS}
        chemicals={chemicals}
        onSave={(data) => sdsMutation.mutate({ id: editingSDS?.id, data })}
        isLoading={sdsMutation.isPending}
      />

      <SDSViewerModal
        open={viewerModalOpen}
        onOpenChange={setViewerModalOpen}
        sds={viewingSDS}
      />
    </div>
  );
}