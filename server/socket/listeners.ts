import cookie from "cookie";
import jwt from "jsonwebtoken";
import type { Socket, Server, Namespace } from "socket.io";

import User from "../models/Users";
import type { IUser } from "../models/Users";

// Listener imports
import { AgentListener } from "./ai";
import { SocketPing } from "./socket-ping";

export class SocketListeners {
    private io: Server;

    constructor(io: Server) {
        this.io = io;

        this.protectedListeners();
        this.publicListeners();
    }

    protectedListeners() {
        const protectedIO = this.io.of("/protected");
        this.serverOnlyAuthenticationMiddleware(protectedIO);

        // Listeners
        protectedIO.on("connection", (socket: Socket) => {
            new SocketPing(protectedIO, socket).listen();
        });
    }

    publicListeners() {
        const publicIO = this.io.of("/");
        this.authenticationMiddleware(publicIO);

        publicIO.on("connection", (socket: Socket) => {
            new SocketPing(publicIO, socket).listen();
            new AgentListener(publicIO, socket).listen();
        });
    }

    private authenticationMiddleware(io: Namespace) {
        io.use((socket, next) => {
            try {
                let token: string | undefined = socket.handshake.auth?.token as string | undefined;
                if (!token) return next();

                jwt.verify(token, process.env.JWT_SECRET!, async (err, decoded) => {
                    if (err) return next(new Error("Forbidden"));
                    const userRaw = decoded as IUser;

                    const user = await User.findOne({ id: userRaw.id });
                    if (!user) return next(new Error("User not found"));
                    socket.user = user;

                    next();
                });
            } catch (e) {
                console.error(e);
                next(new Error("Forbidden"));
            }
        });
        return io;
    }

    private serverOnlyAuthenticationMiddleware(io: Namespace) {
        io.use((socket, next) => {
            let token: string | undefined;

            const rawCookie = socket.handshake.headers.cookie;
            if (rawCookie) {
                const cookies = cookie.parse(rawCookie);
                if (cookies.auth) {
                    token = cookies.auth;
                }
            }

            if (!token && socket.handshake.auth?.token) {
                token = socket.handshake.auth.token;
            }

            if (!token) {
                return next(new Error("Unauthorized"));
            }

            try {
                jwt.verify(token, process.env.JWT_SECRET!);
                next();
            } catch {
                next(new Error("Forbidden"));
            }
        });
        return io;
    }
}
