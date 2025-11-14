"use client";

import { useAssistantStore } from '@/store/assistant-store';
import { MessageSquarePlus, X, SendHorizonal, Maximize, Minimize } from 'lucide-react';
import clsx from 'clsx';
import Message from "@/components/App/AssistantWidget/Message";
import { MOCK_MESSAGES } from "@/components/App/AssistantWidget/const";

export function AssistantWidget() {
    const { isOpen, toggle, isFullScreen, toggleFullScreen } = useAssistantStore();

    return (
        <div className={clsx(
            "fixed z-50",
            isFullScreen
                ? "top-0 left-0 w-screen h-screen"
                : "bottom-4 right-4"
        )}>

            <div
                className={clsx(
                    'flex flex-col bg-zinc-200 shadow-xl overflow-hidden text-white',
                    isFullScreen
                        ? "w-full h-full rounded-none"
                        : "w-96 h-[800px] rounded-lg",
                    isOpen
                        ? 'block'
                        : 'hidden'
                )}
            >
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

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {MOCK_MESSAGES.map((message) => (
                        <Message key={message.text} isUserMessage={message.isUserMessage} text={message.text} />
                    ))}
                </div>

                <div className="p-4 border-t border-t-[#13181a] bg-[#13181a]">
                    <form
                        onSubmit={(e) => e.preventDefault()}
                        className="flex items-center gap-2"
                    >
                        <input
                            type="text"
                            placeholder="Type your message..."
                            className="flex-1 px-3 py-2 bg-card border border-background rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent"
                        />
                        <button
                            type="submit"
                            className="p-2 bg-foreground text-[#13181a] rounded-lg hover:bg-foreground/90"
                            aria-label="Send message"
                        >
                            <SendHorizonal className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>

            <button
                onClick={toggle}
                className={clsx(
                    'p-4 bg-foreground text-[#13181a] rounded-full shadow-lg hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-gray-800',
                    isOpen ? 'hidden' : 'block'
                )}
                aria-label="Open assistant chat"
            >
                <MessageSquarePlus className="w-6 h-6" />
            </button>
        </div>
    );
}