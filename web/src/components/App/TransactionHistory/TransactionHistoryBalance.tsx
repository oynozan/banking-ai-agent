"use client";

import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/lib/states";

export default function TransactionHistoryBalance() {
    const [showBalance, setShowBalance] = useState(true);
    const { user } = useUser();

    if (!user) {
        return null;
    }

    return (
        <div className="bg-card border border-border p-6 h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-gray-300">Current Balance</h2>
                    <button
                        onClick={() => setShowBalance(!showBalance)}
                        className="text-gray-400 hover:text-gold transition-colors"
                        aria-label={showBalance ? "Hide balance" : "Show balance"}
                    >
                        {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <h2 className="text-5xl text-gold">
                        {showBalance
                            ? `$${user.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "••••••"}
                    </h2>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-primary/20">
                <div className="flex items-center gap-2 text-green-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">+12.5% from last month</span>
                </div>
            </div>
        </div>
    );
}
