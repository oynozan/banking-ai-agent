import { Router } from "express";
import mongoose from "mongoose";

import Accounts from "../../models/Accounts";
import Transactions from "../../models/Transactions";
import { authRequired, userToken } from "../../lib/middlewares";

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
                        sender: fromAccount.iban,
                        receiver: toAccount.iban,
                        senderName: fromAccount.user.name,
                        receiverName: toAccount.user.name,
                        senderType: "iban",
                        receiverType: "iban",
                    },
                    amount,
                    date: now,
                    type: "debit",
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
                    type: "credit",
                    category: "Internal Transfer",
                },
            ],
            saveOptions,
        );

        return { updatedFrom, updatedTo };
    };

    let transferResult: TransferResult | null = null;

    try {
        let session: mongoose.ClientSession | null = null;
        try {
            session = await mongoose.startSession();
            await session.withTransaction(async () => {
                transferResult = await performTransfer(session!);
            });
        } catch (error: any) {
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
router.post("/external", userToken, authRequired, (req, res) => {
    try {
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
