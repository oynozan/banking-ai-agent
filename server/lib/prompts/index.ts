// server/lib/modules/prompts/index.ts

import { ACTION_INTENTS, type ActionIntent } from "./intents";
import { CASUAL_PROMPT } from "./casual";
import { ROUTER_PROMPT } from "./router";
import { getTransferActionPrompt } from "./transfer";
import { getAccountActionPrompt } from "./accounts";
import { getGenericActionPrompt } from "./generic";

export { ACTION_INTENTS, CASUAL_PROMPT, ROUTER_PROMPT, ActionIntent };

export function getActionPrompt(
  intent: string,
  knownParams?: Record<string, unknown>,
  knownContacts?: unknown
): string {
  const typedIntent = (ACTION_INTENTS as readonly string[]).includes(intent)
    ? (intent as ActionIntent)
    : "check_balance";

  if (typedIntent === "transfer_money") {
    return getTransferActionPrompt(knownParams, knownContacts);
  }

  if (typedIntent === "open_account" || typedIntent === "delete_account") {
    return getAccountActionPrompt(
      typedIntent as "open_account" | "delete_account",
      knownParams,
      knownContacts
    );
  }

  // Everything else (balances, contacts, etc.)
  return getGenericActionPrompt(typedIntent, knownParams, knownContacts);
}
