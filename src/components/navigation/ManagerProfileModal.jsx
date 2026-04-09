import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, User } from "lucide-react";
import { updateCurrentUser } from "@/lib/adapters/auth";
import { uploadFile } from "@/lib/adapters/storage";
import { toast } from "sonner";

export default function ManagerProfileModal({ open, onOpenChange, user, onUpdated }) {
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.display_name || user.full_name || "");
      setPhotoUrl(user.profile_photo_url || "");
    }
  }, [open, user]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploading(true);
    const { file_url } = await uploadFile(file);
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    setSaving(true);
    await updateCurrentUser({
      display_name: displayName.trim(),
      profile_photo_url: photoUrl || null
    });
    setSaving(false);
    toast.success("Profile updated");
    onUpdated?.({ ...user, display_name: displayName.trim(), profile_photo_url: photoUrl || null });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manager Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer group border-2 border-slate-200"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {photoUrl ? "Change Photo" : "Add Photo"}
            </button>
          </div>

          <div>
            <Label className="text-xs text-slate-500">Email</Label>
            <p className="text-sm font-medium text-slate-900">{user?.email}</p>
          </div>
          <div>
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">
              This name will appear on inspections, verifications, and comments instead of your email.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}