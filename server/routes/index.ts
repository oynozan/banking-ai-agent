import { Router } from "express";

/* Routes */
import Ping from "./public/ping";
import Auth from "./public/auth";
import Accounts from "./public/accounts";
import Transfer from "./public/transfer";
import Transactions from "./public/transactions";
import Stats from "./public/stats";

const router = Router();

router.use("/ping", Ping);
router.use("/auth", Auth);
router.use("/accounts", Accounts);
router.use("/transfer", Transfer);
router.use("/transactions", Transactions);
router.use("/stats", Stats);

export default router;
