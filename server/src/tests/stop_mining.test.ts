
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, miningSessionsTable } from '../db/schema';
import { type StopMiningInput } from '../schema';
import { stopMining } from '../handlers/stop_mining';
import { eq, and } from 'drizzle-orm';

describe('stopMining', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should stop an active mining session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create active mining session
    const sessionResult = await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'ACTIVE',
        mining_balance: '0.001',
        started_at: new Date(Date.now() - 3600000) // 1 hour ago
      })
      .returning()
      .execute();

    const input: StopMiningInput = {
      user_id: userId
    };

    const result = await stopMining(input);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.user_id).toBe(userId);
    expect(result.status).toBe('STOPPED');
    expect(result.mining_balance).toBe(0.001);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.stopped_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.mining_balance).toBe('number');
  });

  it('should update mining session in database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create active mining session
    await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'ACTIVE',
        mining_balance: '0.002',
        started_at: new Date(Date.now() - 1800000) // 30 minutes ago
      })
      .returning()
      .execute();

    const input: StopMiningInput = {
      user_id: userId
    };

    const result = await stopMining(input);

    // Query database to verify update
    const sessions = await db.select()
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toBe('STOPPED');
    expect(sessions[0].stopped_at).toBeInstanceOf(Date);
    expect(parseFloat(sessions[0].mining_balance)).toBe(0.002);
    expect(sessions[0].started_at).toBeInstanceOf(Date);
  });

  it('should throw error when no active mining session exists', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create stopped mining session (not active)
    await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'STOPPED',
        mining_balance: '0.001',
        started_at: new Date(Date.now() - 3600000),
        stopped_at: new Date(Date.now() - 1800000)
      })
      .returning()
      .execute();

    const input: StopMiningInput = {
      user_id: userId
    };

    expect(stopMining(input)).rejects.toThrow(/no active mining session found/i);
  });

  it('should only stop active sessions for specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create active mining sessions for both users
    await db.insert(miningSessionsTable)
      .values([
        {
          user_id: user1Id,
          status: 'ACTIVE',
          mining_balance: '0.001',
          started_at: new Date(Date.now() - 3600000)
        },
        {
          user_id: user2Id,
          status: 'ACTIVE',
          mining_balance: '0.002',
          started_at: new Date(Date.now() - 1800000)
        }
      ])
      .returning()
      .execute();

    const input: StopMiningInput = {
      user_id: user1Id
    };

    const result = await stopMining(input);

    // Verify only user1's session was stopped
    expect(result.user_id).toBe(user1Id);
    expect(result.status).toBe('STOPPED');

    // Verify user2's session is still active
    const user2Sessions = await db.select()
      .from(miningSessionsTable)
      .where(and(
        eq(miningSessionsTable.user_id, user2Id),
        eq(miningSessionsTable.status, 'ACTIVE')
      ))
      .execute();

    expect(user2Sessions).toHaveLength(1);
    expect(user2Sessions[0].status).toBe('ACTIVE');
  });
});
