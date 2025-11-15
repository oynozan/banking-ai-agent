import { Router } from "express";
import Accounts from "../../models/Accounts";
import Transactions from "../../models/Transactions";
import { authRequired, userToken } from "../../lib/middlewares";

const router = Router();

/**
 * Get monthly stats (income, expenses, net) for the current user
 * for the current calendar month.
 */
router.get("/monthly", userToken, authRequired, async (req, res) => {
    try {
        const userId = (req as any).user.id;

        const userAccounts = await Accounts.find({ "user.id": userId }).select("iban");
        const ibans = userAccounts.map(acc => acc.iban);

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

        const stats = await Transactions.aggregate([
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                    $or: [
                        { "participants.sender": { $in: ibans } },
                        { "participants.receiver": { $in: ibans } },
                    ],
                },
            },
            {
                $group: {
                    _id: null,
                    income: {
                        $sum: {
                            $cond: [{ $eq: ["$isSent", false] }, "$amount", 0],
                        },
                    },
                    expenses: {
                        $sum: {
                            $cond: [{ $eq: ["$isSent", true] }, "$amount", 0],
                        },
                    },
                },
            },
        ]);

        let result = {
            income: 0,
            expenses: 0,
            netChange: 0,
        };

        if (stats.length > 0) {
            result.income = stats[0].income;
            result.expenses = stats[0].expenses;
            result.netChange = stats[0].income - stats[0].expenses;
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
