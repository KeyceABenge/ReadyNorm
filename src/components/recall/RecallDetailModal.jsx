import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const TYPE_LABELS = { mock_recall: "Mock Recall", actual_recall: "Actual Recall", market_withdrawal: "Market Withdrawal", stock_recovery: "Stock Recovery" };

export default function RecallDetailModal({ open, onOpenChange, recall }) {
  if (!recall) return null;

  const recoveryRate = recall.quantity_distributed > 0 ? Math.round((recall.quantity_recovered / recall.quantity_distributed) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {recall.product_name}
            <Badge variant="outline">{TYPE_LABELS[recall.type]}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {recall.recall_number && <p className="text-sm text-slate-500">Recall #: {recall.recall_number}</p>}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Status:</span> <span className="font-medium capitalize">{recall.status?.replace(/_/g, " ")}</span></div>
            <div><span className="text-slate-500">Classification:</span> <span className="font-medium uppercase">{recall.classification?.replace(/_/g, " ")}</span></div>
            {recall.production_line_name && <div><span className="text-slate-500">Line:</span> <span className="font-medium">{recall.production_line_name}</span></div>}
            {recall.lot_numbers?.length > 0 && <div><span className="text-slate-500">Lots:</span> <span className="font-medium">{recall.lot_numbers.join(", ")}</span></div>}
          </div>
          <Separator />
          <div><h4 className="font-medium mb-1">Reason</h4><p className="text-sm text-slate-600">{recall.reason}</p></div>

          {(recall.quantity_produced || recall.quantity_distributed) && (
            <>
              <Separator />
              <div className="grid grid-cols-4 gap-3 text-center">
                <div><p className="text-lg font-bold">{recall.quantity_produced || 0}</p><p className="text-xs text-slate-500">Produced</p></div>
                <div><p className="text-lg font-bold">{recall.quantity_distributed || 0}</p><p className="text-xs text-slate-500">Distributed</p></div>
                <div><p className="text-lg font-bold">{recall.quantity_recovered || 0}</p><p className="text-xs text-slate-500">Recovered</p></div>
                <div><p className="text-lg font-bold">{recoveryRate}%</p><p className="text-xs text-slate-500">Recovery Rate</p></div>
              </div>
            </>
          )}

          {recall.type === "mock_recall" && recall.mock_recall_actual_minutes && (
            <>
              <Separator />
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Mock Recall Results</h4>
                <div className="flex items-center gap-4 text-sm">
                  <span>Target: {recall.mock_recall_target_minutes || 240}m</span>
                  <span>Actual: {recall.mock_recall_actual_minutes}m</span>
                  <Badge className={recall.mock_recall_passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                    {recall.mock_recall_passed ? "PASSED" : "FAILED"}
                  </Badge>
                </div>
              </div>
            </>
          )}

          {recall.distribution_list?.length > 0 && (
            <>
              <Separator />
              <h4 className="font-medium">Distribution List ({recall.distribution_list.length})</h4>
              <div className="space-y-2">
                {recall.distribution_list.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                    <span>{d.customer_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{d.quantity_shipped} units</span>
                      <Badge className={d.notified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                        {d.notified ? "Notified" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(recall.root_cause || recall.corrective_actions) && (
            <>
              <Separator />
              {recall.root_cause && <div><h4 className="font-medium mb-1">Root Cause</h4><p className="text-sm text-slate-600">{recall.root_cause}</p></div>}
              {recall.corrective_actions && <div><h4 className="font-medium mb-1">Corrective Actions</h4><p className="text-sm text-slate-600">{recall.corrective_actions}</p></div>}
            </>
          )}

          {recall.notes && (
            <><Separator /><div><h4 className="font-medium mb-1">Notes</h4><p className="text-sm text-slate-600">{recall.notes}</p></div></>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}