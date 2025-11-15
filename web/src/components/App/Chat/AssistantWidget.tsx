"use client";

import clsx from "clsx";
import { SendHorizonal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import Action from "./Action";
import { socket } from "@/lib/socket";
import WidgetTrigger from "./Trigger";
import WidgetHeader from "./WidgetHeader";
import { useAssistantStore } from "@/lib/states";

import './chat.scss';

type ChatItem =
    | { kind: "text"; isUser: boolean; text: string }
    | { kind: "action"; id: string; text: string; status: "pending" | "accepted" | "cancelled" };

export function AssistantWidget() {
    const { isOpen, toggle, isFullScreen, toggleFullScreen } = useAssistantStore();

    const inputRef = useRef<HTMLInputElement | null>(null);
    const chatBodyRef = useRef<HTMLDivElement | null>(null);

    const [messages, setMessages] = useState<ChatItem[]>([]);
    const [isSending, setIsSending] = useState<boolean>(false);

    useEffect(() => {
        const handleStreamStart = () => {
            setIsSending(true);
            setMessages(prev => [...prev, { kind: "text", isUser: false, text: "" }]);
        };

        const handleStream = ({ token }: { token: string }) => {
            setMessages(prev => {
                const next = [...prev];
                const lastIndex = next.length - 1;
                if (lastIndex >= 0 && next[lastIndex].kind === "text") {
                    const last = next[lastIndex] as { kind: "text"; isUser: boolean; text: string };
                    if (last.isUser) {
                        next.push({ kind: "text", isUser: false, text: token });
                        return next;
                    }
                    next[lastIndex] = { ...last, text: last.text + token };
                } else {
                    next.push({ kind: "text", isUser: false, text: token });
                }
                return next;
            });
        };

        const handleStreamEnd = () => {
            setIsSending(false);
        };

        const handleError = ({ message }: { message: string }) => {
            setIsSending(false);
            setMessages(prev => [...prev, { kind: "text", isUser: false, text: `Error: ${message}` }]);
        };

        type ActionPayload = { intent?: string; assistant_message?: string | null; [k: string]: unknown };
        const handleAction = ({ data, id }: { data: ActionPayload; id?: string }) => {
            const assistantMessage =
                (data && typeof data.assistant_message === "string" && data.assistant_message) ||
                "Okay, I prepared that action.";
            if (id) {
                setMessages(prev =>
                    prev.map(m =>
                        m.kind === "action" && m.id === id
                            ? { ...m, status: "accepted", text: assistantMessage }
                            : m,
                    ),
                );
            } else {
                setMessages(prev => [...prev, { kind: "text", isUser: false, text: assistantMessage }]);
            }
            console.log("chat:action", data);
            setIsSending(false);
        };

        const handleActionRequest = ({ id, data }: { id: string; data: ActionPayload }) => {
            const assistantMessage =
                (data && typeof data.assistant_message === "string" && data.assistant_message) ||
                "Do you want to proceed with this action?";
            setMessages(prev => [
                ...prev,
                { kind: "action", id, text: assistantMessage, status: "pending" },
            ]);
            setIsSending(false); // allow typing while deciding
        };

        const handleActionCancelled = ({ id }: { id: string }) => {
            setMessages(prev =>
                prev.map(m => (m.kind === "action" && m.id === id ? { ...m, status: "cancelled" } : m)),
            );
            setIsSending(false); // re-enable input
        };

        socket.on("chat:stream:start", handleStreamStart);
        socket.on("chat:stream", handleStream);
        socket.on("chat:stream:end", handleStreamEnd);
        socket.on("chat:error", handleError);
        socket.on("chat:action", handleAction);
        socket.on("chat:action:request", handleActionRequest);
        socket.on("chat:action:cancelled", handleActionCancelled);

        return () => {
            socket.off("chat:stream:start", handleStreamStart);
            socket.off("chat:stream", handleStream);
            socket.off("chat:stream:end", handleStreamEnd);
            socket.off("chat:error", handleError);
            socket.off("chat:action", handleAction);
            socket.off("chat:action:request", handleActionRequest);
            socket.off("chat:action:cancelled", handleActionCancelled);
        };
    }, []);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    // When sending completes (input becomes enabled), focus the input
    useEffect(() => {
        if (!isSending && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSending]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSending) return; // prevent duplicate submissions while streaming

        const formData = new FormData(e.target as HTMLFormElement);
        const message = formData.get("message") as string;
        const text = (message || "").toString().trim();
        if (!text) return;

        setMessages(prev => [...prev, { kind: "text", isUser: true, text }]);
        setIsSending(true);
        socket.emit("chat:message", text);

        (e.target as HTMLFormElement).reset();
    };

    return (
        <div
            id="chat"
            className={clsx(
                "fixed z-50",
                isFullScreen ? "chat-screen-full top-0 left-0 w-screen h-screen" : "-bottom-10 right-4",
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
                <div ref={chatBodyRef} className={`chat-body flex-1 p-4 overflow-y-auto space-y-4 ${isFullScreen ? "bg-[#1c1c1c]" : "bg-zinc-50"}`}>
                    {messages.map((m, i) =>
                        m.kind === "text" ? (
                            <Message key={i} message={m.text} isUser={m.isUser} />
                        ) : (
                            <Action key={m.id} id={m.id} text={m.text} status={m.status} />
                        ),
                    )}
                </div>

                {/* Chat Input */}
                <div className="bg-card relative">
                    <form onSubmit={e => handleSubmit(e)} className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            autoFocus={isFullScreen}
                            type="text"
                            name="message"
                            placeholder="Type your message..."
                            className="flex-1 p-4 pr-12 bg-card rounded-xl rounded-t-none text-white placeholder:text-gray-500 outline-none!"
                            disabled={isSending}
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-transparent text-gold"
                            disabled={isSending}
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
                    `max-w-4/5 border p-4 rounded-[12px] wrap-break-word ${isUser
                        ? "bg-[#f8cb00] border-[#f8c200] text-black rounded-tr-none"
                        : "bg-[#13181a] border-[#1c1c1c] text-white rounded-tl-none"}`
                }
            >
                <p>{message}</p>
            </div>
        </div>
    );
}
