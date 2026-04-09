// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Upload, FileText, ChevronRight, ChevronDown, 
  Settings, Trash2, Loader2 
} from "lucide-react";
import { toast } from "sonner";
import StandardUploadModal from "./StandardUploadModal.jsx";
import SectionEditModal from "./SectionEditModal.jsx";
import { COLOR_PALETTE, STANDARD_TYPE_LABELS, getStandardColorByIndex } from "./auditColors";

export default function AuditStandardsManager({ 
  organization, standards, sections, requirements, onRefresh 
}) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedStandard, setExpandedStandard] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStandards = standards.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSectionCount = (standardId) => sections.filter(s => s.standard_id === standardId).length;
  const getRequirementCount = (standardId) => requirements.filter(r => r.standard_id === standardId).length;

  const getStandardColors = (standard) => {
    if (standard.color_index !== undefined && standard.color_index !== null) {
      return getStandardColorByIndex(standard.color_index);
    }
    // Fallback for legacy standards without color_index
    return COLOR_PALETTE[0];
  };
  const getTypeLabel = (type) => STANDARD_TYPE_LABELS[type] || "Other";

  const handleDeleteStandard = async (standard) => {
    if (!confirm(`Delete "${standard.name}" and all its sections/requirements?`)) return;
    
    try {
      // Delete requirements
      const standardReqs = requirements.filter(r => r.standard_id === standard.id);
      for (const req of standardReqs) {
        await AuditRequirementRepo.delete(req.id);
      }
      
      // Delete sections
      const standardSections = sections.filter(s => s.standard_id === standard.id);
      for (const section of standardSections) {
        await AuditSectionRepo.delete(section.id);
      }
      
      // Delete standard
      await AuditStandardRepo.delete(standard.id);
      
      toast.success("Standard deleted");
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete standard");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Input 
          placeholder="Search standards..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => setShowUploadModal(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Standard
        </Button>
      </div>

      {/* Standards List */}
      {filteredStandards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">No Standards Yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              Upload audit standards (SQF, AIB, BRC) or customer policies to get started
            </p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload First Standard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStandards.map(standard => {
            const isExpanded = expandedStandard === standard.id;
            const standardSections = sections
              .filter(s => s.standard_id === standard.id)
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

            return (
              <Card key={standard.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => setExpandedStandard(isExpanded ? null : standard.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{standard.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStandardColors(standard).badge}>
                            {getTypeLabel(standard.type)}
                          </Badge>
                          {standard.version && (
                            <span className="text-xs text-slate-500">v{standard.version}</span>
                          )}
                          <span className="text-xs text-slate-500">
                            {getSectionCount(standard.id)} sections • {getRequirementCount(standard.id)} requirements
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {standard.parsing_status === "processing" && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Processing
                        </Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteStandard(standard)}
                      >
                        <Trash2 className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    {standardSections.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No sections yet. Upload a document or add sections manually.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {standardSections.map(section => {
                          const sectionReqs = requirements.filter(r => r.section_id === section.id);
                          const colors = getStandardColors(standard);
                          
                          return (
                            <div 
                              key={section.id}
                              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border-l-4 ${colors.bgLight} ${colors.border} hover:opacity-80`}
                              onClick={() => setEditingSection(section)}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm text-slate-600">
                                    {section.section_number}
                                  </span>
                                  <span className="font-medium">{section.title}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-500">
                                    {sectionReqs.length} requirements
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {section.audit_frequency}
                                  </Badge>
                                  {section.default_auditor_name && (
                                    <span className="text-xs text-slate-500">
                                      → {section.default_auditor_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Settings className="w-4 h-4 text-slate-400" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => setEditingSection({ standard_id: standard.id, standard_name: standard.name, isNew: true })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Section
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showUploadModal && (
        <StandardUploadModal 
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          organization={organization}
          existingStandards={standards}
          onSuccess={() => {
            setShowUploadModal(false);
            onRefresh();
          }}
        />
      )}

      {editingSection && (
        <SectionEditModal 
          open={!!editingSection}
          onClose={() => setEditingSection(null)}
          section={editingSection}
          organization={organization}
          requirements={requirements.filter(r => r.section_id === editingSection.id)}
          onSuccess={() => {
            setEditingSection(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}