'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
    { month: "Jun", spending: 4200 },
    { month: "Jul", spending: 3800 },
    { month: "Aug", spending: 5100 },
    { month: "Sep", spending: 4600 },
    { month: "Oct", spending: 5400 },
    { month: "Nov", spending: 3200 },
];

export default function TransactionHistorySpendingChart() {
    return (
        <div className="bg-card border border-border p-6">
            <div className="flex items-center justify-between mb-6">
                <h3>Spending Overview</h3>
                <select className="px-3 py-1 bg-muted border border-border rounded-lg text-sm">
                    <option>Last 6 months</option>
                    <option>Last 3 months</option>
                    <option>This year</option>
                </select>
            </div>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2e30" />
                    <XAxis
                        dataKey="month"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1a1d1f',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: '#ffffff'
                        }}
                        cursor={{ fill: 'rgba(255, 215, 0, 0.1)' }}
                    />
                    <Bar dataKey="spending" fill="#ffd700" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
