import clsx from "clsx";
import React from "react";
import { Play, Square } from "lucide-react";

export default function Message({
    message,
    isUser,
    isPlaying,
    onPlay,
    onStop,
}: {
    message: string;
    isUser: boolean;
    isPlaying?: boolean;
    onPlay?: () => void;
    onStop?: () => void;
}) {
    const showControls = typeof onPlay === "function" && typeof onStop === "function";
    const controlButton =
        showControls && (
            <button
                onClick={isPlaying ? onStop : onPlay}
                className={clsx(
                    "p-1.5 rounded-full transition-colors shrink-0",
                    isPlaying ? "bg-red-500 text-white hover:bg-red-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300",
                    isUser ? "mt-0" : "mt-0",
                )}
                aria-label={isPlaying ? "Stop" : "Play"}
            >
                {isPlaying ? <Square className="w-3 h-3" fill="currentColor" /> : <Play className="w-3 h-3" fill="currentColor" />}
            </button>
        );

    return (
        <div className={clsx("relative flex gap-2 items-start", isUser ? "justify-end" : "justify-start")}>
            {!isUser && controlButton}
            <div
                className={`max-w-4/5 border p-4 rounded-[15px] wrap-break-word ${
                    isUser
                        ? "bg-[#f8cb00] border-[#f8c200] text-black rounded-tr-none"
                        : "bg-[#13181a] border-[#1c1c1a] text-white rounded-tl-none"
                }`}
            >
                <p>
                    <SafeTextWithBreaks text={message} />
                </p>
            </div>
            {isUser && controlButton}
        </div>
    );
}
const SafeTextWithBreaks = ({ text }: { text: string }) => {
    const normalized = React.useMemo(() => text?.replace(/\\n/g, "\n"), [text]);
    const lines = React.useMemo(() => normalized?.split(/\r?\n/g), [normalized]);

    if (!text) return null;

    return lines.map((line, i) => (
        <React.Fragment key={i}>
            {line}
            {i < lines.length - 1 && <br />}
        </React.Fragment>
    ));
};

