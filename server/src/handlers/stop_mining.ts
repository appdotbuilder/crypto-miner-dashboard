
import { db } from '../db';
import { miningSessionsTable } from '../db/schema';
import { type StopMiningInput, type MiningSession } from '../schema';
import { eq, and } from 'drizzle-orm';

export const stopMining = async (input: StopMiningInput): Promise<MiningSession> => {
  try {
    // Update the active mining session to stopped status
    const result = await db.update(miningSessionsTable)
      .set({
        status: 'STOPPED',
        stopped_at: new Date()
      })
      .where(and(
        eq(miningSessionsTable.user_id, input.user_id),
        eq(miningSessionsTable.status, 'ACTIVE')
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('No active mining session found for user');
    }

    // Convert numeric fields back to numbers before returning
    const session = result[0];
    return {
      ...session,
      mining_balance: parseFloat(session.mining_balance)
    };
  } catch (error) {
    console.error('Stop mining failed:', error);
    throw error;
  }
};
