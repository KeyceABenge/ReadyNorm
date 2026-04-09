import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileText, Download, Copy, CheckCircle2, Shield, 
  Lock, Database, Key, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

const PLATFORM_REQUIREMENTS = [
  {
    category: "Encryption",
    icon: Lock,
    color: "text-blue-600 bg-blue-50",
    requirements: [
      {
        id: "enc-1",
        title: "Encryption at Rest",
        description: "All data stored in the database must be encrypted using AES-256 or equivalent.",
        soc2_control: "CC6.1",
        priority: "critical"
      },
      {
        id: "enc-2",
        title: "Encryption in Transit",
        description: "All data transmitted between clients and servers must use TLS 1.2 or higher.",
        soc2_control: "CC6.1",
        priority: "critical"
      },
      {
        id: "enc-3",
        title: "Key Management",
        description: "Encryption keys must be stored securely, rotated periodically, and access-controlled.",
        soc2_control: "CC6.1",
        priority: "high"
      }
    ]
  },
  {
    category: "Authentication & Access Control",
    icon: Key,
    color: "text-purple-600 bg-purple-50",
    requirements: [
      {
        id: "auth-1",
        title: "Multi-Factor Authentication (MFA)",
        description: "MFA must be available and enforceable for admin/privileged user roles.",
        soc2_control: "CC6.1, CC6.2",
        priority: "critical"
      },
      {
        id: "auth-2",
        title: "Session Timeout",
        description: "Configurable session timeout (recommended: 15-30 minutes of inactivity) with automatic logout.",
        soc2_control: "CC6.1",
        priority: "high"
      },
      {
        id: "auth-3",
        title: "Password Policy",
        description: "Enforce minimum password complexity (length, special characters) and prevent password reuse.",
        soc2_control: "CC6.1",
        priority: "high"
      },
      {
        id: "auth-4",
        title: "Account Lockout",
        description: "Automatic account lockout after failed login attempts (e.g., 5 attempts).",
        soc2_control: "CC6.1",
        priority: "medium"
      },
      {
        id: "auth-5",
        title: "Role-Based Access Control",
        description: "Granular RBAC with ability to define custom roles and permissions at entity/field level.",
        soc2_control: "CC6.2, CC6.3",
        priority: "high"
      }
    ]
  },
  {
    category: "Audit Logging",
    icon: FileText,
    color: "text-amber-600 bg-amber-50",
    requirements: [
      {
        id: "audit-1",
        title: "Immutable Audit Logs",
        description: "Audit logs must be write-once/append-only. Users (including admins) must not be able to modify or delete logs.",
        soc2_control: "CC7.2, CC7.3",
        priority: "critical"
      },
      {
        id: "audit-2",
        title: "Comprehensive Logging",
        description: "Log all user actions: login/logout, data access, create/update/delete operations, permission changes, and failed access attempts.",
        soc2_control: "CC7.2",
        priority: "critical"
      },
      {
        id: "audit-3",
        title: "Log Retention",
        description: "Audit logs must be retained for a minimum of 1 year (preferably 3+ years for compliance).",
        soc2_control: "CC7.4",
        priority: "high"
      },
      {
        id: "audit-4",
        title: "Log Export",
        description: "Ability to export audit logs in standard formats (CSV, JSON) for external analysis and evidence.",
        soc2_control: "CC7.2",
        priority: "medium"
      },
      {
        id: "audit-5",
        title: "Tamper-Evident Logs",
        description: "Logs should include checksums or cryptographic signatures to detect tampering.",
        soc2_control: "CC7.3",
        priority: "medium"
      }
    ]
  },
  {
    category: "Data Protection & Backup",
    icon: Database,
    color: "text-green-600 bg-green-50",
    requirements: [
      {
        id: "data-1",
        title: "Automated Backups",
        description: "Regular automated backups (at least daily) with point-in-time recovery capability.",
        soc2_control: "A1.2",
        priority: "critical"
      },
      {
        id: "data-2",
        title: "Backup Encryption",
        description: "All backups must be encrypted at rest.",
        soc2_control: "CC6.1, A1.2",
        priority: "high"
      },
      {
        id: "data-3",
        title: "Geographic Redundancy",
        description: "Data should be replicated across multiple geographic regions for disaster recovery.",
        soc2_control: "A1.2",
        priority: "medium"
      },
      {
        id: "data-4",
        title: "Data Isolation",
        description: "Multi-tenant data must be logically isolated to prevent cross-tenant access.",
        soc2_control: "CC6.1",
        priority: "critical"
      }
    ]
  },
  {
    category: "Infrastructure Security",
    icon: Shield,
    color: "text-red-600 bg-red-50",
    requirements: [
      {
        id: "infra-1",
        title: "SOC 2 Certified Infrastructure",
        description: "Confirm Base44 uses SOC 2 certified cloud providers (AWS, GCP, Azure) and inherits their controls.",
        soc2_control: "CC2.1",
        priority: "critical"
      },
      {
        id: "infra-2",
        title: "Vulnerability Management",
        description: "Regular vulnerability scanning and patching of infrastructure components.",
        soc2_control: "CC7.1",
        priority: "high"
      },
      {
        id: "infra-3",
        title: "Penetration Testing",
        description: "Annual third-party penetration testing with remediation of findings.",
        soc2_control: "CC7.1",
        priority: "medium"
      },
      {
        id: "infra-4",
        title: "DDoS Protection",
        description: "Protection against distributed denial-of-service attacks.",
        soc2_control: "A1.1",
        priority: "medium"
      }
    ]
  },
  {
    category: "Incident Response",
    icon: AlertTriangle,
    color: "text-orange-600 bg-orange-50",
    requirements: [
      {
        id: "ir-1",
        title: "Security Incident Notification",
        description: "Base44 must notify customers of security incidents affecting their data within 72 hours.",
        soc2_control: "CC7.4, CC7.5",
        priority: "critical"
      },
      {
        id: "ir-2",
        title: "Incident Response Plan",
        description: "Base44 must have a documented incident response plan and provide evidence upon request.",
        soc2_control: "CC7.4",
        priority: "high"
      }
    ]
  }
];

export default function SOC2PlatformRequirements({ organizationName = "Your Organization" }) {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleItem = (id) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const allRequirements = PLATFORM_REQUIREMENTS.flatMap(cat => cat.requirements);
  const criticalCount = allRequirements.filter(r => r.priority === "critical").length;
  const highCount = allRequirements.filter(r => r.priority === "high").length;

  const generateDocument = () => {
    const date = format(new Date(), "MMMM d, yyyy");
    
    let doc = `SOC 2 PLATFORM REQUIREMENTS DOCUMENT
=====================================
Organization: ${organizationName}
Date: ${date}
Prepared for: Base44 Support Team

EXECUTIVE SUMMARY
-----------------
This document outlines the platform-level security controls required for our organization to achieve SOC 2 Type II compliance. We request confirmation that these controls are implemented, or a timeline for implementation.

Total Requirements: ${allRequirements.length}
Critical Priority: ${criticalCount}
High Priority: ${highCount}

REQUIREMENTS BY CATEGORY
------------------------

`;

    PLATFORM_REQUIREMENTS.forEach(category => {
      doc += `\n${category.category.toUpperCase()}\n${"=".repeat(category.category.length)}\n\n`;
      
      category.requirements.forEach((req, idx) => {
        doc += `${idx + 1}. ${req.title} [${req.priority.toUpperCase()}]\n`;
        doc += `   SOC 2 Control: ${req.soc2_control}\n`;
        doc += `   Requirement: ${req.description}\n\n`;
      });
    });

    doc += `
REQUESTED ACTIONS
-----------------
1. Please confirm which of the above controls are currently implemented.
2. For any controls not yet implemented, provide an estimated timeline.
3. Please provide any SOC 2 Type I/II reports or bridge letters available.
4. Confirm if Base44's infrastructure providers (AWS/GCP/Azure) are SOC 2 certified.

CONTACT
-------
Please respond to this request within 10 business days.

Thank you for your support in helping us achieve SOC 2 compliance.
`;

    return doc;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateDocument());
  };

  const downloadDocument = () => {
    const doc = generateDocument();
    const blob = new Blob([doc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOC2_Platform_Requirements_${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const priorityColors = {
    critical: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800"
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Base44 Platform Requirements for SOC 2
          </CardTitle>
          <CardDescription>
            Review and export this document to send to Base44 support for confirmation of platform-level security controls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Button onClick={copyToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button variant="outline" onClick={downloadDocument}>
              <Download className="w-4 h-4 mr-2" />
              Download as Text
            </Button>
          </div>

          <div className="flex gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <Badge className={priorityColors.critical}>Critical</Badge>
              <span>{criticalCount} requirements</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={priorityColors.high}>High</Badge>
              <span>{highCount} requirements</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={priorityColors.medium}>Medium</Badge>
              <span>{allRequirements.length - criticalCount - highCount} requirements</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {PLATFORM_REQUIREMENTS.map(category => {
        const Icon = category.icon;
        return (
          <Card key={category.category}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className={`p-2 rounded-lg ${category.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {category.category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.requirements.map(req => (
                <div 
                  key={req.id}
                  className={`p-4 rounded-lg border ${checkedItems[req.id] ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={checkedItems[req.id] || false}
                      onCheckedChange={() => toggleItem(req.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{req.title}</span>
                        <Badge className={priorityColors[req.priority]} variant="outline">
                          {req.priority}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          {req.soc2_control}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{req.description}</p>
                    </div>
                    {checkedItems[req.id] && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}