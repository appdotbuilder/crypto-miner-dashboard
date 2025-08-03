
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type GetUserTransactionsInput } from '../schema';
import { getUserTransactions } from '../handlers/get_user_transactions';

const testInput: GetUserTransactionsInput = {
  user_id: 1
};

describe('getUserTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no transactions', async () => {
    // Create user without transactions
    await db.insert(usersTable).values({}).execute();

    const result = await getUserTransactions(testInput);

    expect(result).toEqual([]);
  });

  it('should return user transactions ordered by created_at desc', async () => {
    // Create user
    await db.insert(usersTable).values({}).execute();

    // Create multiple transactions with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier
    const later = new Date(now.getTime() + 60000); // 1 minute later

    await db.insert(transactionsTable).values([
      {
        user_id: 1,
        transaction_type: 'MINING_WITHDRAWAL',
        crypto_type: 'BITCOIN',
        amount: '0.001',
        from_crypto_type: null,
        to_crypto_type: null,
        created_at: now
      },
      {
        user_id: 1,
        transaction_type: 'SWAP_FROM',
        crypto_type: 'BITCOIN',
        amount: '0.002',
        from_crypto_type: 'BITCOIN',
        to_crypto_type: 'ETHEREUM_CLASSIC',
        created_at: earlier
      },
      {
        user_id: 1,
        transaction_type: 'SWAP_TO',
        crypto_type: 'ETHEREUM_CLASSIC',
        amount: '0.02',
        from_crypto_type: 'BITCOIN',
        to_crypto_type: 'ETHEREUM_CLASSIC',
        created_at: later
      }
    ]).execute();

    const result = await getUserTransactions(testInput);

    expect(result).toHaveLength(3);
    
    // Verify transactions are ordered by created_at desc (most recent first)
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThan(result[2].created_at.getTime());
    
    // Verify the most recent transaction is first
    expect(result[0].transaction_type).toEqual('SWAP_TO');
    expect(result[0].crypto_type).toEqual('ETHEREUM_CLASSIC');
    expect(result[0].amount).toEqual(0.02);
    
    // Verify numeric conversion
    expect(typeof result[0].amount).toBe('number');
    expect(typeof result[1].amount).toBe('number');
    expect(typeof result[2].amount).toBe('number');
  });

  it('should only return transactions for the specified user', async () => {
    // Create two users
    await db.insert(usersTable).values([{}, {}]).execute();

    // Create transactions for both users
    await db.insert(transactionsTable).values([
      {
        user_id: 1,
        transaction_type: 'MINING_WITHDRAWAL',
        crypto_type: 'BITCOIN',
        amount: '0.001',
        from_crypto_type: null,
        to_crypto_type: null
      },
      {
        user_id: 2,
        transaction_type: 'SWAP_FROM',
        crypto_type: 'ETHEREUM_CLASSIC',
        amount: '0.002',
        from_crypto_type: 'ETHEREUM_CLASSIC',
        to_crypto_type: 'BITCOIN'
      },
      {
        user_id: 1,
        transaction_type: 'SWAP_TO',
        crypto_type: 'SOLANA',
        amount: '5.0',
        from_crypto_type: 'BITCOIN',
        to_crypto_type: 'SOLANA'
      }
    ]).execute();

    const result = await getUserTransactions(testInput);

    expect(result).toHaveLength(2);
    
    // Verify all transactions belong to user_id 1
    result.forEach(transaction => {
      expect(transaction.user_id).toEqual(1);
    });
    
    // Verify we got the correct transactions
    expect(result.some(t => t.crypto_type === 'BITCOIN')).toBe(true);
    expect(result.some(t => t.crypto_type === 'SOLANA')).toBe(true);
    expect(result.some(t => t.crypto_type === 'ETHEREUM_CLASSIC')).toBe(false);
  });

  it('should handle all transaction types correctly', async () => {
    // Create user
    await db.insert(usersTable).values({}).execute();

    // Create transactions of all types
    await db.insert(transactionsTable).values([
      {
        user_id: 1,
        transaction_type: 'MINING_WITHDRAWAL',
        crypto_type: 'BITCOIN',
        amount: '0.001',
        from_crypto_type: null,
        to_crypto_type: null
      },
      {
        user_id: 1,
        transaction_type: 'SWAP_FROM',
        crypto_type: 'ETHEREUM_CLASSIC',
        amount: '0.5',
        from_crypto_type: 'ETHEREUM_CLASSIC',
        to_crypto_type: 'BITCOIN'
      },
      {
        user_id: 1,
        transaction_type: 'SWAP_TO',
        crypto_type: 'BITCOIN',
        amount: '0.002',
        from_crypto_type: 'ETHEREUM_CLASSIC',
        to_crypto_type: 'BITCOIN'
      }
    ]).execute();

    const result = await getUserTransactions(testInput);

    expect(result).toHaveLength(3);
    
    // Verify all transaction types are present
    const transactionTypes = result.map(t => t.transaction_type);
    expect(transactionTypes).toContain('MINING_WITHDRAWAL');
    expect(transactionTypes).toContain('SWAP_FROM');
    expect(transactionTypes).toContain('SWAP_TO');
    
    // Verify swap transactions have correct crypto type fields
    const swapFrom = result.find(t => t.transaction_type === 'SWAP_FROM');
    const swapTo = result.find(t => t.transaction_type === 'SWAP_TO');
    
    expect(swapFrom?.from_crypto_type).toEqual('ETHEREUM_CLASSIC');
    expect(swapFrom?.to_crypto_type).toEqual('BITCOIN');
    expect(swapTo?.from_crypto_type).toEqual('ETHEREUM_CLASSIC');
    expect(swapTo?.to_crypto_type).toEqual('BITCOIN');
    
    // Verify mining withdrawal has null crypto type fields
    const miningWithdrawal = result.find(t => t.transaction_type === 'MINING_WITHDRAWAL');
    expect(miningWithdrawal?.from_crypto_type).toBeNull();
    expect(miningWithdrawal?.to_crypto_type).toBeNull();
  });
});
