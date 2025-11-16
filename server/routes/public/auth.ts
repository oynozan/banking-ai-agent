import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import * as dto from "../../lib/dto";
import User from "../../models/Users";
import UserLib from "../../lib/modules/user";
import { userToken, authRequired } from "../../lib/middlewares";
import { verifyMessage, getAddress } from "viem";

const router = Router();

// In-memory nonce store for wallet linking (keyed by user id)
const walletNonces = new Map<
    string,
    {
        nonce: string;
        expiresAt: number;
    }
>();

// In-memory nonce store for wallet login (keyed by checksum address)
const walletLoginNonces = new Map<
    string,
    {
        nonce: string;
        expiresAt: number;
    }
>();

router.post("/login", async (req, res) => {
    try {
        const parsed = dto.loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: false,
                error: "Invalid request body",
                details: parsed.error.flatten(),
            });
            return;
        }

        const { id, password } = parsed.data;

        const existingUser = await User.findOne({ id });

        if (!existingUser) {
            res.status(401).json({ status: false, error: "Invalid credentials." });
            return;
        }

        const isValid = await bcrypt.compare(password, existingUser.password || "");

        if (!isValid) {
            res.status(401).json({ status: false, error: "Invalid credentials." });
            return;
        }

        const balance = await UserLib.getBalanceByUserId(existingUser.id);
        const accessToken = jwt.sign(
            { id: existingUser.id, name: existingUser.name, balance, wallet: existingUser.wallet },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "24h",
            },
        );
        const payload = {
            id: existingUser.id,
            name: existingUser.name,
            balance,
            wallet: existingUser.wallet,
        };

        res.status(200).json({
            status: true,
            user: payload,
            accessToken,
        });
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
        const parsedHeader = dto.authHeaderSchema.safeParse({
            authorization: req.headers.authorization ?? "",
        });

        if (!parsedHeader.success) {
            unauthorized();
            return;
        }

        const token = parsedHeader.data.authorization.split(" ")[1];

        jwt.verify(token, process.env.JWT_SECRET as string, async (err: any, decoded: any) => {
            if (err || !decoded) {
                unauthorized();
                return;
            }

            const [user, balance] = await Promise.all([
                User.findOne({ id: decoded.id }),
                UserLib.getBalanceByUserId(decoded.id),
            ]);

            if (!user || !balance) {
                unauthorized();
                return;
            }

            res.status(200).json({
                status: true,
                user: { id: user.id, name: user.name, balance, wallet: user.wallet },
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Generate a nonce for the currently authenticated user to sign with their wallet
router.post("/wallet/nonce", userToken, authRequired, async (req, res) => {
    try {
        const userId = (req as any).user.id as string;
        const user = await User.findOne({ id: userId }).lean();
        if (!user) {
            res.status(404).json({ status: false, error: "User not found" });
            return;
        }
        if (user.wallet) {
            res.status(400).json({ status: false, error: "Wallet already linked" });
            return;
        }

        const nonce = cryptoRandomString(24);
        const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes
        walletNonces.set(userId, { nonce, expiresAt });

        const message = [
            "Mock Bank wants to link your wallet.",
            `User ID: ${userId}`,
            `Nonce: ${nonce}`,
            "This link allows future verification of ownership.",
            "Expires in 2 minutes.",
        ].join("\n");

        res.status(200).json({ status: true, nonce, message });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, error: "Internal Server Error" });
    }
});

// Verify signed nonce and link wallet address to the current user
router.post("/wallet/verify", userToken, authRequired, async (req, res) => {
    try {
        const userId = (req as any).user.id as string;
        const parsed = dto.walletVerifySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: false,
                error: "Invalid request body",
                details: parsed.error.flatten(),
            });
            return;
        }

        const user = await User.findOne({ id: userId });
        if (!user) {
            res.status(404).json({ status: false, error: "User not found" });
            return;
        }
        if (user.wallet) {
            res.status(400).json({ status: false, error: "Wallet already linked" });
            return;
        }

        const record = walletNonces.get(userId);
        if (!record || record.expiresAt < Date.now()) {
            walletNonces.delete(userId);
            res.status(400).json({ status: false, error: "Nonce expired or not found" });
            return;
        }

        const { address, signature } = parsed.data;
        const message = [
            "Mock Bank wants to link your wallet.",
            `User ID: ${userId}`,
            `Nonce: ${record.nonce}`,
            "This link allows future verification of ownership.",
            "Expires in 2 minutes.",
        ].join("\n");

        const recovered = await verifyMessage({
            address: getAddress(address),
            message,
            signature: signature as `0x${string}`,
        });

        if (!recovered) {
            res.status(400).json({ status: false, error: "Signature verification failed" });
            return;
        }

        user.wallet = getAddress(address);
        await user.save();
        walletNonces.delete(userId);

        const balance = await UserLib.getBalanceByUserId(user.id);
        res.status(200).json({
            status: true,
            user: { id: user.id, name: user.name, balance, wallet: user.wallet },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, error: "Internal Server Error" });
    }
});

// Unlink the currently linked wallet from the authenticated user
router.post("/wallet/disconnect", userToken, authRequired, async (req, res) => {
    try {
        const userId = (req as any).user.id as string;
        const user = await User.findOne({ id: userId });
        if (!user) {
            res.status(404).json({ status: false, error: "User not found" });
            return;
        }
        if (!user.wallet) {
            res.status(400).json({ status: false, error: "No wallet linked" });
            return;
        }
        user.wallet = undefined as unknown as string | undefined;
        await user.save();
        const balance = await UserLib.getBalanceByUserId(user.id);
        res.status(200).json({
            status: true,
            user: { id: user.id, name: user.name, balance, wallet: user.wallet },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, error: "Internal Server Error" });
    }
});

// Public: Generate a login nonce for a wallet address
router.post("/wallet-login/nonce", async (req, res) => {
    try {
        const parsed = dto.walletAddressSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: false,
                error: "Invalid request body",
                details: parsed.error.flatten(),
            });
            return;
        }
        const checksum = getAddress(parsed.data.address);
        const nonce = cryptoRandomString(24);
        const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes
        walletLoginNonces.set(checksum, { nonce, expiresAt });

        const message = [
            "Mock Bank Web3 Login",
            `Address: ${checksum}`,
            `Nonce: ${nonce}`,
            "Expires in 2 minutes.",
        ].join("\n");

        res.status(200).json({ status: true, nonce, message });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, error: "Internal Server Error" });
    }
});

// Public: Verify signed login nonce and issue access token if wallet is recognized
router.post("/wallet-login/verify", async (req, res) => {
    try {
        const parsed = dto.walletVerifySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: false,
                error: "Invalid request body",
                details: parsed.error.flatten(),
            });
            return;
        }
        const checksum = getAddress(parsed.data.address);
        const record = walletLoginNonces.get(checksum);
        if (!record || record.expiresAt < Date.now()) {
            walletLoginNonces.delete(checksum);
            res.status(400).json({ status: false, error: "Nonce expired or not found" });
            return;
        }

        const message = [
            "Mock Bank Web3 Login",
            `Address: ${checksum}`,
            `Nonce: ${record.nonce}`,
            "Expires in 2 minutes.",
        ].join("\n");

        const recovered = await verifyMessage({
            address: checksum,
            message,
            signature: parsed.data.signature as `0x${string}`,
        });
        if (!recovered) {
            res.status(400).json({ status: false, error: "Signature verification failed" });
            return;
        }

        // Lookup user by wallet
        const user = await User.findOne({ wallet: checksum });
        if (!user) {
            res.status(404).json({ status: false, error: "Wallet not recognized" });
            return;
        }

        walletLoginNonces.delete(checksum);

        const balance = await UserLib.getBalanceByUserId(user.id);
        const accessToken = jwt.sign(
            { id: user.id, name: user.name, balance, wallet: user.wallet },
            process.env.JWT_SECRET as string,
            { expiresIn: "24h" },
        );
        const payload = { id: user.id, name: user.name, balance, wallet: user.wallet };

        res.status(200).json({ status: true, user: payload, accessToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, error: "Internal Server Error" });
    }
});

export default router;

// Helpers
function cryptoRandomString(length: number): string {
    const bytes = cryptoGetRandomBytes(length);
    const hex = Buffer.from(bytes).toString("hex");
    return hex.slice(0, length);
}

function cryptoGetRandomBytes(length: number): Uint8Array {
    const cryptoModule = require("crypto") as typeof import("crypto");
    return cryptoModule.randomBytes(length);
}
