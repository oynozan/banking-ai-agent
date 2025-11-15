import { Router } from "express";
import mongoose from "mongoose";

import Accounts from "../../models/Accounts";
import Transactions from "../../models/Transactions";
import { authRequired, userToken } from "../../lib/middlewares";
import Users from "../../models/Users";

const router = Router();

/**
 * Transfer money between accounts
 */
router.post("/internal", userToken, authRequired, async (req, res) => {
    const { fromAccountId, toAccountId, amount } = req.body as {
        fromAccountId?: string;
        toAccountId?: string;
        amount?: number;
    };

    // Validate input
    if (!fromAccountId || !toAccountId || typeof amount !== "number") {
        return res.status(400).json({ error: "IBANs and amount are required" });
    }

    if (amount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    if (fromAccountId === toAccountId) {
        return res.status(400).json({ error: "Cannot transfer to the same account" });
    }

    type TransferResult = {
        updatedFrom: typeof Accounts.prototype;
        updatedTo: typeof Accounts.prototype;
    };

    const performTransfer = async (session?: mongoose.ClientSession): Promise<TransferResult> => {
        // Build account queries
        const fromQuery = Accounts.findOne({
            iban: fromAccountId,
            "user.id": req.user.id,
        });

        const toQuery = Accounts.findOne({
            iban: toAccountId,
            "user.id": req.user.id,
        });

        if (session) {
            fromQuery.session(session);
            toQuery.session(session);
        }

        const [fromAccount, toAccount] = await Promise.all([fromQuery, toQuery]);

        // Basic validations
        if (!fromAccount) {
            throw new Error("From account not found");
        }
        if (!toAccount) {
            throw new Error("To account not found");
        }

        if (fromAccount.currency !== toAccount.currency) {
            throw new Error("Transfers between different currencies are not allowed");
        }

        if (fromAccount.balance < amount) {
            throw new Error("Insufficient funds");
        }

        // Update balances
        fromAccount.balance -= amount;
        toAccount.balance += amount;

        // Persist changes
        const saveOptions = session ? { session } : undefined;
        const [updatedFrom, updatedTo] = await Promise.all([
            fromAccount.save(saveOptions),
            toAccount.save(saveOptions),
        ]);

        // Record transactions
        const now = new Date();
        await Transactions.create(
            [
                {
                    isSent: true,
                    participants: {
                        sender: fromAccount.iban,
                        receiver: toAccount.iban,
                        senderName: fromAccount.user.name,
                        receiverName: toAccount.user.name,
                        senderType: "iban",
                        receiverType: "iban",
                    },
                    amount,
                    date: now,
                    type: "internal_transfer",
                    category: "Internal Transfer",
                },

                {
                    isSent: false,
                    participants: {
                        sender: fromAccount.iban,
                        receiver: toAccount.iban,
                        senderName: fromAccount.user.name,
                        receiverName: toAccount.user.name,
                        senderType: "iban",
                        receiverType: "iban",
                    },
                    amount,
                    date: now,
                    type: "internal_transfer",
                    category: "Internal Transfer",
                },
            ],
            saveOptions,
        );

        return { updatedFrom, updatedTo };
    };

    let transferResult: TransferResult | null = null;

    try {
        // Use transaction if possible
        let session: mongoose.ClientSession | null = null;
        try {
            session = await mongoose.startSession();
            await session.withTransaction(async () => {
                transferResult = await performTransfer(session!);
            });
        } catch (error: any) {
            // Fall back if transactions are not supported
            if (error?.code === 20) {
                transferResult = await performTransfer();
            } else {
                throw error;
            }
        } finally {
            if (session) {
                await session.endSession();
            }
        }

        if (!transferResult) {
            return res.status(500).json({ error: "Transfer failed" });
        }

        // Response
        return res.status(200).json({
            success: true,
            from: {
                iban: transferResult.updatedFrom.iban,
                balance: transferResult.updatedFrom.balance,
                currency: transferResult.updatedFrom.currency,
            },
            to: {
                iban: transferResult.updatedTo.iban,
                balance: transferResult.updatedTo.balance,
                currency: transferResult.updatedTo.currency,
            },
        });
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "Internal Server Error";

        if (
            message === "From account not found" ||
            message === "To account not found" ||
            message === "Transfers between different currencies are not allowed" ||
            message === "Insufficient funds" ||
            message === "IBANs and amount are required" ||
            message === "Amount must be greater than 0" ||
            message === "Cannot transfer to the same account"
        ) {
            return res.status(400).json({ error: message });
        }

        res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * Transfer money to someone else
 */
router.post("/external", userToken, authRequired, async (req, res) => {
    const {
        fromAccountId,
        recipientType,
        recipientValue,
        recipientName,
        amount,
        category,
    } = req.body as {
        fromAccountId?: string;
        recipientType?: "id" | "iban";
        recipientValue?: string;
        recipientName?: string;
        amount?: number;
        category?: string;
    };

    try {
        // Validate input
        if (
            !fromAccountId ||
            !recipientType ||
            !recipientValue ||
            !recipientName ||
            !category ||
            typeof amount !== "number"
        ) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (amount <= 0) {
            return res.status(400).json({ error: "Amount must be greater than 0" });
        }

        type TransferResult = {
            updatedFromAccount: typeof Accounts.prototype;
            updatedToAccount: typeof Accounts.prototype;
        };

        const performTransfer = async (
            session?: mongoose.ClientSession,
        ): Promise<TransferResult> => {
            // Sender entities
            const fromAccountQuery = Accounts.findOne({
                iban: fromAccountId,
                "user.id": req.user.id,
            });

            const fromUserQuery = Users.findOne({ id: req.user.id });

            if (session) {
                fromAccountQuery.session(session);
                fromUserQuery.session(session);
            }

            const [fromAccount, fromUser] = await Promise.all([
                fromAccountQuery,
                fromUserQuery,
            ]);

            // Sender validations
            if (!fromAccount) throw new Error("From account not found");
            if (!fromUser) throw new Error("From user not found");
            if (fromAccount.balance < amount) throw new Error("Insufficient funds");

            // Recipient entities
            let toUser: typeof Users.prototype | null = null;
            let toAccount: typeof Accounts.prototype | null = null;

            if (recipientType === "iban") {
                const toAccountQuery = Accounts.findOne({ iban: recipientValue });
                if (session) toAccountQuery.session(session);
                toAccount = await toAccountQuery;

                if (!toAccount) throw new Error("Recipient account not found");
                if (toAccount.user.id === req.user.id) {
                    throw new Error("Cannot transfer to yourself");
                }
                if (toAccount.currency !== fromAccount.currency) {
                    throw new Error("Transfers between different currencies are not allowed");
                }

                const toUserQuery = Users.findOne({ id: toAccount.user.id });
                if (session) toUserQuery.session(session);
                toUser = await toUserQuery;
                if (!toUser) throw new Error("Recipient user not found");
            } else if (recipientType === "id") {
                const toUserQuery = Users.findOne({ id: recipientValue });
                if (session) toUserQuery.session(session);
                toUser = await toUserQuery;

                if (!toUser) throw new Error("Recipient user not found");
                if (toUser.id === req.user.id) {
                    throw new Error("Cannot transfer to yourself");
                }

                const accountsQuery = Accounts.find({ "user.id": toUser.id });
                if (session) accountsQuery.session(session);
                const userAccounts = await accountsQuery;

                if (!userAccounts || userAccounts.length === 0) {
                    throw new Error("Recipient account not found");
                }

                const sameCurrencyAccounts = userAccounts.filter(
                    a => a.currency === fromAccount.currency,
                );

                toAccount =
                    (sameCurrencyAccounts.find(a => a.type === "savings") as any) ||
                    (sameCurrencyAccounts[0] as any);

                if (!toAccount) {
                    throw new Error("Transfers between different currencies are not allowed");
                }
            } else {
                throw new Error("Invalid recipient type");
            }

            // Balances
            fromAccount.balance -= amount;
            toAccount.balance += amount;

            // Persist account changes
            const saveOptions = session ? { session } : undefined;
            const [updatedFromAccount, updatedToAccount] = await Promise.all([
                fromAccount.save(saveOptions),
                toAccount.save(saveOptions),
            ]);

            // Record transactions
            const now = new Date();
            await Transactions.create(
                [
                    {
                        isSent: true,
                        participants: {
                            sender: updatedFromAccount.iban,
                            receiver:
                                recipientType === "iban" ? updatedToAccount.iban : toUser.id,
                            senderName: updatedFromAccount.user.name,
                            receiverName:
                                recipientType === "iban"
                                    ? updatedToAccount.user.name
                                    : toUser.name,
                            senderType: "iban",
                            receiverType: recipientType,
                        },
                        amount,
                        date: now,
                        type: "external_transfer",
                        category,
                    },

                    {
                        isSent: false,
                        participants: {
                            sender:
                                recipientType === "iban" ? updatedFromAccount.iban : fromUser.id,
                            receiver: updatedToAccount.iban,
                            senderName: fromUser.name,
                            receiverName: updatedToAccount.user.name,
                            senderType: recipientType === "iban" ? "iban" : "id",
                            receiverType: "iban",
                        },
                        amount,
                        date: now,
                        type: "external_transfer",
                        category,
                    },
                ],
                saveOptions,
            );

            return {
                updatedFromAccount,
                updatedToAccount,
            };
        };

        let transferResult: TransferResult | null = null;

        try {
            // Use transaction if possible
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    transferResult = await performTransfer(session);
                });
            } finally {
                await session.endSession();
            }
        } catch (error: any) {
            // Fall back if transactions are not supported
            if (error?.code === 20) {
                transferResult = await performTransfer();
            } else {
                throw error;
            }
        }

        if (!transferResult) {
            return res.status(500).json({ error: "Transfer failed" });
        }

        // Response
        return res.status(200).json({
            success: true,
            from: {
                iban: transferResult.updatedFromAccount.iban,
                balance: transferResult.updatedFromAccount.balance,
                currency: transferResult.updatedFromAccount.currency,
            },
            to: {
                iban: transferResult.updatedToAccount.iban,
                balance: transferResult.updatedToAccount.balance,
                currency: transferResult.updatedToAccount.currency,
            },
        });
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "Internal Server Error";

        if (
            message === "Missing required fields" ||
            message === "Amount must be greater than 0" ||
            message === "From account not found" ||
            message === "From user not found" ||
            message === "Recipient user not found" ||
            message === "Recipient account not found" ||
            message === "Insufficient funds" ||
            message === "Invalid recipient type" ||
            message === "Cannot transfer to yourself" ||
            message === "Transfers between different currencies are not allowed"
        ) {
            return res.status(400).json({ error: message });
        }

        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
