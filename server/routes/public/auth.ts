import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import * as dto from "../../lib/dto";
import User from "../../models/Users";
import UserLib from "../../lib/modules/user";

const router = Router();

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
            { id: existingUser.id, name: existingUser.name, balance },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "24h",
            },
        );
        const payload = { id: existingUser.id, name: existingUser.name, balance };

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
                user: { id: user.id, name: user.name, balance },
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
