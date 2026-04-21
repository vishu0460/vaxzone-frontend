import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export default function BookingStatusChart({
  data = [],
  onItemClick,
  height = 320,
  centerLabel = 'Total',
  innerRadius = 72,
  outerRadius = 112
}) {
  const total = data.reduce((sum, item) => sum + Number(item?.value || 0), 0);

  return (
    <div style={{ width: '100%', height }} className="dashboard-donut-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={4}
            onClick={(payload) => onItemClick?.(payload)}
            style={{ cursor: onItemClick ? 'pointer' : 'default' }}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [value, name]}
            wrapperStyle={{ outline: 'none' }}
            contentStyle={{
              backgroundColor: 'var(--chart-tooltip-bg)',
              color: 'var(--chart-tooltip-text)',
              borderRadius: '0.85rem',
              border: '1px solid var(--chart-tooltip-border)',
              boxShadow: 'var(--chart-tooltip-shadow)'
            }}
            labelStyle={{ color: 'var(--chart-tooltip-text)' }}
            itemStyle={{ color: 'var(--chart-tooltip-text)' }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="dashboard-donut-chart__center">
        <span>{centerLabel}</span>
        <strong>{total}</strong>
      </div>

      <div className="dashboard-donut-chart__legend">
        {data.map((item) => (
          <button
            key={item.key}
            type="button"
            className="dashboard-donut-chart__legend-item"
            onClick={() => onItemClick?.(item)}
          >
            <span className="dashboard-donut-chart__legend-dot" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
