import Users from "../models/Users";
import Accounts from "../models/Accounts";

export class MCP {
    async checkBalanceByUserId(userId: string): Promise<{ balance: number; accounts?: { iban: string; balance: number; currency: string }[] }> {
        const user = await Users.findOne({ id: userId }).lean();
        if (user && typeof user.balance === "number") {
            return { balance: user.balance };
        }

        const accounts = await Accounts.find({ "user.id": userId }).lean();
        const balance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
        const mapped = accounts.map(a => ({ iban: a.iban, balance: a.balance, currency: a.currency }));
        return { balance, accounts: mapped };
    }
}