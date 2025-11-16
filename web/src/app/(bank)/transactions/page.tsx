import TransactionHistorySpendingChart from "@/components/App/TransactionHistory/TransactionHistorySpendingChart";
import TransactionHistory from "@/components/App/TransactionHistory/TransactionHistory";

export default function TransactionsHistoryPage() {
    return (
        <main className="flex flex-col gap-6">
            <div className="flex items-center gap-6 mb-2">
                <div>
                    <h1 className="text-3xl text-white mb-1">Transaction Overview</h1>
                    <p className="text-gray-400">Here&#39;s a breakdown of your past transactions</p>
                </div>
            </div>

            <div className="gap-4 mb-6">
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