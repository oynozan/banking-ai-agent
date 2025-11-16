// server/lib/modules/prompts/intents.ts

export const ACTION_INTENTS = [
    "check_balance",
    "check_account_balance",
    "transfer_money",
    "show_accounts",
    "show_transactions",
    "add_contact",
    "confirm_alias_match",
    "open_account",
    "delete_account",
    "show_iban"
  ] as const;
  
  export type ActionIntent = (typeof ACTION_INTENTS)[number];
  