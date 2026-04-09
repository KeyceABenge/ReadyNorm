import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Timer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const TYPE_LABELS = { mock_recall: "Mock Recall", actual_recall: "Actual Recall", market_withdrawal: "Market Withdrawal", stock_recovery: "Stock Recovery" };
const TYPE_COLORS = { mock_recall: "bg-blue-100 text-blue-700", actual_recall: "bg-rose-100 text-rose-700", market_withdrawal: "bg-amber-100 text-amber-700", stock_recovery: "bg-purple-100 text-purple-700" };
const STATUS_COLORS = { initiated: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700", closed: "bg-slate-100 text-slate-600" };

export default function RecallCard({ recall, onEdit, onView }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(recall)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={cn("text-xs", TYPE_COLORS[recall.type])}>{TYPE_LABELS[recall.type]}</Badge>
            <Badge className={cn("text-xs", STATUS_COLORS[recall.status])}>{recall.status.replace(/_/g, " ")}</Badge>
            {recall.classification && recall.classification !== "not_classified" && (
              <Badge variant="outline" className="text-xs">{recall.classification.replace(/_/g, " ").toUpperCase()}</Badge>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 truncate">{recall.product_name}</h3>
          <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{recall.reason}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            {recall.recall_number && <span>{recall.recall_number}</span>}
            {recall.lot_numbers?.length > 0 && <span>Lots: {recall.lot_numbers.join(", ")}</span>}
            {recall.created_date && <span>{format(parseISO(recall.created_date), "MMM d, yyyy")}</span>}
          </div>
          {recall.type === "mock_recall" && recall.mock_recall_actual_minutes && (
            <div className="flex items-center gap-2 mt-2">
              <Timer className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-600">{recall.mock_recall_actual_minutes}m / {recall.mock_recall_target_minutes || 240}m target</span>
              {recall.mock_recall_passed ? (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">Passed</Badge>
              ) : (
                <Badge className="bg-rose-100 text-rose-700 text-xs">Failed</Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); onEdit(recall); }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}