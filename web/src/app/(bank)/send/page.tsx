"use client";

import clsx from "clsx";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Send() {
    const [activeTab, setActiveTab] = useState<"internal" | "external">("internal");

    const handleTabClick = (tab: "internal" | "external") => {
        setActiveTab(tab);
    };

    return (
        <div id="send">
            <div className="flex items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl text-white mb-1">Money Transfer</h1>
                    <p className="text-gray-400">
                        Transfer money to your other accounts or to someone else instantly
                    </p>
                </div>
            </div>

            <h2>Send your money to...</h2>
            <div className="flex flex-col gap-4 mt-2">
                <div className="bg-card rounded-sm border border-gold/30 transition-all shadow-xl flex items-center">
                    <button
                        className={clsx(
                            "w-1/2 p-4 border-r border-gold/30",
                            activeTab === "internal" ? "bg-gold text-black" : "",
                        )}
                        onClick={() => handleTabClick("internal")}
                    >
                        Between Accounts
                    </button>
                    <button
                        className={clsx(
                            "w-1/2 p-4",
                            activeTab === "external" ? "bg-gold text-black" : "",
                        )}
                        onClick={() => handleTabClick("external")}
                    >
                        Someone Else
                    </button>
                </div>
            </div>

            <div className="mt-8">
                {activeTab === "internal" && <InternalTransfer />}
                {activeTab === "external" && <ExternalTransfer />}
            </div>
        </div>
    );
}

function InternalTransfer() {
    type Account = {
        iban: string;
        balance?: number;
        currency?: string;
        type?: string;
    };

    const [fromAccountId, setFromAccountId] = useState<string | undefined>(undefined);
    const [toAccountId, setToAccountId] = useState<string | undefined>(undefined);
    const [amount, setAmount] = useState<string>("");

    const {
        data,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ["accounts"],
        enabled: false, // fetch only when a select is opened
        queryFn: async () => {
            const accessToken =
                typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
            const headers: HeadersInit = accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {};

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts`, { headers });
            if (!res.ok) {
                throw new Error("Failed to fetch accounts");
            }
            return res.json() as Promise<{ accounts?: Account[] }>;
        },
    });

    const accounts: Account[] = Array.isArray(data?.accounts) ? data!.accounts! : [];

    const selectedFrom = accounts.find((a) => a.iban === fromAccountId);
    const selectedTo = accounts.find((a) => a.iban === toAccountId);

    const fromOptions = accounts.filter((acc) => {
        if (acc.iban === toAccountId) return false;
        if (selectedTo?.currency && acc.currency && acc.currency !== selectedTo.currency) {
            return false;
        }
        return true;
    });

    const toOptions = accounts.filter((acc) => {
        if (acc.iban === fromAccountId) return false;
        if (selectedFrom?.currency && acc.currency && acc.currency !== selectedFrom.currency) {
            return false;
        }
        return true;
    });

    const { mutateAsync: transferInternal, isPending } = useMutation({
        mutationKey: ["transfer-internal"],
        mutationFn: async (payload: { fromAccountId: string; toAccountId: string; amount: number }) => {
            const accessToken =
                typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
            const headers: HeadersInit = {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            };

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transfer/internal`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.error || "Transfer failed");
            }
            return json as {
                success: boolean;
                from: { iban: string; balance: number; currency: string };
                to: { iban: string; balance: number; currency: string };
            };
        },
        onSuccess: async () => {
            toast.success("Transfer completed successfully.");
            setAmount("");
            setFromAccountId(undefined);
            setToAccountId(undefined);
            await refetch();
        },
        onError: (error) => {
            const message =
                error instanceof Error ? error.message : "An unexpected error occurred";
            toast.error(message);
        },
    });

    const parsedAmount = Number.parseFloat(amount);
    const insufficientFunds =
        typeof selectedFrom?.balance === "number" && Number.isFinite(parsedAmount)
            ? parsedAmount > selectedFrom.balance
            : false;

    const sameCurrencySelected =
        !!selectedFrom && !!selectedTo ? selectedFrom.currency === selectedTo.currency : true;

    const canSubmit =
        !!fromAccountId &&
        !!toAccountId &&
        fromAccountId !== toAccountId &&
        Number.isFinite(parsedAmount) &&
        parsedAmount > 0 &&
        !!selectedFrom &&
        !!selectedTo &&
        sameCurrencySelected &&
        !insufficientFunds;

    const handleTransfer = async () => {
        if (!canSubmit || !fromAccountId || !toAccountId) return;

        try {
            await transferInternal({
                fromAccountId,
                toAccountId,
                amount: parsedAmount,
            });
        } catch {}
    };

    return (
        <div>
            <h2>Send money between your accounts</h2>
            <div className="bg-card rounded-sm border border-gold/30 transition-all shadow-xl p-8 flex flex-col gap-6 mt-2">
                <div className="flex items-top gap-4">
                    <section className="flex-1">
                        <h3 className="text-white">From</h3>
                        <p className="text-gray-400 mb-2">
                            Choose the account you want to send from
                        </p>
                        <Select
                            value={fromAccountId}
                            onValueChange={(value) => {
                                setFromAccountId(value);
                                if (toAccountId) {
                                    const newFrom = accounts.find((a) => a.iban === value);
                                    const currentTo = accounts.find((a) => a.iban === toAccountId);
                                    if (
                                        !currentTo ||
                                        currentTo.iban === value ||
                                        (newFrom?.currency &&
                                            currentTo.currency &&
                                            newFrom.currency !== currentTo.currency)
                                    ) {
                                        setToAccountId(undefined);
                                    }
                                }
                            }}
                            onOpenChange={(open) => {
                                if (open) {
                                    void refetch();
                                }
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select an account" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Accounts</SelectLabel>
                                    {isFetching && <Loader2 className="m-2 w-4 h-4 animate-spin" />}
                                    {!isFetching &&
                                        fromOptions.map((acc) => (
                                            <SelectItem key={acc.iban} value={acc.iban}>
                                                {acc.iban || `Account (${acc.type ?? "unknown"})`}
                                                <span className="text-gray-400">
                                                    {typeof acc.balance === "number"
                                                        ? ` - ${acc.balance} ${acc.currency ?? ""}`
                                                        : ""}
                                                </span>
                                            </SelectItem>
                                        ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </section>
                    <div className="flex items-center justify-center">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                    <section className="flex-1">
                        <h3 className="text-white">To</h3>
                        <p className="text-gray-400 mb-2">Choose the account you want to send to</p>
                        <Select
                            value={toAccountId}
                            onValueChange={(value) => {
                                setToAccountId(value);
                                if (fromAccountId) {
                                    const newTo = accounts.find((a) => a.iban === value);
                                    const currentFrom = accounts.find((a) => a.iban === fromAccountId);
                                    if (
                                        !currentFrom ||
                                        currentFrom.iban === value ||
                                        (newTo?.currency &&
                                            currentFrom.currency &&
                                            newTo.currency !== currentFrom.currency)
                                    ) {
                                        setFromAccountId(undefined);
                                    }
                                }
                            }}
                            onOpenChange={(open) => {
                                if (open) {
                                    void refetch();
                                }
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select an account" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Accounts</SelectLabel>
                                    {isFetching && <Loader2 className="m-2 w-4 h-4 animate-spin" />}
                                    {!isFetching &&
                                        toOptions.map((acc) => (
                                            <SelectItem key={acc.iban} value={acc.iban}>
                                                {acc.iban || `Account (${acc.type ?? "unknown"})`}
                                                <span className="text-gray-400">
                                                    {typeof acc.balance === "number"
                                                        ? ` - ${acc.balance} ${acc.currency ?? ""}`
                                                        : ""}
                                                </span>
                                            </SelectItem>
                                        ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </section>
                </div>

                <Separator />

                <section>
                    <h3 className="text-white">Amount</h3>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400">Enter the amount you want to send</p>
                        <p className="text-gray-400">
                            Available balance:{" "}
                            <span className="text-gold">
                                {selectedFrom?.balance ?? 0} {selectedFrom?.currency ?? ""}
                            </span>
                        </p>
                    </div>
                    <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Enter the amount"
                        className="w-full"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    {insufficientFunds && (
                        <p className="text-sm text-red-400 mt-2">Insufficient balance.</p>
                    )}
                </section>

                <Separator />

                <section className="w-full flex items-end justify-end gap-2">
                    <Button
                        disabled={!canSubmit || isPending}
                        onClick={handleTransfer}
                    >
                        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Send Money
                    </Button>
                </section>
            </div>
        </div>
    );
}

function ExternalTransfer() {
    type Account = {
        iban: string;
        balance?: number;
        currency?: string;
        type?: string;
    };

    const [recipientType, setRecipientType] = useState<"id" | "iban">("id");
    const [recipientValue, setRecipientValue] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [fromAccountId, setFromAccountId] = useState<string | undefined>(undefined);
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");

    const {
        data,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ["accounts"],
        enabled: false,
        queryFn: async () => {
            const accessToken =
                typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
            const headers: HeadersInit = accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {};

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts`, { headers });
            if (!res.ok) {
                throw new Error("Failed to fetch accounts");
            }
            return res.json() as Promise<{ accounts?: Account[] }>;
        },
    });

    const accounts: Account[] = Array.isArray(data?.accounts) ? data!.accounts! : [];
    const selectedFrom = accounts.find((account) => account.iban === fromAccountId);

    const categories = [
        "Shopping",
        "Bill Payment",
        "Rent",
        "Utilities",
        "Donation",
        "Other",
    ];

    const { mutateAsync: transferExternal, isPending } = useMutation({
        mutationKey: ["transfer-external"],
        mutationFn: async (payload: {
            fromAccountId: string;
            recipientType: "id" | "iban";
            recipientValue: string;
            recipientName: string;
            amount: number;
            category: string;
        }) => {
            const accessToken =
                typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
            const headers: HeadersInit = {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            };

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transfer/external`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.error || "Transfer failed");
            }
            return json;
        },
        onSuccess: async () => {
            toast.success("Transfer completed successfully.");
            setRecipientName("");
            setRecipientValue("");
            setAmount("");
            setCategory("");
            setFromAccountId(undefined);
            await refetch();
        },
        onError: (error) => {
            const message =
                error instanceof Error ? error.message : "An unexpected error occurred";
            toast.error(message);
        },
    });

    const parsedAmount = Number.parseFloat(amount);
    const insufficientFunds =
        typeof selectedFrom?.balance === "number" && Number.isFinite(parsedAmount)
            ? parsedAmount > selectedFrom.balance
            : false;

    const canSubmit =
        recipientValue.trim().length > 0 &&
        recipientName.trim().length > 0 &&
        !!fromAccountId &&
        Number.isFinite(parsedAmount) &&
        parsedAmount > 0 &&
        category.trim().length > 0 &&
        !insufficientFunds;

    const handleTransfer = async () => {
        if (!canSubmit || !fromAccountId) return;

        try {
            await transferExternal({
                fromAccountId,
                recipientType,
                recipientValue: recipientValue.trim(),
                recipientName: recipientName.trim(),
                amount: parsedAmount,
                category,
            });
        } catch {
            /* errors handled via onError */
        }
    };

    return (
        <div>
            <h2>Send money to someone else</h2>
            <div className="bg-card rounded-sm border border-gold/30 transition-all shadow-xl p-8 flex flex-col gap-6 mt-2">
                <div className="grid gap-4 md:grid-cols-2">
                    <section className="flex flex-col gap-2">
                        <p className="text-white">Recipient identifier type</p>
                        <Select
                            value={recipientType}
                            onValueChange={(value: "id" | "iban") => setRecipientType(value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select identifier type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Identifier</SelectLabel>
                                    <SelectItem value="id">Account ID</SelectItem>
                                    <SelectItem value="iban">IBAN</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </section>
                    <section className="flex flex-col gap-2">
                        <p className="text-white">Recipient account</p>
                        <Input
                            placeholder={
                                recipientType === "id"
                                    ? "Enter recipient account ID"
                                    : "Enter recipient IBAN"
                            }
                            value={recipientValue}
                            onChange={(e) => setRecipientValue(e.target.value)}
                        />
                    </section>
                </div>

                <section className="flex flex-col gap-2">
                    <p className="text-white">Recipient name</p>
                    <Input
                        placeholder="Enter recipient full name"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                    />
                </section>

                <section className="flex flex-col gap-2">
                    <p className="text-white">From account</p>
                    <Select
                        value={fromAccountId}
                        onValueChange={setFromAccountId}
                        onOpenChange={(open) => {
                            if (open) {
                                void refetch();
                            }
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select one of your accounts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Your accounts</SelectLabel>
                                {isFetching && <Loader2 className="m-2 w-4 h-4 animate-spin" />}
                                {!isFetching &&
                                    accounts.map((acc) => (
                                        <SelectItem key={acc.iban} value={acc.iban}>
                                            {acc.iban || `Account (${acc.type ?? "unknown"})`}
                                            <span className="text-gray-400">
                                                {typeof acc.balance === "number"
                                                    ? ` - ${acc.balance} ${acc.currency ?? ""}`
                                                    : ""}
                                            </span>
                                        </SelectItem>
                                    ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    {selectedFrom && (
                        <p className="text-sm text-gray-400">
                            Balance:{" "}
                            <span className="text-gold">
                                {selectedFrom.balance ?? 0} {selectedFrom.currency ?? ""}
                            </span>
                        </p>
                    )}
                </section>

                <Separator />

                <section>
                    <h3 className="text-white">Amount</h3>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400">Enter the amount you want to send</p>
                        <p className="text-gray-400">
                            Available balance:{" "}
                            <span className="text-gold">
                                {selectedFrom?.balance ?? 0} {selectedFrom?.currency ?? ""}
                            </span>
                        </p>
                    </div>
                    <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Enter the amount"
                        className="w-full"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    {insufficientFunds && (
                        <p className="text-sm text-red-400 mt-2">Insufficient balance.</p>
                    )}
                </section>

                <Separator />

                <section className="flex flex-col gap-2">
                    <p className="text-white">Payment category</p>
                    <Select value={category} onValueChange={(value) => setCategory(value)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Categories</SelectLabel>
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </section>

                <Separator />

                <section className="w-full flex items-end justify-end gap-2">
                    <Button disabled={!canSubmit || isPending} onClick={handleTransfer}>
                        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Send Money
                    </Button>
                </section>
            </div>
        </div>
    );
}
