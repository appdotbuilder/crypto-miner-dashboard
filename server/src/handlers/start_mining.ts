
import { db } from '../db';
import { miningSessionsTable } from '../db/schema';
import { type StartMiningInput, type MiningSession } from '../schema';
import { eq } from 'drizzle-orm';

export const startMining = async (input: StartMiningInput): Promise<MiningSession> => {
  try {
    // Check if user has an existing mining session
    const existingSessions = await db.select()
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.user_id, input.user_id))
      .execute();

    let result;

    if (existingSessions.length > 0) {
      // Update existing session to ACTIVE status
      const sessionId = existingSessions[0].id;
      const updateResult = await db.update(miningSessionsTable)
        .set({
          status: 'ACTIVE',
          started_at: new Date()
        })
        .where(eq(miningSessionsTable.id, sessionId))
        .returning()
        .execute();
      
      result = updateResult[0];
    } else {
      // Create new mining session
      const insertResult = await db.insert(miningSessionsTable)
        .values({
          user_id: input.user_id,
          status: 'ACTIVE',
          mining_balance: '0', // Convert number to string for numeric column
          started_at: new Date()
        })
        .returning()
        .execute();
      
      result = insertResult[0];
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...result,
      mining_balance: parseFloat(result.mining_balance)
    };
  } catch (error) {
    console.error('Mining start failed:', error);
    throw error;
  }
};
