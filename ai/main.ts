// ai/main.ts
import type Groq from "groq-sdk";
import * as readline from "readline";
import { ContactManager } from "./contacts";
import { TransactionTracker } from "./transaction-tracker";
import { OPTIMIZED_SYSTEM_PROMPT } from "./prompt";
import {
  Message,
  AssistantResponse,
  AddContactResponse,
  TransferMoneyResponse,
} from "./types";
import { getGroqClient, chatStep } from "./llm";
import { speak } from "./tts"; // 🔊 TTS

// ============================================================
// Transfer handler
// ============================================================

async function handleTransferMoney(
  result: TransferMoneyResponse,
  contactManager: ContactManager,
  transactionTracker: TransactionTracker,
  client: Groq,
  history: Message[]
): Promise<AssistantResponse | null> {
  const { amount, currency, recipient, recipient_iban } = result;

  // 1. Direct IBAN transfers
  if (recipient_iban) {
    console.log(
      `✅ Processing transfer: ${amount} ${currency} to IBAN ${recipient_iban}`
    );

    const count = transactionTracker.recordTransaction(recipient_iban);

    if (count === 10) {
      return await chatStep(
        client,
        history,
        `The user has made 10 transactions with ${
          recipient || recipient_iban
        }. Ask them if they want to add this person as a contact and choose an alias.`
      );
    }
    return null;
  }

  // 2. Transfers using an alias
  if (recipient) {
    const contact = contactManager.findByAlias(recipient);

    if (contact) {
      console.log(
        `✅ Found contact: ${contact.firstName} ${contact.lastName} (${contact.alias})`
      );
      console.log(
        `✅ Processing transfer: ${amount} ${currency} to ${contact.iban}`
      );

      const count = transactionTracker.recordTransaction(contact.iban);

      if (count === 10) {
        return await chatStep(
          client,
          history,
          `The user has made 10 transactions with ${contact.firstName} ${contact.lastName}. Ask if they want to set a custom alias.`
        );
      }

      return null;
    }

    // 3. No exact match → try fuzzy alias match
    const allContacts = contactManager.getAllContacts();

    if (allContacts.length > 0) {
      const list = allContacts
        .map((c) => `- ${c.alias} (${c.firstName} ${c.lastName})`)
        .join("\n");

      return await chatStep(
        client,
        history,
        `The user said "${recipient}" but no alias matches. Contacts:\n${list}\n\nDoes "${recipient}" semantically match any alias? If yes, respond with confirm_alias_match intent. If no, ask the user to provide the recipient's IBAN or add them to contacts first.`
      );
    }

    // 4. No contacts at all
    return await chatStep(
      client,
      history,
      `The recipient "${recipient}" is not in contacts and there are no saved contacts. Ask the user for an IBAN or if they want to add a new contact.`
    );
  }

  return null;
}

// ============================================================
// CLI loop
// ============================================================

async function main(): Promise<void> {
  const client = getGroqClient();
  const contactManager = new ContactManager();
  const transactionTracker = new TransactionTracker();

  const history: Message[] = [
    { role: "system", content: OPTIMIZED_SYSTEM_PROMPT },
  ];

  console.log("✅ Banking Assistant with Contact Management is ready.");
  console.log("Type your banking requests/questions.");
  console.log("Type 'done', 'exit' or 'quit' to end the conversation.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

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

      if (result.intent === "transfer_money") {
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
            alias,
          });
          console.log(
            `✅ Contact added: ${contact.first_name} ${contact.last_name} (alias: ${alias})`
          );
        }
      }

      // Show the primary assistant message
      if (result.assistant_message) {
        console.log(`\n💬 Assistant: ${result.assistant_message}`);
        void speak(result.assistant_message); // 🔊 TTS for main reply
      }

      // Show follow-up message if there was one from transaction handling
      if (followUpResult && followUpResult.assistant_message) {
        console.log(`\n💬 Assistant: ${followUpResult.assistant_message}`);
        void speak(followUpResult.assistant_message); // 🔊 TTS for follow-up
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
