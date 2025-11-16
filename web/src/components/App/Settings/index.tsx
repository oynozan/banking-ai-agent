import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/states";
import { useState } from "react";
import { toast } from "sonner";
import { ConnectButton, useAccount, useDisconnect, useWallets } from "@particle-network/connectkit";
import type { Address } from "viem";

export default function SettingsDialog({
    isOpen,
    onOpenChange,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { user, setUser } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const { isConnected, address } = useAccount();
    const [primaryWallet] = useWallets();
    const { disconnect } = useDisconnect();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL as string;

    async function linkWallet() {
        try {
            setIsLoading(true);

            const accessToken = localStorage.getItem("accessToken");
            if (!accessToken) {
                toast.error("You must be logged in");
                return;
            }

            // Require a connected wallet via Particle
            if (!isConnected || !address) {
                toast.info("Connect a wallet first");
                return;
            }

            const walletClient = primaryWallet?.getWalletClient();
            if (!walletClient) {
                toast.error("Wallet client unavailable");
                return;
            }

            const nonceResp = await fetch(`${apiUrl}/auth/wallet/nonce`, {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!nonceResp.ok) {
                toast.error("Failed to get nonce");
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

            const verifyResp = await fetch(`${apiUrl}/auth/wallet/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ address, signature }),
            });
            if (!verifyResp.ok) {
                toast.error("Wallet verification failed");
                return;
            }

            const data = await verifyResp.json();
            if (data?.user) {
                setUser(data.user);
                toast.success("Wallet linked");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to connect wallet");
        } finally {
            setIsLoading(false);
        }
    }

    async function disconnectWallet() {
        try {
            setIsLoading(true);
            const accessToken = localStorage.getItem("accessToken");
            if (!accessToken) {
                toast.error("You must be logged in");
                return;
            }

            const resp = await fetch(`${apiUrl}/auth/wallet/disconnect`, {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!resp.ok) {
                toast.error("Failed to disconnect wallet");
                return;
            }

            const data = await resp.json();
            if (data?.user) {
                setUser(data.user);
                toast.success("Wallet disconnected");
            }

            try {
                disconnect?.();
            } catch {
                /* no-op */
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to disconnect wallet");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Warning</DialogTitle>
                    <DialogDescription>
                        This action will connect your Web3 wallet to your bank account. If you get
                        your private keys stolen, you may give 3rd parties access to your bank
                        account.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-white/70">
                        {user?.wallet ? (
                            <>
                                <div>Your wallet is linked:</div>
                                <div className="font-mono break-all text-white/90">
                                    {user.wallet}
                                </div>
                            </>
                        ) : (
                            <>
                                <div>No wallet linked</div>
                                {isConnected && address && (
                                    <div className="text-xs text-white/60 mt-1">
                                        Connected wallet: <span className="font-mono">{address}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    {user?.wallet ? (
                        <Button
                            variant="destructive"
                            disabled={isLoading}
                            onClick={disconnectWallet}
                        >
                            {isLoading ? "Disconnecting..." : "Disconnect"}
                        </Button>
                    ) : (
                        <>
                            {isConnected ? (
                                <Button disabled={isLoading} onClick={linkWallet}>
                                    {isLoading ? "Linking..." : "Link Wallet"}
                                </Button>
                            ) : (
                                <ConnectButton />
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
