import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AllergenRepo, AllergenAssignmentRepo, ProductionLineRepo, AreaRepo } from "@/lib/adapters/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, Plus, Settings, Loader2, 
  Check, X, HelpCircle, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import useOrganization from "@/components/auth/useOrganization";

const DEFAULT_ALLERGENS = [
  { name: "Milk", code: "MLK", category: "big_9", color: "#3b82f6" },
  { name: "Eggs", code: "EGG", category: "big_9", color: "#f59e0b" },
  { name: "Fish", code: "FSH", category: "big_9", color: "#06b6d4" },
  { name: "Shellfish", code: "SHL", category: "big_9", color: "#ec4899" },
  { name: "Tree Nuts", code: "TRN", category: "big_9", color: "#84cc16" },
  { name: "Peanuts", code: "PNT", category: "big_9", color: "#f97316" },
  { name: "Wheat", code: "WHT", category: "big_9", color: "#eab308" },
  { name: "Soybeans", code: "SOY", category: "big_9", color: "#22c55e" },
  { name: "Sesame", code: "SES", category: "big_9", color: "#a855f7" }
];

const PRESENCE_CONFIG = {
  present: { label: "Present", icon: Check, color: "bg-rose-500 text-white", cellColor: "bg-rose-100" },
  may_contain: { label: "May Contain", icon: HelpCircle, color: "bg-amber-500 text-white", cellColor: "bg-amber-100" },
  dedicated_free: { label: "Dedicated Free", icon: Shield, color: "bg-emerald-500 text-white", cellColor: "bg-emerald-100" },
  not_present: { label: "Not Present", icon: X, color: "bg-slate-200 text-slate-500", cellColor: "bg-white" }
};

export default function AllergenMatrix() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [allergenModalOpen, setAllergenModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  
  // Use centralized organization hook - SINGLE SOURCE OF TRUTH
  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();

  const queryClient = useQueryClient();

  const { data: allergens = [], isLoading: allergensLoading } = useQuery({
    queryKey: ["allergens", orgId],
    queryFn: () => AllergenRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["allergen_assignments", orgId],
    queryFn: () => AllergenAssignmentRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: productionLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ["production_lines_allergen", orgId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas_allergen", orgId],
    queryFn: () => AreaRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const initAllergensMutation = useMutation({
    mutationFn: async () => {
      const creates = DEFAULT_ALLERGENS.map(a => 
        AllergenRepo.create({ ...a, organization_id: orgId })
      );
      return Promise.all(creates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allergens"] });
      toast.success("Default allergens created");
    }
  });

  const assignmentMutation = useMutation({
    mutationFn: async (params) => {
      // @ts-ignore - parameter type inference issue
      const { lineId, allergenId, presenceType, data = {} } = params;
      const existing = assignments.find(a => 
        a.production_line_id === lineId && a.allergen_id === allergenId
      );
      
      if (existing) {
        if (presenceType === "not_present") {
          return AllergenAssignmentRepo.delete(existing.id);
        }
        return AllergenAssignmentRepo.update(existing.id, { presence_type: presenceType, ...data });
      } else if (presenceType !== "not_present") {
        const line = productionLines.find(l => l.id === lineId);
        const allergen = allergens.find(a => a.id === allergenId);
        return AllergenAssignmentRepo.create({
          organization_id: orgId,
          production_line_id: lineId,
          production_line_name: line?.name,
          allergen_id: allergenId,
          allergen_name: allergen?.name,
          allergen_code: allergen?.code,
          presence_type: presenceType,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allergen_assignments"] });
      setEditModalOpen(false);
      setSelectedCell(null);
    }
  });

  const getAssignment = (lineId, allergenId) => {
    return assignments.find(a => a.production_line_id === lineId && a.allergen_id === allergenId);
  };

  const handleCellClick = (lineId, allergenId) => {
    const assignment = getAssignment(lineId, allergenId);
    setSelectedCell({
      lineId,
      allergenId,
      line: productionLines.find(l => l.id === lineId),
      allergen: allergens.find(a => a.id === allergenId),
      assignment
    });
    setEditModalOpen(true);
  };

  const stats = useMemo(() => {
    return {
      totalLines: productionLines.length,
      linesWithAllergens: new Set(assignments.filter(a => a.presence_type === "present").map(a => a.production_line_id)).size,
      dedicatedFreeLines: new Set(assignments.filter(a => a.presence_type === "dedicated_free").map(a => a.production_line_id)).size,
      totalAssignments: assignments.filter(a => a.presence_type === "present").length
    };
  }, [productionLines, assignments]);

  const isLoading = orgLoading || allergensLoading || assignmentsLoading || linesLoading;

  if (isLoading && allergens.length === 0) {
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
              <AlertTriangle className="w-7 h-7 text-amber-500" />
              Allergen Control Matrix
            </h1>
            <p className="text-slate-500 mt-1">Track allergen presence by production line</p>
          </div>
          <div className="flex gap-2">
            {allergens.length === 0 && (
              <Button onClick={() => initAllergensMutation.mutate()} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Initialize Big 9
              </Button>
            )}
            <Button onClick={() => setAllergenModalOpen(true)} variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Manage Allergens
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Lines with Allergens</p>
                <p className="text-xl font-bold">{stats.linesWithAllergens}/{stats.totalLines}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Dedicated Free</p>
                <p className="text-xl font-bold text-emerald-600">{stats.dedicatedFreeLines}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Check className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Present Assignments</p>
                <p className="text-xl font-bold text-rose-600">{stats.totalAssignments}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Tracked Allergens</p>
                <p className="text-xl font-bold text-blue-600">{allergens.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(PRESENCE_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={cn("w-6 h-6 rounded flex items-center justify-center", config.color)}>
                <config.icon className="w-3 h-3" />
              </div>
              <span className="text-sm text-slate-600">{config.label}</span>
            </div>
          ))}
        </div>

        {/* Matrix */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">Loading allergen matrix...</p>
            </CardContent>
          </Card>
        ) : productionLines.length === 0 || allergens.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {productionLines.length === 0 
                  ? "No production lines configured. Add lines in Line Cleanings Setup."
                  : "No allergens configured. Click 'Initialize Big 9' to add standard allergens."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-3 font-medium text-slate-700 border-b sticky left-0 bg-slate-50 min-w-[150px]">
                      Production Line
                    </th>
                    {allergens.map(allergen => (
                      <th key={allergen.id} className="p-2 border-b text-center min-w-[80px]">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="secondary" style={{ backgroundColor: allergen.color }} className="text-white text-xs">
                            {allergen.code}
                          </Badge>
                          <span className="text-xs text-slate-500">{allergen.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productionLines.map(line => (
                    <tr key={line.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium border-b sticky left-0 bg-white">
                        {line.name}
                      </td>
                      {allergens.map(allergen => {
                        const assignment = getAssignment(line.id, allergen.id);
                        const presence = assignment?.presence_type || "not_present";
                        const config = PRESENCE_CONFIG[presence];
                        
                        return (
                          <td 
                            key={allergen.id} 
                            className={cn("p-2 border-b text-center cursor-pointer hover:opacity-80", config.cellColor)}
                            onClick={() => handleCellClick(line.id, allergen.id)}
                          >
                            <div className={cn("w-8 h-8 rounded mx-auto flex items-center justify-center", config.color)}>
                              <config.icon className="w-4 h-4" />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Assignment Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        {/* @ts-ignore - Dialog component type issue */}
        <DialogContent>
          {/* @ts-ignore */}
          <DialogHeader>
            {/* @ts-ignore */}
            <DialogTitle>
              {selectedCell?.allergen?.name} on {selectedCell?.line?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCell && (
            <div className="space-y-4">
              <div className="space-y-2">
                {/* @ts-ignore */}
                <Label>Presence Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PRESENCE_CONFIG).map(([key, config]) => (
                    <Button
                      key={key}
                      variant={selectedCell.assignment?.presence_type === key ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => {
                        // @ts-ignore
                        assignmentMutation.mutate({
                          lineId: selectedCell.lineId,
                          allergenId: selectedCell.allergenId,
                          presenceType: key
                        });
                      }}
                    >
                      <config.icon className="w-4 h-4 mr-2" />
                      {config.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Allergens Modal */}
      <Dialog open={allergenModalOpen} onOpenChange={setAllergenModalOpen}>
        {/* @ts-ignore */}
        <DialogContent className="max-w-md">
          {/* @ts-ignore */}
          <DialogHeader>
            {/* @ts-ignore */}
            <DialogTitle>Manage Allergens</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {allergens.map(allergen => (
              <div key={allergen.id} className="flex items-center gap-3 p-2 border rounded-lg">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: allergen.color }} />
                <Badge variant="outline" className="">
                  {allergen.code}
                </Badge>
                <span className="flex-1">{allergen.name}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}