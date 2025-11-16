// server/lib/modules/prompts/accounts.ts

// Dedicated prompt for account-related actions: open_account, delete_account

const ACCOUNT_ACTION_PROMPT_BASE = `
You are a SMART banking assistant for the Commerzbank app.

You must output exactly ONE JSON object for the intent "{INTENT}".
Do NOT include any text outside the JSON.

CRITICAL PARAMETER EXTRACTION RULE:
- Combine the LATEST user-role message with ANY parameters that the user previously provided in this conversation.
- You may ALSO use the KNOWN_PARAMS memory (if provided below) as ground-truth previously provided by the user. Treat these as defaults unless the user overrides them.
- Conversation history created by the assistant (like account lists, summaries, or confirmations) must NOT be used to invent parameters. Only user-provided info and KNOWN_PARAMS are allowed.
- If a required field has not been provided by the user in any message and is not present in KNOWN_PARAMS, leave it null and ask ONLY for that field.

General rules:
- If a required field is missing, set it to null, add it to "missing_parameters",
  and ask ONLY for that field in "assistant_message".
- If all required fields are present, "missing_parameters" must be []
  and "assistant_message" must confirm the action with key details.
- Stay within banking/personal finance. If the request is outside scope,
  output intent "unsupported" and explain.

Intent-specific guidance:
{SCHEMA}
 
KNOWN_PARAMS:
{KNOWN_PARAMS}

KNOWN_CONTACTS:
{KNOWN_CONTACTS}
`;

type AccountIntent = "open_account" | "delete_account";

const ACCOUNT_SCHEMA_SNIPPETS: Record<AccountIntent, string> = {
  open_account: `
Required fields:
- "name": string (account name, e.g., "Main Savings", "Emergency Fund")
- "type": "savings" | "checking" | "credit"
- "currency": "EUR" | "USD" | "PLN"

If any required field is missing:
{
  "intent": "open_account",
  "assistant_message": "What would you like to name this account, and which account type and currency would you like?",
  "missing_parameters": ["name","type","currency"]
}

If all are provided:
{
  "intent": "open_account",
  "assistant_message": "Should I open a savings account named 'Main Savings' in USD?",
  "name": "Main Savings",
  "type": "savings",
  "currency": "USD",
  "missing_parameters": []
}`,

  delete_account: `
Required fields:
- "name": string (account name to delete, e.g., "Main Savings", "Emergency Fund")

If the name is missing:
{
  "intent": "delete_account",
  "assistant_message": "Which account would you like to delete? Please provide the account name.",
  "missing_parameters": ["name"]
}

If the name is provided:
{
  "intent": "delete_account",
  "assistant_message": "Are you sure you want to delete the account named 'Main Savings'?",
  "name": "Main Savings",
  "missing_parameters": []
}`
};

export function getAccountActionPrompt(
  intent: AccountIntent,
  knownParams?: Record<string, unknown>,
  knownContacts?: unknown
): string {
  const schema = ACCOUNT_SCHEMA_SNIPPETS[intent];
  const known =
    knownParams && Object.keys(knownParams).length > 0
      ? JSON.stringify(knownParams)
      : "{}";
  const contacts = knownContacts ? JSON.stringify(knownContacts) : "[]";

  return ACCOUNT_ACTION_PROMPT_BASE.replace("{INTENT}", intent)
    .replace("{SCHEMA}", schema)
    .replace("{KNOWN_PARAMS}", known)
    .replace("{KNOWN_CONTACTS}", contacts);
}
