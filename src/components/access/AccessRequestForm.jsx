// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccessRequestRepo } from "@/lib/adapters/database";
import { Loader2, Send, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

function getDeviceId() {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("device_id", id);
  }
  return id;
}

export { getDeviceId };

export default function AccessRequestForm({ organization, siteCode, existingRequest, onRequestSubmitted }) {
  const [name, setName] = useState(existingRequest?.requester_name || "");
  const [email, setEmail] = useState(existingRequest?.requester_email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show status screens for existing requests
  if (existingRequest?.status === "pending") {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Request Pending</h2>
        <p className="text-sm text-slate-600 max-w-sm mx-auto">
          Your request to access <span className="font-semibold">{organization.site_name || organization.name}</span> is being reviewed by a manager. You'll be able to proceed once approved.
        </p>
        <div className="bg-slate-50 rounded-xl p-4 text-left max-w-xs mx-auto">
          <p className="text-xs text-slate-500 mb-1">Submitted as</p>
          <p className="text-sm font-medium text-slate-800">{existingRequest.requester_name}</p>
          <p className="text-sm text-slate-600">{existingRequest.requester_email}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.reload()}
          className="mt-2"
        >
          Check Status
        </Button>
      </motion.div>
    );
  }

  if (existingRequest?.status === "denied") {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-sm text-slate-600 max-w-sm mx-auto">
          Your request to access <span className="font-semibold">{organization.site_name || organization.name}</span> was not approved. Please contact your manager for more information.
        </p>
        {existingRequest.review_notes && (
          <div className="bg-red-50 rounded-xl p-4 text-left max-w-xs mx-auto">
            <p className="text-xs text-red-500 mb-1">Reason</p>
            <p className="text-sm text-red-800">{existingRequest.review_notes}</p>
          </div>
        )}
        <Button 
          variant="outline" 
          size="sm"
          onClick={async () => {
            // Allow re-request by creating a new request
            await AccessRequestRepo.update(existingRequest.id, { status: "pending", review_notes: "", reviewed_by: "", reviewed_at: "" });
            toast.success("Request resubmitted");
            onRequestSubmitted?.();
          }}
          className="mt-2"
        >
          Request Again
        </Button>
      </motion.div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter your name and email");
      return;
    }

    setIsSubmitting(true);
    const deviceId = getDeviceId();

    await AccessRequestRepo.create({
      organization_id: organization.id,
      site_code: siteCode,
      requester_name: name.trim(),
      requester_email: email.trim().toLowerCase(),
      device_id: deviceId,
      status: "pending"
    });

    toast.success("Access request submitted!");
    onRequestSubmitted?.();
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mx-auto"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Request Access</h2>
        <p className="text-sm text-slate-600">
          Enter your details to request access to <span className="font-semibold">{organization.site_name || organization.name}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm text-slate-700">Full Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-sm text-slate-700">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="mt-1"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-800 hover:bg-slate-700"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Submit Request
        </Button>
      </form>
    </motion.div>
  );
}