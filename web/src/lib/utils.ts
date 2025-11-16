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
        const ibanCombo = ((tx.participants?.sender || "") + (tx.participants?.receiver || ""));

        let currency = tx.currency ?? "PLN";
        if (!tx.currency) {
            if (ibanCombo.includes("PL")) currency = "PLN";
            if (ibanCombo.includes("DE")) currency = "EUR";
            if (ibanCombo.includes("US")) currency = "USD";
        }

        const date = new Date(tx.date).toISOString();

        return {
            id: tx._id,
            date: date,
            merchant: merchant || "Unknown",
            category: tx.category,
            amount: tx.amount,
            type: type,
            currency,
        };
    });
}

export function formatCurrency(value: number) {
    return value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
