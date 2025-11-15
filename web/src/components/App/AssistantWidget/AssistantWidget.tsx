"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { SendHorizonal } from "lucide-react";

import WidgetTrigger from "./Trigger";
import WidgetHeader from "./WidgetHeader";
import { useAssistantStore } from "@/lib/states";

type Message = {
    isUser: boolean;
    text: string;
};

export function AssistantWidget() {
    const { isOpen, toggle, isFullScreen, toggleFullScreen } = useAssistantStore();

    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        
    }, [])

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const message = formData.get("message") as string;
        console.log(message);
    };

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
                    "flex flex-col shadow-xl overflow-hidden text-white",
                    isFullScreen
                        ? "w-full h-full rounded-none"
                        : "w-120 h-[min(800px,calc(100vh-32px))] rounded-xl border-border border",
                    isOpen ? "block" : "hidden",
                )}
            >
                {/* Header */}
                <WidgetHeader
                    toggleFullScreen={toggleFullScreen}
                    isFullScreen={isFullScreen}
                    toggle={toggle}
                />

                {/* Chat Body */}
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
                    <Message message="Just add a few more of these..." isUser={true} />
                    <Message message="...and you will see..." isUser={false} />
                    <Message message="...that the scrollbar appears!" isUser={true} />
                    <Message message="...and you will see..." isUser={false} />
                </div>

                {/* Chat Input */}
                <div className="bg-card relative">
                    <form onSubmit={e => handleSubmit(e)} className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            className="flex-1 p-4 pr-12 bg-card rounded-xl rounded-t-none text-white placeholder:text-gray-500 outline-none!"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-transparent text-gold"
                            aria-label="Send message"
                        >
                            <SendHorizonal className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>

            <WidgetTrigger toggle={toggle} isOpen={isOpen} />
        </div>
    );
}

function Message({ message, isUser }: { message: string; isUser: boolean }) {
    return (
        <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
            <div
                className={
                    isUser
                        ? "bg-[#f8cb00] border border-[#f8c200] text-black p-4 rounded-[12px] rounded-tr-none max-w-xs"
                        : "bg-[#13181a] border border-[#1c1c1c] text-white p-4 rounded-[12px] rounded-tl-none max-w-xs"
                }
            >
                <p>{message}</p>
            </div>
        </div>
    );
}
