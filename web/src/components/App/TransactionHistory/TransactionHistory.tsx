'use client'

import { ArrowDownLeft, ArrowUpRight, Download, Search } from "lucide-react";
import { useState } from "react";

interface Transaction {
    id: string;
    merchant: string;
    category: string;
    date: string;
    amount: number;
    status: "completed" | "pending" | "failed";
    type: "income" | "expense";
}

const allTransactions: Transaction[] = [
    { id: "TXN001", merchant: "Salary Deposit", category: "Income", date: "2025-11-14", amount: 5420.00, status: "completed", type: "income" },
    { id: "TXN002", merchant: "Starbucks Coffee", category: "Food & Drink", date: "2025-11-14", amount: -12.50, status: "completed", type: "expense" },
    { id: "TXN003", merchant: "Amazon.com", category: "Shopping", date: "2025-11-13", amount: -89.99, status: "completed", type: "expense" },
    { id: "TXN004", merchant: "Rent Payment", category: "Housing", date: "2025-11-13", amount: -2400.00, status: "completed", type: "expense" },
    { id: "TXN005", merchant: "Netflix Subscription", category: "Entertainment", date: "2025-11-12", amount: -15.99, status: "completed", type: "expense" },
    { id: "TXN006", merchant: "Apple Store", category: "Technology", date: "2025-11-11", amount: -999.00, status: "completed", type: "expense" },
    { id: "TXN007", merchant: "Freelance Project", category: "Income", date: "2025-11-10", amount: 2500.00, status: "completed", type: "income" },
    { id: "TXN008", merchant: "Uber", category: "Transportation", date: "2025-11-10", amount: -24.50, status: "completed", type: "expense" },
    { id: "TXN009", merchant: "Whole Foods", category: "Groceries", date: "2025-11-09", amount: -156.23, status: "completed", type: "expense" },
    { id: "TXN010", merchant: "Gym Membership", category: "Health", date: "2025-11-08", amount: -89.00, status: "pending", type: "expense" },
    { id: "TXN011", merchant: "Electric Bill", category: "Utilities", date: "2025-11-07", amount: -120.45, status: "completed", type: "expense" },
    { id: "TXN012", merchant: "Client Payment", category: "Income", date: "2025-11-06", amount: 3200.00, status: "completed", type: "income" },
];

export default function TransactionHistory() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

    const filteredTransactions = allTransactions.filter(transaction => {
        const matchesSearch = transaction.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === "all" || transaction.type === filterType;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="bg-card border border-border p-6">
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
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType("all")}
                        className={`px-4 py-2 rounded-lg border transition-colors ${filterType === "all" ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterType("income")}
                        className={`px-4 py-2 rounded-lg border transition-colors ${filterType === "income" ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                    >
                        Income
                    </button>
                    <button
                        onClick={() => setFilterType("expense")}
                        className={`px-4 py-2 rounded-lg border transition-colors ${filterType === "expense" ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                    >
                        Expenses
                    </button>
                </div>
            </div>

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
                    {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-4 px-4 text-muted-foreground text-sm">{transaction.id}</td>
                            <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-green-400/10' : 'bg-muted'}`}>
                                        {transaction.type === 'income' ? (
                                            <ArrowDownLeft className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <ArrowUpRight className="w-4 h-4 text-foreground" />
                                        )}
                                    </div>
                                    <span>{transaction.merchant}</span>
                                </div>
                            </td>
                            <td className="py-4 px-4 text-muted-foreground">{transaction.category}</td>
                            <td className="py-4 px-4 text-muted-foreground">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td className="py-4 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                      transaction.status === 'completed' ? 'bg-green-400/10 text-green-400' :
                          transaction.status === 'pending' ? 'bg-primary/10 text-primary' :
                              'bg-red-400/10 text-red-400'
                  }`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                            </td>
                            <td className={`py-4 px-4 text-right ${transaction.type === 'income' ? 'text-green-400' : 'text-foreground'}`}>
                                {transaction.type === 'income' ? '+' : ''}{transaction.amount.toFixed(2)} USD
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
