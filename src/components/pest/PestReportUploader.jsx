import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, FileText, Loader2, CheckCircle2, AlertTriangle, 
  Sparkles, Eye, Clock, Check, Bug, Building2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { generateUniqueCapaId } from "../capa/capaUtils";
import {
  CAPARepo,
  PestDeviceRepo,
  PestFindingRepo,
  PestLocationRepo,
  PestServiceReportRepo
} from "@/lib/adapters/database";

export default function PestReportUploader({ 
  organizationId, vendors, devices, thresholds, serviceReports, locations = [], onRefresh, user 
}) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [formData, setFormData] = useState({
    location_id: "",
    vendor_id: "",
    service_date: format(new Date(), "yyyy-MM-dd"),
    technician_name: "",
    report_number: ""
  });
  const [extractedDevices, setExtractedDevices] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [missingDevices, setMissingDevices] = useState([]);
  const [missingExplanations, setMissingExplanations] = useState({});

  // Get location-specific devices
  const locationDevices = formData.location_id 
    ? devices.filter(d => d.location_id === formData.location_id)
    : devices;

  // Auto-extract report metadata when file is selected
  const extractReportMetadata = async (file) => {
    setExtracting(true);
    try {
      const { file_url } = await uploadFile({ file });
      setUploadedFileUrl(file_url);
      
      // Build context
      const vendorList = vendors?.map(v => `${v.name} (ID: ${v.id})`).join(", ") || "";
      const locationList = locations?.map(l => `${l.name} (ID: ${l.id})`).join(", ") || "";
      const deviceList = devices?.map(d => `${d.device_code} at ${d.location_name || 'unknown'}`).join(", ") || "";

      const aiResult = await invokeLLM({
        prompt: `Extract the following information from this pest control service report:

1. Vendor/Company Name - match to one of these if possible: ${vendorList || "No vendors configured"}
2. Location/Building Name - match to one of these if possible: ${locationList || "No locations configured"}
3. Service Date (format as YYYY-MM-DD)
4. Technician/Service Tech Name
5. Report Number or Service Ticket Number
6. List ALL device codes/IDs mentioned in the report (e.g., ILT-001, RT-015, etc.)

Known devices in our system: ${deviceList || "None yet"}

Return the extracted information. For devices, list ALL device codes found in the report.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            vendor_name: { type: "string" },
            matched_vendor_id: { type: "string" },
            location_name: { type: "string" },
            matched_location_id: { type: "string" },
            service_date: { type: "string" },
            technician_name: { type: "string" },
            report_number: { type: "string" },
            devices_found: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  device_code: { type: "string" },
                  device_type: { type: "string" },
                  location_within_building: { type: "string" }
                }
              }
            }
          }
        }
      });

      console.log("AI extraction result:", aiResult);

      // Match vendor
      let matchedVendorId = "";
      if (aiResult.matched_vendor_id && vendors?.find(v => v.id === aiResult.matched_vendor_id)) {
        matchedVendorId = aiResult.matched_vendor_id;
      } else if (aiResult.vendor_name && vendors?.length > 0) {
        const matchedVendor = vendors.find(v => 
          v.name.toLowerCase().includes(aiResult.vendor_name.toLowerCase()) ||
          aiResult.vendor_name.toLowerCase().includes(v.name.toLowerCase())
        );
        if (matchedVendor) matchedVendorId = matchedVendor.id;
      }

      // Match location
      let matchedLocationId = "";
      if (aiResult.matched_location_id && locations?.find(l => l.id === aiResult.matched_location_id)) {
        matchedLocationId = aiResult.matched_location_id;
      } else if (aiResult.location_name && locations?.length > 0) {
        const matchedLocation = locations.find(l => 
          l.name.toLowerCase().includes(aiResult.location_name.toLowerCase()) ||
          aiResult.location_name.toLowerCase().includes(l.name.toLowerCase())
        );
        if (matchedLocation) matchedLocationId = matchedLocation.id;
      }
      
      // If no locations exist yet, create a default one
      if (!matchedLocationId) {
        if (locations?.length > 0) {
          matchedLocationId = locations[0].id;
        } else {
          // Auto-create a location based on AI extraction
          try {
            const locationName = aiResult.location_name || "Main Facility";
            console.log("Creating default location:", locationName);
            const newLocation = await PestLocationRepo.create({
              organization_id: organizationId,
              name: locationName,
              status: "active"
            });
            matchedLocationId = newLocation.id;
            toast.success(`Created location: ${locationName}`);
            onRefresh();
          } catch (err) {
            console.error("Failed to create location:", err);
          }
        }
      }
      
      console.log("Matched vendor:", matchedVendorId, "Matched location:", matchedLocationId);

      // Build the new form data
      const newFormData = {
        location_id: matchedLocationId || "",
        vendor_id: matchedVendorId || "",
        service_date: aiResult.service_date || format(new Date(), "yyyy-MM-dd"),
        technician_name: aiResult.technician_name || "",
        report_number: aiResult.report_number || ""
      };
      
      setFormData(newFormData);

      // Check devices and immediately save new ones to the database
      console.log("Devices found:", aiResult.devices_found);
      
      if (aiResult.devices_found?.length > 0) {
        // Fetch fresh device list from database to avoid duplicates
        let currentDevices = devices || [];
        try {
          currentDevices = await PestDeviceRepo.filter({ organization_id: organizationId });
        } catch (err) {
          console.log("Could not fetch fresh devices, using passed list");
        }
        
        const existingCodes = currentDevices.map(d => d.device_code?.toLowerCase().trim()).filter(Boolean);
        const deviceAnalysis = [];
        const location = locations?.find(l => l.id === matchedLocationId);
        
        console.log("Processing devices, location:", matchedLocationId, location?.name);
        console.log("Existing device codes:", existingCodes);
        
        for (const d of aiResult.devices_found) {
          const deviceCode = d.device_code?.trim();
          if (!deviceCode) continue;
          
          const exists = existingCodes.includes(deviceCode.toLowerCase().trim());
          console.log("Device:", deviceCode, "exists:", exists);
          
          if (!exists) {
            // Create the new device immediately - even without location
            const deviceData = {
              organization_id: organizationId,
              device_code: deviceCode,
              device_type: d.device_type || "other",
              location_description: d.location_within_building || "",
              status: "active"
            };
            
            // Add location if we have one
            if (matchedLocationId) {
              deviceData.location_id = matchedLocationId;
              deviceData.location_name = location?.name;
            }
            
            try {
              console.log("Creating device:", deviceData);
              const newDevice = await PestDeviceRepo.create(deviceData);
              console.log("Device created:", newDevice);
              deviceAnalysis.push({ ...d, device_code: deviceCode, exists: false, justCreated: true });
            } catch (err) {
              console.error("Error creating device:", err);
              deviceAnalysis.push({ ...d, device_code: deviceCode, exists: false, error: true });
            }
          } else {
            deviceAnalysis.push({
              ...d,
              device_code: deviceCode,
              exists: true,
              existingDevice: devices?.find(ed => ed.device_code?.toLowerCase() === deviceCode.toLowerCase())
            });
          }
        }
        
        setExtractedDevices(deviceAnalysis);
        
        // Refresh devices list to show newly created ones
        const newDevicesCount = deviceAnalysis.filter(d => d.justCreated).length;
        if (newDevicesCount > 0) {
          toast.success(`Created ${newDevicesCount} new devices`);
          onRefresh();
        }

        // Check for missing devices - devices we know about but weren't in the report
        const reportedCodes = deviceAnalysis.map(d => d.device_code?.toLowerCase().trim()).filter(Boolean);
        const locationDevicesForCheck = matchedLocationId 
          ? currentDevices.filter(d => d.location_id === matchedLocationId && d.status === "active")
          : currentDevices.filter(d => d.status === "active");
        
        const missing = locationDevicesForCheck.filter(d => 
          !reportedCodes.includes(d.device_code?.toLowerCase().trim())
        );
        
        if (missing.length > 0) {
          setMissingDevices(missing);
          toast.warning(`${missing.length} known device(s) not found in report`);
        } else {
          setMissingDevices([]);
        }
      } else {
        console.log("No devices found in AI result");
        // If no devices found but we have devices in system, flag all as missing
        const locationDevicesForCheck = matchedLocationId 
          ? devices.filter(d => d.location_id === matchedLocationId && d.status === "active")
          : devices.filter(d => d.status === "active");
        
        if (locationDevicesForCheck.length > 0) {
          setMissingDevices(locationDevicesForCheck);
          toast.warning(`${locationDevicesForCheck.length} known device(s) not found in report`);
        }
      }

      toast.success("Report details extracted successfully");
      return file_url;
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Could not auto-extract report details");
      return null;
    } finally {
      setExtracting(false);
    }
  };

  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    setExtractedDevices(null);
    setUploadedFileUrl(null);
    if (file) {
      await extractReportMetadata(file);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      console.log("=== UPLOAD MUTATION STARTED ===");
      console.log("Selected file:", selectedFile?.name);
      console.log("Form data:", formData);
      
      if (!selectedFile) throw new Error("No file selected");
      if (!formData.location_id) throw new Error("Please select a location");
      
      setUploading(true);
      
      // Use already uploaded file or upload again
      const file_url = uploadedFileUrl || (await uploadFile({ file: selectedFile })).file_url;
      console.log("File URL:", file_url);
      
      // Determine file type
      const fileName = selectedFile.name.toLowerCase();
      let fileType = "other";
      if (fileName.endsWith(".pdf")) fileType = "pdf";
      else if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) fileType = "image";
      else if (fileName.match(/\.(xlsx|xls|csv)$/)) fileType = "spreadsheet";

      const vendor = vendors.find(v => v.id === formData.vendor_id);
      const location = locations.find(l => l.id === formData.location_id);
      
      console.log("Creating service report...");

      // Build missing devices data with explanations
      const missingDevicesData = missingDevices.map(d => ({
        device_id: d.id,
        device_code: d.device_code,
        explanation: missingExplanations[d.id] || ""
      }));

      // Create service report
      const report = await PestServiceReportRepo.create({
        organization_id: organizationId,
        location_id: formData.location_id,
        location_name: location?.name,
        vendor_id: formData.vendor_id,
        vendor_name: vendor?.name,
        service_date: formData.service_date,
        technician_name: formData.technician_name,
        report_number: formData.report_number,
        uploaded_file_url: file_url,
        file_type: fileType,
        ai_processed: false,
        ai_processing_status: "pending",
        review_status: "pending_review",
        missing_devices: missingDevicesData,
        devices_missing_count: missingDevicesData.length
      });
      
      console.log("Service report created:", report.id);

      setUploading(false);
      setProcessing(true);

      // Refresh to get new devices
      onRefresh();

      // Process with AI to extract findings
      await processReportWithAI(report, file_url, fileType, location);

      return report;
    },
    onSuccess: () => {
      toast.success("Report uploaded and processed");
      setSelectedFile(null);
      setExtractedDevices(null);
      setUploadedFileUrl(null);
      setMissingDevices([]);
      setMissingExplanations({});
      setFormData({
        location_id: "",
        vendor_id: "",
        service_date: format(new Date(), "yyyy-MM-dd"),
        technician_name: "",
        report_number: ""
      });
      onRefresh();
    },
    onError: (error) => {
      toast.error("Failed to upload: " + error.message);
    },
    onSettled: () => {
      setUploading(false);
      setProcessing(false);
    }
  });

  const processReportWithAI = async (report, fileUrl, fileType, location) => {
    try {
      console.log("Starting AI processing for report:", report.id);
      
      await PestServiceReportRepo.update(report.id, {
        ai_processing_status: "processing"
      });

      // Get fresh devices list (including newly added ones) - don't filter by location as some may not have location set
      const currentDevices = await PestDeviceRepo.filter({ 
        organization_id: organizationId
      });
      
      console.log("Current devices for AI processing:", currentDevices.length);
      
      const deviceList = currentDevices.map(d => `${d.device_code} (${d.device_type})`).join(", ");

      const aiResult = await invokeLLM({
        prompt: `You are analyzing a pest control service report. Extract all device-level findings.

Known devices at this location: ${deviceList}

For each device mentioned in the report, extract:
- Device code/ID
- pest_species: The EXACT pest name as written in the report (e.g., "Small Fly", "Gnat", "Confused Flour Beetle", "House Mouse"). Use the specific name from the vendor report, not a generic category.
- pest_type: General category (rodents, flies, stored_product_insects, cockroaches, ants, birds, other, none)
- Count of pests found (number)
- Activity level (none, low, moderate, high, severe)
- Any condition notes about the device
- Any specific findings or notes

IMPORTANT: For pest_species, use the EXACT name from the report. For example, if the report says "Small Fly (5)", the pest_species should be "Small Fly", not "flies".

Also provide:
- A brief summary of the overall report (2-3 sentences)
- List of recommendations from the vendor
- Total devices serviced
- Any areas of concern

Return as JSON.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            total_devices_serviced: { type: "number" },
            recommendations: { type: "array", items: { type: "string" } },
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  device_code: { type: "string" },
                  pest_species: { type: "string" },
                  pest_type: { type: "string" },
                  count: { type: "number" },
                  activity_level: { type: "string" },
                  condition_notes: { type: "string" },
                  finding_notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      let totalFindings = 0;
      let thresholdExceedances = 0;
      const linkedCapaIds = [];

      console.log("AI result received:", JSON.stringify(aiResult, null, 2));
      console.log("Processing AI findings:", aiResult.findings?.length || 0, "findings");

      if (!aiResult.findings || aiResult.findings.length === 0) {
        console.log("No findings extracted from AI");
      }

      for (const finding of aiResult.findings || []) {
        console.log("Processing finding for device:", finding.device_code);
        const device = currentDevices.find(d => 
          d.device_code?.toLowerCase() === finding.device_code?.toLowerCase()
        );
        console.log("Matched device:", device?.id, device?.device_code);

        let thresholdExceeded = false;
        let exceedanceSeverity = null;
        let matchedThreshold = null;

        // Check threshold - find matching threshold for this finding
        if (device || finding.count > 0) {
          const findingPestType = (finding.pest_type || "").toLowerCase().replace(/[_-]/g, ' ').trim();
          
          console.log("Looking for threshold match - device:", finding.device_code, "pest:", findingPestType, "count:", finding.count);
          console.log("Available thresholds:", thresholds?.map(t => ({ name: t.name, pest: t.pest_type, aliases: t.pest_aliases })));
          
          matchedThreshold = thresholds?.find(t => {
            const thresholdPestType = (t.pest_type || "").toLowerCase().replace(/[_-]/g, ' ').trim();
            
            // Check if pest type matches directly OR via aliases
            let pestTypeMatches = false;
            
            // Direct match
            if (thresholdPestType === findingPestType) {
              pestTypeMatches = true;
            }
            // Partial match (e.g., "flies" in "small fly" or "fly" in "flies")
            else if (findingPestType.includes(thresholdPestType) || thresholdPestType.includes(findingPestType)) {
              pestTypeMatches = true;
            }
            // Check singular/plural (fly/flies)
            else if (findingPestType.replace(/s$/, '') === thresholdPestType.replace(/s$/, '')) {
              pestTypeMatches = true;
            }
            // Check aliases
            else if (t.pest_aliases && t.pest_aliases.length > 0) {
              pestTypeMatches = t.pest_aliases.some(alias => {
                const aliasLower = alias.toLowerCase().trim();
                return findingPestType === aliasLower ||
                  findingPestType.includes(aliasLower) || 
                  aliasLower.includes(findingPestType) ||
                  findingPestType.replace(/s$/, '') === aliasLower.replace(/s$/, '');
              });
            }
            
            if (!pestTypeMatches) {
              console.log("  Threshold", t.name, "- pest type mismatch:", thresholdPestType, "vs", findingPestType);
              return false;
            }
            
            // Check device type - normalize both sides
            if (device && t.device_type !== "all") {
              const deviceType = (device.device_type || "").toLowerCase().replace(/[^a-z]/g, '');
              const thresholdDeviceType = (t.device_type || "").toLowerCase().replace(/[^a-z]/g, '');
              
              // Check various device type matches
              const deviceTypeMatches = thresholdDeviceType === deviceType ||
                deviceType.includes(thresholdDeviceType) || 
                thresholdDeviceType.includes(deviceType) ||
                // Special cases: "insect light trap" -> "ilt", "bait station" -> "baitstation"
                (thresholdDeviceType === "ilt" && deviceType.includes("insect")) ||
                (thresholdDeviceType === "ilt" && deviceType.includes("light"));
                
              if (!deviceTypeMatches) {
                console.log("  Threshold", t.name, "- device type mismatch:", thresholdDeviceType, "vs", deviceType);
                return false;
              }
            }
            
            if (t.scope_type === "device" && device && t.scope_id !== device.id) return false;
            if (t.scope_type === "area" && device && t.scope_id !== device.area_id) return false;
            
            console.log("  Threshold", t.name, "- MATCHED!");
            return true;
          });
          
          console.log("Threshold matching result for", finding.device_code, "pest:", finding.pest_type, "count:", finding.count, "matched:", matchedThreshold?.name || "NONE");

          if (matchedThreshold && finding.count > 0) {
            const count = Number(finding.count) || 0;
            const criticalThreshold = Number(matchedThreshold.critical_threshold) || 0;
            const warningThreshold = Number(matchedThreshold.warning_threshold) || 0;
            
            console.log("Checking thresholds - count:", count, "warning:", warningThreshold, "critical:", criticalThreshold);
            
            if (criticalThreshold > 0 && count >= criticalThreshold) {
              thresholdExceeded = true;
              exceedanceSeverity = "critical";
              console.log("*** CRITICAL exceedance:", finding.device_code, count, ">=", criticalThreshold);
            } else if (warningThreshold > 0 && count >= warningThreshold) {
              thresholdExceeded = true;
              exceedanceSeverity = "warning";
              console.log("*** WARNING exceedance:", finding.device_code, count, ">=", warningThreshold);
            }
          }
        }

        const findingData = {
          organization_id: organizationId,
          location_id: report.location_id,
          location_name: location?.name,
          service_report_id: report.id,
          device_id: device?.id,
          device_code: finding.device_code,
          device_type: device?.device_type || finding.device_type || "other",
          service_date: report.service_date,
          pest_type: finding.pest_type || "other",
          pest_species: finding.pest_species || null,
          count: finding.count || 0,
          activity_level: finding.activity_level || "none",
          condition_notes: finding.condition_notes || "",
          finding_notes: finding.finding_notes || "",
          threshold_exceeded: thresholdExceeded,
          exceedance_severity: exceedanceSeverity,
          threshold_id: matchedThreshold?.id,
          area_id: device?.area_id,
          area_name: device?.area_name,
          ai_extracted: true
        };
        
        console.log("Creating finding:", findingData);
        
        try {
          const createdFinding = await PestFindingRepo.create(findingData);
          console.log("Finding created successfully:", createdFinding);
          totalFindings++;
          if (thresholdExceeded) thresholdExceedances++;
        } catch (err) {
          console.error("Error creating finding:", err, findingData);
        }

        if (exceedanceSeverity === "critical" && matchedThreshold?.auto_create_capa) {
          try {
            const capaId = await generateUniqueCapaId(organizationId);
            const capa = await CAPARepo.create({
              organization_id: organizationId,
              capa_id: capaId,
              title: `Pest Threshold Exceeded - ${finding.device_code}`,
              problem_description: `Critical pest threshold exceeded at device ${finding.device_code} (${location?.name}). ${finding.pest_type} count: ${finding.count}. Threshold: ${matchedThreshold.critical_threshold}.`,
              source: "pest",
              source_record_id: report.id,
              source_record_type: "PestServiceReport",
              category: "Pest Control",
              severity: "high",
              status: "open",
              area_name: device?.area_name || location?.name,
            });
            linkedCapaIds.push(capa.id);
            console.log("Auto-created CAPA:", capaId, "for pest threshold exceedance");
          } catch (capaError) {
            console.error("Failed to auto-create CAPA:", capaError);
          }
        }
      }

      console.log("Updating report with totals - findings:", totalFindings, "exceedances:", thresholdExceedances);
      
      await PestServiceReportRepo.update(report.id, {
        ai_processed: true,
        ai_processing_status: "completed",
        ai_extracted_summary: aiResult.summary || "Report processed",
        total_devices_serviced: aiResult.total_devices_serviced || aiResult.findings?.length || 0,
        total_findings: totalFindings,
        threshold_exceedances: thresholdExceedances,
        recommendations: aiResult.recommendations || [],
        corrective_actions_needed: thresholdExceedances > 0,
        linked_capa_ids: linkedCapaIds
      });
      
      console.log("Report processing complete");

    } catch (error) {
      console.error("AI processing error:", error);
      toast.error("AI processing failed: " + error.message);
      try {
        await PestServiceReportRepo.update(report.id, {
          ai_processing_status: "failed"
        });
      } catch (e) {
        console.error("Failed to update report status:", e);
      }
    }
  };

  const reviewMutation = useMutation({
    mutationFn: async ({ reportId, status }) => {
      await PestServiceReportRepo.update(reportId, {
        review_status: status,
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      });
    },
    onSuccess: () => {
      toast.success("Report reviewed");
      setReviewModalOpen(false);
      setSelectedReport(null);
      setReviewNotes("");
      onRefresh();
    }
  });

  const pendingReports = serviceReports.filter(r => r.review_status === "pending_review");
  const reviewedReports = serviceReports.filter(r => r.review_status !== "pending_review");

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Service Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Location / Building *</Label>
                <Select 
                  value={formData.location_id} 
                  onValueChange={(v) => setFormData({...formData, location_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {l.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendor</Label>
                <Select 
                  value={formData.vendor_id} 
                  onValueChange={(v) => setFormData({...formData, vendor_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service Date</Label>
                <Input 
                  type="date" 
                  value={formData.service_date}
                  onChange={(e) => setFormData({...formData, service_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Technician Name</Label>
                <Input 
                  value={formData.technician_name}
                  onChange={(e) => setFormData({...formData, technician_name: e.target.value})}
                  placeholder="Service technician"
                />
              </div>
              <div>
                <Label>Report Number</Label>
                <Input 
                  value={formData.report_number}
                  onChange={(e) => setFormData({...formData, report_number: e.target.value})}
                  placeholder="Vendor report #"
                />
              </div>
            </div>

            <div>
              <Label>Report File</Label>
              <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center">
                {extracting ? (
                  <div className="space-y-2">
                    <Sparkles className="w-12 h-12 mx-auto text-purple-500 animate-pulse" />
                    <p className="font-medium text-purple-700">Extracting report details...</p>
                    <p className="text-sm text-slate-500">Reading vendor, date, technician & devices</p>
                  </div>
                ) : selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="w-12 h-12 mx-auto text-blue-500" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setExtractedDevices(null); setUploadedFileUrl(null); }}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-600">Click to upload or drag and drop</p>
                    <p className="text-sm text-slate-400">PDF, Images, Excel, CSV</p>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                    />
                  </label>
                )}
              </div>

              {/* Missing Devices Warning */}
              {missingDevices.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">
                        {missingDevices.length} device(s) not found in report
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Please provide an explanation for each missing device before uploading.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {missingDevices.map(device => (
                      <div key={device.id} className="flex items-center gap-2 bg-white p-2 rounded border border-amber-200">
                        <Bug className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="font-medium text-sm min-w-[80px]">{device.device_code}</span>
                        <input
                          type="text"
                          placeholder="Reason not serviced..."
                          value={missingExplanations[device.id] || ""}
                          onChange={(e) => setMissingExplanations(prev => ({
                            ...prev,
                            [device.id]: e.target.value
                          }))}
                          className="flex-1 text-sm px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                className="w-full mt-4"
                disabled={
                  !selectedFile || 
                  !formData.location_id || 
                  uploading || 
                  processing || 
                  extracting ||
                  (missingDevices.length > 0 && missingDevices.some(d => !missingExplanations[d.id]?.trim()))
                }
                onClick={() => uploadMutation.mutate()}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                ) : processing ? (
                  <><Sparkles className="w-4 h-4 mr-2 animate-pulse" /> Processing...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Upload & Process</>
                )}
              </Button>
              
              {missingDevices.length > 0 && missingDevices.some(d => !missingExplanations[d.id]?.trim()) && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  All missing devices require an explanation before uploading
                </p>
              )}
            </div>
          </div>

          {/* Extracted Devices Section */}
          {extractedDevices && extractedDevices.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Devices Found in Report ({extractedDevices.length})
                </h3>
                {extractedDevices.some(d => !d.exists) && (
                  <Badge className="bg-blue-100 text-blue-800">
                    {extractedDevices.filter(d => !d.exists).length} new
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {extractedDevices.map((device, i) => (
                  <div 
                    key={i}
                    className={`p-2 rounded-lg border text-sm ${
                      device.justCreated 
                        ? "bg-emerald-50 border-emerald-200" 
                        : device.exists 
                          ? "bg-slate-50 border-slate-200" 
                          : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{device.device_code}</span>
                      {device.justCreated ? (
                        <Badge className="text-xs bg-emerald-100 text-emerald-800">Added</Badge>
                      ) : device.exists ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Badge className="text-xs bg-blue-100 text-blue-800">New</Badge>
                      )}
                    </div>
                    {device.device_type && (
                      <p className="text-xs text-slate-500">{device.device_type}</p>
                    )}
                  </div>
                ))}
              </div>
              {extractedDevices.some(d => d.justCreated) && (
                <p className="text-xs text-emerald-600 mt-2">
                  ✓ New devices have been automatically added to the database.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Reviews */}
      {pendingReports.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Clock className="w-5 h-5" />
              Pending Review ({pendingReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingReports.map(report => (
                <div 
                  key={report.id} 
                  className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {report.location_name && (
                        <Badge className="bg-slate-100 text-slate-800">
                          <Building2 className="w-3 h-3 mr-1" />
                          {report.location_name}
                        </Badge>
                      )}
                      <span className="font-medium">{report.vendor_name || "Service Report"}</span>
                      <Badge variant="outline">{format(parseISO(report.service_date), "MMM d, yyyy")}</Badge>
                      {report.ai_processing_status === "completed" && (
                        <Badge className="bg-purple-100 text-purple-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Processed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {report.total_findings} findings • {report.threshold_exceedances} exceedances
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {report.uploaded_file_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={report.uploaded_file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 mr-1" /> View
                        </a>
                      </Button>
                    )}
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedReport(report);
                        setReviewModalOpen(true);
                      }}
                    >
                      <Check className="w-4 h-4 mr-1" /> Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewedReports.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No reviewed reports yet</p>
          ) : (
            <div className="space-y-3">
              {reviewedReports.slice(0, 10).map(report => (
                <div key={report.id} className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {report.location_name && (
                        <Badge variant="outline">
                          <Building2 className="w-3 h-3 mr-1" />
                          {report.location_name}
                        </Badge>
                      )}
                      <span className="font-medium">{report.vendor_name || "Service Report"}</span>
                      <Badge variant="outline">{format(parseISO(report.service_date), "MMM d, yyyy")}</Badge>
                      <Badge className="bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {report.review_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {report.total_findings} findings • {report.threshold_exceedances} exceedances
                    </p>
                  </div>
                  {report.uploaded_file_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={report.uploaded_file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Service Report</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                {selectedReport.location_name && (
                  <p><strong>Location:</strong> {selectedReport.location_name}</p>
                )}
                <p><strong>Vendor:</strong> {selectedReport.vendor_name}</p>
                <p><strong>Service Date:</strong> {format(parseISO(selectedReport.service_date), "MMM d, yyyy")}</p>
                <p><strong>Technician:</strong> {selectedReport.technician_name || "—"}</p>
                <p><strong>Report #:</strong> {selectedReport.report_number || "—"}</p>
                <p><strong>Findings:</strong> {selectedReport.total_findings}</p>
                <p><strong>Exceedances:</strong> {selectedReport.threshold_exceedances}</p>
              </div>

              {selectedReport.ai_extracted_summary && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-800 mb-1">Summary</p>
                  <p className="text-sm">{selectedReport.ai_extracted_summary}</p>
                </div>
              )}

              {selectedReport.recommendations?.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Vendor Recommendations</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedReport.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <Label>Review Notes</Label>
                <Textarea 
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this report..."
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => reviewMutation.mutate({ reportId: selectedReport.id, status: "reviewed" })}
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Reviewed
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => reviewMutation.mutate({ reportId: selectedReport.id, status: "acknowledged" })}
                  disabled={reviewMutation.isPending}
                >
                  Acknowledge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}