import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FlaskConical, Clock, XCircle, AlertTriangle, Upload } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { toast } from "sonner";
import AutoCAPATrigger from "@/components/capa/AutoCAPATrigger";
import { EMPSampleRepo, EMPSiteRepo } from "@/lib/adapters/database";

const TEST_TYPES = [
  { value: "listeria_spp", label: "Listeria spp." },
  { value: "listeria_mono", label: "L. monocytogenes" },
  { value: "salmonella", label: "Salmonella" },
  { value: "apc", label: "APC" },
  { value: "eb", label: "Enterobacteriaceae" },
  { value: "coliform", label: "Coliform" },
  { value: "ecoli", label: "E. coli" },
  { value: "yeast_mold", label: "Yeast & Mold" }
];

const COLLECTION_METHODS = [
  { value: "swab", label: "Swab" },
  { value: "sponge", label: "Sponge" },
  { value: "contact_plate", label: "Contact Plate" },
  { value: "air_sample", label: "Air Sample" },
  { value: "water_sample", label: "Water Sample" }
];

const ZONE_COLORS = {
  zone_1: "#ef4444",
  zone_2: "#f97316",
  zone_3: "#eab308",
  zone_4: "#22c55e"
};

export default function EMPSampleEntry({ sites, samples, thresholds, capas, organizationId, user, onRefresh }) {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [formData, setFormData] = useState({});
  const [resultsData, setResultsData] = useState({ test_results: [] });
  const [showCAPATrigger, setShowCAPATrigger] = useState(false);
  const [capaTriggerData, setCAPATriggerData] = useState(null);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => EMPSampleRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp_samples"] });
      setModalOpen(false);
      setFormData({});
      toast.success("Sample recorded");
      onRefresh?.();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => EMPSampleRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp_samples"] });
      setResultsModalOpen(false);
      setSelectedSample(null);
      toast.success("Results saved");
      onRefresh?.();
    }
  });

  const handleOpenCollectModal = () => {
    setFormData({
      organization_id: organizationId,
      collection_date: format(new Date(), "yyyy-MM-dd"),
      collection_method: "swab",
      pre_op_post_sanitation: "post_sanitation",
      status: "collected"
    });
    setModalOpen(true);
  };

  const handleSiteSelect = (siteId) => {
    const site = sites.find(s => s.id === siteId);
    if (site) {
      const sampleCount = samples.filter(s => 
        s.site_id === siteId && 
        s.collection_date.startsWith(new Date().getFullYear().toString())
      ).length;

      setFormData({
        ...formData,
        site_id: siteId,
        site_code: site.site_code,
        site_name: site.name,
        zone_classification: site.zone_classification,
        sample_id: `EMP-${new Date().getFullYear()}-${String(samples.length + 1).padStart(4, "0")}`
      });
    }
  };

  const handleSubmitCollection = () => {
    if (!formData.site_id) {
      toast.error("Please select a site");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleOpenResultsModal = (sample) => {
    setSelectedSample(sample);
    const site = sites.find(s => s.id === sample.site_id);
    const testTypes = site?.targeted_tests || ["listeria_spp", "apc"];
    
    setResultsData({
      ...sample,
      test_results: testTypes.map(tt => ({
        test_type: tt,
        result: sample.test_results?.find(r => r.test_type === tt)?.result || "pending",
        value: sample.test_results?.find(r => r.test_type === tt)?.value || "",
        unit: sample.test_results?.find(r => r.test_type === tt)?.unit || "CFU/swab"
      }))
    });
    setResultsModalOpen(true);
  };

  const evaluateResults = (testResults) => {
    const hasPositive = testResults.some(r => r.result === "positive");
    const hasExceeded = testResults.some(r => r.exceeded);
    
    let severity = "none";
    let overallResult = "pass";
    
    if (hasPositive || hasExceeded) {
      overallResult = "fail";
      // Determine severity based on zone and test type
      const zone = selectedSample?.zone_classification;
      if (zone === "zone_1") {
        severity = testResults.some(r => r.test_type.includes("listeria") && r.result === "positive") ? "critical" : "major";
      } else if (zone === "zone_2") {
        severity = "moderate";
      } else {
        severity = "minor";
      }
    }

    return { overallResult, severity, requiresReswab: hasPositive };
  };

  const handleSubmitResults = async () => {
    const evaluation = evaluateResults(resultsData.test_results);
    
    const updateData = {
      test_results: resultsData.test_results,
      overall_result: evaluation.overallResult,
      severity: evaluation.severity,
      requires_reswab: evaluation.requiresReswab,
      reswab_due_date: evaluation.requiresReswab ? format(addDays(new Date(), 1), "yyyy-MM-dd") : null,
      results_received_date: format(new Date(), "yyyy-MM-dd"),
      status: "results_received",
      lab_id: resultsData.lab_id,
      notes: resultsData.notes
    };

    // If positive and critical, force CAPA creation
    if (evaluation.severity === "critical" || evaluation.severity === "major") {
      const positiveTests = resultsData.test_results.filter(r => r.result === "positive").map(r => r.test_type.replace(/_/g, " ")).join(", ");
      
      // Show CAPA trigger modal
      setCAPATriggerData({
        sample: selectedSample,
        updateData,
        evaluation,
        positiveTests
      });
      setShowCAPATrigger(true);
      return; // Wait for CAPA to be created before saving results
    }

    // Update site stats
    if (evaluation.overallResult === "fail") {
      const site = sites.find(s => s.id === selectedSample.site_id);
      if (site) {
        await EMPSiteRepo.update(site.id, {
          last_positive_date: format(new Date(), "yyyy-MM-dd"),
          consecutive_negatives: 0,
          total_positives_ytd: (site.total_positives_ytd || 0) + 1
        });
      }
    }

    updateMutation.mutate({ id: selectedSample.id, data: updateData });
  };

  // Filter samples
  const filteredSamples = useMemo(() => {
    return samples.filter(s => {
      const matchesSearch = s.site_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.site_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.sample_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === "pending") {
        return matchesSearch && (s.status === "collected" || s.status === "in_lab");
      } else if (activeTab === "positives") {
        return matchesSearch && s.overall_result === "fail";
      } else if (activeTab === "reswabs") {
        return matchesSearch && s.requires_reswab && s.status !== "closed";
      }
      return matchesSearch;
    });
  }, [samples, searchQuery, activeTab]);

  const pendingCount = samples.filter(s => s.status === "collected" || s.status === "in_lab").length;
  const positivesCount = samples.filter(s => s.overall_result === "fail").length;
  const reswabsCount = samples.filter(s => s.requires_reswab && s.status !== "closed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search samples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenCollectModal}>
            <Plus className="w-4 h-4 mr-2" />
            Record Collection
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import Results
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="w-4 h-4 mr-2" />
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="positives">
            <XCircle className="w-4 h-4 mr-2" />
            Positives ({positivesCount})
          </TabsTrigger>
          <TabsTrigger value="reswabs">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Reswabs ({reswabsCount})
          </TabsTrigger>
          <TabsTrigger value="all">
            <FlaskConical className="w-4 h-4 mr-2" />
            All Samples
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredSamples.length === 0 ? (
            <Card className="p-8 text-center">
              <FlaskConical className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No samples found</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredSamples.map(sample => (
                <Card key={sample.id} className="hover:border-slate-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{sample.sample_id || sample.site_code}</span>
                          <Badge style={{ backgroundColor: ZONE_COLORS[sample.zone_classification] + "20", color: ZONE_COLORS[sample.zone_classification] }}>
                            {sample.zone_classification?.replace("_", " ").toUpperCase()}
                          </Badge>
                          <Badge variant={
                            sample.overall_result === "fail" ? "destructive" :
                            sample.overall_result === "pass" ? "default" :
                            "secondary"
                          } className={sample.overall_result === "pass" ? "bg-emerald-600" : ""}>
                            {sample.overall_result || sample.status}
                          </Badge>
                          {sample.is_reswab && (
                            <Badge variant="outline">Reswab</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{sample.site_name}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>Collected: {format(parseISO(sample.collection_date), "MMM d, yyyy")}</span>
                          <span>{sample.collection_method}</span>
                          {sample.collected_by_name && <span>By: {sample.collected_by_name}</span>}
                        </div>
                        {sample.test_results?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {sample.test_results.map((tr, idx) => (
                              <Badge 
                                key={idx} 
                                variant={tr.result === "positive" ? "destructive" : tr.result === "negative" ? "outline" : "secondary"}
                                className={`text-xs ${tr.result === "negative" ? "border-emerald-300 text-emerald-700" : ""}`}
                              >
                                {tr.test_type.replace(/_/g, " ")}: {tr.result}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(sample.status === "collected" || sample.status === "in_lab") && (
                          <Button size="sm" onClick={() => handleOpenResultsModal(sample)}>
                            Enter Results
                          </Button>
                        )}
                        {sample.requires_reswab && sample.status !== "closed" && (
                          <Button size="sm" variant="outline" className="text-amber-600 border-amber-300">
                            Schedule Reswab
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Collection Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Sample Collection</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Sampling Site *</Label>
              <Select value={formData.site_id || ""} onValueChange={handleSiteSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.filter(s => s.status === "active").map(site => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.site_code} - {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Collection Date</Label>
                <Input
                  type="date"
                  value={formData.collection_date || ""}
                  onChange={(e) => setFormData({ ...formData, collection_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Collection Time</Label>
                <Input
                  type="time"
                  value={formData.collection_time || ""}
                  onChange={(e) => setFormData({ ...formData, collection_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Collection Method</Label>
                <Select value={formData.collection_method} onValueChange={(v) => setFormData({ ...formData, collection_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLECTION_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Timing</Label>
                <Select value={formData.pre_op_post_sanitation} onValueChange={(v) => setFormData({ ...formData, pre_op_post_sanitation: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_op">Pre-Op</SelectItem>
                    <SelectItem value="post_sanitation">Post-Sanitation</SelectItem>
                    <SelectItem value="during_production">During Production</SelectItem>
                    <SelectItem value="environmental">Environmental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any observations during collection..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitCollection} disabled={createMutation.isPending}>
              Record Collection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto CAPA Trigger Modal for EMP positives */}
      {showCAPATrigger && capaTriggerData && (
        <AutoCAPATrigger
          open={showCAPATrigger}
          onClose={() => {
            setShowCAPATrigger(false);
            setCAPATriggerData(null);
          }}
          sourceType="emp"
          sourceRecord={{
            id: capaTriggerData.sample.id,
            site_code: capaTriggerData.sample.site_code,
            site_name: capaTriggerData.sample.site_name,
            zone_classification: capaTriggerData.sample.zone_classification,
            area_name: capaTriggerData.sample.site_name
          }}
          organizationId={organizationId}
          user={user}
          severity={capaTriggerData.evaluation.severity === "critical" ? "critical" : "high"}
          autoTitle={`EMP Positive: ${capaTriggerData.sample.site_code} - ${capaTriggerData.positiveTests}`}
          autoDescription={`Pathogen/indicator positive at ${capaTriggerData.sample.site_name}\n\nZone: ${capaTriggerData.sample.zone_classification?.replace("_", " ").toUpperCase()}\nPositive tests: ${capaTriggerData.positiveTests}\nCollection date: ${capaTriggerData.sample.collection_date}`}
          onCAPACreated={async (capa) => {
            // Now save the results with the CAPA linked
            const finalUpdateData = {
              ...capaTriggerData.updateData,
              linked_capa_id: capa.id
            };
            updateMutation.mutate({ id: capaTriggerData.sample.id, data: finalUpdateData });
            
            // Update site stats
            if (capaTriggerData.evaluation.overallResult === "fail") {
              const site = sites.find(s => s.id === capaTriggerData.sample.site_id);
              if (site) {
                await EMPSiteRepo.update(site.id, {
                  last_positive_date: format(new Date(), "yyyy-MM-dd"),
                  consecutive_negatives: 0,
                  total_positives_ytd: (site.total_positives_ytd || 0) + 1
                });
              }
            }
            
            setShowCAPATrigger(false);
            setCAPATriggerData(null);
            setResultsModalOpen(false);
            setSelectedSample(null);
            toast.success("Results saved with CAPA linked");
          }}
        />
      )}

      {/* Results Entry Modal */}
      <Dialog open={resultsModalOpen} onOpenChange={setResultsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enter Lab Results</DialogTitle>
          </DialogHeader>

          {selectedSample && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedSample.site_code} - {selectedSample.site_name}</p>
                <p className="text-sm text-slate-500">Collected: {format(parseISO(selectedSample.collection_date), "MMM d, yyyy")}</p>
              </div>

              <div>
                <Label>Lab Sample ID</Label>
                <Input
                  value={resultsData.lab_id || ""}
                  onChange={(e) => setResultsData({ ...resultsData, lab_id: e.target.value })}
                  placeholder="External lab reference"
                />
              </div>

              <div className="space-y-3">
                <Label>Test Results</Label>
                {resultsData.test_results?.map((test, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                    <span className="w-32 text-sm font-medium">{test.test_type.replace(/_/g, " ")}</span>
                    <Select 
                      value={test.result} 
                      onValueChange={(v) => {
                        const updated = [...resultsData.test_results];
                        updated[idx].result = v;
                        setResultsData({ ...resultsData, test_results: updated });
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="inconclusive">Inconclusive</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Value"
                      value={test.value || ""}
                      onChange={(e) => {
                        const updated = [...resultsData.test_results];
                        updated[idx].value = parseFloat(e.target.value);
                        setResultsData({ ...resultsData, test_results: updated });
                      }}
                      className="w-24"
                    />
                    <span className="text-xs text-slate-500">{test.unit}</span>
                  </div>
                ))}
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={resultsData.notes || ""}
                  onChange={(e) => setResultsData({ ...resultsData, notes: e.target.value })}
                  placeholder="Lab notes or observations..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResultsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitResults} disabled={updateMutation.isPending}>
              Save Results
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}