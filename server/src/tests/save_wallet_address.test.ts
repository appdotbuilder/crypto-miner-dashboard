
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletAddressesTable } from '../db/schema';
import { type SaveWalletAddressInput } from '../schema';
import { saveWalletAddress } from '../handlers/save_wallet_address';
import { eq, and } from 'drizzle-orm';

describe('saveWalletAddress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: { id: number };

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    testUser = users[0];
  });

  const testInput: SaveWalletAddressInput = {
    user_id: 1, // Will be updated in tests
    crypto_type: 'BITCOIN',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
  };

  it('should create a new wallet address', async () => {
    const input = { ...testInput, user_id: testUser.id };
    const result = await saveWalletAddress(input);

    expect(result.user_id).toEqual(testUser.id);
    expect(result.crypto_type).toEqual('BITCOIN');
    expect(result.address).toEqual('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save wallet address to database', async () => {
    const input = { ...testInput, user_id: testUser.id };
    const result = await saveWalletAddress(input);

    const walletAddresses = await db.select()
      .from(walletAddressesTable)
      .where(eq(walletAddressesTable.id, result.id))
      .execute();

    expect(walletAddresses).toHaveLength(1);
    expect(walletAddresses[0].user_id).toEqual(testUser.id);
    expect(walletAddresses[0].crypto_type).toEqual('BITCOIN');
    expect(walletAddresses[0].address).toEqual('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(walletAddresses[0].created_at).toBeInstanceOf(Date);
    expect(walletAddresses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update existing wallet address', async () => {
    const input = { ...testInput, user_id: testUser.id };
    
    // Create initial wallet address
    const first = await saveWalletAddress(input);
    
    // Update with new address
    const updatedInput = {
      ...input,
      address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
    };
    const second = await saveWalletAddress(updatedInput);

    // Should be same record (same ID)
    expect(second.id).toEqual(first.id);
    expect(second.address).toEqual('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
    expect(second.updated_at.getTime()).toBeGreaterThan(first.updated_at.getTime());

    // Verify only one record exists in database
    const allAddresses = await db.select()
      .from(walletAddressesTable)
      .where(
        and(
          eq(walletAddressesTable.user_id, testUser.id),
          eq(walletAddressesTable.crypto_type, 'BITCOIN')
        )
      )
      .execute();

    expect(allAddresses).toHaveLength(1);
    expect(allAddresses[0].address).toEqual('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
  });

  it('should allow different crypto types for same user', async () => {
    const bitcoinInput = { ...testInput, user_id: testUser.id };
    const ethereumInput = {
      user_id: testUser.id,
      crypto_type: 'ETHEREUM_CLASSIC' as const,
      address: '0x742d35cc6ccaa6e82a0e6e3e5a6b5d5a6b5d5a6b'
    };

    const bitcoinResult = await saveWalletAddress(bitcoinInput);
    const ethereumResult = await saveWalletAddress(ethereumInput);

    expect(bitcoinResult.id).not.toEqual(ethereumResult.id);
    expect(bitcoinResult.crypto_type).toEqual('BITCOIN');
    expect(ethereumResult.crypto_type).toEqual('ETHEREUM_CLASSIC');

    // Verify both records exist
    const allAddresses = await db.select()
      .from(walletAddressesTable)
      .where(eq(walletAddressesTable.user_id, testUser.id))
      .execute();

    expect(allAddresses).toHaveLength(2);
  });

  it('should throw error for non-existent user', async () => {
    const input = { ...testInput, user_id: 99999 };

    expect(saveWalletAddress(input)).rejects.toThrow(/user.*not found/i);
  });
});
