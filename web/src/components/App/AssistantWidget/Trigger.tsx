import clsx from "clsx";
import { MessageCircle } from "lucide-react";

import Magnet from "@/components/ui/Magnet";

export default function WidgetTrigger({ toggle, isOpen }: { toggle: () => void; isOpen: boolean }) {
    return (
        <Magnet
            padding={100}
            disabled={false}
            magnetStrength={2}
            wrapperClassName="fixed bottom-16 right-4 z-50 h-12 w-12"
        >
            <button
                onClick={toggle}
                className={clsx(
                    "p-4 bg-[#ffd700] text-[#13181a] rounded-full shadow-lg hover:bg-[#ffd700]/90 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:ring-offset-2 focus:ring-offset-gray-800",
                    isOpen ? "hidden" : "block",
                )}
                aria-label="Open assistant chat"
            >
                <MessageCircle className="w-6 h-6" />
            </button>
        </Magnet>
    );
}
