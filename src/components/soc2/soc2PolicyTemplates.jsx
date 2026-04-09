export const POLICY_TEMPLATES = [
  {
    name: "Information Security Policy",
    category: "security_governance",
    content: `# Information Security Policy

## 1. Purpose
Establish the security framework for protecting ReadyNorm's information assets, systems, and data.

## 2. Scope
Applies to all employees, contractors, and systems that process, store, or transmit company and customer data.

## 3. Policy

### Data Protection
- All customer data is encrypted at rest (AES-256) and in transit (TLS 1.2+)
- Production database access requires MFA and is restricted to System Administrator
- No customer data may be stored on personal devices or local machines

### Multi-Tenant Isolation
- All database queries MUST include organization_id filtering
- Backend authorization checks enforce organization and site-level access
- Organization codes and site codes are treated as sensitive identifiers
- No cross-tenant data exposure is permitted under any circumstance

### System Hardening
- All production servers use latest security patches (applied within 30 days of release)
- Default credentials are changed before deployment
- Unused ports and services are disabled

### Access Management
- All system access requires unique credentials with MFA enabled
- Access is granted on least-privilege principle
- Quarterly access reviews are mandatory

## 4. Responsibilities
- **Founder / System Administrator**: Enforce this policy, conduct quarterly reviews, approve exceptions
- **All Personnel**: Follow security practices, report incidents immediately

## 5. Evidence
- MFA configuration screenshots (quarterly)
- Access review records (quarterly)
- Encryption configuration documentation (annually)
- Patch management logs (monthly)`
  },
  {
    name: "Access Control Policy",
    category: "security_governance",
    content: `# Access Control Policy

## 1. Purpose
Define how access to systems and data is granted, managed, and revoked.

## 2. Scope
All production systems, databases, third-party services, and code repositories.

## 3. Policy

### Account Provisioning
- New accounts require Founder / System Administrator approval
- Access is granted on least-privilege principle
- MFA is mandatory for all accounts within 24 hours of creation

### Access Reviews
- Quarterly review of all user accounts and permissions
- Review includes: active users list, permission levels, last login dates
- Unused accounts (no login for 90 days) are disabled immediately

### Deprovisioning
- Upon termination: all access removed within 4 business hours
- Deprovisioning checklist: email, cloud console, GitHub, database, third-party tools
- Founder / System Administrator confirms deprovisioning completion

### Multi-Tenant Access Controls
- Users can ONLY access their assigned organization
- Users can ONLY access their assigned sites within that organization
- Backend API endpoints enforce organization_id and site_code authorization
- Frontend access controls are supplemented by mandatory backend checks

## 4. Responsibilities
- **Founder / System Administrator**: Provision/deprovision accounts, conduct quarterly reviews
- **All Personnel**: Use unique credentials, enable MFA, report unauthorized access

## 5. Evidence
- Quarterly access review spreadsheet with reviewer sign-off
- Deprovisioning confirmation records
- MFA enrollment screenshots
- User account export from each system`
  },
  {
    name: "Password Policy",
    category: "security_governance",
    content: `# Password Policy

## 1. Purpose
Define minimum standards for password security across all systems.

## 2. Scope
All user accounts on production systems, cloud services, and third-party tools.

## 3. Policy

### Password Requirements
- Minimum 12 characters
- Must include uppercase, lowercase, numbers, and special characters
- No reuse of the last 10 passwords
- Passwords must be changed every 90 days

### Multi-Factor Authentication
- MFA is required on ALL systems (no exceptions)
- Authenticator app preferred; SMS as fallback only
- Recovery codes must be stored securely (password manager)

### Password Storage
- Use a company-approved password manager
- No passwords in plain text, spreadsheets, or sticky notes
- Shared credentials are prohibited; each user has unique credentials

## 4. Responsibilities
- **Founder / System Administrator**: Enforce MFA settings, monitor compliance
- **All Personnel**: Maintain strong passwords, use password manager

## 5. Evidence
- MFA enforcement configuration screenshots (quarterly)
- Password policy configuration in identity provider (annually)`
  },
  {
    name: "Acceptable Use Policy",
    category: "security_governance",
    content: `# Acceptable Use Policy

## 1. Purpose
Define acceptable and prohibited uses of company systems, data, and resources.

## 2. Scope
All employees and contractors using company systems.

## 3. Policy

### Acceptable Use
- Company systems are for business purposes
- Limited personal use is acceptable if it does not interfere with work
- All data created on company systems is company property

### Prohibited Activities
- Accessing systems or data beyond authorized scope
- Sharing credentials with others
- Installing unauthorized software on production systems
- Accessing another organization's data (cross-tenant access)
- Using company systems for illegal activities
- Disabling security controls (MFA, encryption, logging)

### Data Handling
- Customer data must not be copied to personal devices
- Data must not be shared externally without Founder approval
- All data transfers must use encrypted channels

## 4. Responsibilities
- **Founder / System Administrator**: Monitor compliance, enforce policy
- **All Personnel**: Follow acceptable use guidelines, report violations

## 5. Evidence
- Signed acknowledgment from each employee (annually)
- Incident reports for any violations`
  },
  {
    name: "Change Management Policy",
    category: "security_governance",
    content: `# Change Management Policy

## 1. Purpose
Ensure all changes to production systems are controlled, reviewed, and documented.

## 2. Scope
All code changes, infrastructure changes, and configuration changes to production.

## 3. Policy

### Code Changes
- All code changes go through GitHub pull requests
- Every pull request requires at least one code review before merge
- Direct commits to main/production branch are prohibited
- Pull request must include description of change and testing performed

### Infrastructure Changes
- Infrastructure changes require Founder / System Administrator approval
- Changes are documented with before/after configuration
- Rollback plan must exist before deployment

### Emergency Changes
- Emergency hotfixes may skip review but must be documented within 24 hours
- Post-incident review required for all emergency changes

### Deployment
- Production deployments occur during maintenance windows when possible
- All deployments are logged with timestamp, author, and change description

## 4. Responsibilities
- **Founder / System Administrator**: Approve changes, review PRs, maintain change log
- **All Developers**: Create PRs, request reviews, document changes

## 5. Evidence
- GitHub pull request history showing reviews (continuous)
- Change log entries (per deployment)
- Emergency change documentation (per event)`
  },
  {
    name: "Risk Assessment Policy",
    category: "security_governance",
    content: `# Risk Assessment Policy

## 1. Purpose
Identify, evaluate, and mitigate risks to company information and systems.

## 2. Scope
All information assets, systems, processes, and third-party services.

## 3. Policy

### Risk Assessment Frequency
- Comprehensive risk assessment conducted annually
- Ad-hoc assessments after significant changes or incidents

### Risk Assessment Process
1. Identify assets and threats
2. Evaluate likelihood (Low / Medium / High)
3. Evaluate impact (Low / Medium / High)
4. Calculate risk level
5. Define mitigation strategy
6. Assign owner and timeline

### Risk Register
- All identified risks are documented in the risk register
- Risk register is reviewed quarterly
- Risk owners must update mitigation status quarterly

### Multi-Tenant Risks
- Cross-tenant data exposure is classified as Critical risk
- Tenant isolation controls are assessed in every risk assessment
- API authorization bypass is tested annually

## 4. Responsibilities
- **Founder / System Administrator**: Conduct risk assessments, maintain risk register
- **All Personnel**: Report potential risks

## 5. Evidence
- Annual risk assessment report
- Quarterly risk register updates
- Risk mitigation action tracking`
  },
  {
    name: "Vendor Management Policy",
    category: "security_governance",
    content: `# Vendor Management Policy

## 1. Purpose
Ensure third-party vendors meet security requirements before and during engagement.

## 2. Scope
All vendors that access, process, or store company or customer data.

## 3. Policy

### Vendor Assessment
- New vendors assessed before engagement: SOC 2 report, security questionnaire
- Vendors with customer data access require SOC 2 Type II or equivalent
- Data processing agreements required for all vendors handling customer data

### Vendor Inventory
- Maintain a current vendor list with: name, service, data access level, SOC 2 status
- Vendor list reviewed annually

### Ongoing Monitoring
- Annual review of each vendor's security posture
- Vendor incidents reported to Founder / System Administrator within 24 hours
- Vendor contracts include security requirements and audit rights

## 4. Responsibilities
- **Founder / System Administrator**: Maintain vendor list, conduct annual reviews
- **All Personnel**: Report vendor security concerns

## 5. Evidence
- Vendor inventory spreadsheet (updated annually)
- Vendor SOC 2 reports on file
- Vendor assessment records`
  },
  {
    name: "Incident Response Plan",
    category: "operations",
    content: `# Incident Response Plan

## 1. Purpose
Define procedures for identifying, responding to, and recovering from security incidents.

## 2. Scope
All security incidents affecting company systems, data, or operations.

## 3. Policy

### Incident Classification
- **Critical**: Data breach, unauthorized data access, system compromise
- **High**: Service outage, suspected intrusion, multi-tenant isolation failure
- **Medium**: Unusual activity, failed login attempts, configuration error
- **Low**: Minor policy violation, false positive alerts

### Response Procedures
1. **Detect**: Identify the incident through monitoring, alerts, or reports
2. **Contain**: Isolate affected systems within 1 hour for Critical/High
3. **Investigate**: Determine root cause, scope, and impact
4. **Remediate**: Fix the vulnerability, restore services
5. **Notify**: Inform affected parties per legal requirements
6. **Document**: Record all actions in incident log within 24 hours
7. **Review**: Conduct post-incident review within 7 days

### Multi-Tenant Incidents
- Any cross-tenant data exposure is automatically Critical
- Affected organizations must be notified within 72 hours
- Root cause analysis must include tenant isolation review

## 4. Responsibilities
- **Founder / System Administrator**: Lead incident response, make notification decisions
- **All Personnel**: Report suspected incidents immediately

## 5. Evidence
- Incident response log (per incident)
- Post-incident review report
- Notification records (if applicable)`
  },
  {
    name: "Logging & Monitoring Policy",
    category: "operations",
    content: `# Logging & Monitoring Policy

## 1. Purpose
Ensure adequate logging and monitoring to detect and investigate security events.

## 2. Scope
All production systems, databases, and cloud infrastructure.

## 3. Policy

### Logging Requirements
- Authentication events (login, logout, failed attempts) logged
- Data access events logged (especially cross-tenant query attempts)
- System changes logged (configuration, deployment)
- Logs must include: timestamp, user, action, resource, result

### Log Retention
- Minimum 90 days online retention
- Minimum 1 year archive retention
- Logs must not be modified or deleted during retention period

### Monitoring & Review
- Weekly review of authentication logs for anomalies
- Automated alerts for: failed login attempts (5+ in 10 min), unauthorized access attempts
- Monthly review of system activity logs

### Log Protection
- Logs stored in separate, access-controlled storage
- Only Founder / System Administrator has access to raw logs
- Log integrity verified monthly

## 4. Responsibilities
- **Founder / System Administrator**: Configure logging, conduct weekly reviews, respond to alerts
- **All Personnel**: N/A (automated)

## 5. Evidence
- Weekly log review records with findings
- Alert configuration screenshots
- Log retention configuration documentation`
  },
  {
    name: "Backup & Recovery Policy",
    category: "operations",
    content: `# Backup & Recovery Policy

## 1. Purpose
Ensure data can be recovered in the event of data loss, corruption, or disaster.

## 2. Scope
All production databases, configurations, and critical files.

## 3. Policy

### Backup Schedule
- Automated daily backups of all production databases
- Configuration backups after every infrastructure change
- Code repository hosted on GitHub (inherent redundancy)

### Backup Storage
- Backups stored in a separate region/availability zone
- Backups encrypted at rest (AES-256)
- Backup access restricted to Founder / System Administrator

### Restore Testing
- Quarterly restore test from backup to verify data integrity
- Restore test documented with: date, backup used, result, time to restore
- Failed restore tests trigger immediate investigation

### Retention
- Daily backups retained for 30 days
- Monthly backups retained for 12 months

## 4. Responsibilities
- **Founder / System Administrator**: Configure backups, conduct quarterly restore tests
- **All Personnel**: N/A (automated)

## 5. Evidence
- Backup configuration screenshots (annually)
- Quarterly restore test records
- Monthly backup verification checks`
  },
  {
    name: "Business Continuity Plan",
    category: "operations",
    content: `# Business Continuity Plan

## 1. Purpose
Ensure critical business operations continue during and after a disruption.

## 2. Scope
All critical systems and services required to operate the business.

## 3. Policy

### Recovery Objectives
- Recovery Time Objective (RTO): 4 hours for critical services
- Recovery Point Objective (RPO): 24 hours (daily backups)

### Critical Systems
1. Production application and database
2. Authentication and authorization services
3. Email and communication systems
4. Code repository (GitHub)

### Continuity Procedures
- Primary cloud region failure: failover to backup region within 4 hours
- Database corruption: restore from most recent backup
- Third-party service outage: switch to alternative or communicate delay

### Communication
- Founder / System Administrator leads communication during incidents
- Customer notification within 24 hours for service-affecting events
- Status page updated with current status

### Testing
- Annually review and update this plan
- Annually test backup restoration procedure

## 4. Responsibilities
- **Founder / System Administrator**: Maintain plan, lead recovery, communicate with customers

## 5. Evidence
- Annual plan review record
- Backup restore test results (quarterly)
- Incident communication logs (per event)`
  },
  {
    name: "Onboarding & Offboarding Policy",
    category: "hr_people",
    content: `# Onboarding & Offboarding Policy

## 1. Purpose
Ensure secure provisioning and deprovisioning of personnel access.

## 2. Scope
All employees and contractors.

## 3. Policy

### Onboarding (within first day)
1. Create accounts with least-privilege access
2. Enable MFA on all accounts
3. Provide security awareness training materials
4. Obtain signed Acceptable Use Policy acknowledgment
5. Document access granted in onboarding checklist

### During Employment
- Access adjusted only with Founder / System Administrator approval
- Annual review of access appropriateness

### Offboarding (within 4 business hours of termination)
1. Disable all accounts: email, cloud, GitHub, application, third-party tools
2. Revoke API keys and tokens
3. Collect any company devices
4. Remove from all shared folders and communication channels
5. Document deprovisioning in offboarding checklist

## 4. Responsibilities
- **Founder / System Administrator**: Execute onboarding/offboarding checklists
- **New Personnel**: Complete training, sign policies

## 5. Evidence
- Completed onboarding checklist (per hire)
- Completed offboarding checklist (per termination)
- Signed Acceptable Use Policy acknowledgment`
  },
  {
    name: "Security Awareness & Training Policy",
    category: "hr_people",
    content: `# Security Awareness & Training Policy

## 1. Purpose
Ensure all personnel understand their security responsibilities.

## 2. Scope
All employees and contractors.

## 3. Policy

### Initial Training (within first week)
- Security awareness overview: phishing, social engineering, password hygiene
- Review of all security policies (this document set)
- Multi-tenant security awareness: importance of data isolation
- Signed acknowledgment of understanding

### Ongoing Training
- Annual security awareness refresher training
- Training within 30 days of any significant security policy change
- Phishing simulation exercise annually

### Training Content
- Password security and MFA usage
- Recognizing phishing and social engineering
- Data handling and classification
- Incident reporting procedures
- Multi-tenant data isolation responsibilities

## 4. Responsibilities
- **Founder / System Administrator**: Deliver training, track completion
- **All Personnel**: Complete required training on schedule

## 5. Evidence
- Training completion records (per employee, per event)
- Signed acknowledgments
- Phishing simulation results (annually)`
  },
  {
    name: "Data Classification Policy",
    category: "data_management",
    content: `# Data Classification Policy

## 1. Purpose
Define data classification levels and handling requirements.

## 2. Scope
All data processed, stored, or transmitted by the company.

## 3. Policy

### Classification Levels

| Level | Description | Examples |
|-------|-------------|----------|
| **Confidential** | Customer data, credentials, API keys | Organization data, user PII, passwords |
| **Internal** | Internal business data | Financial records, employee records, policies |
| **Public** | Intended for public access | Marketing materials, public documentation |

### Handling Requirements

| Requirement | Confidential | Internal | Public |
|-------------|-------------|----------|--------|
| Encryption at rest | Required | Required | Optional |
| Encryption in transit | Required | Required | Optional |
| Access control | Strict (need-to-know) | Role-based | Open |
| Backup | Required | Required | Optional |
| Disposal | Secure delete | Secure delete | Standard |

### Multi-Tenant Data
- All customer data is classified as Confidential
- Organization codes and site codes are Confidential
- Cross-tenant data access is never permitted
- Data queries must always be scoped to the requesting organization

## 4. Responsibilities
- **Founder / System Administrator**: Classify data, enforce handling requirements
- **All Personnel**: Handle data according to classification

## 5. Evidence
- Data classification inventory (annually)
- Encryption configuration documentation`
  },
  {
    name: "Data Retention & Disposal Policy",
    category: "data_management",
    content: `# Data Retention & Disposal Policy

## 1. Purpose
Define how long data is retained and how it is securely disposed of.

## 2. Scope
All data processed, stored, or transmitted by the company.

## 3. Policy

### Retention Periods

| Data Type | Retention Period |
|-----------|-----------------|
| Customer application data | Duration of contract + 30 days |
| Authentication logs | 1 year |
| System logs | 1 year |
| Backups | 12 months |
| Employee records | Duration of employment + 3 years |
| Financial records | 7 years |
| Incident reports | 3 years |
| Contracts | Duration + 3 years |

### Disposal Procedures
- Electronic data: Secure deletion (overwrite or cryptographic erasure)
- Cloud storage: Use provider's secure deletion features
- Backups containing deleted data: Expire per retention schedule
- Physical media: Not applicable (cloud-only infrastructure)

### Customer Data Deletion
- Upon contract termination: customer notified, data exported if requested
- Data deleted within 30 days of termination
- Deletion confirmation provided to customer

## 4. Responsibilities
- **Founder / System Administrator**: Enforce retention schedules, execute disposal
- **All Personnel**: Follow disposal procedures, do not retain data beyond policy

## 5. Evidence
- Data retention schedule documentation
- Disposal/deletion confirmation records
- Customer data deletion certificates`
  }
];