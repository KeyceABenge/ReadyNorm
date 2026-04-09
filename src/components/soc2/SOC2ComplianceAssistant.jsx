import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, Send, Loader2, Shield, AlertTriangle, 
  CheckCircle2, FileText, Users, X
} from "lucide-react";
import { invokeLLM } from "@/lib/adapters/integrations";
import ReactMarkdown from "react-markdown";

const QUICK_PROMPTS = [
  { label: "Control Gaps", prompt: "What compliance gaps need immediate attention?", icon: AlertTriangle },
  { label: "Access Review", prompt: "Are there any overdue access reviews?", icon: Users },
  { label: "Evidence Status", prompt: "Summarize our current evidence collection status for SOC 2", icon: FileText },
  { label: "Control Health", prompt: "Which controls have failed testing or need retesting?", icon: Shield }
];

export default function SOC2ComplianceAssistant({ 
  controls, 
  accessReviews, 
  evidencePackages,
  auditLogs,
  onClose 
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `I'm your SOC 2 Compliance Assistant. I can help you:

• **Monitor controls** and identify gaps
• **Track access reviews** and flag overdue items
• **Assemble evidence** and explain it for auditors
• **Analyze audit logs** for anomalies

**Important:** I observe and report only. I cannot grant access, modify permissions, or enforce security rules - those must be handled through approved system controls.

How can I help you today?`
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildContext = () => {
    const implementedControls = controls.filter(c => c.implementation_status === 'fully_implemented').length;
    const testedControls = controls.filter(c => c.test_result === 'passed').length;
    const failedControls = controls.filter(c => c.test_result === 'failed');
    const allGaps = controls.flatMap(c => c.gaps_identified || []).filter(g => g.remediation_status !== 'resolved');
    const overdueReviews = accessReviews.filter(r => r.status !== 'completed' && new Date(r.due_date) < new Date());
    const pendingReviews = accessReviews.filter(r => r.status === 'pending');

    return `
SOC 2 COMPLIANCE STATUS (as of ${new Date().toISOString()}):

CONTROLS:
- Total Controls: ${controls.length}
- Fully Implemented: ${implementedControls}
- Test Results: ${testedControls} passed, ${failedControls.length} failed
- Controls needing attention: ${failedControls.map(c => c.control_id).join(", ") || "None"}

GAPS:
- Open Gaps: ${allGaps.length}
- Critical/High Gaps: ${allGaps.filter(g => g.severity === 'critical' || g.severity === 'high').length}
${allGaps.slice(0, 5).map(g => `  • ${g.description} (${g.severity})`).join("\n")}

ACCESS REVIEWS:
- Overdue Reviews: ${overdueReviews.length}
- Pending Reviews: ${pendingReviews.length}
- Completed Reviews: ${accessReviews.filter(r => r.status === 'completed').length}

EVIDENCE PACKAGES:
- Total Packages: ${evidencePackages.length}
- Ready for Review: ${evidencePackages.filter(p => p.status === 'ready_for_review').length}

RECENT AUDIT ACTIVITY:
- Total Audit Logs: ${auditLogs.length}
- Last 24h Actions: ${auditLogs.filter(l => new Date(l.timestamp) > new Date(Date.now() - 86400000)).length}
`;
  };

  const handleSend = async (promptOverride) => {
    const userMessage = promptOverride || input;
    if (!userMessage.trim()) return;

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const context = buildContext();
      
      const response = await invokeLLM({
        prompt: `You are a SOC 2 Compliance Assistant. You OBSERVE and REPORT only.

CRITICAL RESTRICTIONS - You CANNOT and MUST NEVER:
- Grant or revoke user access
- Modify permissions or roles  
- Enforce security rules or policies
- Make changes to system configurations
- Approve or reject access requests

If asked to perform these actions, politely decline and explain that security controls must be enforced by human-approved system controls.

CURRENT COMPLIANCE STATUS:
${context}

USER QUESTION: ${userMessage}

Provide a helpful, accurate response based on the compliance data above. Be specific with control IDs, dates, and numbers. If identifying issues, explain the compliance risk and suggest next steps (that a human would take).`,
        response_json_schema: {
          type: "object",
          properties: {
            response: { type: "string" }
          }
        }
      });

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response.response 
      }]);

    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I encountered an error processing your request. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
            SOC 2 Compliance Assistant
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 mt-2">
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Read-Only
          </Badge>
          <Badge variant="outline" className="text-xs">
            Observation Mode
          </Badge>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div 
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-lg p-3 ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-900'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-slate">
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex-shrink-0 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => handleSend(prompt.prompt)}
              disabled={loading}
              className="text-xs"
            >
              <prompt.icon className="w-3 h-3 mr-1" />
              {prompt.label}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about compliance status, gaps, or evidence..."
            disabled={loading}
          />
          <Button onClick={() => handleSend()} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}