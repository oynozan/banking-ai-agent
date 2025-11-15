import { Router } from "express";

/* Routes */
import Ping from "./public/ping";
import Auth from "./public/auth";

const router = Router();

router.use("/ping", Ping);
router.use("/auth", Auth);

export default router;
