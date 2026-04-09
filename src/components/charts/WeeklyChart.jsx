import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function WeeklyChart({ data }) {
  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">Weekly Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
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
                formatter={(value) => <span className="text-sm text-slate-600 capitalize">{value}</span>}
              />
              <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
              <Bar dataKey="assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Assigned" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-slate-500">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}