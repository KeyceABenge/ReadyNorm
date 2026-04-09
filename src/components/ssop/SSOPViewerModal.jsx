// @ts-nocheck
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, CheckCircle2, Clock, Brain, FileText } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const STATUS_CONFIG = {
  draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
  pending_review: { color: "bg-amber-100 text-amber-700", label: "Pending Review" },
  approved: { color: "bg-emerald-100 text-emerald-700", label: "Approved" },
  archived: { color: "bg-rose-100 text-rose-700", label: "Archived" }
};

export default function SSOPViewerModal({ ssop, onClose, onEdit }) {
  const statusConfig = STATUS_CONFIG[ssop.status] || STATUS_CONFIG.draft;

  const convertMarkdownToHtml = (markdown) => {
    if (!markdown) return '';
    
    let html = markdown;
    
    // Convert headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Convert bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convert unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    
    // Convert ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive <li> items in <ul>
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br/>');
    
    // Wrap in paragraph if needed
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
  };

  const handleDownloadWord = async () => {
    try {
      const contentHtml = convertMarkdownToHtml(ssop.content);
      
      // Build HTML content as a proper Word-compatible document
      let htmlParts = [];
      htmlParts.push('<!DOCTYPE html>');
      htmlParts.push('<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">');
      htmlParts.push('<head>');
      htmlParts.push('<meta charset="utf-8">');
      htmlParts.push('<title>' + ssop.title + '</title>');
      htmlParts.push('<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->');
      htmlParts.push('</head>');
      htmlParts.push('<body style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6;">');
      
      // Title
      htmlParts.push('<h1 style="font-size: 18pt; color: #1e293b; border-bottom: 2px solid #cccccc; padding-bottom: 10px;">' + ssop.title + '</h1>');
      
      // Metadata table
      htmlParts.push('<table style="border-collapse: collapse; width: 100%; margin: 15px 0;">');
      htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5; width: 200px;"><strong>Document Version</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + (ssop.version || 1) + '</td></tr>');
      htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5;"><strong>Status</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + statusConfig.label + '</td></tr>');
      
      if (ssop.asset_name) {
        htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5;"><strong>Equipment/Assets</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + ssop.asset_name + '</td></tr>');
      }
      if (ssop.area_name) {
        htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5;"><strong>Area</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + ssop.area_name + '</td></tr>');
      }
      
      htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5;"><strong>Cleaning Method</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + (ssop.cleaning_method || '').toUpperCase() + '</td></tr>');
      htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5;"><strong>Zone Type</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + (ssop.zone_type || '').toUpperCase() + '</td></tr>');
      htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5;"><strong>Disassembly Level</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + (ssop.disassembly_level || '').toUpperCase() + '</td></tr>');
      
      if (ssop.ppe_required && ssop.ppe_required.length > 0) {
        htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5;"><strong>PPE Required</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + ssop.ppe_required.join(', ') + '</td></tr>');
      }
      if (ssop.chemicals_used && ssop.chemicals_used.length > 0) {
        htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5;"><strong>Chemicals</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + ssop.chemicals_used.join(', ') + '</td></tr>');
      }
      if (ssop.tools_required && ssop.tools_required.length > 0) {
        htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5;"><strong>Tools Required</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + ssop.tools_required.join(', ') + '</td></tr>');
      }
      if (ssop.approved_by) {
        const approvalDate = ssop.approved_at ? format(new Date(ssop.approved_at), "MMM d, yyyy") : 'N/A';
        htmlParts.push('<tr><td style="border: 1px solid #cccccc; padding: 8px; background-color: #f5f5f5;"><strong>Approved By</strong></td><td style="border: 1px solid #cccccc; padding: 8px;">' + ssop.approved_by + ' on ' + approvalDate + '</td></tr>');
      }
      
      htmlParts.push('</table>');
      htmlParts.push('<hr style="margin: 20px 0;">');
      
      // Content
      htmlParts.push('<div style="margin-top: 20px;">');
      htmlParts.push(contentHtml);
      htmlParts.push('</div>');
      
      // Footer
      htmlParts.push('<hr style="margin: 20px 0;">');
      htmlParts.push('<p style="color: #666666; font-size: 10pt; margin-top: 30px;">');
      htmlParts.push('Document generated from Sanitation Manager SSOP System<br>');
      if (ssop.ai_generated) {
        htmlParts.push('Assisted Generation | ');
      }
      htmlParts.push('Version ' + (ssop.version || 1));
      htmlParts.push('</p>');
      
      htmlParts.push('</body>');
      htmlParts.push('</html>');
      
      const htmlContent = htmlParts.join('\n');
      
      // Create blob as HTML file that Word can open
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = ssop.title.replace(/[^a-z0-9]/gi, '_') + '_v' + (ssop.version || 1) + '.html';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("SSOP downloaded - open with Word or browser");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{ssop.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                <Badge variant="outline">Version {ssop.version || 1}</Badge>
                {ssop.ai_generated && (
                  <Badge className="bg-purple-100 text-purple-700">
                    <Brain className="w-3 h-3 mr-1" />
                    AI Generated
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 border-y text-sm">
          {ssop.asset_name && (
            <div>
              <span className="text-slate-500">Asset:</span>
              <p className="font-medium">{ssop.asset_name}</p>
            </div>
          )}
          {ssop.area_name && (
            <div>
              <span className="text-slate-500">Area:</span>
              <p className="font-medium">{ssop.area_name}</p>
            </div>
          )}
          <div>
            <span className="text-slate-500">Method:</span>
            <p className="font-medium capitalize">{ssop.cleaning_method}</p>
          </div>
          <div>
            <span className="text-slate-500">Zone:</span>
            <p className="font-medium uppercase">{ssop.zone_type}</p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex flex-wrap gap-4 py-2 text-sm">
          {ssop.ppe_required?.length > 0 && (
            <div>
              <span className="text-slate-500">PPE: </span>
              <span className="font-medium">{ssop.ppe_required.join(", ")}</span>
            </div>
          )}
          {ssop.chemicals_used?.length > 0 && (
            <div>
              <span className="text-slate-500">Chemicals: </span>
              <span className="font-medium">{ssop.chemicals_used.join(", ")}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="prose prose-sm max-w-none p-4 bg-slate-50 rounded-lg">
            <ReactMarkdown>{ssop.content}</ReactMarkdown>
          </div>
        </div>

        {/* Approval Info */}
        {ssop.status === "approved" && ssop.approved_by && (
          <div className="py-3 border-t flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 rounded">
            <CheckCircle2 className="w-4 h-4" />
            Approved by {ssop.approved_by} on {ssop.approved_at && format(new Date(ssop.approved_at), "MMM d, yyyy")}
          </div>
        )}

        {ssop.status === "pending_review" && ssop.submitted_by && (
          <div className="py-3 border-t flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 rounded">
            <Clock className="w-4 h-4" />
            Submitted for review by {ssop.submitted_by} on {ssop.submitted_at && format(new Date(ssop.submitted_at), "MMM d, yyyy")}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={handleDownloadWord}>
            <FileText className="w-4 h-4 mr-2" />
            Download Word
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}