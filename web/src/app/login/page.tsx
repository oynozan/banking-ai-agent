 "use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConnectButton, useAccount, useWallets } from "@particle-network/connectkit";
import type { Address } from "viem";

import { LoginForm } from "@/components/App/Forms/LoginForm";
import { useUser } from "@/lib/states";

export default function LoginPage() {
    const router = useRouter();
    const { setUser, setState, user } = useUser();
    const { isConnected, address } = useAccount();
    const [primaryWallet] = useWallets();
    const [isWeb3Loading, setIsWeb3Loading] = useState(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL as string;

    const handleWeb3Login = async () => {
        try {
            setIsWeb3Loading(true);
            if (!isConnected || !address) {
                toast.error("Please connect a wallet first.");
                return;
            }
            const walletClient = primaryWallet?.getWalletClient();
            if (!walletClient) {
                toast.error("Wallet client unavailable");
                return;
            }

            const nonceResp = await fetch(`${apiUrl}/auth/wallet-login/nonce`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address }),
            });
            if (!nonceResp.ok) {
                toast.error("Failed to get login nonce");
                return;
            }
            const { message } = await nonceResp.json();
            if (!message) {
                toast.error("Invalid nonce response");
                return;
            }

            const signature = (await walletClient.signMessage({
                account: address as Address,
                message,
            })) as string;

            const verifyResp = await fetch(`${apiUrl}/auth/wallet-login/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, signature }),
            });
            if (!verifyResp.ok) {
                const err = await verifyResp.json().catch(() => ({}));
                toast.error(err?.error || "Web3 login failed");
                return;
            }
            const data = await verifyResp.json();
            if (!data?.status) {
                toast.error(data?.error || "Web3 login failed");
                return;
            }

            // Mirror traditional login
            setUser(data.user);
            setState("logged_in");
            localStorage.setItem("accessToken", data.accessToken);
            toast.success("Logged in with wallet");
            router.replace("/");
        } catch (e) {
            console.error(e);
            toast.error("Web3 login failed");
        } finally {
            setIsWeb3Loading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-md">
                <div className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8 md:p-10">
                    <div className="mb-8">
                        <Image src="/logo.svg" alt="logo" width={500} height={40} />
                    </div>

                    <LoginForm />

                    <div className="my-6 flex items-center gap-3">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-xs text-white/40">or</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <div className="flex flex-col gap-3">
                        {isConnected ? (
                            <button
                                onClick={handleWeb3Login}
                                disabled={isWeb3Loading}
                                className="w-full h-12 bg-[#1a1a1a] text-white border border-white/15 hover:bg-[#222] rounded-xl"
                            >
                                {isWeb3Loading ? "Signing..." : "Wallet Login"}
                            </button>
                        ) : (
                            <div className="w-full">
                                <ConnectButton />
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 text-center space-x-4 text-sm">
                    <button className="text-white/50 hover:text-gold transition-colors">
                        Privacy Policy
                    </button>
                    <span className="text-white/30">•</span>
                    <button className="text-white/50 hover:text-gold transition-colors">
                        Terms of Service
                    </button>
                    <span className="text-white/30">•</span>
                    <button className="text-white/50 hover:text-gold transition-colors">
                        Help
                    </button>
                </div>
            </div>
        </div>
    );
}
