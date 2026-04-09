import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

const SCHEDULE = [
  {
    frequency: "Weekly",
    color: "bg-blue-100 text-blue-700",
    items: [
      { control: "Authentication Log Review", owner: "Founder / System Administrator", evidence: "Weekly log review record" }
    ]
  },
  {
    frequency: "Monthly",
    color: "bg-purple-100 text-purple-700",
    items: [
      { control: "Backup Verification", owner: "Founder / System Administrator", evidence: "Backup log screenshots" },
      { control: "System Activity Log Review", owner: "Founder / System Administrator", evidence: "Monthly log review summary" }
    ]
  },
  {
    frequency: "Quarterly",
    color: "bg-amber-100 text-amber-700",
    items: [
      { control: "Access Review", owner: "Founder / System Administrator", evidence: "User export + review record" },
      { control: "Backup Restore Test", owner: "Founder / System Administrator", evidence: "Restore test report" },
      { control: "MFA Enforcement Check", owner: "Founder / System Administrator", evidence: "MFA config screenshots" },
      { control: "Alert Configuration Check", owner: "Founder / System Administrator", evidence: "Alert settings screenshots" },
      { control: "Risk Register Review", owner: "Founder / System Administrator", evidence: "Updated risk register" },
      { control: "Tenant Isolation Testing", owner: "Founder / System Administrator", evidence: "Cross-tenant test results" },
      { control: "Site-Level Access Verification", owner: "Founder / System Administrator", evidence: "Access test results" },
      { control: "RLS Audit", owner: "Founder / System Administrator", evidence: "Code review findings" }
    ]
  },
  {
    frequency: "Annually",
    color: "bg-rose-100 text-rose-700",
    items: [
      { control: "Risk Assessment", owner: "Founder / System Administrator", evidence: "Risk assessment report" },
      { control: "Vendor Review", owner: "Founder / System Administrator", evidence: "Vendor review records" },
      { control: "Vendor Inventory Update", owner: "Founder / System Administrator", evidence: "Updated vendor list" },
      { control: "Backup Encryption Verification", owner: "Founder / System Administrator", evidence: "Encryption config screenshot" },
      { control: "Incident Response Plan Test", owner: "Founder / System Administrator", evidence: "Tabletop exercise report" },
      { control: "Security Awareness Training", owner: "Founder / System Administrator", evidence: "Training completion records" },
      { control: "Business Continuity Plan Review", owner: "Founder / System Administrator", evidence: "Plan review record" },
      { control: "Policy Review (all policies)", owner: "Founder / System Administrator", evidence: "Updated policies with sign-off" }
    ]
  },
  {
    frequency: "Per Event",
    color: "bg-slate-100 text-slate-700",
    items: [
      { control: "Deprovisioning on Termination", owner: "Founder / System Administrator", evidence: "Offboarding checklist" },
      { control: "Code Change via PR", owner: "All Developers", evidence: "GitHub PR history" },
      { control: "Code Review", owner: "All Developers", evidence: "PR approval records" },
      { control: "Deployment Logging", owner: "Founder / System Administrator", evidence: "Deployment log entries" },
      { control: "Incident Documentation", owner: "Founder / System Administrator", evidence: "Incident report" },
      { control: "Post-Incident Review", owner: "Founder / System Administrator", evidence: "Post-incident review report" }
    ]
  }
];

export default function SOC2ScheduleTab({ controls }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Control Execution Schedule</h2>
        <p className="text-sm text-slate-500 mt-1">Recurring schedule for all SOC 2 controls. Use this to plan your compliance activities.</p>
      </div>

      {SCHEDULE.map(group => (
        <Card key={group.frequency}>
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Badge className={group.color}>{group.frequency}</Badge>
              <span className="text-sm text-slate-500">({group.items.length} controls)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Control</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Owner</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Evidence Required</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Last Completed</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Next Due</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, idx) => {
                    const matchingControl = controls.find(c =>
                      c.control_name?.toLowerCase().includes(item.control.toLowerCase().split(" ")[0])
                    );
                    return (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium text-slate-900">{item.control}</td>
                        <td className="py-2 px-3 text-slate-600">{item.owner}</td>
                        <td className="py-2 px-3 text-slate-600">{item.evidence}</td>
                        <td className="py-2 px-3 text-slate-500">
                          {matchingControl?.last_performed_date ? format(parseISO(matchingControl.last_performed_date), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {matchingControl?.next_due_date ? format(parseISO(matchingControl.next_due_date), "MMM d, yyyy") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Evidence Folder Structure */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Evidence Folder Structure</h3>
          <p className="text-sm text-slate-500 mb-4">Organize your evidence files using this structure:</p>
          <pre className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 font-mono whitespace-pre">
{`/SOC2
  /Policies          — Approved policy documents
  /Evidence
    /Access Reviews  — User exports, review records, sign-offs
    /Logs            — Log review screenshots, summaries
    /Backups         — Config screenshots, restore test reports
    /Incidents       — Incident reports, post-incident reviews
    /Vendors         — Vendor list, SOC 2 reports, review records
    /Risk Assessments — Risk assessment reports, register updates
    /Change Management — PR screenshots, deployment logs
    /Other           — Miscellaneous evidence`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}