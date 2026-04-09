// @ts-nocheck
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, CrewRepo, EmployeeRepo, SiteSettingsRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CrewFormModal from "@/components/crews/CrewFormModal";
import CrewCard from "@/components/crews/CrewCard";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function CrewsManagement() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState(null);
  const [deleteAlert, setDeleteAlert] = useState(null);

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
        console.log("Not authenticated");
      }
    };
    getUser();
  }, []);

  const { data: crews = [], isLoading: crewsLoading } = useQuery({
    queryKey: ["crews", orgId],
    queryFn: () => CrewRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: () => EmployeeRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: siteSettingsList = [] } = useQuery({
    queryKey: ["site_settings", orgId],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });
  const siteShifts = siteSettingsList[0]?.shifts || [];

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (!orgId) throw new Error("Organization not loaded. Please refresh the page.");
      return CrewRepo.create({ ...data, organization_id: orgId });
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["crews", orgId] });
      const previous = queryClient.getQueryData(["crews", orgId]);
      queryClient.setQueryData(["crews", orgId], (old = []) => [...old, { ...newData, id: `temp-${Date.now()}`, organization_id: orgId }]);
      return { previous };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(["crews", orgId], context.previous);
      toast.error("Failed to create crew");
    },
    onSuccess: () => {
      setFormOpen(false);
      setEditingCrew(null);
      toast.success("Crew created");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["crews", orgId] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => CrewRepo.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["crews", orgId] });
      const previous = queryClient.getQueryData(["crews", orgId]);
      queryClient.setQueryData(["crews", orgId], (old = []) => old.map(c => c.id === id ? { ...c, ...data } : c));
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["crews", orgId], context.previous);
      toast.error("Failed to update crew");
    },
    onSuccess: () => {
      setFormOpen(false);
      setEditingCrew(null);
      toast.success("Crew updated");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["crews", orgId] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => CrewRepo.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["crews", orgId] });
      const previous = queryClient.getQueryData(["crews", orgId]);
      queryClient.setQueryData(["crews", orgId], (old = []) => old.filter(c => c.id !== id));
      return { previous };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["crews", orgId], context.previous);
      toast.error("Failed to delete crew");
    },
    onSuccess: () => {
      setDeleteAlert(null);
      toast.success("Crew deleted");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["crews", orgId] })
  });

  const handleSave = (data) => {
    if (editingCrew) {
      updateMutation.mutate({ id: editingCrew.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (crew) => {
    setEditingCrew(crew);
    setFormOpen(true);
  };

  const handleDelete = (crew) => {
    setDeleteAlert(crew);
  };

  const handleConfirmDelete = () => {
    if (deleteAlert) {
      deleteMutation.mutate(deleteAlert.id);
    }
  };

  if (crewsLoading || empLoading) {
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
          <h2 className="text-2xl font-bold text-slate-900">Crews</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your teams and assignments</p>
        </div>
        <Button 
          onClick={() => {
            setEditingCrew(null);
            setFormOpen(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 rounded-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Crew
        </Button>
      </div>

      <div className="grid gap-4">
        {crews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No crews yet. Create your first crew.</p>
          </div>
        ) : (
          crews.map(crew => (
            <CrewCard
              key={crew.id}
              crew={crew}
              employees={employees}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <CrewFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        crew={editingCrew}
        employees={employees}
        crews={crews}
        shifts={siteShifts}
        onSubmit={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteAlert} onOpenChange={(open) => !open && setDeleteAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Crew</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteAlert?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-700 rounded-full">
            Delete
          </AlertDialogAction>
          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}