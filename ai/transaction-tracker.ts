/**
 * Transaction Tracker
 * 
 * Tracks the number of transactions with each unique recipient (by IBAN).
 * Used to suggest adding frequent recipients to contacts after 10 transactions.
 */

interface TransactionRecord {
  iban: string;
  count: number;
  firstTransactionDate: Date;
  lastTransactionDate: Date;
}

export class TransactionTracker {
  private transactions: Map<string, TransactionRecord> = new Map();

  /**
   * Record a transaction with a recipient
   * @param iban The recipient's IBAN
   * @returns The total number of transactions with this recipient
   */
  recordTransaction(iban: string): number {
    const existing = this.transactions.get(iban);

    if (existing) {
      existing.count++;
      existing.lastTransactionDate = new Date();
      return existing.count;
    } else {
      this.transactions.set(iban, {
        iban,
        count: 1,
        firstTransactionDate: new Date(),
        lastTransactionDate: new Date(),
      });
      return 1;
    }
  }

  /**
   * Get the transaction count for a specific IBAN
   * @param iban The recipient's IBAN
   * @returns The number of transactions, or 0 if not found
   */
  getTransactionCount(iban: string): number {
    return this.transactions.get(iban)?.count || 0;
  }

  /**
   * Get all transaction records
   */
  getAllTransactions(): TransactionRecord[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Get recipients with at least N transactions
   * @param minCount Minimum transaction count
   */
  getFrequentRecipients(minCount: number = 10): TransactionRecord[] {
    return Array.from(this.transactions.values())
      .filter(record => record.count >= minCount)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Check if a recipient has reached the threshold for contact suggestion
   * @param iban The recipient's IBAN
   * @param threshold The transaction count threshold (default: 10)
   * @returns true if the recipient has exactly the threshold number of transactions
   */
  shouldSuggestContact(iban: string, threshold: number = 10): boolean {
    const count = this.getTransactionCount(iban);
    return count === threshold;
  }

  /**
   * Reset transaction count for a specific IBAN (e.g., after adding to contacts)
   * @param iban The recipient's IBAN
   */
  resetTransactionCount(iban: string): void {
    this.transactions.delete(iban);
  }

  /**
   * Get transaction statistics
   */
  getStatistics(): {
    totalUniqueRecipients: number;
    totalTransactions: number;
    mostFrequentRecipient: TransactionRecord | null;
  } {
    const records = Array.from(this.transactions.values());
    const totalTransactions = records.reduce((sum, r) => sum + r.count, 0);
    const mostFrequentRecipient = records.sort((a, b) => b.count - a.count)[0] || null;

    return {
      totalUniqueRecipients: records.length,
      totalTransactions,
      mostFrequentRecipient,
    };
  }

  /**
   * Export transaction history to JSON string (for persistence)
   */
  exportToJSON(): string {
    const records = Array.from(this.transactions.entries()).map(([iban, record]) => ({
      iban,
      count: record.count,
      firstTransactionDate: record.firstTransactionDate.toISOString(),
      lastTransactionDate: record.lastTransactionDate.toISOString(),
    }));
    
    return JSON.stringify(records, null, 2);
  }

  /**
   * Import transaction history from JSON string (for persistence)
   */
  importFromJSON(json: string): void {
    try {
      const imported = JSON.parse(json) as Array<{
        iban: string;
        count: number;
        firstTransactionDate: string;
        lastTransactionDate: string;
      }>;

      if (!Array.isArray(imported)) {
        throw new Error("Invalid JSON format: expected an array");
      }

      this.transactions.clear();
      
      for (const record of imported) {
        if (!record.iban || typeof record.count !== 'number') {
          throw new Error("Invalid transaction record format");
        }

        this.transactions.set(record.iban, {
          iban: record.iban,
          count: record.count,
          firstTransactionDate: new Date(record.firstTransactionDate),
          lastTransactionDate: new Date(record.lastTransactionDate),
        });
      }
    } catch (error) {
      throw new Error(`Failed to import transaction history: ${error}`);
    }
  }

  /**
   * Clear all transaction records
   */
  clearAll(): void {
    this.transactions.clear();
  }
}