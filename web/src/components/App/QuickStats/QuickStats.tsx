import { formatCurrency } from "@/lib/utils";

interface MonthlyStats {
    income: number;
    expenses: number;
    netChange: number;
}

interface QuickStatsProps {
    showBalance: boolean;
    stats: MonthlyStats;
}

export default function QuickStats({ showBalance, stats }: QuickStatsProps) {
    return (
        <div className="flex-1 bg-card rounded-sm p-6 border border-gold/30 hover:border-gold/45 transition-all shadow-xl">
            <h3 className="text-white mb-4">Quick Stats</h3>
            <div className="space-y-4">
                <div>
                    <p className="text-gray-400 text-sm mb-1">This Month&apos;s Income</p>
                    <p className="text-gold text-2xl">
                        {showBalance ? `+${formatCurrency(stats.income)} PLN` : "••••••"}
                    </p>
                </div>
                <div>
                    <p className="text-gray-400 text-sm mb-1">This Month&apos;s Expenses</p>
                    <p className="text-white text-2xl">
                        {showBalance ? `-${formatCurrency(stats.expenses)} PLN` : "••••••"}
                    </p>
                </div>
                <div className="pt-4 border-t border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">Net Change</p>
                    <p className="text-gold text-2xl">
                        {showBalance
                            ? `${stats.netChange >= 0 ? "+" : ""}${formatCurrency(stats.netChange)} PLN`
                            : "••••••"}
                    </p>
                </div>
            </div>
        </div>
    );
}
