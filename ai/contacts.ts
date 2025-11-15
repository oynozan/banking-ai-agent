export interface Contact {
  firstName: string;
  lastName: string;
  accountId: string;
  iban: string;
  alias: string; // Custom alias or defaults to firstName
}

export class ContactManager {
  private contacts: Contact[] = [];

  /**
   * Add a new contact to the list
   */
  addContact(contact: Contact): void {
    // Check if contact already exists by IBAN
    const existing = this.contacts.find(c => c.iban === contact.iban);
    if (existing) {
      console.warn(`Contact with IBAN ${contact.iban} already exists. Updating...`);
      // Update existing contact
      existing.firstName = contact.firstName;
      existing.lastName = contact.lastName;
      existing.accountId = contact.accountId;
      existing.alias = contact.alias;
      return;
    }

    // Check if alias is already taken
    const aliasExists = this.contacts.find(c => c.alias.toLowerCase() === contact.alias.toLowerCase());
    if (aliasExists) {
      throw new Error(`Alias "${contact.alias}" is already in use by ${aliasExists.firstName} ${aliasExists.lastName}`);
    }

    this.contacts.push(contact);
  }

  /**
   * Find a contact by their alias (case-insensitive)
   */
  findByAlias(alias: string): Contact | undefined {
    return this.contacts.find(
      c => c.alias.toLowerCase() === alias.toLowerCase()
    );
  }

  /**
   * Find a contact by their IBAN
   */
  findByIban(iban: string): Contact | undefined {
    return this.contacts.find(c => c.iban === iban);
  }

  /**
   * Find a contact by their account ID
   */
  findByAccountId(accountId: string): Contact | undefined {
    return this.contacts.find(c => c.accountId === accountId);
  }

  /**
   * Find contacts by first name (case-insensitive, partial match)
   */
  findByFirstName(firstName: string): Contact[] {
    const searchTerm = firstName.toLowerCase();
    return this.contacts.filter(
      c => c.firstName.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Find contacts by last name (case-insensitive, partial match)
   */
  findByLastName(lastName: string): Contact[] {
    const searchTerm = lastName.toLowerCase();
    return this.contacts.filter(
      c => c.lastName.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get all contacts
   */
  getAllContacts(): Contact[] {
    return [...this.contacts];
  }

  /**
   * Remove a contact by alias
   */
  removeContactByAlias(alias: string): boolean {
    const index = this.contacts.findIndex(
      c => c.alias.toLowerCase() === alias.toLowerCase()
    );
    
    if (index !== -1) {
      this.contacts.splice(index, 1);
      return true;
    }
    
    return false;
  }

  /**
   * Update a contact's alias
   */
  updateAlias(currentAlias: string, newAlias: string): boolean {
    const contact = this.findByAlias(currentAlias);
    
    if (!contact) {
      return false;
    }

    // Check if new alias is already taken by another contact
    const aliasExists = this.contacts.find(
      c => c.alias.toLowerCase() === newAlias.toLowerCase() && c !== contact
    );
    
    if (aliasExists) {
      throw new Error(`Alias "${newAlias}" is already in use by ${aliasExists.firstName} ${aliasExists.lastName}`);
    }

    contact.alias = newAlias;
    return true;
  }

  /**
   * Get the number of contacts
   */
  getContactCount(): number {
    return this.contacts.length;
  }

  /**
   * Export contacts to JSON string (for persistence)
   */
  exportToJSON(): string {
    return JSON.stringify(this.contacts, null, 2);
  }

  /**
   * Import contacts from JSON string (for persistence)
   */
  importFromJSON(json: string): void {
    try {
      const imported = JSON.parse(json) as Contact[];
      
      // Validate the imported data
      if (!Array.isArray(imported)) {
        throw new Error("Invalid JSON format: expected an array");
      }

      for (const contact of imported) {
        if (!contact.firstName || !contact.lastName || !contact.accountId || !contact.iban || !contact.alias) {
          throw new Error("Invalid contact format: missing required fields");
        }
      }

      this.contacts = imported;
    } catch (error) {
      throw new Error(`Failed to import contacts: ${error}`);
    }
  }
}