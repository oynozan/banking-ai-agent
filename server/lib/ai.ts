import Groq from "groq-sdk";
import { ACTION_PROMPT, CASUAL_PROMPT, ROUTER_PROMPT } from "./prompts";

export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export default class AI {
    private readonly client: any;
    private readonly model: string;

    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("GROQ_API_KEY is not set");
        }

        this.client = new Groq({ apiKey });
        this.model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    }

    private buildMessages(systemPrompt: string, history: ChatMessage[]): ChatMessage[] {
        return [{ role: "system", content: systemPrompt }, ...history];
    }

    async streamCasual(history: ChatMessage[], onToken: (token: string) => void): Promise<void> {
        const messages = this.buildMessages(CASUAL_PROMPT, history);

        const stream = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: 0,
            stream: true,
        });

        for await (const chunk of stream) {
            const token = chunk?.choices?.[0]?.delta?.content || "";
            if (token) onToken(token);
        }
    }

    async completeAction(history: ChatMessage[]): Promise<string> {
        const messages = this.buildMessages(ACTION_PROMPT, history);

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: 0,
            stream: false,
            response_format: { type: "json_object" },
        });

        return response.choices?.[0]?.message?.content ?? "{}";
    }

    async route(history: ChatMessage[]): Promise<{ mode: "action" | "casual"; intent: string | null }> {
        const messages = this.buildMessages(ROUTER_PROMPT, history);

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: 0,
            stream: false,
            response_format: { type: "json_object" },
        });

        const content = response.choices?.[0]?.message?.content ?? "{\"mode\":\"casual\",\"intent\":null}";
        try {
            const parsed = JSON.parse(content) as { mode: "action" | "casual"; intent: string | null };
            return parsed.mode === "action" || parsed.mode === "casual"
                ? parsed
                : { mode: "casual", intent: null };
        } catch {
            return { mode: "casual", intent: null };
        }
    }
}