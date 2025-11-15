import { LucideIcon } from "lucide-react";

interface QuickActionCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    onClick?: () => void;
}

export function QuickActionCard({ icon: Icon, title, description, onClick }: QuickActionCardProps) {
    return (
        <button
            onClick={onClick}
            className="bg-card rounded-sm p-6 border border-gold/30 hover:border-gold/45 transition-all group text-left w-full"
        >
            <div className="flex items-start gap-4">
                <div className="p-3 bg-gold/10 rounded-lg group-hover:bg-gold/20 transition-colors">
                    <Icon className="text-gold" size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-white mb-1">{title}</h3>
                    <p className="text-gray-400 text-sm">{description}</p>
                </div>
            </div>
        </button>
    );
}
