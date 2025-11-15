"use client";

import { useRouter } from "next/navigation";
import { Send, FileText, PieChart } from "lucide-react";

import { usePreferencesStore, useUser } from "@/lib/states";
import { BalanceCard } from "@/components/App/Balance/BalanceCard";
import { QuickActionCard } from "@/components/App/Overview/QuickActionCard";
import { TransactionList } from "@/components/App/TransactionHistory/TransactionList";

import "./home.scss";
import { useTransactions } from "@/hooks/useTransactions";
import QuickStats from "@/components/App/QuickStats/QuickStats";

export default function BankApp() {
    const { transactions, stats, isLoading } = useTransactions();
    const router = useRouter();
    const { user } = useUser();
    const { showBalance } = usePreferencesStore();

    if (!user) {
        return null;
    }

    return (
        <div id="home" className="flex flex-col gap-6">
            <div>
                <BalanceCard />
            </div>

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div>Loading...</div>
                ) : (
                    <div className="lg:col-span-2">
                        <TransactionList transactions={transactions} />
                    </div>
                )}

                <QuickStats showBalance={showBalance} stats={stats} />
            </div>
        </div>
    );
}
