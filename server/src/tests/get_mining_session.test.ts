
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
    // Create user first
    await db.insert(usersTable).values({}).execute();

    const result = await getMiningSession(testInput);

    expect(result).toBeNull();
  });

  it('should return the latest mining session for a user', async () => {
    // Create user first
    await db.insert(usersTable).values({}).execute();

    // Create mining session
    const sessionData = {
      user_id: 1,
      status: 'ACTIVE' as const,
      mining_balance: '0.00123456', // Numeric field as string
      started_at: new Date(),
      stopped_at: null
    };

    await db.insert(miningSessionsTable)
      .values(sessionData)
      .execute();

    const result = await getMiningSession(testInput);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(1);
    expect(result!.status).toEqual('ACTIVE');
    expect(result!.mining_balance).toEqual(0.00123456);
    expect(typeof result!.mining_balance).toEqual('number');
    expect(result!.started_at).toBeInstanceOf(Date);
    expect(result!.stopped_at).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.id).toBeDefined();
  });

  it('should return the most recent session when multiple exist', async () => {
    // Create user first
    await db.insert(usersTable).values({}).execute();

    // Create older session
    const olderDate = new Date(Date.now() - 86400000); // 1 day ago
    await db.insert(miningSessionsTable)
      .values({
        user_id: 1,
        status: 'STOPPED' as const,
        mining_balance: '0.001',
        started_at: olderDate,
        stopped_at: olderDate,
        created_at: olderDate
      })
      .execute();

    // Create newer session
    const newerDate = new Date();
    await db.insert(miningSessionsTable)
      .values({
        user_id: 1,
        status: 'ACTIVE' as const,
        mining_balance: '0.002',
        started_at: newerDate,
        stopped_at: null,
        created_at: newerDate
      })
      .execute();

    const result = await getMiningSession(testInput);

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('ACTIVE');
    expect(result!.mining_balance).toEqual(0.002);
    expect(result!.created_at.getTime()).toBeGreaterThan(olderDate.getTime());
  });

  it('should only return sessions for the specified user', async () => {
    // Create two users
    await db.insert(usersTable).values({}).execute();
    await db.insert(usersTable).values({}).execute();

    // Create session for user 2
    await db.insert(miningSessionsTable)
      .values({
        user_id: 2,
        status: 'ACTIVE' as const,
        mining_balance: '0.005',
        started_at: new Date()
      })
      .execute();

    // Query for user 1 (should return null)
    const result = await getMiningSession({ user_id: 1 });

    expect(result).toBeNull();
  });
});
