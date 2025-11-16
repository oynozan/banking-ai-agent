import type AI from "./ai";
import type { ChatMessage } from "./ai";

import UserLib from "./modules/user";
import AccountLib from "./modules/account";
import { internalTransfer, externalTransfer, listUserAccounts } from "./modules/transfer";
import ContactLib from "./modules/contacts";

export type MCPContext = {
    id: string;
    ai: AI;
    userId?: string;
    history: ChatMessage[];
    maxHistory: number;
};

export type MCPResult = {
    event: string;
    payload: any;
    assistantMessage?: string;
};

export class MCP {
    private handlers: Record<string, (action: any, ctx: MCPContext) => Promise<MCPResult>> = {
        check_balance: this.handleCheckBalance.bind(this),
        check_account_balance: this.handleCheckAccountBalance.bind(this),
        open_account: this.handleOpenAccount.bind(this),
        transfer_money: this.handleTransferMoney.bind(this),
        show_accounts: this.handleShowAccounts.bind(this),
        add_contact: this.handleAddContact.bind(this),
        delete_account: this.handleDeleteAccount.bind(this),
    };

    async execute(intent: string, action: any, ctx: MCPContext): Promise<MCPResult | null> {
        const handler = this.handlers[intent];
        return handler ? handler(action, ctx) : null;
    }

    // ---------------- CHECK BALANCE ------------------

    private async handleCheckBalance(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId, ai, history, maxHistory, id } = ctx;
        if (!userId) {
            return { event: "chat:error", payload: { message: "Not logged in." } };
        }

        const balance = await UserLib.getBalanceByUserId(userId);
        const reply = await ai.summarizeAction(
            "check_balance",
            { balance, currency: "PLN" },
            history.slice(-maxHistory),
        );

        return {
            event: "chat:action",
            payload: { id, data: { ...action, balance, assistant_message: reply } },
            assistantMessage: reply,
        };
    }

    // ---------------- OPEN ACCOUNT ------------------

    private async handleCheckAccountBalance(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId, ai, history, maxHistory, id } = ctx;
        if (!userId) {
            return {
                event: "chat:error",
                payload: { message: "You must be logged in to check your account balance" },
            };
        }

        const { name, account_name } = action;

        // Support both "name" and "account_name" parameter names
        const accountName = name || account_name;

        if (!accountName || typeof accountName !== "string" || accountName.trim().length === 0) {
            return {
                event: "chat:error",
                payload: {
                    message:
                        "Account name is required. Please provide the name of the account you want to check.",
                },
            };
        }

        const accountBalance = await UserLib.getBalanceByAccountName(userId, accountName.trim());

        if (!accountBalance) {
            return {
                event: "chat:error",
                payload: {
                    message: `Account named "${accountName.trim()}" not found. Please check the account name and try again.`,
                },
            };
        }

        const result = {
            balance: accountBalance.balance,
            currency: accountBalance.currency,
            name: accountBalance.name,
            iban: accountBalance.iban,
        };

        const reply = await ai.summarizeAction(
            "check_account_balance",
            result,
            history.slice(-maxHistory),
        );

        return {
            event: "chat:action",
            payload: { id, data: { ...action, result, assistant_message: reply } },
            assistantMessage: reply,
        };
    }

    private async handleOpenAccount(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId, ai, history, maxHistory, id } = ctx;
        if (!userId) {
            return {
                event: "chat:error",
                payload: { message: "You must be logged in to open an account" },
            };
        }

        const { type, currency, name, account_name } = action;

        // Support both "name" and "account_name" parameter names
        const accountName = name || account_name;

        if (!accountName || typeof accountName !== "string" || accountName.trim().length === 0) {
            return {
                event: "chat:error",
                payload: {
                    message:
                        "Account name is required. Please provide a name for the account (e.g., 'Main Savings', 'Emergency Fund').",
                },
            };
        }

        const newAccount = await AccountLib.createAccount({
            user: { id: userId },
            name: accountName.trim(),
            type,
            currency,
        });

        if (!newAccount) {
            return {
                event: "chat:error",
                payload: { message: "Failed to open account" },
            };
        }

        const result = {
            iban: newAccount.iban,
            name: newAccount.name,
            type: newAccount.type,
            currency: newAccount.currency,
        };

        const reply = await ai.summarizeAction("open_account", result, history.slice(-maxHistory));

        return {
            event: "chat:action",
            payload: {
                id,
                data: { ...action, result, assistant_message: reply },
            },
            assistantMessage: reply,
        };
    }

    private async handleDeleteAccount(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId, ai, history, maxHistory, id } = ctx;
        if (!userId) {
            return {
                event: "chat:error",
                payload: { message: "You must be logged in to delete an account" },
            };
        }

        const { name, account_name } = action;

        // Support both "name" and "account_name" parameter names
        const accountName = name || account_name;

        if (!accountName || typeof accountName !== "string" || accountName.trim().length === 0) {
            return {
                event: "chat:error",
                payload: {
                    message:
                        "Account name is required. Please provide the name of the account you want to delete.",
                },
            };
        }

        const deletedAccount = await AccountLib.deleteAccount({
            userId,
            name: accountName.trim(),
        });

        if (!deletedAccount) {
            return {
                event: "chat:error",
                payload: {
                    message: `Account named "${accountName.trim()}" not found. Please check the account name and try again.`,
                },
            };
        }

        const result = {
            iban: deletedAccount.iban,
            name: deletedAccount.name,
            type: deletedAccount.type,
            currency: deletedAccount.currency,
        };

        const reply = await ai.summarizeAction(
            "delete_account",
            result,
            history.slice(-maxHistory),
        );

        return {
            event: "chat:action",
            payload: { id, data: { ...action, result, assistant_message: reply } },
            assistantMessage: reply,
        };
    }

    private async handleTransferMoney(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId, ai, history, maxHistory, id } = ctx;
        if (!userId) {
            return { event: "chat:error", payload: { message: "Not logged in." } };
        }

        const {
            transfer_type,
            from_account,
            amount,
            currency,
            to_account,
            recipient_type,
            recipient_value,
            recipient_name,
            category,
        } = action;

        const amt = Number(amount);
        if (!transfer_type || !from_account || !amt || !currency) {
            return { event: "chat:error", payload: { message: "Incomplete transfer details." } };
        }

        let result;

        if (transfer_type === "internal") {
            if (!to_account) {
                return {
                    event: "chat:error",
                    payload: { message: "Missing destination account." },
                };
            }

            result = await internalTransfer({
                userId,
                fromIban: from_account,
                toIban: to_account,
                amount: amt,
            });
        } else if (transfer_type === "external") {
            if (!recipient_value || !category) {
                return { event: "chat:error", payload: { message: "Missing recipient data." } };
            }

            result = await externalTransfer({
                userId,
                fromIban: from_account,
                amount: amt,
                recipientType: recipient_type || "iban",
                recipientValue: recipient_value,
                recipientName: recipient_name,
                category,
            });
        }

        const reply = await ai.summarizeAction(
            "transfer_money",
            result,
            history.slice(-maxHistory),
        );

        return {
            event: "chat:action",
            payload: {
                id,
                data: { ...action, result, assistant_message: reply },
            },
            assistantMessage: reply,
        };
    }

    // ---------------- SHOW ACCOUNTS (FOR SUGGESTIONS) ------------------

    private async handleShowAccounts(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId } = ctx;
        if (!userId) {
            return { event: "chat:error", payload: { message: "Not logged in." } };
        }

        const accounts = await listUserAccounts(userId);

        return {
            event: "chat:accounts",
            payload: { accounts },
        };
    }

    // ---------------- ADD CONTACT ------------------

    private async handleAddContact(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId, ai, history, maxHistory, id } = ctx;

        if (!userId) {
            return { event: "chat:error", payload: { message: "Not logged in." } };
        }

        const created = await ContactLib.addContact({
            userId,
            alias: action.contact_alias,
            iban: action.iban,
            name: action.contact_name,
        });

        if (!created) {
            return {
                event: "chat:error",
                payload: { message: "Failed to add contact" },
            };
        }

        const result = { alias: created.alias, name: created.name, iban: created.iban };
        const reply = await ai.summarizeAction("add_contact", result, history.slice(-maxHistory));

        return {
            event: "chat:action",
            payload: {
                id,
                data: { ...action, assistant_message: reply },
            },
            assistantMessage: reply,
        };
    }
}

function formatAccountList(
    accounts: Array<{
        iban: string;
        name?: string;
        balance: number;
        currency: string;
        type?: string;
        accountId?: string;
    }>,
): string {
    if (!accounts.length) {
        return "I couldn't find any accounts linked to your profile yet.";
    }

    const lines = accounts.map((acc, index) => {
        const masked = acc.iban;
        const balance = typeof acc.balance === "number" ? acc.balance.toFixed(2) : acc.balance;
        const label = acc.type ? acc.type.charAt(0).toUpperCase() + acc.type.slice(1) : "Account";
        const accountName = acc.name ? `"${acc.name}"` : "";
        const namePart = accountName ? `${accountName} • ` : "";
        return `${index + 1}) ${namePart}${label} • ${acc.currency} ${balance} • ${masked}`;
    });

    return `${lines.join("\n")}`;
}
