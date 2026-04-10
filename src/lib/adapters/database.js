/**
 * DATABASE ADAPTER — Full Supabase implementation.
 * 
 * ALL entities now routed to Supabase PostgreSQL.
 * Base44 fallback has been REMOVED.
 * 
 * API contract (unchanged for all consumers):
 *   repo.list(sort, limit)
 *   repo.filter(query, sort, limit)
 *   repo.create(data)
 *   repo.update(id, data)
 *   repo.delete(id)
 *   repo.bulkCreate(records)
 *   repo.subscribe(callback)
 *   repo.schema()
 */
import { supabase } from "@/api/supabaseClient";

// ─── TABLE MAP: entities routed to Supabase ───
const TABLE_MAP = {
  // Batch 1
  Organization: "organizations",
  Employee: "employees",
  Task: "tasks",
  EmployeeSession: "employee_sessions",
  SiteSettings: "site_settings",
  // Batch 2
  Crew: "crews",
  CrewSchedule: "crew_schedules",
  RoleConfig: "role_configs",
  TaskGroup: "task_groups",
  TaskComment: "task_comments",
  // Batch 3
  Announcement: "announcements",
  EmployeeTraining: "employee_trainings",
  AuditLog: "audit_logs",
  // Batch 4 — Training subsystem
  TrainingDocument: "training_documents",
  TrainingQuiz: "training_quizzes",
  ControlledDocument: "controlled_documents",
  // Batch A — Org/Access subsystem
  OrganizationGroup: "organization_groups",
  OrgGroupMembership: "org_group_memberships",
  AccessRequest: "access_requests",
  // Batch B — Drain/Diverter/Titration subsystem
  DrainCleaningRecord: "drain_cleaning_records",
  DiverterInspection: "diverter_inspections",
  TitrationRecord: "titration_records",
  // Batch C — Session/Feedback subsystem
  EmployeeFeedback: "employee_feedback",
  // Batch D — Line Cleaning / Inspection subsystem
  LineCleaningAssignment: "line_cleaning_assignments",
  AreaSignOff: "area_sign_offs",
  PreOpInspection: "pre_op_inspections",
  PostCleanInspection: "post_clean_inspections",
  // Batch E — Infrastructure & Chemical subsystem
  DrainLocation: "drain_locations",
  DrainFacilityMap: "drain_facility_maps",
  DrainCleaningSettings: "drain_cleaning_settings",
  TitrationArea: "titration_areas",
  TitrationSettings: "titration_settings",
  RainDiverter: "rain_diverters",
  DiverterTaskSettings: "diverter_task_settings",
  ChemicalInventoryRecord: "chemical_inventory_records",
  ChemicalInventorySettings: "chemical_inventory_settings",
  // Batch F — Core Structural Entities
  ProductionLine: "production_lines",
  Area: "areas",
  Asset: "assets",
  AssetGroup: "asset_groups",
  FacilityMap: "facility_maps",
  // Batch G — Chemical & Feedback Operational Entities
  Chemical: "chemicals",
  ChemicalCountEntry: "chemical_count_entries",
  EmployeePeerFeedback: "employee_peer_feedback",
  AnonymousFeedback: "anonymous_feedback",
  SanitaryReport: "sanitary_reports",
  // Batch H — Scheduling, Documents & Performance
  EmployeeShift: "employee_shifts",
  ShiftRequest: "shift_requests",
  Badge: "badges",
  PerformanceGoal: "performance_goals",
  SDSDocument: "sds_documents",
  SSOP: "ssops",
  CompetencyRecord: "competency_records",
  CompetencyEvaluation: "competency_evaluations",
  // Batch I — Final remaining entities
  TaskTrainingGap: "task_training_gaps",
  SanitationDowntime: "sanitation_downtimes",
  CAPA: "capas",
  ChangeControl: "change_controls",
  PestFinding: "pest_findings",
  PestDevice: "pest_devices",
  PestServiceReport: "pest_service_reports",
  PestThreshold: "pest_thresholds",
  PestEscalationMarker: "pest_escalation_markers",
  EMPSample: "emp_samples",
  EMPSite: "emp_sites",
  EMPThreshold: "emp_thresholds",
  PlantException: "plant_exceptions",
  Allergen: "allergens",
  AllergenAssignment: "allergen_assignments",
  EmployeeQALog: "employee_qa_logs",
  EvaluationTemplate: "evaluation_templates",
  EvaluatorSettings: "evaluator_settings",
  TrainingRecord: "training_records",
  // Batch J — Handoff & Incident
  ShiftHandoff: "shift_handoffs",
  Incident: "incidents",
  // Additional missing entities
  CalibrationEquipment: "calibration_equipment",
  CalibrationRecord: "calibration_records",
  CCPMonitoringPoint: "ccp_monitoring_points",
  CCPRecord: "ccp_records",
  CAPAAction: "capa_actions",
  CAPASettings: "capa_settings",
  AuditFinding: "audit_findings",
  AuditPlan: "audit_plans",
  AuditRequirement: "audit_requirements",
  AuditResult: "audit_results",
  AuditSection: "audit_sections",
  AuditStandard: "audit_standards",
  ChemicalLocationAssignment: "chemical_location_assignments",
  ChemicalStorageLocation: "chemical_storage_locations",
  ComplaintSettings: "complaint_settings",
  CustomerComplaint: "customer_complaints",
  FSPSettings: "fsp_settings",
  FoodSafetyPlan: "food_safety_plans",
  ForeignMaterialIncident: "foreign_material_incidents",
  GlassBreakageIncident: "glass_breakage_incidents",
  GlassBrittleItem: "glass_brittle_items",
  HazardAnalysis: "hazard_analyses",
  Helper: "helpers",
  HoldRelease: "hold_releases",
  IssueSettings: "issue_settings",
  Issue: "issues",
  PreventiveControl: "preventive_controls",
  ProcessStep: "process_steps",
  ReceivingInspection: "receiving_inspections",
  RiskEntry: "risk_entries",
  SOC2Control: "soc2_controls",
  SOC2Evidence: "soc2_evidence",
  SOC2Policy: "soc2_policies",
  SOC2Risk: "soc2_risks",
  SOC2Vendor: "soc2_vendors",
  ScheduledAudit: "scheduled_audits",
  VisitorLog: "visitor_logs",
  // Supplier management
  Supplier: "supplier_records",
  SupplierContact: "supplier_contacts",
  SupplierMaterial: "supplier_materials",
  SupplierNonconformance: "supplier_nonconformances",
  SupplierSettings: "supplier_settings",
  // Employee scheduling & groups
  EmployeeGroup: "employee_groups",
  EmployeeBadge: "employee_badges",
  EmployeeQuota: "employee_quotas",
  SchedulingRequest: "scheduling_requests",
  // Pest & chemical
  PestControlRecord: "pest_control_records",
  ChemicalProduct: "chemical_products",
  ChemicalLocation: "chemical_locations",
  // Diverter
  DiverterSettings: "diverter_settings",
  // Label verification
  LabelVerification: "label_verifications",
  // CAPA comments
  CAPAComment: "capa_comments",
  // Document control
  DocumentChangeRequest: "document_change_requests",
  DocumentControlSettings: "document_control_settings",
  DocumentVersion: "document_versions",
  DocumentAcknowledgment: "document_acknowledgments",
  // Handoff settings
  HandoffSettings: "handoff_settings",
  // Pest extras
  PestLocation: "pest_locations",
  PestVendor: "pest_vendors",
  // Recall
  RecallEvent: "recall_events",
  // Risk/Management review
  ManagementReview: "management_reviews",
  RiskSettings: "risk_settings",
  // Training extras
  TrainingMatrix: "training_matrices",
  TrainingCompetencySettings: "training_competency_settings",
  // SOC2
  SOC2Evidence: "soc2_evidence",
  SOC2EvidencePackage: "soc2_evidence_packages",
  SOC2Policy: "soc2_policies",
  SOC2Risk: "soc2_risks",
  SOC2Vendor: "soc2_vendors",
  SOC2Control: "soc2_controls",
  // Compliance
  ComplianceFramework: "compliance_frameworks",
  ComplianceRequirement: "compliance_requirements",
  ComplianceEvidence: "compliance_evidence",
  // Water testing
  WaterTest: "water_tests",
  // User dashboard layout preferences
  UserDashboardConfig: "user_dashboard_configs",
};

// Parse Base44-style sort: "-created_date" → { column: "created_date", ascending: false }
function parseSort(sort) {
  if (!sort) return null;
  const desc = sort.startsWith("-");
  const column = desc ? sort.slice(1) : sort;
  return { column, ascending: !desc };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(val) { return typeof val === 'string' && UUID_RE.test(val); }

// Apply Base44-style filter object to a Supabase query
function applyFilters(query, filters) {
  if (!filters) return query;
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    // Guard: skip ONLY if a value LOOKS like a malformed UUID (has dashes, 32+ chars,
    // but fails the UUID regex). This prevents 22P02 errors on UUID columns while
    // still allowing valid TEXT primary keys (24-char hex Base44 ObjectIds).
    // Note: the filter() method already returns [] on 22P02 as a safety net.
    if ((key === 'id' || key.endsWith('_id')) &&
        typeof value === 'string' &&
        value.includes('-') &&
        value.length >= 32 &&
        !isValidUuid(value)) {
      console.warn(`[DB] Skipping malformed UUID filter ${key}=${value}`);
      continue;
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      for (const [op, val] of Object.entries(value)) {
        switch (op) {
          case "$gte": query = query.gte(key, val); break;
          case "$gt":  query = query.gt(key, val); break;
          case "$lte": query = query.lte(key, val); break;
          case "$lt":  query = query.lt(key, val); break;
          case "$ne":  query = query.neq(key, val); break;
          case "$in":  query = query.in(key, val); break;
          default:     query = query.eq(key, val);
        }
      }
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

function logDbError(tableName, operation, error, context) {
  // Log the full PostgREST error for diagnosis
  console.error(
    `[DB] ${tableName}.${operation} error — ` +
    `HTTP ${error.status ?? '?'} | code: ${error.code} | ${error.message}` +
    (error.details ? ` | details: ${error.details}` : '') +
    (error.hint ? ` | hint: ${error.hint}` : '') +
    (context ? ` | filters: ${JSON.stringify(context)}` : '')
  );
}

// Extract the column name from a Postgres/PostgREST unknown-column error message.
// Handles two formats:
//   Postgres 42703:  column "hire_date" of relation "employees" does not exist
//   PostgREST PGRST204: Could not find the 'birthday' column of 'employees' in the schema cache
function extractBadColumn(message) {
  if (!message) return null;
  // PostgREST format (PGRST204): find the 'colname' column
  let m = message.match(/find the '([^']+)' column/);
  if (m) return m[1];
  // Postgres format (42703): column "colname" of relation
  m = message.match(/column "([^"]+)"/);
  if (m) return m[1];
  return null;
}

// Convert empty strings to null so Postgres typed columns (timestamp, uuid, etc.)
// don't get "invalid input syntax" errors from forms that leave optional fields blank.
function sanitizePayload(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v === '' ? null : v;
  }
  return out;
}

function createSupabaseRepository(tableName) {
  return {
    list: async (sort, limit) => {
      let q = supabase.from(tableName).select("*");
      const s = parseSort(sort);
      if (s) q = q.order(s.column, { ascending: s.ascending });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) {
        if (error.code === 'PGRST205') { console.warn(`[DB] Table "${tableName}" not in schema — returning [].`); return []; }
        logDbError(tableName, 'list', error);
        throw error;
      }
      return data;
    },

    filter: async (query, sort, limit) => {
      let q = supabase.from(tableName).select("*");
      q = applyFilters(q, query);
      const s = parseSort(sort);
      if (s) q = q.order(s.column, { ascending: s.ascending });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) {
        logDbError(tableName, 'filter', error, query);
        // 22P02   = invalid UUID cast (legacy Base44 ObjectId in JWT/data)
        // PGRST205 = table doesn't exist yet in Supabase
        // PGRST204 / 42703 = column doesn't exist (schema not yet migrated)
        if (error.code === '22P02' || error.code === 'PGRST205' || error.code === 'PGRST204' || error.code === '42703') return [];
        throw error;
      }
      return data;
    },

    create: async (data) => {
      // Auto-heal: strip unknown columns (PGRST204/42703), invalid type values (22007/22P02),
      // and non-existent tables (PGRST205). Up to 15 retries for forms with many extra fields.
      let payload = sanitizePayload(data);
      for (let attempt = 0; attempt < 15; attempt++) {
        const { data: result, error } = await supabase
          .from(tableName)
          .insert(payload)
          .select()
          .single();
        if (!error) return result;

        if (error.code === 'PGRST205') {
          // Table doesn't exist in Supabase yet — return a mock so the UI doesn't crash
          console.warn(`[DB] Table "${tableName}" not found in Supabase schema. Data not persisted. Add this table to enable persistence.`);
          return { id: crypto.randomUUID(), ...payload, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
        }

        if (error.code === '42703' || error.code === 'PGRST204') {
          const col = extractBadColumn(error.message);
          if (col && payload[col] !== undefined) {
            console.warn(`[DB] Stripping unknown column "${col}" from ${tableName}.create — add it to the table to persist this field.`);
            payload = { ...payload };
            delete payload[col];
            continue; // retry without that column
          }
        }

        // 22007 = invalid input syntax for timestamp/date — null out that field and retry
        // 22P02 = invalid input syntax for type (uuid, enum, etc.) — null it out too
        if (error.code === '22007' || error.code === '22P02') {
          const col = extractBadColumn(error.message);
          if (col && payload[col] !== undefined) {
            console.warn(`[DB] Nulling invalid value for "${col}" in ${tableName}.create (${error.code})`);
            payload = { ...payload, [col]: null };
            continue;
          }
        }

        logDbError(tableName, 'create', error, data);
        throw error;
      }
      throw new Error(`[DB] ${tableName}.create: exhausted retries stripping unknown columns`);
    },

    update: async (id, data) => {
      // Auto-heal: same retry logic as create
      let payload = sanitizePayload(data);
      for (let attempt = 0; attempt < 15; attempt++) {
        const { data: result, error } = await supabase
          .from(tableName)
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (!error) return result;

        if (error.code === 'PGRST205') {
          console.warn(`[DB] Table "${tableName}" not found in Supabase schema. Update not persisted.`);
          return { id, ...payload, updated_date: new Date().toISOString() };
        }

        if (error.code === '42703' || error.code === 'PGRST204') {
          const col = extractBadColumn(error.message);
          if (col && payload[col] !== undefined) {
            console.warn(`[DB] Stripping unknown column "${col}" from ${tableName}.update — add it to the table to persist this field.`);
            payload = { ...payload };
            delete payload[col];
            continue; // retry without that column
          }
        }

        // 22007 = invalid input syntax for timestamp/date — null it out and retry
        if (error.code === '22007' || error.code === '22P02') {
          const col = extractBadColumn(error.message);
          if (col && payload[col] !== undefined) {
            console.warn(`[DB] Nulling invalid value for "${col}" in ${tableName}.update (${error.code})`);
            payload = { ...payload, [col]: null };
            continue;
          }
        }

        logDbError(tableName, 'update', error, { id, ...data });
        throw error;
      }
      throw new Error(`[DB] ${tableName}.update: exhausted retries stripping unknown columns`);
    },

    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", id);
      if (error) {
        if (error.code === 'PGRST205') { console.warn(`[DB] Table "${tableName}" not found in Supabase schema. Delete no-op.`); return; }
        logDbError(tableName, 'delete', error, { id });
        throw error;
      }
    },

    bulkCreate: async (records) => {
      // Auto-heal: strip unknown columns by trying one record first
      let sanitizedRecords = records.map(r => ({ ...r }));
      const badCols = new Set();
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data, error } = await supabase
          .from(tableName)
          .insert(sanitizedRecords)
          .select();
        if (!error) return data;
        if (error.code === 'PGRST205') {
          console.warn(`[DB] Table "${tableName}" not found in Supabase. bulkCreate no-op.`);
          return sanitizedRecords.map(r => ({ id: crypto.randomUUID(), ...r, created_date: new Date().toISOString() }));
        }
        if (error.code === '42703' || error.code === 'PGRST204') {
          const col = extractBadColumn(error.message);
          if (col && !badCols.has(col)) {
            console.warn(`[DB] Stripping unknown column "${col}" from ${tableName}.bulkCreate`);
            badCols.add(col);
            sanitizedRecords = sanitizedRecords.map(r => { const c = { ...r }; delete c[col]; return c; });
            continue;
          }
        }
        logDbError(tableName, 'bulkCreate', error);
        throw error;
      }
      throw new Error(`[DB] ${tableName}.bulkCreate: exhausted retries stripping unknown columns`);
    },

    subscribe: (callback) => {
      const channel = supabase
        .channel(`${tableName}_changes`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: tableName },
          (payload) => {
            const eventMap = { INSERT: "create", UPDATE: "update", DELETE: "delete" };
            const record = payload.new || payload.old || {};
            callback({
              // @ts-ignore - Supabase payload record will have id property
              id: record.id,
              type: eventMap[payload.eventType] || payload.eventType,
              data: record,
            });
          }
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    },

    schema: () => Promise.resolve({}),
  };
}



/**
 * Get a repository for an entity type.
 * ALL entities are now routed to Supabase.
 */
export function getRepository(entityName) {
  const tableName = TABLE_MAP[entityName];
  if (!tableName) throw new Error(`Entity "${entityName}" is not mapped in TABLE_MAP. Add it to TABLE_MAP and create the Supabase table.`);
  return createSupabaseRepository(tableName);
}

// ─── Pre-built repositories (Supabase-backed) ───
// Batch 1
export const TaskRepo = getRepository("Task");
export const EmployeeRepo = getRepository("Employee");
export const OrganizationRepo = getRepository("Organization");
export const SiteSettingsRepo = getRepository("SiteSettings");
export const EmployeeSessionRepo = getRepository("EmployeeSession");
// Batch 2
export const CrewRepo = getRepository("Crew");
export const CrewScheduleRepo = getRepository("CrewSchedule");
export const RoleConfigRepo = getRepository("RoleConfig");
export const TaskGroupRepo = getRepository("TaskGroup");
export const TaskCommentRepo = getRepository("TaskComment");
// Batch 3
export const AnnouncementRepo = getRepository("Announcement");
export const EmployeeTrainingRepo = getRepository("EmployeeTraining");
export const HelperTrainingRepo = getRepository("EmployeeTraining"); // Helper = Employee
export const AuditLogRepo = getRepository("AuditLog");
// Batch 4 — Training subsystem
export const TrainingDocumentRepo = getRepository("TrainingDocument");
export const TrainingQuizRepo = getRepository("TrainingQuiz");
export const ControlledDocumentRepo = getRepository("ControlledDocument");

// ─── Pre-built repositories (Supabase — Batch A) ───
export const OrganizationGroupRepo = getRepository("OrganizationGroup");
export const OrgGroupMembershipRepo = getRepository("OrgGroupMembership");
export const AccessRequestRepo = getRepository("AccessRequest");

// ─── Pre-built repositories (Supabase — Batch B) ───
export const DrainCleaningRecordRepo = getRepository("DrainCleaningRecord");
export const DiverterInspectionRepo = getRepository("DiverterInspection");
export const TitrationRecordRepo = getRepository("TitrationRecord");
// Batch C — Session/Feedback
export const EmployeeFeedbackRepo = getRepository("EmployeeFeedback");

// ─── Pre-built repositories (Supabase — Batch D) ───
export const LineCleaningAssignmentRepo = getRepository("LineCleaningAssignment");
export const AreaSignOffRepo = getRepository("AreaSignOff");
export const PreOpInspectionRepo = getRepository("PreOpInspection");
export const PostCleanInspectionRepo = getRepository("PostCleanInspection");

// ─── Pre-built repositories (Supabase — Batch E) ───
export const DrainLocationRepo = getRepository("DrainLocation");
export const DrainFacilityMapRepo = getRepository("DrainFacilityMap");
export const DrainCleaningSettingsRepo = getRepository("DrainCleaningSettings");
export const TitrationAreaRepo = getRepository("TitrationArea");
export const TitrationSettingsRepo = getRepository("TitrationSettings");
export const RainDiverterRepo = getRepository("RainDiverter");
export const DiverterTaskSettingsRepo = getRepository("DiverterTaskSettings");
export const ChemicalInventoryRecordRepo = getRepository("ChemicalInventoryRecord");
export const ChemicalInventorySettingsRepo = getRepository("ChemicalInventorySettings");

// ─── Pre-built repositories (Supabase — Batch F) ───
export const ProductionLineRepo = getRepository("ProductionLine");
export const AreaRepo = getRepository("Area");
export const AssetRepo = getRepository("Asset");
export const AssetGroupRepo = getRepository("AssetGroup");
export const FacilityMapRepo = getRepository("FacilityMap");

// ─── Pre-built repositories (Supabase — Batch G) ───
export const ChemicalRepo = getRepository("Chemical");
export const ChemicalCountEntryRepo = getRepository("ChemicalCountEntry");
export const EmployeePeerFeedbackRepo = getRepository("EmployeePeerFeedback");
export const AnonymousFeedbackRepo = getRepository("AnonymousFeedback");
export const SanitaryReportRepo = getRepository("SanitaryReport");

// ─── Pre-built repositories (Supabase — Batch H) ───
export const EmployeeShiftRepo = getRepository("EmployeeShift");
export const ShiftRequestRepo = getRepository("ShiftRequest");
export const BadgeRepo = getRepository("Badge");
export const PerformanceGoalRepo = getRepository("PerformanceGoal");
export const SDSDocumentRepo = getRepository("SDSDocument");
export const SSOPRepo = getRepository("SSOP");
export const CompetencyRecordRepo = getRepository("CompetencyRecord");
export const CompetencyEvaluationRepo = getRepository("CompetencyEvaluation");

// ─── Pre-built repositories (Supabase — Batch I: Final) ───
export const TaskTrainingGapRepo = getRepository("TaskTrainingGap");
export const SanitationDowntimeRepo = getRepository("SanitationDowntime");
export const CAPARepo = getRepository("CAPA");
export const ChangeControlRepo = getRepository("ChangeControl");
export const PestFindingRepo = getRepository("PestFinding");
export const PestDeviceRepo = getRepository("PestDevice");
export const PestServiceReportRepo = getRepository("PestServiceReport");
export const PestThresholdRepo = getRepository("PestThreshold");
export const PestEscalationMarkerRepo = getRepository("PestEscalationMarker");
export const EMPSampleRepo = getRepository("EMPSample");
export const EMPSiteRepo = getRepository("EMPSite");
export const EMPThresholdRepo = getRepository("EMPThreshold");
export const PlantExceptionRepo = getRepository("PlantException");
export const AllergenRepo = getRepository("Allergen");
export const AllergenAssignmentRepo = getRepository("AllergenAssignment");
export const EmployeeQALogRepo = getRepository("EmployeeQALog");
export const EvaluationTemplateRepo = getRepository("EvaluationTemplate");
export const EvaluatorSettingsRepo = getRepository("EvaluatorSettings");
export const TrainingRecordRepo = getRepository("TrainingRecord");

// ─── Pre-built repositories (Supabase — Batch J: Handoff & Incident) ───
export const ShiftHandoffRepo = getRepository("ShiftHandoff");
export const IncidentRepo = getRepository("Incident");

// ─── Additional repositories for missing entities ───
export const CalibrationEquipmentRepo = getRepository("CalibrationEquipment");
export const CalibrationRecordRepo = getRepository("CalibrationRecord");
export const CCPMonitoringPointRepo = getRepository("CCPMonitoringPoint");
export const CCPRecordRepo = getRepository("CCPRecord");
export const CAPAActionRepo = getRepository("CAPAAction");
export const CAPASettingsRepo = getRepository("CAPASettings");
export const AuditFindingRepo = getRepository("AuditFinding");
export const AuditPlanRepo = getRepository("AuditPlan");
export const AuditRequirementRepo = getRepository("AuditRequirement");
export const AuditResultRepo = getRepository("AuditResult");
export const AuditSectionRepo = getRepository("AuditSection");
export const AuditStandardRepo = getRepository("AuditStandard");
export const ChemicalLocationAssignmentRepo = getRepository("ChemicalLocationAssignment");
export const ChemicalStorageLocationRepo = getRepository("ChemicalStorageLocation");
export const ComplaintSettingsRepo = getRepository("ComplaintSettings");
export const CustomerComplaintRepo = getRepository("CustomerComplaint");
export const FSPSettingsRepo = getRepository("FSPSettings");
export const FoodSafetyPlanRepo = getRepository("FoodSafetyPlan");
export const ForeignMaterialIncidentRepo = getRepository("ForeignMaterialIncident");
export const GlassBreakageIncidentRepo = getRepository("GlassBreakageIncident");
export const GlassBrittleItemRepo = getRepository("GlassBrittleItem");
export const HazardAnalysisRepo = getRepository("HazardAnalysis");
export const HelperRepo = getRepository("Helper");
export const HoldReleaseRepo = getRepository("HoldRelease");
export const IssueSettingsRepo = getRepository("IssueSettings");
export const IssueRepo = getRepository("Issue");
export const PreventiveControlRepo = getRepository("PreventiveControl");
export const ProcessStepRepo = getRepository("ProcessStep");
export const ReceivingInspectionRepo = getRepository("ReceivingInspection");
export const RiskEntryRepo = getRepository("RiskEntry");
export const SOC2ControlRepo = getRepository("SOC2Control");
export const SOC2EvidenceRepo = getRepository("SOC2Evidence");
export const SOC2PolicyRepo = getRepository("SOC2Policy");
export const SOC2RiskRepo = getRepository("SOC2Risk");
export const SOC2VendorRepo = getRepository("SOC2Vendor");
export const ScheduledAuditRepo = getRepository("ScheduledAudit");
export const VisitorLogRepo = getRepository("VisitorLog");

// ─── Supplier management repositories ───
export const SupplierRepo = getRepository("Supplier");
export const SupplierContactRepo = getRepository("SupplierContact");
export const SupplierMaterialRepo = getRepository("SupplierMaterial");
export const SupplierNonconformanceRepo = getRepository("SupplierNonconformance");
export const SupplierSettingsRepo = getRepository("SupplierSettings");

// ─── Employee scheduling & groups ───
export const EmployeeGroupRepo = getRepository("EmployeeGroup");
export const EmployeeBadgeRepo = getRepository("EmployeeBadge");
export const EmployeeQuotaRepo = getRepository("EmployeeQuota");
export const SchedulingRequestRepo = getRepository("SchedulingRequest");

// ─── Additional operations repos ───
export const PestControlRecordRepo = getRepository("PestControlRecord");
export const ChemicalProductRepo = getRepository("ChemicalProduct");
export const ChemicalLocationRepo = getRepository("ChemicalLocation");
export const DiverterSettingsRepo = getRepository("DiverterSettings");
export const LabelVerificationRepo = getRepository("LabelVerification");

// ─── CAPA comments ───
export const CAPACommentRepo = getRepository("CAPAComment");

// ─── Document control extras ───
export const DocumentChangeRequestRepo = getRepository("DocumentChangeRequest");
export const DocumentControlSettingsRepo = getRepository("DocumentControlSettings");
export const DocumentVersionRepo = getRepository("DocumentVersion");
export const DocumentAcknowledgmentRepo = getRepository("DocumentAcknowledgment");

// ─── Handoff settings ───
export const HandoffSettingsRepo = getRepository("HandoffSettings");

// ─── Pest extras ───
export const PestLocationRepo = getRepository("PestLocation");
export const PestVendorRepo = getRepository("PestVendor");

// ─── Recall ───
export const RecallEventRepo = getRepository("RecallEvent");

// ─── Risk / management review ───
export const ManagementReviewRepo = getRepository("ManagementReview");
export const RiskSettingsRepo = getRepository("RiskSettings");

// ─── Training extras ───
export const TrainingMatrixRepo = getRepository("TrainingMatrix");
export const TrainingCompetencySettingsRepo = getRepository("TrainingCompetencySettings");

// ─── SOC2 ───
export const EvidenceRepo = getRepository("SOC2Evidence");
export const EvidencePackageRepo = getRepository("SOC2EvidencePackage");
export const PolicyRepo = getRepository("SOC2Policy");
export const RiskRepo = getRepository("SOC2Risk");
export const VendorRepo = getRepository("SOC2Vendor");
export const ControlRepo = getRepository("SOC2Control");

// ─── Compliance ───
export const ComplianceFrameworkRepo = getRepository("ComplianceFramework");
export const ComplianceRequirementRepo = getRepository("ComplianceRequirement");
export const ComplianceEvidenceRepo = getRepository("ComplianceEvidence");

// ─── Water testing ───
export const WaterTestRepo = getRepository("WaterTest");

// ─── User dashboard layout persistence ───
export const UserDashboardConfigRepo = getRepository("UserDashboardConfig");

// ─── AI-generated in-memory repositories (for predictions/analysis) ───
// These don't have persistent Supabase tables; they're computed on-demand
export const EMPRiskPredictionRepo = getRepository("EMPSample"); // Maps to EMP data
export const PestRiskPredictionRepo = getRepository("PestFinding"); // Maps to pest data

// NOTE: PestRiskPrediction and EMPRiskPrediction are AI-generated in-memory;
// they don't have persistent tables and aren't needed in the adapter.