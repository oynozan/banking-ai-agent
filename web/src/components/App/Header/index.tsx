import Link from "next/link";

export default function Header() {
    return (
        <header className="border-b border-border flex justify-center">
            <div className="max-w-7xl w-full flex items-center gap-6 h-20 px-4 sm:px-6 lg:px-8">
                <h1>Bank</h1>
                <div className="flex-1 flex items-center gap-2">
                    <Link href="/transactions" className="text-white/70 hover:text-white transition-colors">
                        Transaction History
                    </Link>
                </div>
                <div></div>
            </div>
        </header>
    );
}
