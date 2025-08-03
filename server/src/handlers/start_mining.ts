
import { db } from '../db';
import { miningSessionsTable, usersTable } from '../db/schema';
import { type StartMiningInput, type MiningSession } from '../schema';
import { eq } from 'drizzle-orm';

export const startMining = async (input: StartMiningInput): Promise<MiningSession> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Check if user has an existing mining session
    const existingSessions = await db.select()
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.user_id, input.user_id))
      .execute();

    if (existingSessions.length > 0) {
      const existingSession = existingSessions[0];
      
      // If already active, throw error
      if (existingSession.status === 'ACTIVE') {
        throw new Error('Mining session is already active');
      }

      // Update existing session to active
      const result = await db.update(miningSessionsTable)
        .set({
          status: 'ACTIVE',
          started_at: new Date(),
          stopped_at: null
        })
        .where(eq(miningSessionsTable.id, existingSession.id))
        .returning()
        .execute();

      const updatedSession = result[0];
      return {
        ...updatedSession,
        mining_balance: parseFloat(updatedSession.mining_balance)
      };
    }

    // Create new mining session
    const result = await db.insert(miningSessionsTable)
      .values({
        user_id: input.user_id,
        status: 'ACTIVE',
        mining_balance: '0',
        started_at: new Date(),
        stopped_at: null
      })
      .returning()
      .execute();

    const newSession = result[0];
    return {
      ...newSession,
      mining_balance: parseFloat(newSession.mining_balance)
    };
  } catch (error) {
    console.error('Mining start failed:', error);
    throw error;
  }
};
