import Link from "next/link";
import { History, Send } from "lucide-react";

export default function Header() {
    return (
        <header className="border-b border-border flex justify-center">
            <div className="max-w-7xl w-full flex items-center gap-8 h-20 px-4 sm:px-6 lg:px-8">
                <h1 className="text-xl">Mock Bank</h1>
                <div className="flex-1 flex items-center gap-4">
                    <Link
                        href="/send"
                        className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
                    >
                        <Send size={16} />
                        Money Transfer
                    </Link>
                    <Link
                        href="/transactions"
                        className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
                    >
                        <History size={16} />
                        Transaction History
                    </Link>
                </div>
                <div></div>
            </div>
        </header>
    );
}
