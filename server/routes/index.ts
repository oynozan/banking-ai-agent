import { Router } from "express";

/* Routes */
import Ping from "./public/ping";

const router = Router();

router.use("/ping", Ping);

export default router;
