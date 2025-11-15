require("dotenv").config();

import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import express, { type Application } from "express";

import routes from "./routes";
import protectedRoutes from "./routes/protected";

import { socketServer } from "./socket";
import { SocketListeners } from "./socket/listeners";
import { userToken, verifyToken } from "./lib/middlewares";

const app: Application = express();
const server = require("http").createServer(app);

app.set("trust proxy", 1);
app.use(cors({ origin: "*" }));
app.use(helmet());
app.use(
    rateLimit({
        windowMs: 2 * 60 * 1000,
        max: 500,
        message: "Too many requests, please try again later.",
        standardHeaders: true,
        legacyHeaders: false,
    }),
);
app.use(express.json());
app.use(cookieParser());

mongoose.connect(process.env.MONGO_URI!, { dbName: "banking-ai-agent" });

// Routes
app.use("/api", userToken, routes);
app.use("/protected", verifyToken, protectedRoutes);

// Socket.io
const io = socketServer(server);
new SocketListeners(io);

// expose io for routes broadcast usage
(app as any).set("io", io);

server.listen(process.env.SERVER_PORT, () =>
    console.log(`Server is running on port ${process.env.SERVER_PORT}`),
);
