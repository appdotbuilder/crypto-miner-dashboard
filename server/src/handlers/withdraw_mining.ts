
import { db } from '../db';
import { miningSessionsTable, balancesTable, transactionsTable, usersTable } from '../db/schema';
import { type WithdrawMiningInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function withdrawMining(input: WithdrawMiningInput): Promise<Transaction> {
  try {
    // 1. Get the current mining session
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

    // 2. Get or create user's Bitcoin balance
    const existingBalances = await db.select()
      .from(balancesTable)
      .where(eq(balancesTable.user_id, input.user_id))
      .execute();

    const bitcoinBalance = existingBalances.find(b => b.crypto_type === 'BITCOIN');

    if (bitcoinBalance) {
      // Update existing Bitcoin balance
      const currentAmount = parseFloat(bitcoinBalance.amount);
      const newAmount = currentAmount + miningBalance;
      
      await db.update(balancesTable)
        .set({
          amount: newAmount.toString(),
          updated_at: new Date()
        })
        .where(eq(balancesTable.id, bitcoinBalance.id))
        .execute();
    } else {
      // Create new Bitcoin balance
      await db.insert(balancesTable)
        .values({
          user_id: input.user_id,
          crypto_type: 'BITCOIN',
          amount: miningBalance.toString(),
          updated_at: new Date()
        })
        .execute();
    }

    // 3. Reset mining_balance to 0
    await db.update(miningSessionsTable)
      .set({
        mining_balance: '0'
      })
      .where(eq(miningSessionsTable.id, miningSession.id))
      .execute();

    // 4. Create a MINING_WITHDRAWAL transaction record
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
