/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

// All page components are lazy-loaded — each page becomes its own JS chunk so
// users only download the code for the pages they actually visit.
const AllergenMatrix = lazy(() => import('./pages/AllergenMatrix'));
const CalibrationTracking = lazy(() => import('./pages/CalibrationTracking'));
const CCPMonitoring = lazy(() => import('./pages/CCPMonitoring'));
const ChangeControlProgram = lazy(() => import('./pages/ChangeControlProgram'));
const ForeignMaterialControl = lazy(() => import('./pages/ForeignMaterialControl'));
const GlassBrittleProgram = lazy(() => import('./pages/GlassBrittleProgram'));
const HoldReleaseManagement = lazy(() => import('./pages/HoldReleaseManagement'));
const LabelVerificationProgram = lazy(() => import('./pages/LabelVerificationProgram'));
const RecallManagement = lazy(() => import('./pages/RecallManagement'));
const ReceivingInspections = lazy(() => import('./pages/ReceivingInspections'));
const VisitorManagement = lazy(() => import('./pages/VisitorManagement'));
const WaterTesting = lazy(() => import('./pages/WaterTesting'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AuditMode = lazy(() => import('./pages/AuditMode'));
const BadgesManagement = lazy(() => import('./pages/BadgesManagement'));
const CAPAProgram = lazy(() => import('./pages/CAPAProgram'));
const ChemicalInventory = lazy(() => import('./pages/ChemicalInventory'));
const ChemicalManagement = lazy(() => import('./pages/ChemicalManagement'));
const CompetencyManagement = lazy(() => import('./pages/CompetencyManagement'));
const ComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard'));
const CrewsManagement = lazy(() => import('./pages/CrewsManagement'));
const CustomerComplaints = lazy(() => import('./pages/CustomerComplaints'));
const DocumentControl = lazy(() => import('./pages/DocumentControl'));
const DowntimeTracking = lazy(() => import('./pages/DowntimeTracking'));
const DrainManagement = lazy(() => import('./pages/DrainManagement'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const EmployeeDrainCleaning = lazy(() => import('./pages/EmployeeDrainCleaning'));
const EmployeeInventoryCount = lazy(() => import('./pages/EmployeeInventoryCount'));
const EmployeeLogin = lazy(() => import('./pages/EmployeeLogin'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const EnvironmentalMonitoring = lazy(() => import('./pages/EnvironmentalMonitoring'));
const ExecutiveCommandCenter = lazy(() => import('./pages/ExecutiveCommandCenter'));
const FoodSafetyPlan = lazy(() => import('./pages/FoodSafetyPlan'));
const FoodSafetyProgram = lazy(() => import('./pages/FoodSafetyProgram'));
const HelperDashboard = lazy(() => import('./pages/HelperDashboard'));
const HelperLogin = lazy(() => import('./pages/HelperLogin'));
const Home = lazy(() => import('./pages/Home'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
const InternalAudit = lazy(() => import('./pages/InternalAudit'));
const IssuesManagement = lazy(() => import('./pages/IssuesManagement'));
const LineCleaningAssignments = lazy(() => import('./pages/LineCleaningAssignments'));
const LineCleaningDetail = lazy(() => import('./pages/LineCleaningDetail'));
const LineCleaningsSetup = lazy(() => import('./pages/LineCleaningsSetup'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const ManagerPostCleanInspection = lazy(() => import('./pages/ManagerPostCleanInspection'));
const ManagerRainDiverters = lazy(() => import('./pages/ManagerRainDiverters'));
const PestControl = lazy(() => import('./pages/PestControl'));
const PlantSchedule = lazy(() => import('./pages/PlantSchedule'));
const PostCleanInspection = lazy(() => import('./pages/PostCleanInspection'));
const PreOpInspection = lazy(() => import('./pages/PreOpInspection'));
const QualityLogin = lazy(() => import('./pages/QualityLogin'));
const QualityProgram = lazy(() => import('./pages/QualityProgram'));
const RainDiverters = lazy(() => import('./pages/RainDiverters'));
const RiskManagement = lazy(() => import('./pages/RiskManagement'));
const SDSManagement = lazy(() => import('./pages/SDSManagement'));
const SSOPManagement = lazy(() => import('./pages/SSOPManagement'));
const SanitationProgram = lazy(() => import('./pages/SanitationProgram'));
const ScheduleManagement = lazy(() => import('./pages/ScheduleManagement'));
const ShiftHandoff = lazy(() => import('./pages/ShiftHandoff'));
const SiteSettings = lazy(() => import('./pages/SiteSettings'));
const SupplierManagement = lazy(() => import('./pages/SupplierManagement'));
const SystemValidation = lazy(() => import('./pages/SystemValidation'));
const TrainingCompetency = lazy(() => import('./pages/TrainingCompetency'));
const TrainingDocuments = lazy(() => import('./pages/TrainingDocuments'));


export const PAGES = {
    "AllergenMatrix": AllergenMatrix,
    "CalibrationTracking": CalibrationTracking,
    "CCPMonitoring": CCPMonitoring,
    "ChangeControlProgram": ChangeControlProgram,
    "ForeignMaterialControl": ForeignMaterialControl,
    "GlassBrittleProgram": GlassBrittleProgram,
    "HoldReleaseManagement": HoldReleaseManagement,
    "LabelVerificationProgram": LabelVerificationProgram,
    "RecallManagement": RecallManagement,
    "ReceivingInspections": ReceivingInspections,
    "VisitorManagement": VisitorManagement,
    "WaterTesting": WaterTesting,
    "Analytics": Analytics,
    "AuditMode": AuditMode,
    "BadgesManagement": BadgesManagement,
    "CAPAProgram": CAPAProgram,
    "ChemicalInventory": ChemicalInventory,
    "ChemicalManagement": ChemicalManagement,
    "CompetencyManagement": CompetencyManagement,
    "ComplianceDashboard": ComplianceDashboard,
    "CrewsManagement": CrewsManagement,
    "CustomerComplaints": CustomerComplaints,
    "DocumentControl": DocumentControl,
    "DowntimeTracking": DowntimeTracking,
    "DrainManagement": DrainManagement,
    "EmployeeDashboard": EmployeeDashboard,
    "EmployeeDrainCleaning": EmployeeDrainCleaning,
    "EmployeeInventoryCount": EmployeeInventoryCount,
    "EmployeeLogin": EmployeeLogin,
    "EmployeeProfile": EmployeeProfile,
    "EnvironmentalMonitoring": EnvironmentalMonitoring,
    "ExecutiveCommandCenter": ExecutiveCommandCenter,
    "FoodSafetyPlan": FoodSafetyPlan,
    "FoodSafetyProgram": FoodSafetyProgram,
    "HelperDashboard": HelperDashboard,
    "HelperLogin": HelperLogin,
    "Home": Home,
    "IncidentsPage": IncidentsPage,
    "InternalAudit": InternalAudit,
    "IssuesManagement": IssuesManagement,
    "LineCleaningAssignments": LineCleaningAssignments,
    "LineCleaningDetail": LineCleaningDetail,
    "LineCleaningsSetup": LineCleaningsSetup,
    "ManagerDashboard": ManagerDashboard,
    "MyProfile": MyProfile,
    "ManagerPostCleanInspection": ManagerPostCleanInspection,
    "ManagerRainDiverters": ManagerRainDiverters,
    "PestControl": PestControl,
    "PlantSchedule": PlantSchedule,
    "PostCleanInspection": PostCleanInspection,
    "PreOpInspection": PreOpInspection,
    "QualityLogin": QualityLogin,
    "QualityProgram": QualityProgram,
    "RainDiverters": RainDiverters,
    "RiskManagement": RiskManagement,
    "SDSManagement": SDSManagement,

    "SSOPManagement": SSOPManagement,
    "SanitationProgram": SanitationProgram,
    "ScheduleManagement": ScheduleManagement,
    "ShiftHandoff": ShiftHandoff,
    "SiteSettings": SiteSettings,
    "SupplierManagement": SupplierManagement,
    "SystemValidation": SystemValidation,
    "TrainingCompetency": TrainingCompetency,
    "TrainingDocuments": TrainingDocuments,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};