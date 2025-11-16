import { z } from "zod";

export const loginSchema = z.object({
    id: z.string().min(1, "id is required"),
    password: z.string().min(1, "password is required"),
});

export const authHeaderSchema = z.object({
    authorization: z
        .string()
        .regex(/^Bearer\s+.+$/i, "Invalid Authorization header format (expected Bearer token)"),
});

export const walletVerifySchema = z.object({
    address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address format"),
    signature: z
        .string()
        .regex(/^0x[0-9a-fA-F]+$/, "Invalid signature format"),
});

export const walletAddressSchema = z.object({
    address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address format"),
});
