"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

import { useUser } from "@/lib/states";
import SettingsDialog from "../Settings";

export default function Header() {
    const router = useRouter();
    const { logout } = useUser();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <header className="border-b border-border flex justify-center">
            <div className="max-w-7xl w-full flex items-center gap-10 h-20 px-4 sm:px-6 lg:px-8">
                <Link href="/">
                    <h1 className="text-xl">Mock Bank</h1>
                </Link>
                <div className="flex-1 flex items-center gap-5">
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
                    <Link
                        href="/accounts"
                        className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
                    >
                        My Accounts
                    </Link>
                </div>
                <div className="flex items-center gap-6">
                    <Settings
                        className="cursor-pointer w-5 h-5 text-white/70 hover:text-white transition-colors"
                        onClick={() => {
                            setIsSettingsOpen(true);
                        }}
                    />
                    <LogOut
                        className="cursor-pointer w-5 h-5 text-white/70 hover:text-white transition-colors"
                        onClick={() => {
                            logout();
                            localStorage.removeItem("accessToken");
                            router.push("/login");
                        }}
                    />
                </div>
            </div>
            <SettingsDialog isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </header>
    );
}
