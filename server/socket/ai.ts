import { MCP } from "../lib/mcp";
import { SocketListener } from "../socket";
import AI, { type ChatMessage } from "../lib/ai";
import ContactLib from "../lib/modules/contacts";

export class AgentListener extends SocketListener {
    private ai: AI;
    private history: ChatMessage[];
    private isStreaming: boolean;
    private readonly maxHistory = 15;
    private mcp: MCP;
    private pendingActions: Map<string, any>;
    private currentActionMemory: { intent: string | null; params: Record<string, unknown> };
    private cachedContacts: Array<{ alias: string; name?: string; iban: string }> | null;

    constructor(io: any, socket: any) {
        super(io, socket);
        this.ai = new AI();
        this.history = [];
        this.isStreaming = false;
        this.mcp = new MCP();
        this.pendingActions = new Map();
        this.currentActionMemory = { intent: null, params: {} };
        this.cachedContacts = null;
    }

    listen() {
        // CONFIRM
        this.socket.on("chat:action:confirm", async ({ id }: { id: string }) => {
            try {
                const action = this.pendingActions.get(id);
                if (!action) return;
                await this.executeAction(id, action);
            } finally {
                this.pendingActions.delete(id);
                this.resetActionMemory();
            }
        });

        // DECLINE
        this.socket.on("chat:action:decline", ({ id }: { id: string }) => {
            this.pendingActions.delete(id);
            this.socket.emit("chat:action:cancelled", { id });
            this.resetActionMemory();
        });

        // DISCONNECT
        this.socket.on("disconnect", () => {
            this.history = [];
            this.isStreaming = false;
            this.pendingActions.clear();
            this.resetActionMemory();
            this.cachedContacts = null;
        });

        // MAIN MESSAGE HANDLER
        this.socket.on("chat:message", async (data: string) => {
            try {
                const userMessage = (data || "").trim();
                if (!userMessage) return;

                if (this.isStreaming) {
                    this.socket.emit("chat:error", { message: "Processing previous message..." });
                    return;
                }

                this.isStreaming = true;

                this.pushUserMessage(userMessage);

                const userId = this.socket.user?.id as string | undefined;
                const contacts = await this.getContacts(userId);

                // if action already started → skip router
                let intent = this.currentActionMemory.intent;

                if (!intent) {
                    const route = await this.ai.route(
                        this.history,
                        this.currentActionMemory.params,
                        contacts
                    );

                    console.log("[ROUTER]:", route);

                    if (route.mode === "action" && route.intent) {
                        this.resetActionMemory();
                        this.currentActionMemory.intent = route.intent;
                        intent = route.intent;
                    } else {
                        await this.streamAssistant();
                        return;
                    }
                }

                await this.handleActionFlow(intent, contacts);
            } catch (e) {
                console.error(e);
            } finally {
                this.isStreaming = false;
            }
        });
    }

    // ============================================================
    // ACTION FLOW HANDLING
    // ============================================================

    private async handleActionFlow(intent: string, contacts: any[]) {
        const prevParams =
            this.currentActionMemory.intent === intent
                ? this.currentActionMemory.params
                : {};

        const content = await this.ai.completeAction(
            intent,
            this.history,
            prevParams,
            contacts
        );

        let parsed: any = null;
        try {
            parsed = JSON.parse(content);
        } catch (err) {
            console.error("JSON parse error", err);
            await this.streamAssistant();
            return;
        }

        const missing = parsed.missing_parameters || [];

        // merge params
        this.mergeActionMemory(intent, parsed);

        // show FROM account selector
        if (parsed.intent === "transfer_money" && missing.includes("from_account")) {
            await this.sendAccountSelection("from_account");
            return;
        }

        // show TO account selector (internal)
        if (
            parsed.intent === "transfer_money" &&
            parsed.transfer_type === "internal" &&
            missing.includes("to_account")
        ) {
            await this.sendAccountSelection("to_account");
            return;
        }

        // ============================================================
        // FIXED: FOLLOW-UP MESSAGES NOW SHOW
        // ============================================================
        if (missing.length > 0) {
            const msg =
                parsed.assistant_message ||
                `Please provide: ${missing.join(", ")}`;

            console.log("EMIT → chat:assistant:", msg);

            // send to UI
            this.socket.emit("chat:assistant", { content: msg });

            // keep memory history consistent
            this.pushAssistantMessage(msg);
            return;
        }

        // CONFIRMATION
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.pendingActions.set(id, parsed);

        this.socket.emit("chat:action:request", {
            id,
            data: parsed,
        });

        if (parsed.assistant_message) {
            this.pushAssistantMessage(parsed.assistant_message);
        }
    }

    // ============================================================
    // CORRECT ORDER: ASSISTANT FIRST → BUTTONS SECOND
    // ============================================================

    private async sendAccountSelection(field: "from_account" | "to_account") {
        console.log("[AI] sendAccountSelection →", field);

        const userId = this.socket.user?.id;
        if (!userId) return;

        const result = await this.mcp.execute(
            "show_accounts",
            { intent: "show_accounts" },
            {
                id: `list-${Date.now()}`,
                ai: this.ai,
                userId,
                history: this.history,
                maxHistory: this.maxHistory,
            }
        );

        if (!result) return;

        const assistantMessage =
            result.assistantMessage ||
            (field === "from_account"
                ? "Please select the account you want to transfer from:"
                : "Please select the account you want to transfer to:");

        this.pushAssistantMessage(assistantMessage);
        this.socket.emit("chat:stream:start", { ok: true });

        for (const token of assistantMessage.split(" ")) {
            this.socket.emit("chat:stream", { token: token + " " });
        }

        this.socket.emit("chat:stream:end", { ok: true });

        this.socket.emit(result.event, {
            ...result.payload,
            field,
        });
    }

    // ============================================================
    // HISTORY MGMT
    // ============================================================

    private pushUserMessage(content: string) {
        this.history.push({ role: "user", content });
        this.trimHistory();
    }

    private pushAssistantMessage(content: string) {
        if (!content.trim()) return;
        this.history.push({ role: "assistant", content });
        this.trimHistory();
    }

    private trimHistory() {
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
    }

    // ============================================================
    // STREAM CASUAL
    // ============================================================

    private async streamAssistant(history: ChatMessage[] = this.history) {
        this.socket.emit("chat:stream:start", { ok: true });

        let final = "";

        await this.ai.streamCasual(history, (token: string) => {
            final += token;
            this.socket.emit("chat:stream", { token });
        });

        this.socket.emit("chat:stream:end", { ok: true });
        this.pushAssistantMessage(final);
    }

    // ============================================================
    // EXECUTION
    // ============================================================

    private async executeAction(id: string, action: any) {
        const result = await this.mcp.execute(action.intent, action, {
            id,
            ai: this.ai,
            userId: this.socket.user?.id,
            history: this.history,
            maxHistory: this.maxHistory,
        });

        if (!result) {
            this.socket.emit("chat:action", { id, data: action });
            return;
        }

        this.socket.emit(result.event, result.payload);

        if (result.assistantMessage) {
            this.pushAssistantMessage(result.assistantMessage);
        }
    }

    // ============================================================
    // CONTACTS CACHE
    // ============================================================

    private async getContacts(userId?: string) {
        if (!userId) return [];
        if (this.cachedContacts) return this.cachedContacts;
        const list = await ContactLib.listContacts(userId);
        this.cachedContacts = list;
        return list;
    }

    private resetActionMemory() {
        this.currentActionMemory = { intent: null, params: {} };
    }

    private mergeActionMemory(intent: string, parsed: Record<string, unknown>) {
        if (this.currentActionMemory.intent && this.currentActionMemory.intent !== intent) {
            this.resetActionMemory();
        }

        this.currentActionMemory.intent = intent;

        const ignore = new Set(["intent", "assistant_message", "missing_parameters"]);

        const nextParams = { ...this.currentActionMemory.params };

        for (const [key, value] of Object.entries(parsed)) {
            if (ignore.has(key)) continue;
            if (value !== null && value !== undefined && value !== "") {
                nextParams[key] = value;
            }
        }

        this.currentActionMemory.params = nextParams;
    }
}
