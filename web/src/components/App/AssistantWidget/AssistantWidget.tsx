"use client";

import React from 'react';
import { useAssistantStore } from '@/store/assistant-store'; // Adjust path as needed
import { MessageSquarePlus, X, SendHorizonal } from 'lucide-react';
import clsx from 'clsx';

export function AssistantWidget() {
    const { isOpen, toggle } = useAssistantStore();

    return (
        <div className="fixed bottom-4 right-4 z-50">

            {/* CHAT WINDOW */}
            <div
                className={clsx(
                    'flex flex-col bg-zinc-200 shadow-xl rounded-lg',
                    'w-96 h-[800px] overflow-hidden text-white', // Fixed dimensions
                    isOpen
                        ? 'block' // Instantly shows
                        : 'hidden'  // Instantly hides
                )}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 bg-[#002e3c] border-b border-b-[#13181a]">
                    <h3 className="font-semibold text-lg text-[#ffd700]">AI Assistant</h3>
                    <button
                        onClick={toggle}
                        className="p-1 rounded-full text-gray-300 hover:bg-[#1c292d]"
                        aria-label="Close assistant chat"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* --- SCROLLABLE CHAT BODY --- */}
                {/* This div is the key part for your future chat logic.
                    'flex-1' makes it fill the space.
                    'overflow-y-auto' makes it scrollable.
                */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {/* AI Message */}
                    <div className="flex justify-start">
                        <div className="bg-[#13181a] text-gray-200 p-3 rounded-lg max-w-xs">
                            <p>Hello! How can I help you today?</p>
                        </div>
                    </div>
                    {/* User Message */}
                    <div className="flex justify-end">
                        <div className="bg-[#002e3c] text-white p-3 rounded-lg max-w-xs">
                            <p>I have a question about my account.</p>
                        </div>
                    </div>
                    {/* AI Message */}
                    <div className="flex justify-start">
                        <div className="bg-[#13181a] text-gray-200 p-3 rounded-lg max-w-xs">
                            <p>Sure, I can help with that. What&#39;s your question?</p>
                        </div>
                    </div>
                    {/* Add more messages here to test scrolling */}
                    <div className="flex justify-start">
                        <div className="bg-[#13181a] text-gray-200 p-3 rounded-lg max-w-xs">
                            <p>Just add a few more of these...</p>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <div className="bg-[#002e3c] text-white p-3 rounded-lg max-w-xs">
                            <p>...and you will see...</p>
                        </div>
                    </div>
                    <div className="flex justify-start">
                        <div className="bg-[#13181a] text-gray-200 p-3 rounded-lg max-w-xs">
                            <p>...that the scrollbar appears!</p>
                        </div>
                    </div>
                </div>

                {/* Chat Input (Mock) */}
                <div className="p-4 border-t border-t-[#13181a] bg-[#13181a]">
                    <form
                        onSubmit={(e) => e.preventDefault()}
                        className="flex items-center gap-2"
                    >
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
            <button
                onClick={toggle}
                className={clsx(
                    'p-4 bg-[#ffd700] text-[#13181a] rounded-full shadow-lg hover:bg-[#ffd700]/90 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:ring-offset-2 focus:ring-offset-gray-800',
                    isOpen ? 'hidden' : 'block' // Toggles visibility
                )}
                aria-label="Open assistant chat"
            >
                <MessageSquarePlus className="w-6 h-6" />
            </button>
        </div>
    );
}