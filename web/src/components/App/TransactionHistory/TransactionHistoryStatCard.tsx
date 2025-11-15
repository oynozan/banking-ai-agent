import { ArrowDownRight, ArrowUpRight } from "lucide-react";


interface StatCardProps {
    title: string;
    amount: string;
    change: string;
    icon: React.ReactNode;
    isPositive?: boolean;
}

export default function StatCard({ title, amount, change, icon, isPositive = true }: StatCardProps) {
    return (
        <div className="bg-card border border-border p-5 hover:border-foreground/50 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span>{change}</span>
                </div>
            </div>
            <p className="text-muted-foreground text-sm mb-1">{title}</p>
            <p className="text-foreground">{amount}</p>
        </div>
    );
}