import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileUp, PenLine } from "lucide-react";
import { uploadFile } from "@/lib/adapters/storage";
import { addYears, format } from "date-fns";
import { toast } from "sonner";
import SDSDocumentExtractor from "./SDSDocumentExtractor";
import DilutionRatioSection from "./DilutionRatioSection";

const HAZARD_CLASSES = [
  "Flammable", "Oxidizer", "Corrosive", "Toxic", "Irritant", 
  "Health Hazard", "Environmental Hazard", "Compressed Gas", "Explosive"
];

const PPE_OPTIONS = [
  "Safety Glasses", "Face Shield", "Chemical Goggles", "Nitrile Gloves", 
  "Chemical Gloves", "Lab Coat", "Chemical Apron", "Respirator", "Full Face Respirator"
];

export default function SDSFormModal({ open, onOpenChange, sds, chemicals, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    chemical_id: "",
    chemical_name: "",
    manufacturer: "",
    product_code: "",
    cas_number: "",
    ghs_hazard_classes: [],
    signal_word: "none",
    file_url: "",
    revision_date: "",
    expiry_date: "",
    version: "",
    language: "en",
    storage_location: "",
    emergency_contact: "",
    first_aid_summary: "",
    ppe_required: [],
    status: "active",
    notes: "",
    dilution_food_contact: "",
    dilution_food_contact_ppm: "",
    dilution_non_food_contact: "",
    dilution_non_food_contact_ppm: "",
    dilution_heavy_duty: "",
    dilution_notes: ""
  });
  const [uploading, setUploading] = useState(false);
  // "choose" = pick upload vs manual, "upload" = extractor view, "form" = manual form
  const [mode, setMode] = useState("choose");

  useEffect(() => {
    if (sds) {
      setMode("form"); // editing always goes straight to form
      setFormData({
        chemical_id: sds.chemical_id || "",
        chemical_name: sds.chemical_name || "",
        manufacturer: sds.manufacturer || "",
        product_code: sds.product_code || "",
        cas_number: sds.cas_number || "",
        ghs_hazard_classes: sds.ghs_hazard_classes || [],
        signal_word: sds.signal_word || "none",
        file_url: sds.file_url || "",
        revision_date: sds.revision_date || "",
        expiry_date: sds.expiry_date || "",
        version: sds.version || "",
        language: sds.language || "en",
        storage_location: sds.storage_location || "",
        emergency_contact: sds.emergency_contact || "",
        first_aid_summary: sds.first_aid_summary || "",
        ppe_required: sds.ppe_required || [],
        status: sds.status || "active",
        notes: sds.notes || "",
        dilution_food_contact: sds.dilution_food_contact || "",
        dilution_food_contact_ppm: sds.dilution_food_contact_ppm || "",
        dilution_non_food_contact: sds.dilution_non_food_contact || "",
        dilution_non_food_contact_ppm: sds.dilution_non_food_contact_ppm || "",
        dilution_heavy_duty: sds.dilution_heavy_duty || "",
        dilution_notes: sds.dilution_notes || ""
      });
    } else {
      setFormData({
        chemical_id: "",
        chemical_name: "",
        manufacturer: "",
        product_code: "",
        cas_number: "",
        ghs_hazard_classes: [],
        signal_word: "none",
        file_url: "",
        revision_date: format(new Date(), "yyyy-MM-dd"),
        expiry_date: format(addYears(new Date(), 3), "yyyy-MM-dd"),
        version: "1.0",
        language: "en",
        storage_location: "",
        emergency_contact: "",
        first_aid_summary: "",
        ppe_required: [],
        status: "active",
        notes: "",
        dilution_food_contact: "",
        dilution_food_contact_ppm: "",
        dilution_non_food_contact: "",
        dilution_non_food_contact_ppm: "",
        dilution_heavy_duty: "",
        dilution_notes: ""
      });
      setMode("choose");
    }
  }, [sds, open]);

  const handleExtracted = (extractedData) => {
    setFormData(prev => ({
      ...prev,
      chemical_name: extractedData.chemical_name || prev.chemical_name,
      manufacturer: extractedData.manufacturer || prev.manufacturer,
      product_code: extractedData.product_code || prev.product_code,
      cas_number: extractedData.cas_number || prev.cas_number,
      ghs_hazard_classes: extractedData.ghs_hazard_classes?.length > 0 ? extractedData.ghs_hazard_classes : prev.ghs_hazard_classes,
      signal_word: extractedData.signal_word || prev.signal_word,
      file_url: extractedData.file_url || prev.file_url,
      revision_date: extractedData.revision_date || prev.revision_date,
      expiry_date: extractedData.revision_date 
        ? format(addYears(new Date(extractedData.revision_date), 3), "yyyy-MM-dd")
        : prev.expiry_date,
      version: extractedData.version || prev.version,
      ppe_required: extractedData.ppe_required?.length > 0 ? extractedData.ppe_required : prev.ppe_required,
      storage_location: extractedData.storage_location || prev.storage_location,
      emergency_contact: extractedData.emergency_contact || prev.emergency_contact,
      first_aid_summary: extractedData.first_aid_summary || prev.first_aid_summary,
      notes: extractedData.notes || prev.notes,
      dilution_food_contact: extractedData.dilution_food_contact || prev.dilution_food_contact,
      dilution_food_contact_ppm: extractedData.dilution_food_contact_ppm || prev.dilution_food_contact_ppm,
      dilution_non_food_contact: extractedData.dilution_non_food_contact || prev.dilution_non_food_contact,
      dilution_non_food_contact_ppm: extractedData.dilution_non_food_contact_ppm || prev.dilution_non_food_contact_ppm,
      dilution_heavy_duty: extractedData.dilution_heavy_duty || prev.dilution_heavy_duty,
      dilution_notes: extractedData.dilution_notes || prev.dilution_notes
    }));
    setMode("form");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      setFormData(prev => ({ ...prev, file_url }));
      toast.success("SDS uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleChemicalSelect = (chemicalId) => {
    const chemical = chemicals.find(c => c.id === chemicalId);
    if (chemical) {
      setFormData(prev => ({
        ...prev,
        chemical_id: chemicalId,
        chemical_name: chemical.name,
        file_url: chemical.sds_url || prev.file_url
      }));
    }
  };

  const toggleHazardClass = (hazard) => {
    setFormData(prev => ({
      ...prev,
      ghs_hazard_classes: prev.ghs_hazard_classes.includes(hazard)
        ? prev.ghs_hazard_classes.filter(h => h !== hazard)
        : [...prev.ghs_hazard_classes, hazard]
    }));
  };

  const togglePPE = (ppe) => {
    setFormData(prev => ({
      ...prev,
      ppe_required: prev.ppe_required.includes(ppe)
        ? prev.ppe_required.filter(p => p !== ppe)
        : [...prev.ppe_required, ppe]
    }));
  };

  const handleRevisionDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      revision_date: date,
      expiry_date: date ? format(addYears(new Date(date), 3), "yyyy-MM-dd") : prev.expiry_date
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sds?.id ? "Edit SDS Document" : "Add SDS Document"}</DialogTitle>
        </DialogHeader>

        {/* Step 1: Choose method (only for new documents) */}
        {mode === "choose" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">How would you like to add this SDS?</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode("upload")}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all text-center"
              >
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Upload Documents</p>
                  <p className="text-xs text-slate-500 mt-1">Upload SDS, Letters of Guarantee, Spec Sheets — info is extracted automatically</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("form")}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all text-center"
              >
                <div className="p-3 bg-slate-200 rounded-full">
                  <PenLine className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Enter Manually</p>
                  <p className="text-xs text-slate-500 mt-1">Fill out all the fields yourself</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Upload + Extract */}
        {mode === "upload" && (
          <SDSDocumentExtractor
            onExtracted={handleExtracted}
            onCancel={() => setMode("choose")}
          />
        )}

        {/* Step 3: Manual form (pre-filled if extracted) */}
        {mode === "form" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Back to upload option for new documents */}
          {!sds?.id && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode("choose")} className="text-xs text-slate-500">
              ← Back to options
            </Button>
          )}

          {/* Link to existing chemical */}
          {chemicals.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Chemical (Optional)</Label>
              <Select value={formData.chemical_id || "__none__"} onValueChange={(v) => handleChemicalSelect(v === "__none__" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select existing chemical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {chemicals.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chemical/Product Name *</Label>
              <Input
                value={formData.chemical_name}
                onChange={(e) => setFormData(prev => ({ ...prev, chemical_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Manufacturer/Supplier *</Label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Product Code</Label>
              <Input
                value={formData.product_code}
                onChange={(e) => setFormData(prev => ({ ...prev, product_code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>CAS Number</Label>
              <Input
                value={formData.cas_number}
                onChange={(e) => setFormData(prev => ({ ...prev, cas_number: e.target.value }))}
                placeholder="e.g., 7732-18-5"
              />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>SDS Document (PDF)</Label>
            <div className="flex gap-2">
              <Input
                value={formData.file_url}
                onChange={(e) => setFormData(prev => ({ ...prev, file_url: e.target.value }))}
                placeholder="URL or upload PDF"
                className="flex-1"
              />
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <label className="cursor-pointer">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                </label>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Revision Date</Label>
              <Input
                type="date"
                value={formData.revision_date}
                onChange={(e) => handleRevisionDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Signal Word</Label>
              <Select value={formData.signal_word} onValueChange={(v) => setFormData(prev => ({ ...prev, signal_word: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="danger">Danger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* GHS Hazard Classes */}
          <div className="space-y-2">
            <Label>GHS Hazard Classifications</Label>
            <div className="flex flex-wrap gap-2">
              {HAZARD_CLASSES.map(hazard => (
                <Badge
                  key={hazard}
                  variant={formData.ghs_hazard_classes.includes(hazard) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleHazardClass(hazard)}
                >
                  {hazard}
                </Badge>
              ))}
            </div>
          </div>

          {/* PPE Required */}
          <div className="space-y-2">
            <Label>PPE Required</Label>
            <div className="flex flex-wrap gap-2">
              {PPE_OPTIONS.map(ppe => (
                <Badge
                  key={ppe}
                  variant={formData.ppe_required.includes(ppe) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => togglePPE(ppe)}
                >
                  {ppe}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input
                value={formData.storage_location}
                onChange={(e) => setFormData(prev => ({ ...prev, storage_location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact</Label>
              <Input
                value={formData.emergency_contact}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>First Aid Summary</Label>
            <Textarea
              value={formData.first_aid_summary}
              onChange={(e) => setFormData(prev => ({ ...prev, first_aid_summary: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Dilution Ratios */}
          <DilutionRatioSection formData={formData} setFormData={setFormData} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={formData.language} onValueChange={(v) => setFormData(prev => ({ ...prev, language: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {sds?.id ? "Update" : "Create"} SDS
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}