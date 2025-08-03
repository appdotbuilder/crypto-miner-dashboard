
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, balancesTable } from '../db/schema';
import { type GetUserBalancesInput } from '../schema';
import { getUserBalances } from '../handlers/get_user_balances';

const testInput: GetUserBalancesInput = {
  user_id: 1
};

describe('getUserBalances', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty balances for user with no existing balances', async () => {
    // Create a user first
    await db.insert(usersTable).values({}).execute();

    const result = await getUserBalances(testInput);

    // Should return all supported crypto types with 0 balance
    expect(result.length).toBe(12); // All supported crypto types
    
    // All balances should be 0 for new user
    result.forEach(balance => {
      expect(balance.user_id).toBe(1);
      expect(balance.amount).toBe(0);
      expect(balance.id).toBe(0); // Virtual ID for non-persisted balances
      expect(balance.updated_at).toBeInstanceOf(Date);
      expect(['BITCOIN', 'BITCOIN_GREEN', 'BITCOIN_CASH', 'ETHEREUM_CLASSIC', 'BINANCE_COIN', 'SOLANA', 'TON', 'NOTCOIN', 'DOGECOIN', 'TRUMP', 'TETHER', 'LITECOIN']).toContain(balance.crypto_type);
    });
  });

  it('should return existing balances mixed with zero balances', async () => {
    // Create a user
    await db.insert(usersTable).values({}).execute();

    // Create some balances
    await db.insert(balancesTable).values([
      {
        user_id: 1,
        crypto_type: 'BITCOIN',
        amount: '0.001'
      },
      {
        user_id: 1,
        crypto_type: 'ETHEREUM_CLASSIC',
        amount: '1.5'
      }
    ]).execute();

    const result = await getUserBalances(testInput);

    expect(result.length).toBe(12); // All supported crypto types

    // Find specific balances
    const bitcoinBalance = result.find(b => b.crypto_type === 'BITCOIN');
    const ethBalance = result.find(b => b.crypto_type === 'ETHEREUM_CLASSIC');
    const dogecoinBalance = result.find(b => b.crypto_type === 'DOGECOIN');

    // Existing balances should have real data
    expect(bitcoinBalance?.amount).toBe(0.001);
    expect(bitcoinBalance?.id).toBeGreaterThan(0); // Real ID from database
    expect(typeof bitcoinBalance?.amount).toBe('number');

    expect(ethBalance?.amount).toBe(1.5);
    expect(ethBalance?.id).toBeGreaterThan(0);
    expect(typeof ethBalance?.amount).toBe('number');

    // Non-existing balance should be 0
    expect(dogecoinBalance?.amount).toBe(0);
    expect(dogecoinBalance?.id).toBe(0); // Virtual ID
  });

  it('should handle user with all crypto types having balances', async () => {
    // Create a user
    await db.insert(usersTable).values({}).execute();

    // Create balances for all crypto types
    const allCryptoTypes = ['BITCOIN', 'BITCOIN_GREEN', 'BITCOIN_CASH', 'ETHEREUM_CLASSIC', 'BINANCE_COIN', 'SOLANA', 'TON', 'NOTCOIN', 'DOGECOIN', 'TRUMP', 'TETHER', 'LITECOIN'];
    
    await db.insert(balancesTable).values(
      allCryptoTypes.map((crypto, index) => ({
        user_id: 1,
        crypto_type: crypto as any,
        amount: (index * 0.1).toString()
      }))
    ).execute();

    const result = await getUserBalances(testInput);

    expect(result.length).toBe(12);
    
    // All balances should have real IDs (not virtual)
    result.forEach(balance => {
      expect(balance.id).toBeGreaterThan(0);
      expect(balance.user_id).toBe(1);
      expect(typeof balance.amount).toBe('number');
      expect(balance.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific amounts
    const bitcoinBalance = result.find(b => b.crypto_type === 'BITCOIN');
    expect(bitcoinBalance?.amount).toBe(0);
    
    const litecoinBalance = result.find(b => b.crypto_type === 'LITECOIN');
    expect(litecoinBalance?.amount).toBe(1.1);
  });
});
