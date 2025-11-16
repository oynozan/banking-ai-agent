import Users from "../../models/Users";
import Accounts from "../../models/Accounts";

export default class Account {
    static async generateUniqueIban(currency: "USD" | "EUR" | "PLN"): Promise<string> {
        const currencyPrefix: Record<"USD" | "EUR" | "PLN", string> = {
            USD: "US",
            EUR: "DE",
            PLN: "PL",
        };

        const prefix = currencyPrefix[currency];

        for (let attempt = 0; attempt < 7; attempt++) {
            const checkDigits = Math.floor(10 + Math.random() * 89).toString();
            const bank = Math.floor(1000 + Math.random() * 9000).toString();
            const account = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join(
                "",
            );
            const iban = `${prefix}${checkDigits}${bank}${account}`;

            const existing = await Accounts.findOne({ iban }).select("_id").lean();
            if (!existing) return iban;
        }

        return `${currencyPrefix[currency]}${Date.now().toString().slice(-10)}${Math.floor(
            1000 + Math.random() * 9000,
        ).toString()}`;
    }

    static async createAccount(params: {
        user: { id: string; name?: string };
        name: string;
        type: "savings" | "checking" | "credit";
        currency: "USD" | "EUR" | "PLN";
    }) {
        const { user, name, type, currency } = params;
        const iban = await Account.generateUniqueIban(currency);

        if (!user.name) {
            const userData = await Users.findOne({ id: user.id }).select("name").lean();
            if (!userData) return null;
            user.name = userData.name;
        }

        const newAccount = await Accounts.create({
            user: {
                id: user.id,
                name: user.name,
            },
            name,
            iban,
            balance: 0,
            type,
            currency,
        });

        // Verify the account was saved to the database
        const savedAccount = await Accounts.findOne({ iban: newAccount.iban }).lean();
        if (!savedAccount) {
            console.error("Failed to verify account save to database:", newAccount.iban);
            throw new Error("Account creation failed - could not verify save");
        }

        return newAccount.toObject();
    }

    static async deleteAccount(params: {
        userId: string;
        name: string;
    }) {
        const { userId, name } = params;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return null;
        }

        // Find the account by name and user ID
        const account = await Accounts.findOne({
            "user.id": userId,
            name: name.trim(),
        });

        if (!account) {
            return null;
        }

        // Check if account has a balance (optional safety check)
        // You might want to prevent deletion of accounts with non-zero balance
        // For now, we'll allow deletion regardless of balance

        // Delete the account
        await Accounts.deleteOne({ _id: account._id });

        // Verify deletion
        const deleted = await Accounts.findOne({ _id: account._id }).lean();
        if (deleted) {
            console.error("Failed to verify account deletion:", account.iban);
            throw new Error("Account deletion failed - could not verify deletion");
        }

        return {
            iban: account.iban,
            name: account.name,
            type: account.type,
            currency: account.currency,
        };
    }
}
