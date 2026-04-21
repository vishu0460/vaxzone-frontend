import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const BAR_COLORS = {
  users: '#0284c7',
  admins: '#6d28d9',
  centers: '#d97706',
  drives: '#dc2626',
  slots: '#059669'
};

export default function SystemOverviewChart({ data = [], onItemClick }) {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)' }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)' }} />
          <Tooltip
            cursor={{ fill: 'var(--chart-cursor)' }}
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
          <Bar
            dataKey="value"
            radius={[12, 12, 0, 0]}
            barSize={42}
            onClick={(payload) => onItemClick?.(payload)}
            style={{ cursor: onItemClick ? 'pointer' : 'default' }}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={BAR_COLORS[entry.key] || '#0284c7'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
