import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Trash2, Loader2, Download, 
  ZoomIn, X, Camera
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CAPACommentRepo,
  CAPARepo
} from "@/lib/adapters/database";

export default function CAPAEvidenceUploader({ capa, organization, user, onUpdate }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const attachments = capa?.attachments || [];

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      const newAttachments = [...attachments];
      
      for (const file of files) {
        const { file_url } = await uploadFile({ file });
        
        newAttachments.push({
          url: file_url,
          name: file.name,
          type: file.type.startsWith("image/") ? "image" : "document",
          uploaded_at: new Date().toISOString(),
          uploaded_by: user?.full_name || user?.email
        });
      }

      await CAPARepo.update(capa.id, {
        attachments: newAttachments
      });

      // Add comment
      await CAPACommentRepo.create({
        organization_id: organization.id,
        capa_id: capa.id,
        author_email: user?.email,
        author_name: user?.full_name,
        content: `Added ${files.length} evidence file(s): ${files.map(f => f.name).join(", ")}`,
        comment: `Added ${files.length} evidence file(s): ${files.map(f => f.name).join(", ")}`,
        comment_type: "evidence_added"
      });

      toast.success(`${files.length} file(s) uploaded`);
      onUpdate?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file(s)");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = async (index) => {
    try {
      const removed = attachments[index];
      const newAttachments = attachments.filter((_, i) => i !== index);
      
      await CAPARepo.update(capa.id, {
        attachments: newAttachments
      });

      await CAPACommentRepo.create({
        organization_id: organization.id,
        capa_id: capa.id,
        author_email: user?.email,
        author_name: user?.full_name,
        content: `Removed evidence file: ${removed.name}`,
        comment: `Removed evidence file: ${removed.name}`,
        comment_type: "system"
      });

      toast.success("File removed");
      onUpdate?.();
    } catch (error) {
      toast.error("Failed to remove file");
    }
  };

  const isImage = (attachment) => {
    return attachment.type === "image" || 
           attachment.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
           attachment.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center py-8 cursor-pointer rounded-lg transition-colors",
              isUploading ? "bg-slate-100" : "hover:bg-slate-50"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
                <p className="text-sm text-slate-600">Uploading...</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Click to upload photos or documents
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports images, PDFs, and Word documents
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attachments Grid */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Evidence Files ({attachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {attachments.map((attachment, index) => (
                <div 
                  key={index}
                  className="group relative border rounded-lg overflow-hidden bg-slate-50"
                >
                  {isImage(attachment) ? (
                    <div 
                      className="aspect-square cursor-pointer"
                      onClick={() => setPreviewImage(attachment.url)}
                    >
                      <img 
                        src={attachment.url} 
                        alt={attachment.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square flex flex-col items-center justify-center p-4">
                      <FileText className="w-12 h-12 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-600 text-center truncate w-full">
                        {attachment.name}
                      </p>
                    </div>
                  )}
                  
                  {/* Actions overlay */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-white rounded-full shadow hover:bg-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(index);
                      }}
                      className="p-1.5 bg-white rounded-full shadow hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>

                  {/* Info footer */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white truncate">{attachment.name}</p>
                    <p className="text-xs text-white/70">
                      {attachment.uploaded_at && format(new Date(attachment.uploaded_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {attachments.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">
          No evidence files uploaded yet
        </p>
      )}

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full hover:bg-black/70"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {previewImage && (
            <img 
              src={previewImage} 
              alt="Evidence preview"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}