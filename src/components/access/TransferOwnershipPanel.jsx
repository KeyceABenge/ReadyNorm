// @ts-nocheck
import { useState } from "react";
import { invokeFunction } from "@/lib/adapters/functions";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TransferOwnershipPanel({ organizationId, organizationName, currentUserEmail }) {
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const transferMutation = useMutation({
    mutationFn: async () => {
      const response = await invokeFunction("transferOwnership", {
        organization_id: organizationId,
        new_owner_email: newOwnerEmail.trim(),
      });
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success(`Ownership transferred to ${newOwnerEmail.trim()}`);
      setNewOwnerEmail("");
      setConfirmText("");
      setConfirmDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to transfer ownership");
    },
  });

  const emailValid = newOwnerEmail.trim().length > 0 && newOwnerEmail.includes("@");
  const isSelf = newOwnerEmail.trim().toLowerCase() === currentUserEmail?.toLowerCase();

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <ArrowRightLeft className="w-5 h-5" />
          Transfer Ownership
        </CardTitle>
        <CardDescription>
          Transfer ownership of this organization to another registered user
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-medium">Important:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>The new owner must already have a registered account</li>
                <li>They will receive full admin access to all sites in this organization</li>
                <li>Your role will be changed from owner to manager</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="newOwnerEmail">New Owner Email</Label>
          <Input
            id="newOwnerEmail"
            type="email"
            value={newOwnerEmail}
            onChange={(e) => setNewOwnerEmail(e.target.value)}
            placeholder="new.owner@company.com"
            className="mt-2"
          />
          {isSelf && (
            <p className="text-xs text-amber-600 mt-1">You are already the owner</p>
          )}
        </div>

        <Button
          variant="outline"
          className="border-amber-300 text-amber-700 hover:bg-amber-50 min-h-[44px]"
          disabled={!emailValid || isSelf}
          onClick={() => setConfirmDialogOpen(true)}
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Transfer Ownership
        </Button>

        <AlertDialog open={confirmDialogOpen} onOpenChange={(open) => {
          if (!open) { setConfirmText(""); }
          setConfirmDialogOpen(open);
        }}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
                Confirm Ownership Transfer
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    You are about to transfer ownership of{" "}
                    <strong>{organizationName}</strong> to{" "}
                    <strong>{newOwnerEmail.trim()}</strong>.
                  </p>
                  <p>
                    After this transfer, your role will be changed to <strong>manager</strong> and
                    the new owner will have full control over the organization.
                  </p>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Type{" "}
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-amber-600">
                        TRANSFER
                      </span>{" "}
                      to confirm:
                    </label>
                    <Input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                      placeholder="TRANSFER"
                      className="font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel onClick={() => setConfirmText("")} className="min-h-[44px]">
                Cancel
              </AlertDialogCancel>
              <Button
                disabled={confirmText !== "TRANSFER" || transferMutation.isPending}
                onClick={() => transferMutation.mutate()}
                className="min-h-[44px] bg-amber-600 hover:bg-amber-700"
              >
                {transferMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                )}
                Transfer Ownership
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}