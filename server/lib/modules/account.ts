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
        type: "savings" | "checking" | "credit";
        currency: "USD" | "EUR" | "PLN";
    }) {
        const { user, type, currency } = params;
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
            iban,
            balance: 0,
            type,
            currency,
        });

        return newAccount.toObject();
    }
}
