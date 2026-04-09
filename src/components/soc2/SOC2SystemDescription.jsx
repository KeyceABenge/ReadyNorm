import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";

const SYSTEM_DESCRIPTION = `# System Description — ReadyNorm

*This document describes the system, infrastructure, and controls in place for SOC 2 Type II compliance.*

---

## 1. Overview

ReadyNorm is a cloud-based SaaS application designed for food manufacturing facilities to manage sanitation programs, quality management systems, and food safety compliance. The application enables organizations to track tasks, schedule crews, manage documentation, conduct audits, and maintain regulatory compliance.

## 2. Users and Roles

### Organization Structure
- **Organization Groups**: Parent entities that contain one or more sites
- **Organizations (Sites)**: Individual facilities, each with a unique **site code**
- **Users**: Personnel who access the system with defined roles

### User Roles
| Role | Description | Access Level |
|------|-------------|-------------|
| **System Administrator / Founder** | Platform owner with full access | All organizations and sites |
| **Organization Owner** | Owner of an organization group | All sites within their organization group |
| **Organization Manager** | Manager within an organization group | All or selected sites per configuration |
| **Site Manager** | Manager of a specific site | Single site and its data |
| **Employee** | Frontline worker at a specific site | Assigned site tasks and personal data only |

### Access Control Model
- Users authenticate via the platform's built-in authentication system
- Each user is assigned to exactly one organization
- Site-level access is further restricted based on role and configuration
- Organization codes and site codes serve as access identifiers

## 3. Multi-Tenant Architecture

### Organization-Level Isolation
- All data entities include an \`organization_id\` field
- Backend API queries are scoped to the authenticated user's organization
- Row-Level Security (RLS) policies enforce that users can only read/write data belonging to their organization
- No database queries are permitted without organization_id filtering

### Site-Level Segmentation
- Within an organization, data is segmented by site
- Users with \`site_access_type: "selected"\` can only access their assigned sites
- Site codes are treated as sensitive identifiers and are not exposed publicly

### Cross-Tenant Prevention
- Backend authorization checks are mandatory on all API endpoints
- Frontend access controls are supplemented by server-side enforcement
- Automated testing validates that cross-tenant access is blocked
- Quarterly multi-tenant isolation testing is performed

## 4. Infrastructure

### Cloud Platform
- Application hosted on a managed cloud platform (Base44)
- Automatic scaling and high availability
- Geographic redundancy for data storage

### Data Storage
- Production database with encryption at rest (AES-256)
- Data encrypted in transit (TLS 1.2+)
- Automated daily backups with separate region storage
- 30-day daily backup retention, 12-month monthly backup retention

### Code Management
- Source code managed in GitHub
- Branch protection enforces pull request reviews
- All changes tracked with full audit trail

## 5. Data Flow

### Data Collection
1. Users enter data through the web application (tasks, inspections, training records)
2. File uploads (documents, photos, signatures) stored in secure cloud storage
3. Authentication events logged automatically

### Data Processing
1. Application processes user requests through authenticated API endpoints
2. Organization_id is validated on every request
3. Business logic enforced at the backend level
4. Integration calls (email, AI features) processed through controlled service endpoints

### Data Storage
1. All structured data stored in encrypted database
2. Files stored in encrypted cloud storage with access-controlled URLs
3. Logs stored separately with restricted access
4. Backups stored in separate availability zone

## 6. Security Controls Summary

| Control Area | Implementation |
|-------------|---------------|
| **Authentication** | Platform-managed authentication with MFA enforcement |
| **Authorization** | Organization-level RLS + site-level access control |
| **Encryption** | AES-256 at rest, TLS 1.2+ in transit |
| **Logging** | Authentication, data access, and system events logged |
| **Backups** | Automated daily, quarterly restore testing |
| **Change Management** | GitHub PRs with required review |
| **Incident Response** | Documented plan with classification and response procedures |
| **Vendor Management** | Annual vendor review with SOC 2 verification |
| **Risk Management** | Annual assessment with quarterly register review |

## 7. Boundaries

### In Scope
- The ReadyNorm web application
- Backend API services
- Database and file storage
- Authentication and authorization systems
- Third-party integrations used for application functionality

### Out of Scope
- End-user devices and networks
- Third-party vendor internal systems
- Physical office security (remote-first company)

---

*Document Version: 1.0 | Last Updated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} | Owner: Founder / System Administrator*
`;

export default function SOC2SystemDescription() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">System Description Document</h2>
      <p className="text-sm text-slate-500">Required for SOC 2 — describes your system, users, architecture, and security controls.</p>
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="prose prose-sm prose-slate max-w-none">
            <ReactMarkdown>{SYSTEM_DESCRIPTION}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}