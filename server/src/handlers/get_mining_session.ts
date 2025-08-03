
import { db } from '../db';
import { miningSessionsTable } from '../db/schema';
import { type GetMiningSessionInput, type MiningSession } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getMiningSession = async (input: GetMiningSessionInput): Promise<MiningSession | null> => {
  try {
    // Get the latest mining session for the user
    const result = await db.select()
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.user_id, input.user_id))
      .orderBy(desc(miningSessionsTable.created_at))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const session = result[0];
    return {
      ...session,
      mining_balance: parseFloat(session.mining_balance) // Convert numeric to number
    };
  } catch (error) {
    console.error('Mining session retrieval failed:', error);
    throw error;
  }
};
