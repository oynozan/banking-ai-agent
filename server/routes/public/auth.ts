import { Router } from "express";

const router = Router();

router.post("/login", (req, res) => {
    try {
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/validate", (req, res) => {
    const unauthorized = () => {
        res.status(401).json({ status: false, error: "You must log in." });
    };

    try {
        // Get access token from header
        const accessToken = req.headers.authorization?.split(" ")[1];

        if (!accessToken) {
            unauthorized();
            return;
        }

        // Get user info from access token
        const user = false;

        if (user) res.status(200).json({ status: true, user: { id: "user-id", name: "John Doe" } });
        else unauthorized();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
