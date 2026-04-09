import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function CompletionChart({ data }) {
  const chartData = [
    { name: "Completed", value: data.completed || 0 },
    { name: "In Progress", value: data.in_progress || 0 },
    { name: "Pending", value: data.pending || 0 },
    { name: "Overdue", value: data.overdue || 0 },
    { name: "Verified", value: data.verified || 0 }
  ].filter(item => item.value > 0);

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">Task Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  borderRadius: "8px", 
                  border: "none", 
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" 
                }} 
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-slate-500">
            No tasks to display
          </div>
        )}
      </CardContent>
    </Card>
  );
}