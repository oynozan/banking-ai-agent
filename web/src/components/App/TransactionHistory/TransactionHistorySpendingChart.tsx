'use client'

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type SpendingPoint = {
    month: string;
    spending: number;
};

const RANGE_OPTIONS = [
    { label: "Last 3 months", value: 3 },
    { label: "Last 6 months", value: 6 },
    { label: "Last 12 months", value: 12 },
];

export default function TransactionHistorySpendingChart() {
    const [range, setRange] = useState(6);
    const [data, setData] = useState<SpendingPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchTrend = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem("accessToken");
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;

                if (!token || !apiUrl) {
                    throw new Error("Missing authentication or API configuration");
                }

                const response = await fetch(`${apiUrl}/stats/spending-trend?months=${range}`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch spending trend");
                }

                const payload = await response.json();
                if (isMounted) {
                    setData(payload.months ?? []);
                }
            } catch (err) {
                console.error(err);
                if (isMounted) {
                    setError("Unable to load spending data.");
                    setData([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchTrend();

        return () => {
            isMounted = false;
        };
    }, [range]);

    const renderChart = () => {
        if (isLoading) {
            return <div className="py-12 text-center text-muted-foreground">Loading spending trend…</div>;
        }

        if (error) {
            return <div className="py-12 text-center text-red-400">{error}</div>;
        }

        if (data.length === 0) {
            return <div className="py-12 text-center text-muted-foreground">No spending data yet.</div>;
        }

        return (
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2e30" />
                    <XAxis dataKey="month" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1a1d1f",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                            color: "#ffffff",
                        }}
                        cursor={{ fill: "rgba(255, 215, 0, 0.1)" }}
                        formatter={value => [`${Number(value).toFixed(2)} PLN`, "Spending"]}
                    />
                    <Bar dataKey="spending" fill="#ffd700" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    return (
        <div className="bg-card border border-gold/30 hover:border-gold/45 transition-all shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3>Spending Overview</h3>
                <select
                    className="px-3 py-1 bg-muted border border-border rounded-lg text-sm"
                    value={range}
                    onChange={event => setRange(Number(event.target.value))}
                >
                    {RANGE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
            {renderChart()}
        </div>
    );
}
