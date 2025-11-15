// Authentication middlewares

import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

/**
 * Server-to-server token verification middleware
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET as string, err => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token" });
        }
        next();
    });
};

/**
 * User token verification middleware
 * Used to identify the user making the request
 */
export const userToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const token =
        authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
            if (err) {
                // do not block public routes, just proceed without user
                return next();
            }
            if (decoded) req.user = decoded;
            next();
        });
        return;
    }

    next();
};

export const authRequired = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
};
