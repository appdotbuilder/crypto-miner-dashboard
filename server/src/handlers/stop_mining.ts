
import { db } from '../db';
import { miningSessionsTable } from '../db/schema';
import { type StopMiningInput, type MiningSession } from '../schema';
import { eq, and } from 'drizzle-orm';

export const stopMining = async (input: StopMiningInput): Promise<MiningSession> => {
  try {
    // Find the active mining session for the user
    const activeSessions = await db.select()
      .from(miningSessionsTable)
      .where(
        and(
          eq(miningSessionsTable.user_id, input.user_id),
          eq(miningSessionsTable.status, 'ACTIVE')
        )
      )
      .execute();

    if (activeSessions.length === 0) {
      throw new Error('No active mining session found for user');
    }

    const activeSession = activeSessions[0];

    // Update the mining session to STOPPED status with stopped_at timestamp
    const result = await db.update(miningSessionsTable)
      .set({
        status: 'STOPPED',
        stopped_at: new Date()
      })
      .where(eq(miningSessionsTable.id, activeSession.id))
      .returning()
      .execute();

    const updatedSession = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedSession,
      mining_balance: parseFloat(updatedSession.mining_balance)
    };
  } catch (error) {
    console.error('Mining stop failed:', error);
    throw error;
  }
};
