"use client";

import { useState } from "react";
import { Send, FileText, PieChart, Download } from "lucide-react";

import { mockTransactions } from "@/lib/const";
import { BalanceCard } from "@/components/App/Balance/BalanceCard";
import { QuickActionCard } from "@/components/App/Overview/QuickActionCard";
import { TransactionList } from "@/components/App/TransactionHistory/TransactionList";

import "./home.scss";


export default function BankApp() {
    const [currentBalance] = useState(12847.58);

    return (
        <div id="home" className="flex flex-col gap-8">
            {/* Balance Card */}
            <div>
                <BalanceCard balance={currentBalance} />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                        icon={Send}
                        title="Transfer Money"
                        description="Send money to other accounts instantly"
                        onClick={() => console.log("Transfer clicked")}
                    />
                    <QuickActionCard
                        icon={FileText}
                        title="Pay Bills"
                        description="Manage and pay your upcoming bills"
                        onClick={() => console.log("Pay bills clicked")}
                    />
                    <QuickActionCard
                        icon={PieChart}
                        title="Budgeting Tools"
                        description="Track spending and set financial goals"
                        onClick={() => console.log("Budgeting clicked")}
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
                    <div className="flex-1 bg-card rounded-sm p-6 border border-[#FFD700]/20">
                        <h3 className="text-white mb-4">Quick Stats</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">
                                    This Month&#39;s Income
                                </p>
                                <p className="text-[#FFD700] text-2xl">+$6,420.50</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm mb-1">
                                    This Month&#39;s Expenses
                                </p>
                                <p className="text-white text-2xl">-$490.61</p>
                            </div>
                            <div className="pt-4 border-t border-gray-700">
                                <p className="text-gray-400 text-sm mb-1">Net Change</p>
                                <p className="text-[#FFD700] text-2xl">+$5,929.89</p>
                            </div>
                        </div>
                    </div>
                    <button className="w-full bg-card rounded-sm p-4 border border-[#FFD700]/20 hover:border-[#FFD700]/40 transition-all flex items-center justify-center gap-2 text-white">
                        <Download size={20} className="text-[#FFD700]" />
                        Download Statement
                    </button>
                </div>
            </div>
        </div>
    );
}
