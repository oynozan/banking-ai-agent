import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Transaction } from "@/components/App/TransactionHistory/TransactionList";
import { ITransaction } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function mapApiToFrontend(apiTransactions: ITransaction[]): Transaction[] {
    if (!apiTransactions) return [];

    return apiTransactions.map(tx => {
        const type = tx.isSent ? "debit" : "credit";

        const merchant = tx.isSent ? tx.participants.receiverName : tx.participants.senderName;

        const date = new Date(tx.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });

        return {
            id: tx._id,
            date: date,
            merchant: merchant || "Unknown",
            category: tx.category,
            amount: tx.amount,
            type: type,
        };
    });
}

export function formatCurrency(value: number) {
    return value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
