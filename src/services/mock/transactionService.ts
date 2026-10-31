import type { FMTransaction } from "../../types";

/**
 * Frontend demo transaction service. Single source of truth is the app store;
 * this module exposes the async-shaped API a real backend will implement.
 * No arbitrary screen increments balances directly.
 */

export interface TransactionQuery {
  userId: string;
  category?: FMTransaction["category"];
  limit?: number;
}

export const mockTransactions = {
  async list(query: TransactionQuery): Promise<FMTransaction[]> {
    // Reads come from persisted store via caller; kept async-shaped for backend swap.
    void query;
    return [];
  },
  async create(
    tx: Omit<FMTransaction, "id" | "timestamp">,
  ): Promise<FMTransaction> {
    return {
      ...tx,
      id: `tx-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
  },
};
