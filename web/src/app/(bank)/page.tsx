"use client";

import { useRouter } from "next/navigation";
import { Send, FileText, PieChart } from "lucide-react";

import { mockTransactions } from "@/lib/const";
import { usePreferencesStore, useUser } from "@/lib/states";
import { BalanceCard } from "@/components/App/Balance/BalanceCard";
import { QuickActionCard } from "@/components/App/Overview/QuickActionCard";
import { TransactionList } from "@/components/App/TransactionHistory/TransactionList";

import "./home.scss";

export default function BankApp() {
    const router = useRouter();
    const { user } = useUser();
    const { showBalance } = usePreferencesStore();

    if (!user) {
        return null;
    }

    return (
        <div id="home" className="flex flex-col gap-6">
            {/* Balance Card */}
            <div>
                <BalanceCard />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl text-white mb-2 mt-2">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <QuickActionCard
                        icon={Send}
                        title="Transfer Money"
                        description="Send money to other accounts instantly"
                        onClick={() => router.push("/send")}
                    />
                    <QuickActionCard
                        icon={FileText}
                        title="Pay Bills"
                        description="Manage and pay your upcoming bills"
                        onClick={() => router.push("/bills")}
                    />
                    <QuickActionCard
                        icon={PieChart}
                        title="Budgeting Tools"
                        description="Track spending and set financial goals"
                        onClick={() => router.push("/budget")}
                    />
                </div>
            </div>

            {/* Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TransactionList transactions={mockTransactions} />
                </div>

                {/* Additional Actions */}
                <div className="flex flex-col space-y-4">
                    <div className="flex-1 bg-card rounded-sm p-6 border border-gold/30 hover:border-gold/45 transition-all shadow-xl">
                        <h3 className="text-white mb-4">Quick Stats</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">
                                    This Month&#39;s Income
                                </p>
                                <p className="text-[#FFD700] text-2xl">
                                    {showBalance ? "+$6,420.50" : "••••••"}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm mb-1">
                                    This Month&#39;s Expenses
                                </p>
                                <p className="text-white text-2xl">
                                    {showBalance ? "-$490.61" : "••••••"}
                                </p>
                            </div>
                            <div className="pt-4 border-t border-gray-700">
                                <p className="text-gray-400 text-sm mb-1">Net Change</p>
                                <p className="text-[#FFD700] text-2xl">
                                    {showBalance ? "+$5,929.89" : "••••••"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
