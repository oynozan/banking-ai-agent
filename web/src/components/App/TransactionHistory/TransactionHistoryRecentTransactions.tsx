import { ArrowDownLeft, Coffee, Home, ShoppingBag, Tv } from "lucide-react";

interface Transaction {
    id: string;
    name: string;
    category: string;
    amount: number;
    date: string;
    icon: React.ReactNode;
    type: "income" | "expense";
}

const transactions: Transaction[] = [
    {
        id: "1",
        name: "Salary Deposit",
        category: "Income",
        amount: 5420.00,
        date: "Nov 14, 2025",
        icon: <ArrowDownLeft className="w-5 h-5" />,
        type: "income",
    },
    {
        id: "2",
        name: "Starbucks",
        category: "Food & Drink",
        amount: -12.50,
        date: "Nov 14, 2025",
        icon: <Coffee className="w-5 h-5" />,
        type: "expense",
    },
    {
        id: "3",
        name: "Amazon",
        category: "Shopping",
        amount: -89.99,
        date: "Nov 13, 2025",
        icon: <ShoppingBag className="w-5 h-5" />,
        type: "expense",
    },
    {
        id: "4",
        name: "Rent Payment",
        category: "Housing",
        amount: -2400.00,
        date: "Nov 13, 2025",
        icon: <Home className="w-5 h-5" />,
        type: "expense",
    },
    {
        id: "5",
        name: "Netflix",
        category: "Entertainment",
        amount: -15.99,
        date: "Nov 12, 2025",
        icon: <Tv className="w-5 h-5" />,
        type: "expense",
    },
];

export default function TransactionHistoryRecentTransactions() {
    return (
        <div className="bg-card border border-border p-6">
            <div className="flex items-center justify-between mb-6">
                <h3>Recent Activity</h3>
                <button className="text-primary text-sm hover:underline">
                    View All
                </button>
            </div>
            <div className="space-y-4">
                {transactions.map((transaction) => (
                    <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-lg ${transaction.type === 'income' ? 'bg-green-400/10' : 'bg-muted'}`}>
                                <div className={transaction.type === 'income' ? 'text-green-400' : 'text-foreground'}>
                                    {transaction.icon}
                                </div>
                            </div>
                            <div>
                                <p className="text-foreground">{transaction.name}</p>
                                <p className="text-muted-foreground text-sm">{transaction.category}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`${transaction.type === 'income' ? 'text-green-400' : 'text-foreground'}`}>
                                {transaction.type === 'income' ? '+' : ''}{transaction.amount.toFixed(2)} USD
                            </p>
                            <p className="text-muted-foreground text-sm">{transaction.date}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
