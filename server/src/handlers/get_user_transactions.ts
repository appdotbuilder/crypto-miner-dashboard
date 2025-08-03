
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetUserTransactionsInput, type Transaction } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserTransactions(input: GetUserTransactionsInput): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, input.user_id))
      .orderBy(desc(transactionsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Failed to get user transactions:', error);
    throw error;
  }
}
