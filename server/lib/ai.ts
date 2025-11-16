// server/lib/modules/ai.ts

import Groq from "groq-sdk";
import { CASUAL_PROMPT, ROUTER_PROMPT, getActionPrompt } from "./prompts";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type RouteResult = {
  mode: "action" | "casual";
  intent: string | null;
  missing_parameters?: string[];
};

export default class AI {
  private readonly client: any;      // <- back to any, no TS error
  private readonly model: string;
  private readonly maxHistory: number = 8; // keep last N messages for speed

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");

    this.client = new Groq({ apiKey });
    this.model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  }

  async streamCasual(history: ChatMessage[], onToken: (token: string) => void) {
    await this.stream(CASUAL_PROMPT, history, onToken);
  }

  async completeAction(
    intent: string,
    history: ChatMessage[],
    knownParams?: Record<string, unknown>,
    knownContacts?: unknown
  ) {
    const prompt = getActionPrompt(intent, knownParams, knownContacts);
    return this.complete(prompt, history, { type: "json_object" }, { intent });
  }

  async route(
    history: ChatMessage[],
    knownParams?: Record<string, unknown>,
    knownContacts?: unknown
  ): Promise<RouteResult> {
    const routerPrompt = ROUTER_PROMPT.replace(
      "{KNOWN_PARAMS}",
      JSON.stringify(
        knownParams && Object.keys(knownParams).length ? knownParams : {}
      )
    ).replace(
      "{KNOWN_CONTACTS}",
      JSON.stringify(
        Array.isArray(knownContacts) ? knownContacts : knownContacts || []
      )
    );

    const content = await this.complete(
      routerPrompt,
      history,
      { type: "json_object" },
      { mode: "router" }
    );

    const parsed = this.safeParse<RouteResult>(content, {
      mode: "casual",
      intent: null
    });

    if (parsed.missing_parameters && !Array.isArray(parsed.missing_parameters)) {
      parsed.missing_parameters = [];
    }

    return parsed;
  }

  async summarizeAction(intent: string, result: unknown, history: ChatMessage[]) {
    const steer: ChatMessage = {
      role: "user",
      content: `Summarize the result of intent "${intent}" with this data: ${JSON.stringify(
        result
      )}. Respond with one concise plain-text sentence.`
    };
    return this.complete(CASUAL_PROMPT, [...history, steer], undefined, {
      intent,
      mode: "summary"
    });
  }

  // Trim history so each call is lighter
  private buildMessages(systemPrompt: string, history: ChatMessage[]) {
    const trimmed =
      history.length > this.maxHistory
        ? history.slice(history.length - this.maxHistory)
        : history;

    return [{ role: "system", content: systemPrompt }, ...trimmed];
  }

  private async stream(
    systemPrompt: string,
    history: ChatMessage[],
    onToken: (token: string) => void
  ) {
    const messages = this.buildMessages(systemPrompt, history);
    this.log("request", { systemPrompt: systemPrompt.slice(0, 80), messages });
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0,
      stream: true
    });

    let aggregated = "";
    for await (const chunk of response) {
      const token = chunk?.choices?.[0]?.delta?.content;
      if (token) {
        aggregated += token;
        onToken(token);
      }
    }
    this.log("stream", {
      prompt: systemPrompt.slice(0, 80),
      response: aggregated
    });
  }

  private async complete(
    systemPrompt: string,
    history: ChatMessage[],
    responseFormat?: { type: string },
    meta: Record<string, unknown> = {}
  ) {
  
    const messages = this.buildMessages(systemPrompt, history);
    this.log("request", {
      systemPrompt: systemPrompt.slice(0, 80),
      messages,
      meta
    });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0,
      stream: false,
      response_format: responseFormat
    });

    const content = response.choices?.[0]?.message?.content?.trim() ?? "";
    this.log("complete", { meta, response: content });
    return content;
  }

  private safeParse<T>(content: string, fallback: T): T {
    try {
      return JSON.parse(content) as T;
    } catch {
      return fallback;
    }
  }

  private log(label: string, payload: unknown) {
    console.log(`[AI] ${label}`, payload);
  }
}
