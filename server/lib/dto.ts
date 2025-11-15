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
