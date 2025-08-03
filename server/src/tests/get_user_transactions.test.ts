
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type GetUserTransactionsInput } from '../schema';
import { getUserTransactions } from '../handlers/get_user_transactions';

describe('getUserTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no transactions', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();

    const testInput: GetUserTransactionsInput = {
      user_id: userResult[0].id
    };

    const result = await getUserTransactions(testInput);

    expect(result).toEqual([]);
  });

  it('should return user transactions ordered by created_at desc', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple transactions with different timestamps
    const firstTransaction = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        transaction_type: 'MINING_WITHDRAWAL',
        crypto_type: 'BITCOIN',
        amount: '0.001',
        from_crypto_type: null,
        to_crypto_type: null
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondTransaction = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        transaction_type: 'SWAP_FROM',
        crypto_type: 'ETHEREUM_CLASSIC',
        amount: '0.5',
        from_crypto_type: 'ETHEREUM_CLASSIC',
        to_crypto_type: 'BITCOIN'
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const thirdTransaction = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        transaction_type: 'SWAP_TO',
        crypto_type: 'BITCOIN',
        amount: '0.0005',
        from_crypto_type: 'ETHEREUM_CLASSIC',
        to_crypto_type: 'BITCOIN'
      })
      .returning()
      .execute();

    const testInput: GetUserTransactionsInput = {
      user_id: userId
    };

    const result = await getUserTransactions(testInput);

    expect(result).toHaveLength(3);

    // Verify ordering (most recent first)
    expect(result[0].id).toEqual(thirdTransaction[0].id);
    expect(result[1].id).toEqual(secondTransaction[0].id);
    expect(result[2].id).toEqual(firstTransaction[0].id);

    // Verify numeric conversion
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].amount).toEqual(0.0005);
    expect(result[1].amount).toEqual(0.5);
    expect(result[2].amount).toEqual(0.001);

    // Verify all fields are properly returned
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].transaction_type).toEqual('SWAP_TO');
    expect(result[0].crypto_type).toEqual('BITCOIN');
    expect(result[0].from_crypto_type).toEqual('ETHEREUM_CLASSIC');
    expect(result[0].to_crypto_type).toEqual('BITCOIN');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should only return transactions for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create transactions for both users
    await db.insert(transactionsTable)
      .values({
        user_id: user1Id,
        transaction_type: 'MINING_WITHDRAWAL',
        crypto_type: 'BITCOIN',
        amount: '0.001',
        from_crypto_type: null,
        to_crypto_type: null
      })
      .execute();

    await db.insert(transactionsTable)
      .values({
        user_id: user2Id,
        transaction_type: 'SWAP_FROM',
        crypto_type: 'ETHEREUM_CLASSIC',
        amount: '0.5',
        from_crypto_type: 'ETHEREUM_CLASSIC',
        to_crypto_type: 'BITCOIN'
      })
      .execute();

    const testInput: GetUserTransactionsInput = {
      user_id: user1Id
    };

    const result = await getUserTransactions(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1Id);
    expect(result[0].transaction_type).toEqual('MINING_WITHDRAWAL');
    expect(result[0].amount).toEqual(0.001);
  });
});
