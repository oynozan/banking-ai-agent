// ============================================================
// OPTIMIZED BANKING ASSISTANT - COMPACT PROMPT + ALGORITHM
// ============================================================

// Schema definitions (stored locally, not in prompt)
interface IntentSchema {
  required: string[];
  optional: string[];
  examples: string[];
}

const INTENT_SCHEMAS: Record<string, IntentSchema> = {
  transfer_money: {
    required: ["amount", "currency", "recipient_or_iban"],
    optional: ["note", "date"],
    examples: ["send 20 EUR to Anna", "transfer 50 euros IBAN DE89..."],
  },
  add_contact: {
    required: ["first_name", "last_name", "iban", "account_id"],
    optional: ["alias"],
    examples: ["add contact John Smith IBAN DE89..."],
  },
  check_balance: {
    required: [],
    optional: [],
    examples: ["what's my balance", "show account balance"],
  },
  show_transactions: {
    required: ["time_range"],
    optional: ["category"],
    examples: ["show last month transactions", "transactions this week"],
  },
  filter_transactions_category: {
    required: ["category"],
    optional: [],
    examples: ["show food expenses", "filter by groceries"],
  },
  filter_transactions_timerange: {
    required: ["time_range"],
    optional: [],
    examples: ["show last 30 days", "filter by this month"],
  },
  freeze_card: {
    required: ["card_type"],
    optional: [],
    examples: ["freeze my debit card", "lock credit card"],
  },
  unfreeze_card: {
    required: ["card_type"],
    optional: [],
    examples: ["unfreeze my card", "unlock debit card"],
  },
  change_card_limit: {
    required: ["amount", "currency"],
    optional: [],
    examples: ["set card limit to 500 EUR", "change limit 1000 euros"],
  },
  show_card_pin: {
    required: [],
    optional: [],
    examples: ["show my PIN", "what's my card PIN"],
  },
  report_card_lost: {
    required: [],
    optional: [],
    examples: ["my card is lost", "report lost card"],
  },
  replace_card: {
    required: [],
    optional: [],
    examples: ["order new card", "replace my card"],
  },
  create_savings_goal: {
    required: ["goal_name", "target_amount", "currency"],
    optional: ["due_date"],
    examples: ["create goal vacation 2000 EUR", "save for car 15000 euros"],
  },
  add_to_savings: {
    required: ["goal_name", "amount", "currency"],
    optional: [],
    examples: ["add 100 EUR to vacation", "put 50 euros in car fund"],
  },
  show_savings_goals: {
    required: [],
    optional: [],
    examples: ["show my savings goals", "what are my goals"],
  },
  show_iban: {
    required: [],
    optional: [],
    examples: ["what's my IBAN", "show account number"],
  },
  cancel_scheduled_transfer: {
    required: ["reference_id"],
    optional: [],
    examples: ["cancel transfer #12345", "delete scheduled payment REF123"],
  },
};

// Compact system prompt (75% smaller)
export const OPTIMIZED_SYSTEM_PROMPT = `Banking assistant. Parse user input to JSON:
{intent, assistant_message, ...params, missing_parameters?}

INTENTS: transfer_money, add_contact, check_balance, show_transactions, filter_transactions_category, filter_transactions_timerange, freeze_card, unfreeze_card, change_card_limit, show_card_pin, report_card_lost, replace_card, create_savings_goal, add_to_savings, show_savings_goals, show_iban, cancel_scheduled_transfer, greeting, informational, unsupported

RULES:
1. NO scheduled/future transfers → informational + explain not supported
2. Alias recipients (mom/dad) → recipient:"alias", recipient_iban:null
3. NEVER assume currency → must be explicit or null + ask
4. Missing required params → null + add to missing_parameters[] + ask
5. Greeting only → intent:greeting + welcome msg
6. Banking Q&A → informational
7. Non-banking → unsupported

EXAMPLES:
"send 20 EUR to mom" → {intent:"transfer_money",amount:20,currency:"EUR",recipient:"mom",recipient_iban:null,missing_parameters:[]}
"send money to Anna" → {intent:"transfer_money",recipient:"Anna",amount:null,currency:null,missing_parameters:["amount","currency"],assistant_message:"How much...?"}
"pay John tomorrow" → {intent:"informational",assistant_message:"Scheduled transfers not supported. Make immediate transfer?"}
"hi" → {intent:"greeting",assistant_message:"Hi! 👋 How can I help?"}
"show balance" → {intent:"check_balance",assistant_message:null}

Output ONLY valid JSON.`;

// ============================================================
// EFFICIENT PARSING ALGORITHM
// ============================================================

interface ParsedIntent {
  intent: string;
  assistant_message: string | null;
  [key: string]: any;
  missing_parameters?: string[];
}

class EfficientBankingParser {
  private keywords = {
    // Transfer keywords
    transfer: ["send", "transfer", "pay", "wire", "remit"],
    scheduled: [
      "tomorrow",
      "next",
      "schedule",
      "later",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "future",
    ],

    // Account keywords
    balance: ["balance", "account"],
    transactions: ["transaction", "history", "payments", "purchases"],
    iban: ["iban", "account number"],

    // Card keywords
    card: {
      freeze: ["freeze", "lock", "block", "disable"],
      unfreeze: ["unfreeze", "unlock", "unblock", "enable"],
      limit: ["limit", "maximum"],
      pin: ["pin", "code"],
      lost: ["lost", "stolen"],
      replace: ["replace", "new card", "order card"],
    },

    // Savings keywords
    savings: ["save", "saving", "goal"],

    // Contact keywords
    contact: ["add contact", "new contact", "save contact"],

    // Greetings
    greeting: [
      "hi",
      "hello",
      "hey",
      "good morning",
      "good afternoon",
      "good evening",
    ],
    thanks: ["thanks", "thank you", "ok", "okay"],
  };

  private aliases = [
    "mom",
    "dad",
    "mother",
    "father",
    "son",
    "daughter",
    "brother",
    "sister",
    "wife",
    "husband",
  ];

  parse(userInput: string): ParsedIntent {
    const input = userInput.toLowerCase().trim();

    // 1. Check for scheduled transfers (reject early)
    if (this.isScheduledTransfer(input)) {
      return {
        intent: "informational",
        assistant_message:
          "Scheduled or future-dated transfers are not supported in this app. I can help you make an immediate transfer instead.",
      };
    }

    // 2. Check for greeting only
    if (this.isGreetingOnly(input)) {
      return {
        intent: "greeting",
        assistant_message:
          "Hi! 👋 I'm your Commerzbank assistant. I can help you with checking balances, sending money, managing cards or savings goals. What would you like to do?",
      };
    }

    // 3. Intent classification (fast keyword matching)
    const intent = this.classifyIntent(input);

    // 4. Extract parameters based on intent
    const params = this.extractParameters(input, intent);

    // 5. Validate and build response
    return this.buildResponse(intent, params, input);
  }

  private isScheduledTransfer(input: string): boolean {
    const hasTransferKeyword = this.keywords.transfer.some((kw) =>
      input.includes(kw)
    );
    const hasScheduleKeyword = this.keywords.scheduled.some((kw) =>
      input.includes(kw)
    );
    return hasTransferKeyword && hasScheduleKeyword;
  }

  private isGreetingOnly(input: string): boolean {
    const isGreeting = this.keywords.greeting.some(
      (kw) => input === kw || input.startsWith(kw + " ")
    );
    const isThanks = this.keywords.thanks.some((kw) => input === kw);
    return (isGreeting || isThanks) && input.split(" ").length <= 3;
  }

  private classifyIntent(input: string): string {
    // Fast keyword-based classification
    if (this.keywords.transfer.some((kw) => input.includes(kw)))
      return "transfer_money";
    if (input.includes("cancel") && input.includes("transfer"))
      return "cancel_scheduled_transfer";
    if (this.keywords.balance.some((kw) => input.includes(kw)))
      return "check_balance";
    if (this.keywords.transactions.some((kw) => input.includes(kw)))
      return "show_transactions";
    if (this.keywords.iban.some((kw) => input.includes(kw))) return "show_iban";

    // Card operations
    if (this.keywords.card.freeze.some((kw) => input.includes(kw)))
      return "freeze_card";
    if (this.keywords.card.unfreeze.some((kw) => input.includes(kw)))
      return "unfreeze_card";
    if (this.keywords.card.limit.some((kw) => input.includes(kw)))
      return "change_card_limit";
    if (this.keywords.card.pin.some((kw) => input.includes(kw)))
      return "show_card_pin";
    if (this.keywords.card.lost.some((kw) => input.includes(kw)))
      return "report_card_lost";
    if (this.keywords.card.replace.some((kw) => input.includes(kw)))
      return "replace_card";

    // Savings
    if (
      input.includes("create") &&
      this.keywords.savings.some((kw) => input.includes(kw))
    )
      return "create_savings_goal";
    if (
      input.includes("add to") &&
      this.keywords.savings.some((kw) => input.includes(kw))
    )
      return "add_to_savings";
    if (
      input.includes("show") &&
      this.keywords.savings.some((kw) => input.includes(kw))
    )
      return "show_savings_goals";

    // Contact
    if (this.keywords.contact.some((kw) => input.includes(kw)))
      return "add_contact";

    // Default to informational for banking questions
    return "informational";
  }

  private extractParameters(
    input: string,
    intent: string
  ): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract amount (numbers)
    const amountMatch = input.match(/(\d+(?:\.\d+)?)/);
    if (amountMatch) params.amount = parseFloat(amountMatch[1]);

    // Extract currency
    const currencyMatch = input.match(
      /\b(EUR|USD|GBP|CHF|euro|euros|dollar|dollars|pound|pounds)\b/i
    );
    if (currencyMatch) {
      const curr = currencyMatch[1].toLowerCase();
      params.currency =
        curr.includes("eur") || curr.includes("euro")
          ? "EUR"
          : curr.includes("usd") || curr.includes("dollar")
          ? "USD"
          : curr.includes("gbp") || curr.includes("pound")
          ? "GBP"
          : "CHF";
    }

    // Extract recipient (for transfers)
    if (intent === "transfer_money") {
      const toMatch = input.match(/(?:to|for)\s+([a-zA-Z]+)/i);
      if (toMatch) {
        const recipient = toMatch[1];
        params.recipient = recipient;
        params.recipient_iban = this.aliases.includes(recipient.toLowerCase())
          ? null
          : undefined;
      }

      // Extract IBAN
      const ibanMatch = input.match(/\b([A-Z]{2}\d{2}[A-Z0-9]+)\b/);
      if (ibanMatch) {
        params.recipient_iban = ibanMatch[1];
        params.recipient = null;
      }
    }

    // Extract card type
    if (intent.includes("card") && intent !== "show_card_pin") {
      const cardMatch = input.match(/\b(debit|credit|master|visa)\b/i);
      if (cardMatch) params.card_type = cardMatch[1];
    }

    // Extract time range
    if (intent.includes("transaction")) {
      const timeMatch = input.match(
        /\b(today|yesterday|this week|last week|this month|last month|last \d+ days)\b/i
      );
      if (timeMatch) params.time_range = timeMatch[1];
    }

    // Extract category
    const categoryMatch = input.match(
      /\b(food|groceries|transport|shopping|entertainment|utilities)\b/i
    );
    if (categoryMatch) params.category = categoryMatch[1];

    return params;
  }

  private buildResponse(
    intent: string,
    params: Record<string, any>,
    originalInput: string
  ): ParsedIntent {
    const schema = INTENT_SCHEMAS[intent];
    if (!schema) {
      return {
        intent: "informational",
        assistant_message:
          "I can help with banking tasks. What would you like to do?",
      };
    }

    const response: ParsedIntent = {
      intent,
      assistant_message: null,
    };

    // Check for missing required parameters
    const missing: string[] = [];
    for (const field of schema.required) {
      if (field === "recipient_or_iban") {
        if (!params.recipient && !params.recipient_iban) {
          missing.push("recipient");
          response.recipient = null;
          response.recipient_iban = null;
        } else {
          response.recipient = params.recipient || null;
          response.recipient_iban = params.recipient_iban || null;
        }
      } else {
        if (params[field] === undefined) {
          missing.push(field);
          response[field] = null;
        } else {
          response[field] = params[field];
        }
      }
    }

    // Add optional parameters that were found
    for (const field of schema.optional) {
      if (params[field] !== undefined) {
        response[field] = params[field];
      }
    }

    // Set missing parameters and assistant message
    if (missing.length > 0) {
      response.missing_parameters = missing;
      response.assistant_message = this.generateFollowUpQuestion(
        missing,
        intent
      );
    }

    return response;
  }

  private generateFollowUpQuestion(missing: string[], intent: string): string {
    const field = missing[0];
    const questions: Record<string, string> = {
      amount: "How much would you like to transfer?",
      currency: "What currency? (EUR, USD, etc.)",
      recipient: "Who should I send this to?",
      card_type: "Which card? (debit or credit)",
      time_range: "What time period? (this week, last month, etc.)",
      category: "Which category?",
      goal_name: "What should we call this savings goal?",
      target_amount: "How much do you want to save?",
      first_name: "What's the contact's first name?",
      last_name: "What's the contact's last name?",
      iban: "What's the IBAN?",
      reference_id: "What's the reference ID for the transfer?",
    };
    return questions[field] || `I need the ${field}. Can you provide it?`;
  }
}

// ============================================================
// USAGE EXAMPLE
// ============================================================

const parser = new EfficientBankingParser();

// Test cases
const testInputs = [
  "send 20 EUR to mom",
  "send money to Anna",
  "pay John tomorrow",
  "hi",
  "show my balance",
  "freeze my debit card",
  "what is a savings goal?",
];

console.log("EFFICIENT PARSING RESULTS:");
console.log("=".repeat(60));

testInputs.forEach((input) => {
  const result = parser.parse(input);
  console.log(`\nInput: "${input}"`);
  console.log("Output:", JSON.stringify(result, null, 2));
});

// Export for use in your app
// export { EfficientBankingParser, OPTIMIZED_SYSTEM_PROMPT };
