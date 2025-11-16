import { Router } from "express";
import Accounts from "../../models/Accounts";
import Transactions from "../../models/Transactions";
import { authRequired, userToken } from "../../lib/middlewares";
import plnToOthers from "../../lib/exchange";

const router = Router();

type FxSnapshot = Awaited<ReturnType<typeof plnToOthers>> | null;

function convertToPln(amount: number, currency: string, fxRates: FxSnapshot) {
    if (!amount) return 0;
    if (!currency || currency === "PLN") return amount;

    const rate =
        currency === "EUR"
            ? fxRates?.EUR
            : currency === "USD"
              ? fxRates?.USD
              : null;

    if (!rate || rate <= 0) {
        return amount;
    }

    return amount / rate;
}

function monthKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}`;
}

function buildMonthRange(months: number, now: Date) {
    const range: Array<{ key: string; date: Date }> = [];

    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        range.push({ key: monthKey(date), date });
    }

    return range;
}

/**
 * Get monthly stats (income, expenses, net) for the current user
 * for the current calendar month.
 */
router.get("/monthly", userToken, authRequired, async (req, res) => {
    try {
        const userId = (req as any).user.id;

        const userAccounts = await Accounts.find({ "user.id": userId }).select("iban currency").lean();
        const ibans = userAccounts.map(acc => acc.iban);
        const accountCurrencyMap = new Map(userAccounts.map(acc => [acc.iban, acc.currency ?? "PLN"]));

        if (ibans.length === 0) {
            return res.status(200).json({
                income: 0,
                expenses: 0,
                netChange: 0,
            });
        }

        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const transactions = await Transactions.find({
            date: { $gte: startDate, $lte: endDate },
            $or: [
                { "participants.sender": { $in: ibans } },
                { "participants.receiver": { $in: ibans } },
            ],
        })
            .select("amount isSent participants")
            .lean();

        const currencyBuckets = new Map<
            string,
            {
                income: number;
                expenses: number;
            }
        >();

        for (const tx of transactions) {
            const relevantIban = tx.isSent ? tx.participants.sender : tx.participants.receiver;
            const currency = accountCurrencyMap.get(relevantIban) ?? "PLN";
            const bucket = currencyBuckets.get(currency) ?? { income: 0, expenses: 0 };

            if (tx.isSent) {
                bucket.expenses += tx.amount;
            } else {
                bucket.income += tx.amount;
            }

            currencyBuckets.set(currency, bucket);
        }

        const needsFx = [...currencyBuckets.keys()].some(currency => currency !== "PLN");
        let fxRates: FxSnapshot = null;

        if (needsFx) {
            try {
                fxRates = await plnToOthers(1);
            } catch (error) {
                console.error("Failed to fetch exchange rates", error);
            }
        }

        let income = 0;
        let expenses = 0;

        for (const [currency, totals] of currencyBuckets) {
            income += convertToPln(totals.income, currency, fxRates);
            expenses += convertToPln(totals.expenses, currency, fxRates);
        }

        const result = {
            income,
            expenses,
            netChange: income - expenses,
        };

        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/spending-trend", userToken, authRequired, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const monthsParam = Number(req.query.months ?? 6);
        const months = Number.isFinite(monthsParam) ? Math.min(Math.max(Math.floor(monthsParam), 1), 12) : 6;

        const userAccounts = await Accounts.find({ "user.id": userId })
            .select("iban currency")
            .lean();
        const ibans = userAccounts.map(acc => acc.iban);
        const accountCurrencyMap = new Map(userAccounts.map(acc => [acc.iban, acc.currency ?? "PLN"]));

        const now = new Date();
        const monthRange = buildMonthRange(months, now);
        const startDate = new Date(monthRange[0].date.getFullYear(), monthRange[0].date.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        if (ibans.length === 0) {
            return res.status(200).json({
                months: monthRange.map(({ date }) => ({
                    month: date.toLocaleString("en-US", { month: "short" }),
                    spending: 0,
                })),
            });
        }

        const transactions = await Transactions.find({
            date: { $gte: startDate, $lte: endDate },
            $or: [
                { "participants.sender": { $in: ibans } },
                { "participants.receiver": { $in: ibans } },
            ],
        })
            .select("amount isSent participants currency date")
            .lean();

        const currenciesUsed = new Set<string>();

        for (const tx of transactions) {
            const accountIban = tx.isSent ? tx.participants.sender : tx.participants.receiver;
            const currency = tx.currency ?? accountCurrencyMap.get(accountIban) ?? "PLN";
            if (currency !== "PLN") {
                currenciesUsed.add(currency);
            }
        }

        let fxRates: FxSnapshot = null;
        if (currenciesUsed.size > 0) {
            try {
                fxRates = await plnToOthers(1);
            } catch (error) {
                console.error("Failed to fetch exchange rates", error);
            }
        }

        const monthlyMap = new Map(monthRange.map(entry => [entry.key, 0]));

        for (const tx of transactions) {
            if (!tx.isSent) continue;

            const txDate = new Date(tx.date);
            const key = monthKey(txDate);
            if (!monthlyMap.has(key)) continue;

            const accountIban = tx.participants.sender;
            const currency = tx.currency ?? accountCurrencyMap.get(accountIban) ?? "PLN";
            const amountPln = convertToPln(tx.amount, currency, fxRates);
            monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + amountPln);
        }

        const response = monthRange.map(({ key, date }) => ({
            month: date.toLocaleString("en-US", { month: "short" }),
            spending: Number((monthlyMap.get(key) ?? 0).toFixed(2)),
        }));

        return res.status(200).json({ months: response });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
