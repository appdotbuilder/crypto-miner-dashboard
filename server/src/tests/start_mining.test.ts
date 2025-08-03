
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, miningSessionsTable } from '../db/schema';
import { type StartMiningInput } from '../schema';
import { startMining } from '../handlers/start_mining';
import { eq } from 'drizzle-orm';

describe('startMining', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should start mining for a new user', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const user = userResult[0];

    const testInput: StartMiningInput = {
      user_id: user.id
    };

    const result = await startMining(testInput);

    // Verify result structure
    expect(result.user_id).toEqual(user.id);
    expect(result.status).toEqual('ACTIVE');
    expect(result.mining_balance).toEqual(0);
    expect(typeof result.mining_balance).toBe('number');
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.stopped_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save mining session to database', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const user = userResult[0];

    const testInput: StartMiningInput = {
      user_id: user.id
    };

    const result = await startMining(testInput);

    // Query database to verify session was saved
    const sessions = await db.select()
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toEqual(user.id);
    expect(sessions[0].status).toEqual('ACTIVE');
    expect(parseFloat(sessions[0].mining_balance)).toEqual(0);
    expect(sessions[0].started_at).toBeInstanceOf(Date);
    expect(sessions[0].stopped_at).toBeNull();
  });

  it('should reactivate stopped mining session', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const user = userResult[0];

    // Create a stopped mining session
    const sessionResult = await db.insert(miningSessionsTable)
      .values({
        user_id: user.id,
        status: 'STOPPED',
        mining_balance: '5.0',
        started_at: new Date(),
        stopped_at: new Date()
      })
      .returning()
      .execute();
    const existingSession = sessionResult[0];

    const testInput: StartMiningInput = {
      user_id: user.id
    };

    const result = await startMining(testInput);

    // Should update the existing session
    expect(result.id).toEqual(existingSession.id);
    expect(result.status).toEqual('ACTIVE');
    expect(result.mining_balance).toEqual(5.0);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.stopped_at).toBeNull();
  });

  it('should throw error when mining is already active', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const user = userResult[0];

    // Create an active mining session
    await db.insert(miningSessionsTable)
      .values({
        user_id: user.id,
        status: 'ACTIVE',
        mining_balance: '2.5',
        started_at: new Date()
      })
      .execute();

    const testInput: StartMiningInput = {
      user_id: user.id
    };

    await expect(startMining(testInput)).rejects.toThrow(/already active/i);
  });

  it('should throw error for non-existent user', async () => {
    const testInput: StartMiningInput = {
      user_id: 999999
    };

    await expect(startMining(testInput)).rejects.toThrow(/not found/i);
  });
});
