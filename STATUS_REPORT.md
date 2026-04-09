# ReadyNorm — Full System Status Report

**Generated:** April 2025  
**Platform:** React/Vite + Supabase (PostgreSQL + Edge Functions + Storage)

---

## ✅ What's Working

| Area | Status | Notes |
|---|---|---|
| Auth (login/session) | ✅ | INITIAL_SESSION event-driven |
| Org resolution | ✅ | 5-path fallback chain |
| Employee CRUD | ✅ | Create, edit, photo upload all working |
| Task management | ✅ | |
| Crew management | ✅ | |
| Training & competency | ✅ | |
| Pre-op / post-clean inspections | ✅ | |
| Drain cleaning | ✅ | |
| Line cleaning | ✅ | |
| EMP monitoring | ✅ | |
| Pest control (findings/devices/reports) | ✅ | |
| Chemical inventory | ✅ | |
| SSOP management | ✅ | |
| Announcements | ✅ | Null date guards fixed |
| Performance goals | ✅ | Null date guards fixed |
| Rain diverters | ✅ | |
| Badges | ✅ | |
| Storage (photo upload) | ✅ | `public-uploads` bucket live |
| DB adapter (auto-heal) | ✅ | Handles PGRST204, PGRST205, 22007, 22P02 |

---

## 🔴 Step 1: Run the SQL Migration (REQUIRED)

**52 tables are missing from your Supabase database.** Without them, entire sections of the app will silently return empty results.

### How to run

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/zamrusolomzustgenpin/sql)
2. Open `src/supabase/migrations/002_missing_tables.sql`
3. Paste the entire contents and click **Run**
4. Should complete in ~5 seconds — look for "Success"

### Tables being created (52 total)

**Employee management:**
- `employee_groups` — scheduling groups
- `employee_badges` — badge assignments per employee
- `employee_quotas` — per-employee performance targets
- `scheduling_requests` — time-off / shift swap requests

**CAPA:**
- `capa_actions` — individual corrective/preventive action items
- `capa_settings` — org-level CAPA configuration

**Incidents & safety:**
- `incidents` — general incidents & near-misses
- `foreign_material_incidents` — FM incident log
- `glass_breakage_incidents` — glass/brittle breakage log
- `glass_brittle_items` — glass/brittle item inventory

**Allergens:**
- `allergen_assignments` — allergen presence per production line

**Audits:**
- `audit_standards`, `audit_sections`, `audit_requirements` — standard library
- `audit_plans`, `scheduled_audits`, `audit_results`, `audit_findings` — audit execution

**Change control:**
- `change_controls` — change request log

**Customer complaints:**
- `customer_complaints` — complaint tracking
- `complaint_settings` — org-level complaint config

**Food safety plan (HACCP/HARPC):**
- `fsp_settings` — FSP config
- `food_safety_plans` — plan records
- `process_steps` — process flow steps
- `hazard_analyses` — hazard analysis per step
- `preventive_controls` — CCPs and OPRPs

**CCP monitoring:**
- `ccp_monitoring_points` — CCP definition
- `ccp_records` — monitoring log

**Quality:**
- `hold_releases` — product hold/release log
- `label_verifications` — label check log
- `receiving_inspections` — incoming goods inspection

**Issues:**
- `issue_settings` — org-level issue config
- `issues` — internal issue tracker

**SOC2:**
- `soc2_controls`, `soc2_evidence`, `soc2_policies`, `soc2_risks`, `soc2_vendors`

**Risk management:**
- `risk_entries` — general risk register

**Shift handoffs:**
- `shift_handoffs` — AI-generated shift handoff records

**Calibration:**
- `calibration_equipment` — equipment registry
- `calibration_records` — calibration log

**Suppliers:**
- `supplier_records` — supplier list
- `supplier_contacts` — supplier contact persons
- `supplier_materials` — approved materials per supplier
- `supplier_nonconformances` — supplier NC log
- `supplier_settings` — org-level supplier config

**Pest control:**
- `pest_control_records` — service visit records

**Chemicals:**
- `chemical_products` — chemical product catalog
- `chemical_locations` — storage location list
- `chemical_storage_locations` — detailed storage config
- `chemical_location_assignments` — chemical↔location mapping

**Visitor management:**
- `visitor_logs` — visitor sign-in log

**Other:**
- `helpers` — generic helper records
- `diverter_settings` — rain diverter inspection settings

---

## 🟡 Step 2: Storage — Create `private-uploads` Bucket (OPTIONAL)

The `public-uploads` bucket is live and working. The `private-uploads` bucket is defined in the storage adapter but not yet used by any component — it's future-proofing.

If you want to create it now, run in Supabase SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'private-uploads', 'private-uploads', FALSE,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf','video/mp4']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "private_uploads_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'private-uploads');

CREATE POLICY "private_uploads_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'private-uploads');
```

---

## 🟡 Step 3: Edge Function Environment Variables

Your Supabase project has 13 edge functions deployed. Several require external API keys set as **Supabase secrets** to work properly.

Go to: Supabase Dashboard → Project Settings → Edge Functions → Secrets

| Secret Name | Used By | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | `invokeLLM`, `generateImage`, `extractData` | https://platform.openai.com/api-keys |
| `SENDGRID_API_KEY` or `RESEND_API_KEY` | `sendEmail`, `sendPasswordReset` | https://sendgrid.com or https://resend.com |

**How to set secrets:**
```bash
# Using Supabase CLI
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set SENDGRID_API_KEY=SG...
```

Or via Dashboard: Settings → Edge Functions → Add Secret

**Impact of missing keys:**
- AI features (CAPA Wizard, Handoff Generator, AI Coach, SDS extraction) will fail silently or return errors
- Email notifications (CAPA reminders, complaint assignments) will not send
- Password reset emails will not send

---

## 🟢 Step 4: Code Fixes Already Applied This Session

The following bugs were found and fixed in the codebase:

| File | Fix |
|---|---|
| `src/lib/adapters/database.js` | Added 15+ missing entity→table mappings |
| `src/lib/adapters/database.js` | Added `SupplierRepo`, `SupplierMaterialRepo`, `SupplierNonconformanceRepo`, `SupplierSettingsRepo`, `SupplierContactRepo`, `EmployeeGroupRepo`, `EmployeeBadgeRepo`, `EmployeeQuotaRepo`, `SchedulingRequestRepo`, `PestControlRecordRepo`, `ChemicalProductRepo`, `ChemicalLocationRepo`, `DiverterSettingsRepo`, `LabelVerificationRepo` |
| `src/pages/SupplierManagement.jsx` | Added missing `import { OrganizationRepo, EmployeeRepo, SupplierRepo, ... }` — was causing runtime `ReferenceError` on every page load |
| `src/components/suppliers/SupplierFormModal.jsx` | Added `import { SupplierRepo }` |
| `src/components/suppliers/MaterialsList.jsx` | Added `import { SupplierMaterialRepo }` |
| `src/components/suppliers/NonconformancesList.jsx` | Added `import { SupplierRepo, SupplierNonconformanceRepo }` |
| `src/components/suppliers/SupplierSettingsPanel.jsx` | Added `import { SupplierSettingsRepo }` |
| `src/components/suppliers/SupplierDetailModal.jsx` | Added `import { SupplierRepo }` |

---

## 📊 Summary

| Category | Count | Status |
|---|---|---|
| Tables existing in Supabase | 71 | ✅ Working |
| Tables missing (pre-migration) | 52 | 🔴 Run 002_missing_tables.sql |
| Storage buckets | 1 of 2 | `public-uploads` ✅ / `private-uploads` optional |
| Edge functions deployed | 13 | Need OPENAI_API_KEY + email key |
| Code import errors fixed | 7 files | ✅ Done |
| Build status | ✅ Clean | No errors |

---

## 🔢 Priority Order

1. **Run `002_missing_tables.sql`** — unlocks CAPA, Incidents, Complaints, Audits, Handoffs, Calibration, Suppliers, SOC2, Risk, Issues, Food Safety, CCP, etc.
2. **Set `OPENAI_API_KEY` in Supabase secrets** — unlocks all AI features
3. **Set email API key** — unlocks notifications and password reset
4. **`private-uploads` bucket** — only needed for private document features (future)
