import { SocketListener } from "../socket";
import AI, { type ChatMessage } from "../lib/ai";
import { MCP } from "../lib/mcp";

export class AgentListener extends SocketListener {
    private ai: AI;
    private history: ChatMessage[];
    private isStreaming: boolean;
    private readonly maxHistory: number = 15;
    private mcp: MCP;
    private pendingActions: Map<string, any>;

    constructor(io: any, socket: any) {
        super(io, socket);
        this.ai = new AI();
        this.history = [];
        this.isStreaming = false;
        this.mcp = new MCP();
        this.pendingActions = new Map();
    }

    listen() {
        // Confirmation handlers
        this.socket.on("chat:action:confirm", async ({ id }: { id: string }) => {
            try {
                const action = this.pendingActions.get(id);
                if (!action) return;

                if (action.intent === "check_balance") {
                    const userId = this.socket.user?.id;
                    if (!userId) {
                        this.socket.emit("chat:error", { message: "Unauthorized: missing user context" });
                        return;
                    }
                    const result = await this.mcp.checkBalanceByUserId(userId);
                    this.socket.emit("chat:action", { id, data: { ...action, result } });
                } else {
                    // passthrough for now
                    this.socket.emit("chat:action", { id, data: action });
                }
            } finally {
                this.pendingActions.delete(id);
            }
        });

        this.socket.on("chat:action:decline", ({ id }: { id: string }) => {
            if (this.pendingActions.has(id)) {
                this.pendingActions.delete(id);
            }
            this.socket.emit("chat:action:cancelled", { id });
        });

        this.socket.on("disconnect", () => {
            // Clear per-connection memory on disconnect
            this.history = [];
            this.isStreaming = false;
            this.pendingActions.clear();
        });

        this.socket.on("chat:message", async (data: string) => {
            try {
                const userMessage = typeof data === "string" ? data.trim() : "";
                if (!userMessage) {
                    this.socket.emit("chat:error", { message: "Empty message" });
                    return;
                }

                if (this.isStreaming) {
                    this.socket.emit("chat:error", { message: "Another message is still being processed." });
                    return;
                }
                this.isStreaming = true;

                // Append user message and trim to last N
                this.history.push({ role: "user", content: userMessage });
                if (this.history.length > this.maxHistory) {
                    this.history = this.history.slice(-this.maxHistory);
                }

                // Decide route with history
                const route = await this.ai.route(this.history);

                if (route.mode === "action") {
                    // Non-stream JSON action
                    const content = await this.ai.completeAction(this.history);
                    // Try parse and examine missing_parameters
                    try {
                        const parsed = JSON.parse(content);
                        const missing = Array.isArray(parsed?.missing_parameters) ? parsed.missing_parameters : [];
                        if (missing.length > 0 || parsed?.intent === "informational" || parsed?.intent === "unsupported") {
                            // Stream a casual clarifying reply instead
                            this.socket.emit("chat:stream:start", { ok: true });
                            let assistantText = "";
                            const steerHistory: ChatMessage[] = [
                                ...this.history,
                                { role: "user" as const, content: `Ask ONLY for these missing fields: ${missing.join(", ")}. Be concise.` },
                            ].slice(-this.maxHistory);
                            await this.ai.streamCasual(steerHistory, (token: string) => {
                                assistantText += token;
                                this.socket.emit("chat:stream", { token });
                            });
                            this.socket.emit("chat:stream:end", { ok: true });
                            if (assistantText.trim()) {
                                this.history.push({ role: "assistant", content: assistantText });
                                if (this.history.length > this.maxHistory) {
                                    this.history = this.history.slice(-this.maxHistory);
                                }
                            }
                        } else {
                            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                            this.pendingActions.set(id, parsed);
                            this.socket.emit("chat:action:request", { id, data: parsed });
                            // Optionally keep a short assistant message in history
                            if (parsed?.assistant_message) {
                                this.history.push({ role: "assistant", content: parsed.assistant_message as string });
                                if (this.history.length > this.maxHistory) {
                                    this.history = this.history.slice(-this.maxHistory);
                                }
                            }
                        }
                    } catch {
                        // Fallback to casual stream if JSON can't be parsed
                        this.socket.emit("chat:stream:start", { ok: true });
                        let assistantText = "";
                        await this.ai.streamCasual(this.history, (token: string) => {
                            assistantText += token;
                            this.socket.emit("chat:stream", { token });
                        });
                        this.socket.emit("chat:stream:end", { ok: true });
                        if (assistantText.trim()) {
                            this.history.push({ role: "assistant", content: assistantText });
                            if (this.history.length > this.maxHistory) {
                                this.history = this.history.slice(-this.maxHistory);
                            }
                        }
                    }
                } else {
                    // Casual streaming reply
                    this.socket.emit("chat:stream:start", { ok: true });
                    let assistantText = "";
                    await this.ai.streamCasual(this.history, (token: string) => {
                        assistantText += token;
                        this.socket.emit("chat:stream", { token });
                    });
                    this.socket.emit("chat:stream:end", { ok: true });
                    if (assistantText.trim()) {
                        this.history.push({ role: "assistant", content: assistantText });
                        if (this.history.length > this.maxHistory) {
                            this.history = this.history.slice(-this.maxHistory);
                        }
                    }
                }
            } catch (e) {
                this.socket.emit("chat:error", { message: "Failed to process message" });
            } finally {
                this.isStreaming = false;
            }
        });
    }
}
