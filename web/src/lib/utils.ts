import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Transaction } from "@/components/App/TransactionHistory/TransactionList";
import { ITransaction } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Maps the raw API transaction data (ITransaction) to the
 * format expected by the TransactionList component (Transaction).
 */
export function mapApiToFrontend(apiTransactions: ITransaction[]): Transaction[] {
    if (!apiTransactions) return [];

    return apiTransactions.map(tx => {
        // Determine type: 'isSent' (true) means 'debit', 'isSent' (false) means 'credit'
        const type = tx.isSent ? "debit" : "credit";

        // Determine merchant name: If we sent it, show the receiver. If we received it, show the sender.
        const merchant = tx.isSent ? tx.participants.receiverName : tx.participants.senderName;

        // Format the date for display
        const date = new Date(tx.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });

        return {
            id: tx._id, // Use MongoDB _id
            date: date,
            merchant: merchant || "Unknown", // Fallback for missing names
            category: tx.category,
            amount: tx.amount,
            type: type, // "credit" or "debit"
        };
    });
}
