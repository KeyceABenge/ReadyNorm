import { useState } from "react";
import { updateCurrentUser, logout } from "@/lib/adapters/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DeleteAccountButton({ user, variant = "menu" }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Mark user account for deletion
      await updateCurrentUser({
        status: "deleted",
        deletion_requested_at: new Date().toISOString()
      });
      
      toast.success("Account deletion initiated. Your data will be removed within 30 days.");
      
      // Clear local storage and logout
      localStorage.removeItem("selectedEmployee");
      localStorage.removeItem("employeeSession");
      localStorage.removeItem("site_code");
      
      await logout(createPageUrl("Home"));
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error("Failed to delete account. Please try again or contact support.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  // Compact version for dropdown menus
  if (variant === "menu") {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </AlertDialogTrigger>
        <DeleteAccountDialog 
          user={user}
          confirmText={confirmText}
          setConfirmText={setConfirmText}
          isDeleting={isDeleting}
          onDelete={handleDeleteAccount}
          onCancel={() => setConfirmText("")}
        />
      </AlertDialog>
    );
  }

  // Full button version
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline"
          className="min-h-[44px] border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete My Account
        </Button>
      </AlertDialogTrigger>
      <DeleteAccountDialog 
        user={user}
        confirmText={confirmText}
        setConfirmText={setConfirmText}
        isDeleting={isDeleting}
        onDelete={handleDeleteAccount}
        onCancel={() => setConfirmText("")}
      />
    </AlertDialog>
  );
}

function DeleteAccountDialog({ user, confirmText, setConfirmText, isDeleting, onDelete, onCancel }) {
  return (
    <AlertDialogContent className="sm:max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
          <AlertTriangle className="w-5 h-5" />
          Delete Your Account?
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-4">
            <p>
              This action <strong>cannot be undone</strong>. All data associated with <strong>{user?.full_name || user?.email}</strong> will be permanently deleted.
            </p>
            
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
              <p className="text-xs font-medium text-rose-800 mb-2">
                Data that will be deleted:
              </p>
              <ul className="text-xs text-rose-700 space-y-1">
                <li>• Your profile and personal information</li>
                <li>• All activity and completion history</li>
                <li>• Training records and certifications</li>
                <li>• Session data and preferences</li>
              </ul>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Type <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-rose-600">DELETE</span> to confirm:
              </label>
              <Input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
                className="font-mono"
                autoComplete="off"
              />
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="gap-2 sm:gap-0">
        <AlertDialogCancel 
          onClick={onCancel}
          className="min-h-[44px]"
        >
          Cancel
        </AlertDialogCancel>
        <Button
          variant="destructive"
          disabled={confirmText !== "DELETE" || isDeleting}
          onClick={onDelete}
          className="min-h-[44px]"
        >
          {isDeleting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete My Account
            </>
          )}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}