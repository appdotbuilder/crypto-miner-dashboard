
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

  it('should create new mining session for user without existing session', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: StartMiningInput = {
      user_id: userId
    };

    const result = await startMining(input);

    // Verify result structure
    expect(result.user_id).toEqual(userId);
    expect(result.status).toEqual('ACTIVE');
    expect(result.mining_balance).toEqual(0);
    expect(typeof result.mining_balance).toEqual('number');
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.stopped_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save mining session to database', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: StartMiningInput = {
      user_id: userId
    };

    const result = await startMining(input);

    // Query database to verify session was saved
    const sessions = await db.select()
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toEqual(userId);
    expect(sessions[0].status).toEqual('ACTIVE');
    expect(parseFloat(sessions[0].mining_balance)).toEqual(0);
    expect(sessions[0].started_at).toBeInstanceOf(Date);
    expect(sessions[0].stopped_at).toBeNull();
  });

  it('should update existing mining session to ACTIVE status', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create existing mining session with STOPPED status
    const existingSession = await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'STOPPED',
        mining_balance: '5.0',
        stopped_at: new Date()
      })
      .returning()
      .execute();

    const input: StartMiningInput = {
      user_id: userId
    };

    const result = await startMining(input);

    // Should return updated session with same ID
    expect(result.id).toEqual(existingSession[0].id);
    expect(result.user_id).toEqual(userId);
    expect(result.status).toEqual('ACTIVE');
    expect(result.mining_balance).toEqual(5.0);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.started_at).not.toEqual(existingSession[0].started_at);
  });

  it('should verify only one mining session exists per user', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create existing session
    await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'STOPPED',
        mining_balance: '2.5'
      })
      .returning()
      .execute();

    const input: StartMiningInput = {
      user_id: userId
    };

    await startMining(input);

    // Verify only one session exists for user
    const sessions = await db.select()
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.user_id, userId))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toEqual('ACTIVE');
  });
});
