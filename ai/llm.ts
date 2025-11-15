// ai/llm.ts
import Groq from "groq-sdk";
import { Message, AssistantResponse } from "./types";
import * as dotenv from "dotenv";

// Load .env for GROQ_API_KEY
dotenv.config();

// ============================================================
// Groq client setup
// ============================================================

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Please set GROQ_API_KEY in your environment or .env file."
    );
  }
  return new Groq({ apiKey });
}

// ============================================================
// Core function: single conversational step
// ============================================================

export async function chatStep(
  client: Groq,
  history: Message[],
  userMessage: string
): Promise<AssistantResponse> {
  history.push({ role: "user", content: userMessage });

  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: history,
    temperature: 0,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  history.push({ role: "assistant", content });

  try {
    const parsed = JSON.parse(content) as AssistantResponse;
    return parsed;
  } catch (error) {
    return {
      intent: "unsupported",
      assistant_message:
        "There was an internal parsing error. Please try again.",
    };
  }
}
