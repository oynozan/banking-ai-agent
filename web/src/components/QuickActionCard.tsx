import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
}

export function QuickActionCard({
                                  icon: Icon,
                                  title,
                                  description,
                                  onClick,




                                }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-[#003d4f] rounded-xl p-6 border border-[#FFD700]/20 hover:border-[#FFD700]/40 hover:bg-[#004555] transition-all group text-left w-full"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-[#FFD700]/10 rounded-lg group-hover:bg-[#FFD700]/20 transition-colors">
          <Icon className="text-[#FFD700]" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-white mb-1">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      </div>
    </button>
  );
}
