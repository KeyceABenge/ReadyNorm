import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, BadgeRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import BadgeFormModal from "@/components/modals/BadgeFormModal";
import BadgeCard from "@/components/badges/BadgeCard";
import ProxiedImage from "@/components/ui/ProxiedImage";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BadgesManagement() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [badgeToDelete, setBadgeToDelete] = useState(null);
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

  const queryClient = useQueryClient();

  const { data: badges = [], isLoading, error, refetch } = useQuery({
    queryKey: ["badges", orgId],
    queryFn: async () => {
      // Add a small random delay to avoid thundering herd
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
      return BadgeRepo.filter({ organization_id: orgId }, "-created_date");
    },
    enabled: !!orgId,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 30000),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false
  });

  const badgeMutation = useMutation({
    // @ts-ignore - mutationFn parameter typing
    mutationFn: async ({ id, data }) => {
      if (id) {
        return BadgeRepo.update(id, data);
      }
      return BadgeRepo.create({ ...data, organization_id: orgId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badges"] });
      setModalOpen(false);
      setEditingBadge(null);
      toast.success(editingBadge ? "Badge updated" : "Badge created");
    }
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: (id) => BadgeRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badges"] });
      setDeleteDialogOpen(false);
      setBadgeToDelete(null);
      toast.success("Badge deleted");
    }
  });

  const handleEditBadge = (badge) => {
    setEditingBadge(badge);
    setModalOpen(true);
  };

  const handleDeleteBadge = (badge) => {
    setBadgeToDelete(badge);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteBadgeMutation.mutate(badgeToDelete.id);
  };

  const activeBadges = badges.filter(b => b.status === "active");
  const inactiveBadges = badges.filter(b => b.status === "inactive");

  // Group active badges by series
  const { seriesGroups, standaloneBadges } = (() => {
    const seriesMap = {};
    const standalone = [];
    activeBadges.forEach(b => {
      if (b.series_id) {
        if (!seriesMap[b.series_id]) seriesMap[b.series_id] = [];
        seriesMap[b.series_id].push(b);
      } else {
        standalone.push(b);
      }
    });
    // Sort each series by series_order
    Object.values(seriesMap).forEach(arr => arr.sort((a, b) => (a.series_order || 0) - (b.series_order || 0)));
    return { seriesGroups: Object.entries(seriesMap), standaloneBadges: standalone };
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-rose-600 text-sm">Failed to load badges. Please try again.</p>
        <Button onClick={() => refetch()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Badge Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Set up achievement badges for employees</p>
        </div>
        <Button
          onClick={() => {
            setEditingBadge(null);
            setModalOpen(true);
          }}
          className="bg-slate-900 hover:bg-slate-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Badge
        </Button>
      </div>

      {badges.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-slate-200">
          <div className="text-2xl mb-2">🏆</div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No badges yet</h3>
          <p className="text-xs text-slate-500 mb-3">Create badges to reward employee achievements</p>
          <Button
            onClick={() => {
              setEditingBadge(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Badge
          </Button>
        </div>
      ) : (
        <>
          {/* Badge Series */}
          {seriesGroups.length > 0 && (
            <div className="space-y-3">
              {seriesGroups.map(([seriesId, seriesBadges]) => (
                <div key={seriesId} className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex -space-x-1.5">
                      {seriesBadges.slice(0, 3).map(b => (
                        <ProxiedImage key={b.id} src={b.photo_url} alt="" className="w-5 h-5 rounded-full border-2 border-white object-cover" fallbackSrc="" fallbackIcon={null} fallbackText="" onError={() => {}} />
                      ))}
                    </div>
                    <h3 className="text-xs font-semibold text-slate-700">{seriesId}</h3>
                    <span className="text-[10px] text-slate-400">({seriesBadges.length} badges)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {seriesBadges.map(badge => (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        onEdit={handleEditBadge}
                        onDelete={handleDeleteBadge}
                        seriesPosition={badge.series_order}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Standalone Active Badges */}
          {standaloneBadges.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                {seriesGroups.length > 0 ? "Other Badges" : "Active Badges"} ({standaloneBadges.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {standaloneBadges.map(badge => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    onEdit={handleEditBadge}
                    onDelete={handleDeleteBadge}
                    seriesPosition={undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Badges */}
          {inactiveBadges.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Inactive Badges ({inactiveBadges.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {inactiveBadges.map(badge => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    onEdit={handleEditBadge}
                    onDelete={handleDeleteBadge}
                    seriesPosition={undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <BadgeFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        badge={editingBadge}
        // @ts-ignore - mutation properly accepts id and data
        onSave={(data) => badgeMutation.mutate({ id: editingBadge?.id, data })}
        isLoading={badgeMutation.isPending}
        orgId={orgId}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        {/* @ts-ignore - AlertDialogContent properly accepts children prop */}
        <AlertDialogContent>
          {/* @ts-ignore - AlertDialogHeader properly accepts children prop */}
          <AlertDialogHeader>
            {/* @ts-ignore - AlertDialogTitle properly accepts children prop */}
            <AlertDialogTitle>Delete Badge</AlertDialogTitle>
            {/* @ts-ignore - AlertDialogDescription properly accepts children prop */}
            <AlertDialogDescription>
              Are you sure you want to delete "{badgeToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* @ts-ignore - AlertDialogFooter properly accepts children prop */}
          <AlertDialogFooter>
            {/* @ts-ignore - AlertDialogCancel properly accepts children prop */}
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* @ts-ignore - AlertDialogAction properly accepts children prop */}
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}