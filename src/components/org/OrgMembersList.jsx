/**
 * Manages members and their roles within an organization group.
 * Supports assigning site-level access.
 */
import { useState } from "react";
import { OrgGroupMembershipRepo } from "@/lib/adapters/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2, Shield, Crown, MapPin, Building2 } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS = {
  org_owner: "Organization Owner",
  org_manager: "Organization Manager",
  site_manager: "Site Manager",
  site_user: "Site User"
};

const ROLE_COLORS = {
  org_owner: "bg-amber-600",
  org_manager: "bg-indigo-600",
  site_manager: "bg-sky-600",
  site_user: "bg-slate-500"
};

const ROLE_ICONS = {
  org_owner: Crown,
  org_manager: Building2,
  site_manager: MapPin,
  site_user: Shield
};

export default function OrgMembersList({ orgGroup, members, sites, currentUserEmail, allSiteAdmins = [] }) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("site_manager");
  const [accessType, setAccessType] = useState("all");
  const [selectedSites, setSelectedSites] = useState([]);
  const queryClient = useQueryClient();

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      // Check if member already exists
      const existing = await OrgGroupMembershipRepo.filter({
        org_group_id: orgGroup.id,
        user_email: newEmail.trim()
      });
      if (existing.length > 0) throw new Error("This user is already a member");

      return OrgGroupMembershipRepo.create({
        org_group_id: orgGroup.id,
        user_email: newEmail.trim(),
        user_name: newName.trim() || newEmail.trim(),
        role: newRole,
        site_access_type: accessType,
        allowed_site_ids: accessType === "selected" ? selectedSites : [],
        status: "active"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_members"] });
      resetForm();
      toast.success("Member added");
    },
    onError: (error) => toast.error(error.message || "Failed to add member")
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return OrgGroupMembershipRepo.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_members"] });
      setEditingMember(null);
      toast.success("Member updated");
    }
  });

  const resetForm = () => {
    setShowAddMember(false);
    setNewEmail("");
    setNewName("");
    setNewRole("site_manager");
    setAccessType("all");
    setSelectedSites([]);
  };

  const openEdit = (member) => {
    setEditingMember(member);
    setNewRole(member.role);
    setAccessType(member.site_access_type || "all");
    setSelectedSites(member.allowed_site_ids || []);
  };

  const handleSave = () => {
    if (editingMember) {
      updateMemberMutation.mutate({
        id: editingMember.id,
        data: {
          role: newRole,
          site_access_type: accessType,
          allowed_site_ids: accessType === "selected" ? selectedSites : []
        }
      });
    } else {
      addMemberMutation.mutate();
    }
  };

  const toggleSite = (siteId) => {
    setSelectedSites(prev =>
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    );
  };

  const activeMembers = members.filter(m => m.status === "active");

  // Build combined list: org members + site admins not already in org members
  const orgMemberEmails = new Set(activeMembers.map(m => m.user_email));
  const siteOnlyAdmins = allSiteAdmins.filter(a => !orgMemberEmails.has(a.email));

  // Group org members by role
  const orgOwners = activeMembers.filter(m => m.role === "org_owner");
  const orgManagers = activeMembers.filter(m => m.role === "org_manager");
  const siteManagers = activeMembers.filter(m => m.role === "site_manager");
  const siteUsers = activeMembers.filter(m => m.role === "site_user");

  const totalCount = activeMembers.length + siteOnlyAdmins.length;

  const renderMemberCard = (member) => {
    const Icon = ROLE_ICONS[member.role] || Shield;
    return (
      <Card key={member.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(member)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{member.user_name || member.user_email}</p>
                <p className="text-xs text-slate-500">{member.user_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={ROLE_COLORS[member.role]}>
                {ROLE_LABELS[member.role]}
              </Badge>
              {member.site_access_type === "selected" && (
                <Badge variant="outline" className="text-xs">
                  {member.allowed_site_ids?.length || 0} site{(member.allowed_site_ids?.length || 0) !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSiteAdminCard = (admin) => (
    <Card key={`site-admin-${admin.email}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{admin.full_name || admin.email}</p>
              <p className="text-xs text-slate-500">{admin.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-sky-600">Site Manager</Badge>
            <Badge variant="outline" className="text-xs">{admin.site_name}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSection = (title, items, renderFn) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</h3>
          <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">{items.length}</span>
        </div>
        <div className="grid gap-3">
          {items.map(renderFn)}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Owners & Managers ({totalCount})</h2>
        <Button size="sm" onClick={() => { resetForm(); setShowAddMember(true); }} className="bg-slate-900 hover:bg-slate-800">
          <UserPlus className="w-4 h-4 mr-1.5" />
          Add Member
        </Button>
      </div>

      {renderSection("Organization Owners", orgOwners, renderMemberCard)}
      {renderSection("Organization Managers", orgManagers, renderMemberCard)}
      {renderSection("Site Managers", siteManagers, renderMemberCard)}
      {renderSection("Site Admins (from Sites)", siteOnlyAdmins, renderSiteAdminCard)}
      {renderSection("Site Users", siteUsers, renderMemberCard)}

      {/* Add / Edit Member Dialog */}
      <Dialog open={showAddMember || !!editingMember} onOpenChange={(open) => { if (!open) { setShowAddMember(false); setEditingMember(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Member" : "Add Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {!editingMember && (
              <>
                <div>
                  <Label>Email</Label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" className="mt-1" autoFocus />
                </div>
                <div>
                  <Label>Name (optional)</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" className="mt-1" />
                </div>
              </>
            )}
            {editingMember && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-sm">{editingMember.user_name}</p>
                <p className="text-xs text-slate-500">{editingMember.user_email}</p>
              </div>
            )}

            <div>
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole} disabled={editingMember?.role === "org_owner"}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_owner">Organization Owner</SelectItem>
                  <SelectItem value="org_manager">Organization Manager</SelectItem>
                  <SelectItem value="site_manager">Site Manager</SelectItem>
                  <SelectItem value="site_user">Site User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Site Access</Label>
              <Select value={accessType} onValueChange={setAccessType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  <SelectItem value="selected">Selected Sites Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {accessType === "selected" && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg max-h-48 overflow-y-auto">
                {sites.map(site => (
                  <label key={site.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedSites.includes(site.id)}
                      onCheckedChange={() => toggleSite(site.id)}
                    />
                    <span className="text-sm">{site.site_name || site.name}</span>
                    <code className="text-xs text-slate-400 ml-auto">{site.site_code}</code>
                  </label>
                ))}
              </div>
            )}

            <Button onClick={handleSave} className="w-full bg-slate-900 hover:bg-slate-800" disabled={addMemberMutation.isPending || updateMemberMutation.isPending || (!editingMember && !newEmail.trim())}>
              {(addMemberMutation.isPending || updateMemberMutation.isPending) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}