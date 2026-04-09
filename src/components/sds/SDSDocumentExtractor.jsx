import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/adapters/storage";
import { extractDataFromFile, invokeLLM } from "@/lib/adapters/integrations";
import { Upload, Loader2, FileText, CheckCircle2, X, Plus, FileUp } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp"
];

const DOCUMENT_LABELS = {
  sds: "Safety Data Sheet (SDS)",
  log: "Letter of Guarantee",
  catalog: "Catalog / Spec Sheet",
  other: "Other Document"
};

export default function SDSDocumentExtractor({ onExtracted, onCancel }) {
  const [files, setFiles] = useState([]); // { file, label, uploading, uploaded, url }
  const [extracting, setExtracting] = useState(false);
  const [extractionDone, setExtractionDone] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilesSelected = (e) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => 
      ACCEPTED_TYPES.includes(f.type) || f.name.endsWith('.pdf')
    );
    if (valid.length !== selected.length) {
      toast.error("Only PDF and image files are supported");
    }
    const newFiles = valid.map(f => ({
      file: f,
      label: guessLabel(f.name),
      uploading: false,
      uploaded: false,
      url: null
    }));
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const guessLabel = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes("sds") || lower.includes("safety data")) return "sds";
    if (lower.includes("log") || lower.includes("guarantee") || lower.includes("letter")) return "log";
    if (lower.includes("catalog") || lower.includes("spec") || lower.includes("technical")) return "catalog";
    return "other";
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleExtract = async () => {
    if (files.length === 0) {
      toast.error("Please add at least one document");
      return;
    }

    setExtracting(true);

    // Step 1: Upload all files
    const uploadedFiles = [];
    const updatedFiles = [...files];

    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].uploaded && updatedFiles[i].url) {
        uploadedFiles.push({ url: updatedFiles[i].url, label: updatedFiles[i].label });
        continue;
      }
      updatedFiles[i] = { ...updatedFiles[i], uploading: true };
      setFiles([...updatedFiles]);

      const { file_url } = await uploadFile(updatedFiles[i].file);
      updatedFiles[i] = { ...updatedFiles[i], uploading: false, uploaded: true, url: file_url };
      setFiles([...updatedFiles]);
      uploadedFiles.push({ url: file_url, label: updatedFiles[i].label });
    }

    // Step 2: Extract data from uploaded files
    // Use ExtractDataFromUploadedFile for PDFs (LLM file_urls only supports images)
    const extractionSchema = {
      type: "object",
      properties: {
        chemical_name: { type: "string", description: "Primary product/chemical name" },
        manufacturer: { type: "string", description: "Manufacturer or supplier name" },
        product_code: { type: "string", description: "Product code, SKU, or catalog number" },
        cas_number: { type: "string", description: "Primary CAS number" },
        ghs_hazard_classes: { 
          type: "array", items: { type: "string" },
          description: "GHS hazard classifications from: Flammable, Oxidizer, Corrosive, Toxic, Irritant, Health Hazard, Environmental Hazard, Compressed Gas, Explosive" 
        },
        signal_word: { type: "string", description: "danger, warning, or none" },
        revision_date: { type: "string", description: "Document revision date in YYYY-MM-DD format" },
        version: { type: "string", description: "Document version number" },
        ppe_required: { 
          type: "array", items: { type: "string" },
          description: "Required PPE from: Safety Glasses, Face Shield, Chemical Goggles, Nitrile Gloves, Chemical Gloves, Lab Coat, Chemical Apron, Respirator, Full Face Respirator"
        },
        storage_location: { type: "string", description: "Storage requirements/recommendations" },
        emergency_contact: { type: "string", description: "Emergency phone number" },
        first_aid_summary: { type: "string", description: "Brief first aid procedures" },
        dilution_food_contact: { type: "string", description: "Dilution ratio for food contact surfaces. IMPORTANT: Convert ANY format found into 'X oz/gal'. If given as a percentage (e.g. 0.78%), convert using: oz/gal = (percentage / 100) * 128. Example: 0.78% = 1 oz/gal; 1.56% = 2 oz/gal; 3.9% = 5 oz/gal. If given as a ratio like 1:128, convert: oz/gal = 128 / denominator. If a range is given (e.g. 0.78% - 1.56%), use the LOWER value for food contact (lighter use). Always return as 'X oz/gal' format. If the document only states one dilution range, assume the lower end is for food contact sanitizing." },
        dilution_food_contact_ppm: { type: "number", description: "PPM concentration for food contact use if mentioned (e.g. 200 ppm). If percentage given, convert: ppm = percentage * 10000. Example: 0.78% = 7800 ppm. Return 0 if not determinable." },
        dilution_non_food_contact: { type: "string", description: "Dilution ratio for non-food contact / general cleaning surfaces. IMPORTANT: Convert ANY format into 'X oz/gal'. If percentage (e.g. 1.56%), convert: oz/gal = (percentage / 100) * 128. If a range is given (e.g. 0.78% - 3.9%), use the MID-RANGE value for non-food contact general cleaning. Always return as 'X oz/gal' format." },
        dilution_non_food_contact_ppm: { type: "number", description: "PPM concentration for non-food contact use if mentioned. If percentage given, convert: ppm = percentage * 10000. Return 0 if not determinable." },
        dilution_heavy_duty: { type: "string", description: "Dilution for heavy-duty / full strength use. IMPORTANT: Convert ANY format into 'X oz/gal'. If percentage (e.g. 3.9%), convert: oz/gal = (percentage / 100) * 128. If a range is given (e.g. 0.78% - 3.9%), use the HIGHEST value for heavy duty. Always return as 'X oz/gal' format. If product is used full strength, return 'full strength'." },
        dilution_notes: { type: "string", description: "Additional dilution instructions: contact time, rinse requirements, temperature requirements, special directions. Also include the ORIGINAL percentage or ratio range from the document for reference (e.g. 'Original: 0.78% - 3.9%')." },
        notes: { type: "string", description: "Any additional important information" }
      }
    };

    // Separate image files from non-image files (PDFs)
    const imageUrls = uploadedFiles.filter(f => {
      const origFile = files.find(ff => ff.url === f.url);
      const type = origFile?.file?.type || "";
      return type.startsWith("image/");
    }).map(f => f.url);

    const pdfUrls = uploadedFiles.filter(f => {
      const origFile = files.find(ff => ff.url === f.url);
      const type = origFile?.file?.type || "";
      return !type.startsWith("image/");
    }).map(f => f.url);

    // Extract from PDFs using ExtractDataFromUploadedFile
    let pdfResults = [];
    for (const url of pdfUrls) {
      const res = await extractDataFromFile({
        file_url: url,
        json_schema: extractionSchema
      });
      if (res.status === "success" && res.output) {
        pdfResults.push(res.output);
      }
    }

    // Extract from images using InvokeLLM (supports image file_urls)
    let imageResult = null;
    if (imageUrls.length > 0) {
      imageResult = await invokeLLM({
        prompt: `You are a chemical safety document specialist. Extract all relevant Safety Data Sheet information from these uploaded document images. Return all available information. For fields you cannot find, return empty string or empty array. For revision_date use YYYY-MM-DD format. For signal_word only return "danger", "warning", or "none".

CRITICAL for dilution ratios: SDS documents may express dilutions as percentages (e.g. 0.78% - 3.9%), ratios (1:128), or oz/gal. You MUST convert ALL formats into "X oz/gal" for the dilution fields. Conversion: oz/gal = (percentage / 100) * 128. Examples: 0.78% = 1 oz/gal, 1.56% = 2 oz/gal, 3.9% = 5 oz/gal. For ranges, use the low end for food contact, mid for non-food contact, and high end for heavy duty. Include the original values in dilution_notes.`,
        file_urls: imageUrls,
        response_json_schema: extractionSchema
      });
    }

    // Merge all results — combine data from multiple sources, preferring non-empty values
    const allResults = [...pdfResults, ...(imageResult ? [imageResult] : [])];
    const result = {};
    const fields = Object.keys(extractionSchema.properties);
    for (const field of fields) {
      for (const r of allResults) {
        const val = r[field];
        if (Array.isArray(val) && val.length > 0) {
          result[field] = [...new Set([...(result[field] || []), ...val])];
        } else if (typeof val === "number" && val > 0 && !result[field]) {
          result[field] = val;
        } else if (val && typeof val === "string" && val.trim() !== "" && !result[field]) {
          result[field] = val;
        }
      }
      if (result[field] === undefined || result[field] === null) {
        const propType = extractionSchema.properties[field]?.type;
        result[field] = propType === "array" ? [] : propType === "number" ? 0 : "";
      }
    }

    setExtracting(false);
    setExtractionDone(true);

    // Find the primary SDS file URL (prefer SDS label, else first PDF)
    const sdsFile = uploadedFiles.find(f => f.label === "sds") || uploadedFiles[0];

    // Merge extracted data with file URL
    const extractedData = {
      ...result,
      file_url: sdsFile?.url || "",
      signal_word: ["danger", "warning", "none"].includes(result.signal_word) ? result.signal_word : "none"
    };

    toast.success("Document data extracted successfully!");
    onExtracted(extractedData);
  };

  return (
    <div className="space-y-4">
      <div className="text-center p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
        <FileUp className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700 mb-1">
          Upload SDS, Letters of Guarantee, Spec Sheets, etc.
        </p>
        <p className="text-xs text-slate-500 mb-3">
          PDF or image files — we'll extract all the details automatically
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={extracting}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Documents
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFilesSelected}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-white border rounded-2xl px-4 py-3">
              <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{f.file.name}</p>
                <p className="text-xs text-slate-500">{DOCUMENT_LABELS[f.label]}</p>
              </div>
              {f.uploading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              {f.uploaded && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {!extracting && (
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1 rounded-full hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={extracting}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleExtract}
          disabled={files.length === 0 || extracting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {extracting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting Info...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Extract & Fill Form
            </>
          )}
        </Button>
      </div>
    </div>
  );
}