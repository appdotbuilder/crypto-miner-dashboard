
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
    const startedAt = new Date(Date.now() - 3600000); // 1 hour ago
    await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'ACTIVE',
        mining_balance: '0.001234',
        started_at: startedAt
      })
      .execute();

    const input: StopMiningInput = {
      user_id: userId
    };

    const result = await stopMining(input);

    // Verify result structure
    expect(result.user_id).toEqual(userId);
    expect(result.status).toEqual('STOPPED');
    expect(typeof result.mining_balance).toBe('number');
    expect(result.mining_balance).toEqual(0.001234);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.stopped_at).toBeInstanceOf(Date);
    expect(result.stopped_at!.getTime()).toBeGreaterThan(startedAt.getTime());
  });

  it('should update mining session in database', async () => {
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
        mining_balance: '0.005678',
        started_at: new Date(Date.now() - 1800000) // 30 minutes ago
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    const input: StopMiningInput = {
      user_id: userId
    };

    await stopMining(input);

    // Verify database was updated
    const sessions = await db.select()
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.id, sessionId))
      .execute();

    expect(sessions).toHaveLength(1);
    const session = sessions[0];
    expect(session.status).toEqual('STOPPED');
    expect(session.stopped_at).toBeInstanceOf(Date);
    expect(session.stopped_at).not.toBeNull();
    expect(parseFloat(session.mining_balance)).toEqual(0.005678);
  });

  it('should throw error when no active mining session exists', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: StopMiningInput = {
      user_id: userId
    };

    expect(stopMining(input)).rejects.toThrow(/no active mining session found/i);
  });

  it('should throw error when only stopped sessions exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create stopped mining session
    await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'STOPPED',
        mining_balance: '0.002',
        started_at: new Date(Date.now() - 7200000), // 2 hours ago
        stopped_at: new Date(Date.now() - 3600000)  // 1 hour ago
      })
      .execute();

    const input: StopMiningInput = {
      user_id: userId
    };

    expect(stopMining(input)).rejects.toThrow(/no active mining session found/i);
  });

  it('should stop correct session when multiple users have active sessions', async () => {
    // Create first user with active session
    const user1Result = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    await db.insert(miningSessionsTable)
      .values({
        user_id: user1Id,
        status: 'ACTIVE',
        mining_balance: '0.001',
        started_at: new Date(Date.now() - 3600000)
      })
      .execute();

    // Create second user with active session
    const user2Result = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    await db.insert(miningSessionsTable)
      .values({
        user_id: user2Id,
        status: 'ACTIVE',
        mining_balance: '0.002',
        started_at: new Date(Date.now() - 1800000)
      })
      .execute();

    const input: StopMiningInput = {
      user_id: user1Id
    };

    const result = await stopMining(input);

    // Verify correct user's session was stopped
    expect(result.user_id).toEqual(user1Id);
    expect(result.status).toEqual('STOPPED');

    // Verify user2's session is still active
    const user2Sessions = await db.select()
      .from(miningSessionsTable)
      .where(
        and(
          eq(miningSessionsTable.user_id, user2Id),
          eq(miningSessionsTable.status, 'ACTIVE')
        )
      )
      .execute();

    expect(user2Sessions).toHaveLength(1);
  });
});
