import type AI from "./ai";
import type { ChatMessage } from "./ai";

// Modules
import UserLib from "./modules/user";
import AccountLib from "./modules/account";
import {
    internalTransfer,
    externalTransfer,
    chooseDefaultAccount,
    listUserAccounts,
} from "./modules/transfer";
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

    private async handleCheckBalance(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId, ai, history, maxHistory, id } = ctx;
        if (!userId) {
            return {
                event: "chat:error",
                payload: { message: "You must be logged in to check your balance" },
            };
        }

        const balance = await UserLib.getBalanceByUserId(userId);
        const result = { balance };
        const reply = await ai.summarizeAction("check_balance", result, history.slice(-maxHistory));

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
                payload: { message: "Account name is required. Please provide a name for the account (e.g., 'Main Savings', 'Emergency Fund')." },
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
            payload: { id, data: { ...action, result, assistant_message: reply } },
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
                payload: { message: "Account name is required. Please provide the name of the account you want to delete." },
            };
        }

        const deletedAccount = await AccountLib.deleteAccount({
            userId,
            name: accountName.trim(),
        });

        if (!deletedAccount) {
            return {
                event: "chat:error",
                payload: { message: `Account named "${accountName.trim()}" not found. Please check the account name and try again.` },
            };
        }

        const result = {
            iban: deletedAccount.iban,
            name: deletedAccount.name,
            type: deletedAccount.type,
            currency: deletedAccount.currency,
        };

        const reply = await ai.summarizeAction("delete_account", result, history.slice(-maxHistory));

        return {
            event: "chat:action",
            payload: { id, data: { ...action, result, assistant_message: reply } },
            assistantMessage: reply,
        };
    }

    private async handleTransferMoney(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId, ai, history, maxHistory, id } = ctx;
        if (!userId) {
            return {
                event: "chat:error",
                payload: { message: "You must be logged in to transfer money" },
            };
        }

        let {
            transfer_type,
            from_account,
            amount,
            currency,
            recipient_type,
            recipient_value,
            recipient_name,
            category,
            to_account,
        } = action;

        const numericAmount =
            typeof amount === "number" ? amount : amount ? Number(amount) : undefined;

        if (!transfer_type || typeof numericAmount !== "number" || !currency) {
            return {
                event: "chat:error",
                payload: { message: "Missing transfer details" },
            };
        }

        if (!from_account) {
            const fallback = await chooseDefaultAccount(userId, currency);
            if (!fallback) {
                return {
                    event: "chat:error",
                    payload: {
                        message: `No ${currency} account available to initiate the transfer`,
                    },
                };
            }
            from_account = fallback.iban;
        }

        let result;
        if (transfer_type === "internal") {
            if (!to_account) {
                return {
                    event: "chat:error",
                    payload: { message: "Destination account is required" },
                };
            }

            result = await internalTransfer({
                userId,
                fromIban: from_account,
                toIban: to_account,
                amount: numericAmount,
            });
        } else if (transfer_type === "external") {
            if (
                !recipient_type ||
                !recipient_value ||
                !recipient_name ||
                !category ||
                (recipient_type !== "iban" && recipient_type !== "id")
            ) {
                return {
                    event: "chat:error",
                    payload: { message: "Recipient information is incomplete" },
                };
            }

            result = await externalTransfer({
                userId,
                fromIban: from_account,
                amount: numericAmount,
                recipientType: recipient_type,
                recipientValue: recipient_value,
                recipientName: recipient_name,
                category,
            });
        } else {
            return {
                event: "chat:error",
                payload: { message: "Unsupported transfer type" },
            };
        }

        if (!category || typeof category !== "string" || !category.trim()) {
            category = "Other";
        }

        const replyData: any = {
            ...result,
            oldFromBalance: result.from.balance + amount,
        };

        if (transfer_type === "internal") {
            replyData["oldToBalance"] = result.to.balance - amount;
        } else {
            replyData["to"]["balance"] = null;
        }

        const reply = await ai.summarizeAction(
            "transfer_money",
            replyData,
            history.slice(-maxHistory),
        );

        return {
            event: "chat:action",
            payload: {
                id,
                data: { ...action, from_account, result, assistant_message: reply },
            },
            assistantMessage: reply,
        };
    }

    private async handleShowAccounts(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId, ai, history, maxHistory, id } = ctx;
        if (!userId) {
            return {
                event: "chat:error",
                payload: { message: "You must be logged in to view accounts" },
            };
        }

        const accounts = await listUserAccounts(userId);
        if (!accounts || accounts.length === 0) {
            return {
                event: "chat:action",
                payload: {
                    id,
                    data: {
                        intent: "show_accounts",
                        accounts: [],
                        assistant_message:
                            "I couldn't find any accounts linked to your profile yet.",
                    },
                },
            };
        }

        const reply = formatAccountList(accounts);

        return {
            event: "chat:action",
            payload: {
                id,
                data: {
                    intent: "show_accounts",
                    accounts,
                    assistant_message: reply,
                },
            },
            assistantMessage: reply,
        };
    }

    private async handleAddContact(action: any, ctx: MCPContext): Promise<MCPResult> {
        const { userId, ai, history, maxHistory, id } = ctx;
        if (!userId) {
            return {
                event: "chat:error",
                payload: { message: "You must be logged in to manage contacts" },
            };
        }

        const alias = action?.contact_alias;
        const iban = action?.iban;
        const name = action?.contact_name;

        if (!alias || !iban) {
            return {
                event: "chat:error",
                payload: { message: "Alias and IBAN are required to add a contact" },
            };
        }

        const created = await ContactLib.addContact({ userId, alias, iban, name });
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
            payload: { id, data: { ...action, result, assistant_message: reply } },
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
