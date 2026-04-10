// @ts-nocheck
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IncidentRepo,
  ProductionLineRepo,
  RecallEventRepo
} from "@/lib/adapters/database";
import useOrganization from "@/components/auth/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, AlertTriangle, Clock, CheckCircle2, Package, Loader2, Timer } from "lucide-react";
import RecallFormModal from "@/components/recall/RecallFormModal";
import RecallCard from "@/components/recall/RecallCard";
import RecallDetailModal from "@/components/recall/RecallDetailModal";

export default function RecallManagement() {
  const [activeTab, setActiveTab] = useState("events");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecall, setEditingRecall] = useState(null);
  const [selectedRecall, setSelectedRecall] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: recalls = [], isLoading } = useQuery({
    queryKey: ["recall_events", orgId],
    queryFn: () => RecallEventRepo.filter({ organization_id: orgId }, "-created_date"),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: productionLines = [] } = useQuery({
    queryKey: ["production_lines", orgId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 300000
  });

  const filtered = recalls.filter(r => {
    const matchSearch = !searchQuery || 
      r.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.recall_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "all" || r.type === typeFilter;
    return matchSearch && matchType;
  });

  const mockRecalls = recalls.filter(r => r.type === "mock_recall");
  const actualRecalls = recalls.filter(r => r.type !== "mock_recall");
  const openRecalls = recalls.filter(r => r.status !== "closed");
  const avgMockTime = mockRecalls.filter(r => r.mock_recall_actual_minutes).reduce((s, r) => s + r.mock_recall_actual_minutes, 0) / (mockRecalls.filter(r => r.mock_recall_actual_minutes).length || 1);

  if (orgLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
            Recall Management & Traceability
          </h1>
          <p className="text-slate-500 text-sm mt-1">Mock recalls, traceability exercises, and recall readiness</p>
        </div>
        <Button onClick={() => { setEditingRecall(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Recall Event
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-rose-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-rose-600" /></div>
          <div><p className="text-2xl font-bold">{openRecalls.length}</p><p className="text-xs text-slate-500">Open Events</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Timer className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{mockRecalls.length}</p><p className="text-xs text-slate-500">Mock Recalls</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{avgMockTime > 0 ? Math.round(avgMockTime) + "m" : "—"}</p><p className="text-xs text-slate-500">Avg Mock Time</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{mockRecalls.filter(r => r.mock_recall_passed).length}/{mockRecalls.length}</p><p className="text-xs text-slate-500">Mocks Passed</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search recalls..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mock_recall">Mock Recall</SelectItem>
            <SelectItem value="actual_recall">Actual Recall</SelectItem>
            <SelectItem value="market_withdrawal">Market Withdrawal</SelectItem>
            <SelectItem value="stock_recovery">Stock Recovery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">No recall events yet</h3>
            <p className="text-slate-500 text-sm mb-4">Start with a mock recall exercise to test your traceability</p>
            <Button onClick={() => { setEditingRecall(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Create Mock Recall</Button>
          </Card>
        ) : filtered.map(recall => (
          <RecallCard
            key={recall.id}
            recall={recall}
            onEdit={r => { setEditingRecall(r); setFormOpen(true); }}
            onView={r => { setSelectedRecall(r); setDetailOpen(true); }}
          />
        ))}
      </div>

      <RecallFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        recall={editingRecall}
        organizationId={orgId}
        productionLines={productionLines}
      />

      <RecallDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        recall={selectedRecall}
      />
    </div>
  );
}