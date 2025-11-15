// ============================================================
// TYPES USED ACROSS THE BANKING ASSISTANT
// ============================================================

// A single chat message
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// -------------------------------
// Base response from the LLM
// -------------------------------
export interface BaseResponse {
  intent: string;                       // e.g. "transfer_money", "add_contact", "unsupported"
  assistant_message?: string | null;    // Assistant text response (optional)
}

// -------------------------------
// Generic response for any action
// -------------------------------
export interface ActionResponse extends BaseResponse {
  missing_parameters?: string[];        // If the LLM says we need more info
}

// ============================================================
// TRANSFER MONEY RESPONSES
// ============================================================

export interface TransferMoneyResponse extends ActionResponse {
  amount?: number | null;
  currency?: string | null;
  recipient?: string | null;            // Name or alias the user typed
  recipient_iban?: string | null;       // Direct IBAN (if provided)
  note?: string | null;                 // Optional user note
  // ❌ Removed date (because scheduled transfers are not supported)
}

// ============================================================
// ADD CONTACT RESPONSES
// ============================================================

export interface AddContactResponse extends ActionResponse {
  first_name?: string | null;
  last_name?: string | null;
  account_id?: string | null;
  iban?: string | null;
  alias?: string | null;
}

// ============================================================
// CARD ACTION RESPONSES
// (freeze, unfreeze, replace, etc.)
// ============================================================

export interface CardActionResponse extends ActionResponse {
  card_type?: string | null;            // "credit", "debit", "visa", etc.
}

// ============================================================
// SAVINGS GOAL RESPONSES
// ============================================================

export interface SavingsGoalResponse extends ActionResponse {
  goal_name?: string | null;
  target_amount?: number | null;
  currency?: string | null;
  due_date?: string | null;
}

// ============================================================
// UNION OF ALL POSSIBLE RESPONSE TYPES
// ============================================================

export type AssistantResponse =
  | BaseResponse
  | ActionResponse
  | TransferMoneyResponse
  | AddContactResponse
  | CardActionResponse
  | SavingsGoalResponse;
