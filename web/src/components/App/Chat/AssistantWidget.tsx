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
    | { kind: "action"; id: string; text: string; status: "pending" | "accepted" | "cancelled" };

export function AssistantWidget() {
    const { isOpen, toggle, isFullScreen, toggleFullScreen } = useAssistantStore();

    const inputRef = useRef<HTMLInputElement | null>(null);
    const chatBodyRef = useRef<HTMLDivElement | null>(null);
    const speechRecRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastMessageIndexRef = useRef<number>(-1);
    const pendingAutoPlayRef = useRef<number | null>(null);

    const [messages, setMessages] = useState<ChatItem[]>([]);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [speechReady, setSpeechReady] = useState<boolean>(false);
    const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(false);

    // Persist autoPlayEnabled in localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem("chat:autoPlayEnabled");
            if (stored !== null) {
                setAutoPlayEnabled(stored === "1" || stored === "true");
            }
        } catch {
            /* ignore storage errors */
        }
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem("chat:autoPlayEnabled", autoPlayEnabled ? "1" : "0");
        } catch {
            /* ignore storage errors */
        }
    }, [autoPlayEnabled]);

    // Initialize audio element
    useEffect(() => {
        audioRef.current = new Audio();
        if (audioRef.current) {
            audioRef.current.onended = () => {
                setPlayingMessageIndex(null);
            };
            audioRef.current.preload = "auto";
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    useEffect(() => {
        if (messages.length === 0) return;
        const lastIndex = messages.length - 1;

        if (lastIndex <= lastMessageIndexRef.current) return;
        const last = messages[lastIndex];

        if (last.kind === "text" && !last.isUser) {
            pendingAutoPlayRef.current = lastIndex;
        } else {
            lastMessageIndexRef.current = lastIndex;
            pendingAutoPlayRef.current = null;
        }
    }, [messages]);

    // Play TTS for a message
    const playMessage = async (text: string, messageIndex: number) => {
        const trimmed = (text || "").trim();
        if (!trimmed) return;
        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            setPlayingMessageIndex(messageIndex);
            const response = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: trimmed }),
            });
            if (!response.ok) throw new Error("TTS generation failed");
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                await new Promise<void>((resolve, reject) => {
                    if (!audioRef.current) return reject(new Error("Audio element not available"));
                    audioRef.current.onloadeddata = () => resolve();
                    audioRef.current.onerror = () => reject(new Error("Audio loading failed"));
                });
                await audioRef.current.play();
            }
        } catch (e) {
            console.error("Error playing TTS:", e);
            setPlayingMessageIndex(null);
        }
    };

    const stopMessage = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setPlayingMessageIndex(null);
    };

    // Initialize speech recognition
    useEffect(() => {
        // Wait for p5.speech to load
        const checkP5Speech = setInterval(() => {
            if (typeof window !== 'undefined' && window.p5 && (window.p5 as any).SpeechRec) {
                clearInterval(checkP5Speech);
                initializeSpeech();
            }
        }, 100);

        const initializeSpeech = () => {
            try {
                const gotSpeech = () => {
                    if (speechRecRef.current && speechRecRef.current.resultValue) {
                        const said = speechRecRef.current.resultString;
                        if (said && inputRef.current) {
                            inputRef.current.value = said;
                        }
                    }
                };

                // Create new p5.SpeechRec instance
                speechRecRef.current = new (window.p5 as any).SpeechRec('en-US', gotSpeech);
                setSpeechReady(true);
                console.log('Speech recognition initialized');
            } catch (error) {
                console.error('Error initializing speech recognition:', error);
            }
        };

        // Cleanup
        return () => {
            clearInterval(checkP5Speech);
            if (speechRecRef.current) {
                try {
                    speechRecRef.current.stop();
                } catch (e) {
                    console.error('Error stopping speech recognition:', e);
                }
            }
        };
    }, []);

    // Toggle speech recognition
    const toggleSpeechRecognition = () => {
        if (!speechRecRef.current) return;

        try {
            if (isListening) {
                speechRecRef.current.stop();
                setIsListening(false);
                console.log('Stopped listening');
            } else {
                const continuous = true;
                const interimResults = false;
                speechRecRef.current.start(continuous, interimResults);
                setIsListening(true);
                console.log('Started listening');
            }
        } catch (error) {
            console.error('Error toggling speech recognition:', error);
            setIsListening(false);
        }
    };

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
            // After stream completes, auto-play last assistant text if pending and auto-play is enabled
            setTimeout(() => {
                if (pendingAutoPlayRef.current !== null && autoPlayEnabled) {
                    const indexToPlay = pendingAutoPlayRef.current;
                    setMessages(current => {
                        const msg = current[indexToPlay];
                        if (msg && msg.kind === "text" && !msg.isUser && (msg.text || "").trim()) {
                            lastMessageIndexRef.current = indexToPlay;
                            // Play after state settled
                            requestAnimationFrame(() => {
                                playMessage(msg.text, indexToPlay);
                            });
                        }
                        return current;
                    });
                    pendingAutoPlayRef.current = null;
                } else if (pendingAutoPlayRef.current !== null) {
                    // Just update the ref even if not playing
                    lastMessageIndexRef.current = pendingAutoPlayRef.current;
                    pendingAutoPlayRef.current = null;
                }
            }, 100);
        };

        const handleError = ({ message }: { message: string }) => {
            setIsSending(false);
            setMessages(prev => [
                ...prev,
                { kind: "text", isUser: false, text: `Error: ${message}` },
            ]);
        };

        type ActionPayload = {
            intent?: string;
            assistant_message?: string | null;
            [k: string]: unknown;
        };
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
                setMessages(prev => [
                    ...prev,
                    { kind: "text", isUser: false, text: assistantMessage },
                ]);
            }
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
            setIsSending(false);
        };

        const handleActionCancelled = ({ id }: { id: string }) => {
            setMessages(prev =>
                prev.map(m =>
                    m.kind === "action" && m.id === id ? { ...m, status: "cancelled" } : m,
                ),
            );
            setIsSending(false);
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
    }, [autoPlayEnabled]);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (!isSending && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSending]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSending) return;

        const formData = new FormData(e.target as HTMLFormElement);
        const message = formData.get("message") as string;
        const text = (message || "").toString().trim();
        if (!text) return;

        setMessages(prev => [...prev, { kind: "text", isUser: true, text }]);
        setIsSending(true);
        socket.emit("chat:message", text);

        (e.target as HTMLFormElement).reset();
        
        // Stop listening after sending
        if (isListening && speechRecRef.current) {
            try {
                speechRecRef.current.stop();
                setIsListening(false);
            } catch (e) {
                console.error('Error stopping speech:', e);
            }
        }
        // Stop any currently playing TTS when sending a new message
        if (playingMessageIndex !== null) {
            stopMessage();
        }
    };

    return (
        <div
            id="chat"
            className={clsx(
                "fixed z-50",
                isFullScreen
                    ? "chat-screen-full top-0 left-0 w-screen h-screen"
                    : "-bottom-10 right-4",
            )}
        >
            {/* CHAT WINDOW */}
            <div
                className={clsx(
                    "flex flex-col shadow-xl overflow-hidden text-white",
                    isFullScreen
                        ? "w-full h-full rounded-none"
                        : "w-120 h-[min(900px,calc(100vh-32px))] rounded-xl border-border border",
                    isOpen ? "block" : "hidden",
                )}
            >
                {/* Header */}
                <WidgetHeader
                    toggleFullScreen={toggleFullScreen}
                    isFullScreen={isFullScreen}
                    toggle={toggle}
                    autoPlayEnabled={autoPlayEnabled}
                    toggleAutoPlay={() => setAutoPlayEnabled(prev => !prev)}
                />

                {/* Chat Body */}
                <div
                    ref={chatBodyRef}
                    className={`chat-body flex-1 p-4 overflow-y-auto space-y-4 bg-[#f9ecd8]`}
                >
                    {!messages.length && (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-black/80 text-center px-4">
                                This is the start of your conversation with banking assistant.
                            </p>
                        </div>
                    )}
                    {messages.map((m, i) =>
                        m.kind === "text" ? (
                            <Message
                                key={i}
                                message={m.text}
                                isUser={m.isUser}
                                isPlaying={playingMessageIndex === i}
                                onPlay={() => playMessage(m.text, i)}
                                onStop={stopMessage}
                            />
                        ) : (
                            <Action
                                key={m.id}
                                id={m.id}
                                text={m.text}
                                status={m.status}
                                isPlaying={playingMessageIndex === i}
                                onPlay={() => playMessage(m.text, i)}
                                onStop={stopMessage}
                            />
                        ),
                    )}
                </div>

                <div className="w-full h-12 bg-card border-b border-border"></div>

                {/* Chat Input */}
                <div className="bg-card relative">
                    <form onSubmit={e => handleSubmit(e)} className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            autoFocus={isFullScreen}
                            type="text"
                            name="message"
                            placeholder="Type your message or use voice..."
                            className="flex-1 p-4 pr-24 bg-card rounded-xl rounded-t-none text-white placeholder:text-gray-500 outline-none!"
                            disabled={isSending}
                        />
                        
                        {/* Microphone Button */}
                        {speechReady && (
                            <button
                                type="button"
                                onClick={toggleSpeechRecognition}
                                className={clsx(
                                    "absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors",
                                    isListening 
                                        ? "bg-red-500 text-white animate-pulse" 
                                        : "bg-transparent text-gray-400 hover:text-gold"
                                )}
                                disabled={isSending}
                                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                            >
                                {isListening ? (
                                    <MicOff className="w-5 h-5" />
                                ) : (
                                    <Mic className="w-5 h-5" />
                                )}
                            </button>
                        )}
                        
                        {/* Send Button */}
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
