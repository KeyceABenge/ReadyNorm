// @ts-nocheck
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardCheck, AlertTriangle, CheckCircle2, 
  TrendingUp, Calendar, FileText, ArrowRight, Mail, Loader2 
} from "lucide-react";
import { format, isBefore, isAfter, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AuditDashboard({ 
  standards, sections, scheduledAudits, results, findings, onNavigate, organization 
}) {
  const [sendingReminders, setSendingReminders] = useState(false);
  const [sendingOverdueReminders, setSendingOverdueReminders] = useState(false);
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisMonthAudits = scheduledAudits.filter(a => {
      const due = new Date(a.due_date);
      return due >= monthStart && due <= monthEnd;
    });

    const overdueAudits = scheduledAudits.filter(a => 
      a.status !== "completed" && a.status !== "cancelled" &&
      isBefore(new Date(a.due_date), now)
    );

    const completedThisMonth = thisMonthAudits.filter(a => a.status === "completed");
    
    const openGaps = findings.filter(f => 
      (f.compliance_status === "minor_gap" || f.compliance_status === "major_gap" || f.compliance_status === "critical_gap") &&
      f.corrective_action_status !== "completed" && f.corrective_action_status !== "verified"
    );

    const criticalGaps = openGaps.filter(f => f.compliance_status === "critical_gap");
    const repeatFindings = findings.filter(f => f.is_repeat_finding);

    // Calculate overall compliance
    const assessedFindings = findings.filter(f => f.compliance_status !== "not_assessed" && f.compliance_status !== "not_applicable");
    const compliantFindings = findings.filter(f => f.compliance_status === "compliant");
    const overallCompliance = assessedFindings.length > 0 
      ? Math.round((compliantFindings.length / assessedFindings.length) * 100) 
      : 0;

    return {
      totalStandards: standards.filter(s => s.status === "active").length,
      totalSections: sections.filter(s => s.status === "active").length,
      thisMonthTotal: thisMonthAudits.length,
      thisMonthCompleted: completedThisMonth.length,
      overdueCount: overdueAudits.length,
      openGapsCount: openGaps.length,
      criticalGapsCount: criticalGaps.length,
      repeatFindingsCount: repeatFindings.length,
      overallCompliance,
      overdueAudits: overdueAudits.slice(0, 5),
      upcomingAudits: scheduledAudits
        .filter(a => a.status === "scheduled" && isAfter(new Date(a.due_date), now))
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5)
    };
  }, [standards, sections, scheduledAudits, results, findings]);

  const sendUpcomingReminders = async () => {
    if (stats.upcomingAudits.length === 0) return;
    
    setSendingReminders(true);
    let sentCount = 0;
    
    try {
      for (const audit of stats.upcomingAudits) {
        if (!audit.auditor_email) continue;
        
        const daysUntilDue = differenceInDays(new Date(audit.due_date), new Date());
        const dueDate = format(new Date(audit.due_date), "MMMM d, yyyy");
        
        const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
    .audit-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .audit-card h3 { margin: 0 0 8px 0; color: #1e293b; font-size: 18px; }
    .audit-card .standard { color: #64748b; font-size: 14px; margin-bottom: 16px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; font-size: 14px; }
    .detail-value { color: #1e293b; font-weight: 500; font-size: 14px; }
    .due-badge { display: inline-block; background: ${daysUntilDue <= 7 ? '#fef2f2' : '#f0fdf4'}; color: ${daysUntilDue <= 7 ? '#dc2626' : '#16a34a'}; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
    .footer { background: #f8fafc; padding: 20px 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; text-align: center; color: #64748b; font-size: 13px; }
    .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Upcoming Audit Reminder</h1>
    </div>
    <div class="content">
      <p>Hello ${audit.auditor_name || 'Auditor'},</p>
      <p>This is a friendly reminder that you have an upcoming internal audit scheduled. Please review the details below and ensure you are prepared.</p>
      
      <div class="audit-card">
        <h3>${audit.section_title || 'Audit Section'}</h3>
        <div class="standard">${audit.standard_name || 'Standard'} ${audit.section_number ? `• Section ${audit.section_number}` : ''}</div>
        
        <div class="detail-row">
          <span class="detail-label">Due Date</span>
          <span class="detail-value">${dueDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time Remaining</span>
          <span class="due-badge">${daysUntilDue === 0 ? 'Due Today' : daysUntilDue === 1 ? '1 day remaining' : `${daysUntilDue} days remaining`}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Assigned Auditor</span>
          <span class="detail-value">${audit.auditor_name || 'You'}</span>
        </div>
      </div>

      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Review the audit requirements and checklist</li>
        <li>Gather any necessary documentation</li>
        <li>Schedule time with relevant personnel if needed</li>
        <li>Complete the audit before the due date</li>
      </ul>

      <p>If you have any questions or need to reschedule, please contact your audit program coordinator.</p>
    </div>
    <div class="footer">
      <p>${organization?.name || 'Internal Audit Program'}</p>
      <p style="margin-top: 8px; font-size: 12px;">This is an automated reminder from your audit management system.</p>
    </div>
  </div>
</body>
</html>`;

        await sendEmail({
          to: audit.auditor_email,
          subject: `📋 Audit Reminder: ${audit.section_title} - Due ${dueDate}`,
          body: emailBody
        });
        sentCount++;
      }
      
      toast.success(`Sent ${sentCount} reminder${sentCount !== 1 ? 's' : ''} successfully`);
    } catch (error) {
      console.error("Error sending reminders:", error);
      toast.error("Failed to send some reminders");
    } finally {
      setSendingReminders(false);
    }
  };

  const sendOverdueReminders = async () => {
    if (stats.overdueAudits.length === 0) return;
    
    setSendingOverdueReminders(true);
    let sentCount = 0;
    
    try {
      for (const audit of stats.overdueAudits) {
        if (!audit.auditor_email) continue;
        
        const daysOverdue = differenceInDays(new Date(), new Date(audit.due_date));
        const dueDate = format(new Date(audit.due_date), "MMMM d, yyyy");
        
        const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
    .audit-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .audit-card h3 { margin: 0 0 8px 0; color: #1e293b; font-size: 18px; }
    .audit-card .standard { color: #64748b; font-size: 14px; margin-bottom: 16px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fecaca; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; font-size: 14px; }
    .detail-value { color: #1e293b; font-weight: 500; font-size: 14px; }
    .overdue-badge { display: inline-block; background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
    .footer { background: #f8fafc; padding: 20px 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; text-align: center; color: #64748b; font-size: 13px; }
    .urgent-notice { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .urgent-notice strong { color: #dc2626; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Overdue Audit Notice</h1>
    </div>
    <div class="content">
      <p>Hello ${audit.auditor_name || 'Auditor'},</p>
      
      <div class="urgent-notice">
        <strong>Immediate Attention Required:</strong> The following audit is past its due date and requires your immediate attention.
      </div>
      
      <div class="audit-card">
        <h3>${audit.section_title || 'Audit Section'}</h3>
        <div class="standard">${audit.standard_name || 'Standard'} ${audit.section_number ? `• Section ${audit.section_number}` : ''}</div>
        
        <div class="detail-row">
          <span class="detail-label">Original Due Date</span>
          <span class="detail-value">${dueDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="overdue-badge">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Assigned Auditor</span>
          <span class="detail-value">${audit.auditor_name || 'You'}</span>
        </div>
      </div>

      <p><strong>Required Actions:</strong></p>
      <ul>
        <li>Complete this audit as soon as possible</li>
        <li>If you are unable to complete it, contact your supervisor immediately</li>
        <li>Document any reasons for the delay</li>
      </ul>

      <p>Overdue audits impact our compliance program and may result in audit findings during external audits. Please prioritize completing this audit.</p>
    </div>
    <div class="footer">
      <p>${organization?.name || 'Internal Audit Program'}</p>
      <p style="margin-top: 8px; font-size: 12px;">This is an automated reminder from your audit management system.</p>
    </div>
  </div>
</body>
</html>`;

        await sendEmail({
          to: audit.auditor_email,
          subject: `⚠️ OVERDUE: ${audit.section_title} - ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} past due`,
          body: emailBody
        });
        sentCount++;
      }
      
      toast.success(`Sent ${sentCount} overdue reminder${sentCount !== 1 ? 's' : ''} successfully`);
    } catch (error) {
      console.error("Error sending overdue reminders:", error);
      toast.error("Failed to send some reminders");
    } finally {
      setSendingOverdueReminders(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-600">{label}</p>
            <p className={cn("text-3xl font-bold mt-1", color)}>{value}</p>
            {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
          </div>
          <div className={cn("p-3 rounded-lg", color?.includes("red") ? "bg-red-100" : color?.includes("green") ? "bg-green-100" : color?.includes("amber") ? "bg-amber-100" : "bg-blue-100")}>
            <Icon className={cn("w-5 h-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={ClipboardCheck} 
          label="This Month Progress" 
          value={`${stats.thisMonthCompleted}/${stats.thisMonthTotal}`}
          color="text-blue-600"
          subtext="Audits completed"
        />
        <StatCard 
          icon={AlertTriangle} 
          label="Overdue Audits" 
          value={stats.overdueCount}
          color={stats.overdueCount > 0 ? "text-red-600" : "text-green-600"}
        />
        <StatCard 
          icon={CheckCircle2} 
          label="Overall Compliance" 
          value={`${stats.overallCompliance}%`}
          color={stats.overallCompliance >= 90 ? "text-green-600" : stats.overallCompliance >= 70 ? "text-amber-600" : "text-red-600"}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Open Findings" 
          value={stats.openGapsCount}
          color={stats.criticalGapsCount > 0 ? "text-red-600" : stats.openGapsCount > 5 ? "text-amber-600" : "text-slate-600"}
          subtext={stats.criticalGapsCount > 0 ? `${stats.criticalGapsCount} critical` : null}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Overdue Audits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Overdue Audits
            </CardTitle>
            <div className="flex items-center gap-2">
              {stats.overdueAudits.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={sendOverdueReminders}
                  disabled={sendingOverdueReminders}
                >
                  {sendingOverdueReminders ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-1" />
                  )}
                  Send Reminders
                </Button>
              )}
              {stats.overdueCount > 5 && (
                <Button variant="ghost" size="sm" onClick={() => onNavigate("execute")}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {stats.overdueAudits.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No overdue audits</p>
            ) : (
              <div className="space-y-3">
                {stats.overdueAudits.map(audit => (
                  <div key={audit.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{audit.section_title}</p>
                      <p className="text-xs text-slate-600">{audit.standard_name}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">
                        {differenceInDays(new Date(), new Date(audit.due_date))}d overdue
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">{audit.auditor_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Audits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Upcoming Audits
            </CardTitle>
            <div className="flex items-center gap-2">
              {stats.upcomingAudits.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={sendUpcomingReminders}
                  disabled={sendingReminders}
                >
                  {sendingReminders ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-1" />
                  )}
                  Send Reminders
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onNavigate("plan")}>
                View Plan <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.upcomingAudits.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No upcoming audits scheduled</p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingAudits.map(audit => (
                  <div key={audit.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{audit.section_title}</p>
                      <p className="text-xs text-slate-600">{audit.standard_name}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {format(new Date(audit.due_date), "MMM d")}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">{audit.auditor_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Standards Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              Standards Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {standards.filter(s => s.status === "active").length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-2">No standards configured</p>
                <Button size="sm" onClick={() => onNavigate("standards")}>
                  Add Standards
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {standards.filter(s => s.status === "active").map(standard => {
                  const standardSections = sections.filter(s => s.standard_id === standard.id);
                  const standardResults = results.filter(r => r.standard_id === standard.id);
                  const auditedSections = [...new Set(standardResults.map(r => r.section_id))];
                  const coverage = standardSections.length > 0 
                    ? Math.round((auditedSections.length / standardSections.length) * 100)
                    : 0;

                  return (
                    <div key={standard.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{standard.name}</span>
                        <span className="text-sm text-slate-600">{coverage}%</span>
                      </div>
                      <Progress value={coverage} className="h-2" />
                      <p className="text-xs text-slate-500 mt-1">
                        {auditedSections.length} of {standardSections.length} sections audited
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Findings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Open Findings Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-800">Critical</span>
                <Badge className="bg-red-600">{stats.criticalGapsCount}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-orange-800">Major</span>
                <Badge className="bg-orange-600">
                  {findings.filter(f => f.compliance_status === "major_gap" && f.corrective_action_status !== "completed").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-yellow-800">Minor</span>
                <Badge className="bg-yellow-600">
                  {findings.filter(f => f.compliance_status === "minor_gap" && f.corrective_action_status !== "completed").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-purple-800">Repeat Findings</span>
                <Badge className="bg-purple-600">{stats.repeatFindingsCount}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}