import Link from "next/link";

export default function Header() {
    return (
        <header className="border-b border-border h-20 flex items-center gap-6 px-4">
            <h1>Bank</h1>
            <div className="flex-1 flex items-center gap-2">
                <Link href="/transactions" className="text-gray-600">Transaction History</Link>
            </div>
            <div>
                
            </div>
        </header>
    );
}
