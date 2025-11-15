import { Maximize, Minimize, X } from "lucide-react";

export default function WidgetHeader({
    toggleFullScreen,
    isFullScreen,
    toggle,
}: {
    toggleFullScreen: () => void;
    isFullScreen: boolean;
    toggle: () => void;
}) {
    return (
        <div className="flex justify-between items-center p-4 bg-card border-b border-b-[#13181a]">
            <h3 className="font-semibold text-lg text-foreground">Assistant</h3>

            <div className="flex items-center gap-2">
                <button
                    onClick={toggleFullScreen}
                    className="p-1 rounded-full text-gray-300 hover:bg-card"
                    aria-label={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                    {isFullScreen ? (
                        <Minimize className="w-5 h-5" />
                    ) : (
                        <Maximize className="w-5 h-5" />
                    )}
                </button>

                <button
                    onClick={toggle}
                    className="p-1 rounded-full text-gray-300 hover:bg-card"
                    aria-label="Close assistant chat"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
