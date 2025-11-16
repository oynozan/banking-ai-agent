import mongoose from "mongoose";

import Accounts from "../../models/Accounts";
import Transactions from "../../models/Transactions";
import Users from "../../models/Users";

type InternalTransferParams = {
    userId: string;
    fromIban: string;
    toIban: string;
    amount: number;
};

type ExternalTransferParams = {
    userId: string;
    fromIban: string;
    amount: number;
    recipientType: "id" | "iban" | "account_id";
    recipientValue: string;
    recipientName: string;
    category: string;
};

type AccountSnapshot = {
    iban: string;
    balance: number;
    currency: string;
};

export type TransferResult = {
    from: AccountSnapshot;
    to: AccountSnapshot;
};

async function runWithOptionalTransaction<T>(
    operation: (session?: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
    let session: mongoose.ClientSession | null = null;

    try {
        session = await mongoose.startSession();
        let result!: T;

        await session.withTransaction(async () => {
            result = await operation(session!);
        });

        return result;
    } catch (error: any) {
        if (error?.code === 20) {
            return operation();
        }
        throw error;
    } finally {
        if (session) await session.endSession();
    }
}

export async function internalTransfer(params: InternalTransferParams): Promise<TransferResult> {
    const { userId, fromIban, toIban, amount } = params;

    if (!fromIban || !toIban || typeof amount !== "number") {
        throw new Error("IBANs and amount are required");
    }
    if (amount <= 0) {
        throw new Error("Amount must be greater than 0");
    }
    if (fromIban === toIban) {
        throw new Error("Cannot transfer to the same account");
    }

    return runWithOptionalTransaction(async session => {
        const fromQuery = Accounts.findOne({ iban: fromIban, "user.id": userId });
        const toQuery = Accounts.findOne({ iban: toIban});

        if (session) {
            fromQuery.session(session);
            toQuery.session(session);
        }

        const [fromAccount, toAccount] = await Promise.all([fromQuery, toQuery]);

        if (!fromAccount) throw new Error("From account not found");
        if (!toAccount) throw new Error("To account not found");
        if (fromAccount.currency !== toAccount.currency) {
            throw new Error("Transfers between different currencies are not allowed");
        }
        if (fromAccount.balance < amount) throw new Error("Insufficient funds");

        fromAccount.balance -= amount;
        toAccount.balance += amount;

        const saveOptions = session ? { session } : undefined;
        const [updatedFrom, updatedTo] = await Promise.all([
            fromAccount.save(saveOptions),
            toAccount.save(saveOptions),
        ]);

        const now = new Date();
        await Transactions.create(
            [
                {
                    isSent: true,
                    participants: {
                        sender: updatedFrom.iban,
                        receiver: updatedTo.iban,
                        senderName: updatedFrom.user.name,
                        receiverName: updatedTo.user.name,
                        senderType: "iban",
                        receiverType: "iban",
                    },
                    amount,
                    currency: updatedFrom.currency,
                    date: now,
                    type: "internal_transfer",
                    category: "Internal Transfer",
                },
                {
                    isSent: false,
                    participants: {
                        sender: updatedFrom.iban,
                        receiver: updatedTo.iban,
                        senderName: updatedFrom.user.name,
                        receiverName: updatedTo.user.name,
                        senderType: "iban",
                        receiverType: "iban",
                    },
                    amount,
                    currency: updatedTo.currency,
                    date: now,
                    type: "internal_transfer",
                    category: "Internal Transfer",
                },
            ],
            saveOptions,
        );

        return {
            from: {
                iban: updatedFrom.iban,
                balance: updatedFrom.balance,
                currency: updatedFrom.currency,
            },
            to: {
                iban: updatedTo.iban,
                balance: updatedTo.balance,
                currency: updatedTo.currency,
            },
        };
    });
}

export async function externalTransfer(params: ExternalTransferParams): Promise<TransferResult> {
    const { userId, fromIban, amount, recipientType, recipientValue, recipientName, category } = params;

    if (
        !fromIban ||
        !recipientType ||
        !recipientValue ||
        !recipientName ||
        !category ||
        typeof amount !== "number"
    ) {
        throw new Error("Missing required fields");
    }
    if (amount <= 0) throw new Error("Amount must be greater than 0");
    if (!["iban", "id", "account_id"].includes(recipientType)) {
        throw new Error("Invalid recipient type");
    }

    return runWithOptionalTransaction(async session => {
        const fromAccountQuery = Accounts.findOne({ iban: fromIban, "user.id": userId });
        const fromUserQuery = Users.findOne({ id: userId });

        if (session) {
            fromAccountQuery.session(session);
            fromUserQuery.session(session);
        }

        const [fromAccount, fromUser] = await Promise.all([fromAccountQuery, fromUserQuery]);
        if (!fromAccount) throw new Error("From account not found");
        if (!fromUser) throw new Error("From user not found");
        if (fromAccount.balance < amount) throw new Error("Insufficient funds");

        const { toUser, toAccount } = await resolveRecipient({
            recipientType,
            recipientValue,
            fromAccount,
            session,
            userId,
        });

        fromAccount.balance -= amount;
        toAccount.balance += amount;

        const saveOptions = session ? { session } : undefined;
        const [updatedFrom, updatedTo] = await Promise.all([
            fromAccount.save(saveOptions),
            toAccount.save(saveOptions),
        ]);

        const now = new Date();
        await Transactions.create(
            [
                {
                    isSent: true,
                    participants: {
                        sender: updatedFrom.iban,
                        receiver: recipientType === "iban" ? updatedTo.iban : toUser.id,
                        senderName: updatedFrom.user.name,
                        receiverName: recipientType === "iban" ? updatedTo.user.name : toUser.name,
                        senderType: "iban",
                        receiverType: recipientType,
                    },
                    amount,
                    currency: updatedFrom.currency,
                    date: now,
                    type: "external_transfer",
                    category,
                },
                {
                    isSent: false,
                    participants: {
                        sender: recipientType === "iban" ? updatedFrom.iban : fromUser.id,
                        receiver: updatedTo.iban,
                        senderName: fromUser.name,
                        receiverName: updatedTo.user.name,
                        senderType: recipientType === "iban" ? "iban" : "id",
                        receiverType: "iban",
                    },
                    amount,
                    currency: updatedTo.currency,
                    date: now,
                    type: "external_transfer",
                    category,
                },
            ],
            saveOptions,
        );

        return {
            from: {
                iban: updatedFrom.iban,
                balance: updatedFrom.balance,
                currency: updatedFrom.currency,
            },
            to: {
                iban: updatedTo.iban,
                balance: updatedTo.balance,
                currency: updatedTo.currency,
            },
        };
    });
}

async function resolveRecipient(params: {
    recipientType: "iban" | "id" | "account_id";
    recipientValue: string;
    fromAccount: typeof Accounts.prototype;
    session?: mongoose.ClientSession;
    userId: string;
}) {
    const { recipientType, recipientValue, fromAccount, session, userId } = params;

    if (recipientType === "iban") {
        const toAccountQuery = Accounts.findOne({ iban: recipientValue });
        if (session) toAccountQuery.session(session);
        const toAccount = await toAccountQuery;

        if (!toAccount) throw new Error("Recipient account not found");
        if (toAccount.user.id === userId) throw new Error("Cannot transfer to yourself");
        if (toAccount.currency !== fromAccount.currency) {
            throw new Error("Transfers between different currencies are not allowed");
        }

        const toUserQuery = Users.findOne({ id: toAccount.user.id });
        if (session) toUserQuery.session(session);
        const toUser = await toUserQuery;
        if (!toUser) throw new Error("Recipient user not found");

        return { toUser, toAccount };
    }

    // recipientType is "id" or "account_id"
    let targetUserId = recipientValue;

    if (recipientType === "account_id") {
        const targetAccountQuery = Accounts.findOne({ accountId: recipientValue });
        if (session) targetAccountQuery.session(session);
        const targetAccount = await targetAccountQuery;
        if (!targetAccount) throw new Error("Recipient account not found");
        targetUserId = targetAccount.user.id;
    }

    const toUserQuery = Users.findOne({ id: targetUserId });
    if (session) toUserQuery.session(session);
    const toUser = await toUserQuery;
    if (!toUser) throw new Error("Recipient user not found");
    if (toUser.id === userId) throw new Error("Cannot transfer to yourself");

    const accountsQuery = Accounts.find({ "user.id": toUser.id });
    if (session) accountsQuery.session(session);
    const userAccounts = await accountsQuery;
    if (!userAccounts || userAccounts.length === 0) throw new Error("Recipient account not found");

    const sameCurrency = userAccounts.filter(a => a.currency === fromAccount.currency);
    const toAccount = sameCurrency.find(a => a.type === "savings") || sameCurrency[0];
    if (!toAccount) throw new Error("Transfers between different currencies are not allowed");

    return { toUser, toAccount };
}

export async function chooseDefaultAccount(userId: string, currency?: string): Promise<AccountSnapshot | null> {
    const filter: Record<string, unknown> = { "user.id": userId };
    if (currency) filter.currency = currency;

    let accounts = await Accounts.find(filter).lean();
    if ((!accounts || accounts.length === 0) && currency) {
        // fallback to all currencies to inform caller there are accounts but none match
        accounts = await Accounts.find({ "user.id": userId }).lean();
        if (accounts && accounts.length > 0) {
            return null; // indicate accounts exist but not with required currency
        }
    }

    if (!accounts || accounts.length === 0) return null;

    const pickHighest = (list: typeof accounts) =>
        list.reduce<typeof accounts[0] | null>((prev, curr) => {
            if (!prev) return curr;
            return curr.balance > prev.balance ? curr : prev;
        }, null);

    const savingsAccounts = accounts.filter(acc => acc.type === "savings");
    const chosen =
        pickHighest(savingsAccounts) ??
        pickHighest(accounts) ??
        null;

    if (!chosen) return null;

    return {
        iban: chosen.iban,
        balance: chosen.balance,
        currency: chosen.currency,
    };
}

export async function listUserAccounts(userId: string) {
    const accounts = await Accounts.find({ "user.id": userId }).lean();
    return accounts.map(acc => ({
        iban: acc.iban,
        name: acc.name,
        balance: acc.balance,
        currency: acc.currency,
        type: acc.type,
        accountId: (acc as any).accountId,
    }));
}

