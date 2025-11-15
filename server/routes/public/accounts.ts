import { Router } from "express";

import Accounts from "../../models/Accounts";
import { authRequired, userToken } from "../../lib/middlewares";

const router = Router();

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

export default router;
