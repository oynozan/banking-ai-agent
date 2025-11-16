import { MCP } from "../lib/mcp";
import { SocketListener } from "../socket";
import AI, { type ChatMessage } from "../lib/ai";

export class AgentListener extends SocketListener {
    private ai: AI;
    private history: ChatMessage[];
    private isStreaming: boolean;
    private readonly maxHistory = 15;
    private mcp: MCP;
    private pendingActions: Map<string, any>;
    private currentActionMemory: { intent: string | null; params: Record<string, unknown> };

    constructor(io: any, socket: any) {
        super(io, socket);
        this.ai = new AI();
        this.history = [];
        this.isStreaming = false;
        this.mcp = new MCP();
        this.pendingActions = new Map();
        this.currentActionMemory = { intent: null, params: {} };
    }

    listen() {
        // Confirmation handlers
        this.socket.on("chat:action:confirm", async ({ id }: { id: string }) => {
            try {
                const action = this.pendingActions.get(id);
                if (!action) return;

                await this.executeAction(id, action);
            } catch (error) {
                console.error(error);
                const message = error instanceof Error ? error.message : "Action failed";
                this.socket.emit("chat:error", { message });
            } finally {
                this.pendingActions.delete(id);
                // Clear memory after execution attempt
                this.resetActionMemory();
            }
        });

        this.socket.on("chat:action:decline", ({ id }: { id: string }) => {
            if (this.pendingActions.has(id)) {
                this.pendingActions.delete(id);
            }
            this.socket.emit("chat:action:cancelled", { id });
            // Clear memory on decline
            this.resetActionMemory();
        });

        this.socket.on("disconnect", () => {
            // Clear per-connection memory on disconnect
            this.history = [];
            this.isStreaming = false;
            this.pendingActions.clear();
            this.resetActionMemory();
        });

        this.socket.on("chat:message", async (data: string) => {
            try {
                const userMessage = typeof data === "string" ? data.trim() : "";
                if (!userMessage) {
                    this.socket.emit("chat:error", { message: "Empty message" });
                    return;
                }

                if (this.isStreaming) {
                    this.socket.emit("chat:error", {
                        message: "Another message is still being processed.",
                    });
                    return;
                }
                this.isStreaming = true;

                this.pushUserMessage(userMessage);

                // Decide route with history
                const route = await this.ai.route(this.history, this.currentActionMemory.params);
                console.log("[AI] route", route);

                if (route.mode === "action" && route?.intent && typeof route.intent === "string") {
                    // Non-stream JSON action
                    const intent = route.intent;
                    const knownParams =
                        this.currentActionMemory.intent === intent ? this.currentActionMemory.params : {};
                    const content = await this.ai.completeAction(intent, this.history, knownParams);

                    // Try parse and examine missing_parameters
                    try {
                        const parsed = JSON.parse(content);
                        const missing = Array.isArray(parsed?.missing_parameters)
                            ? parsed.missing_parameters
                            : [];

                        // Merge known non-null parameters into memory for this intent
                        this.mergeActionMemory(intent, parsed);

                        if (
                            missing.length > 0 ||
                            parsed?.intent === "informational" ||
                            parsed?.intent === "unsupported"
                        ) {
                            const steerHistory: ChatMessage[] = [
                                ...this.history,
                                {
                                    role: "user" as const,
                                    content: `Ask ONLY for these missing fields: ${missing.join(", ")}. Be concise.`,
                                },
                            ].slice(-this.maxHistory);

                            await this.streamAssistant(steerHistory);
                        } else {
                            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

                            this.pendingActions.set(id, parsed);
                            this.socket.emit("chat:action:request", { id, data: parsed });

                            if (parsed?.assistant_message) {
                                this.pushAssistantMessage(parsed.assistant_message as string);
                            }
                        }
                    } catch {
                        await this.streamAssistant();
                    }
                } else if (
                    route.intent === "missing_parameters" &&
                    Array.isArray(route.missing_parameters) &&
                    route.missing_parameters.length > 0
                ) {
                    await this.askForMissingParameters(route.missing_parameters);
                } else {
                    await this.streamAssistant();
                }
            } catch (e) {
                console.error(e);
                this.socket.emit("chat:error", { message: "Failed to process message" });
            } finally {
                this.isStreaming = false;
            }
        });
    }

    private resetActionMemory() {
        this.currentActionMemory = { intent: null, params: {} };
    }

    private mergeActionMemory(intent: string, parsed: Record<string, unknown>) {
        // If intent changes, reset memory
        if (this.currentActionMemory.intent && this.currentActionMemory.intent !== intent) {
            this.resetActionMemory();
        }
        this.currentActionMemory.intent = intent;

        // Keep only meaningful fields and non-null/defined values
        const ignore = new Set(["intent", "assistant_message", "missing_parameters"]);
        const nextParams: Record<string, unknown> = { ...this.currentActionMemory.params };
        for (const [key, value] of Object.entries(parsed || {})) {
            if (ignore.has(key)) continue;
            if (value !== null && value !== undefined && value !== "") {
                nextParams[key] = value;
            }
        }
        this.currentActionMemory.params = nextParams;
        console.log("[AI] memory", { intent: this.currentActionMemory.intent, params: this.currentActionMemory.params });
    }

    private pushUserMessage(content: string) {
        this.history.push({ role: "user", content });
        console.log("[AI] pushUserMessage", { length: this.history.length, content });
        this.trimHistory();
    }

    private pushAssistantMessage(content: string) {
        const trimmed = content?.trim();
        if (!trimmed) return;
        this.history.push({ role: "assistant", content: trimmed });
        console.log("[AI] pushAssistantMessage", { length: this.history.length, content: trimmed });
        this.trimHistory();
    }

    private trimHistory() {
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
    }

    private async streamAssistant(history: ChatMessage[] = this.history) {
        this.socket.emit("chat:stream:start", { ok: true });
        let assistantText = "";
        await this.ai.streamCasual(history, (token: string) => {
            assistantText += token;
            this.socket.emit("chat:stream", { token });
        });
        this.socket.emit("chat:stream:end", { ok: true });
        this.pushAssistantMessage(assistantText);
    }

    private async askForMissingParameters(fields: string[]) {
        console.log("[AI] missing_parameters", { fields, history: this.history.length });
        const instruction = `Ask the user, in plain language, to provide the following fields: ${fields.join(
            ", ",
        )}. Be concise and ask only for these fields.`;
        const steerHistory: ChatMessage[] = [
            ...this.history,
            { role: "user" as const, content: instruction },
        ].slice(-this.maxHistory);
        await this.streamAssistant(steerHistory);
    }

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
        if (result.assistantMessage) this.pushAssistantMessage(result.assistantMessage);
    }
}
