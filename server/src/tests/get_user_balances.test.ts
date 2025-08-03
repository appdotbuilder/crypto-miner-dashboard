
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

  it('should return all crypto types with zero balances for new user', async () => {
    // Create a user first
    await db.insert(usersTable).values({}).execute();

    const result = await getUserBalances(testInput);

    // Should have entries for all 12 supported crypto types
    expect(result).toHaveLength(12);

    // All balances should be zero for new user
    result.forEach(balance => {
      expect(balance.amount).toEqual(0);
      expect(balance.user_id).toEqual(1);
      expect(balance.updated_at).toBeInstanceOf(Date);
      expect(typeof balance.amount).toBe('number');
    });

    // Check that all crypto types are present
    const cryptoTypes = result.map(b => b.crypto_type).sort();
    expect(cryptoTypes).toContain('BITCOIN');
    expect(cryptoTypes).toContain('ETHEREUM_CLASSIC');
    expect(cryptoTypes).toContain('SOLANA');
    expect(cryptoTypes).toContain('DOGECOIN');
    expect(cryptoTypes).toContain('TETHER');
    expect(cryptoTypes).toContain('LITECOIN');
  });

  it('should return existing balances with zero balances for missing crypto types', async () => {
    // Create a user
    await db.insert(usersTable).values({}).execute();

    // Create some existing balances
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

    // Should still have entries for all 12 crypto types
    expect(result).toHaveLength(12);

    // Find specific balances
    const bitcoinBalance = result.find(b => b.crypto_type === 'BITCOIN');
    const ethBalance = result.find(b => b.crypto_type === 'ETHEREUM_CLASSIC');
    const solanaBalance = result.find(b => b.crypto_type === 'SOLANA');

    // Existing balances should have correct amounts
    expect(bitcoinBalance?.amount).toEqual(0.001);
    expect(ethBalance?.amount).toEqual(1.5);
    expect(bitcoinBalance?.id).toBeGreaterThan(0);
    expect(ethBalance?.id).toBeGreaterThan(0);

    // Missing balance should be zero with placeholder ID
    expect(solanaBalance?.amount).toEqual(0);
    expect(solanaBalance?.id).toEqual(0);

    // All should have correct user_id and valid dates
    result.forEach(balance => {
      expect(balance.user_id).toEqual(1);
      expect(balance.updated_at).toBeInstanceOf(Date);
      expect(typeof balance.amount).toBe('number');
    });
  });

  it('should throw error for non-existent user', async () => {
    const invalidInput: GetUserBalancesInput = {
      user_id: 999
    };

    expect(getUserBalances(invalidInput)).rejects.toThrow(/User with id 999 not found/);
  });

  it('should handle numeric conversion correctly', async () => {
    // Create a user
    await db.insert(usersTable).values({}).execute();

    // Create balance with high precision amount
    await db.insert(balancesTable).values({
      user_id: 1,
      crypto_type: 'BITCOIN',
      amount: '0.12345678' // 8 decimal places
    }).execute();

    const result = await getUserBalances(testInput);
    const bitcoinBalance = result.find(b => b.crypto_type === 'BITCOIN');

    expect(bitcoinBalance?.amount).toEqual(0.12345678);
    expect(typeof bitcoinBalance?.amount).toBe('number');
  });
});
