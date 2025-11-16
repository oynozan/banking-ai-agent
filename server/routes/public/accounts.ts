import { Router } from "express";

import Accounts from "../../models/Accounts";
import { authRequired, userToken } from "../../lib/middlewares";
import Account from "../../lib/modules/account";

const router = Router();

type Currency = "USD" | "EUR" | "PLN";
type AccountType = "savings" | "checking" | "credit";

/**
 * Get all accounts
 */
router.get("/", userToken, authRequired, async (req, res) => {
    try {
        const accounts = await Accounts.find({ "user.id": req.user.id });
        res.status(200).json({
            accounts: accounts.map(acc => ({
                iban: acc.iban,
                name: acc.name,
                balance: acc.balance,
                type: acc.type,
                currency: acc.currency,
                createdAt: acc.createdAt,
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * Create a new account
 */
router.post("/", userToken, authRequired, async (req, res) => {
    try {
        const { name, type, currency } = req.body as {
            name?: string;
            type?: AccountType;
            currency?: Currency;
        };

        const validTypes: AccountType[] = ["savings", "checking", "credit"];
        const validCurrencies: Currency[] = ["USD", "EUR", "PLN"];

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return res.status(400).json({
                error: "Invalid request body. Provide a valid 'name'.",
            });
        }

        if (!type || !validTypes.includes(type) || !currency || !validCurrencies.includes(currency)) {
            return res.status(400).json({
                error: "Invalid request body. Provide valid 'type' and 'currency'.",
            });
        }

        const newAccount = await Account.createAccount({
            user: { id: req.user.id, name: req.user.name },
            name: name.trim(),
            type,
            currency,
        });

        return res.status(201).json({
            account: {
                iban: newAccount.iban,
                name: newAccount.name,
                balance: newAccount.balance,
                type: newAccount.type,
                currency: newAccount.currency,
                createdAt: newAccount.createdAt,
            },
        });
    } catch (error: any) {
        console.error(error);
        if (error?.code === 11000) {
            return res.status(409).json({ error: "IBAN already exists, please retry." });
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
