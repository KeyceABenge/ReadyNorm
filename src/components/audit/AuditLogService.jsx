/**
 * Audit Log Service
 * Centralized service for creating immutable audit trail entries
 */

import { AuditLogRepo } from "@/lib/adapters/database";

// Retention periods by category (in years) - FDA/USDA compliance
const RETENTION_PERIODS = {
  operational: 3,      // Standard operational records
  compliance: 5,       // Regulatory compliance records
  safety: 7,          // Safety-related records
  training: 5,        // Training and competency records
  incident: 7         // Incident/CAPA records
};

// Determine retention category based on entity type and action
const getRetentionCategory = (entityType, action) => {
  if (entityType === "Incident" || action === "incident") return "incident";
  if (entityType === "CompetencyEvaluation" || entityType === "EmployeeTraining") return "training";
  if (entityType === "AreaSignOff" && action === "atp_test") return "compliance";
  if (["verify", "reject", "inspect"].includes(action)) return "compliance";
  return "operational";
};

// Get device info for metadata
const getDeviceMetadata = () => {
  const ua = navigator.userAgent;
  let deviceType = "desktop";
  if (/mobile/i.test(ua)) deviceType = "mobile";
  else if (/tablet/i.test(ua)) deviceType = "tablet";
  
  return {
    user_agent: ua,
    device_type: deviceType,
    session_id: sessionStorage.getItem("session_id") || `session_${Date.now()}`
  };
};

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 */
export async function createAuditLog({
  organizationId,
  entityType,
  entityId,
  entityTitle,
  action,
  actorEmail,
  actorName,
  actorRole = "employee",
  changes = null,
  previousState = null,
  newState = null,
  notes = null,
  signatureData = null
}) {
  const retentionCategory = getRetentionCategory(entityType, action);
  const retentionYears = RETENTION_PERIODS[retentionCategory];
  
  const auditEntry = {
    organization_id: organizationId,
    entity_type: entityType,
    entity_id: entityId,
    entity_title: entityTitle || `${entityType} ${entityId}`,
    action,
    actor_email: actorEmail,
    actor_name: actorName || actorEmail,
    actor_role: actorRole,
    timestamp: new Date().toISOString(),
    changes,
    previous_state: previousState,
    new_state: newState,
    metadata: getDeviceMetadata(),
    notes,
    signature_data: signatureData,
    retention_category: retentionCategory,
    retention_years: retentionYears,
    is_locked: true
  };

  try {
    await AuditLogRepo.create(auditEntry);
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break main operations
  }
}

/**
 * Log a task completion
 */
export async function logTaskCompletion(task, actor, signatureData) {
  await createAuditLog({
    organizationId: task.organization_id,
    entityType: "Task",
    entityId: task.id,
    entityTitle: task.title,
    action: "complete",
    actorEmail: actor.email,
    actorName: actor.name,
    actorRole: actor.role || "employee",
    changes: {
      status: { from: task.status, to: "completed" },
      completed_at: { from: null, to: new Date().toISOString() }
    },
    newState: { ...task, status: "completed" },
    signatureData
  });
}

/**
 * Log a task verification
 */
export async function logTaskVerification(task, verifier, notes, approved = true) {
  await createAuditLog({
    organizationId: task.organization_id,
    entityType: "Task",
    entityId: task.id,
    entityTitle: task.title,
    action: approved ? "verify" : "reject",
    actorEmail: verifier.email,
    actorName: verifier.name,
    actorRole: "manager",
    changes: {
      status: { from: task.status, to: approved ? "verified" : "pending" },
      verified_by: { from: null, to: verifier.email }
    },
    notes
  });
}

/**
 * Log an area sign-off
 */
export async function logAreaSignOff(signOff, actor, signatureData) {
  await createAuditLog({
    organizationId: signOff.organization_id,
    entityType: "AreaSignOff",
    entityId: signOff.id,
    entityTitle: `${signOff.area_id} - ${signOff.asset_id}`,
    action: "sign_off",
    actorEmail: actor.email,
    actorName: actor.name,
    actorRole: actor.role || "employee",
    newState: signOff,
    signatureData
  });
}

/**
 * Log an ATP test
 */
export async function logATPTest(signOff, actor, result, rluValue) {
  await createAuditLog({
    organizationId: signOff.organization_id,
    entityType: "AreaSignOff",
    entityId: signOff.id,
    entityTitle: `ATP Test - ${signOff.asset_id}`,
    action: "atp_test",
    actorEmail: actor.email,
    actorName: actor.name,
    actorRole: actor.role || "qa",
    changes: {
      atp_test_result: { from: signOff.atp_test_result, to: result },
      atp_test_value: { from: signOff.atp_test_value, to: rluValue }
    }
  });
}

/**
 * Log an inspection
 */
export async function logInspection(inspection, inspector, passed) {
  await createAuditLog({
    organizationId: inspection.organization_id,
    entityType: "PostCleanInspection",
    entityId: inspection.id,
    entityTitle: `Inspection - ${inspection.production_line_id}`,
    action: "inspect",
    actorEmail: inspector.email,
    actorName: inspector.name,
    actorRole: "manager",
    newState: inspection,
    notes: passed ? "Inspection passed" : "Inspection failed"
  });
}

/**
 * Log a drain cleaning
 */
export async function logDrainCleaning(record, actor, signatureData) {
  await createAuditLog({
    organizationId: record.organization_id,
    entityType: "DrainCleaningRecord",
    entityId: record.id,
    entityTitle: `Drain ${record.drain_id}`,
    action: "complete",
    actorEmail: actor.email,
    actorName: actor.name,
    actorRole: actor.role || "employee",
    newState: record,
    signatureData
  });
}

/**
 * Log a diverter inspection
 */
export async function logDiverterInspection(inspection, actor) {
  await createAuditLog({
    organizationId: inspection.organization_id,
    entityType: "DiverterInspection",
    entityId: inspection.id,
    entityTitle: `Diverter ${inspection.diverter_id}`,
    action: "inspect",
    actorEmail: actor.email,
    actorName: actor.name,
    actorRole: actor.role || "employee",
    newState: inspection
  });
}

export default {
  createAuditLog,
  logTaskCompletion,
  logTaskVerification,
  logAreaSignOff,
  logATPTest,
  logInspection,
  logDrainCleaning,
  logDiverterInspection
};