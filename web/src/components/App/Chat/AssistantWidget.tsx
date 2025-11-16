/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import clsx from "clsx";
import { SendHorizonal, Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import Action from "./Action";
import Message from "./Message";
import { socket } from "@/lib/socket";
import WidgetTrigger from "./Trigger";
import WidgetHeader from "./WidgetHeader";
import { useAssistantStore } from "@/lib/states";

import "./chat.scss";

type ChatItem =
    | { kind: "text"; isUser: boolean; text: string }
    | { kind: "action"; id: string; text: string; status: "pending" | "accepted" | "cancelled" }
    | {
          kind: "suggestions";
          field: string;
          options: Array<{ label: string; value: string }>;
      };

export function AssistantWidget() {
    const { isOpen, toggle, isFullScreen, toggleFullScreen } = useAssistantStore();

    const inputRef = useRef<HTMLInputElement | null>(null);
    const chatBodyRef = useRef<HTMLDivElement | null>(null);
    const speechRecRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const pendingSuggestionsRef = useRef<Array<{ field: string; options: Array<{ label: string; value: string }> }> | null>(null);

    const isSendingRef = useRef<boolean>(false);
    const playMessageRef = useRef<((text: string, index: number) => Promise<void>) | null>(null);

    const [messages, setMessages] = useState<ChatItem[]>([]);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [speechReady, setSpeechReady] = useState<boolean>(false);

    const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);
    const playingMessageIndexRef = useRef<number | null>(null);

    const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(false);
    const autoPlayEnabledRef = useRef<boolean>(false);

    // LOAD AUTOPLAY SETTING
    useEffect(() => {
        try {
            const stored = localStorage.getItem("chat:autoPlayEnabled");
            if (stored !== null) {
                const value = stored === "1" || stored === "true";
                setAutoPlayEnabled(value);
                autoPlayEnabledRef.current = value;
            }
        } catch {}
    }, []);

    useEffect(() => {
        autoPlayEnabledRef.current = autoPlayEnabled;
        try {
            localStorage.setItem("chat:autoPlayEnabled", autoPlayEnabled ? "1" : "0");
        } catch {}
    }, [autoPlayEnabled]);

    useEffect(() => {
        playingMessageIndexRef.current = playingMessageIndex;
    }, [playingMessageIndex]);

    // INIT AUDIO
    useEffect(() => {
        audioRef.current = new Audio();
        if (audioRef.current) {
            audioRef.current.onended = () => setPlayingMessageIndex(null);
        }
    }, []);

    // AUTOSCROLL
    useEffect(() => {
        chatBodyRef.current?.scrollTo({
            top: chatBodyRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages]);

    // SPEECH RECOGNITION
    useEffect(() => {
        const check = setInterval(() => {
            if (window?.p5 && (window.p5 as any).SpeechRec) {
                clearInterval(check);
                speechRecRef.current = new (window.p5 as any).SpeechRec("en-US", () => {
                    if (speechRecRef.current?.resultValue && inputRef.current) {
                        inputRef.current.value = speechRecRef.current.resultString;
                    }
                });
                setSpeechReady(true);
            }
        }, 100);

        return () => clearInterval(check);
    }, []);

    const toggleSpeechRecognition = () => {
        if (!speechRecRef.current) return;

        if (isListening) {
            speechRecRef.current.stop();
            setIsListening(false);
        } else {
            speechRecRef.current.start(true, false);
            setIsListening(true);
        }
    };

    // PLAY TTS
    const playMessage = async (text: string, index: number) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            setPlayingMessageIndex(index);

            const resp = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: trimmed }),
            });

            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);

            audioRef.current!.src = url;
            await audioRef.current!.play();
        } catch (err) {
            console.error("TTS error", err);
            setPlayingMessageIndex(null);
        }
    };

    useEffect(() => {
        playMessageRef.current = playMessage;
    }, [playMessage]);

    const stopMessage = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setPlayingMessageIndex(null);
    };

    // SOCKET LISTENERS
    useEffect(() => {
        const handleStreamStart = () => {
            setIsSending(true);
            isSendingRef.current = true;
            setMessages(prev => [...prev, { kind: "text", isUser: false, text: "" }]);
        };

        const handleStream = ({ token }: { token: string }) => {
            setMessages(prev => {
                const next = [...prev];
                const last = next[next.length - 1];

                if (last?.kind === "text" && !last.isUser) {
                    next[next.length - 1] = { ...last, text: last.text + token };
                }

                return next;
            });
        };

        const handleStreamEnd = () => {
            setIsSending(false);
            isSendingRef.current = false;

            // Auto-play the last assistant message if enabled and nothing is playing
            if (autoPlayEnabledRef.current && !playingMessageIndexRef.current && playMessageRef.current) {
                setTimeout(() => {
                    setMessages(prev => {
                        // Find the last assistant message with content
                        for (let i = prev.length - 1; i >= 0; i--) {
                            const msg = prev[i];
                            if (msg.kind === "text" && !msg.isUser && msg.text.trim().length > 0) {
                                // Auto-play this message
                                playMessageRef.current!(msg.text, i).catch(err => {
                                    console.error("Auto-play error:", err);
                                });
                                break;
                            }
                        }
                        return prev;
                    });
                }, 200); // Delay to ensure message is fully rendered
            }
        };

        const handleAction = ({ data }: any) => {
            const txt = data.assistant_message || "Action completed.";

            setMessages(prev => {
                const newMessages = [...prev, { kind: "text" as const, isUser: false, text: txt }];
                const messageIndex = newMessages.length - 1;

                // Auto-play if enabled and nothing is playing
                if (autoPlayEnabledRef.current && !playingMessageIndexRef.current && playMessageRef.current && txt.trim().length > 0) {
                    setTimeout(() => {
                        playMessageRef.current!(txt, messageIndex).catch(err => {
                            console.error("Auto-play error:", err);
                        });
                    }, 100);
                }

                return newMessages;
            });
        };

        const handleActionRequest = ({ id, data }: any) => {
            setMessages(prev => [
                ...prev,
                { kind: "action", id, text: data.assistant_message, status: "pending" },
            ]);
        };

        const handleActionCancelled = ({ id }: any) => {
            setMessages(prev =>
                prev.map(m =>
                    m.kind === "action" && m.id === id
                        ? { ...m, status: "cancelled" }
                        : m
                )
            );
        };

        const handleAccounts = ({ accounts, field }: any) => {
            // Ensure input is enabled when suggestions arrive
            setIsSending(false);
            isSendingRef.current = false;

            const suggestion = {
                kind: "suggestions" as const,
                field,
                options: accounts.map((acc: any) => ({
                    label: `${acc.type} • PLN ${acc.balance}`,
                    value: acc.iban,
                })),
            };

            // Insert suggestions after the last assistant message
            setMessages(prev => {
                // Remove any existing suggestions for the same field
                const filtered = prev.filter(m => !(m.kind === "suggestions" && m.field === field));

                // Find the last assistant text message
                let idx = -1;
                for (let i = filtered.length - 1; i >= 0; i--) {
                    const msg = filtered[i];
                    if (msg.kind === "text" && !msg.isUser && msg.text.trim().length > 0) {
                        idx = i;
                        break;
                    }
                }

                // If no assistant message found, append to end
                if (idx === -1) {
                    return [...filtered, suggestion];
                }

                // Insert suggestions immediately after the last assistant message
                return [...filtered.slice(0, idx + 1), suggestion, ...filtered.slice(idx + 1)];
            });
        };

        // ⭐⭐⭐ FIX: HANDLE chat:assistant ⭐⭐⭐
        const handleAssistant = ({ content }: { content: string }) => {
            if (!content || !content.trim()) return;

            // Reset sending state when assistant message arrives
            setIsSending(false);
            isSendingRef.current = false;

            setMessages(prev => {
                const newMessages = [...prev, { kind: "text" as const, isUser: false, text: content }];
                const messageIndex = newMessages.length - 1;

                // Auto-play if enabled and nothing is playing
                if (autoPlayEnabledRef.current && !playingMessageIndexRef.current && playMessageRef.current) {
                    setTimeout(() => {
                        playMessageRef.current!(content, messageIndex).catch(err => {
                            console.error("Auto-play error:", err);
                        });
                    }, 100);
                }

                return newMessages;
            });
        };

        socket.on("chat:stream:start", handleStreamStart);
        socket.on("chat:stream", handleStream);
        socket.on("chat:stream:end", handleStreamEnd);
        socket.on("chat:action", handleAction);
        socket.on("chat:action:request", handleActionRequest);
        socket.on("chat:action:cancelled", handleActionCancelled);
        socket.on("chat:accounts", handleAccounts);

        // ⭐ REGISTER NEW HANDLER
        socket.on("chat:assistant", handleAssistant);

        return () => {
            socket.off("chat:stream:start", handleStreamStart);
            socket.off("chat:stream", handleStream);
            socket.off("chat:stream:end", handleStreamEnd);
            socket.off("chat:action", handleAction);
            socket.off("chat:action:request", handleActionRequest);
            socket.off("chat:action:cancelled", handleActionCancelled);
            socket.off("chat:accounts", handleAccounts);

            // ⭐ UNREGISTER
            socket.off("chat:assistant", handleAssistant);
        };
    }, []); // Empty dependency array - handlers use refs to access current values

    // SUGGESTION CLICK
    const handleSuggestionClick = (value: string, index: number) => {
        // Remove the suggestion and add user message
        setMessages(prev => {
            const filtered = prev.filter((_, i) => i !== index);
            return [...filtered, { kind: "text" as const, isUser: true, text: value }];
        });
        setIsSending(true);
        isSendingRef.current = true;
        socket.emit("chat:message", value);
    };

    // SUBMIT
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSending) return;

        const fd = new FormData(e.target as HTMLFormElement);
        const msg = fd.get("message")!.toString().trim();
        if (!msg) return;

        setMessages(prev => [...prev, { kind: "text", isUser: true, text: msg }]);
        setIsSending(true);

        socket.emit("chat:message", msg);
        (e.target as HTMLFormElement).reset();
    };

    return (
        <div
            id="chat"
            className={clsx(
                "fixed z-50",
                isFullScreen ? "chat-screen-full top-0 left-0 w-screen h-screen" : "-bottom-10 right-4"
            )}
        >
            <div
                className={clsx(
                    "flex flex-col shadow-xl overflow-hidden text-white",
                    isFullScreen
                        ? "w-full h-full rounded-none"
                        : "w-120 h-[min(900px,calc(100vh-32px))] rounded-xl border-border border",
                    isOpen ? "block" : "hidden"
                )}
            >
                <WidgetHeader
                    toggleFullScreen={toggleFullScreen}
                    isFullScreen={isFullScreen}
                    toggle={toggle}
                    autoPlayEnabled={autoPlayEnabled}
                    toggleAutoPlay={() => setAutoPlayEnabled(v => !v)}
                />

                {/* CHAT BODY */}
                <div ref={chatBodyRef} className="chat-body flex-1 p-4 overflow-y-auto space-y-4 bg-[#f9ecd8]">
                    {!messages.length && (
                        <p className="text-black/80 text-center">
                            This is the start of your conversation.
                        </p>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className="w-full clear-both">
                            {m.kind === "suggestions" ? (
                                <div className="flex gap-2 flex-wrap mt-1">
                                    {m.options.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleSuggestionClick(opt.value, i)}
                                            className="px-3 py-2 bg-yellow-400 text-black rounded-lg"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            ) : m.kind === "text" ? (
                                <Message
                                    message={m.text}
                                    isUser={m.isUser}
                                    isPlaying={playingMessageIndex === i}
                                    onPlay={() => playMessage(m.text, i)}
                                    onStop={stopMessage}
                                />
                            ) : (
                                <Action
                                    id={m.id}
                                    text={m.text}
                                    status={m.status}
                                    isPlaying={playingMessageIndex === i}
                                    onPlay={() => playMessage(m.text, i)}
                                    onStop={stopMessage}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* INPUT */}
                <div className="bg-card relative h-16 flex items-center">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full px-3">
                        <input
                            ref={inputRef}
                            type="text"
                            name="message"
                            placeholder="Type or speak..."
                            className="flex-1 p-4 pr-24 bg-card rounded-xl text-white"
                            disabled={isSending}
                        />

                        {/* MIC */}
                        {speechReady && (
                            <button
                                type="button"
                                onClick={toggleSpeechRecognition}
                                className={clsx(
                                    "absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-lg",
                                    isListening ? "bg-red-500 text-white" : "text-gray-400 hover:text-gold"
                                )}
                            >
                                {isListening ? <MicOff /> : <Mic />}
                            </button>
                        )}

                        {/* SEND */}
                        <button
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gold"
                            disabled={isSending}
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
