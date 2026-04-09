import { useState } from "react";
import { ChemicalCountEntryRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, CheckCircle2, Clock, Eye, FileCheck, ShoppingCart 
} from "lucide-react";
import { format, parseISO } from "date-fns";

import InventoryReviewModal from "./InventoryReviewModal";

export default function InventoryHistoryList({ organizationId, inventoryRecords }) {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Fetch count entries for selected record
  const { data: countEntries = [] } = useQuery({
    queryKey: ["count_entries", selectedRecord?.id],
    queryFn: () => ChemicalCountEntryRepo.filter({ inventory_record_id: selectedRecord?.id }),
    enabled: !!selectedRecord?.id
  });

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setReviewModalOpen(true);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "pending":
        return { color: "bg-slate-100 text-slate-700", icon: Clock };
      case "in_progress":
        return { color: "bg-amber-100 text-amber-700", icon: Clock };
      case "completed":
        return { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 };
      case "reviewed":
        return { color: "bg-blue-100 text-blue-700", icon: FileCheck };
      case "closed":
        return { color: "bg-slate-600 text-white", icon: ShoppingCart };
      default:
        return { color: "bg-slate-100 text-slate-700", icon: Clock };
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Inventory History</h2>

      {inventoryRecords.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No inventory records yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {inventoryRecords.map(record => {
            const config = getStatusConfig(record.status);
            const StatusIcon = config.icon;
            
            return (
              <Card key={record.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        Week of {format(parseISO(record.week_start_date), "MMM d, yyyy")}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        {record.completed_by_name && (
                          <span>Counted by {record.completed_by_name}</span>
                        )}
                        {record.completed_at && (
                          <span>• {format(parseISO(record.completed_at), "MMM d 'at' h:mm a")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge className={config.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {record.status}
                    </Badge>
                    {record.order_placed && (
                      <Badge variant="outline" className="text-emerald-600">
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Ordered
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleViewRecord(record)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedRecord && (
        <InventoryReviewModal
          open={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedRecord(null);
          }}
          organizationId={organizationId}
          inventoryRecord={selectedRecord}
          countEntries={countEntries}
          isManager={true}
        />
      )}
    </div>
  );
}