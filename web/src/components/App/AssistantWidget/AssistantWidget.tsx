"use client";

import clsx from "clsx";
import { X, SendHorizonal, Minimize, Maximize, MessageCircle } from "lucide-react";

import Magnet from "@/components/ui/Magnet";
import { useAssistantStore } from "@/lib/states";

export function AssistantWidget() {
    const { isOpen, toggle, isFullScreen, toggleFullScreen } = useAssistantStore();

    return (
        <div
            className={clsx(
                "fixed z-50",
                isFullScreen ? "top-0 left-0 w-screen h-screen" : "-bottom-10 right-4",
            )}
        >
            {/* CHAT WINDOW */}
            <div
                className={clsx(
                    "flex flex-col bg-zinc-200 shadow-xl overflow-hidden text-white",
                    isFullScreen
                        ? "w-full h-full rounded-none"
                        : "w-96 h-[min(800px,calc(100vh-32px))] rounded-lg",
                    isOpen ? "block" : "hidden",
                )}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 bg-background border-b border-b-[#13181a]">
                    <h3 className="font-semibold text-lg text-foreground">AI Assistant</h3>

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

                {/* --- SCROLLABLE CHAT BODY --- */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50">
                    <Message message="Hello! How can I help you today?" isUser={false} />
                    <Message message="I have a question about my account." isUser={true} />
                    <Message
                        message="Sure, I can help with that. What's your question?"
                        isUser={false}
                    />
                    <Message message="Just add a few more of these..." isUser={true} />
                    <Message message="...and you will see..." isUser={false} />
                    <Message message="...that the scrollbar appears!" isUser={true} />
                    <Message message="...and you will see..." isUser={false} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-[#13181a]">
                    <form onSubmit={e => e.preventDefault()} className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            className="flex-1 px-3 py-2 bg-[#1c292d] border border-[#002e3c] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:border-transparent"
                        />
                        <button
                            type="submit"
                            className="p-2 bg-[#ffd700] text-[#13181a] rounded-lg hover:bg-[#ffd700]/90"
                            aria-label="Send message"
                        >
                            <SendHorizonal className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>

            {/* TRIGGER BUTTON */}
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
        </div>
    );
}

function Message({ message, isUser }: { message: string; isUser: boolean }) {
    return (
        <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
            <div
                className={
                    isUser
                        ? "bg-[#13181a] text-gray-200 p-4 rounded-[12px] rounded-tr-none max-w-xs"
                        : "bg-[#002e3c] text-white p-4 rounded-[12px] rounded-tl-none max-w-xs"
                }
            >
                <p>{message}</p>
            </div>
        </div>
    );
}
