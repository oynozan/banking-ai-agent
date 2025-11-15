import { Router } from "express";
import { authRequired, userToken } from "../../lib/middlewares";

const router = Router();

/**
 * Transfer money between accounts
 */
router.post("/internal", userToken, authRequired, (req, res) => {
    try {

    } catch (error) {
        console.error(error);
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
