import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export interface Transaction {
    id: string;
    date: string;
    merchant: string;
    category: string;
    amount: number;
    type: "credit" | "debit";
}

interface TransactionListProps {
    transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
    return (
        <div className="bg-[#003d4f] rounded-2xl p-6 border border-[#FFD700]/20">
            <h2 className="text-xl text-white mb-6">Recent Transactions</h2>
            <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {transactions.map(transaction => (
                    <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 hover:bg-[#002E3C] rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className={`p-2 rounded-full ${
                                    transaction.type === "credit"
                                        ? "bg-[#FFD700]/20 text-[#FFD700]"
                                        : "bg-gray-700 text-gray-300"
                                }`}
                            >
                                {transaction.type === "credit" ? (
                                    <ArrowDownRight size={20} />
                                ) : (
                                    <ArrowUpRight size={20} />
                                )}
                            </div>
                            <div>
                                <p className="text-white">{transaction.merchant}</p>
                                <p className="text-gray-400 text-sm">
                                    {transaction.date} • {transaction.category}
                                </p>
                            </div>
                        </div>
                        <div
                            className={`${
                                transaction.type === "credit" ? "text-[#FFD700]" : "text-white"
                            }`}
                        >
                            {transaction.type === "credit" ? "+" : "-"}$
                            {Math.abs(transaction.amount).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
