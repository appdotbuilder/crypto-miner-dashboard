
import { db } from '../db';
import { balancesTable, miningSessionsTable, transactionsTable } from '../db/schema';
import { type WithdrawMiningInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function withdrawMining(input: WithdrawMiningInput): Promise<Transaction> {
  try {
    // Get the current mining session
    const miningSessions = await db.select()
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.user_id, input.user_id))
      .orderBy(miningSessionsTable.created_at)
      .limit(1)
      .execute();

    if (miningSessions.length === 0) {
      throw new Error('No mining session found for user');
    }

    const miningSession = miningSessions[0];
    const miningBalance = parseFloat(miningSession.mining_balance);

    if (miningBalance <= 0) {
      throw new Error('No mining balance to withdraw');
    }

    // Get or create user's Bitcoin balance
    const existingBalances = await db.select()
      .from(balancesTable)
      .where(and(
        eq(balancesTable.user_id, input.user_id),
        eq(balancesTable.crypto_type, 'BITCOIN')
      ))
      .execute();

    let currentBitcoinBalance = 0;
    if (existingBalances.length > 0) {
      currentBitcoinBalance = parseFloat(existingBalances[0].amount);
      
      // Update existing Bitcoin balance
      await db.update(balancesTable)
        .set({
          amount: (currentBitcoinBalance + miningBalance).toString(),
          updated_at: new Date()
        })
        .where(eq(balancesTable.id, existingBalances[0].id))
        .execute();
    } else {
      // Create new Bitcoin balance record
      await db.insert(balancesTable)
        .values({
          user_id: input.user_id,
          crypto_type: 'BITCOIN',
          amount: miningBalance.toString()
        })
        .execute();
    }

    // Reset mining balance to 0
    await db.update(miningSessionsTable)
      .set({
        mining_balance: '0'
      })
      .where(eq(miningSessionsTable.id, miningSession.id))
      .execute();

    // Create MINING_WITHDRAWAL transaction record
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        transaction_type: 'MINING_WITHDRAWAL',
        crypto_type: 'BITCOIN',
        amount: miningBalance.toString(),
        from_crypto_type: null,
        to_crypto_type: null
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount)
    };
  } catch (error) {
    console.error('Mining withdrawal failed:', error);
    throw error;
  }
}
