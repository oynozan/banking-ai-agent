import Groq from "groq-sdk";
import * as readline from "readline";
import * as dotenv from "dotenv";
import { ContactManager } from "./contacts";
import { TransactionTracker } from "./transaction-tracker";
import { SYSTEM_PROMPT } from "./prompt";
import {
  Message,
  AssistantResponse,
  AddContactResponse,
  TransferMoneyResponse,
} from "./types";

// Load .env for GROQ_API_KEY
dotenv.config();

// ============================================================
// Groq client setup
// ============================================================

function getGroqClient(): Groq {
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

async function chatStep(
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

// ============================================================
// Backend Logic: Handle transactions with contact lookup
// ============================================================

async function handleTransferMoney(
  result: TransferMoneyResponse,
  contactManager: ContactManager,
  transactionTracker: TransactionTracker,
  client: Groq,
  history: Message[]
): Promise<AssistantResponse | null> {
  const { amount, currency, recipient, recipient_iban } = result;

  // If recipient_iban is provided, use it directly
  if (recipient_iban) {
    console.log(
      `✅ Processing transfer: ${amount} ${currency} to IBAN ${recipient_iban}`
    );

    // Track this transaction
    const count = transactionTracker.recordTransaction(recipient_iban);

    // Check if we should suggest adding to contacts
    if (count === 10) {
      const suggestResult = await chatStep(
        client,
        history,
        `The user has made 10 transactions with ${
          recipient || recipient_iban
        }. Ask them if they would like to add this person to their contacts, and if they want to set a custom alias.`
      );
      return suggestResult;
    }
    return null;
  }

  // Try to find contact by alias
  if (recipient) {
    const contact = contactManager.findByAlias(recipient);

    if (contact) {
      console.log(
        `✅ Found contact: ${contact.firstName} ${contact.lastName} (${contact.alias})`
      );
      console.log(
        `✅ Processing transfer: ${amount} ${currency} to ${contact.iban}`
      );

      // Track this transaction
      const count = transactionTracker.recordTransaction(contact.iban);

      // Check if we should suggest adding to contacts (shouldn't happen for existing contacts, but just in case)
      if (count === 10) {
        const suggestResult = await chatStep(
          client,
          history,
          `The user has made 10 transactions with ${contact.firstName} ${contact.lastName}. This is notable.`
        );
        return suggestResult;
      }
      return null;
    }

    // No exact match found, try fuzzy matching
    const allContacts = contactManager.getAllContacts();
    if (allContacts.length > 0) {
      // Ask AI to match the alias
      const contactList = allContacts
        .map((c) => `- ${c.alias} (${c.firstName} ${c.lastName})`)
        .join("\n");

      const matchPrompt = `The user said "${recipient}" but no exact alias match was found. Here are the saved contacts:\n${contactList}\n\nDoes "${recipient}" match any of these aliases semantically (e.g., "mama" matches "mother", "dad" matches "father")? If yes, respond with confirm_alias_match intent and include the matched contact's name in assistant_message to confirm with the user. If no match, ask the user to provide the recipient's IBAN or add them to contacts first.`;

      const matchResult = await chatStep(client, history, matchPrompt);
      return matchResult;
    }

    // No contacts at all - ask for IBAN
    const noContactResult = await chatStep(
      client,
      history,
      `The recipient "${recipient}" was not found in the contacts list, and there are no saved contacts. Ask the user to provide the recipient's IBAN number to complete the transfer, or offer to add this person to their contacts.`
    );
    return noContactResult;
  }

  return null;
}

// ============================================================
// CLI conversational loop
// ============================================================

async function main(): Promise<void> {
  const client = getGroqClient();
  const contactManager = new ContactManager();
  const transactionTracker = new TransactionTracker();

  const history: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  console.log("✅ Banking Assistant with Contact Management is ready.");
  console.log("Type your banking requests/questions.");
  console.log("Type 'done', 'exit' or 'quit' to end the conversation.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  let running = true;

  while (running) {
    try {
      const userMessage = (await askQuestion("You: ")).trim();

      if (["done", "exit", "quit"].includes(userMessage.toLowerCase())) {
        console.log("Assistant: Thank you! Conversation finished.");
        running = false;
        break;
      }

      if (!userMessage) continue;

      const result = await chatStep(client, history, userMessage);

      console.log("\n📋 JSON response:");
      console.log(JSON.stringify(result, null, 2));

      // Handle specific intents
      let followUpResult: AssistantResponse | null = null;

      if (
        result.intent === "transfer_money" ||
        result.intent === "schedule_transfer"
      ) {
        followUpResult = await handleTransferMoney(
          result as TransferMoneyResponse,
          contactManager,
          transactionTracker,
          client,
          history
        );
      } else if (result.intent === "add_contact") {
        const contact = result as AddContactResponse;
        if (
          contact.first_name &&
          contact.last_name &&
          contact.account_id &&
          contact.iban
        ) {
          const alias = contact.alias || contact.first_name;
          contactManager.addContact({
            firstName: contact.first_name,
            lastName: contact.last_name,
            accountId: contact.account_id,
            iban: contact.iban,
            alias: alias,
          });
          console.log(
            `✅ Contact added: ${contact.first_name} ${contact.last_name} (alias: ${alias})`
          );
        }
      }

      // Show the primary assistant message
      const assistantMessage = result.assistant_message;
      if (assistantMessage) {
        console.log(`\n💬 Assistant: ${assistantMessage}`);
      }

      // Show follow-up message if there was one from transaction handling
      if (followUpResult && followUpResult.assistant_message) {
        console.log(`\n💬 Assistant: ${followUpResult.assistant_message}`);
      }

      console.log("\n" + "-".repeat(60) + "\n");
    } catch (error) {
      console.error("Error:", error);
    }
  }

  rl.close();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
