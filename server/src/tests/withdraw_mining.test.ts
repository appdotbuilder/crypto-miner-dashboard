
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, miningSessionsTable, balancesTable, transactionsTable } from '../db/schema';
import { type WithdrawMiningInput } from '../schema';
import { withdrawMining } from '../handlers/withdraw_mining';
import { eq } from 'drizzle-orm';

describe('withdrawMining', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should withdraw mining balance to Bitcoin balance', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create mining session with balance
    await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'ACTIVE',
        mining_balance: '0.005',
        started_at: new Date()
      })
      .execute();

    const input: WithdrawMiningInput = {
      user_id: userId
    };

    const result = await withdrawMining(input);

    // Verify transaction record
    expect(result.user_id).toEqual(userId);
    expect(result.transaction_type).toEqual('MINING_WITHDRAWAL');
    expect(result.crypto_type).toEqual('BITCOIN');
    expect(result.amount).toEqual(0.005);
    expect(result.from_crypto_type).toBeNull();
    expect(result.to_crypto_type).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create new Bitcoin balance if none exists', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create mining session with balance
    await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'ACTIVE',
        mining_balance: '0.01'
      })
      .execute();

    const input: WithdrawMiningInput = {
      user_id: userId
    };

    await withdrawMining(input);

    // Verify Bitcoin balance was created
    const balances = await db.select()
      .from(balancesTable)
      .where(eq(balancesTable.user_id, userId))
      .execute();

    expect(balances).toHaveLength(1);
    expect(balances[0].crypto_type).toEqual('BITCOIN');
    expect(parseFloat(balances[0].amount)).toEqual(0.01);
    expect(balances[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update existing Bitcoin balance', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create existing Bitcoin balance
    await db.insert(balancesTable)
      .values({
        user_id: userId,
        crypto_type: 'BITCOIN',
        amount: '0.002'
      })
      .execute();

    // Create mining session with balance
    await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'ACTIVE',
        mining_balance: '0.003'
      })
      .execute();

    const input: WithdrawMiningInput = {
      user_id: userId
    };

    await withdrawMining(input);

    // Verify Bitcoin balance was updated
    const balances = await db.select()
      .from(balancesTable)
      .where(eq(balancesTable.user_id, userId))
      .execute();

    expect(balances).toHaveLength(1);
    expect(balances[0].crypto_type).toEqual('BITCOIN');
    expect(parseFloat(balances[0].amount)).toEqual(0.005); // 0.002 + 0.003
  });

  it('should reset mining balance to zero', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create mining session with balance
    const miningResult = await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'ACTIVE',
        mining_balance: '0.007'
      })
      .returning()
      .execute();
    const miningSessionId = miningResult[0].id;

    const input: WithdrawMiningInput = {
      user_id: userId
    };

    await withdrawMining(input);

    // Verify mining balance was reset
    const miningSessions = await db.select()
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.id, miningSessionId))
      .execute();

    expect(miningSessions).toHaveLength(1);
    expect(parseFloat(miningSessions[0].mining_balance)).toEqual(0);
  });

  it('should save transaction to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create mining session with balance
    await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'ACTIVE',
        mining_balance: '0.004'
      })
      .execute();

    const input: WithdrawMiningInput = {
      user_id: userId
    };

    const result = await withdrawMining(input);

    // Verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(userId);
    expect(transactions[0].transaction_type).toEqual('MINING_WITHDRAWAL');
    expect(transactions[0].crypto_type).toEqual('BITCOIN');
    expect(parseFloat(transactions[0].amount)).toEqual(0.004);
    expect(transactions[0].from_crypto_type).toBeNull();
    expect(transactions[0].to_crypto_type).toBeNull();
  });

  it('should throw error when no mining session exists', async () => {
    // Create test user without mining session
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: WithdrawMiningInput = {
      user_id: userId
    };

    expect(() => withdrawMining(input)).toThrow(/no mining session found/i);
  });

  it('should throw error when mining balance is zero', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create mining session with zero balance
    await db.insert(miningSessionsTable)
      .values({
        user_id: userId,
        status: 'ACTIVE',
        mining_balance: '0'
      })
      .execute();

    const input: WithdrawMiningInput = {
      user_id: userId
    };

    expect(() => withdrawMining(input)).toThrow(/no mining balance to withdraw/i);
  });
});
