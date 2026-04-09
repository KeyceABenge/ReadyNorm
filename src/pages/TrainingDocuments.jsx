// @ts-nocheck
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, TrainingDocumentRepo, TrainingQuizRepo, ControlledDocumentRepo } from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, Plus, Upload, Loader2, Search, Trash2, 
  ExternalLink, MoreVertical, Archive, FolderOpen,
  BookOpen, AlertTriangle, ClipboardList, GraduationCap, HelpCircle, CheckCircle, ChevronDown
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import QuizEditorModal from "@/components/training/QuizEditorModal";
import TrainingProgressMatrix from "@/components/training/TrainingProgressMatrix";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

const documentTypes = {
  ssop: { label: "SSOP", icon: ClipboardList, color: "bg-blue-100 text-blue-700" },
  sds: { label: "SDS", icon: AlertTriangle, color: "bg-red-100 text-red-700" },
  one_point_lesson: { label: "One Point Lesson", icon: BookOpen, color: "bg-emerald-100 text-emerald-700" },
  training_material: { label: "Training Material", icon: GraduationCap, color: "bg-purple-100 text-purple-700" },
  policy: { label: "Policy", icon: FileText, color: "bg-indigo-100 text-indigo-700" },
  sop: { label: "SOP", icon: FileText, color: "bg-cyan-100 text-cyan-700" },
  work_instruction: { label: "Work Instruction", icon: FileText, color: "bg-teal-100 text-teal-700" },
  form: { label: "Form", icon: FileText, color: "bg-amber-100 text-amber-700" },
  other: { label: "Other", icon: FileText, color: "bg-slate-100 text-slate-700" }
};

const documentStatuses = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-700" },
  effective: { label: "Effective", color: "bg-emerald-100 text-emerald-700" },
  obsolete: { label: "Obsolete", color: "bg-rose-100 text-rose-700" }
};

function ControlledDocsView({ docs }) {
  if (docs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p>No controlled documents found</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {docs.map(doc => {
        const statusConfig = documentStatuses[doc.status] || documentStatuses.draft;
        return (
          <Card key={doc.id}>
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-slate-900 truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {doc.document_number && <span className="text-xs text-slate-500">{doc.document_number}</span>}
                    <Badge className={cn("text-[10px] px-1.5 py-0", statusConfig.color)}>{statusConfig.label}</Badge>
                    {doc.version && <span className="text-xs text-slate-400">v{doc.version}</span>}
                  </div>
                  {doc.file_url && (
                    <Button variant="ghost" size="sm" className="mt-1 h-6 text-xs px-2" onClick={() => window.open(doc.file_url, "_blank")}>
                      <ExternalLink className="w-3 h-3 mr-1" /> View
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function TrainingDocuments() {
  const [user, setUser] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [selectedDocForQuiz, setSelectedDocForQuiz] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [viewMode, setViewMode] = useState("training"); // "training" or "controlled"
  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        // CRITICAL: Get organization_id ONLY from site_code in localStorage
        const storedSiteCode = localStorage.getItem('site_code');
        if (!storedSiteCode) {
          window.location.href = createPageUrl("Home");
          return;
        }
        
        const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].id);
        } else {
          localStorage.removeItem('site_code');
          window.location.href = createPageUrl("Home");
        }
      } catch (e) {
        console.error("Error loading user:", e);
      }
    };
    init();
  }, []);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["training_documents", organizationId],
    queryFn: () => TrainingDocumentRepo.filter({ organization_id: organizationId }, "-created_date"),
    enabled: !!organizationId
  });

  const { data: quizzes = [], refetch: refetchQuizzes } = useQuery({
    queryKey: ["training_quizzes", organizationId],
    queryFn: () => TrainingQuizRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: controlledDocs = [], refetch: refetchControlledDocs } = useQuery({
    queryKey: ["controlled_documents", organizationId],
    queryFn: () => ControlledDocumentRepo.filter({ organization_id: organizationId }, "-created_date"),
    enabled: !!organizationId
  });

  const getQuizForDocument = (docId) => quizzes.find(q => q.document_id === docId);

  const deleteDocumentMutation = useMutation({
    mutationFn: async (doc) => {
      await TrainingDocumentRepo.delete(doc.id);
      // Also mark the linked controlled document as obsolete
      if (doc.linked_controlled_document_id) {
        await ControlledDocumentRepo.update(doc.linked_controlled_document_id, { status: "obsolete" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_documents"] });
      queryClient.invalidateQueries({ queryKey: ["controlled_documents"] });
      toast.success("Document deleted");
    }
  });

  const archiveDocumentMutation = useMutation({
    mutationFn: async (doc) => {
      await TrainingDocumentRepo.update(doc.id, { status: "archived" });
      if (doc.linked_controlled_document_id) {
        await ControlledDocumentRepo.update(doc.linked_controlled_document_id, { status: "obsolete" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_documents"] });
      queryClient.invalidateQueries({ queryKey: ["controlled_documents"] });
      toast.success("Document archived");
    }
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = docTypeFilter === "all" || 
      (docTypeFilter === "archived" ? doc.status === "archived" : doc.type === docTypeFilter && doc.status === "active");
    
    if (docTypeFilter === "all") {
      return matchesSearch && doc.status === "active";
    }
    
    return matchesSearch && matchesType;
  });

  // Group by category
  const documentsByCategory = {};
  filteredDocuments.forEach(doc => {
    const category = doc.category || "Uncategorized";
    if (!documentsByCategory[category]) {
      documentsByCategory[category] = [];
    }
    documentsByCategory[category].push(doc);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FolderOpen className="w-6 h-6" />
              Training Documents
            </h1>
            <p className="text-slate-500 mt-1">Manage SSOPs, SDSs, one-point lessons, and training materials</p>
          </div>
          <Button onClick={() => setUploadModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 flex-wrap">
          <Button
            variant={viewMode === "training" ? "default" : "outline"}
            onClick={() => setViewMode("training")}
            className={viewMode === "training" ? "bg-slate-900" : ""}
          >
            Training Docs
          </Button>
          <Button
            variant={viewMode === "progress" ? "default" : "outline"}
            onClick={() => setViewMode("progress")}
            className={viewMode === "progress" ? "bg-slate-900" : ""}
          >
            Training Progress
          </Button>
          <Button
            variant={viewMode === "controlled" ? "default" : "outline"}
            onClick={() => setViewMode("controlled")}
            className={viewMode === "controlled" ? "bg-slate-900" : ""}
          >
            Controlled Docs
          </Button>
        </div>

        {/* Filter Tabs */}
        {viewMode !== "progress" && (
          <div className="flex flex-wrap gap-2">
          {viewMode === "training" ? (
            [
              { value: "all", label: "All" },
              { value: "ssop", label: "SSOPs" },
              { value: "sds", label: "SDSs" },
              { value: "one_point_lesson", label: "One Point Lessons" },
              { value: "training_material", label: "Training" },
              { value: "archived", label: "Archived" }
            ].map(tab => (
              <Button
                key={tab.value}
                variant={docTypeFilter === tab.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDocTypeFilter(tab.value)}
                className={docTypeFilter === tab.value ? "bg-slate-900" : ""}
              >
                {tab.label}
              </Button>
            ))
          ) : (
            [
              { value: "all", label: "All" },
              { value: "effective", label: "Effective" },
              { value: "draft", label: "Draft" },
              { value: "in_review", label: "In Review" },
              { value: "obsolete", label: "Obsolete" }
            ].map(tab => (
              <Button
                key={tab.value}
                variant={docTypeFilter === tab.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDocTypeFilter(tab.value)}
                className={docTypeFilter === tab.value ? "bg-slate-900" : ""}
              >
                {tab.label}
              </Button>
            ))
          )}
        </div>
        )}

        {/* Documents List */}
        <div className="mt-6">
            {viewMode === "progress" ? (
              <TrainingProgressMatrix organizationId={organizationId} />
            ) : viewMode === "controlled" ? (
              <ControlledDocsView 
                docs={controlledDocs.filter(doc => {
                  const matchSearch = !searchQuery || doc.title?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchStatus = docTypeFilter === "all" || doc.status === docTypeFilter;
                  return matchSearch && matchStatus;
                })}
                organizationId={organizationId}
                user={user}
                onRefresh={refetchControlledDocs}
              />
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No documents found</p>
                <p className="text-sm">Upload a document to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(documentsByCategory).sort().map(([category, docs]) => (
                  <Collapsible 
                    key={category} 
                    open={expandedCategories[category]} 
                    onOpenChange={(open) => setExpandedCategories(prev => ({ ...prev, [category]: open }))}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-slate-600" />
                          <span className="font-medium text-sm text-slate-700">{category}</span>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">{docs.length}</Badge>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", expandedCategories[category] && "rotate-180")} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 mt-2">
                        {docs.map(doc => {
                          const typeConfig = documentTypes[doc.type] || documentTypes.other;
                          const TypeIcon = typeConfig.icon;
                          return (
                            <Card key={doc.id} className={cn(doc.status === "archived" && "opacity-60")}>
                              <CardContent className="p-2.5">
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="flex items-start gap-2 min-w-0">
                                    <div className={cn("p-1.5 rounded-md flex-shrink-0", typeConfig.color)}>
                                      <TypeIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm text-slate-900 truncate">{doc.title}</p>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">{typeConfig.label}</Badge>
                                      {doc.description && (
                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{doc.description}</p>
                                      )}
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        {doc.created_date ? format(parseISO(doc.created_date), "MMM d, yyyy") : "—"}
                                      </p>
                                      {(() => {
                                        const quiz = getQuizForDocument(doc.id);
                                        if (quiz?.status === "approved") {
                                          return (
                                            <Badge className="mt-1 bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">
                                              <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                              Quiz Active
                                            </Badge>
                                          );
                                        } else if (quiz) {
                                          return (
                                            <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">
                                              <HelpCircle className="w-2.5 h-2.5 mr-0.5" />
                                              Quiz Draft
                                            </Badge>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => window.open(doc.file_url, "_blank")}>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View Document
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedDocForQuiz(doc);
                                        setQuizModalOpen(true);
                                      }}>
                                        <HelpCircle className="w-4 h-4 mr-2" />
                                        {getQuizForDocument(doc.id) ? "Edit Quiz" : "Create Quiz"}
                                      </DropdownMenuItem>
                                      {doc.status === "active" && (
                                        <DropdownMenuItem onClick={() => archiveDocumentMutation.mutate(doc)}>
                                          <Archive className="w-4 h-4 mr-2" />
                                          Archive
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => deleteDocumentMutation.mutate(doc)}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
        </div>

        {/* Upload Modal */}
        <UploadDocumentModal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          organizationId={organizationId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["training_documents"] });
            queryClient.invalidateQueries({ queryKey: ["controlled_documents"] });
            setUploadModalOpen(false);
          }}
        />

        {/* Quiz Editor Modal */}
        {selectedDocForQuiz && (
          <QuizEditorModal
            open={quizModalOpen}
            onOpenChange={setQuizModalOpen}
            document={selectedDocForQuiz}
            existingQuiz={getQuizForDocument(selectedDocForQuiz.id)}
            organizationId={organizationId}
            onSave={() => {
              refetchQuizzes();
              setSelectedDocForQuiz(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function UploadDocumentModal({ open, onClose, organizationId, onSuccess }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("ssop");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Map training doc types to controlled document types
  const typeToControlledType = {
    ssop: "ssop",
    sds: "other",
    one_point_lesson: "training_material",
    training_material: "training_material",
    policy: "policy",
    sop: "sop",
    work_instruction: "work_instruction",
    form: "form",
    other: "other"
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title) return;

    setIsUploading(true);
    try {
      // Upload file directly
      const { file_url } = await uploadFile(file);

      // Create training document record
      const trainingDoc = await TrainingDocumentRepo.create({
        organization_id: organizationId,
        title,
        type,
        category: category || undefined,
        description: description || undefined,
        file_url,
        file_name: file.name,
        status: "active"
      });

      // Also create a corresponding ControlledDocument so it appears in Document Control
      const controlledDoc = await ControlledDocumentRepo.create({
        organization_id: organizationId,
        title,
        document_type: typeToControlledType[type] || "other",
        category: category || undefined,
        description: description || undefined,
        file_url,
        file_name: file.name,
        status: "effective",
        version: "1.0",
        effective_date: new Date().toISOString().split("T")[0],
        training_document_id: trainingDoc.id,
        tags: ["from_training"]
      });

      // Link back from training doc to controlled doc
      await TrainingDocumentRepo.update(trainingDoc.id, {
        linked_controlled_document_id: controlledDoc.id
      });

      toast.success("Document uploaded and added to Document Control");
      onSuccess();
      
      // Reset form
      setTitle("");
      setType("ssop");
      setCategory("");
      setDescription("");
      setFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document: " + (error.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              required
            />
          </div>

          <div>
            <Label>Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ssop">SSOP</SelectItem>
                <SelectItem value="sds">SDS</SelectItem>
                <SelectItem value="one_point_lesson">One Point Lesson</SelectItem>
                <SelectItem value="training_material">Training Material</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Safety, Sanitation, Equipment"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
            />
          </div>

          <div>
            <Label>File *</Label>
            <div className="mt-1">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  {file ? (
                    <p className="text-sm text-slate-600">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500">Click to upload</p>
                      <p className="text-xs text-slate-400">PDF, DOC, images, etc.</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !file || !title}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}