import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)"
];

const TOOLTIP_STYLE = {
  backgroundColor: "var(--chart-tooltip-bg)",
  border: "1px solid var(--chart-tooltip-border)",
  borderRadius: "14px",
  boxShadow: "var(--chart-tooltip-shadow)",
  color: "var(--chart-tooltip-text)"
};

const LEGEND_STYLE = {
  color: "var(--chart-axis)"
};

export default function ChartCard({ title, data, type = "bar" }) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      {title && <h5 className="mb-3">{title}</h5>}
      <ResponsiveContainer width="100%" height="100%">
        {type === "pie" ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="var(--chart-series-primary)"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              itemStyle={{ color: "var(--chart-tooltip-text)" }}
            />
            <Legend wrapperStyle={LEGEND_STYLE} />
          </PieChart>
        ) : (
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fill: "var(--chart-axis)" }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={{ stroke: "var(--chart-grid)" }} />
            <YAxis tick={{ fill: "var(--chart-axis)" }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={{ stroke: "var(--chart-grid)" }} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: "var(--chart-cursor)" }}
              itemStyle={{ color: "var(--chart-tooltip-text)" }}
            />
            <Bar dataKey="value" fill="var(--chart-series-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
