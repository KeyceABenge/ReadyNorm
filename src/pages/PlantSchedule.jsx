// @ts-nocheck
import { useState, useEffect } from "react";
import { OrganizationRepo, PlantExceptionRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function PlantSchedule() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingException, setEditingException] = useState(null);
  const [formData, setFormData] = useState({ exception_date: "", reason: "", notes: "" });
  const [orgId, setOrgId] = useState(null);
  const queryClient = useQueryClient();

  // CRITICAL: Get organization_id ONLY from site_code in localStorage
  useEffect(() => {
    const getOrg = async () => {
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

  const { data: exceptions = [], isLoading } = useQuery({
    queryKey: ["plant_exceptions", orgId],
    queryFn: () => PlantExceptionRepo.filter({ organization_id: orgId }, "-exception_date"),
    enabled: !!orgId
  });

  const createMutation = useMutation({
    mutationFn: (data) => PlantExceptionRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plant_exceptions"] });
      setFormOpen(false);
      setFormData({ exception_date: "", reason: "", notes: "" });
      toast.success("Plant closure added");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => PlantExceptionRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plant_exceptions"] });
      setFormOpen(false);
      setEditingException(null);
      setFormData({ exception_date: "", reason: "", notes: "" });
      toast.success("Plant closure updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => PlantExceptionRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plant_exceptions"] });
      toast.success("Plant closure removed");
    }
  });

  const handleOpenForm = (exception = null) => {
    if (exception) {
      setEditingException(exception);
      setFormData({
        exception_date: exception.exception_date,
        reason: exception.reason || "",
        notes: exception.notes || ""
      });
    } else {
      setEditingException(null);
      setFormData({ exception_date: "", reason: "", notes: "" });
    }
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.exception_date) {
      toast.error("Please select a date");
      return;
    }

    if (editingException) {
      updateMutation.mutate({ id: editingException.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Plant Schedule</h2>
          <p className="text-slate-500 text-sm mt-1">Block dates when the plant is closed (no daily tasks scheduled)</p>
        </div>
        <Button 
          onClick={() => handleOpenForm()}
          className="bg-slate-900 hover:bg-slate-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Closure
        </Button>
      </div>

      {exceptions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-200">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No plant closures scheduled</h3>
          <p className="text-slate-500 mb-4">All days are open for daily tasks</p>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Closure
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {exceptions.map((exception) => {
            let formattedDay = "";
            let formattedDate = "";
            
            try {
              const date = parseISO(exception.exception_date);
              if (!isNaN(date.getTime())) {
                formattedDay = format(date, "d");
                formattedDate = format(date, "EEEE, MMMM d, yyyy");
              }
            } catch {
              return null;
            }
            
            if (!formattedDate) return null;
            
            return (
            <Card key={exception.id} className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center text-red-600 font-semibold">
                      {formattedDay}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {formattedDate}
                      </h3>
                      {exception.reason && (
                        <p className="text-sm text-slate-600">{exception.reason}</p>
                      )}
                    </div>
                  </div>
                  {exception.notes && (
                    <p className="text-sm text-slate-500 pl-15">💬 {exception.notes}</p>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleOpenForm(exception)}
                    className="h-8 w-8"
                  >
                    ✏️
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(exception.id)}
                    className="h-8 w-8 text-rose-600 hover:text-rose-700"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingException ? "Edit Plant Closure" : "Add Plant Closure"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.exception_date}
                onChange={(e) => setFormData(prev => ({ ...prev, exception_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., Holiday, Maintenance, Special Event"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional details about the closure..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingException ? "Update" : "Add"} Closure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}