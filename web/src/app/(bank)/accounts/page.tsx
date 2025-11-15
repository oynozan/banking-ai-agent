"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Currency = "USD" | "EUR" | "PLN";
type AccountType = "savings" | "checking" | "credit";

type Account = {
    iban: string;
    balance: number;
    type: AccountType;
    currency: Currency;
    createdAt: string | Date;
};

export default function AccountsPage() {
    const {
        data,
        refetch,
        isFetching,
        isLoading,
    } = useQuery({
        queryKey: ["accounts-list"],
        queryFn: async () => {
            const accessToken =
                typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
            const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts`, { headers });
            if (!res.ok) {
                throw new Error("Failed to fetch accounts");
            }
            return res.json() as Promise<{ accounts?: Account[] }>;
        },
    });

    const accounts: Account[] = useMemo(
        () => (Array.isArray(data?.accounts) ? data!.accounts! : []),
        [data],
    );

    return (
        <div id="accounts" className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl text-white mb-1">Accounts</h1>
                    <p className="text-gray-400">View and manage your bank accounts</p>
                </div>
            </div>

            <CreateAccountCard onCreated={async () => void refetch()} />

            <section>
                <h2 className="text-xl text-white mb-2 mt-2">Your Accounts</h2>
                <div className="bg-card rounded-sm border border-gold/30 transition-all shadow-xl p-6">
                    {isLoading || isFetching ? (
                        <div className="flex items-center gap-2 text-gray-300">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading accounts...
                        </div>
                    ) : accounts.length === 0 ? (
                        <p className="text-gray-400">You don&apos;t have any accounts yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {accounts.map((acc) => (
                                <article
                                    key={acc.iban}
                                    className="rounded-sm border border-gold/30 bg-white/3 p-4 hover:border-gold/45 transition-all"
                                >
                                    <p className="text-sm text-gray-400">IBAN</p>
                                    <p className="text-white font-medium break-all">{acc.iban}</p>
                                    <Separator className="my-3" />
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-400">Balance</p>
                                            <p className="text-gold text-lg">
                                                {acc.balance} {acc.currency}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">Type</p>
                                            <p className="text-white capitalize">{acc.type}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3">
                                        Created {new Date(acc.createdAt).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </p>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function CreateAccountCard({ onCreated }: { onCreated: () => Promise<void> | void }) {
    const [type, setType] = useState<AccountType | "">("");
    const [currency, setCurrency] = useState<Currency | "">("");

    const { mutateAsync: createAccount, isPending } = useMutation({
        mutationKey: ["create-account"],
        mutationFn: async (payload: { type: AccountType; currency: Currency }) => {
            const accessToken =
                typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
            const headers: HeadersInit = {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            };
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.error || "Failed to create account");
            }
            return json as { account: Account };
        },
        onSuccess: async () => {
            toast.success("Account created successfully.");
            setType("");
            setCurrency("");
            await onCreated();
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : "An unexpected error occurred";
            toast.error(message);
        },
    });

    const canCreate = type !== "" && currency !== "" && !isPending;

    const handleCreate = async () => {
        if (!canCreate || !type || !currency) return;
        try {
            await createAccount({ type, currency });
        } catch {
            /* handled in onError */
        }
    };

    return (
        <section>
            <h2 className="text-xl text-white mb-2 mt-2">Create New Account</h2>
            <div className="bg-card rounded-sm border border-gold/30 transition-all shadow-xl p-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <p className="text-white">Account type</p>
                        <Select
                            value={type}
                            onValueChange={(v: AccountType) => setType(v)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Type</SelectLabel>
                                    <SelectItem value="savings">Savings</SelectItem>
                                    <SelectItem value="checking">Checking</SelectItem>
                                    <SelectItem value="credit">Credit</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="text-white">Currency</p>
                        <Select
                            value={currency}
                            onValueChange={(v: Currency) => setCurrency(v)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Currency</SelectLabel>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="PLN">PLN</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Separator className="my-6" />

                <div className="w-full flex items-end justify-end">
                    <Button disabled={!canCreate} onClick={handleCreate}>
                        {isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Account
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </section>
    );
}

