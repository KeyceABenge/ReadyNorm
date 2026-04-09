import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";
import { format } from "date-fns";
import { Search, User, ClipboardCheck, Plus, Star, Award, AlertCircle } from "lucide-react";

const LEVEL_COLORS = {
  trainee: "bg-slate-100 text-slate-700",
  competent: "bg-emerald-100 text-emerald-700",
  proficient: "bg-blue-100 text-blue-700",
  expert: "bg-purple-100 text-purple-700",
  trainer: "bg-amber-100 text-amber-700"
};

const LEVEL_ICONS = {
  trainee: 1,
  competent: 2,
  proficient: 3,
  expert: 4,
  trainer: 5
};

export default function CompetencyMatrix({ employees, competencyRecords, trainingRecords, tasks, areas, organizationId, settings, user, onRefresh }) {
  const [viewMode, setViewMode] = useState("byEmployee"); // byEmployee, byCompetency
  const [search, setSearch] = useState("");
  const [competencyType, setCompetencyType] = useState("all");
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [evalForm, setEvalForm] = useState({
    competency_type: "task",
    competency_name: "",
    reference_id: "",
    level: "competent",
    score: 80,
    strengths: "",
    areas_for_improvement: "",
    evaluator_notes: ""
  });

  const today = new Date();

  // Get unique competency names
  const competencyNames = [...new Set(competencyRecords.map(r => r.competency_name))];
  
  // Build matrix data
  const matrixData = employees.map(emp => {
    const empCompetencies = competencyRecords.filter(r => r.employee_id === emp.id);
    return {
      employee: emp,
      competencies: empCompetencies,
      competencyMap: empCompetencies.reduce((acc, c) => {
        acc[c.competency_name] = c;
        return acc;
      }, {})
    };
  });

  const filteredData = matrixData.filter(d => 
    d.employee.name?.toLowerCase().includes(search.toLowerCase())
  );

  const openEvalModal = (emp) => {
    setSelectedEmployee(emp);
    setEvalForm({
      competency_type: "task",
      competency_name: "",
      reference_id: "",
      level: "competent",
      score: 80,
      strengths: "",
      areas_for_improvement: "",
      evaluator_notes: ""
    });
    setShowEvalModal(true);
  };

  const handleEvaluate = async () => {
    if (!evalForm.competency_name) {
      toast.error("Competency name is required");
      return;
    }

    try {
      await CompetencyRecordRepo.create({
        organization_id: organizationId,
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name,
        competency_type: evalForm.competency_type,
        competency_name: evalForm.competency_name,
        reference_id: evalForm.reference_id,
        status: evalForm.level === "trainee" ? "pending" : "competent",
        level: evalForm.level,
        evaluator_id: user?.id,
        evaluator_name: user?.full_name,
        evaluation_date: format(today, "yyyy-MM-dd"),
        score: evalForm.score,
        strengths: evalForm.strengths,
        areas_for_improvement: evalForm.areas_for_improvement,
        evaluator_notes: evalForm.evaluator_notes,
        recertification_months: 12,
        trigger_source: "manual"
      });
      toast.success("Competency recorded");
      setShowEvalModal(false);
      onRefresh();
    } catch (e) {
      toast.error("Failed to save competency");
    }
  };

  const renderLevelBadge = (level) => {
    const stars = LEVEL_ICONS[level] || 0;
    return (
      <Badge className={`${LEVEL_COLORS[level]} flex items-center gap-1`}>
        {[...Array(stars)].map((_, i) => (
          <Star key={i} className="w-2.5 h-2.5 fill-current" />
        ))}
        <span className="ml-1 capitalize">{level}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/60"
            />
          </div>
          <Select value={competencyType} onValueChange={setCompetencyType}>
            <SelectTrigger className="w-40 bg-white/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="task">Tasks</SelectItem>
              <SelectItem value="area">Areas</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="process">Processes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Competency Level Legend */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardContent className="py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-slate-600 font-medium">Levels:</span>
            {Object.entries(LEVEL_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center gap-1">
                {renderLevelBadge(level)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Employee Cards with Competencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredData.map(({ employee, competencies, competencyMap }) => (
          <Card key={employee.id} className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{employee.name}</CardTitle>
                    <p className="text-xs text-slate-500">{employee.role || employee.department}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEvalModal(employee)}>
                  <Plus className="w-3 h-3 mr-1" />
                  Evaluate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {competencies.length > 0 ? (
                <div className="space-y-2">
                  {competencies
                    .filter(c => competencyType === "all" || c.competency_type === competencyType)
                    .map((comp, idx) => {
                      const isExpired = comp.expiration_date && new Date(comp.expiration_date) < today;
                      const isExpiring = comp.expiration_date && !isExpired && 
                        Math.ceil((new Date(comp.expiration_date) - today) / (1000 * 60 * 60 * 24)) <= 30;
                      
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            isExpired ? 'bg-rose-50' : isExpiring ? 'bg-amber-50' : 'bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-700">{comp.competency_name}</p>
                              <p className="text-[10px] text-slate-500 capitalize">{comp.competency_type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(isExpired || isExpiring) && (
                              <AlertCircle className={`w-4 h-4 ${isExpired ? 'text-rose-500' : 'text-amber-500'}`} />
                            )}
                            {renderLevelBadge(comp.level)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No competencies recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No employees found</p>
        </div>
      )}

      {/* Evaluation Modal */}
      <Dialog open={showEvalModal} onOpenChange={setShowEvalModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Competency for {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Competency Type *</Label>
                <Select 
                  value={evalForm.competency_type} 
                  onValueChange={(v) => setEvalForm(prev => ({ ...prev, competency_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="process">Process</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="quality_activity">Quality Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Level *</Label>
                <Select 
                  value={evalForm.level} 
                  onValueChange={(v) => setEvalForm(prev => ({ ...prev, level: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trainee">Trainee</SelectItem>
                    <SelectItem value="competent">Competent</SelectItem>
                    <SelectItem value="proficient">Proficient</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                    <SelectItem value="trainer">Trainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Competency Name *</Label>
              {evalForm.competency_type === "task" && tasks.length > 0 ? (
                <Select 
                  value={evalForm.reference_id} 
                  onValueChange={(v) => {
                    const task = tasks.find(t => t.id === v);
                    setEvalForm(prev => ({ 
                      ...prev, 
                      reference_id: v, 
                      competency_name: task?.title || "" 
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : evalForm.competency_type === "area" && areas.length > 0 ? (
                <Select 
                  value={evalForm.reference_id} 
                  onValueChange={(v) => {
                    const area = areas.find(a => a.id === v);
                    setEvalForm(prev => ({ 
                      ...prev, 
                      reference_id: v, 
                      competency_name: area?.name || "" 
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map(area => (
                      <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={evalForm.competency_name}
                  onChange={(e) => setEvalForm(prev => ({ ...prev, competency_name: e.target.value }))}
                  placeholder="Enter competency name"
                />
              )}
            </div>

            <div>
              <Label>Score (0-100)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={evalForm.score}
                onChange={(e) => setEvalForm(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <Label>Strengths</Label>
              <Textarea
                value={evalForm.strengths}
                onChange={(e) => setEvalForm(prev => ({ ...prev, strengths: e.target.value }))}
                rows={2}
                placeholder="Notable strengths observed..."
              />
            </div>

            <div>
              <Label>Areas for Improvement</Label>
              <Textarea
                value={evalForm.areas_for_improvement}
                onChange={(e) => setEvalForm(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                rows={2}
                placeholder="Areas that need improvement..."
              />
            </div>

            <div>
              <Label>Evaluator Notes</Label>
              <Textarea
                value={evalForm.evaluator_notes}
                onChange={(e) => setEvalForm(prev => ({ ...prev, evaluator_notes: e.target.value }))}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvalModal(false)}>Cancel</Button>
            <Button onClick={handleEvaluate} className="bg-teal-600 hover:bg-teal-700">
              Save Competency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}