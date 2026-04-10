// @ts-nocheck
import { useState, useRef } from "react";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2,
  XCircle, Loader2, RefreshCw, Plus, Edit, AlertCircle, FileText
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TaskRepo, TrainingDocumentRepo } from "@/lib/adapters/database";

const CSV_TEMPLATE_HEADERS = [
  "task_name",
  "area",
  "category",
  "frequency",
  "priority",
  "estimated_minutes",
  "zone_type",
  "required_training_id",
  "required_training_title",
  "description",
  "notes"
];

const FREQUENCY_OPTIONS = ["daily", "weekly", "bi-weekly", "biweekly", "monthly", "bimonthly", "quarterly", "annually"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];
const ZONE_OPTIONS = ["raw", "rte", "allergen", "general", "drain", "food_contact", "non_food_contact"];

export default function BulkTaskImportModal({ 
  open, 
  onOpenChange, 
  organizationId,
  existingTasks = [],
  onImportComplete 
}) {
  const [step, setStep] = useState("upload"); // upload, preview, importing, complete
  const [csvData, setCsvData] = useState([]);
  const [parsedTasks, setParsedTasks] = useState({ toCreate: [], toUpdate: [], errors: [], duplicates: [] });
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importLog, setImportLog] = useState(null);
  const fileInputRef = useRef(null);

  const { data: trainingDocs = [] } = useQuery({
    queryKey: ["training_docs_for_import", organizationId],
    queryFn: () => TrainingDocumentRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId && open
  });

  const resetState = () => {
    setStep("upload");
    setCsvData([]);
    setParsedTasks({ toCreate: [], toUpdate: [], errors: [], duplicates: [] });
    setImportProgress({ current: 0, total: 0 });
    setImportLog(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headerRow = CSV_TEMPLATE_HEADERS.join(",");
    const exampleRows = [
      "Floor Cleaning,Production Line 1,MSS,daily,medium,30,general,,,,Clean floor with approved sanitizer",
      "Ceiling Vent Wipe,RTE Zone A,PIC,monthly,high,45,rte,,,,Deep clean overhead vents in zone",
      "Conveyor Belt Deep Clean,Allergen Line,PEC,quarterly,critical,60,allergen,,,,Disassemble and deep clean conveyor",
      "Fire Extinguisher Inspection,Warehouse,FIRE,monthly,high,15,general,,,,Inspect and log fire extinguisher status",
      "Post-Maintenance Cleanup,Line 3,ONE_OFF,daily,medium,20,general,,,,One-time clean after maintenance work"
    ];
    const csvContent = [headerRow, ...exampleRows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `task_import_template_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Template downloaded");
  };

  // Export existing tasks to CSV
  const exportCurrentTasks = () => {
    const headerRow = CSV_TEMPLATE_HEADERS.join(",");
    const dataRows = existingTasks
      .filter(t => !t.is_group)
      .map(t => [
        `"${(t.title || "").replace(/"/g, '""')}"`,
        `"${(t.area || "").replace(/"/g, '""')}"`,
        `"${(t.category || "").replace(/"/g, '""')}"`,
        t.frequency || "",
        t.priority || "medium",
        t.duration || "",
        t.zone_type || "general",
        t.required_training_id || "",
        `"${(t.required_training_title || "").replace(/"/g, '""')}"`,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        `"${(t.completion_notes || "").replace(/"/g, '""')}"`
      ].join(","));
    
    const csvContent = [headerRow, ...dataRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tasks_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success(`Exported ${dataRows.length} tasks`);
  };

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = "";
      let inQuotes = false;

      for (let char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      data.push({ ...row, _rowNumber: i + 1 });
    }

    return data;
  };

  // Validate and categorize tasks
  const validateTasks = (data) => {
    const toCreate = [];
    const toUpdate = [];
    const errors = [];
    const duplicates = [];

    data.forEach((row, idx) => {
      const rowErrors = [];
      const taskName = row.task_name || row.name || row.title || "";
      const area = row.area || row.line || row.zone || "";

      // Required field validation
      if (!taskName.trim()) {
        rowErrors.push("Task name is required");
      }
      if (!area.trim()) {
        rowErrors.push("Area/Line is required");
      }

      // Frequency validation
      const frequency = (row.frequency || "daily").toLowerCase().trim();
      if (frequency && !FREQUENCY_OPTIONS.includes(frequency)) {
        rowErrors.push(`Invalid frequency: "${frequency}". Use: ${FREQUENCY_OPTIONS.join(", ")}`);
      }

      // Priority validation
      const priority = (row.priority || "medium").toLowerCase().trim();
      if (priority && !PRIORITY_OPTIONS.includes(priority)) {
        rowErrors.push(`Invalid priority: "${priority}". Use: ${PRIORITY_OPTIONS.join(", ")}`);
      }

      // Training doc validation
      let trainingId = row.required_training_id || "";
      let trainingTitle = row.required_training_title || "";
      if (trainingId && trainingDocs.length > 0) {
        const doc = trainingDocs.find(d => d.id === trainingId || d.title.toLowerCase() === trainingId.toLowerCase());
        if (!doc) {
          rowErrors.push(`Training document not found: "${trainingId}"`);
        } else {
          trainingId = doc.id;
          trainingTitle = doc.title;
        }
      }

      const taskData = {
        title: taskName.trim(),
        area: area.trim(),
        category: (row.category || "").trim(),
        frequency: frequency || "daily",
        priority: priority || "medium",
        duration: parseInt(row.estimated_minutes) || null,
        zone_type: (row.zone_type || "general").toLowerCase(),
        required_training_id: trainingId || null,
        required_training_title: trainingTitle || null,
        description: (row.description || "").trim(),
        completion_notes: (row.notes || "").trim(),
        organization_id: organizationId,
        status: "pending",
        is_recurring: true,
        _rowNumber: row._rowNumber
      };

      if (rowErrors.length > 0) {
        errors.push({ ...taskData, _errors: rowErrors });
        return;
      }

      // Check for existing task (match by title + area)
      const existingTask = existingTasks.find(t => 
        t.title?.toLowerCase() === taskData.title.toLowerCase() &&
        t.area?.toLowerCase() === taskData.area.toLowerCase()
      );

      if (existingTask) {
        // Check if it's a duplicate in the import file itself
        const alreadyInUpdate = toUpdate.find(t => 
          t.title.toLowerCase() === taskData.title.toLowerCase() &&
          t.area.toLowerCase() === taskData.area.toLowerCase()
        );
        
        if (alreadyInUpdate) {
          duplicates.push({ ...taskData, _existingId: existingTask.id, _duplicateOf: alreadyInUpdate._rowNumber });
        } else {
          toUpdate.push({ ...taskData, _existingId: existingTask.id, _existingTask: existingTask });
        }
      } else {
        // Check for duplicate in new tasks
        const alreadyInCreate = toCreate.find(t => 
          t.title.toLowerCase() === taskData.title.toLowerCase() &&
          t.area.toLowerCase() === taskData.area.toLowerCase()
        );
        
        if (alreadyInCreate) {
          duplicates.push({ ...taskData, _duplicateOf: alreadyInCreate._rowNumber });
        } else {
          toCreate.push(taskData);
        }
      }
    });

    return { toCreate, toUpdate, errors, duplicates };
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      const data = parseCSV(text);
      setCsvData(data);
      const validated = validateTasks(data);
      setParsedTasks(validated);
      setStep("preview");
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Perform the import
  const performImport = async () => {
    setStep("importing");
    const total = parsedTasks.toCreate.length + parsedTasks.toUpdate.length;
    setImportProgress({ current: 0, total });

    const log = {
      importedAt: new Date().toISOString(),
      totalProcessed: total,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    const BATCH_SIZE = 5;
    const DELAY_MS = 500;

    // Create new tasks
    for (let i = 0; i < parsedTasks.toCreate.length; i += BATCH_SIZE) {
      const batch = parsedTasks.toCreate.slice(i, i + BATCH_SIZE);
      
      for (const task of batch) {
        try {
          const { _rowNumber, ...taskData } = task;
          await TaskRepo.create(taskData);
          log.created++;
        } catch (err) {
          log.failed++;
          log.errors.push({ row: task._rowNumber, error: err.message });
        }
        setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }

      if (i + BATCH_SIZE < parsedTasks.toCreate.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    // Update existing tasks
    for (let i = 0; i < parsedTasks.toUpdate.length; i += BATCH_SIZE) {
      const batch = parsedTasks.toUpdate.slice(i, i + BATCH_SIZE);
      
      for (const task of batch) {
        try {
          const { _rowNumber, _existingId, _existingTask, ...taskData } = task;
          await TaskRepo.update(_existingId, taskData);
          log.updated++;
        } catch (err) {
          log.failed++;
          log.errors.push({ row: task._rowNumber, error: err.message });
        }
        setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }

      if (i + BATCH_SIZE < parsedTasks.toUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    setImportLog(log);
    setStep("complete");
    
    if (log.failed === 0) {
      toast.success(`Import complete: ${log.created} created, ${log.updated} updated`);
    } else {
      toast.warning(`Import complete with ${log.failed} errors`);
    }

    onImportComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Task Import
          </DialogTitle>
          <DialogDescription>
            Import tasks from a CSV file or export existing tasks for editing
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Step: Upload */}
          {step === "upload" && (
            <div className="space-y-6 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Upload Section */}
                <div 
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-slate-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">Upload CSV File</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Click to select a CSV file or drag and drop
                  </p>
                  <Button variant="outline" size="sm" className="rounded-full">
                    Select File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Template & Export Section */}
                <div className="space-y-4">
                  <div className="border rounded-2xl p-4">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Template
                    </h3>
                    <p className="text-sm text-slate-500 mb-3">
                      Get a blank CSV template with all supported fields
                    </p>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={downloadTemplate}>
                      <FileText className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  <div className="border rounded-2xl p-4">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Current Tasks
                    </h3>
                    <p className="text-sm text-slate-500 mb-3">
                      Export {existingTasks.filter(t => !t.is_group).length} existing tasks to CSV for editing
                    </p>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={exportCurrentTasks}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Tasks
                    </Button>
                  </div>
                </div>
              </div>

              {/* CSV Format Guide */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3">CSV Format Guide</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">Required Fields:</p>
                    <ul className="list-disc list-inside text-slate-600 mt-1 space-y-0.5">
                      <li><code className="bg-white px-1.5 py-0.5 rounded-full text-xs border">task_name</code> — Name of the task</li>
                      <li><code className="bg-white px-1.5 py-0.5 rounded-full text-xs border">area</code> — Area, line, or zone</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Optional Fields:</p>
                    <ul className="list-disc list-inside text-slate-600 mt-1 space-y-0.5">
                      <li><code className="bg-white px-1.5 py-0.5 rounded-full text-xs border">category</code> — MSS, PIC, PEC, FIRE, ONE_OFF</li>
                      <li><code className="bg-white px-1.5 py-0.5 rounded-full text-xs border">frequency</code> — daily, weekly, monthly, etc.</li>
                      <li><code className="bg-white px-1.5 py-0.5 rounded-full text-xs border">priority</code> — low, medium, high, critical</li>
                      <li><code className="bg-white px-1.5 py-0.5 rounded-full text-xs border">estimated_minutes</code> — Duration</li>
                      <li><code className="bg-white px-1.5 py-0.5 rounded-full text-xs border">zone_type</code> — raw, rte, allergen, drain</li>
                      <li><code className="bg-white px-1.5 py-0.5 rounded-full text-xs border">description</code>, <code className="bg-white px-1.5 py-0.5 rounded-full text-xs border">notes</code></li>
                    </ul>
                  </div>
                </div>

                {/* Category reference */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <p className="font-medium text-slate-700 text-xs mb-2">Category Values:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">MSS — Routine Cleans</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">PIC — Infrastructure</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">PEC — Equipment Deep Clean</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">FIRE — Fire Safety</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">ONE_OFF — One-Off Tasks</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="space-y-4 py-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
                  <Plus className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">{parsedTasks.toCreate.length}</p>
                  <p className="text-xs text-emerald-600">To Create</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
                  <Edit className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{parsedTasks.toUpdate.length}</p>
                  <p className="text-xs text-blue-600">To Update</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                  <AlertCircle className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                  <p className="text-2xl font-bold text-amber-700">{parsedTasks.duplicates.length}</p>
                  <p className="text-xs text-amber-600">Duplicates</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center">
                  <XCircle className="w-5 h-5 mx-auto text-rose-600 mb-1" />
                  <p className="text-2xl font-bold text-rose-700">{parsedTasks.errors.length}</p>
                  <p className="text-xs text-rose-600">Errors</p>
                </div>
              </div>

              {/* Preview Tables */}
              <Tabs defaultValue="create" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="create">
                    New Tasks ({parsedTasks.toCreate.length})
                  </TabsTrigger>
                  <TabsTrigger value="update">
                    Updates ({parsedTasks.toUpdate.length})
                  </TabsTrigger>
                  {parsedTasks.duplicates.length > 0 && (
                    <TabsTrigger value="duplicates">
                      Duplicates ({parsedTasks.duplicates.length})
                    </TabsTrigger>
                  )}
                  {parsedTasks.errors.length > 0 && (
                    <TabsTrigger value="errors">
                      Errors ({parsedTasks.errors.length})
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="create" className="mt-4">
                  <div className="border rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Row</TableHead>
                          <TableHead>Task Name</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Priority</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedTasks.toCreate.map((task, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-slate-500">{task._rowNumber}</TableCell>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>{task.area}</TableCell>
                            <TableCell>
                              <Badge className={cn("text-[10px]",
                                task.category === "MSS" ? "bg-blue-100 text-blue-800" :
                                task.category === "PIC" ? "bg-amber-100 text-amber-800" :
                                task.category === "PEC" ? "bg-purple-100 text-purple-800" :
                                task.category === "FIRE" ? "bg-red-100 text-red-800" :
                                task.category === "ONE_OFF" ? "bg-slate-100 text-slate-800" :
                                "bg-slate-100 text-slate-600"
                              )}>
                                {task.category || "auto"}
                              </Badge>
                            </TableCell>
                            <TableCell><Badge variant="outline">{task.frequency}</Badge></TableCell>
                            <TableCell>
                              <Badge className={
                                task.priority === "critical" ? "bg-rose-100 text-rose-700" :
                                task.priority === "high" ? "bg-orange-100 text-orange-700" :
                                task.priority === "medium" ? "bg-amber-100 text-amber-700" :
                                "bg-slate-100 text-slate-700"
                              }>
                                {task.priority}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {parsedTasks.toCreate.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                              No new tasks to create
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="update" className="mt-4">
                  <div className="border rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Row</TableHead>
                          <TableHead>Task Name</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedTasks.toUpdate.map((task, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-slate-500">{task._rowNumber}</TableCell>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>{task.area}</TableCell>
                            <TableCell>
                              <Badge className={cn("text-[10px]",
                                task.category === "MSS" ? "bg-blue-100 text-blue-800" :
                                task.category === "PIC" ? "bg-amber-100 text-amber-800" :
                                task.category === "PEC" ? "bg-purple-100 text-purple-800" :
                                task.category === "FIRE" ? "bg-red-100 text-red-800" :
                                task.category === "ONE_OFF" ? "bg-slate-100 text-slate-800" :
                                "bg-slate-100 text-slate-600"
                              )}>
                                {task.category || "auto"}
                              </Badge>
                            </TableCell>
                            <TableCell><Badge variant="outline">{task.frequency}</Badge></TableCell>
                            <TableCell>
                              <Badge className={
                                task.priority === "critical" ? "bg-rose-100 text-rose-700" :
                                task.priority === "high" ? "bg-orange-100 text-orange-700" :
                                "bg-amber-100 text-amber-700"
                              }>
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-700">Will Update</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {parsedTasks.toUpdate.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                              No existing tasks to update
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="duplicates" className="mt-4">
                  <div className="border rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Row</TableHead>
                          <TableHead>Task Name</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Duplicate Of</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedTasks.duplicates.map((task, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-slate-500">{task._rowNumber}</TableCell>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>{task.area}</TableCell>
                            <TableCell>
                              <Badge variant="outline">Row {task._duplicateOf}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-amber-600 mt-2">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Duplicate rows will be skipped during import
                  </p>
                </TabsContent>

                <TabsContent value="errors" className="mt-4">
                  <div className="border border-rose-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-rose-50">
                          <TableHead className="w-12">Row</TableHead>
                          <TableHead>Task Name</TableHead>
                          <TableHead>Errors</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedTasks.errors.map((task, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-slate-500">{task._rowNumber}</TableCell>
                            <TableCell className="font-medium">{task.title || "(empty)"}</TableCell>
                            <TableCell>
                              <ul className="list-disc list-inside text-sm text-rose-600">
                                {task._errors.map((err, eidx) => (
                                  <li key={eidx}>{err}</li>
                                ))}
                              </ul>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-rose-600 mt-2">
                    <XCircle className="w-4 h-4 inline mr-1" />
                    Rows with errors will be skipped during import
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto text-slate-400 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Importing Tasks...</h3>
              <p className="text-slate-500 mb-4">
                {importProgress.current} of {importProgress.total} tasks processed
              </p>
              <Progress 
                value={(importProgress.current / importProgress.total) * 100} 
                className="w-64 mx-auto"
              />
              <p className="text-sm text-slate-400 mt-4">Please don't close this window</p>
            </div>
          )}

          {/* Step: Complete */}
          {step === "complete" && importLog && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                {importLog.failed === 0 ? (
                  <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
                ) : (
                  <AlertTriangle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
                )}
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Import {importLog.failed === 0 ? "Complete" : "Completed with Errors"}
                </h3>
                <p className="text-slate-500">
                  {format(new Date(importLog.importedAt), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{importLog.created}</p>
                  <p className="text-sm text-emerald-600">Created</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{importLog.updated}</p>
                  <p className="text-sm text-blue-600">Updated</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-rose-700">{importLog.failed}</p>
                  <p className="text-sm text-rose-600">Failed</p>
                </div>
              </div>

              {importLog.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="font-medium text-rose-900 mb-2">Failed Rows</h4>
                  <ul className="text-sm text-rose-700 space-y-1">
                    {importLog.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>Row {err.row}: {err.error}</li>
                    ))}
                    {importLog.errors.length > 5 && (
                      <li className="text-rose-500">...and {importLog.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Upload Different File
              </Button>
              <Button 
                onClick={performImport}
                disabled={parsedTasks.toCreate.length === 0 && parsedTasks.toUpdate.length === 0}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm Import ({parsedTasks.toCreate.length + parsedTasks.toUpdate.length} tasks)
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button onClick={handleClose} className="bg-slate-900 hover:bg-slate-800">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}