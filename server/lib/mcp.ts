import UserLib from "./user";

export class MCP {
    async checkBalanceByUserId(
        userId: string,
    ): Promise<{
        balance: number;
        accounts?: { iban: string; balance: number; currency: string }[];
    }> {
        const balance = await UserLib.getBalanceByUserId(userId);
        return { balance };
    }
}
