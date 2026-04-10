import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Loader2, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import SOC2PolicyModal from "./SOC2PolicyModal";
import SOC2PolicyViewer from "./SOC2PolicyViewer";
import { POLICY_TEMPLATES } from "./soc2PolicyTemplates";
import { PolicyRepo } from "@/lib/adapters/database";

const CATEGORY_LABELS = {
  security_governance: "Security & Governance",
  operations: "Operations",
  hr_people: "HR & People",
  data_management: "Data Management"
};

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  approved: "bg-emerald-100 text-emerald-700",
  under_review: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-500"
};

export default function SOC2PoliciesTab({ orgId, policies }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const queryClient = useQueryClient();

  const handleSeedPolicies = async () => {
    setSeeding(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const nextYear = format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      
      const policiesToCreate = POLICY_TEMPLATES.map(t => ({
        organization_id: orgId,
        policy_name: t.name,
        category: t.category,
        version: "1.0",
        owner: "Founder / System Administrator",
        status: "draft",
        content: t.content,
        next_review_date: nextYear
      }));

      await SOC2PolicyRepo.bulkCreate(policiesToCreate);
      queryClient.invalidateQueries({ queryKey: ["soc2_policies"] });
      toast.success(`${policiesToCreate.length} policies created`);
    } catch (e) {
      toast.error("Failed to seed policies");
    } finally {
      setSeeding(false);
    }
  };

  const grouped = {};
  Object.keys(CATEGORY_LABELS).forEach(cat => { grouped[cat] = []; });
  policies.forEach(p => {
    if (grouped[p.category]) grouped[p.category].push(p);
  });

  if (viewing) {
    return (
      <SOC2PolicyViewer
        policy={viewing}
        onBack={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setViewing(null); setModalOpen(true); }}
        orgId={orgId}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Policies ({policies.length})</h2>
        <div className="flex gap-2">
          {policies.length === 0 && (
            <Button variant="outline" onClick={handleSeedPolicies} disabled={seeding} className="gap-1.5">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate All Policies
            </Button>
          )}
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Policy
          </Button>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, catPolicies]) => (
        <div key={cat}>
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
            {CATEGORY_LABELS[cat]}
          </h3>
          {catPolicies.length === 0 ? (
            <p className="text-sm text-slate-400 mb-4">No policies in this category yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3 mb-6">
              {catPolicies.map(policy => (
                <Card key={policy.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewing(policy)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium text-slate-900 text-sm">{policy.policy_name}</h4>
                      </div>
                      <Badge className={STATUS_COLORS[policy.status] || ""}>{policy.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>v{policy.version || "1.0"}</span>
                      <span>Owner: {policy.owner || "—"}</span>
                      {policy.next_review_date && (
                        <span>Review: {format(parseISO(policy.next_review_date), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}

      <SOC2PolicyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        policy={editing}
        orgId={orgId}
      />
    </div>
  );
}