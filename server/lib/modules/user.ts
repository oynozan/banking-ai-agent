import plnToOthers from "../exchange";
import Accounts from "../../models/Accounts";

export default class User {
    static async getBalanceByUserId(userId: string): Promise<number> {
        let totalBalance = 0; // as PLN

        // Get accounts related to user
        const accounts = await Accounts.find({ "user.id": userId });

        for (const account of accounts) {
            if (account.currency === "PLN") {
                totalBalance += account.balance;
            } else {
                const converted = await plnToOthers(account.balance);
                if (converted) {
                    totalBalance += converted[account.currency as keyof typeof converted];
                }
            }
        }

        return totalBalance;
    }

    static async getBalanceByAccountName(userId: string, accountName: string): Promise<{ balance: number; currency: string; name: string; iban: string } | null> {
        if (!accountName || typeof accountName !== "string" || accountName.trim().length === 0) {
            return null;
        }

        // Clean the account name: remove quotes and trim whitespace
        const cleanedName = accountName.trim().replace(/^["']|["']$/g, "").trim();
        
        if (cleanedName.length === 0) {
            return null;
        }
        
        // Find the account by name and user ID (case-insensitive)
        const account = await Accounts.findOne({
            "user.id": userId,
            name: { $regex: new RegExp(`^${cleanedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
        }).lean();

        if (!account) {
            return null;
        }

        return {
            balance: account.balance,
            currency: account.currency,
            name: account.name,
            iban: account.iban,
        };
    }
}
