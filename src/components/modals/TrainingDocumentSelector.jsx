import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrainingDocumentRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, GraduationCap, CheckCircle, X, ClipboardList, AlertTriangle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const documentTypes = {
  ssop: { label: "SSOP", icon: ClipboardList, color: "bg-blue-100 text-blue-700" },
  sds: { label: "SDS", icon: AlertTriangle, color: "bg-red-100 text-red-700" },
  one_point_lesson: { label: "One Point Lesson", icon: BookOpen, color: "bg-emerald-100 text-emerald-700" },
  training_material: { label: "Training", icon: GraduationCap, color: "bg-purple-100 text-purple-700" },
  other: { label: "Other", icon: FileText, color: "bg-slate-100 text-slate-700" }
};

export default function TrainingDocumentSelector({ 
  open, 
  onOpenChange, 
  organizationId,
  selectedId,
  onSelect 
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["training_documents_selector", organizationId],
    queryFn: () => TrainingDocumentRepo.filter({ 
      organization_id: organizationId, 
      status: "active" 
    }),
    enabled: !!organizationId && open
  });

  const filteredDocuments = documents.filter(doc => 
    !searchQuery || 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (doc) => {
    onSelect(doc);
    onOpenChange(false);
  };

  const handleClear = () => {
    onSelect(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Link Required Training
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search training documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {selectedId && (
            <Button 
              variant="outline" 
              onClick={handleClear}
              className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <X className="w-4 h-4 mr-2" />
              Remove Training Requirement
            </Button>
          )}

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {isLoading ? (
              <p className="text-center py-8 text-slate-500">Loading documents...</p>
            ) : filteredDocuments.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No training documents found</p>
            ) : (
              filteredDocuments.map(doc => {
                const typeConfig = documentTypes[doc.type] || documentTypes.other;
                const TypeIcon = typeConfig.icon;
                const isSelected = selectedId === doc.id;
                
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelect(doc)}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-all",
                      isSelected 
                        ? "border-emerald-500 bg-emerald-50" 
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg flex-shrink-0", typeConfig.color)}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                          {isSelected && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{typeConfig.label}</Badge>
                          {doc.category && (
                            <span className="text-xs text-slate-500">{doc.category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}