'use client'

import { ArrowDownLeft, ArrowUpRight, Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { mapApiToFrontend } from "@/lib/utils";
import type { Transaction as TransactionListItem } from "./TransactionList";

type FilterType = "all" | "income" | "expense";

type TableTransaction = TransactionListItem & {
    transactionType: "income" | "expense";
    status: "completed" | "pending" | "failed";
};

const PAGE_LIMIT = 50;

export default function TransactionHistory() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchTransactions = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem("accessToken");
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;

                if (!token || !apiUrl) {
                    throw new Error("Missing authentication or API configuration");
                }

                const response = await fetch(`${apiUrl}/transactions?page=1&limit=${PAGE_LIMIT}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Unable to load transactions");
                }

                const data = await response.json();
                const formatted = mapApiToFrontend(data.transactions ?? []);

                if (isMounted) {
                    setTransactions(formatted);
                }
            } catch (err) {
                console.error(err);
                if (isMounted) {
                    setError("Unable to fetch transactions right now.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchTransactions();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredTransactions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return transactions.filter(tx => {
            const normalizedType: FilterType = tx.type === "credit" ? "income" : "expense";
            const matchesSearch =
                query.length === 0 ||
                tx.merchant.toLowerCase().includes(query) ||
                tx.category.toLowerCase().includes(query);
            const matchesFilter = filterType === "all" || normalizedType === filterType;

            return matchesSearch && matchesFilter;
        });
    }, [transactions, searchQuery, filterType]);

    const tableTransactions: TableTransaction[] = useMemo(
        () =>
            filteredTransactions.map(tx => ({
                ...tx,
                transactionType: tx.type === "credit" ? "income" : "expense",
                status: "completed",
            })),
        [filteredTransactions],
    );

    const renderContent = () => {
        if (isLoading) {
            return <div className="py-8 text-center text-muted-foreground">Loading transactions…</div>;
        }

        if (error) {
            return (
                <div className="py-8 text-center text-red-400">
                    {error}
                </div>
            );
        }

        if (tableTransactions.length === 0) {
            return (
                <div className="py-8 text-center text-muted-foreground">
                    No transactions match your filters yet.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-muted-foreground text-sm">Transaction ID</th>
                            <th className="text-left py-3 px-4 text-muted-foreground text-sm">Merchant</th>
                            <th className="text-left py-3 px-4 text-muted-foreground text-sm">Category</th>
                            <th className="text-left py-3 px-4 text-muted-foreground text-sm">Date</th>
                            <th className="text-left py-3 px-4 text-muted-foreground text-sm">Status</th>
                            <th className="text-right py-3 px-4 text-muted-foreground text-sm">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableTransactions.map(transaction => (
                            <tr key={transaction.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                <td className="py-4 px-4 text-muted-foreground text-sm">{transaction.id}</td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${transaction.transactionType === "income" ? "bg-green-400/10" : "bg-muted"}`}>
                                            {transaction.transactionType === "income" ? (
                                                <ArrowDownLeft className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <ArrowUpRight className="w-4 h-4 text-foreground" />
                                            )}
                                        </div>
                                        <span>{transaction.merchant}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-muted-foreground">{transaction.category}</td>
                                <td className="py-4 px-4 text-muted-foreground">
                                    {new Date(transaction.date).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </td>
                                <td className="py-4 px-4">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs ${
                                            transaction.status === "completed"
                                                ? "bg-green-400/10 text-green-400"
                                                : transaction.status === "pending"
                                                  ? "bg-primary/10 text-primary"
                                                  : "bg-red-400/10 text-red-400"
                                        }`}
                                    >
                                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                    </span>
                                </td>
                                <td
                                    className={`py-4 px-4 text-right ${
                                        transaction.transactionType === "income" ? "text-green-400" : "text-foreground"
                                    }`}
                                >
                                    {transaction.transactionType === "income" ? "+" : "-"}
                                    {Math.abs(transaction.amount).toFixed(2)} {transaction.currency}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="bg-card border border-gold/30 hover:border-gold/45 transition-all shadow-xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h3>Transaction History</h3>
                <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span className="text-sm">Export</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType("all")}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                            filterType === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterType("income")}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                            filterType === "income" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                        }`}
                    >
                        Income
                    </button>
                    <button
                        onClick={() => setFilterType("expense")}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                            filterType === "expense" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                        }`}
                    >
                        Expenses
                    </button>
                </div>
            </div>

            {renderContent()}
        </div>
    );
}
