

import * as DatabaseAdapters from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";

// Map entity names to their repository exports
// Format: "EntityName" → EntityNameRepo
const ENTITY_TO_REPO_MAP = {
  Organization: DatabaseAdapters.OrganizationRepo,
  Employee: DatabaseAdapters.EmployeeRepo,
  Task: DatabaseAdapters.TaskRepo,
  EmployeeSession: DatabaseAdapters.EmployeeSessionRepo,
  SiteSettings: DatabaseAdapters.SiteSettingsRepo,
  Crew: DatabaseAdapters.CrewRepo,
  CrewSchedule: DatabaseAdapters.CrewScheduleRepo,
  RoleConfig: DatabaseAdapters.RoleConfigRepo,
  TaskGroup: DatabaseAdapters.TaskGroupRepo,
  TaskComment: DatabaseAdapters.TaskCommentRepo,
  Announcement: DatabaseAdapters.AnnouncementRepo,
  EmployeeTraining: DatabaseAdapters.EmployeeTrainingRepo,
  AuditLog: DatabaseAdapters.AuditLogRepo,
  TrainingDocument: DatabaseAdapters.TrainingDocumentRepo,
  TrainingQuiz: DatabaseAdapters.TrainingQuizRepo,
  ControlledDocument: DatabaseAdapters.ControlledDocumentRepo,
  OrganizationGroup: DatabaseAdapters.OrganizationGroupRepo,
  OrgGroupMembership: DatabaseAdapters.OrgGroupMembershipRepo,
  AccessRequest: DatabaseAdapters.AccessRequestRepo,
  DrainCleaningRecord: DatabaseAdapters.DrainCleaningRecordRepo,
  DiverterInspection: DatabaseAdapters.DiverterInspectionRepo,
  TitrationRecord: DatabaseAdapters.TitrationRecordRepo,
  EmployeeFeedback: DatabaseAdapters.EmployeeFeedbackRepo,
  LineCleaningAssignment: DatabaseAdapters.LineCleaningAssignmentRepo,
  AreaSignOff: DatabaseAdapters.AreaSignOffRepo,
  PreOpInspection: DatabaseAdapters.PreOpInspectionRepo,
  PostCleanInspection: DatabaseAdapters.PostCleanInspectionRepo,
  DrainLocation: DatabaseAdapters.DrainLocationRepo,
  DrainFacilityMap: DatabaseAdapters.DrainFacilityMapRepo,
  DrainCleaningSettings: DatabaseAdapters.DrainCleaningSettingsRepo,
  TitrationArea: DatabaseAdapters.TitrationAreaRepo,
  TitrationSettings: DatabaseAdapters.TitrationSettingsRepo,
  RainDiverter: DatabaseAdapters.RainDiverterRepo,
  DiverterTaskSettings: DatabaseAdapters.DiverterTaskSettingsRepo,
  ChemicalInventoryRecord: DatabaseAdapters.ChemicalInventoryRecordRepo,
  ChemicalInventorySettings: DatabaseAdapters.ChemicalInventorySettingsRepo,
  ProductionLine: DatabaseAdapters.ProductionLineRepo,
  Area: DatabaseAdapters.AreaRepo,
  Asset: DatabaseAdapters.AssetRepo,
  AssetGroup: DatabaseAdapters.AssetGroupRepo,
  FacilityMap: DatabaseAdapters.FacilityMapRepo,
  Chemical: DatabaseAdapters.ChemicalRepo,
  ChemicalCountEntry: DatabaseAdapters.ChemicalCountEntryRepo,
  EmployeePeerFeedback: DatabaseAdapters.EmployeePeerFeedbackRepo,
  AnonymousFeedback: DatabaseAdapters.AnonymousFeedbackRepo,
  SanitaryReport: DatabaseAdapters.SanitaryReportRepo,
  EmployeeShift: DatabaseAdapters.EmployeeShiftRepo,
  ShiftRequest: DatabaseAdapters.ShiftRequestRepo,
  Badge: DatabaseAdapters.BadgeRepo,
  PerformanceGoal: DatabaseAdapters.PerformanceGoalRepo,
  SDSDocument: DatabaseAdapters.SDSDocumentRepo,
  SSOP: DatabaseAdapters.SSOPRepo,
  CompetencyRecord: DatabaseAdapters.CompetencyRecordRepo,
  CompetencyEvaluation: DatabaseAdapters.CompetencyEvaluationRepo,
  TaskTrainingGap: DatabaseAdapters.TaskTrainingGapRepo,
  SanitationDowntime: DatabaseAdapters.SanitationDowntimeRepo,
  CAPA: DatabaseAdapters.CAPARepo,
  ChangeControl: DatabaseAdapters.ChangeControlRepo,
  PestFinding: DatabaseAdapters.PestFindingRepo,
  PestDevice: DatabaseAdapters.PestDeviceRepo,
  PestServiceReport: DatabaseAdapters.PestServiceReportRepo,
  PestThreshold: DatabaseAdapters.PestThresholdRepo,
  PestEscalationMarker: DatabaseAdapters.PestEscalationMarkerRepo,
  EMPSample: DatabaseAdapters.EMPSampleRepo,
  EMPSite: DatabaseAdapters.EMPSiteRepo,
  EMPThreshold: DatabaseAdapters.EMPThresholdRepo,
  PlantException: DatabaseAdapters.PlantExceptionRepo,
  Allergen: DatabaseAdapters.AllergenRepo,
  EmployeeQALog: DatabaseAdapters.EmployeeQALogRepo,
  EvaluationTemplate: DatabaseAdapters.EvaluationTemplateRepo,
  EvaluatorSettings: DatabaseAdapters.EvaluatorSettingsRepo,
  TrainingRecord: DatabaseAdapters.TrainingRecordRepo,
  ShiftHandoff: DatabaseAdapters.ShiftHandoffRepo,
  Incident: DatabaseAdapters.IncidentRepo,
  // Legacy/special entities
  Helper: DatabaseAdapters.EmployeeRepo,  // Helpers are employees
  DocumentVersion: DatabaseAdapters.ControlledDocumentRepo,
  DocumentChangeRequest: DatabaseAdapters.CAPARepo,
  DocumentAcknowledgment: DatabaseAdapters.TrainingRecordRepo,
  DocumentControlSettings: DatabaseAdapters.SiteSettingsRepo,
  ForeignMaterialIncident: DatabaseAdapters.IncidentRepo,
  HelperTraining: DatabaseAdapters.EmployeeTrainingRepo,
  LabelVerification: DatabaseAdapters.TrainingRecordRepo,
  HandoffSettings: DatabaseAdapters.SiteSettingsRepo,
  FoodSafetyPlan: DatabaseAdapters.SDSDocumentRepo,
};

// Create a proxy that maps entity names to repos
const entitiesProxy = new Proxy({}, {
  get: (target, entityName) => {
    const repo = ENTITY_TO_REPO_MAP[entityName];
    if (!repo) {
      console.warn(`⚠️ [base44Client] Unknown entity: ${entityName}. Returning empty repo.`);
      return {
        filter: () => Promise.resolve([]),
        create: () => Promise.reject(new Error(`Unknown entity: ${entityName}`)),
        update: () => Promise.reject(new Error(`Unknown entity: ${entityName}`)),
        delete: () => Promise.reject(new Error(`Unknown entity: ${entityName}`)),
        list: () => Promise.resolve([]),
      };
    }
    return repo;
  }
});

// Expose base44 stub that proxies to Supabase adapters
export const base44 = {
  entities: entitiesProxy,
  integrations: {
    Core: {
      UploadFile: uploadFile
    }
  },
  auth: {
    isAuthenticated,
    me: getCurrentUser,
    redirectToLogin: () => {
      window.location.href = '/ManagerLogin';
    }
  }
};
