/**
 * Lists all sites within an organization group.
 * Allows adding new sites and managing existing ones.
 */
import { useState } from "react";
import { OrganizationRepo } from "@/lib/adapters/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Plus, Copy, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

const generateCode = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

export default function OrgSitesList({ orgGroup, sites, employees, user }) {
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const queryClient = useQueryClient();

  const addSiteMutation = useMutation({
    mutationFn: async (siteName) => {
      try {
        console.log("🚀 Starting site creation for:", siteName);
        
        let siteCode = generateCode(6);
        let attempts = 0;
        while (attempts < 10) {
          const existing = await OrganizationRepo.filter({ site_code: siteCode });
          if (existing.length === 0) break;
          siteCode = generateCode(6);
          attempts++;
        }
        console.log("✓ Generated site code:", siteCode);

        console.log("📝 Creating site with data:", {
          name: orgGroup.name,
          site_name: siteName,
          site_code: siteCode,
          org_group_id: orgGroup.id,
          status: "active"
        });

        const result = await OrganizationRepo.create({
          name: orgGroup.name,
          site_name: siteName,
          site_code: siteCode,
          org_group_id: orgGroup.id,
          created_by: user?.email || orgGroup.owner_email,
          status: "active"
        });
        console.log("✓ Site created successfully:", result);
        return result;
      } catch (error) {
        console.error("❌ Error creating site:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("🎉 Site creation succeeded, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["org_sites"] });
      setShowAddSite(false);
      setNewSiteName("");
      toast.success("Site created successfully");
    },
    onError: (error) => {
      console.error("❌ Mutation error:", error);
      const errorMsg = error?.message || error?.response?.data?.message || "Failed to create site";
      toast.error(errorMsg);
    }
  });

  const getEmployeeCount = (siteId) => {
    return employees.filter(e => e.organization_id === siteId && e.status === "active").length;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Sites ({sites.length})</h2>
        <Button size="sm" onClick={() => setShowAddSite(true)} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Site
        </Button>
      </div>

      <div className="grid gap-3">
        {sites.map(site => (
          <Card key={site.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{site.site_name || site.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{site.site_code}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(site.site_code);
                          toast.success("Copied!");
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {getEmployeeCount(site.id)} employees
                      </Badge>
                    </div>
                  </div>
                </div>
                <Badge className={site.status === "active" ? "bg-emerald-600" : "bg-slate-400"}>
                  {site.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {sites.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-slate-500">No sites yet</p>
          </Card>
        )}
      </div>

      <Dialog open={showAddSite} onOpenChange={setShowAddSite}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Site</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (newSiteName.trim()) addSiteMutation.mutate(newSiteName.trim());
          }} className="space-y-4 mt-2">
            <div>
              <Label>Site Name</Label>
              <Input
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder="e.g., Denver Facility"
                className="mt-2"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={addSiteMutation.isPending || !newSiteName.trim()}>
              {addSiteMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Site"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}