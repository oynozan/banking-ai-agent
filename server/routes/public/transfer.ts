import { Router } from "express";

import { authRequired, userToken } from "../../lib/middlewares";
import { internalTransfer, externalTransfer } from "../../lib/modules/transfer";

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

    try {
        const transferResult = await internalTransfer({
            userId: req.user.id,
            fromIban: fromAccountId,
            toIban: toAccountId,
            amount,
        });

        // Response
        return res.status(200).json({
            success: true,
            from: transferResult.from,
            to: transferResult.to,
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
    const { fromAccountId, recipientType, recipientValue, recipientName, amount, category } =
        req.body as {
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

        const transferResult = await externalTransfer({
            userId: req.user.id,
            fromIban: fromAccountId,
            amount,
            recipientType,
            recipientValue,
            recipientName,
            category,
        });

        return res.status(200).json({
            success: true,
            from: transferResult.from,
            to: transferResult.to,
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
