import { CreditCard, Wallet } from "lucide-react";
import StatCard from "@/components/App/TransactionHistory/TransactionHistoryStatCard";


export default function TransactionHistoryQuickStats() {
    return (
        <>
            <StatCard
                title="Income"
                amount="$48,320"
                change="+24%"
                icon={<Wallet className="w-5 h-5 text-primary" />}
                isPositive={true}
            />
            <StatCard
                title="Expenses"
                amount="$12,480"
                change="-8%"
                icon={<CreditCard className="w-5 h-5 text-primary" />}
                isPositive={false}
            />
        </>
    );
}
