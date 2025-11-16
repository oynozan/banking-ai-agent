import clsx from "clsx";
import { Maximize, Minimize, X, Volume2, VolumeX } from "lucide-react";

export default function WidgetHeader({
    toggleFullScreen,
    isFullScreen,
    toggle,
    autoPlayEnabled,
    toggleAutoPlay,
}: {
    toggleFullScreen: () => void;
    isFullScreen: boolean;
    toggle: () => void;
    autoPlayEnabled: boolean;
    toggleAutoPlay: () => void;
}) {
    return (
        <div className="flex justify-between items-center p-4 bg-card border-b border-b-[#13181a]">
            <h3 className="font-semibold text-lg text-foreground">Assistant</h3>

            <div className="flex items-center gap-2">
                <button
                    onClick={toggleAutoPlay}
                    className={clsx(
                        "p-1 rounded-full transition-colors",
                        autoPlayEnabled 
                            ? "text-gold hover:bg-card" 
                            : "text-gray-300 hover:bg-card"
                    )}
                    aria-label={autoPlayEnabled ? "Disable auto-play audio" : "Enable auto-play audio"}
                >
                    {autoPlayEnabled ? (
                        <Volume2 className="w-5 h-5" />
                    ) : (
                        <VolumeX className="w-5 h-5" />
                    )}
                </button>

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