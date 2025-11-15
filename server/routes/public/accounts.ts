import { Router } from "express";

import Accounts from "../../models/Accounts";
import { authRequired, userToken } from "../../lib/middlewares";

const router = Router();

type Currency = "USD" | "EUR" | "PLN";
type AccountType = "savings" | "checking" | "credit";

async function generateUniqueIban(currency: Currency): Promise<string> {
    const currencyPrefix: Record<Currency, string> = {
        USD: "US",
        EUR: "DE",
        PLN: "PL",
    };

    // create something like: <CC><2 check digits><4 bank><14 account>
    const prefix = currencyPrefix[currency];

    // Try multiple times in case of rare collisions on unique index
    for (let attempt = 0; attempt < 7; attempt++) {
        const checkDigits = Math.floor(10 + Math.random() * 89).toString(); // 2 digits 10-99
        const bank = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
        const account = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join(""); // 14 digits
        const iban = `${prefix}${checkDigits}${bank}${account}`;

        // Ensure uniqueness
        const existing = await Accounts.findOne({ iban }).select("_id").lean();
        if (!existing) return iban;
    }

    return `${currencyPrefix[currency]}${Date.now().toString().slice(-10)}${Math.floor(
        1000 + Math.random() * 9000,
    ).toString()}`;
}

/**
 * Get all accounts
 */
router.get("/", userToken, authRequired, async (req, res) => {
    try {
        const accounts = await Accounts.find({ "user.id": req.user.id });
        res.status(200).json({
            accounts: accounts.map(acc => ({
                iban: acc.iban,
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
        const { type, currency } = req.body as {
            type?: AccountType;
            currency?: Currency;
        };

        const validTypes: AccountType[] = ["savings", "checking", "credit"];
        const validCurrencies: Currency[] = ["USD", "EUR", "PLN"];

        if (!type || !validTypes.includes(type) || !currency || !validCurrencies.includes(currency)) {
            return res.status(400).json({
                error: "Invalid request body. Provide valid 'type' and 'currency'.",
            });
        }

        const iban = await generateUniqueIban(currency);

        const newAccount = await Accounts.create({
            user: {
                id: req.user.id,
                name: req.user.name,
            },
            iban,
            balance: 0,
            type,
            currency,
        });

        return res.status(201).json({
            account: {
                iban: newAccount.iban,
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
