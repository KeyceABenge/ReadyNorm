import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, Lock } from "lucide-react";
import { ReadyNormLogoText } from "@/components/brand/ReadyNormLogo";
import ReactMarkdown from "react-markdown";

const PRIVACY_POLICY = `# Privacy Policy

*Last Updated: March 2026*

## 1. Introduction

ReadyNorm ("we," "us," "our") operates a cloud-based platform for food safety and sanitation management. This Privacy Policy explains how we collect, use, and protect your personal information.

## 2. Information We Collect

### Information You Provide
- **Account Information**: Name, email address, organization details
- **Usage Data**: Task completions, inspection records, training records
- **Uploaded Content**: Documents, photos, signatures

### Automatically Collected Information
- Authentication events (login times, IP addresses)
- Device information (browser type, operating system)
- Application usage patterns

## 3. How We Use Your Information

- To provide and maintain our services
- To authenticate and authorize your access
- To send service-related notifications
- To improve our platform and user experience
- To comply with legal obligations

## 4. Data Isolation & Multi-Tenancy

- Your organization's data is logically isolated from other organizations
- Users can only access data within their assigned organization and sites
- Backend authorization enforces strict data boundaries
- No cross-organization data sharing occurs

## 5. Data Security

- All data encrypted at rest (AES-256) and in transit (TLS 1.2+)
- Multi-factor authentication available for all accounts
- Regular security assessments and monitoring
- Automated daily backups with quarterly restore testing

## 6. Data Retention

- Account data: retained for duration of service plus 30 days
- System logs: retained for 1 year
- Backups: retained per our backup policy (up to 12 months)
- Upon account termination: data deleted within 30 days

## 7. Your Rights

You have the right to:
- Access your personal data
- Request correction of inaccurate data
- Request deletion of your data
- Export your data in a standard format
- Withdraw consent where applicable

## 8. Third-Party Services

We use select third-party services to operate our platform. All vendors are assessed for security compliance and maintain appropriate data protection agreements.

## 9. Changes to This Policy

We may update this policy periodically. Material changes will be communicated via email or in-app notification.

## 10. Contact

For privacy-related inquiries, contact us at: privacy@readynorm.com
`;

const TERMS_OF_SERVICE = `# Terms of Service

*Last Updated: March 2026*

## 1. Acceptance of Terms

By accessing or using ReadyNorm ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.

## 2. Description of Service

ReadyNorm provides a cloud-based platform for managing sanitation programs, quality management systems, and food safety compliance for food manufacturing facilities.

## 3. Account Responsibilities

- You are responsible for maintaining the confidentiality of your account credentials
- You must provide accurate and complete registration information
- You are responsible for all activity under your account
- You must notify us immediately of any unauthorized use

## 4. Acceptable Use

You agree NOT to:
- Access data belonging to other organizations
- Attempt to bypass security controls or access restrictions
- Share your credentials with unauthorized persons
- Use the Service for any illegal purpose
- Attempt to reverse-engineer or decompile the Service

## 5. Data Ownership

- You retain ownership of all data you enter into the Service
- We do not sell your data to third parties
- We may use anonymized, aggregated data for service improvement

## 6. Service Availability

- We strive for 99.9% uptime but do not guarantee uninterrupted service
- Planned maintenance will be communicated in advance when possible
- Our liability for service interruptions is limited per our SLA

## 7. Payment Terms

- Subscription fees are billed per the selected plan
- Fees are non-refundable except as required by law
- We reserve the right to adjust pricing with 30 days notice

## 8. Termination

- Either party may terminate with 30 days written notice
- Upon termination, your data will be available for export for 30 days
- After the export period, data is permanently deleted

## 9. Limitation of Liability

To the maximum extent permitted by law, ReadyNorm's total liability shall not exceed the fees paid by you in the 12 months preceding the claim.

## 10. Governing Law

These Terms are governed by the laws of the State of Texas, United States.

## 11. Contact

For questions about these Terms, contact us at: legal@readynorm.com
`;

const SECURITY_OVERVIEW = `# Security Overview

*Our platform is designed following industry-standard security practices.*

## How We Protect Your Data

### Encryption
Data is encrypted in transit and at rest to safeguard your information at every stage.

### Access Controls
Access is restricted using authentication and role-based controls, ensuring only authorized users can view or modify data.

### Multi-Tenant Data Isolation
Multi-tenant data isolation is enforced between organizations and sites. Your data is logically separated and cannot be accessed by other organizations.

### Monitoring & Logging
System activity is logged and monitored to detect and respond to potential security events.

### Backups
Regular backups are performed to protect against data loss and ensure business continuity.

## Our Commitment

We are working toward SOC 2 compliance as part of our ongoing commitment to security and trust. We continuously evaluate and improve our security practices to meet the evolving needs of our customers.

## Contact

For security-related inquiries, contact us at: security@readynorm.com
`;

export default function PublicPolicies() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "privacy";
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <ReadyNormLogoText className="h-8 w-auto mx-auto mb-6 text-slate-900" />
          <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Trust Center
          </h1>
          <p className="text-slate-500 mt-2">Our commitment to protecting your data, privacy, and trust</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white border w-full justify-start">
            <TabsTrigger value="privacy" className="gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Privacy Policy
            </TabsTrigger>
            <TabsTrigger value="terms" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Terms of Service
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="privacy" className="mt-6">
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="prose prose-sm prose-slate max-w-none">
                  <ReactMarkdown>{PRIVACY_POLICY}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms" className="mt-6">
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="prose prose-sm prose-slate max-w-none">
                  <ReactMarkdown>{TERMS_OF_SERVICE}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="prose prose-sm prose-slate max-w-none">
                  <ReactMarkdown>{SECURITY_OVERVIEW}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-8 text-sm text-slate-400">
          © {new Date().getFullYear()} ReadyNorm. All rights reserved.
        </div>
      </div>
    </div>
  );
}