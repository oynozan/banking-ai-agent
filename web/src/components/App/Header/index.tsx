import Link from "next/link";

export default function Header() {
    return (
        <header className="border-b border-border flex justify-center">
            <div className="max-w-7xl w-full flex items-center gap-8 h-20 px-4 sm:px-6 lg:px-8">
                <Link href="/">
                    <h1 className="text-xl">Mock Bank</h1>
                </Link>
                <div className="flex-1 flex items-center gap-4">
                    <Link
                        href="/send"
                        className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
                    >
                        Money Transfer
                    </Link>
                    <Link
                        href="/transactions"
                        className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
                    >
                        Transaction History
                    </Link>
                </div>
                <div></div>
            </div>
        </header>
    );
}
