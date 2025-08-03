
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, miningSessionsTable } from '../db/schema';
import { type GetMiningSessionInput } from '../schema';
import { getMiningSession } from '../handlers/get_mining_session';

const testInput: GetMiningSessionInput = {
  user_id: 1
};

describe('getMiningSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no mining session exists', async () => {
    // Create a user but no mining session
    await db.insert(usersTable).values({}).execute();

    const result = await getMiningSession(testInput);

    expect(result).toBeNull();
  });

  it('should return the latest mining session for a user', async () => {
    // Create a user
    await db.insert(usersTable).values({}).execute();

    // Create multiple mining sessions with different timestamps
    const session1 = await db.insert(miningSessionsTable)
      .values({
        user_id: 1,
        status: 'STOPPED',
        mining_balance: '0.001',
        started_at: new Date(Date.now() - 7200000), // 2 hours ago
        stopped_at: new Date(Date.now() - 3600000), // 1 hour ago
        created_at: new Date(Date.now() - 7200000) // 2 hours ago
      })
      .returning()
      .execute();

    const session2 = await db.insert(miningSessionsTable)
      .values({
        user_id: 1,
        status: 'ACTIVE',
        mining_balance: '0.005',
        started_at: new Date(Date.now() - 1800000), // 30 minutes ago
        stopped_at: null,
        created_at: new Date(Date.now() - 1800000) // 30 minutes ago (latest)
      })
      .returning()
      .execute();

    const result = await getMiningSession(testInput);

    // Should return the latest session (session2)
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(session2[0].id);
    expect(result!.user_id).toEqual(1);
    expect(result!.status).toEqual('ACTIVE');
    expect(result!.mining_balance).toEqual(0.005);
    expect(typeof result!.mining_balance).toEqual('number');
    expect(result!.started_at).toBeInstanceOf(Date);
    expect(result!.stopped_at).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return correct mining session with all field types', async () => {
    // Create a user
    await db.insert(usersTable).values({}).execute();

    // Create a mining session with all fields populated
    const startedAt = new Date(Date.now() - 3600000);
    const stoppedAt = new Date();
    
    await db.insert(miningSessionsTable)
      .values({
        user_id: 1,
        status: 'STOPPED',
        mining_balance: '10.12345678',
        started_at: startedAt,
        stopped_at: stoppedAt
      })
      .execute();

    const result = await getMiningSession(testInput);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(1);
    expect(result!.status).toEqual('STOPPED');
    expect(result!.mining_balance).toEqual(10.12345678);
    expect(result!.started_at).toBeInstanceOf(Date);
    expect(result!.stopped_at).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should only return sessions for the specified user', async () => {
    // Create two users
    await db.insert(usersTable).values({}).execute(); // user_id: 1
    await db.insert(usersTable).values({}).execute(); // user_id: 2

    // Create mining sessions for both users
    await db.insert(miningSessionsTable)
      .values({
        user_id: 1,
        status: 'ACTIVE',
        mining_balance: '0.001'
      })
      .execute();

    await db.insert(miningSessionsTable)
      .values({
        user_id: 2,
        status: 'STOPPED',
        mining_balance: '0.002'
      })
      .execute();

    // Query for user 2's session
    const result = await getMiningSession({ user_id: 2 });

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(2);
    expect(result!.status).toEqual('STOPPED');
    expect(result!.mining_balance).toEqual(0.002);
  });
});
