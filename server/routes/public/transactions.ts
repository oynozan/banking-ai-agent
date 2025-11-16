import { Router } from "express";

import Accounts from "../../models/Accounts";
import Transactions from "../../models/Transactions";
import { authRequired, userToken } from "../../lib/middlewares";

const router = Router();

/**
 * Get transactions with pagination
 * Query params:
 *  - page: number (default: 1)
 *  - limit: number (default: 10, max: 100)
 */
router.get("/", userToken, authRequired, async (req, res) => {
    try {
        const rawPage = Number(req.query.page ?? 1);
        const rawLimit = Number(req.query.limit ?? 10);

        const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
        const limitBase = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 10;
        const limit = Math.min(limitBase, 100);
        const skip = (page - 1) * limit;

        // Find IBANs of user's accounts
        const userAccounts = await Accounts.find({ "user.id": req.user.id })
            .select("iban currency")
            .lean();
        const ibans = userAccounts.map(acc => acc.iban);
        const accountCurrencyMap = new Map(userAccounts.map(acc => [acc.iban, acc.currency ?? "PLN"]));

        if (ibans.length === 0) {
            return res.status(200).json({
                transactions: [],
                page,
                limit,
                total: 0,
                hasMore: false,
            });
        }

        // Transactions where user is either sender or receiver by IBAN
        const filter = {
            $or: [
                { "participants.sender": { $in: ibans } },
                { "participants.receiver": { $in: ibans } },
            ],
        };

        const [total, transactions] = await Promise.all([
            Transactions.countDocuments(filter),
            Transactions.find(filter)
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const hasMore = skip + transactions.length < total;
        const enrichedTransactions = transactions.map(tx => {
            if (tx.currency) {
                return tx;
            }

            const accountIban = tx.isSent ? tx.participants.sender : tx.participants.receiver;
            const fallbackCurrency = accountCurrencyMap.get(accountIban) ?? "PLN";

            return {
                ...tx,
                currency: fallbackCurrency,
            };
        });

        return res.status(200).json({
            transactions: enrichedTransactions,
            page,
            limit,
            total,
            hasMore,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;


