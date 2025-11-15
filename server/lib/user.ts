import plnToOthers from "./exchange";
import Accounts from "../models/Accounts";

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
}
