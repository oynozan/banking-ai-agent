import TransactionHistoryBalance from "@/components/App/TransactionHistory/TransactionHistoryBalance";
import TransactionHistoryQuickStats from "@/components/App/TransactionHistory/TransactionHIstoryQuickStats";
import TransactionHistoryRecentTransactions
    from "@/components/App/TransactionHistory/TransactionHistoryRecentTransactions";
import TransactionHistorySpendingChart from "@/components/App/TransactionHistory/TransactionHistorySpendingChart";
import TransactionHistory from "@/components/App/TransactionHistory/TransactionHistory";

export default function TransactionsHistoryPage() {
    return (
        <main className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="md:col-span-2 lg:col-span-3 row-span-1">
                    <TransactionHistoryBalance />
                </div>

                <div className="lg:col-span-1">
                    <TransactionHistoryQuickStats />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="lg:col-span-2">
                    <TransactionHistoryRecentTransactions />
                </div>

                <div className="lg:col-span-1">
                    <TransactionHistorySpendingChart />
                </div>
            </div>

            <div className="mb-6">
                <TransactionHistory />
            </div>
        </main>
    )
}