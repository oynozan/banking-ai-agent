"use client";

import React from 'react';
import { useAssistantStore } from '@/store/assistant-store';
import { MessageSquarePlus, X, SendHorizonal } from 'lucide-react';
import clsx from 'clsx';

export function AssistantWidget() {
    const { isOpen, toggle } = useAssistantStore();

    return (
        <div className="fixed bottom-4 right-4 z-50">


            <div
                className={clsx(
                    'transition-all duration-300 ease-in-out',
                    'flex flex-col bg-white shadow-xl rounded-lg',
                    'w-80 h-96 overflow-hidden',
                    isOpen
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                )}
            >
                <div className="flex justify-between items-center p-4 bg-gray-100 border-b">
                    <h3 className="font-semibold text-lg">AI Assistant</h3>
                    <button
                        onClick={toggle}
                        className="p-1 rounded-full hover:bg-gray-200"
                        aria-label="Close assistant chat"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-800 p-3 rounded-lg max-w-xs">
                            <p>Hello! How can I help you today?</p>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <div className="bg-blue-600 text-white p-3 rounded-lg max-w-xs">
                            <p>I have a question about my account.</p>
                        </div>
                    </div>
                    <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-800 p-3 rounded-lg max-w-xs">
                            <p>Sure, I can help with that. What&#39;s your question?</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50">
                    <form
                        onSubmit={(e) => e.preventDefault()}
                        className="flex items-center gap-2"
                    >
                        <input
                            type="text"
                            placeholder="Type your message..."
                            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                    'transition-all duration-300 ease-in-out',
                    'p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    isOpen ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
                )}
                aria-label="Open assistant chat"
            >
                <MessageSquarePlus className="w-6 h-6" />
            </button>
        </div>
    );
}