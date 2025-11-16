import { MCP } from "../lib/mcp";
import { SocketListener } from "../socket";
import AI, { type ChatMessage } from "../lib/ai";
import ContactLib from "../lib/modules/contacts";

export class AgentListener extends SocketListener {
    private ai: AI;
    private history: ChatMessage[];
    private isStreaming: boolean;
    private readonly maxHistory = 15;
    private mcp: MCP;
    private pendingActions: Map<string, any>;
    private currentActionMemory: { intent: string | null; params: Record<string, unknown> };
    private cachedContacts: Array<{ alias: string; name?: string; iban: string }> | null;

    constructor(io: any, socket: any) {
        super(io, socket);
        this.ai = new AI();
        this.history = [];
        this.isStreaming = false;
        this.mcp = new MCP();
        this.pendingActions = new Map();
        this.currentActionMemory = { intent: null, params: {} };
        this.cachedContacts = null;
    }

    listen() {
        // CONFIRM
        this.socket.on("chat:action:confirm", async ({ id }: { id: string }) => {
            try {
                const action = this.pendingActions.get(id);
                if (!action) return;
                await this.executeAction(id, action);
                
                // Clear contacts cache if a contact was added
                if (action.intent === "add_contact") {
                    this.cachedContacts = null;
                }
            } catch (error) {
                console.error("[executeAction] Error:", error);
                this.socket.emit("chat:error", { message: "An error occurred while processing your request." });
            } finally {
                this.pendingActions.delete(id);
                this.resetActionMemory();
            }
        });

        // DECLINE
        this.socket.on("chat:action:decline", ({ id }: { id: string }) => {
            this.pendingActions.delete(id);
            this.socket.emit("chat:action:cancelled", { id });
            this.resetActionMemory();
        });

        // DISCONNECT
        this.socket.on("disconnect", () => {
            this.history = [];
            this.isStreaming = false;
            this.pendingActions.clear();
            this.resetActionMemory();
            this.cachedContacts = null;
        });

        // MAIN MESSAGE HANDLER
        this.socket.on("chat:message", async (data: string) => {
            try {
                const userMessage = (data || "").trim();
                if (!userMessage) return;

                if (this.isStreaming) {
                    this.socket.emit("chat:error", { message: "Processing previous message..." });
                    return;
                }

                // Check if user is confirming a pending action
                const confirmationWords = ["yes", "yep", "yeah", "y", "confirm", "ok", "okay", "sure", "do it", "go ahead", "proceed"];
                const isConfirmation = confirmationWords.some(word => {
                    const msgLower = userMessage.toLowerCase().trim();
                    return msgLower === word || 
                           msgLower === word + "." ||
                           msgLower.startsWith(word + " ");
                });

                // If it's a confirmation word but no pending action, just respond casually
                if (isConfirmation && this.pendingActions.size === 0) {
                    console.log("[chat:message] Confirmation word detected but no pending action - responding casually");
                    this.isStreaming = true;
                    this.pushUserMessage(userMessage);
                    await this.streamAssistant();
                    this.isStreaming = false;
                    return;
                }

                if (isConfirmation && this.pendingActions.size > 0) {
                    // Auto-confirm the most recent pending action
                    const actionIds = Array.from(this.pendingActions.keys());
                    const latestActionId = actionIds[actionIds.length - 1];
                    const action = this.pendingActions.get(latestActionId);
                    
                    if (action) {
                        console.log("[chat:message] ✅ Auto-confirming action:", latestActionId, "Action:", action.intent);
                        this.isStreaming = true;
                        this.pushUserMessage(userMessage);
                        
                        try {
                            // Trigger confirmation handler
                            await this.executeAction(latestActionId, action);
                            
                            // Clear contacts cache if a contact was added
                            if (action.intent === "add_contact") {
                                this.cachedContacts = null;
                            }
                        } catch (error) {
                            console.error("[chat:message] Error auto-confirming:", error);
                            this.socket.emit("chat:error", { message: "An error occurred while processing your confirmation." });
                        } finally {
                            this.pendingActions.delete(latestActionId);
                            this.resetActionMemory();
                            this.isStreaming = false;
                        }
                        return;
                    } else {
                        console.log("[chat:message] ⚠️ Confirmation detected but no action found for ID:", latestActionId);
                    }
                }

                this.isStreaming = true;

                this.pushUserMessage(userMessage);

                const userId = this.socket.user?.id as string | undefined;
                const contacts = await this.getContacts(userId);

                // if action already started → skip router
                let intent = this.currentActionMemory.intent;

                if (!intent) {
                    const route = await this.ai.route(
                        this.history,
                        this.currentActionMemory.params,
                        contacts
                    );

                    console.log("[ROUTER]:", route);

                    // If router says casual and we have pending actions, it might be a confirmation
                    if (route.mode === "casual" && this.pendingActions.size > 0) {
                        const confirmationWords = ["yes", "yep", "yeah", "y", "confirm", "ok", "okay", "sure", "do it", "go ahead", "proceed"];
                        const isConfirmation = confirmationWords.some(word => 
                            userMessage.toLowerCase().trim() === word || 
                            userMessage.toLowerCase().trim().startsWith(word + " ") ||
                            userMessage.toLowerCase().trim() === word + "."
                        );
                        
                        if (isConfirmation) {
                            // Auto-confirm the pending action
                            const actionIds = Array.from(this.pendingActions.keys());
                            const latestActionId = actionIds[actionIds.length - 1];
                            const action = this.pendingActions.get(latestActionId);
                            
                            if (action) {
                                console.log("[ROUTER] Detected confirmation, auto-confirming:", latestActionId);
                                await this.executeAction(latestActionId, action);
                                
                                if (action.intent === "add_contact") {
                                    this.cachedContacts = null;
                                }
                                
                                this.pendingActions.delete(latestActionId);
                                this.resetActionMemory();
                                return;
                            }
                        }
                    }

                    // CRITICAL: If router routes "yes" as transfer_money, treat it as confirmation instead
                    if (route.mode === "action" && route.intent === "transfer_money" && this.pendingActions.size > 0) {
                        const confirmationWords = ["yes", "yep", "yeah", "y", "confirm", "ok", "okay", "sure", "do it", "go ahead", "proceed"];
                        const isConfirmation = confirmationWords.some(word => {
                            const msgLower = userMessage.toLowerCase().trim();
                            return msgLower === word || msgLower === word + "." || msgLower.startsWith(word + " ");
                        });
                        
                        if (isConfirmation) {
                            console.log("[ROUTER] ⚠️ Router incorrectly routed confirmation as transfer_money, fixing...");
                            const actionIds = Array.from(this.pendingActions.keys());
                            const latestActionId = actionIds[actionIds.length - 1];
                            const action = this.pendingActions.get(latestActionId);
                            
                            if (action) {
                                console.log("[ROUTER] Auto-confirming instead:", latestActionId);
                                await this.executeAction(latestActionId, action);
                                
                                if (action.intent === "add_contact") {
                                    this.cachedContacts = null;
                                }
                                
                                this.pendingActions.delete(latestActionId);
                                this.resetActionMemory();
                                return;
                            }
                        }
                    }

                    if (route.mode === "action" && route.intent) {
                        this.resetActionMemory();
                        this.currentActionMemory.intent = route.intent;
                        intent = route.intent;
                    } else {
                        await this.streamAssistant();
                        return;
                    }
                }

                await this.handleActionFlow(intent, contacts);
            } catch (e) {
                console.error(e);
            } finally {
                this.isStreaming = false;
            }
        });
    }

    // ============================================================
    // ACTION FLOW HANDLING
    // ============================================================

    private async handleActionFlow(intent: string, contacts: any[]) {
        const prevParams =
            this.currentActionMemory.intent === intent
                ? this.currentActionMemory.params
                : {};

        // For transfer_money: Check if user mentioned a contact alias and resolve it
        if (intent === "transfer_money" && contacts.length > 0) {
            const lastUserMessage = this.history
                .filter((msg) => msg.role === "user")
                .slice(-1)[0]?.content || "";

            console.log("[handleActionFlow] Checking contacts for message:", lastUserMessage);
            console.log("[handleActionFlow] Available contacts:", contacts.map(c => ({ 
                alias: c.alias, 
                name: c.name, 
                iban: typeof c.iban === 'string' ? c.iban.substring(0, 10) + "..." : c.iban 
            })));

            const matchedContact = this.matchContactAlias(lastUserMessage, contacts);
            if (matchedContact) {
                console.log("[handleActionFlow] ✅ Matched contact:", matchedContact);
                // Pre-populate recipient info from contact
                prevParams.recipient_type = "iban";
                prevParams.recipient_value = matchedContact.iban;
                prevParams.recipient_name = matchedContact.alias;
                prevParams.transfer_type = "external";
                console.log("[handleActionFlow] Pre-populated prevParams:", { 
                    recipient_type: prevParams.recipient_type,
                    recipient_value: typeof prevParams.recipient_value === 'string' 
                        ? prevParams.recipient_value.substring(0, 10) + "..." 
                        : prevParams.recipient_value,
                    recipient_name: prevParams.recipient_name,
                    transfer_type: prevParams.transfer_type
                });
            } else {
                console.log("[handleActionFlow] ❌ No contact matched for message:", lastUserMessage);
                // Debug: Try to see why it didn't match
                const messageLower = lastUserMessage.toLowerCase();
                for (const contact of contacts) {
                    const aliasLower = contact.alias.toLowerCase();
                    if (messageLower.includes(aliasLower)) {
                        console.log(`[handleActionFlow] Debug: Message contains "${contact.alias}" but didn't match any pattern`);
                    }
                }
            }
        }

        const content = await this.ai.completeAction(
            intent,
            this.history,
            prevParams,
            contacts
        );

        let parsed: any = null;
        try {
            parsed = JSON.parse(content);
        } catch (err) {
            console.error("JSON parse error", err);
            await this.streamAssistant();
            return;
        }

        const missing = parsed.missing_parameters || [];

        // For transfer_money: Check for confusing questions about contacts BEFORE processing
        // This catches cases where AI asks about contacts even when we have them
        if (intent === "transfer_money" && parsed.assistant_message) {
            const msgLower = parsed.assistant_message.toLowerCase();
            const confusingPatterns = [
                /to whom.*account.*with/i,
                /whose account/i,
                /who.*account.*belong/i,
                /account.*with.*whom/i,
                /account.*with.*commerzbank/i,
                /commerzbank.*account/i,
            ];
            
            const isConfusingQuestion = confusingPatterns.some(pattern => 
                pattern.test(parsed.assistant_message)
            );
            
            if (isConfusingQuestion) {
                console.log("[handleActionFlow] ⚠️ Detected confusing question:", parsed.assistant_message);
                
                // Try to extract contact name from the question (e.g., "dad" from "To whom is dad's account with?")
                let extractedContact: { alias: string; name?: string; iban: string } | null = null;
                
                // Extract name from various patterns:
                // - "dad's account" -> "dad"
                // - "mom's account" -> "mom"
                // - "To whom is dad's account with Commerzbank?" -> "dad"
                const namePatterns = [
                    /(\w+)'s\s+account/i,           // "dad's account"
                    /(\w+)'s\s+account.*with/i,     // "dad's account with"
                    /is\s+(\w+)'s\s+account/i,      // "is dad's account"
                    /(\w+)\s+account.*with/i,        // "dad account with" (without apostrophe)
                ];
                
                let extractedName: string | null = null;
                for (const pattern of namePatterns) {
                    const match = parsed.assistant_message.match(pattern);
                    if (match && match[1]) {
                        extractedName = match[1].toLowerCase();
                        console.log("[handleActionFlow] Extracted name from question using pattern:", pattern, "->", extractedName);
                        break;
                    }
                }
                
                if (extractedName && contacts.length > 0) {
                    // Try to find this contact in the contacts array
                    extractedContact = contacts.find(c => 
                        c.alias.toLowerCase() === extractedName ||
                        c.alias.toLowerCase().includes(extractedName) ||
                        c.name?.toLowerCase() === extractedName ||
                        c.name?.toLowerCase().includes(extractedName || "")
                    ) || null;
                    
                    if (extractedContact) {
                        console.log("[handleActionFlow] ✅ Found contact in array:", extractedContact.alias);
                    } else {
                        console.log("[handleActionFlow] ❌ Contact not found in array for:", extractedName);
                    }
                }
                
                // Use prevParams contact if available, otherwise use extracted contact
                const matchedContact = prevParams.recipient_value ? {
                    iban: prevParams.recipient_value as string,
                    alias: (prevParams.recipient_name as string) || "this contact",
                    name: prevParams.recipient_name as string
                } : extractedContact;
                
                if (matchedContact) {
                    console.log("[handleActionFlow] Overriding confusing question with contact:", matchedContact.alias);
                    const contactName = matchedContact.alias;
                    
                    // Set the contact info
                    parsed.recipient_value = matchedContact.iban;
                    parsed.recipient_type = "iban";
                    parsed.recipient_name = contactName;
                    parsed.transfer_type = "external";
                    
                    // Remove recipient_value from missing if it was there
                    if (missing.includes("recipient_value")) {
                        parsed.missing_parameters = missing.filter((p: string) => p !== "recipient_value");
                    }
                    
                    // Generate appropriate message based on what's missing
                    const updatedMissing = parsed.missing_parameters || [];
                    if (updatedMissing.includes("amount") || updatedMissing.includes("currency")) {
                        parsed.assistant_message = `How much should I send to ${contactName}?`;
                    } else if (updatedMissing.includes("from_account")) {
                        parsed.assistant_message = `From which account should I send money to ${contactName}?`;
                    } else {
                        parsed.assistant_message = `Send money to ${contactName}?`;
                    }
                    console.log("[handleActionFlow] ✅ Overrode confusing question with:", parsed.assistant_message);
                } else {
                    console.log("[handleActionFlow] ❌ Could not find contact to override question");
                }
            }
        }

        // For transfer_money: If we matched a contact earlier, ensure it's preserved in the response
        if (intent === "transfer_money" && prevParams.recipient_value) {
            console.log("[handleActionFlow] Preserving matched contact info:", prevParams);
            
            // Preserve contact info if it was pre-populated
            parsed.recipient_type = parsed.recipient_type || prevParams.recipient_type;
            parsed.recipient_value = parsed.recipient_value || prevParams.recipient_value;
            parsed.recipient_name = parsed.recipient_name || prevParams.recipient_name;
            parsed.transfer_type = parsed.transfer_type || prevParams.transfer_type;
            
            // If AI didn't include recipient_value but we have it, remove it from missing_parameters
            if (parsed.recipient_value && missing.includes("recipient_value")) {
                parsed.missing_parameters = missing.filter((p: string) => p !== "recipient_value");
            }
            
            // Override assistant_message if AI is asking for IBAN but we already have it from contacts
            // Check both parsed.recipient_value (from AI) and prevParams.recipient_value (from our contact matching)
            const hasRecipientValue = parsed.recipient_value || prevParams.recipient_value;
            
            if (hasRecipientValue && parsed.assistant_message) {
                const msgLower = parsed.assistant_message.toLowerCase();
                
                // Detect confusing questions about contacts (e.g., "To whom is dad's account with Commerzbank?")
                const confusingPatterns = [
                    /to whom.*account.*with/i,
                    /whose account/i,
                    /who.*account.*belong/i,
                    /account.*with.*whom/i,
                    /account.*with.*commerzbank/i,
                    /commerzbank.*account/i,
                ];
                
                const isConfusingQuestion = confusingPatterns.some(pattern => 
                    pattern.test(parsed.assistant_message)
                );
                
                if (isConfusingQuestion || (msgLower.includes("don't have") && msgLower.includes("in your contacts") && msgLower.includes("iban"))) {
                    // AI is asking a confusing question or asking for IBAN but we have it - update the message
                    // Use recipient_name from parsed or prevParams
                    const contactName = parsed.recipient_name || prevParams.recipient_name || "this contact";
                    
                    // Ensure recipient_value is set from prevParams if AI didn't include it
                    if (!parsed.recipient_value && prevParams.recipient_value) {
                        parsed.recipient_value = prevParams.recipient_value;
                        parsed.recipient_type = parsed.recipient_type || prevParams.recipient_type;
                        parsed.recipient_name = parsed.recipient_name || prevParams.recipient_name;
                        parsed.transfer_type = parsed.transfer_type || prevParams.transfer_type;
                    }
                    
                    if (missing.includes("amount") || missing.includes("currency")) {
                        parsed.assistant_message = `How much should I send to ${contactName}?`;
                    } else if (missing.includes("from_account")) {
                        parsed.assistant_message = `From which account should I send money to ${contactName}?`;
                    } else {
                        parsed.assistant_message = `Send money to ${contactName}?`;
                    }
                    console.log("[handleActionFlow] Overrode confusing/questionable assistant_message:", parsed.assistant_message);
                }
            }
        }

        // merge params
        this.mergeActionMemory(intent, parsed);
        
        // Debug: Log what's being merged
        if (intent === "add_contact") {
            console.log("[handleActionFlow] After merge:", {
                intent,
                parsed_contact_alias: parsed.contact_alias,
                parsed_iban: parsed.iban,
                storedParams: this.currentActionMemory.params,
            });
        }

        // show FROM account selector
        if (parsed.intent === "transfer_money" && missing.includes("from_account")) {
            await this.sendAccountSelection("from_account");
            return;
        }

        // show TO account selector (internal)
        if (
            parsed.intent === "transfer_money" &&
            parsed.transfer_type === "internal" &&
            missing.includes("to_account")
        ) {
            await this.sendAccountSelection("to_account");
            return;
        }

        // ============================================================
        // FIXED: FOLLOW-UP MESSAGES NOW SHOW
        // ============================================================
        if (missing.length > 0) {
            const msg =
                parsed.assistant_message ||
                `Please provide: ${missing.join(", ")}`;

            console.log("EMIT → chat:assistant:", msg);

            // send to UI
            this.socket.emit("chat:assistant", { content: msg });

            // keep memory history consistent
            this.pushAssistantMessage(msg);
            return;
        }

        // CONFIRMATION
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        
        // Merge parsed response with stored parameters to ensure all collected params are included
        let actionWithParams = {
            ...this.currentActionMemory.params,
            ...parsed, // Latest parsed values take precedence
        };
        
        // Fallback: If contact fields are missing, try to extract from assistant_message
        if (intent === "add_contact" && (!actionWithParams.contact_alias || !actionWithParams.iban)) {
            const msg = parsed.assistant_message || "";
            // Try to extract IBAN (format: PL followed by digits)
            const ibanMatch = msg.match(/\b([A-Z]{2}\d{2}[\dA-Z\s]{4,30})\b/);
            if (ibanMatch && !actionWithParams.iban) {
                actionWithParams.iban = ibanMatch[1].replace(/\s/g, "");
                console.log("[handleActionFlow] Extracted IBAN from message:", actionWithParams.iban);
            }
            // Try to extract alias (word in quotes after "contact")
            const aliasMatch = msg.match(/contact\s+['"]([^'"]+)['"]/i);
            if (aliasMatch && !actionWithParams.contact_alias) {
                actionWithParams.contact_alias = aliasMatch[1];
                console.log("[handleActionFlow] Extracted alias from message:", actionWithParams.contact_alias);
            }
        }
        
        console.log("[handleActionFlow] Creating action:", {
            intent: actionWithParams.intent,
            transfer_type: actionWithParams.transfer_type,
            from_account: actionWithParams.from_account,
            recipient_value: typeof actionWithParams.recipient_value === 'string' 
                ? actionWithParams.recipient_value.substring(0, 10) + "..." 
                : actionWithParams.recipient_value,
            recipient_name: actionWithParams.recipient_name,
            amount: actionWithParams.amount,
            currency: actionWithParams.currency,
            missing_parameters: parsed.missing_parameters,
        });
        
        // Validate that all required fields are actually present (not just missing_parameters being empty)
        const isTransferComplete = intent === "transfer_money" 
            ? (actionWithParams.from_account && 
               actionWithParams.transfer_type &&
               (actionWithParams.transfer_type === "internal" ? actionWithParams.to_account : actionWithParams.recipient_value) &&
               actionWithParams.amount && 
               typeof actionWithParams.amount === 'number' && 
               actionWithParams.amount > 0 &&
               actionWithParams.currency)
            : missing.length === 0;

        // Only create pending action and emit confirmation request if all required fields are present
        if (isTransferComplete && missing.length === 0) {
            // All fields present - create pending action for confirmation
            console.log("[handleActionFlow] ✅ All fields present, creating pending action:", id);
            this.pendingActions.set(id, actionWithParams);
            
            this.socket.emit("chat:action:request", {
                id,
                data: actionWithParams,
            });

            if (parsed.assistant_message) {
                this.pushAssistantMessage(parsed.assistant_message);
            }
        } else {
            // Missing fields - don't create pending action, just ask for missing fields
            console.log("[handleActionFlow] ❌ Missing fields or incomplete, not creating pending action");
            console.log("[handleActionFlow] Missing parameters:", missing);
            console.log("[handleActionFlow] Validation check:", {
                isTransferComplete,
                from_account: !!actionWithParams.from_account,
                transfer_type: actionWithParams.transfer_type,
                recipient_value: !!actionWithParams.recipient_value,
                to_account: !!actionWithParams.to_account,
                amount: actionWithParams.amount,
                currency: actionWithParams.currency,
            });
            // The message asking for missing fields was already sent above
        }
    }

    // ============================================================
    // CORRECT ORDER: ASSISTANT FIRST → BUTTONS SECOND
    // ============================================================

    private async sendAccountSelection(field: "from_account" | "to_account") {
        console.log("[AI] sendAccountSelection →", field);

        const userId = this.socket.user?.id;
        if (!userId) return;

        const result = await this.mcp.execute(
            "show_accounts",
            { intent: "show_accounts" },
            {
                id: `list-${Date.now()}`,
                ai: this.ai,
                userId,
                history: this.history,
                maxHistory: this.maxHistory,
            }
        );

        if (!result) return;

        const assistantMessage =
            result.assistantMessage ||
            (field === "from_account"
                ? "Please select the account you want to transfer from:"
                : "Please select the account you want to transfer to:");

        this.pushAssistantMessage(assistantMessage);
        this.socket.emit("chat:stream:start", { ok: true });

        for (const token of assistantMessage.split(" ")) {
            this.socket.emit("chat:stream", { token: token + " " });
        }

        this.socket.emit("chat:stream:end", { ok: true });

        this.socket.emit(result.event, {
            ...result.payload,
            field,
        });
    }

    // ============================================================
    // HISTORY MGMT
    // ============================================================

    private pushUserMessage(content: string) {
        this.history.push({ role: "user", content });
        this.trimHistory();
    }

    private pushAssistantMessage(content: string) {
        if (!content.trim()) return;
        this.history.push({ role: "assistant", content });
        this.trimHistory();
    }

    private trimHistory() {
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
    }

    // ============================================================
    // STREAM CASUAL
    // ============================================================

    private async streamAssistant(history: ChatMessage[] = this.history) {
        this.socket.emit("chat:stream:start", { ok: true });

        let final = "";

        await this.ai.streamCasual(history, (token: string) => {
            final += token;
            this.socket.emit("chat:stream", { token });
        });

        this.socket.emit("chat:stream:end", { ok: true });
        this.pushAssistantMessage(final);
    }

    // ============================================================
    // EXECUTION
    // ============================================================

    private async executeAction(id: string, action: any) {
        try {
            const result = await this.mcp.execute(action.intent, action, {
                id,
                ai: this.ai,
                userId: this.socket.user?.id,
                history: this.history,
                maxHistory: this.maxHistory,
            });

            if (!result) {
                this.socket.emit("chat:action", { id, data: action });
                return;
            }

            this.socket.emit(result.event, result.payload);

            // Send assistant message via chat:assistant for better UI handling
            if (result.assistantMessage) {
                this.pushAssistantMessage(result.assistantMessage);
                this.socket.emit("chat:assistant", { content: result.assistantMessage });
            }
        } catch (error) {
            console.error("[executeAction] Error executing action:", error);
            this.socket.emit("chat:error", { 
                message: error instanceof Error ? error.message : "Failed to execute action" 
            });
            throw error;
        }
    }

    // ============================================================
    // CONTACTS CACHE
    // ============================================================

    private async getContacts(userId?: string) {
        if (!userId) return [];
        if (this.cachedContacts) return this.cachedContacts;
        const list = await ContactLib.listContacts(userId);
        this.cachedContacts = list;
        return list;
    }

    private resetActionMemory() {
        this.currentActionMemory = { intent: null, params: {} };
    }

    /**
     * Match a contact alias from user message against known contacts
     * Returns the matched contact or null
     */
    private matchContactAlias(
        userMessage: string,
        contacts: Array<{ alias: string; name?: string; iban: string }>
    ): { alias: string; name?: string; iban: string } | null {
        if (!userMessage || !contacts.length) return null;

        const messageLower = userMessage.toLowerCase();

        // Try to match against aliases first (most common)
        for (const contact of contacts) {
            const aliasLower = contact.alias.toLowerCase();
            
            // More flexible matching patterns:
            // - "to dad", "to my dad", "send dad", "send my dad"
            // - "transfer to dad", "pay dad", "pay my dad"
            // - "send 10 to my dad" (with amount in between)
            // - "dad" (standalone or at end)
            // - "my dad", "the dad" (with articles/possessives)
            const patterns = [
                `to ${aliasLower}`,           // "to dad"
                `to my ${aliasLower}`,         // "to my dad"
                `to the ${aliasLower}`,        // "to the dad"
                `send.*to ${aliasLower}`,      // "send 10 to dad" or "send 10 bucks to dad"
                `send.*to my ${aliasLower}`,   // "send 10 to my dad" or "send 10 bucks to my dad"
                `send ${aliasLower}`,          // "send dad"
                `send my ${aliasLower}`,       // "send my dad"
                `send the ${aliasLower}`,       // "send the dad"
                `transfer ${aliasLower}`,      // "transfer dad"
                `transfer to ${aliasLower}`,   // "transfer to dad"
                `transfer to my ${aliasLower}`, // "transfer to my dad"
                `transfer.*to ${aliasLower}`,  // "transfer 10 to dad"
                `transfer.*to my ${aliasLower}`, // "transfer 10 to my dad"
                `pay ${aliasLower}`,           // "pay dad"
                `pay my ${aliasLower}`,         // "pay my dad"
                `pay to ${aliasLower}`,        // "pay to dad"
                `pay to my ${aliasLower}`,      // "pay to my dad"
                `pay.*to ${aliasLower}`,        // "pay 10 to dad"
                `pay.*to my ${aliasLower}`,     // "pay 10 to my dad"
                `^${aliasLower}$`,             // exact match "dad"
                `^my ${aliasLower}$`,          // "my dad" (exact)
                ` ${aliasLower}$`,             // ends with " dad"
                ` my ${aliasLower}$`,          // ends with " my dad"
            ];

            // Check if any pattern matches
            for (const pattern of patterns) {
                const regex = new RegExp(pattern, "i");
                if (regex.test(messageLower)) {
                    console.log(`[matchContactAlias] Matched "${contact.alias}" with pattern "${pattern}"`);
                    return contact;
                }
            }

            // Also check if alias appears in message (more lenient fallback)
            // but only if it's clearly in a recipient context
            if (messageLower.includes(aliasLower)) {
                const recipientKeywords = ["to", "send", "transfer", "pay", "for"];
                const hasRecipientContext = recipientKeywords.some(keyword => 
                    messageLower.includes(`${keyword} ${aliasLower}`) ||
                    messageLower.includes(`${keyword} my ${aliasLower}`) ||
                    messageLower.includes(`${keyword} the ${aliasLower}`)
                );
                
                if (hasRecipientContext) {
                    console.log(`[matchContactAlias] Matched "${contact.alias}" via context check`);
                    return contact;
                }
            }
        }

        // Try to match against names if alias didn't match
        for (const contact of contacts) {
            if (contact.name) {
                const nameLower = contact.name.toLowerCase();
                const nameParts = nameLower.split(" ").filter(part => part.length > 2);
                
                // Check if any part of the name appears in the message
                for (const part of nameParts) {
                    const patterns = [
                        `to ${part}`,
                        `to my ${part}`,
                        `send ${part}`,
                        `send my ${part}`,
                        `transfer ${part}`,
                        `transfer to ${part}`,
                        `pay ${part}`,
                        `pay to ${part}`,
                    ];
                    
                    for (const pattern of patterns) {
                        const regex = new RegExp(pattern, "i");
                        if (regex.test(messageLower)) {
                            console.log(`[matchContactAlias] Matched name "${contact.name}" via part "${part}"`);
                            return contact;
                        }
                    }
                }
            }
        }

        return null;
    }

    private mergeActionMemory(intent: string, parsed: Record<string, unknown>) {
        if (this.currentActionMemory.intent && this.currentActionMemory.intent !== intent) {
            this.resetActionMemory();
        }

        this.currentActionMemory.intent = intent;

        const ignore = new Set(["intent", "assistant_message", "missing_parameters"]);

        const nextParams = { ...this.currentActionMemory.params };

        for (const [key, value] of Object.entries(parsed)) {
            if (ignore.has(key)) continue;
            if (value !== null && value !== undefined && value !== "") {
                nextParams[key] = value;
            }
        }

        this.currentActionMemory.params = nextParams;
    }
}
