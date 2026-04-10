import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, HandHelping, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { HelperRepo } from "@/lib/adapters/database";

export default function HelperRegistrationModal({ open, onOpenChange, organizationId, siteCode }) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsLoading(true);
    try {
      // Create helper account
      const helper = await HelperRepo.create({
        organization_id: organizationId,
        name: name.trim(),
        status: "active",
        user_type: "helper"
      });

      // Store helper in localStorage and redirect to helper dashboard
      localStorage.setItem("selectedHelper", JSON.stringify(helper));
      localStorage.setItem("helperSession", JSON.stringify({
        helper_id: helper.id,
        helper_name: helper.name,
        organization_id: organizationId,
        session_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toISOString()
      }));

      toast.success("Welcome! You're signed in as a Helper.");
      window.location.href = createPageUrl("HelperDashboard") + `?site=${siteCode}`;
    } catch (error) {
      console.error("Error creating helper:", error);
      toast.error("Failed to create helper account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandHelping className="w-5 h-5 text-amber-600" />
            Quick Helper Sign-In
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Helper Account</p>
                <p className="text-xs">
                  Helper accounts have limited access for task assistance only. 
                  You may need to complete required training before performing certain tasks.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="helper-name">Your Name</Label>
            <Input
              id="helper-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !name.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Sign In as Helper
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}